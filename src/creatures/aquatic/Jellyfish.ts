import { Creature, WorldContext } from "../core/Creature";
import { CharacterGrid } from "../../engine/renderer/CharacterGrid";
import {
  clamp,
  lerp,
  TAU,
  ell,
  sq,
  mixC,
  pack,
  RGB,
} from "../../engine/simulation/Physics";

export class Jellyfish implements Creature {
  id: string;
  species = "jellyfish";

  x: number = 0;
  y: number = 0;
  nx: number = 0.5;
  ny: number = 0.5;
  angle: number = -Math.PI / 2; // Upward facing
  depth: number = 0.6;
  speed: number = 18;
  seen: number = 1;

  phase: number = 0;
  seed: number = 0;
  scared: number = 0;

  // Visual parameters
  bellColor: RGB = [232, 56, 182];
  coreColor: RGB = [255, 172, 230];
  armColor: RGB = [240, 112, 202];

  constructor(id: string, index: number, x: number = 0.5, y: number = 0.5) {
    this.id = id;
    this.seed = index * 43 + 17;
    this.nx = x;
    this.ny = y;
    this.phase = Math.random() * TAU;
    this.depth = 0.4 + Math.random() * 0.5;

    // Palette variants
    const variants: [RGB, RGB, RGB][] = [
      [[232, 56, 182], [255, 172, 230], [240, 112, 202]],
      [[64, 165, 245], [180, 225, 255], [100, 190, 255]],
      [[168, 78, 240], [226, 182, 255], [190, 122, 250]],
      [[46, 213, 175], [175, 255, 235], [92, 232, 200]],
    ];
    const v = variants[index % variants.length];
    this.bellColor = v[0];
    this.coreColor = v[1];
    this.armColor = v[2];
  }

  onPointerDisturb(x: number, y: number, intensity: number) {
    const d = Math.hypot(this.x - x, this.y - y);
    if (d < 250 * intensity) {
      this.scared = 1.5;
      // Start a fresh, powerful contraction pulse
      this.phase = Math.floor(this.phase / TAU) * TAU + TAU + 0.1;
    }
  }

  update(dt: number, world: WorldContext) {
    const { vw, vh, time } = world;
    this.x = this.nx * vw;
    this.y = this.ny * vh;

    // Rhythmic contraction
    const pulseRate = this.scared > 0 ? 4.5 : 2.2;
    this.phase += dt * pulseRate;
    if (this.scared > 0) {
      this.scared = Math.max(0, this.scared - dt);
    }

    const c = Math.pow(Math.max(0, Math.sin(this.phase)), 2);
    const speedMod = 0.35 + 1.8 * c;

    // Gentle upward drift with side sway
    const sway = Math.sin(time * 0.6 + this.seed) * 0.25;
    this.angle = -Math.PI / 2 + sway;

    // Feed on food drifting through the deep ocean
    if (world.food.length > 0) {
      let nearestFood = null;
      let minD = 380 * (vw / 1000);
      for (const p of world.food) {
        if (p.eaten >= 0) continue;
        const d = Math.hypot(p.x - this.x, p.y - this.y);
        if (d < minD) {
          minD = d;
          nearestFood = p;
        }
      }

      if (nearestFood) {
        nearestFood.claim++;
        const targetA = Math.atan2(nearestFood.y - this.y, nearestFood.x - this.x);
        this.angle = lerp(this.angle, targetA, Math.min(1, dt * 2.8));

        if (minD < 28) {
          nearestFood.eaten = world.time;
          nearestFood.eaterX = this.x;
          nearestFood.eaterY = this.y;
          nearestFood.eaterSpecies = "jellyfish";
          nearestFood.eatenDuration = 0.32;
          this.scared = 1.2; // Bioluminescent flash on feed
          world.addRing(this.x, this.y, 0.9, true);
          world.addBubble(this.x, this.y);
        }
      }
    }

    const baseSpeed = (12 + (this.seed % 8)) * (this.scared > 0 ? 2.2 : 1);
    this.speed = baseSpeed * speedMod;

    const dx = Math.cos(this.angle) * this.speed * dt;
    const dy = Math.sin(this.angle) * this.speed * dt;

    this.nx += dx / vw;
    this.ny += dy / vh;

    // Wrap around screen with margin
    if (this.ny < -0.15) this.ny = 1.15;
    if (this.ny > 1.15) this.ny = -0.15;
    if (this.nx < -0.1) this.nx = 1.1;
    if (this.nx > 1.1) this.nx = -0.1;

    // Emit gentle bubble during strong contraction
    if (c > 0.95 && Math.random() < 0.1) {
      world.addBubble(this.x, this.y + 20);
    }
  }

  rasterize(
    grid: CharacterGrid,
    world: WorldContext,
    dimAt: (x: number, y: number) => number
  ) {
    const { cw, ch, cols, rows, scaleK } = grid;
    const k = scaleK * 1.35;
    const c = Math.pow(Math.max(0, Math.sin(this.phase)), 2);

    const Rw = 5.4 * (1 - 0.2 * c) * k;
    const H = 4.6 * (1 + 0.18 * c) * k;
    const ca = Math.cos(this.angle);
    const sa = Math.sin(this.angle);

    const cx = this.x;
    const cy = this.y;

    // Bound in grid cells
    const maxR = Math.max(Rw, 18 * k);
    const c0 = Math.max(0, Math.floor((cx - maxR) / cw));
    const c1 = Math.min(cols - 1, Math.floor((cx + maxR) / cw));
    const r0 = Math.max(0, Math.floor((cy - maxR) / ch));
    const r1 = Math.min(rows - 1, Math.floor((cy + maxR) / ch));

    const glow = 1 + 0.4 * c + (this.scared > 0 ? 0.5 : 0);

    for (let r = r0; r <= r1; r++) {
      for (let cCol = c0; cCol <= c1; cCol++) {
        const px = cCol * cw + cw / 2;
        const py = r * ch + ch / 2;

        const dx = px - cx;
        const dy = py - cy;
        // Transform into jellyfish local space (+u points forward / up)
        const u = (dx * ca + dy * sa) / k;
        const v = (-dx * sa + dy * ca) / k;
        const av = Math.abs(v);

        const dim = dimAt(px, py);
        if (dim <= 0.05) continue;

        // 1. Bell (u >= -0.5)
        if (u >= -0.5) {
          const d = sq(Math.max(u, 0) / (H / k)) + sq(v / (Rw / k));
          if (d < 1) {
            if (u < 0 && ((Math.floor((v + 40) * 0.8) & 1) === 1)) {
              continue; // rim scallops
            }
            if (d < 0.32) {
              // Glowing inner core
              const col = mixC(this.coreColor, [255, 255, 255], 0.3);
              grid.setTile(cCol, r, pack(col), 0.95 * dim);
              grid.setGlyph(cCol, r, "*".charCodeAt(0), pack(col), 0.8 * dim);
            } else {
              // Outer bell
              const rim = d > 0.78;
              grid.setTile(
                cCol,
                r,
                pack(this.bellColor),
                (rim ? 0.7 : 0.85) * dim * glow
              );
              const gChar = rim ? "·" : "o";
              grid.setGlyph(
                cCol,
                r,
                gChar.charCodeAt(0),
                pack(this.bellColor),
                0.6 * dim
              );
            }
          }
          continue;
        }

        // 2. Trailing Tentacles and Oral Arms (u < -0.5)
        const depth = -u;
        if (depth > 16) continue;

        // Oral arms in center
        const armW = 1.5 + 0.5 * Math.sin(this.phase * 0.8 + depth * 0.6);
        if (depth < 8.5 && av < armW * (1 - depth / 12)) {
          const chars = "$§%&";
          const charCode = chars.charCodeAt((Math.floor(depth) + cCol) % chars.length);
          grid.setGlyph(
            cCol,
            r,
            charCode,
            pack(this.armColor),
            (0.95 - depth * 0.05) * dim
          );
          continue;
        }

        // Outer flowing tentacles
        const pull = 1 - 0.12 * c;
        for (let tStep = -4.3; tStep <= 4.4; tStep += 2.15) {
          if (Math.abs(tStep) < 1) continue;
          const curveV =
            tStep * pull +
            0.9 *
              Math.sin(this.phase * 0.7 + depth * 0.42 + tStep) *
              (depth / 12);
          if (Math.abs(v - curveV) < 0.6) {
            const tChars = "()|:";
            const tCode = tChars.charCodeAt(
              (Math.floor(depth * 1.5) + cCol) % tChars.length
            );
            grid.setGlyph(
              cCol,
              r,
              tCode,
              pack(this.armColor),
              0.85 * (1 - depth / 16) * dim
            );
            break;
          }
        }
      }
    }
  }
}

