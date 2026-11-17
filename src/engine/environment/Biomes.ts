export interface BiomeConfig {
  id: string;
  name: string;
  description: string;
  defaultPalette: string;
  creatures: { species: string; count: number }[];
  ambientParticleType: "petals" | "fireflies" | "bubbles" | "none";
  hasWaterCaustics: boolean;
  hasPawInteraction: boolean;
  hint: string;
}

export const BIOMES: Record<string, BiomeConfig> = {
  pond: {
    id: "pond",
    name: "Japanese Pond",
    description: "Quiet garden pool with koi swimming in natural curves and water ripples.",
    defaultPalette: "pond",
    creatures: [{ species: "koi", count: 8 }],
    ambientParticleType: "petals",
    hasWaterCaustics: true,
    hasPawInteraction: true,
    hint: "Right click or tap Feed to drop pellets. Left click to disturb.",
  },
  garden: {
    id: "garden",
    name: "Butterfly Garden",
    description: "Sunlit sanctuary filled with flutter of butterflies and fireflies.",
    defaultPalette: "garden",
    creatures: [
      { species: "butterfly", count: 12 },
      { species: "dragonfly", count: 4 },
    ],
    ambientParticleType: "fireflies",
    hasWaterCaustics: false,
    hasPawInteraction: false,
    hint: "Move cursor or click to scatter the flutter.",
  },
  ocean: {
    id: "ocean",
    name: "Deep Ocean",
    description: "Abyssal depth with pulsating bioluminescent jellyfish and rising bubbles.",
    defaultPalette: "ocean",
    creatures: [{ species: "jellyfish", count: 8 }],
    ambientParticleType: "bubbles",
    hasWaterCaustics: true,
    hasPawInteraction: false,
    hint: "Tap near jellyfish to make them pulse with light and surge upward.",
  },
  shoreline: {
    id: "shoreline",
    name: "Shoreline",
    description: "Tide pools and sandy shores with scuttling crabs.",
    defaultPalette: "amber",
    creatures: [{ species: "crab", count: 8 }],
    ambientParticleType: "none",
    hasWaterCaustics: true,
    hasPawInteraction: true,
    hint: "Tap near crabs to make them scuttle away sideways.",
  },
  wetlands: {
    id: "wetlands",
    name: "Misty Wetlands",
    description: "Misty reeds with leaping frogs and darting dragonflies.",
    defaultPalette: "garden",
    creatures: [
      { species: "frog", count: 8 },
      { species: "dragonfly", count: 6 },
    ],
    ambientParticleType: "fireflies",
    hasWaterCaustics: true,
    hasPawInteraction: true,
    hint: "Tap near the frogs to make them leap across the water.",
  },
  ecosystem: {
    id: "ecosystem",
    name: "Living Ecosystem",
    description: "Rich blended biosphere with koi, butterflies, jellyfish, frogs and crabs.",
    defaultPalette: "pond",
    creatures: [
      { species: "koi", count: 5 },
      { species: "butterfly", count: 6 },
      { species: "jellyfish", count: 3 },
      { species: "dragonfly", count: 3 },
      { species: "frog", count: 4 },
      { species: "crab", count: 3 },
    ],
    ambientParticleType: "petals",
    hasWaterCaustics: true,
    hasPawInteraction: true,
    hint: "Explore diverse interactions: feed, tap, and watch the ecosystem react.",
  },
};

