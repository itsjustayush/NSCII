import { Creature, WorldContext } from "../core/Creature";
import { CharacterGrid } from "../../engine/renderer/CharacterGrid";
import {
  TAU,
  ell,
  mixC,
  pack,
  noise,
  segDist,
  RGB,
} from "../../engine/simulation/Physics";

export class Crab implements Creature {
  id: string;
  species = "crab";

  x: number = 0;
  y: number = 0;
  nx: number = 0.5;
  ny: number = 0.85; // Lives near bottom
  angle: number = 0; // Moves sideways
  depth: number = 0.4;
  speed: number = 22;
  seen: number = 1;

  phase: number = 0;
  seed: number = 0;
  scared: number = 0;
  facing: number = Math.PI / 2; // Crab faces forward while walking sideways

  shellColor: RGB = [204, 82, 52];
  darkColor: RGB = [120, 40, 26];
  clawColor: RGB = [226, 110, 70];

  constructor(id: string, index: number, x: number = 0.5, y: number = 0.85) {
    this.id = id;
    this.seed = index * 47 + 23;
    this.nx = x;
    this.ny = y;
    this.phase = Math.random() * TAU;

    // Palette variants
    const variants: [RGB, RGB, RGB][] = [
      [[204, 82, 52], [120, 40, 26], [226, 110, 70]],
      [[226, 124, 48], [140, 64, 26], [240, 150, 80]],
      [[170, 56, 50], [96, 28, 26], [200, 84, 70]],
      [[60, 140, 190], [25, 60, 95], [90, 180, 230]],
    ];
    const v = variants[index % variants.length];
    this.shellColor = v[0];
    this.darkColor = v[1];
    this.clawColor = v[2];
  }

  onPointerDisturb(x: number, y: number, intensity: number) {
    const d = Math.hypot(this.x - x, this.y - y);
    if (d < 220 * intensity) {
      this.scared = 2.0;
      // Scuttle quickly sideways away from pointer
      this.angle = x > this.x ? Math.PI : 0;
    }
  }

  update(dt: number, world: WorldContext) {
    const { vw, vh, time } = world;
    this.x = this.nx * vw;
    this.y = this.ny * vh;

    const walk = 0.5 + 0.5 * Math.sin(time * 0.7 + this.seed * 11);
    const isWalking = this.scared > 0 || walk > 0.3;

    if (isWalking) {
      this.phase += dt * (this.scared > 0 ? 24 : 14);
    }

    if (this.scared > 0) {
      this.scared = Math.max(0, this.scared - dt);
    } else {
      if (Math.random() < 0.015) {
        // Switch left/right walking direction
        this.angle = Math.random() < 0.5 ? 0 : Math.PI;
      }
    }

    const baseSpeed = isWalking ? (18 + (this.seed % 8)) * (this.scared > 0 ? 2.5 : 1) : 0;
    this.speed = baseSpeed;

    // Check for nearby food pellets to pinch and eat
    if (this.scared <= 0 && world.food.length > 0) {
      let nearestFood = null;
      let minD = 500 * (vw / 1000);
      for (const p of world.food) {
        if (p.eaten >= 0 || !p.landed) continue;
        const d = Math.hypot(p.x - this.x, p.y - this.y);
        if (d < minD) {
          minD = d;
          nearestFood = p;
        }
      }

      if (nearestFood) {
        nearestFood.claim++;
        this.angle = nearestFood.x > this.x ? 0 : Math.PI;
        this.ny += Math.sign(nearestFood.y - this.y) * 0.06 * dt;
        this.speed = (26 + (this.seed % 8)) * 1.5;
        this.phase += dt * 20;

        if (minD < 22) {
          nearestFood.eaten = world.time;
          nearestFood.eaterX = this.x;
          nearestFood.eaterY = this.y;
          nearestFood.eaterSpecies = "crab";
          nearestFood.eatenDuration = 0.25;
          world.addRing(this.x, this.y, 0.7, true);
          world.addBubble(this.x + 4, this.y - 4);
          world.addBubble(this.x - 4, this.y - 4);
        }
      }
    }

    const dx = Math.cos(this.angle) * this.speed * dt;
    this.nx += dx / vw;

    // Keep crab in bottom shoreline third
    this.ny = Math.min(0.92, Math.max(0.65, this.ny + Math.sin(time * 0.4 + this.seed) * 0.0005));

    if (this.nx < -0.05) this.nx = 1.05;
    if (this.nx > 1.05) this.nx = -0.05;
  }

  rasterize(
    grid: CharacterGrid,
    world: WorldContext,
    dimAt: (x: number, y: number) => number
  ) {
    const { cw, ch, cols, rows, scaleK } = grid;
    const k = scaleK * 1.2;

    const ca = Math.cos(this.facing);
    const sa = Math.sin(this.facing);
    const cx = this.x;
    const cy = this.y;

    const reach = 16 * k;
    const c0 = Math.max(0, Math.floor((cx - reach) / cw));
    const c1 = Math.min(cols - 1, Math.floor((cx + reach) / cw));
    const r0 = Math.max(0, Math.floor((cy - reach) / ch));
    const r1 = Math.min(rows - 1, Math.floor((cy + reach) / ch));

    const open = 0.5 + 0.5 * Math.sin(world.time * 2.0 + this.seed);

    for (let r = r0; r <= r1; r++) {
      for (let cCol = c0; cCol <= c1; cCol++) {
        const px = cCol * cw + cw / 2;
        const py = r * ch + ch / 2;

        const dx = px - cx;
        const dy = py - cy;
        const u = (dx * ca + dy * sa) / k;
        const v = (-dx * sa + dy * ca) / k;
        const av = Math.abs(v);

        const dim = dimAt(px, py);
        if (dim <= 0.05) continue;

        // 1. Carapace (Shell)
        const d = ell(u, v, 0, 0, 3.0, 5.0);
        if (d < 1 && u < 3.0) {
          const isSpotted = noise(u * 0.7, v * 0.7 + 5, this.seed) > 0.72;
          const col = isSpotted
            ? this.darkColor
            : d > 0.75
            ? mixC(this.shellColor, this.darkColor, 0.45)
            : this.shellColor;
          grid.setTile(cCol, r, pack(col), 0.95 * dim);
          const gChar = d > 0.8 ? "=" : isSpotted ? "#" : "%";
          grid.setGlyph(cCol, r, gChar.charCodeAt(0), pack(col), 0.6 * dim);
          continue;
        }

        // 2. Eye Stalks
        if (u >= 3.0 && u < 4.4 && Math.abs(av - 1.3) < 0.4) {
          const col = u > 3.8 ? ([20, 20, 20] as RGB) : this.darkColor;
          grid.setTile(cCol, r, pack(col), 0.95 * dim);
          grid.setGlyph(cCol, r, "o".charCodeAt(0), pack([240, 240, 240]), 0.9 * dim);
          continue;
        }

        // 3. Arms to Claws
        if (segDist(u, av, 2.2, 3.0, 4.2, 4.0) < 0.7) {
          grid.setTile(cCol, r, pack(this.clawColor), 0.9 * dim);
          continue;
        }

        // 4. Claws (Pincers)
        if (ell(u, av, 5.6, 4.1, 1.9, 1.5) < 1) {
          // Claw opening gap
          if (u > 5.9 && Math.abs(av - 4.1) < 0.5 * open) {
            continue;
          }
          grid.setTile(cCol, r, pack(this.clawColor), 0.95 * dim);
          grid.setGlyph(cCol, r, "(".charCodeAt(0), pack(this.darkColor), 0.7 * dim);
          continue;
        }

        // 5. Walking Legs (4 pairs)
        for (let i = 0; i < 4; i++) {
          const ub = 1.0 - i * 1.2;
          const ab = 4.5 - Math.abs(i - 1.5) * 0.2;
          const legPhase = this.phase + i * 1.2 + (v > 0 ? 0 : Math.PI);
          const kneeU = ub - 0.8 * Math.sin(legPhase);
          const kneeV = ab + 2.2;
          const tipU = ub - 1.6;
          const tipV = ab + 3.8 + 0.6 * Math.sin(legPhase);

          if (
            segDist(u, av, ub, ab, kneeU, kneeV) < 0.55 ||
            segDist(u, av, kneeU, kneeV, tipU, tipV) < 0.45
          ) {
            grid.setTile(cCol, r, pack(this.darkColor), 0.8 * dim);
            grid.setGlyph(cCol, r, "/".charCodeAt(0), pack(this.clawColor), 0.6 * dim);
            break;
          }
        }
      }
    }
  }
}

