import { CharacterGrid } from "../renderer/CharacterGrid";
import { ResolvedPalette } from "../renderer/ColorPalettes";
import { pack, RGB } from "../simulation/Physics";

export interface AmbientParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  char: string;
  color: RGB;
  opacity: number;
  life: number;
  maxLife: number;
  size?: number;
}

export class ParticleSystem {
  particles: AmbientParticle[] = [];

  spawnPetal(vw: number, vh: number, color: RGB = [255, 180, 200]) {
    this.particles.push({
      x: Math.random() * vw,
      y: -10,
      vx: 15 + Math.random() * 20,
      vy: 20 + Math.random() * 25,
      char: Math.random() < 0.5 ? "✿" : "·",
      color,
      opacity: 0.7 + Math.random() * 0.3,
      life: 0,
      maxLife: 15 + Math.random() * 10,
    });
  }

  spawnFirefly(vw: number, vh: number, color: RGB = [200, 255, 120]) {
    this.particles.push({
      x: Math.random() * vw,
      y: Math.random() * vh,
      vx: (Math.random() - 0.5) * 15,
      vy: (Math.random() - 0.5) * 15,
      char: "*",
      color,
      opacity: 0.2 + Math.random() * 0.8,
      life: 0,
      maxLife: 6 + Math.random() * 8,
    });
  }

  spawnBubble(x: number, y: number, color: RGB = [200, 230, 255]) {
    this.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 10,
      vy: -25 - Math.random() * 20,
      char: Math.random() < 0.4 ? "o" : "°",
      color,
      opacity: 0.8,
      life: 0,
      maxLife: 3 + Math.random() * 2,
    });
  }

  update(dt: number, vw: number, vh: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (p.life >= p.maxLife || p.x > vw + 20 || p.y > vh + 20) {
        this.particles.splice(i, 1);
      }
    }
  }

  rasterize(
    grid: CharacterGrid,
    palette: ResolvedPalette,
    dimAt: (x: number, y: number) => number
  ) {
    const { cw, ch } = grid;
    for (const p of this.particles) {
      const c = Math.floor(p.x / cw);
      const r = Math.floor(p.y / ch);
      if (grid.inBounds(c, r)) {
        const dim = dimAt(p.x, p.y);
        const fade = 1 - p.life / p.maxLife;
        grid.setGlyph(
          c,
          r,
          p.char.charCodeAt(0),
          pack(p.color),
          p.opacity * fade * dim
        );
      }
    }
  }
}

