import { CharacterGrid } from "./CharacterGrid";
import { World } from "../simulation/World";
import { drawPaw } from "../interactions/Paw";
import {
  pack,
  mul,
  css,
  mixC,
  clamp,
  lerp,
  lineGlyph,
  h2,
  RGB,
} from "../simulation/Physics";

const MONO_FONT = `"Geist Mono", ui-monospace, Menlo, Consolas, monospace`;

export class GlyphRenderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  grid: CharacterGrid;

  constructor(canvas: HTMLCanvasElement, grid: CharacterGrid) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Could not get 2D context");
    this.ctx = ctx;
    this.grid = grid;
  }

  resize(w: number, h: number, dpr: number = 1, cellMod: number = 1.0) {
    this.grid.resize(w, h, dpr, cellMod);
    this.canvas.width = Math.round(this.grid.vw * this.grid.dpr);
    this.canvas.height = Math.round(this.grid.vh * this.grid.dpr);
  }

  private ringAt(px: number, py: number, world: World): { a: number; g: string } | null {
    let best: { a: number; g: string } | null = null;
    const { rings, time } = world;
    const { cw } = this.grid;

    for (const g of rings) {
      const age = time - g.born;
      const maxLife = g.tiny ? 0.7 : g.small ? 1.2 : 2.6;
      const life = 1 - age / maxLife;
      if (life <= 0 || age < 0) continue;

      const dx = px - g.x;
      const dy = py - g.y;
      const d = Math.hypot(dx, dy);

      const count = g.small ? 1 : 2;
      for (let j = 0; j < count; j++) {
        const ag = age - j * 0.38;
        if (ag <= 0) continue;
        const R = (g.small ? ag * 34 + 4 : ag * 74 + 26) * g.k;
        if (Math.abs(d - R) > cw * 0.62) continue;
        const a =
          life ** 1.5 * (j ? 0.32 : g.tiny ? 0.28 : g.small ? 0.45 : 0.62);
        if (!best || a > best.a) {
          best = { a, g: j || g.tiny ? "·" : lineGlyph(-dy, dx) };
        }
      }
    }
    return best;
  }

  private drawFood(world: World) {
    const { food, bubbles, time, palette } = world;
    const { dpr, cw, ch } = this.grid;
    const ctx = this.ctx;
    if (!food.length && !bubbles.length) return;

    const px = (v: number) => Math.round(v * dpr) / dpr;
    const body = css(pack(palette.food));
    const top = css(pack(mixC(palette.food, [255, 236, 200], 0.35)));
    const shadow = palette.dark
      ? "#000"
      : css(pack(mul(palette.water, 0.5)));

    const pw = cw * 0.62;
    const ph = ch * 0.48;

    for (const p of food) {
      if (time < p.born || p.eaten >= 0) continue;
      let x = p.x;
      let y = p.y;
      let hh = 0;
      let a = 1;
      let big = 1;

      if (!p.landed) {
        const u = clamp((time - p.born) / (p.land - p.born), 0, 1);
        x = lerp(p.x0, p.x, u);
        y = lerp(p.y0, p.y, u);
        hh = 4 * u * (1 - u);
        big = 1 + 0.9 * (1 - u);
      } else {
        const age = time - p.land;
        a = 1 - clamp((age - 16) / 2.5, 0, 1);
        hh = age < 0.3 ? 0.25 * Math.sin((age / 0.3) * Math.PI) : 0;
      }

      const w = pw * big;
      const h = ph * big;
      const X = px(x - w / 2);
      const Y = px(y - h / 2);

      ctx.globalAlpha = a * (palette.dark ? 0.55 : 0.28);
      ctx.fillStyle = shadow;
      ctx.fillRect(
        px(X + pw * (0.7 + hh * 5)),
        px(Y + ph * (0.8 + hh * 4)),
        px(w),
        px(h)
      );

      ctx.globalAlpha =
        a * (p.landed && time - p.land > 16 * 0.6 ? 0.85 : 1);
      ctx.fillStyle = body;
      ctx.fillRect(X, Y, px(w), px(h));

      ctx.fillStyle = top;
      ctx.fillRect(X, Y, px(w), px(Math.max(1, h * 0.34)));
    }

    if (bubbles.length) {
      ctx.font = `600 ${Math.round(ch * 0.74)}px ${MONO_FONT}`;
      ctx.fillStyle = css(pack(palette.dot));
      for (const b of bubbles) {
        const u = (time - b.born) / 0.75;
        if (u < 0 || u >= 1) continue;
        ctx.globalAlpha = 0.85 * (1 - u * u);
        ctx.fillText(
          u < 0.35 ? "o" : u < 0.7 ? "°" : "·",
          b.x,
          b.y - u * ch * 0.8
        );
      }
    }
    ctx.globalAlpha = 1;
  }

  render(world: World) {
    const { ctx, grid } = this;
    const {
      vw,
      vh,
      dpr,
      cw,
      ch,
      cols,
      rows,
      tileA,
      tileRGB,
      glyphA,
      glyphRGB,
      glyphCode,
      shade,
      wake,
      touched,
    } = grid;
    const { palette, creatures, dimAt, water, time, paws, biome } = world;

    // 1. Reset rasterized cells from previous frame
    grid.clear();

    // 2. Sort creatures by depth and rasterize into grid
    const sortedCreatures = [...creatures].sort((a, b) => a.depth - b.depth);
    for (const c of sortedCreatures) {
      c.rasterize(grid, world, dimAt);
    }

    // 3. Rasterize ambient particles
    world.particles.rasterize(grid, palette, dimAt);

    // 4. Begin Canvas Frame Rendering
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Viewport background
    ctx.globalAlpha = 1;
    ctx.fillStyle = css(pack(palette.water));
    ctx.fillRect(0, 0, vw, vh);

    ctx.font = `600 ${Math.round(ch * 0.74)}px ${MONO_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const dot = css(pack(palette.dot));
    const shadeFill = palette.dark
      ? "#000"
      : css(pack(mul(palette.water, 0.55)));
    const snap = (v: number) => Math.round(v * dpr) / dpr;
    const gap = cw * 0.05;

    // 5. Draw Shadows on Floor
    ctx.fillStyle = shadeFill;
    for (let i = 0; i < shade.length; i++) {
      if (!(shade[i] > 0)) continue;
      const x = (i % cols) * cw;
      const y = ((i / cols) | 0) * ch;
      ctx.globalAlpha = shade[i];
      ctx.fillRect(
        snap(x),
        snap(y),
        snap(x + cw) - snap(x),
        snap(y + ch) - snap(y)
      );
    }

    // 6. Draw Solid Colored Cell Rectangles (batched by color)
    let currentFill = -1;
    for (let k = 0; k < touched.length; k++) {
      const i = touched[k];
      if (!(tileA[i] > 0)) continue;
      const x = (i % cols) * cw;
      const y = ((i / cols) | 0) * ch;
      const x0 = snap(x + gap);
      const y0 = snap(y + gap);

      if (tileRGB[i] !== currentFill) {
        currentFill = tileRGB[i];
        ctx.fillStyle = css(currentFill);
      }
      ctx.globalAlpha = tileA[i];
      ctx.fillRect(
        x0,
        y0,
        snap(x + cw - gap) - x0,
        snap(y + ch - gap) - y0
      );
    }

    // 7. Draw Environmental Water Grid (Caustics, Wakes, Rings, Ambient Sparkles)
    ctx.fillStyle = dot;
    const sparkProb = 0.022;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        const x = c * cw + cw / 2;
        const y = r * ch + ch / 2;

        if (tileA[i] > 0 || glyphA[i] > 0) continue;

        // Ripple rings from splash/food
        if (world.rings.length > 0) {
          const g = this.ringAt(x, y, world);
          if (g) {
            ctx.globalAlpha = g.a;
            ctx.fillText(g.g, x, y);
            continue;
          }
        }

        // Tail wake
        const w = wake[i];
        if (w > 0.03) {
          ctx.globalAlpha = Math.min(0.5, w * 1.2);
          ctx.fillText(w > 0.25 ? ":" : "·", x, y);
          continue;
        }

        // Caustic net on open water
        if (biome.hasWaterCaustics) {
          const cl = water.caustics(x, y, time);
          if (cl > 0.8) {
            ctx.globalAlpha = (cl - 0.8) * 1.3;
            ctx.fillText(cl > 0.94 ? "~" : cl > 0.87 ? "-" : "·", x, y);
            continue;
          }
        }

        // Subtle ambient sparkle on empty water
        const h = h2(c, r);
        if (h < sparkProb) {
          ctx.globalAlpha =
            0.1 + 0.12 * (0.5 + 0.5 * Math.sin(time * 0.9 + h * 900));
          ctx.fillText("·", x, y);
        }
      }
    }

    // 8. Draw ASCII Foreground Glyph Characters (batched by color)
    currentFill = -1;
    for (let k = 0; k < touched.length; k++) {
      const i = touched[k];
      if (!(glyphA[i] > 0) || glyphCode[i] === 32) continue;

      if (glyphRGB[i] !== currentFill) {
        currentFill = glyphRGB[i];
        ctx.fillStyle = css(currentFill);
      }
      ctx.globalAlpha = glyphA[i];
      ctx.fillText(
        String.fromCharCode(glyphCode[i]),
        (i % cols) * cw + cw / 2,
        ((i / cols) | 0) * ch + ch / 2
      );
    }

    // 9. Draw Food Pellets and Bubbles
    this.drawFood(world);

    // 10. Draw Cat Paws
    for (const p of paws) {
      drawPaw(ctx, p, time, cw, ch, vw, vh, dpr, palette);
    }

    ctx.globalAlpha = 1;
  }
}

