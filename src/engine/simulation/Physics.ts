// Mathematical, hashing, noise, and color manipulation utilities

export const clamp = (v: number, min: number, max: number): number =>
  v < min ? min : v > max ? max : v;

export const sstep = (a: number, b: number, x: number): number => {
  const k = clamp((x - a) / (b - a), 0, 1);
  return k * k * (3 - 2 * k);
};

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const sq = (x: number): number => x * x;

export const TAU = Math.PI * 2;

// Fast deterministic 32-bit integer hash to float [0, 1)
export const h2 = (a: number, b: number): number => {
  let x = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1);
  x = Math.imul(x ^ (x >>> 15), 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
};

// 2D Value Noise with smoothstep Hermite interpolation
export const noise = (x: number, y: number, seed: number = 0): number => {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const u = sstep(0, 1, x - xi);
  const v = sstep(0, 1, y - yi);
  const s = seed * 131;
  const a = h2(xi + s, yi);
  const b = h2(xi + 1 + s, yi);
  const c = h2(xi + s, yi + 1);
  const d = h2(xi + 1 + s, yi + 1);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
};

// Distance from point (px, py) to line segment (ax, ay)-(bx, by)
export const segDist = (
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): number => {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy || 1;
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / lenSq, 0, 1);
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
};

// Normalized angle difference in range [-PI, PI]
export const angleDiff = (target: number, current: number): number => {
  let d = (target - current) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
};

// Normalized ellipse test (u-cu)^2/ru^2 + (v-cv)^2/rv^2
export const ell = (
  u: number,
  v: number,
  cu: number,
  cv: number,
  ru: number,
  rv: number
): number => sq((u - cu) / ru) + sq((v - cv) / rv);

// String-seeded PRNG
export function seeded(str: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

// Line glyph direction based on delta vector
export const lineGlyph = (dx: number, dy: number): string => {
  const d = Math.hypot(dx, dy) || 1;
  if (Math.abs(dy) < 0.38 * d) return "-";
  if (Math.abs(dx) < 0.38 * d) return "|";
  return dx * dy > 0 ? "\\" : "/";
};

// ── Color Utilities ──
export type RGB = [number, number, number];

export const rgb = (hex: string): RGB => {
  const m = String(hex).trim().match(/^#?([0-9a-f]{6})$/i);
  const n = m ? parseInt(m[1], 16) : 0;
  return [n >> 16, (n >> 8) & 255, n & 255];
};

export const mixC = (a: RGB, b: RGB, k: number): RGB => [
  a[0] + (b[0] - a[0]) * k,
  a[1] + (b[1] - a[1]) * k,
  a[2] + (b[2] - a[2]) * k,
];

export const mul = (c: RGB, k: number): RGB => [c[0] * k, c[1] * k, c[2] * k];

export const pack = (c: RGB): number =>
  (clamp(c[0] | 0, 0, 255) << 16) |
  (clamp(c[1] | 0, 0, 255) << 8) |
  clamp(c[2] | 0, 0, 255);

export const unpack = (p: number): RGB => [
  (p >> 16) & 255,
  (p >> 8) & 255,
  p & 255,
];

export const css = (n: number): string =>
  `rgb(${n >> 16},${(n >> 8) & 255},${n & 255})`;

