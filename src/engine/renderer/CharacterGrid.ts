import { clamp } from "../simulation/Physics";

export class CharacterGrid {
  vw: number = 0;
  vh: number = 0;
  dpr: number = 1;
  cw: number = 9;
  ch: number = 12;
  cols: number = 0;
  rows: number = 0;
  scaleK: number = 1.0;

  tileRGB: Uint32Array = new Uint32Array(0);
  tileA: Float32Array = new Float32Array(0);
  glyphRGB: Uint32Array = new Uint32Array(0);
  glyphA: Float32Array = new Float32Array(0);
  glyphCode: Uint16Array = new Uint16Array(0);
  shade: Float32Array = new Float32Array(0);
  wake: Float32Array = new Float32Array(0);
  wakeTmp: Float32Array = new Float32Array(0);
  tintRGB: Uint32Array = new Uint32Array(0);
  tintA: Float32Array = new Float32Array(0);

  // Fast tracked list of cell indices touched during this frame for O(touched) clearing
  touched: number[] = [];

  resize(w: number, h: number, deviceDpr: number = 1, cellMod: number = 1.0) {
    this.vw = Math.max(1, w);
    this.vh = Math.max(1, h);
    this.dpr = Math.min(3, Math.max(1, deviceDpr));

    // Base cell size roughly 8-10px wide on standard viewports, with 1.33:1 aspect ratio
    const baseCw = clamp(Math.round(this.vw / 150), 7, 11);
    this.cw = Math.max(6, Math.round(baseCw * cellMod));
    this.ch = this.cw + 3;
    this.scaleK = 1.85 * clamp(this.vw / 1000, 0.62, 1.25);

    this.cols = Math.ceil(this.vw / this.cw);
    this.rows = Math.ceil(this.vh / this.ch);
    const n = this.cols * this.rows;

    this.tileRGB = new Uint32Array(n);
    this.tileA = new Float32Array(n);
    this.glyphRGB = new Uint32Array(n);
    this.glyphA = new Float32Array(n);
    this.glyphCode = new Uint16Array(n);
    this.shade = new Float32Array(n);
    this.wake = new Float32Array(n);
    this.wakeTmp = new Float32Array(n);
    this.tintRGB = new Uint32Array(n);
    this.tintA = new Float32Array(n);

    this.touched.length = 0;
  }

  clear() {
    for (let k = 0; k < this.touched.length; k++) {
      const i = this.touched[k];
      this.tileA[i] = 0;
      this.glyphA[i] = 0;
      this.tintA[i] = 0;
    }
    this.touched.length = 0;
    this.shade.fill(0);
  }

  touch(i: number) {
    if (!this.tileA[i] && !this.glyphA[i]) {
      this.touched.push(i);
    }
  }

  inBounds(c: number, r: number): boolean {
    return c >= 0 && r >= 0 && c < this.cols && r < this.rows;
  }

  index(c: number, r: number): number {
    return r * this.cols + c;
  }

  setTile(c: number, r: number, packed: number, alpha: number) {
    if (!this.inBounds(c, r)) return;
    const i = r * this.cols + c;
    this.touch(i);
    this.tileRGB[i] = packed;
    this.tileA[i] = alpha;
  }

  setGlyph(c: number, r: number, code: number, packed: number, alpha: number) {
    if (!this.inBounds(c, r)) return;
    const i = r * this.cols + c;
    this.touch(i);
    this.glyphRGB[i] = packed;
    this.glyphA[i] = alpha;
    this.glyphCode[i] = code;
  }

  setShade(c: number, r: number, amount: number) {
    if (!this.inBounds(c, r)) return;
    const i = r * this.cols + c;
    if (amount > this.shade[i]) {
      this.shade[i] = amount;
    }
  }

  stampWake(x: number, y: number, rad: number, amt: number) {
    const c = Math.floor(x / this.cw);
    const r = Math.floor(y / this.ch);
    for (let dr = -rad; dr <= rad; dr++) {
      for (let dc = -rad; dc <= rad; dc++) {
        const cc = c + dc;
        const rr = r + dr;
        const d = Math.hypot(dc, (dr * this.ch) / this.cw);
        if (cc < 0 || rr < 0 || cc >= this.cols || rr >= this.rows || d > rad)
          continue;
        const idx = rr * this.cols + cc;
        this.wake[idx] = Math.min(
          1,
          this.wake[idx] + amt * (1 - d / (rad + 1))
        );
      }
    }
  }

  diffuseWake(dt: number) {
    const fade = Math.exp(-dt * 1.4);
    const { cols, rows, wake, wakeTmp } = this;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        const w = wake[i];
        const n =
          (c > 0 ? wake[i - 1] : w) +
          (c < cols - 1 ? wake[i + 1] : w) +
          (r > 0 ? wake[i - cols] : w) +
          (r < rows - 1 ? wake[i + cols] : w);
        wakeTmp[i] = (w * 0.84 + n * 0.04) * fade;
      }
    }
    // Swap wake buffers
    for (let i = 0; i < wake.length; i++) {
      wake[i] = wakeTmp[i];
    }
  }
}

