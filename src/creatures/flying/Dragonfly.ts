import { Creature, WorldContext } from "../core/Creature";
import { CharacterGrid } from "../../engine/renderer/CharacterGrid";
import {
  TAU,
  lerp,
  ell,
  sq,
  pack,
  RGB,
} from "../../engine/simulation/Physics";

export class Dragonfly implements Creature {
  id: string;
  species = "dragonfly";

  x: number = 0;
  y: number = 0;
  nx: number = 0.5;
  ny: number = 0.5;
  angle: number = 0;
  depth: number = 0.85;
  speed: number = 40;
  seen: number = 1;

  phase: number = 0;
  seed: number = 0;
  scared: number = 0;

  bodyColor: RGB = [50, 220, 120];
  bandColor: RGB = [24, 118, 90];
  eyeColor: RGB = [30, 150, 110];

  constructor(id: string, index: number, x: number = 0.5, y: number = 0.5) {
    this.id = id;
    this.seed = index * 37 + 19;
    this.nx = x;
    this.ny = y;
    this.phase = Math.random() * TAU;
    this.angle = Math.random() * TAU;

    // Palette variants: Emerald, Cyan, Gold
    const variants: [RGB, RGB, RGB][] = [
      [[50, 220, 120], [24, 118, 90], [30, 150, 110]],
      [[60, 180, 255], [25, 75, 150], [40, 110, 200]],
      [[245, 180, 50], [150, 100, 20], [180, 120, 30]],
    ];
    const v = variants[index % variants.length];
    this.bodyColor = v[0];
    this.bandColor = v[1];
    this.eyeColor = v[2];
  }

  onPointerDisturb(x: number, y: number, intensity: number) {
    const d = Math.hypot(this.x - x, this.y - y);
    if (d < 200 * intensity) {
      this.scared = 1.2;
      this.angle = Math.atan2(this.y - y, this.x - x);
    }
  }

  update(dt: number, world: WorldContext) {
    const { vw, vh, time } = world;
    this.x = this.nx * vw;
    this.y = this.ny * vh;

    // High frequency wing beat
    this.phase += dt * 38;

    if (this.scared > 0) {
      this.scared = Math.max(0, this.scared - dt);
    } else {
      // Dart-and-hover movement; snatch food particles
      if (world.food.length > 0) {
        let nearestFood = null;
        let minD = 350 * (vw / 1000);
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
          this.angle = lerp(this.angle, targetA, Math.min(1, dt * 4.5));
          if (minD < 22) {
            nearestFood.eaten = world.time;
            nearestFood.eaterX = this.x;
            nearestFood.eaterY = this.y;
            nearestFood.eaterSpecies = "dragonfly";
            nearestFood.eatenDuration = 0.22;
          }
        } else if (Math.random() < 0.03) {
          this.angle += (Math.random() - 0.5) * 1.8;
        }
      } else if (Math.random() < 0.03) {
        this.angle += (Math.random() - 0.5) * 1.8;
      }
    }

    const dartMod = 0.2 + 1.8 * Math.pow(Math.sin(time * 1.5 + this.seed), 2);
    this.speed = (25 + (this.seed % 10)) * dartMod * (this.scared > 0 ? 2.5 : 1);

    const dx = Math.cos(this.angle) * this.speed * dt;
    const dy = Math.sin(this.angle) * this.speed * dt;

    this.nx += dx / vw;
    this.ny += dy / vh;

    if (this.nx < -0.1) this.nx = 1.1;
    if (this.nx > 1.1) this.nx = -0.1;
    if (this.ny < -0.1) this.ny = 1.1;
    if (this.ny > 1.1) this.ny = -0.1;
  }

  rasterize(
    grid: CharacterGrid,
    world: WorldContext,
    dimAt: (x: number, y: number) => number
  ) {
    const { cw, ch, cols, rows, scaleK } = grid;
    const k = scaleK * 1.1;

    const beat = 0.8 + 0.2 * Math.cos(this.phase);
    const ca = Math.cos(this.angle);
    const sa = Math.sin(this.angle);
    const cx = this.x;
    const cy = this.y;

    const reach = 18 * k;
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

        // Large compound eyes
        if (ell(u, v, 2.6, 0, 1.0, 1.5) < 1) {
          const col = av > 0.5 ? this.eyeColor : this.bodyColor;
          grid.setTile(cCol, r, pack(col), 0.95 * dim);
          grid.setGlyph(cCol, r, "o".charCodeAt(0), pack([220, 255, 230]), 0.8 * dim);
          continue;
        }

        // Thorax
        if (ell(u, v, 0.4, 0, 1.9, 1.15) < 1) {
          grid.setTile(cCol, r, pack(this.bodyColor), 0.95 * dim);
          grid.setGlyph(cCol, r, "#".charCodeAt(0), pack(this.bandColor), 0.7 * dim);
          continue;
        }

        // Segmented abdomen
        if (u < -1 && u > -12.5 && av < (u > -3 ? 0.62 : 0.5)) {
          const isBand = ((-u * 0.75) | 0) & 1;
          const col = isBand ? this.bandColor : this.bodyColor;
          grid.setTile(cCol, r, pack(col), 0.9 * dim);
          grid.setGlyph(cCol, r, "-".charCodeAt(0), pack(col), 0.7 * dim);
          continue;
        }

        // Dual pairs of clear veined wings
        if (av > 0.6) {
          const w = (av - 0.6) / beat;
          for (let wingPair = 0; wingPair < 2; wingPair++) {
            const base = wingPair ? -0.3 : 1.1;
            const tilt = wingPair ? -0.12 : 0.22;
            const len = wingPair ? 5.8 : 6.4;
            const perp = u - base - tilt * w;
            const d = sq((w - len * 0.5 - 0.2) / (len * 0.55)) + sq(perp / 1.15);

            if (d < 1) {
              const edge = w > len * 0.86 && Math.abs(perp) < 0.6;
              const wingCol: RGB = edge ? [70, 84, 98] : [196, 232, 255];
              grid.setTile(cCol, r, pack(wingCol), (edge ? 0.8 : 0.45) * dim);
              const gChar = edge ? "|" : "~";
              grid.setGlyph(cCol, r, gChar.charCodeAt(0), pack(wingCol), 0.5 * dim);
              break;
            }
          }
        }
      }
    }
  }
}

