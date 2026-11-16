import { Creature } from "./Creature";
import { Koi, KoiVariety, KoiColourScheme } from "../aquatic/Koi";
import { Jellyfish } from "../aquatic/Jellyfish";
import { Butterfly } from "../flying/Butterfly";
import { Dragonfly } from "../flying/Dragonfly";
import { Frog } from "../terrestrial/Frog";
import { Crab } from "../terrestrial/Crab";
import { Crane } from "../flying/Crane";

export interface SpeciesMeta {
  id: string;
  label: string;
  iconChar: string;
  defaultCount: number;
  category: "aquatic" | "flying" | "terrestrial";
  hint: string;
}

export const SPECIES_CATALOG: Record<string, SpeciesMeta> = {
  koi: {
    id: "koi",
    label: "Koi",
    iconChar: "><(((º>",
    defaultCount: 8,
    category: "aquatic",
    hint: "Right click or tap Feed to drop pellets. Left click to disturb.",
  },
  butterfly: {
    id: "butterfly",
    label: "Butterfly",
    iconChar: "ƸӜƷ",
    defaultCount: 10,
    category: "flying",
    hint: "Fluttering wanderers. Hover or click near them to scatter.",
  },
  jellyfish: {
    id: "jellyfish",
    label: "Jellyfish",
    iconChar: "ꕤ( )",
    defaultCount: 6,
    category: "aquatic",
    hint: "Bioluminescent swimmers. Tap to make them pulse upward.",
  },
  dragonfly: {
    id: "dragonfly",
    label: "Dragonfly",
    iconChar: "+--+",
    defaultCount: 8,
    category: "flying",
    hint: "Swift aerial hunters. Dart away when startled.",
  },
  frog: {
    id: "frog",
    label: "Frog",
    iconChar: "(o.o)",
    defaultCount: 6,
    category: "terrestrial",
    hint: "Resting on the water's edge. Click to make them leap.",
  },
  crab: {
    id: "crab",
    label: "Crab",
    iconChar: "(/)o.o(\\)",
    defaultCount: 6,
    category: "terrestrial",
    hint: "Scuttles sideways across the shoreline. Avoids your cursor.",
  },
  crane: {
    id: "crane",
    label: "Crane",
    iconChar: "/v\\",
    defaultCount: 5,
    category: "flying",
    hint: "Graceful migratory flyers gliding across the sky.",
  },
};

const KOI_VARIETIES: KoiVariety[] = [
  "kohaku",
  "sanke",
  "kohaku",
  "sanke",
  "kohaku",
  "tancho",
  "sanke",
  "kohaku",
];

const KOI_COLOURS: KoiColourScheme[] = ["course", "vermilion", "gold", "sakura"];

export function createCreature(
  species: string,
  index: number,
  x?: number,
  y?: number
): Creature {
  const id = `${species}_${index}`;
  const px = x ?? (0.15 + (index * 0.23) % 0.7);
  const py = y ?? (0.2 + (index * 0.19) % 0.6);

  switch (species) {
    case "koi": {
      const variety = KOI_VARIETIES[index % KOI_VARIETIES.length];
      const colour = KOI_COLOURS[index % KOI_COLOURS.length];
      return new Koi(id, index, variety, colour);
    }
    case "jellyfish":
      return new Jellyfish(id, index, px, py);
    case "butterfly":
      return new Butterfly(id, index, px, py);
    case "dragonfly":
      return new Dragonfly(id, index, px, py);
    case "frog":
      return new Frog(id, index, px, py);
    case "crab":
      return new Crab(id, index, px, 0.75 + (index % 3) * 0.08);
    case "crane":
      return new Crane(id, index, px, 0.15 + (index % 4) * 0.1);
    default:
      return new Koi(id, index, "kohaku", "course");
  }
}

