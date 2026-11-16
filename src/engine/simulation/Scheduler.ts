export interface SchedulerOptions {
  fpsLimit?: number; // 0 for monitor refresh rate, or 30 / 60
  reduceMotion?: boolean;
}

export class Scheduler {
  private running: boolean = false;
  private lastTime: number = 0;
  private lastDrawn: number = 0;
  private animFrameId: number | null = null;

  fpsLimit: number = 0;
  reduceMotion: boolean = false;
  paused: boolean = false;

  private onTick: (dt: number) => void;
  private onRender: () => void;

  constructor(
    onTick: (dt: number) => void,
    onRender: () => void,
    opts?: SchedulerOptions
  ) {
    this.onTick = onTick;
    this.onRender = onRender;
    this.fpsLimit = opts?.fpsLimit ?? 0;
    this.reduceMotion = opts?.reduceMotion ?? false;

    // Handle tab visibility to save CPU and battery
    document.addEventListener("visibilitychange", this.handleVisibility);
  }

  private handleVisibility = () => {
    if (document.hidden) {
      this.paused = true;
    } else {
      this.paused = false;
      this.lastTime = performance.now();
    }
  };

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.lastDrawn = performance.now();
    this.loop(this.lastTime);
  }

  stop() {
    this.running = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private loop = (now: number) => {
    if (!this.running) return;
    this.animFrameId = requestAnimationFrame(this.loop);

    const dt = Math.min(0.05, (now - this.lastTime) / 1000 || 0);
    this.lastTime = now;

    const minInterval =
      this.fpsLimit > 0 ? 1000 / this.fpsLimit - 2 : 12; // 12ms cap protects against excessive draws on 240Hz+
    if (now - this.lastDrawn < minInterval && minInterval > 0) {
      return;
    }

    if (!this.paused && (!this.reduceMotion || Math.random() < 0.3)) {
      this.onTick(dt);
      this.lastDrawn = now;
      this.onRender();
    }
  };

  destroy() {
    this.stop();
    document.removeEventListener("visibilitychange", this.handleVisibility);
  }
}

