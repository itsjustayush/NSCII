import { Creature, WorldContext } from "../core/Creature";
import { CharacterGrid } from "../../engine/renderer/CharacterGrid";
import {
  TAU,
  ell,
  lerp,
  pack,
  noise,
  segDist,
  RGB,
} from "../../engine/simulation/Physics";

export class Frog implements Creature {
  id: string;
  species = "frog";

  x: number = 0;
  y: number = 0;
  nx: number = 0.5;
  ny: number = 0.5;
  angle: number = 0;
  depth: number = 0.6;
  speed: number = 15;
  seen: number = 1;

  phase: number = 0;
  seed: number = 0;
  scared: number = 0;
  ext: number = 0; // Leg extension factor (0=tucked, 1=fully extended)

  skinColor: RGB = [104, 184, 76];
  spotColor: RGB = [52, 110, 40];
  eyeColor: RGB = [196, 224, 112];

  constructor(id: string, index: number, x: number = 0.5, y: number = 0.5) {
    this.id = id;
    this.seed = index * 53 + 31;
    this.nx = x;
    this.ny = y;
    this.phase = Math.random() * TAU;
    this.angle = Math.random() * TAU;

    // Palette variants
    const variants: [RGB, RGB, RGB][] = [
      [[104, 184, 76], [52, 110, 40], [196, 224, 112]],
      [[150, 170, 70], [82, 96, 36], [214, 214, 120]],
      [[72, 170, 130], [30, 100, 80], [170, 226, 160]],
      [[195, 140, 50], [120, 80, 20], [240, 210, 100]],
    ];
    const v = variants[index % variants.length];
    this.skinColor = v[0];
    this.spotColor = v[1];
    this.eyeColor = v[2];
  }

  onPointerDisturb(x: number, y: number, intensity: number) {
    const d = Math.hypot(this.x - x, this.y - y);
    if (d < 220 * intensity) {
      this.scared = 2.0;
      // Kick off an immediate leap away
      this.angle = Math.atan2(this.y - y, this.x - x);
      this.phase = Math.floor(this.phase / TAU) * TAU + TAU + 0.05;
    }
  }

  update(dt: number, world: WorldContext) {
    const { vw, vh } = world;
    this.x = this.nx * vw;
    this.y = this.ny * vh;

    const leapRate = this.scared > 0 ? 5.5 : 2.5;
    this.phase += dt * leapRate;

    if (this.scared > 0) {
      this.scared = Math.max(0, this.scared - dt);
    } else {
      // Frog eating behavior: notice food, orient and leap towards it
      if (world.food.length > 0) {
        let nearestFood = null;
        let minD = 450 * (vw / 1000);
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
          this.angle = Math.atan2(nearestFood.y - this.y, nearestFood.x - this.x);
          if (minD < 32) {
            nearestFood.eaten = world.time;
            nearestFood.eaterX = this.x;
            nearestFood.eaterY = this.y;
            nearestFood.eaterSpecies = "frog";
            nearestFood.eatenDuration = 0.22;
            world.addRing(this.x, this.y, 0.8, true);
            world.addBubble(this.x, this.y - 8);
          }
        } else if (Math.random() < 0.02) {
          this.angle += (Math.random() - 0.5) * 1.5;
        }
      } else if (Math.random() < 0.02) {
        this.angle += (Math.random() - 0.5) * 1.5;
      }
    }

    const s = Math.max(0, Math.sin(this.phase));
    this.ext = 0.5 + 0.5 * Math.sin(this.phase - 0.5);
    const speedMod = 0.08 + 2.8 * s * s * s;

    this.speed = (18 + (this.seed % 8)) * speedMod * (this.scared > 0 ? 2 : 1);

    const dx = Math.cos(this.angle) * this.speed * dt;
    const dy = Math.sin(this.angle) * this.speed * dt;

    this.nx += dx / vw;
    this.ny += dy / vh;

    // Ripple ring on landing when leap cycle finishes
    if (s < 0.08 && this.speed > 8) {
      world.addRing(this.x, this.y, 0.9, true);
    }

    if (this.nx < -0.05) this.nx = 1.05;
    if (this.nx > 1.05) this.nx = -0.05;
    if (this.ny < -0.05) this.ny = 1.05;
    if (this.ny > 1.05) this.ny = -0.05;
  }

  rasterize(
    grid: CharacterGrid,
    world: WorldContext,
    dimAt: (x: number, y: number) => number
  ) {
    const { cw, ch, cols, rows, scaleK } = grid;
    const k = scaleK * 1.1;

    const ca = Math.cos(this.angle);
    const sa = Math.sin(this.angle);
    const cx = this.x;
    const cy = this.y;

    const reach = 16 * k;
    const c0 = Math.max(0, Math.floor((cx - reach) / cw));
    const c1 = Math.min(cols - 1, Math.floor((cx + reach) / cw));
    const r0 = Math.max(0, Math.floor((cy - reach) / ch));
    const r1 = Math.min(rows - 1, Math.floor((cy + reach) / ch));

    const xExt = this.ext;
    const kx = lerp(-1.2, -5.2, xExt);
    const ky = lerp(4.8, 3.4, xExt);
    const fx = lerp(-4.4, -9.8, xExt);
    const fy = lerp(4.6, 2.9, xExt);
    const hx = lerp(3.8, 3.2, xExt);
    const hy = lerp(4.2, 4.4, xExt);

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

        // Big protruding eyes with pupils
        if (ell(u, av, 3.1, 1.85, 1.0, 1.0) < 1) {
          if (ell(u, av, 3.25, 2.0, 0.48, 0.48) < 1) {
            grid.setTile(cCol, r, pack([16, 22, 16]), 0.95 * dim);
            grid.setGlyph(cCol, r, "·".charCodeAt(0), pack([255, 255, 255]), 0.9 * dim);
          } else {
            grid.setTile(cCol, r, pack(this.eyeColor), 0.95 * dim);
            grid.setGlyph(cCol, r, "o".charCodeAt(0), pack([240, 240, 200]), 0.8 * dim);
          }
          continue;
        }

        // Tapered torso
        const rv = 3.0 * (1 - 0.28 * Math.max(0, (u - 0.4) / 4.6));
        if (ell(u, v, 0.4, 0, 4.6, rv) < 1) {
          const isSpot = noise(u * 0.55 + 4, v * 0.55, this.seed) > 0.68;
          const col = isSpot ? this.spotColor : this.skinColor;
          grid.setTile(cCol, r, pack(col), 0.95 * dim);
          const gChar = isSpot ? "@" : "%";
          grid.setGlyph(cCol, r, gChar.charCodeAt(0), pack(col), 0.6 * dim);
          continue;
        }

        // Hind legs (extending during leap)
        if (
          segDist(u, av, -2.6, 2.0, kx, ky) < 0.95 ||
          segDist(u, av, kx, ky, fx, fy) < 0.7
        ) {
          grid.setTile(cCol, r, pack(this.skinColor), 0.9 * dim);
          grid.setGlyph(cCol, r, "/".charCodeAt(0), pack(this.spotColor), 0.6 * dim);
          continue;
        }

        // Webbed back feet
        if (ell(u, av, fx - 0.6, fy, 1.3, 1.1) < 1) {
          grid.setTile(cCol, r, pack(this.skinColor), 0.85 * dim);
          continue;
        }

        // Forelegs
        if (segDist(u, av, 2.0, 2.3, hx, hy) < 0.55) {
          grid.setTile(cCol, r, pack(this.skinColor), 0.9 * dim);
          continue;
        }
      }
    }
  }
}

