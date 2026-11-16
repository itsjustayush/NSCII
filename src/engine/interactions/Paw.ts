import {
  clamp,
  h2,
  mixC,
  mul,
  pack,
  css,
  RGB,
} from "../simulation/Physics";
import { ResolvedPalette } from "../renderer/ColorPalettes";

const EASE: Record<string, (u: number) => number> = {
  o: (u: number) => 1 - (1 - u) ** 2.2,
  i: (u: number) => u ** 2.2,
  l: (u: number) => u,
};

function track(a: number, keys: [number, number, string?][]): number {
  if (a <= keys[0][0]) return keys[0][1];
  for (let j = 1; j < keys.length; j++) {
    const [t1, v1, e] = keys[j];
    if (a > t1) continue;
    const [t0, v0] = keys[j - 1];
    const u = (a - t0) / (t1 - t0);
    const easeFn = EASE[e || ""] || ((x: number) => x * x * (3 - 2 * x));
    return v0 + (v1 - v0) * easeFn(u);
  }
  return keys[keys.length - 1][1];
}

const DIP = 0.24;
const PULL = 0.42;
const FLICK = 0.72;
const SHAKE = 0.78;
export const END = 1.25;

const BACK: [number, number, string?][] = [
  [0, 70],
  [0.17, -4, "o"],
  [DIP, 0],
  [PULL, 0, "l"],
  [0.52, 13],
  [0.57, 12],
  [0.68, 27],
  [FLICK, 29],
  [END, 84, "i"],
];

const HIGH: [number, number, string?][] = [
  [0, 0.5],
  [0.17, 0.15, "o"],
  [DIP, 0, "i"],
  [FLICK - 0.02, 0, "l"],
  [0.86, 0.6, "o"],
  [END, 1.05],
];

const SWAY: [number, number, string?][] = [
  [0, 0.06],
  [0.17, -0.02, "o"],
  [0.3, 0],
  [0.52, 0.03],
  [0.68, -0.03],
  [FLICK, 0],
  [END, 0],
];

const CURL: [number, number, string?][] = [
  [0, 0],
  [0.27, 0.05],
  [0.38, 1, "o"],
  [0.52, 1, "l"],
  [0.56, 0.75],
  [0.6, 1],
  [FLICK, 1, "l"],
  [0.95, 0.5],
  [END, 0.3],
];

const SINK: [number, number, string?][] = [
  [0.2, 0],
  [0.3, 1, "o"],
  [0.68, 1, "l"],
  [FLICK + 0.04, 0, "o"],
];

const SQUASH: [number, number, string?][] = [
  [0, -0.12],
  [0.17, -0.18, "l"],
  [0.22, 0.2, "o"],
  [0.3, 0],
  [0.44, 0.12],
  [0.52, -0.1],
  [0.58, 0.1],
  [0.68, -0.12],
  [FLICK, -0.2],
  [0.86, 0.05],
  [END, 0],
];

const SEEN: [number, number, string?][] = [
  [0, 0],
  [0.06, 1, "o"],
  [1.1, 1, "l"],
  [END, 0],
];

const LEG = 8.4;
const HAND = 10;
const TOES = [-1.12, -0.38, 0.38, 1.12];

export interface PawInstance {
  x: number;
  y: number;
  k: number;
  ex: number;
  ey: number;
  leg: number;
  side: number;
  born: number;
  hit: boolean;
  flung: boolean;
  drips: number;
}

export function pawState(p: PawInstance, time: number) {
  const a = time - p.born;
  const u = (a - SHAKE) / 0.3;
  const shake =
    u > 0 && u < 1 ? 0.14 * Math.sin(u * 4 * Math.PI) * (1 - u) : 0;
  return {
    back: track(a, BACK),
    h: track(a, HIGH),
    swing: (track(a, SWAY) + shake) * p.side,
    curl: track(a, CURL),
    sink: track(a, SINK),
    squash: track(a, SQUASH),
    seen: track(a, SEEN),
  };
}

export const tipOf = (s: { curl: number }) => 5 - 4 * s.curl + HAND * 1.08;

export function pawPose(p: PawInstance, time: number) {
  const s = pawState(p, time);
  const Kp = p.k * 1.9;
  const arm = 120;
  let ux = p.x - p.ex;
  let uy = p.y - p.ey;
  const ul = Math.hypot(ux, uy) || 1;
  ux /= ul;
  uy /= ul;
  const c = Math.cos(s.swing);
  const n = Math.sin(s.swing);
  const dx = ux * c - uy * n;
  const dy = ux * n + uy * c;
  const sx = p.x - ux * arm * Kp;
  const sy = p.y - uy * arm * Kp;
  const r = (arm - s.back) * Kp;

  return {
    ...s,
    ux: dx,
    uy: dy,
    vx: -dy,
    vy: dx,
    cx: sx + dx * r,
    cy: sy + dy * r,
    k: Kp * (1 + 0.5 * s.h),
  };
}

export function drawPaw(
  ctx: CanvasRenderingContext2D,
  p: PawInstance,
  time: number,
  cw: number,
  ch: number,
  vw: number,
  vh: number,
  dpr: number,
  palette: ResolvedPalette
) {
  const pose = pawPose(p, time);
  const { ux, uy, vx, vy, cx, cy, k, h, sink, curl, squash, seen } = pose;
  const ka = k * (1 - 0.16 * squash);
  const ks = k * (1 + 0.16 * squash);

  const cb = tipOf(pose) - HAND * 1.08;
  const toe = 2.5 + 0.3 * curl;
  const ring = HAND - toe - 1.1;

  const smin = (a: number, b: number, m: number) => {
    const q = Math.max(m - Math.abs(a - b), 0) / m;
    return Math.min(a, b) - (q * q * m) / 4;
  };

  let dist = 0;
  const part = (al: number, sd: number) => {
    const leg =
      (al > cb ? Math.hypot(al - cb, sd) : Math.abs(sd)) - LEG;
    const hand = Math.hypot((al - cb) / 1.08, sd) - HAND;
    dist = smin(leg, hand, 6);
    return dist > 0 ? -1 : al < -6 ? 0 : 1;
  };

  const fw = cw / 2;
  const fh = ch / 2;

  let x0 = Infinity,
    x1 = -Infinity,
    y0 = Infinity,
    y1 = -Infinity;
  for (const al of [-p.leg - 1, 16]) {
    for (const sd of [-11.5, 11.5]) {
      const x = cx + ux * al * ka + vx * sd * ks;
      const y = cy + uy * al * ka + vy * sd * ks;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
    }
  }

  const i0 = Math.max(0, Math.floor(x0 / fw));
  const i1 = Math.min(Math.ceil(vw / fw), Math.ceil(x1 / fw));
  const j0 = Math.max(0, Math.floor(y0 / fh));
  const j1 = Math.min(Math.ceil(vh / fh), Math.ceil(y1 / fh));
  const nc = i1 - i0 + 1;
  const nr = j1 - j0 + 1;
  if (nc <= 0 || nr <= 0) return;

  const g = new Int8Array(nc * nr).fill(-1);
  const A = new Float32Array(nc * nr);
  const C = new Float32Array(nc * nr);
  const reachCell =
    (0.6 * Math.hypot(fw, fh)) / Math.min(ka, ks) + 0.3;

  const alOf = (x: number, y: number) =>
    ((x - cx) * ux + (y - cy) * uy) / ka;
  const sdOf = (x: number, y: number) =>
    ((x - cx) * vx + (y - cy) * vy) / ks;

  for (let j = 0; j < nr; j++) {
    for (let i = 0; i < nc; i++) {
      const x = (i0 + i) * fw;
      const y = (j0 + j) * fh;
      const ac = alOf(x + fw / 2, y + fh / 2);
      A[j * nc + i] = ac;
      if (
        ac < -p.leg - 1 ||
        ac > 17 ||
        Math.abs(sdOf(x + fw / 2, y + fh / 2)) > 13
      )
        continue;

      const vc = part(ac, sdOf(x + fw / 2, y + fh / 2));
      if (Math.abs(dist) > reachCell) {
        g[j * nc + i] = vc;
        C[j * nc + i] = vc >= 0 ? 1 : 0;
        continue;
      }

      let n = 0;
      let top = -1;
      for (let q = 1; q < 6; q += 2) {
        for (let r = 1; r < 6; r += 2) {
          const sx = x + (q / 6) * fw;
          const sy = y + (r / 6) * fh;
          const v = part(alOf(sx, sy), sdOf(sx, sy));
          if (v >= 0) {
            n++;
            if (top < 0 || v > 1) top = v;
          }
        }
      }
      g[j * nc + i] = n >= 5 ? top : n ? -2 : -1;
      C[j * nc + i] = n / 9;
    }
  }

  const at = (i: number, j: number) =>
    i < 0 || j < 0 || i >= nc || j >= nr ? -1 : Math.max(-1, g[j * nc + i]);
  const wl = sink > 0 ? tipOf(pose) + 2 - 8 * sink : Infinity;
  const halfU =
    (0.5 * (Math.abs(ux) * fw + Math.abs(uy) * fh)) / ka;
  const fade = (al: number) =>
    al < -8 ? Math.max(0, 1 - (-8 - al) / (p.leg - 8)) ** 1.5 : 1;

  // Shadow on water
  const sx = fw * (2 + Math.round(h * 8));
  const sy = fh * (2 + Math.round(h * 6));
  ctx.globalAlpha =
    (palette.dark ? 0.5 : 0.24) * (1 - 0.5 * h) * seen;
  ctx.fillStyle = palette.dark ? "#000" : css(pack(mul(palette.water, 0.55)));
  ctx.beginPath();
  for (let j = 0; j < nr; j++) {
    for (let i = 0; i < nc; i++) {
      const v = g[j * nc + i];
      const al = A[j * nc + i];
      if (v >= 0 && fade(al) > 0.4 && al < wl) {
        ctx.rect((i0 + i) * fw + sx, (j0 + j) * fh + sy, fw, fh);
      }
    }
  }
  ctx.fill();

  const fur: RGB = palette.dark ? [16, 18, 21] : [16, 15, 14];
  const tex: RGB = palette.dark ? [44, 49, 54] : [54, 50, 46];
  const rim: RGB = palette.dark ? [150, 160, 166] : [85, 80, 74];
  const lit = palette.dark ? mixC(fur, rim, 0.22) : fur;
  const wet = [fur, rim, lit].map((c) =>
    css(pack(mixC(c, palette.water, 0.3)))
  );
  const dry = [fur, rim, lit].map((c) => css(pack(c)));
  const texC = css(pack(tex));
  const dot = css(pack(palette.dot));

  const px = (n: number, s: number) => Math.round(n * s * dpr) / dpr;
  ctx.font = `600 ${(fh * 0.8).toFixed(1)}px "Geist Mono", monospace`;

  const solid = new Path2D();
  const marks: (number | string)[] = [];

  for (let j = 0; j < nr; j++) {
    for (let i = 0; i < nc; i++) {
      const v = g[j * nc + i];
      const al = A[j * nc + i];
      const under = al > wl;
      const f = fade(al);
      if (v === -1 || f <= 0) continue;

      const x = px(i0 + i, fw);
      const y = px(j0 + j, fh);
      const w = px(i0 + i + 1, fw) - x;
      const hh = px(j0 + j + 1, fh) - y;
      const [furC, rimC, litC] = under ? wet : dry;
      const ns = [
        at(i - 1, j),
        at(i + 1, j),
        at(i, j - 1),
        at(i, j + 1),
      ];
      const edge = ns.some((n) => n < 0);

      if (v === -2) {
        ctx.globalAlpha = C[j * nc + i] * 1.3 * f * seen;
        ctx.fillStyle = furC;
        ctx.fillRect(x, y, w, hh);
        continue;
      }

      if (!under && f === 1 && !edge) {
        solid.rect(x, y, w, hh);
      } else {
        ctx.globalAlpha = (under ? 0.8 : 1) * f * seen;
        ctx.fillStyle = edge ? litC : furC;
        ctx.fillRect(x, y, w, hh);
      }

      const gx = x + fw / 2;
      const gy = y + fh / 2;
      if (sink > 0 && Math.abs(al - wl) < halfU) {
        marks.push(0.7, dot, "~", gx, gy);
      } else if (edge) {
        marks.push((palette.dark ? 0.9 : 0.55) * f, rimC, ":", gx, gy);
      } else if (!under && ((i0 + i) * 7 + (j0 + j) * 13) % 4 === 0) {
        marks.push(
          0.45 * f,
          texC,
          (i0 + i + j0 + j) % 3 ? "#" : "%",
          gx,
          gy
        );
      }
    }
  }

  ctx.globalAlpha = seen;
  ctx.fillStyle = dry[0];
  ctx.fill(solid);

  for (let m = 0; m < marks.length; m += 5) {
    ctx.globalAlpha = (marks[m] as number) * seen;
    ctx.fillStyle = marks[m + 1] as string;
    ctx.fillText(
      marks[m + 2] as string,
      marks[m + 3] as number,
      marks[m + 4] as number
    );
  }

  // Toes arcs
  ctx.lineCap = "round";
  ctx.lineWidth = Math.max(0.8, 0.11 * k);
  ctx.strokeStyle = dry[1];
  for (const th of TOES) {
    const c = Math.cos(th);
    const n = Math.sin(th);
    const al = cb + ring * c * 1.08;
    const sd = ring * n;
    const x = cx + ux * al * ka + vx * sd * ks;
    const y = cy + uy * al * ka + vy * sd * ks;
    const phi = Math.atan2(uy * c + vy * n, ux * c + vx * n);
    ctx.globalAlpha = (al + toe > wl ? 0.3 : 0.5) * seen;
    ctx.beginPath();
    ctx.arc(x, y, toe * k, phi - 1.05, phi + 1.05);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

