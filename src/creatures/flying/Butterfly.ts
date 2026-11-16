import { Creature, WorldContext } from "../core/Creature";
import { CharacterGrid } from "../../engine/renderer/CharacterGrid";
import {
  clamp,
  TAU,
  ell,
  sq,
  mixC,
  pack,
  noise,
  RGB,
} from "../../engine/simulation/Physics";

export class Butterfly implements Creature {
  id: string;
  species = "butterfly";

  x: number = 0;
  y: number = 0;
  nx: number = 0.5;
  ny: number = 0.5;
  angle: number = 0;
  depth: number = 0.8;
  speed: number = 32;
  seen: number = 1;

  phase: number = 0;
  seed: number = 0;
  scared: number = 0;

  wingColor: RGB = [50, 135, 255];
  innerColor: RGB = [24, 64, 170];
  edgeColor: RGB = [12, 22, 56];

  constructor(id: string, index: number, x: number = 0.5, y: number = 0.5) {
    this.id = id;
    this.seed = index * 59 + 29;
    this.nx = x;
    this.ny = y;
    this.phase = Math.random() * TAU;
    this.angle = (Math.random() - 0.5) * Math.PI;

    // Palette variants: Sapphire Blue, Monarch Orange, Emerald, Amethyst
    const variants: [RGB, RGB, RGB][] = [
      [[50, 135, 255], [24, 64, 170], [12, 22, 56]],
      [[255, 120, 30], [180, 50, 15], [40, 15, 10]],
      [[60, 220, 130], [20, 120, 60], [10, 35, 20]],
      [[210, 80, 240], [120, 30, 160], [35, 10, 50]],
      [[250, 210, 60], [200, 120, 20], [50, 30, 10]],
    ];
    const v = variants[index % variants.length];
    this.wingColor = v[0];
    this.innerColor = v[1];
    this.edgeColor = v[2];
  }

  onPointerDisturb(x: number, y: number, intensity: number) {
    const d = Math.hypot(this.x - x, this.y - y);
    if (d < 220 * intensity) {
      this.scared = 1.8;
      // Scatter away from disturbance
      this.angle = Math.atan2(this.y - y, this.x - x) + (Math.random() - 0.5);
    }
  }

  update(dt: number, world: WorldContext) {
    const { vw, vh, time } = world;
    this.x = this.nx * vw;
    this.y = this.ny * vh;

    // Flapping rate
    const flapRate = this.scared > 0 ? 16 : 9;
    this.phase += dt * flapRate;

    if (this.scared > 0) {
      this.scared = Math.max(0, this.scared - dt);
    } else {
      // Natural gentle wandering and floral wobble
      const wobble =
        0.55 * Math.sin(time * 1.7 + this.seed * 5) +
        0.25 * Math.sin(time * 3.3 + this.seed);
      this.angle += wobble * dt * 2;
    }

    const baseSpeed = (26 + (this.seed % 12)) * (this.scared > 0 ? 2.5 : 1);
    this.speed = baseSpeed;

    const dx = Math.cos(this.angle) * this.speed * dt;
    const dy = Math.sin(this.angle) * this.speed * dt;

    this.nx += dx / vw;
    this.ny += dy / vh;

    // Screen wrapping
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

    // Wing fold factor from phase
    const c = 0.5 + 0.5 * Math.cos(this.phase);
    const f = 0.14 + 0.86 * Math.pow(c, 0.75);

    const ca = Math.cos(this.angle);
    const sa = Math.sin(this.angle);
    const cx = this.x;
    const cy = this.y;

    const reach = 16 * k;
    const c0 = Math.max(0, Math.floor((cx - reach) / cw));
    const c1 = Math.min(cols - 1, Math.floor((cx + reach) / cw));
    const r0 = Math.max(0, Math.floor((cy - reach) / ch));
    const r1 = Math.min(rows - 1, Math.floor((cy + reach) / ch));

    const WHITE: RGB = [245, 245, 255];

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

        // Head and thorax
        if (ell(u, v, 5.0, 0, 1.15, 1.0) < 1) {
          grid.setTile(cCol, r, pack([30, 40, 72]), 0.95 * dim);
          continue;
        }

        // Abdomen
        if (av < 0.7 && u > -5.2 && u < 4.4) {
          grid.setTile(cCol, r, pack([38, 50, 88]), 0.95 * dim);
          grid.setGlyph(cCol, r, "=".charCodeAt(0), pack([50, 70, 110]), 0.7 * dim);
          continue;
        }

        // Antennae
        if (u > 5.8 && u < 9.3) {
          const cv = 0.45 + (u - 5.8) * 0.5;
          if (Math.abs(av - cv) < 0.5) {
            const chCode = u > 8.4 ? "o".charCodeAt(0) : ".".charCodeAt(0);
            grid.setGlyph(
              cCol,
              r,
              chCode,
              pack([160, 190, 240]),
              0.9 * dim
            );
            continue;
          }
        }

        // Wings
        if (av < 0.6) continue;
        const w = (av - 0.6) / f;
        const d1 = sq((u - 0.8 - 0.42 * w) / 3.7) + sq((w - 4.4) / 4.7);
        const d2 = sq((u + 3.1 + 0.15 * w) / 3.1) + sq((w - 3.3) / 3.7);
        const d = Math.min(d1, d2);

        if (d >= 1) continue;

        const shade = 0.58 + 0.42 * f;
        if (d > 0.7) {
          // Wing border with white dots
          const isWhiteSpot = noise(u * 1.1 + 3, w * 1.1, this.seed) > 0.7;
          const col = isWhiteSpot ? WHITE : this.edgeColor;
          grid.setTile(cCol, r, pack(col), 0.9 * dim);
          const gChar = isWhiteSpot ? "*" : ":";
          grid.setGlyph(cCol, r, gChar.charCodeAt(0), pack(col), 0.6 * dim);
        } else {
          // Wing interior gradient
          const tGrad = clamp((w - 1.3) / 2.4, 0, 1);
          const col =
            w < 1.3 ? this.innerColor : mixC(this.innerColor, this.wingColor, tGrad);
          grid.setTile(cCol, r, pack(col), 0.85 * dim * shade);
          const gChar = d < 0.3 ? "#" : "%";
          grid.setGlyph(cCol, r, gChar.charCodeAt(0), pack(this.wingColor), 0.5 * dim);
        }
      }
    }
  }
}

