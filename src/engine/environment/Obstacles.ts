import { CharacterGrid } from "../renderer/CharacterGrid";
import { ResolvedPalette } from "../renderer/ColorPalettes";
import { clamp, ell, pack, mixC, RGB } from "../simulation/Physics";
import { audioService } from "../../services/audio";

// 1. Lily Pad
export interface LilyPad {
  id: string;
  x: number;
  y: number;
  radius: number;
  driftAngle: number;
  driftSpeed: number;
  seed: number;
  occupied: boolean;
}

// 2. River Stone
export interface RiverStone {
  id: string;
  x: number;
  y: number;
  rx: number;
  ry: number;
  seed: number;
}

// 3. Floating Paper Lantern
export interface PaperLantern {
  id: string;
  x: number;
  y: number;
  driftAngle: number;
  driftSpeed: number;
  born: number;
  flameFlicker: number;
}

// 4. Shishi-odoshi (Bamboo Water Rocker)
export class ShishiOdoshi {
  x: number = 70;
  y: number = 70;
  fillLevel: number = 0; // 0 to 1
  isTipping: boolean = false;
  tipAngle: number = 0; // 0 to 0.4 rad
  clackFlash: number = 0;

  update(dt: number, onClack: (x: number, y: number) => void) {
    if (this.clackFlash > 0) {
      this.clackFlash = Math.max(0, this.clackFlash - dt);
    }

    if (!this.isTipping) {
      // Fills gradually over ~45 seconds
      this.fillLevel += dt * 0.022;
      if (this.fillLevel >= 1.0) {
        this.isTipping = true;
      }
    } else {
      // Tip forward rapidly, clack, then spring back
      this.tipAngle += dt * 2.5;
      if (this.tipAngle >= 0.45) {
        // Impact! Clack!
        audioService.playBambooClack();
        this.clackFlash = 0.5;
        this.fillLevel = 0;
        this.isTipping = false;
        this.tipAngle = 0;
        onClack(this.x + 20, this.y + 25);
      }
    }
  }

  triggerManual() {
    this.fillLevel = 1.0;
    this.isTipping = true;
  }

  rasterize(grid: CharacterGrid, palette: ResolvedPalette, dimAt: (x: number, y: number) => number) {
    const { cw, ch } = grid;
    const c0 = Math.floor(this.x / cw);
    const r0 = Math.floor(this.y / ch);
    const dim = dimAt(this.x, this.y);

    const bambooCol: RGB = [85, 145, 65];
    const woodDark: RGB = [55, 95, 45];
    const waterDrip: RGB = [180, 225, 255];

    // Bamboo spout frame
    const asciiSpout = [
      "╔════╗   ",
      "║ /  ╚═══╗",
      "║        ║",
      "╚════════╝",
    ];

    for (let r = 0; r < asciiSpout.length; r++) {
      const line = asciiSpout[r];
      for (let c = 0; c < line.length; c++) {
        const chChar = line[c];
        if (chChar === " ") continue;
        const cc = c0 + c;
        const rr = r0 + r;
        if (grid.inBounds(cc, rr)) {
          grid.setTile(cc, rr, pack(woodDark), 0.9 * dim);
          grid.setGlyph(cc, rr, chChar.charCodeAt(0), pack(bambooCol), 0.95 * dim);
        }
      }
    }

    // Water trickling into rocker
    if (this.fillLevel > 0.1 && grid.inBounds(c0 + 5, r0 + 4)) {
      grid.setGlyph(c0 + 5, r0 + 4, ":".charCodeAt(0), pack(waterDrip), 0.8 * dim);
    }

    // Rocker bamboo pipe
    const rockerChar = this.isTipping ? "\\" : "/";
    if (grid.inBounds(c0 + 5, r0 + 3)) {
      grid.setGlyph(c0 + 5, r0 + 3, rockerChar.charCodeAt(0), pack(bambooCol), 1.0 * dim);
    }

    // Impact flash text
    if (this.clackFlash > 0 && grid.inBounds(c0 + 2, r0 + 5)) {
      const clackText = "*CLACK*";
      for (let i = 0; i < clackText.length; i++) {
        if (grid.inBounds(c0 + i, r0 + 5)) {
          grid.setGlyph(
            c0 + i,
            r0 + 5,
            clackText.charCodeAt(i),
            pack([255, 230, 100]),
            (this.clackFlash / 0.5) * dim
          );
        }
      }
    }
  }
}

export class ObstacleManager {
  lilyPads: LilyPad[] = [];
  stones: RiverStone[] = [];
  lanterns: PaperLantern[] = [];
  shishiOdoshi: ShishiOdoshi = new ShishiOdoshi();

  initForPond(vw: number, vh: number) {
    this.lilyPads = [
      {
        id: "pad_0",
        x: vw * 0.22,
        y: vh * 0.35,
        radius: 28,
        driftAngle: 0.3,
        driftSpeed: 1.5,
        seed: 12,
        occupied: false,
      },
      {
        id: "pad_1",
        x: vw * 0.72,
        y: vh * 0.65,
        radius: 34,
        driftAngle: 1.8,
        driftSpeed: 1.2,
        seed: 45,
        occupied: false,
      },
      {
        id: "pad_2",
        x: vw * 0.38,
        y: vh * 0.78,
        radius: 24,
        driftAngle: 2.5,
        driftSpeed: 1.8,
        seed: 78,
        occupied: false,
      },
    ];

    this.stones = [
      {
        id: "stone_0",
        x: vw * 0.15,
        y: vh * 0.65,
        rx: 36,
        ry: 24,
        seed: 91,
      },
      {
        id: "stone_1",
        x: vw * 0.82,
        y: vh * 0.32,
        rx: 42,
        ry: 28,
        seed: 104,
      },
    ];
  }

  addLantern(x: number, y: number) {
    this.lanterns.push({
      id: `lantern_${Date.now()}`,
      x,
      y,
      driftAngle: Math.random() * Math.PI * 2,
      driftSpeed: 2.0,
      born: Date.now(),
      flameFlicker: 0,
    });
    if (this.lanterns.length > 8) this.lanterns.shift();
  }

  update(dt: number, vw: number, vh: number, onRipple: (x: number, y: number) => void) {
    this.shishiOdoshi.update(dt, onRipple);

    // Drift lily pads gently on circular harmonic currents
    const t = Date.now() * 0.0005;
    for (const pad of this.lilyPads) {
      pad.x += Math.sin(t + pad.seed) * pad.driftSpeed * dt * 8;
      pad.y += Math.cos(t * 0.8 + pad.seed) * pad.driftSpeed * dt * 6;
    }

    // Drift lanterns
    for (const lantern of this.lanterns) {
      lantern.x += Math.cos(lantern.driftAngle) * lantern.driftSpeed * dt;
      lantern.y += Math.sin(lantern.driftAngle) * lantern.driftSpeed * dt;
      lantern.flameFlicker = 0.8 + Math.sin(Date.now() * 0.01 + lantern.x) * 0.2;
    }
  }

  // Obstacle avoidance for fish and swimming creatures
  getAvoidanceVector(x: number, y: number): { vx: number; vy: number } | null {
    for (const stone of this.stones) {
      const dx = x - stone.x;
      const dy = y - stone.y;
      const dist = Math.hypot(dx, dy);
      const avoidDist = Math.max(stone.rx, stone.ry) + 25;
      if (dist < avoidDist && dist > 0.001) {
        const force = (avoidDist - dist) / avoidDist;
        return {
          vx: (dx / dist) * force * 15,
          vy: (dy / dist) * force * 15,
        };
      }
    }
    return null;
  }

  rasterize(
    grid: CharacterGrid,
    palette: ResolvedPalette,
    dimAt: (x: number, y: number) => number
  ) {
    const { cw, ch } = grid;

    // 1. Stones
    for (const stone of this.stones) {
      const c0 = Math.max(0, Math.floor((stone.x - stone.rx) / cw));
      const c1 = Math.min(grid.cols - 1, Math.floor((stone.x + stone.rx) / cw));
      const r0 = Math.max(0, Math.floor((stone.y - stone.ry) / ch));
      const r1 = Math.min(grid.rows - 1, Math.floor((stone.y + stone.ry) / ch));

      const stoneDark: RGB = [45, 52, 58];
      const stoneHighlight: RGB = [120, 135, 145];

      for (let r = r0; r <= r1; r++) {
        for (let c = c0; c <= c1; c++) {
          const px = c * cw + cw / 2;
          const py = r * ch + ch / 2;
          const d = ell(px, py, stone.x, stone.y, stone.rx, stone.ry);
          if (d < 1) {
            const dim = dimAt(px, py);
            const isRim = d > 0.75;
            const isTop = py < stone.y;
            const col = isTop ? stoneHighlight : stoneDark;
            grid.setTile(c, r, pack(col), 0.95 * dim);
            const char = isRim ? "=" : isTop ? "." : "#";
            grid.setGlyph(c, r, char.charCodeAt(0), pack(col), 0.7 * dim);
          }
        }
      }
    }

    // 2. Lily Pads
    for (const pad of this.lilyPads) {
      const c0 = Math.max(0, Math.floor((pad.x - pad.radius) / cw));
      const c1 = Math.min(grid.cols - 1, Math.floor((pad.x + pad.radius) / cw));
      const r0 = Math.max(0, Math.floor((pad.y - pad.radius) / ch));
      const r1 = Math.min(grid.rows - 1, Math.floor((pad.y + pad.radius) / ch));

      const padGreen: RGB = [42, 128, 68];
      const padRim: RGB = [28, 86, 46];
      const flowerPink: RGB = [255, 160, 190];

      for (let r = r0; r <= r1; r++) {
        for (let c = c0; c <= c1; c++) {
          const px = c * cw + cw / 2;
          const py = r * ch + ch / 2;
          const dx = px - pad.x;
          const dy = py - pad.y;
          const dist = Math.hypot(dx, dy);

          if (dist < pad.radius) {
            // Radial notch cleft
            const angle = Math.atan2(dy, dx);
            if (Math.abs(angle - pad.driftAngle) < 0.22) continue;

            const dim = dimAt(px, py);
            const isRim = dist > pad.radius - 4;
            const col = isRim ? padRim : padGreen;
            grid.setTile(c, r, pack(col), 0.9 * dim);
            grid.setGlyph(
              c,
              r,
              (isRim ? "-" : "#").charCodeAt(0),
              pack(col),
              0.6 * dim
            );

            // Blossom in center of pad
            if (dist < 4) {
              grid.setGlyph(c, r, "✿".charCodeAt(0), pack(flowerPink), 1.0 * dim);
            }
          }
        }
      }
    }

    // 3. Floating Paper Lanterns
    for (const l of this.lanterns) {
      const c = Math.floor(l.x / cw);
      const r = Math.floor(l.y / ch);
      const dim = dimAt(l.x, l.y);

      const paperCol: RGB = [255, 235, 180];
      const flameCol: RGB = [255, 120, 40];

      if (grid.inBounds(c, r)) {
        grid.setTile(c, r, pack(paperCol), 0.95 * dim);
        grid.setGlyph(c, r, "▲".charCodeAt(0), pack(flameCol), l.flameFlicker * dim);

        // Radial glow illuminates surroundings
        for (let dr = -3; dr <= 3; dr++) {
          for (let dc = -3; dc <= 3; dc++) {
            const cc = c + dc;
            const rr = r + dr;
            const dist = Math.hypot(dc, dr);
            if (dist <= 3 && grid.inBounds(cc, rr)) {
              const glow = (1 - dist / 3.5) * 0.45 * l.flameFlicker;
              grid.setShade(cc, rr, Math.max(grid.shade[rr * grid.cols + cc], glow * dim));
            }
          }
        }
      }
    }

    // 4. Shishi-odoshi
    this.shishiOdoshi.rasterize(grid, palette, dimAt);
  }
}

