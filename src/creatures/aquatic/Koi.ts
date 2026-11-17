import { Creature, WorldContext, FoodPellet } from "../core/Creature";
import { CharacterGrid } from "../../engine/renderer/CharacterGrid";
import {
  clamp,
  sstep,
  lerp,
  h2,
  noise,
  mixC,
  mul,
  pack,
  lineGlyph,
  seeded,
  RGB,
} from "../../engine/simulation/Physics";

const N = 10;
const BEND = 0.42;
const BODY_END = 0.76;
const RAMP = " .:-=+*#%@";
const SUB = [0.25, 0.25, 0.75, 0.25, 0.25, 0.75, 0.75, 0.75];

export type KoiVariety = "kohaku" | "sanke" | "tancho";
export type KoiColourScheme = "course" | "vermilion" | "gold" | "sakura";

interface Patch {
  s: number;
  v: number;
  rs: number;
  rv: number;
}

interface Markings {
  red: Patch[];
  black: Patch[];
}

const halfW = (s: number) =>
  s < 0.1
    ? 0.118 * Math.pow(Math.sin((s / 0.1) * (Math.PI / 2)), 0.6)
    : s < 0.3
      ? 0.118 + 0.02 * sstep(0.1, 0.3, s)
      : 0.03 + 0.108 * (1 - sstep(0.3, BODY_END, s));

const tailW = (s: number) => 0.028 + 0.165 * Math.pow(sstep(0.72, 1, s), 0.85);

const hit = { kind: 0, across: 0, rs: 1, ra: 0 };

function fin(
  s: number,
  a: number,
  rootS: number,
  angle: number,
  reach: number,
  width: number
): boolean {
  const ra = halfW(rootS) * 0.85;
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  const ds = s - rootS;
  const da = a - ra;
  const along = ds * ca + da * sa - reach;
  const perp = -ds * sa + da * ca;
  if ((along / reach) ** 2 + (perp / width) ** 2 > 1) return false;
  hit.kind = 2;
  hit.rs = ds;
  hit.ra = da;
  return true;
}

function classify(
  s: number,
  a: number,
  past: number,
  flare: number,
  ahead: number,
  lateral: number
): boolean {
  hit.kind = 0;
  hit.across = 1;
  hit.rs = 1;
  hit.ra = 0;
  if (ahead > 0) {
    if (ahead < 0.05 && Math.abs(lateral - (0.042 + ahead * 0.75)) < 0.015) {
      hit.kind = 5; // barbel
      return true;
    }
    return false;
  }
  const w = halfW(s);
  if (s <= BODY_END && a <= w) {
    hit.across = a / w;
    hit.kind =
      s > 0.056 && s < 0.084 && hit.across > 0.5 && hit.across < 0.78
        ? 3 // eye
        : s > 0.3 && s < 0.6 && hit.across < 0.13
          ? 4 // dorsal ridge
          : 1; // body
    return true;
  }
  if (s > 0.7 && past <= 0) {
    const tw = tailW(s) * flare;
    if (a <= tw && s <= 0.88 + 0.12 * (a / tw)) {
      hit.kind = 2; // tail fin
      hit.rs = 1;
      hit.ra = (a / tw) * 0.8;
      return true;
    }
  }
  return (
    fin(s, a, 0.2, 0.9 + 0.45 * (flare - 1), 0.07 * flare, 0.038) ||
    fin(s, a, 0.47, 0.75, 0.038, 0.019)
  );
}

function generateMarkings(variety: KoiVariety, seed: number): Markings {
  const r = (j: number) => h2(seed, j);
  if (variety === "tancho") {
    return {
      red: [{ s: 0.1, v: 0, rs: 0.052, rv: 0.06 }],
      black: [],
    };
  }
  const red: Patch[] = [];
  if (r(1) < 0.85) {
    red.push({
      s: 0.09,
      v: (r(2) - 0.5) * 0.03,
      rs: 0.05 + r(3) * 0.03,
      rv: 0.1,
    });
  }
  const n = r(4) < 0.25 ? 3 : 2;
  const GAP = 0.05;
  const w: number[] = [];
  for (let j = 0; j < n; j++) w.push(0.5 + r(30 + j));
  const totalW = w.reduce((a, b) => a + b);
  const unit = (0.45 - GAP * (n - 1)) / (totalW || 1);
  let at = 0.23;
  for (let j = 0; j < n; j++) {
    const rs = (unit * w[j]) / 2;
    red.push({
      s: at + rs,
      v: (j % 2 ? 1 : -1) * (0.022 + r(20 + j) * 0.018),
      rs: rs * 0.95,
      rv: 0.065 + rs * 0.3 + r(40 + j) * 0.02,
    });
    at += rs * 2 + GAP;
  }
  const black: Patch[] = [];
  if (variety === "sanke") {
    const count = 4 + Math.floor(r(50) * 3);
    for (let j = 0; j < count; j++) {
      black.push({
        s: 0.25 + r(60 + j) * 0.42,
        v: (r(70 + j) - 0.5) * 0.15,
        rs: 0.021,
        rv: 0.025,
      });
    }
  }
  return { red, black };
}

const inPatch = (m: Patch, s: number, vn: number, wob: number) =>
  ((s - m.s) / m.rs) ** 2 + ((vn - m.v) / m.rv) ** 2 < 1 + wob;

function getSkin(
  marks: Markings,
  seed: number,
  s: number,
  vn: number,
  across: number
): number {
  if (across > 0.9 || s > 0.74) return 0;
  const wob = (noise(s * 13 + seed, vn * 28, seed) - 0.5) * 0.65;
  for (const m of marks.black) if (inPatch(m, s, vn, wob)) return 2;
  for (const m of marks.red) if (inPatch(m, s, vn, wob)) return 1;
  return 0;
}

export class Koi implements Creature {
  id: string;
  species = "koi";
  variety: KoiVariety;
  colourScheme: KoiColourScheme;
  seed: number;
  marks: Markings;

  x: number = 0;
  y: number = 0;
  nx: number = 0.5;
  ny: number = 0.5;
  angle: number = 0;
  depth: number = 0.5;
  speed: number = 24;
  seen: number = 1;

  L0: number = 140;
  seg: number = 14;
  nodes: Float32Array = new Float32Array(N * 2);

  cruise: number = 26;
  beat: number = 0.5;
  turn: number = 0;
  phase: number = 0;

  flee: number = 0;
  fleeA: number = 0;
  seekX: number = 0;
  seekY: number = 0;
  seekFrom: number = 0;
  seekUntil: number = 0;

  appetite: number = 0.85;
  fullUntil: number = 0;
  rise: number = 0;
  kick: number = 0;
  meal: FoodPellet | null = null;
  biteTime: number = -1;

  // Reusable spine scratchpads
  private spine = new Float32Array(N * 2);
  private arc = new Float32Array(N);
  private arcTotal = 1;
  private D = 0;
  private S = 0;
  private V = 0;
  private TX = 1;
  private TY = 0;
  private SEG = 0;

  constructor(
    id: string,
    index: number,
    variety: KoiVariety,
    colourScheme: KoiColourScheme
  ) {
    this.id = id;
    this.variety = variety;
    this.colourScheme = colourScheme;
    this.seed = index * 97 + 13;
    this.marks = generateMarkings(variety, this.seed);

    const r = seeded("koi_" + id);
    const right = index % 2 === 0;
    this.angle = right ? (r() - 0.5) * 0.3 : Math.PI + (r() - 0.5) * 0.3;
    this.L0 = 128 + r() * 52;
    this.seg = this.L0 / (N - 1);

    for (let j = 0; j < N; j++) {
      this.nodes[j * 2] = -Math.cos(this.angle) * this.seg * j;
      this.nodes[j * 2 + 1] = -Math.sin(this.angle) * this.seg * j;
    }

    this.cruise = 24 + r() * 12;
    this.nx = (index * 0.38 + 0.15) % 1;
    this.ny = 0.22 + r() * 0.56;
    this.depth = 0.35 + r() * 0.65;
    this.phase = r() * 6.28;
    this.appetite = 0.65 + 0.35 * h2(this.seed, 5);
  }

  private headX(vw: number): number {
    return this.nx * vw;
  }

  private headY(vh: number): number {
    return this.ny * vh;
  }

  onPointerDisturb(x: number, y: number, intensity: number) {
    const hx = this.x;
    const hy = this.y;
    const d = Math.hypot(hx - x, hy - y);
    const reach = 300 * intensity;
    if (d < reach) {
      this.flee = Math.max(this.flee, (1 - d / reach) * 1.2);
      this.fleeA = Math.atan2(hy - y, hx - x);
    }
  }

  onFeed(food: FoodPellet) {
    const d = Math.hypot(food.x - this.x, food.y - this.y);
    if (d < 1800) {
      this.fullUntil = 0; // Wake up immediately to feed
    }
  }

  private findMeal(list: FoodPellet[], hx: number, hy: number, k: number, time: number): FoodPellet | null {
    if (time < this.fullUntil) return null;
    let best: FoodPellet | null = null;
    let bestScore = Infinity;
    const baseRadius = (900 + 700 * this.appetite) * k;

    for (const p of list) {
      if (p.eaten >= 0 || time < p.land - 0.25) continue;
      // Scent spreads across the whole pond if floating > 1.2s
      const age = time - p.land;
      const maxRange = age > 1.2 ? 3500 * k : baseRadius;
      const dist = Math.hypot(p.x - hx, p.y - hy);

      if (dist <= maxRange) {
        // Balanced penalty for pellets already targeted by another fish
        const score = dist + p.claim * 50 * k;
        if (score < bestScore) {
          bestScore = score;
          best = p;
        }
      }
    }
    if (best) {
      best.claim++;
    }
    return best;
  }

  private eat(p: FoodPellet, world: WorldContext) {
    const k = clamp(world.vw / 1000, 0.62, 1.25);
    const mouthX = this.x + Math.cos(this.angle) * (14 * k);
    const mouthY = this.y + Math.sin(this.angle) * (14 * k);

    p.eaten = world.time;
    p.eaterX = mouthX;
    p.eaterY = mouthY;
    p.eaterSpecies = "koi";
    p.eatenDuration = 0.28;

    this.biteTime = world.time;
    // Short swallow pause (0.14 - 0.22s) so the koi enthusiastically eats the next pellet in the cluster!
    this.fullUntil =
      world.time + 0.14 + 0.08 * h2(this.seed, Math.round(world.time * 7));
    this.kick = 1.3;

    // Gulp water ripples and bubbles
    world.addRing(mouthX, mouthY, 1.3 * k, true);
    for (let j = 0; j < 4; j++) {
      world.addBubble(
        mouthX + (h2(p.seed + j * 13, 1) - 0.5) * 18 * k,
        mouthY + (h2(p.seed + j * 13, 2) - 0.5) * 14 * k
      );
    }
  }

  update(dt: number, world: WorldContext) {
    const { vw, vh, time } = world;
    const k = clamp(vw / 1000, 0.62, 1.25);
    const maxTilt = 1.0;
    const yLo = 0.14;
    const yHi = 0.86;

    const right = Math.cos(this.angle) > 0;
    const base = right ? 0 : Math.PI;
    this.beat = 0.5 + 0.5 * Math.sin(time * 0.45 + this.seed);

    let turnTarget =
      Math.sin(time * 0.29 + this.seed) * 0.32 +
      Math.sin(time * 0.11 + this.seed * 1.7) * 0.22;

    if (this.ny < yLo) turnTarget += right ? 0.7 : -0.7;
    if (this.ny > yHi) turnTarget += right ? -0.7 : 0.7;

    const tilt = Math.atan2(
      Math.sin(this.angle - base),
      Math.cos(this.angle - base)
    );
    if (Math.abs(tilt) > maxTilt) turnTarget -= Math.sign(tilt) * 1.4;

    this.turn = lerp(this.turn, turnTarget, Math.min(1, dt * 2));
    const hx = this.headX(vw);
    const hy = this.headY(vh);
    this.x = hx;
    this.y = hy;

    let hurry = 1;
    this.meal = null;

    if (this.flee > 0.02) {
      const d = Math.atan2(
        Math.sin(this.fleeA - this.angle),
        Math.cos(this.fleeA - this.angle)
      );
      this.turn = lerp(
        this.turn,
        clamp(d * 5, -4, 4),
        Math.min(1, dt * 8 * this.flee)
      );
      hurry = 1 + 2.6 * this.flee;
      this.flee *= Math.exp(-1.3 * dt);
    } else if (
      world.food.length > 0 &&
      (this.meal = this.findMeal(world.food, hx, hy, k, time))
    ) {
      const p = this.meal;
      const mouthX = hx + Math.cos(this.angle) * (14 * k);
      const mouthY = hy + Math.sin(this.angle) * (14 * k);
      const dist = Math.hypot(p.x - mouthX, p.y - mouthY);
      const targetAngle = Math.atan2(p.y - mouthY, p.x - mouthX);
      const d = Math.atan2(
        Math.sin(targetAngle - this.angle),
        Math.cos(targetAngle - this.angle)
      );

      // Fast, accurate steering directly to the pellet
      const steerTightness = dist < 100 * k ? 6.2 : 4.4;
      this.turn = lerp(this.turn, clamp(d * steerTightness, -3.8, 3.8), Math.min(1, dt * 9));
      hurry = 1.6 + 1.4 * clamp(dist / (130 * k), 0.35, 1);
      this.rise = Math.min(1, this.rise + dt * 2.8);
    } else if (time > this.seekFrom && time < this.seekUntil) {
      if (Math.hypot(this.seekX - hx, this.seekY - hy) < 26 * k) {
        this.seekUntil = 0;
      } else {
        const d = Math.atan2(
          Math.sin(Math.atan2(this.seekY - hy, this.seekX - hx) - this.angle),
          Math.cos(Math.atan2(this.seekY - hy, this.seekX - hx) - this.angle)
        );
        this.turn = lerp(this.turn, clamp(d * 2.6, -2.4, 2.4), Math.min(1, dt * 3));
        hurry = 1.4;
      }
    }

    if (!this.meal) {
      this.rise = Math.max(0, this.rise - dt * 0.3);
    }

    hurry *= 1 + 0.9 * this.kick;
    this.kick *= Math.exp(-3.5 * dt);
    this.angle += this.turn * dt;

    this.speed = this.cruise * (0.65 + 0.7 * this.beat) * hurry;
    const dx = Math.cos(this.angle) * this.speed * dt;
    const dy = Math.sin(this.angle) * this.speed * dt;

    this.nx += (dx * k) / vw;
    this.ny += (dy * k) / vh;

    // Head is anchor, chain trails it with bend limits
    const nd = this.nodes;
    for (let j = 1; j < N; j++) {
      nd[j * 2] -= dx;
      nd[j * 2 + 1] -= dy;
    }

    let bx = -Math.cos(this.angle);
    let by = -Math.sin(this.angle);
    for (let j = 1; j < N; j++) {
      const px = nd[(j - 1) * 2];
      const py = nd[(j - 1) * 2 + 1];
      let vx = nd[j * 2] - px;
      let vy = nd[j * 2 + 1] - py;
      const d = Math.hypot(vx, vy) || 1;
      vx /= d;
      vy /= d;
      const bend = Math.atan2(bx * vy - by * vx, bx * vx + by * vy);
      if (Math.abs(bend) > BEND) {
        const r = Math.sign(bend) * BEND;
        const c = Math.cos(r);
        const s = Math.sin(r);
        vx = bx * c - by * s;
        vy = bx * s + by * c;
      }
      nd[j * 2] = px + vx * this.seg;
      nd[j * 2 + 1] = py + vy * this.seg;
      bx = vx;
      by = vy;
    }

    this.phase += dt * (2.6 + 5 * this.beat) * (1 + 0.6 * this.kick);
    const m = (this.L0 * k * 1.45) / vw;
    if (this.nx > 1 + m) this.nx = -m;
    if (this.nx < -m) this.nx = 1 + m;

    if (this.meal) {
      const mouthX = hx + Math.cos(this.angle) * (14 * k);
      const mouthY = hy + Math.sin(this.angle) * (14 * k);
      const distToMouth = Math.hypot(this.meal.x - mouthX, this.meal.y - mouthY);
      if (distToMouth < 24 * k) {
        this.eat(this.meal, world);
        this.meal = null;
      }
    }
  }

  private sampleSpine(
    px: number,
    py: number,
    L: number,
    flareL: number,
    flareR: number,
    from: number = 0,
    to: number = N - 2
  ): boolean {
    let best = Infinity;
    let bs = 0;
    let sign = 1;
    let past = 0;
    let ahead = 0;
    let lateral = 0;

    for (let n = from; n <= to; n++) {
      const ax = this.spine[n * 2];
      const ay = this.spine[n * 2 + 1];
      const sx = this.spine[n * 2 + 2] - ax;
      const sy = this.spine[n * 2 + 3] - ay;
      const len2 = sx * sx + sy * sy || 1;
      const raw = ((px - ax) * sx + (py - ay) * sy) / len2;
      const u = clamp(raw, 0, 1);
      const d2 = (px - ax - sx * u) ** 2 + (py - ay - sy * u) ** 2;

      if (d2 < best) {
        const len = Math.sqrt(len2);
        const cross = sx * (py - ay) - sy * (px - ax);
        best = d2;
        bs = (this.arc[n] + u * len) / this.arcTotal;
        sign = cross >= 0 ? 1 : -1;
        past = n === N - 2 ? Math.max(0, raw - 1) * len : 0;
        ahead = n === 0 ? Math.max(0, -raw) * len : 0;
        lateral = Math.abs(cross) / len;
        this.TX = sx / len;
        this.TY = sy / len;
        this.SEG = n;
      }
    }

    this.D = Math.sqrt(best);
    this.S = bs;
    this.V = this.D * sign;

    return classify(
      bs,
      this.D / L,
      past / L,
      sign > 0 ? flareL : flareR,
      ahead / L,
      lateral / L
    );
  }

  rasterize(
    grid: CharacterGrid,
    world: WorldContext,
    dimAt: (x: number, y: number) => number
  ) {
    if (this.seen <= 0.01) return;
    const { cw, ch, cols, rows, vw, vh, scaleK } = grid;
    const { palette, time } = world;
    const k = scaleK;
    const hx = this.headX(vw);
    const hy = this.headY(vh);
    const L = this.L0 * k;
    const swim = 0.25 + 0.9 * this.beat;

    // Wake stamp from tail tip
    const tailTipX = hx + this.nodes[(N - 1) * 2] * k;
    const tailTipY = hy + this.nodes[(N - 1) * 2 + 1] * k;
    const tc = Math.floor(tailTipX / cw);
    const tr = Math.floor(tailTipY / ch);
    if (grid.inBounds(tc, tr)) {
      const idx = grid.index(tc, tr);
      grid.wake[idx] = Math.min(1, grid.wake[idx] + 0.18 * this.beat);
    }

    // Build curved spine with undulating body wave
    for (let n = 0; n < N; n++) {
      const s = n / (N - 1);
      const a = Math.max(0, n - 1);
      const b = Math.min(N - 1, n + 1);
      let tx = this.nodes[a * 2] - this.nodes[b * 2];
      let ty = this.nodes[a * 2 + 1] - this.nodes[b * 2 + 1];
      const tl = Math.hypot(tx, ty) || 1;
      tx /= tl;
      ty /= tl;
      const off =
        L *
        0.045 *
        (0.05 + 0.95 * Math.pow(s, 2.2)) *
        swim *
        Math.sin(this.phase - s * 4.6);
      this.spine[n * 2] = hx + this.nodes[n * 2] * k - ty * off;
      this.spine[n * 2 + 1] = hy + this.nodes[n * 2 + 1] * k + tx * off;
    }

    this.arc[0] = 0;
    for (let n = 1; n < N; n++) {
      this.arc[n] =
        this.arc[n - 1] +
        Math.hypot(
          this.spine[n * 2] - this.spine[n * 2 - 2],
          this.spine[n * 2 + 1] - this.spine[n * 2 - 1]
        );
    }
    this.arcTotal = this.arc[N - 1] || 1;

    const bank = clamp(this.turn * 0.5, -0.3, 0.3);
    const scull = 0.15 * (1 - this.beat) * Math.sin(this.phase * 0.5);
    const flareL = 1 + scull - bank;
    const flareR = 1 - scull + bank;

    // Bounding box of spine
    let x0 = Infinity,
      y0 = Infinity,
      x1 = -Infinity,
      y1 = -Infinity;
    for (let n = 0; n < N; n++) {
      x0 = Math.min(x0, this.spine[n * 2]);
      x1 = Math.max(x1, this.spine[n * 2]);
      y0 = Math.min(y0, this.spine[n * 2 + 1]);
      y1 = Math.max(y1, this.spine[n * 2 + 1]);
    }

    const reach = L * 0.27;
    const c0 = Math.max(0, Math.floor(Math.max(x0 - reach, 0) / cw));
    const c1 = Math.min(cols - 1, Math.floor(Math.min(x1 + reach, vw) / cw));
    const r0 = Math.max(0, Math.floor(Math.max(y0 - reach, 0) / ch));
    const r1 = Math.min(rows - 1, Math.floor(Math.min(y1 + reach, vh) / ch));
    if (c0 > c1 || r0 > r1) return;

    const diag = Math.hypot(cw, ch);
    const depth = lerp(this.depth, 1, this.rise * 0.85);
    const Kc = palette.koi[this.colourScheme];
    const alphaBase =
      (palette.dark ? 0.82 : 0.9) * (0.55 + 0.45 * depth) * this.seen;
    const sdc = 1 + Math.round(depth * 2);
    const sdr = 1 + Math.round(depth);
    const lx = -0.6;
    const ly = -0.8;

    // Caustics helper
    const caus = (cx: number, cy: number) =>
      1 -
      Math.min(
        1,
        Math.abs(
          noise(cx / 46 + time * 0.21, cy / 46 - time * 0.13, 7) -
          noise(cx / 39 - time * 0.17, cy / 52 + time * 0.19, 11)
        ) * 5.5
      );

    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const x = c * cw;
        const y = r * ch;
        const got = this.sampleSpine(
          x + cw / 2,
          y + ch / 2,
          L,
          flareL,
          flareR
        );

        if (
          !got &&
          this.D >
          L * (this.S > 0.4 && this.S < 0.62 ? 0.15 : 0.26) + diag
        ) {
          c += Math.max(0, Math.floor((this.D - L * 0.26 - diag) / cw));
          continue;
        }

        let kind = hit.kind;
        let across = hit.across;
        let rs = hit.rs;
        let ra = hit.ra;
        let s = this.S;
        let v = this.V;
        let tx = this.TX;
        let ty = this.TY;
        const from = Math.max(0, this.SEG - 2);
        const to = Math.min(N - 2, this.SEG + 2);
        let hits = got ? 1 : 0;

        const deep =
          got &&
          kind === 1 &&
          s > 0.05 &&
          s < 0.7 &&
          halfW(s) * L - this.D > diag * 0.4;
        if (deep) hits = 5;

        for (let q = 0; !deep && q < SUB.length; q += 2) {
          if (
            !this.sampleSpine(
              x + SUB[q] * cw,
              y + SUB[q + 1] * ch,
              L,
              flareL,
              flareR,
              from,
              to
            )
          )
            continue;
          if (hits === 0) {
            kind = hit.kind;
            across = hit.across;
            rs = hit.rs;
            ra = hit.ra;
            s = this.S;
            v = this.V;
            tx = this.TX;
            ty = this.TY;
          }
          hits++;
        }

        if (!hits) continue;
        const cover = hits / 5;
        const dim = dimAt(x + cw / 2, y + ch / 2);
        const side = v >= 0 ? 1 : -1;

        let tile: RGB | null = null;
        let tA = 0;
        let g = " ";
        let gC: RGB | null = null;
        let gA = 0;

        if (kind === 5) {
          g = lineGlyph(tx, ty);
          gC = Kc.fin;
          gA = 0.7 * alphaBase;
        } else if (kind === 2) {
          const nx = -ty * side;
          const ny = tx * side;
          g = lineGlyph(rs * tx + ra * nx, rs * ty + ra * ny);
          tile = Kc.fin;
          tA = (palette.dark ? 0.26 : 0.42) * cover * alphaBase;
          gC = mul(Kc.fin, palette.dark ? 1.1 : 0.8);
          gA = (palette.dark ? 0.55 : 0.6) * alphaBase;
        } else {
          const nz = Math.sqrt(Math.max(0, 1 - across * across));
          const nxs = -ty * side * across;
          const nys = tx * side * across;
          const gl = sstep(0.62, 0.96, caus(x + cw / 2, y + ch / 2)) * nz;
          const lit = clamp(
            0.76 +
            0.26 * nz +
            0.2 * (nxs * lx + nys * ly) +
            0.3 * gl,
            0.62,
            1.34
          );
          const sk =
            kind === 3
              ? null
              : getSkin(this.marks, this.seed, s, v / L, across);
          const base =
            kind === 3
              ? palette.eye
              : sk === 1
                ? Kc.red
                : sk === 2
                  ? Kc.black
                  : Kc.white;

          tile = mul(base, lit);
          tA = (cover >= 0.6 ? 1 : cover * 1.4) * alphaBase;

          const isBiting = world.time < this.biteTime + 0.28;
          if (isBiting && s < 0.05 && across < 0.4) {
            g = "O";
            gC = [255, 105, 95];
            gA = 0.95 * alphaBase;
            tile = [60, 20, 20];
            tA = 0.95 * alphaBase;
          } else if (kind === 3) {
            g = "o";
            gC = Kc.white;
            gA = 0.95 * alphaBase;
          } else {
            const idx = clamp(
              1 +
              Math.round(((1.08 - lit) / 0.46) * 6) +
              (kind === 4 ? 2 : 0),
              1,
              RAMP.length - 1
            );
            g = RAMP[idx];
            gC = mul(
              base,
              palette.dark ? (sk === 0 ? 0.55 : 1.35) : 0.5
            );
            gA = 0.62 * alphaBase;
            if (gl > 0.5 && kind !== 4) {
              g = "*";
              gC = mixC(base, [255, 255, 255], 0.75);
              gA = (0.45 + 0.4 * gl) * alphaBase;
            }
          }

          // Shadow cast below
          if (cover >= 0.6 && r + sdr < rows && c + sdc < cols) {
            grid.setShade(
              c + sdc,
              r + sdr,
              (palette.dark ? 0.55 : 0.22) *
              (0.5 + 0.5 * depth) *
              dim *
              this.seen
            );
          }
        }

        if (tile) {
          grid.setTile(c, r, pack(tile), tA * dim);
        }
        if (gC) {
          grid.setGlyph(c, r, g.charCodeAt(0), pack(gC), gA * dim);
        }
      }
    }
  }
}

