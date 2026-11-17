import { CharacterGrid } from "../renderer/CharacterGrid";
import { ResolvedPalette } from "../renderer/ColorPalettes";
import { pack, RGB } from "../simulation/Physics";

export type WeatherType = "clear" | "rain" | "snow" | "wind" | "mist";

interface WeatherParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  char: string;
  color: RGB;
  alpha: number;
  life: number;
  maxLife: number;
}

export class WeatherSystem {
  type: WeatherType = "clear";
  private particles: WeatherParticle[] = [];
  windX: number = 0;
  windY: number = 0;

  setWeather(type: WeatherType) {
    this.type = type;
    this.particles = [];
  }

  update(
    dt: number,
    vw: number,
    vh: number,
    onSplash?: (x: number, y: number) => void
  ) {
    // Dynamic wind modulation
    if (this.type === "wind") {
      this.windX = 45 + Math.sin(Date.now() * 0.001) * 25;
    } else if (this.type === "rain") {
      this.windX = 20;
    } else {
      this.windX = Math.sin(Date.now() * 0.0005) * 8;
    }

    // Spawn weather particles
    if (this.type === "rain") {
      const dropCount = Math.floor(Math.random() * 4) + 2;
      for (let i = 0; i < dropCount; i++) {
        this.particles.push({
          x: Math.random() * (vw + 200) - 100,
          y: -10,
          vx: this.windX + (Math.random() - 0.5) * 5,
          vy: 420 + Math.random() * 120,
          char: Math.random() < 0.6 ? "/" : "|",
          color: [180, 215, 255],
          alpha: 0.6 + Math.random() * 0.3,
          life: 0,
          maxLife: 3,
        });
      }
    } else if (this.type === "snow") {
      if (Math.random() < 0.4) {
        this.particles.push({
          x: Math.random() * vw,
          y: -10,
          vx: (Math.random() - 0.5) * 15 + this.windX * 0.3,
          vy: 35 + Math.random() * 30,
          char: Math.random() < 0.5 ? "*" : "+",
          color: [240, 245, 255],
          alpha: 0.75,
          life: 0,
          maxLife: 20,
        });
      }
    } else if (this.type === "mist") {
      if (Math.random() < 0.15) {
        this.particles.push({
          x: -40,
          y: Math.random() * vh,
          vx: 12 + Math.random() * 10,
          vy: (Math.random() - 0.5) * 4,
          char: Math.random() < 0.5 ? "~" : ".",
          color: [210, 230, 245],
          alpha: 0.35,
          life: 0,
          maxLife: 16,
        });
      }
    }

    // Update existing particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // When raindrop hits the water surface (or screen bottom)
      if (this.type === "rain" && p.y >= vh - 20) {
        if (onSplash && Math.random() < 0.3) {
          onSplash(p.x, p.y);
        }
        this.particles.splice(i, 1);
        continue;
      }

      if (p.x < -100 || p.x > vw + 100 || p.y > vh + 20 || p.life >= p.maxLife) {
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
        grid.setGlyph(
          c,
          r,
          p.char.charCodeAt(0),
          pack(p.color),
          p.alpha * dim
        );
      }
    }
  }
}

