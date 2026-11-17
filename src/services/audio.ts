// Procedural Web Audio API sound synthesizer
// Generates natural water, fountain, night ambient, and animal sounds with 0 audio files!

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = true; // Off by default as requested

  constructor() {
    // Lazily initialized on first user gesture
  }

  private initCtx() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
    if (!muted) {
      this.initCtx();
    }
  }

  getMuted(): boolean {
    return this.isMuted;
  }

  // 1. Water Lap / Bubble Gulp
  playGulp() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const t = this.ctx.currentTime;
    osc.type = "sine";
    osc.frequency.setValueAtTime(260 + Math.random() * 80, t);
    osc.frequency.exponentialRampToValueAtTime(540 + Math.random() * 120, t + 0.08);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.1);
  }

  // 2. Water Splash / Ripple
  playSplash(scale: number = 1.0) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const bufferSize = this.ctx.sampleRate * 0.15;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(700, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(320, this.ctx.currentTime + 0.14);
    filter.Q.value = 3.0;

    const gain = this.ctx.createGain();
    const t = this.ctx.currentTime;
    gain.gain.setValueAtTime(Math.min(0.25, 0.15 * scale), t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(t);
    noise.stop(t + 0.15);
  }

  // 3. Bamboo Rocker Clack (Shishi-odoshi)
  playBambooClack() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // Woody hollow tone
    const osc = this.ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(420, t);
    osc.frequency.exponentialRampToValueAtTime(140, t + 0.06);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

    // Click impact
    const clickBuffer = this.ctx.createBuffer(1, 200, this.ctx.sampleRate);
    const clickData = clickBuffer.getChannelData(0);
    for (let i = 0; i < 200; i++) {
      clickData[i] = (Math.random() * 2 - 1) * Math.exp(-i / 30);
    }
    const click = this.ctx.createBufferSource();
    click.buffer = clickBuffer;

    osc.connect(gain);
    click.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.08);
    click.start(t);
    click.stop(t + 0.05);
  }

  // 4. Playful Dog Bark / Yip
  playPuppyBark() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = "sawtooth";
    osc2.type = "triangle";

    // Playful upward then downward yip
    osc1.frequency.setValueAtTime(420, t);
    osc1.frequency.linearRampToValueAtTime(620, t + 0.04);
    osc1.frequency.exponentialRampToValueAtTime(320, t + 0.15);

    osc2.frequency.setValueAtTime(840, t);
    osc2.frequency.linearRampToValueAtTime(1180, t + 0.04);
    osc2.frequency.exponentialRampToValueAtTime(600, t + 0.15);

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(900, t);
    filter.Q.value = 2.5;

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.17);
    osc2.stop(t + 0.17);
  }

  // 5. Dog Pant / Breath
  playPant() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const bufferSize = this.ctx.sampleRate * 0.08;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.4;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1200;

    const gain = this.ctx.createGain();
    const t = this.ctx.currentTime;
    gain.gain.setValueAtTime(0.06, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(t);
    noise.stop(t + 0.09);
  }
}

export const audioService = new SoundEngine();

