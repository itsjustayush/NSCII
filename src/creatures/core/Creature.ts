import { CharacterGrid } from "../../engine/renderer/CharacterGrid";
import { ResolvedPalette } from "../../engine/renderer/ColorPalettes";

export interface FoodPellet {
  x0: number;
  y0: number;
  x: number;
  y: number;
  born: number;
  land: number;
  seed: number;
  landed: boolean;
  eaten: number;
  claim: number;
  eaterX?: number;
  eaterY?: number;
  eaterSpecies?: string;
  eatenDuration?: number;
}

export interface RippleRing {
  x: number;
  y: number;
  born: number;
  k: number;
  small: boolean;
  tiny?: boolean;
}

export interface BubbleParticle {
  x: number;
  y: number;
  born: number;
}

export interface WorldContext {
  time: number;
  vw: number;
  vh: number;
  palette: ResolvedPalette;
  food: FoodPellet[];
  rings: RippleRing[];
  bubbles: BubbleParticle[];
  pointerX: number;
  pointerY: number;
  pointerActive: boolean;
  addRing(x: number, y: number, scale?: number, small?: boolean): void;
  addBubble(x: number, y: number): void;
  dimAt(x: number, y: number): number;
}

export interface Creature {
  id: string;
  species: string;
  x: number;
  y: number;
  angle: number;
  depth: number;
  speed: number;
  seen: number;

  update(dt: number, world: WorldContext): void;
  rasterize(
    grid: CharacterGrid,
    world: WorldContext,
    dimAt: (x: number, y: number) => number
  ): void;

  onPointerDisturb?(x: number, y: number, intensity: number): void;
  onFeed?(food: FoodPellet): void;
}

