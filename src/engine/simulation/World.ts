import {
  Creature,
  WorldContext,
  FoodPellet,
  RippleRing,
  BubbleParticle,
} from "../../creatures/core/Creature";
import { createCreature } from "../../creatures/core/CreatureRegistry";
import { CharacterGrid } from "../renderer/CharacterGrid";
import {
  ResolvedPalette,
  resolvePalette,
  PALETTES,
} from "../renderer/ColorPalettes";
import { BiomeConfig, BIOMES } from "../environment/Biomes";
import { WaterSimulation } from "../environment/Water";
import { ParticleSystem } from "../environment/Particles";
import {
  PawInstance,
  pawPose,
  tipOf,
  END as PAW_END,
} from "../interactions/Paw";
import { clamp, h2, lerp } from "./Physics";

export interface Droplet {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  born: number;
  dur: number;
  k: number;
}

export class World implements WorldContext {
  time: number = 0;
  vw: number = 1920;
  vh: number = 1080;

  palette: ResolvedPalette;
  biome: BiomeConfig;

  creatures: Creature[] = [];
  food: FoodPellet[] = [];
  rings: RippleRing[] = [];
  bubbles: BubbleParticle[] = [];
  drops: Droplet[] = [];
  paws: PawInstance[] = [];

  water: WaterSimulation = new WaterSimulation();
  particles: ParticleSystem = new ParticleSystem();

  pointerX: number = -100;
  pointerY: number = -100;
  pointerActive: boolean = false;

  dimBox: DOMRect | null = null;

  constructor(
    biomeId: string = "pond",
    paletteId: string = "pond"
  ) {
    this.biome = BIOMES[biomeId] || BIOMES.pond;
    const palCfg = PALETTES[paletteId] || PALETTES.pond;
    this.palette = resolvePalette(palCfg);
    this.setupCreatures();
  }

  setupCreatures() {
    this.creatures = [];
    let idx = 0;
    for (const spec of this.biome.creatures) {
      for (let i = 0; i < spec.count; i++) {
        this.creatures.push(createCreature(spec.species, idx++));
      }
    }
  }

  setBiome(biomeId: string) {
    if (BIOMES[biomeId]) {
      this.biome = BIOMES[biomeId];
      this.setupCreatures();
      if (this.biome.defaultPalette && PALETTES[this.biome.defaultPalette]) {
        this.palette = resolvePalette(PALETTES[this.biome.defaultPalette]);
      }
    }
  }

  setPalette(paletteId: string) {
    if (PALETTES[paletteId]) {
      this.palette = resolvePalette(PALETTES[paletteId]);
    }
  }

  setPopulation(species: string, count: number) {
    this.creatures = this.creatures.filter((c) => c.species !== species);
    for (let i = 0; i < count; i++) {
      this.creatures.push(createCreature(species, i));
    }
  }

  addRing(x: number, y: number, scale: number = 1, small: boolean = false) {
    this.rings.push({
      x,
      y,
      born: this.time,
      k: scale,
      small,
      tiny: false,
    });
    while (this.rings.length > 50) this.rings.shift();
  }

  addBubble(x: number, y: number) {
    this.bubbles.push({
      x,
      y,
      born: this.time,
    });
    while (this.bubbles.length > 30) this.bubbles.shift();
  }

  dimAt = (x: number, y: number): number => {
    if (!this.dimBox) return 1;
    const b = this.dimBox;
    const pad = 80;
    const dx = Math.max(b.left - x, 0, x - b.right);
    const dy = Math.max(b.top - y, 0, y - b.bottom);
    const d = Math.hypot(dx, dy);
    const k = clamp(d / pad, 0, 1);
    const smooth = k * k * (3 - 2 * k);
    return 0.12 + 0.88 * smooth;
  };

  feed(x: number, y: number): boolean {
    const k = clamp(this.vw / 1000, 0.62, 1.25);
    const seed =
      (Math.round(this.time * 1000) * 7919) ^
      (Math.round(x) * 31 + Math.round(y) * 17);
    const count = 10 + Math.floor(h2(seed, 1) * 5);

    for (let j = 0; j < count; j++) {
      const a = h2(seed, j * 3 + 2) * Math.PI * 2;
      const d = (12 + 46 * Math.sqrt(h2(seed, j * 3 + 3))) * k;
      const tx = clamp(x + Math.cos(a) * d, 6, this.vw - 6);
      const ty = clamp(y + Math.sin(a) * d * 0.8, 6, this.vh - 6);
      const born = this.time + j * 0.012;
      const dur = 0.28 + 0.2 * h2(seed, j * 3 + 4);

      this.food.push({
        x0: x,
        y0: y,
        x: tx,
        y: ty,
        born,
        land: born + dur,
        seed: seed + j * 131,
        landed: false,
        eaten: -1,
        claim: 0,
      });
    }

    while (this.food.length > 90) this.food.shift();
    return true;
  }

  poke(x: number, y: number): boolean {
    if (this.paws.length >= 3) return false;
    const k = clamp(this.vw / 1000, 0.62, 1.25);
    const fromTop = y <= this.vh - y;
    const ex = x;
    const ey = fromTop ? -46 * k : this.vh + 46 * k;

    this.paws.push({
      x,
      y,
      k,
      ex,
      ey,
      leg: 30,
      side: h2(Math.round(x), Math.round(y)) < 0.5 ? -1 : 1,
      born: this.time,
      hit: false,
      flung: false,
      drips: 0,
    });

    this.disturb(x, y, 1.5);
    return true;
  }

  disturb(x: number, y: number, intensity: number = 1.0) {
    this.addRing(x, y, intensity, false);
    for (const c of this.creatures) {
      if (c.onPointerDisturb) {
        c.onPointerDisturb(x, y, intensity);
      }
    }
  }

  advance(dt: number, grid: CharacterGrid) {
    this.time += dt;

    // Reset targeting claim counters each frame for balanced creature distribution
    for (const p of this.food) {
      p.claim = 0;
    }

    // 1. Update creatures
    for (const c of this.creatures) {
      c.update(dt, this);
    }

    // 2. Update food
    for (const p of this.food) {
      if (!p.landed && this.time >= p.land) {
        p.landed = true;
        this.addRing(p.x, p.y, 0.7, true);
        grid.stampWake(p.x, p.y, 1.2, 0.35);
        for (const c of this.creatures) {
          if (c.onFeed) c.onFeed(p);
        }
      }
      if (p.landed && p.eaten < 0) {
        // Natural gentle water surface drift
        p.x += Math.sin(this.time * 0.6 + p.seed) * 2.4 * dt;
        p.y += Math.cos(this.time * 0.45 + p.seed * 1.3) * 1.6 * dt;
      }
    }

    // 3. Remove food only after eating suction/swallow animation finishes
    for (let j = this.food.length - 1; j >= 0; j--) {
      const p = this.food[j];
      const dur = p.eatenDuration ?? 0.28;
      if (p.eaten >= 0 && this.time - p.eaten >= dur) {
        this.food.splice(j, 1);
      }
    }

    // 3. Update bubbles
    for (let j = this.bubbles.length - 1; j >= 0; j--) {
      if (this.time - this.bubbles[j].born > 0.8) {
        this.bubbles.splice(j, 1);
      }
    }

    // 4. Update rings
    for (let j = this.rings.length - 1; j >= 0; j--) {
      const r = this.rings[j];
      const maxLife = r.tiny ? 0.7 : r.small ? 1.2 : 2.6;
      if (this.time - r.born >= maxLife) {
        this.rings.splice(j, 1);
      }
    }

    // 5. Update paws and splashes
    for (const p of this.paws) {
      const a = this.time - p.born;
      if (!p.hit && a >= 0.24) {
        p.hit = true;
        const s = pawPose(p, this.time);
        const tip = tipOf(s) - 3;
        const px = s.cx + s.ux * tip * s.k;
        const py = s.cy + s.uy * tip * s.k;
        this.addRing(px, py, p.k, false);
        grid.stampWake(px, py, 4, 0.9);
      }
      if (a > 0.42 && a < 0.7) {
        const s = pawPose(p, this.time);
        const tip = tipOf(s) + 2;
        grid.stampWake(s.cx + s.ux * tip * s.k, s.cy + s.uy * tip * s.k, 2, 4 * dt);
      }
      if (!p.flung && a >= 0.72) {
        p.flung = true;
        const s = pawPose(p, this.time);
        const seed = Math.round(p.born * 1000);
        for (let j = 0; j < 5; j++) {
          const side = (j - 2) / 2;
          const d = (30 + 36 * h2(j, seed)) * p.k;
          const x0 = s.cx + (s.ux * tipOf(s) + s.vx * side * 8) * s.k;
          const y0 = s.cy + (s.uy * tipOf(s) + s.vy * side * 8) * s.k;
          this.drops.push({
            x0,
            y0,
            x1: x0 - s.ux * d + s.vx * side * 18 * p.k,
            y1: y0 - s.uy * d + s.vy * side * 18 * p.k,
            born: this.time + j * 0.035,
            dur: 0.34 + 0.14 * h2(j + 7, seed),
            k: p.k,
          });
        }
      }
    }

    for (let j = this.paws.length - 1; j >= 0; j--) {
      if (this.time - this.paws[j].born >= PAW_END) {
        this.paws.splice(j, 1);
      }
    }

    // 6. Update drops
    for (let j = this.drops.length - 1; j >= 0; j--) {
      const d = this.drops[j];
      if (this.time - d.born >= d.dur) {
        this.addRing(d.x1, d.y1, d.k, true);
        grid.stampWake(d.x1, d.y1, 1, 0.5);
        this.drops.splice(j, 1);
      }
    }

    // 7. Ambient particles spawn and update
    if (this.biome.ambientParticleType === "petals" && Math.random() < 0.06) {
      this.particles.spawnPetal(this.vw, this.vh);
    } else if (
      this.biome.ambientParticleType === "fireflies" &&
      Math.random() < 0.08
    ) {
      this.particles.spawnFirefly(this.vw, this.vh);
    } else if (
      this.biome.ambientParticleType === "bubbles" &&
      Math.random() < 0.12
    ) {
      this.particles.spawnBubble(
        Math.random() * this.vw,
        this.vh + 10
      );
    }
    this.particles.update(dt, this.vw, this.vh);

    // 8. Diffuse wake field
    grid.diffuseWake(dt);
  }
}

