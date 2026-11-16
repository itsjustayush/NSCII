import { noise } from "../simulation/Physics";

export class WaterSimulation {
  caustics(x: number, y: number, t: number): number {
    const n1 = noise(x / 46 + t * 0.21, y / 46 - t * 0.13, 7);
    const n2 = noise(x / 39 - t * 0.17, y / 52 + t * 0.19, 11);
    return 1 - Math.min(1, Math.abs(n1 - n2) * 5.5);
  }
}

