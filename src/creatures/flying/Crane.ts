import { Creature, WorldContext } from "../core/Creature";
import { CharacterGrid } from "../../engine/renderer/CharacterGrid";
import {
  TAU,
  ell,
  sq,
  pack,
  RGB,
} from "../../engine/simulation/Physics";

export class Crane implements Creature {
  id: string;
  species = "crane";

  x: number = 0;
  y: number = 0;
  nx: number = 0.5;
  ny: number = 0.3;
  angle: number = -Math.PI / 4;
  depth: number = 0.95;
  speed: number = 38;
  seen: number = 1;

  phase: number = 0;
  seed: number = 0;
  scared: number = 0;

  whiteColor: RGB = [226, 230, 240];
  blackColor: RGB = [44, 46, 54];
  featherColor: RGB = [78, 82, 96];
  crownColor: RGB = [222, 42, 42];

  constructor(id: string, index: number, x: number = 0.5, y: number = 0.3) {
    this.id = id;
    this.seed = index * 41 + 13;
    this.nx = x;
    this.ny = y;
    this.phase = Math.random() * TAU;
    this.angle = -0.5 - (index * 0.05); // Northwest flock glide
  }

  onPointerDisturb(x: number, y: number, intensity: number) {
    const d = Math.hypot(this.x - x, this.y - y);
    if (d < 250 * intensity) {
      this.scared = 2.0;
      this.angle += (Math.random() - 0.5) * 1.2;
    }
  }

  update(dt: number, world: WorldContext) {
    const { vw, vh, time } = world;
    this.x = this.nx * vw;
    this.y = this.ny * vh;

    // Majestic slow wing flap
    const flapRate = this.scared > 0 ? 5.5 : 3.4;
    this.phase += dt * flapRate;

    if (this.scared > 0) {
      this.scared = Math.max(0, this.scared - dt);
    } else {
      // Gentle flock course holding
      this.angle += Math.sin(time * 0.5 + this.seed) * 0.1 * dt;
    }

    const baseSpeed = (30 + (this.seed % 10)) * (this.scared > 0 ? 1.8 : 1);
    this.speed = baseSpeed;

    const dx = Math.cos(this.angle) * this.speed * dt;
    const dy = Math.sin(this.angle) * this.speed * dt;

    this.nx += dx / vw;
    this.ny += dy / vh;

    if (this.nx < -0.15) this.nx = 1.15;
    if (this.nx > 1.15) this.nx = -0.15;
    if (this.ny < -0.15) this.ny = 1.15;
    if (this.ny > 1.15) this.ny = -0.15;
  }

  rasterize(
    grid: CharacterGrid,
    world: WorldContext,
    dimAt: (x: number, y: number) => number
  ) {
    const { cw, ch, cols, rows, scaleK } = grid;
    const k = scaleK * 1.15;

    const f = 0.55 + 0.45 * Math.cos(this.phase);
    const span = 3.5 + 9.5 * f;

    const ca = Math.cos(this.angle);
    const sa = Math.sin(this.angle);
    const cx = this.x;
    const cy = this.y;

    const reach = 22 * k;
    const c0 = Math.max(0, Math.floor((cx - reach) / cw));
    const c1 = Math.min(cols - 1, Math.floor((cx + reach) / cw));
    const r0 = Math.max(0, Math.floor((cy - reach) / ch));
    const r1 = Math.min(rows - 1, Math.floor((cy + reach) / ch));

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

        // Long yellow beak
        if (u > 9.0 && u < 10.8 && av < 0.34) {
          grid.setTile(cCol, r, pack([196, 186, 136]), 0.95 * dim);
          continue;
        }

        // Head and red crown patch
        if (ell(u, v, 8.3, 0, 0.95, 0.78) < 1) {
          const isCrown = u > 8.3 && av < 0.42;
          const col = isCrown ? this.crownColor : this.blackColor;
          grid.setTile(cCol, r, pack(col), 0.95 * dim);
          if (isCrown) {
            grid.setGlyph(cCol, r, "*".charCodeAt(0), pack([255, 100, 100]), 0.9 * dim);
          }
          continue;
        }

        // Neck (black throat stripe and white nape)
        if (u > 2.3 && u <= 8.3 && av < 0.5) {
          const col = u > 4.6 ? this.blackColor : this.whiteColor;
          grid.setTile(cCol, r, pack(col), 0.95 * dim);
          continue;
        }

        // Body
        if (ell(u, v, -1, 0, 3.8, 1.45) < 1) {
          grid.setTile(cCol, r, pack(this.whiteColor), 0.95 * dim);
          grid.setGlyph(cCol, r, "=".charCodeAt(0), pack([180, 190, 205]), 0.6 * dim);
          continue;
        }

        // Tail feathers (black bustle)
        if (u < -4.4 && u > -6.0 && av < 0.9) {
          grid.setTile(cCol, r, pack(this.blackColor), 0.95 * dim);
          continue;
        }

        // Trailing legs
        if (u <= -5.6 && u > -10.5 && Math.abs(av - 0.45) < 0.32) {
          grid.setGlyph(cCol, r, "|".charCodeAt(0), pack([130, 130, 136]), 0.8 * dim);
          continue;
        }

        // Wings
        if (av >= 1.1 && av < 1.1 + span) {
          const w = av - 1.1;
          const s = w / span;
          const uf = 1.5 - 1.7 * s - (s > 0.82 ? sq((s - 0.82) * 9) * 0.5 : 0);
          const ub = -2.5 - 1.0 * s + (s > 0.74 ? sq((s - 0.74) * 6.5) : 0);

          if (u < uf && u > ub) {
            if (u - ub < 0.55 && ((w * 1.4) | 0) & 1) continue; // feather slot separation
            const isDarkTip = s > 0.84 || (s < 0.74 && u - ub < (uf - ub) * 0.4);
            const col = isDarkTip ? this.featherColor : this.whiteColor;
            grid.setTile(cCol, r, pack(col), 0.9 * dim);
            const gChar = isDarkTip ? "#" : "%";
            grid.setGlyph(cCol, r, gChar.charCodeAt(0), pack(col), 0.5 * dim);
          }
        }
      }
    }
  }
}

