import { Creature, WorldContext, FoodPellet } from "../core/Creature";
import { CharacterGrid } from "../../engine/renderer/CharacterGrid";
import {
  clamp,
  lerp,
  ell,
  segDist,
  pack,
  mixC,
  noise,
  RGB,
  lineGlyph,
} from "../../engine/simulation/Physics";
import { audioService } from "../../services/audio";

export type DogState =
  | "trot"
  | "zoomies"
  | "sit"
  | "belly_rub"
  | "beg"
  | "stalk"
  | "pounce"
  | "sit_search"
  | "obstruct"
  | "dragged"
  | "fetch";

export class Dog implements Creature {
  id: string;
  species = "dog";

  x: number = 0;
  y: number = 0;
  nx: number = 0.5;
  ny: number = 0.75;
  angle: number = 0;
  depth: number = 0.5;
  speed: number = 40;
  seen: number = 1;

  state: DogState = "trot";
  stateTimer: number = 0;
  phase: number = 0;
  seed: number = 0;

  // Affection & interaction
  affection: number = 0;
  isBeingPet: boolean = false;
  isBeingDragged: boolean = false;
  targetX: number = 0;
  targetY: number = 0;

  // Stunts & playfulness
  pounceProgress: number = 0;
  pounceStartX: number = 0;
  pounceStartY: number = 0;
  buttWiggle: number = 0;
  wagSpeed: number = 8;
  tongueOut: boolean = false;
  hasItemInMouth: string | null = null; // e.g. "bone" or "ball"

  // Colors
  furColor: RGB = [232, 168, 62]; // Golden amber
  furDark: RGB = [165, 105, 30];
  bellyColor: RGB = [252, 246, 235]; // Cream white
  noseColor: RGB = [25, 20, 20];
  collarColor: RGB = [220, 45, 45]; // Red collar
  tagColor: RGB = [255, 215, 0]; // Gold bell/tag

  // Reference to search bar bounds for playful obstruction
  searchBarBox: DOMRect | null = null;

  constructor(id: string, index: number, x: number = 0.5, y: number = 0.75) {
    this.id = id;
    this.seed = index * 67 + 37;
    this.nx = x;
    this.ny = y;
    this.targetX = x;
    this.targetY = y;
    this.stateTimer = 3 + Math.random() * 4;

    // Breed color variations
    const breeds: [RGB, RGB, RGB, RGB][] = [
      // Golden Retriever / Shiba
      [[232, 168, 62], [165, 105, 30], [252, 246, 235], [220, 45, 45]],
      // Corgi / Tricolor
      [[210, 130, 50], [45, 35, 30], [255, 255, 255], [45, 130, 230]],
      // Dalmatian / Spot
      [[245, 245, 245], [30, 30, 30], [255, 255, 255], [230, 40, 40]],
      // Chocolate Lab
      [[95, 60, 40], [55, 35, 20], [125, 85, 60], [50, 180, 80]],
    ];
    const b = breeds[index % breeds.length];
    this.furColor = b[0];
    this.furDark = b[1];
    this.bellyColor = b[2];
    this.collarColor = b[3];
  }

  onPointerDisturb(x: number, y: number, intensity: number) {
    if (this.isBeingDragged) return;

    const d = Math.hypot(this.x - x, this.y - y);
    if (d < 50) {
      // Petting the dog!
      this.isBeingPet = true;
      this.affection = Math.min(100, this.affection + 5);
      this.wagSpeed = 24;
      if (Math.random() < 0.15) {
        audioService.playPuppyBark();
      }
    } else if (d < 180 && Math.random() < 0.3 && this.state !== "pounce") {
      // Stalk and prepare to pounce on cursor!
      this.state = "stalk";
      this.stateTimer = 1.2;
      this.targetX = x;
      this.targetY = y;
    }
  }

  onFeed(food: FoodPellet) {
    if (this.state !== "dragged") {
      this.state = "fetch";
      this.targetX = food.x;
      this.targetY = food.y;
      this.stateTimer = 8;
    }
  }

  // Called when user clicks directly on the dog to start dragging
  startDrag() {
    this.isBeingDragged = true;
    this.state = "dragged";
    audioService.playPuppyBark();
  }

  stopDrag() {
    this.isBeingDragged = false;
    this.state = "trot";
    this.stateTimer = 3;
    audioService.playPant();
  }

  update(dt: number, world: WorldContext) {
    const { vw, vh, pointerX, pointerY, pointerActive } = world;
    this.x = this.nx * vw;
    this.y = this.ny * vh;

    // Handle dragged state
    if (this.isBeingDragged) {
      this.nx = pointerX / vw;
      this.ny = pointerY / vh;
      this.phase += dt * 15;
      this.wagSpeed = 20;
      this.tongueOut = true;
      return;
    }

    this.stateTimer -= dt;
    this.phase += dt * (this.state === "zoomies" ? 22 : 10);

    // State machine transitions
    if (this.stateTimer <= 0) {
      const roll = Math.random();
      if (roll < 0.25) {
        this.state = "trot";
        this.stateTimer = 4 + Math.random() * 5;
        this.targetX = Math.random() * vw;
        this.targetY = vh * 0.6 + Math.random() * (vh * 0.35);
      } else if (roll < 0.45) {
        // Sudden Zoomies!
        this.state = "zoomies";
        this.stateTimer = 3.5;
        this.tongueOut = true;
        audioService.playPuppyBark();
      } else if (roll < 0.6) {
        // Roll onto back for belly rub
        this.state = "belly_rub";
        this.stateTimer = 3.0;
        this.tongueOut = true;
      } else if (roll < 0.75) {
        this.state = "sit";
        this.stateTimer = 3.0;
      } else if (roll < 0.9 && world.dimBox) {
        // Playful stunt: Jump and sit right on top of the search bar!
        this.state = "sit_search";
        this.searchBarBox = world.dimBox;
        this.targetX = world.dimBox.left + world.dimBox.width / 2;
        this.targetY = world.dimBox.top - 15;
        this.stateTimer = 5.0;
      } else {
        this.state = "beg";
        this.stateTimer = 2.5;
      }
    }

    // Execute state behavior
    switch (this.state) {
      case "trot": {
        this.wagSpeed = 8;
        this.tongueOut = false;
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 20) {
          this.angle = Math.atan2(dy, dx);
          this.speed = 45;
          this.nx += (Math.cos(this.angle) * this.speed * dt) / vw;
          this.ny += (Math.sin(this.angle) * this.speed * dt) / vh;
        } else {
          this.stateTimer = 0;
        }
        break;
      }
      case "zoomies": {
        // Crazy fast figure-8 running with panting
        this.wagSpeed = 26;
        this.speed = 120;
        this.angle += Math.sin(this.phase * 0.8) * 4 * dt;
        this.nx += (Math.cos(this.angle) * this.speed * dt) / vw;
        this.ny += (Math.sin(this.angle) * this.speed * dt) / vh;
        if (Math.random() < 0.1) {
          world.addBubble(this.x, this.y); // Dust puff
        }
        break;
      }
      case "stalk": {
        // Creeps low, wiggles butt, locks onto pointer
        this.speed = 12;
        this.wagSpeed = 4;
        this.buttWiggle = Math.sin(Date.now() * 0.02) * 4;
        const dx = pointerX - this.x;
        const dy = pointerY - this.y;
        this.angle = Math.atan2(dy, dx);
        if (this.stateTimer <= 0) {
          // Launch POUNCE!
          this.state = "pounce";
          this.pounceProgress = 0;
          this.pounceStartX = this.x;
          this.pounceStartY = this.y;
          this.targetX = pointerX;
          this.targetY = pointerY;
          this.stateTimer = 0.6;
          audioService.playPuppyBark();
        }
        break;
      }
      case "pounce": {
        // Airborne leap towards cursor
        this.pounceProgress = Math.min(1, this.pounceProgress + dt * 2.2);
        const arc = 4 * this.pounceProgress * (1 - this.pounceProgress); // parabolic arc
        this.x = lerp(this.pounceStartX, this.targetX, this.pounceProgress);
        this.y = lerp(this.pounceStartY, this.targetY, this.pounceProgress) - arc * 45;
        this.nx = this.x / vw;
        this.ny = this.y / vh;
        if (this.pounceProgress >= 1) {
          world.addRing(this.x, this.y, 1.2, false);
          this.state = "trot";
          this.stateTimer = 2;
          audioService.playPant();
        }
        break;
      }
      case "sit_search": {
        // Hopping onto search bar and sitting playfully
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 15) {
          this.angle = Math.atan2(dy, dx);
          this.speed = 65;
          this.nx += (Math.cos(this.angle) * this.speed * dt) / vw;
          this.ny += (Math.sin(this.angle) * this.speed * dt) / vh;
        } else {
          // Sitting on the search bar dangling paws
          this.speed = 0;
          this.wagSpeed = 16;
          this.tongueOut = true;
          // Playful obstruct: occasionally emit paws at search text
          if (Math.random() < 0.05) {
            world.addBubble(this.x, this.y + 10);
          }
        }
        break;
      }
      case "fetch": {
        // Chasing food / toy
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 20) {
          this.angle = Math.atan2(dy, dx);
          this.speed = 90;
          this.nx += (Math.cos(this.angle) * this.speed * dt) / vw;
          this.ny += (Math.sin(this.angle) * this.speed * dt) / vh;
        } else {
          // Grabbed it!
          this.hasItemInMouth = "bone";
          this.state = "trot";
          this.stateTimer = 4;
          audioService.playPuppyBark();
        }
        break;
      }
      default:
        this.speed = 0;
        break;
    }

    // Keep within viewport margins
    this.nx = clamp(this.nx, 0.05, 0.95);
    this.ny = clamp(this.ny, 0.25, 0.95);
  }

  rasterize(
    grid: CharacterGrid,
    world: WorldContext,
    dimAt: (x: number, y: number) => number
  ) {
    const { cw, ch, scaleK } = grid;
    const k = scaleK * 1.3;
    const cx = this.x;
    const cy = this.y;
    const ca = Math.cos(this.angle);
    const sa = Math.sin(this.angle);

    const reach = 24 * k;
    const c0 = Math.max(0, Math.floor((cx - reach) / cw));
    const c1 = Math.min(grid.cols - 1, Math.floor((cx + reach) / cw));
    const r0 = Math.max(0, Math.floor((cy - reach) / ch));
    const r1 = Math.min(grid.rows - 1, Math.floor((cy + reach) / ch));

    // Tail wagging animation
    const tailWag = Math.sin(world.time * this.wagSpeed + this.seed) * 0.8;
    const legPhase = this.phase;

    for (let r = r0; r <= r1; r++) {
      for (let cCol = c0; cCol <= c1; cCol++) {
        const px = cCol * cw + cw / 2;
        const py = r * ch + ch / 2;
        const dx = px - cx;
        const dy = py - cy;

        // Transform into dog local coordinate system (+u is forward snout direction)
        const u = (dx * ca + dy * sa) / k;
        const v = (-dx * sa + dy * ca) / k;
        const av = Math.abs(v);

        const dim = dimAt(px, py);
        if (dim <= 0.02) continue;

        // 1. Snout & Nose
        if (ell(u, v, 6.2, 0, 1.8, 1.1) < 1) {
          if (u > 6.8 && av < 0.5) {
            // Wet black nose
            grid.setTile(cCol, r, pack(this.noseColor), 1.0 * dim);
            grid.setGlyph(cCol, r, "▼".charCodeAt(0), pack([255, 255, 255]), 0.9 * dim);
          } else {
            grid.setTile(cCol, r, pack(this.bellyColor), 0.95 * dim);
          }
          continue;
        }

        // 2. Panting Pink Tongue
        if (this.tongueOut && u > 5.5 && u < 7.2 && v > 0.4 && v < 1.3) {
          const tonguePink: RGB = [255, 120, 150];
          grid.setTile(cCol, r, pack(tonguePink), 1.0 * dim);
          grid.setGlyph(cCol, r, "U".charCodeAt(0), pack([255, 80, 120]), 0.9 * dim);
          continue;
        }

        // 3. Head & Cute Floppy Ears
        if (ell(u, v, 3.8, 0, 2.8, 2.3) < 1) {
          // Eyes
          if (u > 4.2 && u < 5.0 && Math.abs(av - 1.1) < 0.45) {
            const eyeChar = this.isBeingPet || this.state === "belly_rub" ? "^" : "•";
            grid.setTile(cCol, r, pack([20, 15, 15]), 1.0 * dim);
            grid.setGlyph(cCol, r, eyeChar.charCodeAt(0), pack([255, 255, 255]), 1.0 * dim);
            continue;
          }
          grid.setTile(cCol, r, pack(this.furColor), 0.95 * dim);
          grid.setGlyph(cCol, r, "=".charCodeAt(0), pack(this.furDark), 0.5 * dim);
          continue;
        }

        // Ears (floppy triangles hanging to the sides)
        if (u > 2.2 && u < 4.5 && av > 1.9 && av < 3.8) {
          grid.setTile(cCol, r, pack(this.furDark), 0.95 * dim);
          grid.setGlyph(cCol, r, "\\".charCodeAt(0), pack(this.furColor), 0.7 * dim);
          continue;
        }

        // 4. Collar & Tag
        if (u > 1.5 && u <= 2.2 && av < 2.0) {
          if (av < 0.4) {
            // Gold bell/tag
            grid.setTile(cCol, r, pack(this.tagColor), 1.0 * dim);
            grid.setGlyph(cCol, r, "o".charCodeAt(0), pack([255, 240, 150]), 1.0 * dim);
          } else {
            grid.setTile(cCol, r, pack(this.collarColor), 0.95 * dim);
          }
          continue;
        }

        // 5. Body Torso
        if (ell(u, v, -1.8, 0, 4.4, 2.2) < 1) {
          const isBelly = av < 0.9;
          const col = isBelly ? this.bellyColor : this.furColor;
          grid.setTile(cCol, r, pack(col), 0.95 * dim);
          const gChar = isBelly ? "~" : "#";
          grid.setGlyph(cCol, r, gChar.charCodeAt(0), pack(this.furDark), 0.4 * dim);
          continue;
        }

        // 6. Articulated Legs (Front and Hind)
        const frontLegU = 0.5;
        const hindLegU = -4.5;
        const frontLegKick = Math.sin(legPhase) * 1.6;
        const hindLegKick = Math.sin(legPhase + Math.PI) * 1.6;

        if (
          segDist(u, av, frontLegU, 1.5, frontLegU + frontLegKick, 3.8) < 0.55 ||
          segDist(u, av, hindLegU, 1.5, hindLegU + hindLegKick, 3.8) < 0.55
        ) {
          grid.setTile(cCol, r, pack(this.furColor), 0.9 * dim);
          grid.setGlyph(cCol, r, "|".charCodeAt(0), pack(this.furDark), 0.7 * dim);
          continue;
        }

        // 7. Dynamic Wagging Tail
        const tailRootU = -6.0;
        const tailTipU = -9.2;
        const tailTipV = tailWag * 3.5;
        if (segDist(u, v, tailRootU, 0, tailTipU, tailTipV) < 0.6) {
          grid.setTile(cCol, r, pack(this.furColor), 0.95 * dim);
          grid.setGlyph(cCol, r, "~".charCodeAt(0), pack(this.furDark), 0.9 * dim);
          continue;
        }

        // 8. Toy / Bone in mouth
        if (this.hasItemInMouth === "bone" && u > 6.0 && u < 8.2 && av < 1.8) {
          const boneCol: RGB = [255, 250, 240];
          grid.setTile(cCol, r, pack(boneCol), 1.0 * dim);
          grid.setGlyph(cCol, r, "=".charCodeAt(0), pack([200, 190, 180]), 0.9 * dim);
          continue;
        }
      }
    }

    // Affection Hearts popping up when being pet
    if (this.affection > 20 && Math.random() < 0.12) {
      const heartC = Math.floor((cx + (Math.random() - 0.5) * 30) / cw);
      const heartR = Math.floor((cy - 25 - Math.random() * 20) / ch);
      if (grid.inBounds(heartC, heartR)) {
        grid.setGlyph(heartC, heartR, "♥".charCodeAt(0), pack([255, 80, 120]), 1.0);
      }
    }
  }
}

