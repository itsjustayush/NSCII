import { RGB, rgb, mixC } from "../simulation/Physics";

export interface PaletteConfig {
  id: string;
  name: string;
  dark: boolean;
  waterHex: string;
  inkHex: string;
  accentHex: string;
  koiLightHex: string;
  koiDarkHex: string;
  foodHex: string;
  dotHex?: string;
}

export interface ResolvedPalette {
  id: string;
  dark: boolean;
  water: RGB;
  ink: RGB;
  accent: RGB;
  koiLight: RGB;
  koiDark: RGB;
  food: RGB;
  dot: RGB;
  white: RGB;
  red: RGB;
  black: RGB;
  eye: RGB;
  fin: RGB;
  koi: {
    course: { red: RGB; white: RGB; black: RGB; fin: RGB };
    vermilion: { red: RGB; white: RGB; black: RGB; fin: RGB };
    gold: { red: RGB; white: RGB; black: RGB; fin: RGB };
    sakura: { red: RGB; white: RGB; black: RGB; fin: RGB };
  };
}

export const PALETTES: Record<string, PaletteConfig> = {
  pond: {
    id: "pond",
    name: "Japanese Pond",
    dark: true,
    waterHex: "#0e2a32",
    inkHex: "#ebe6dc",
    accentHex: "#e8784f",
    koiLightHex: "#ece6da",
    koiDarkHex: "#3a3632",
    foodHex: "#ce8e4a",
  },
  black: {
    id: "black",
    name: "Obsidian Noir",
    dark: true,
    waterHex: "#0d1315",
    inkHex: "#ebe6dc",
    accentHex: "#e8784f",
    koiLightHex: "#ece6da",
    koiDarkHex: "#3a3632",
    foodHex: "#ce8e4a",
  },
  ocean: {
    id: "ocean",
    name: "Deep Ocean",
    dark: true,
    waterHex: "#061220",
    inkHex: "#c8e8f8",
    accentHex: "#00c8ff",
    koiLightHex: "#e0f2fe",
    koiDarkHex: "#0f2537",
    foodHex: "#38bdf8",
  },
  garden: {
    id: "garden",
    name: "Emerald Garden",
    dark: true,
    waterHex: "#0a1f14",
    inkHex: "#dcfce7",
    accentHex: "#22c55e",
    koiLightHex: "#f0fdf4",
    koiDarkHex: "#143a24",
    foodHex: "#86efac",
  },
  amber: {
    id: "amber",
    name: "Amber CRT",
    dark: true,
    waterHex: "#161007",
    inkHex: "#fef3c7",
    accentHex: "#f59e0b",
    koiLightHex: "#fffbeb",
    koiDarkHex: "#2d1c0a",
    foodHex: "#fbbf24",
  },
  cyberpunk: {
    id: "cyberpunk",
    name: "Cyber Neon",
    dark: true,
    waterHex: "#0d0718",
    inkHex: "#f8fafc",
    accentHex: "#f43f5e",
    koiLightHex: "#fae8ff",
    koiDarkHex: "#311042",
    foodHex: "#06b6d4",
  },
  sakura: {
    id: "sakura",
    name: "Sakura Dusk",
    dark: true,
    waterHex: "#1a1016",
    inkHex: "#fce7f3",
    accentHex: "#fb7185",
    koiLightHex: "#fff1f2",
    koiDarkHex: "#3d1a2f",
    foodHex: "#f472b6",
  },
  light: {
    id: "light",
    name: "Parchment Light",
    dark: false,
    waterHex: "#e9e4da",
    inkHex: "#1c1a17",
    accentHex: "#9e3214",
    koiLightHex: "#f7f2e8",
    koiDarkHex: "#2b2723",
    foodHex: "#965c28",
  },
};

export function resolvePalette(cfg: PaletteConfig): ResolvedPalette {
  const water = rgb(cfg.waterHex);
  const ink = rgb(cfg.inkHex);
  const accent = rgb(cfg.accentHex);
  const light = rgb(cfg.koiLightHex);
  const darkKoi = rgb(cfg.koiDarkHex);
  const food = rgb(cfg.foodHex);
  const dark = cfg.dark;

  const white: RGB = dark ? light : mixC(light, [255, 255, 255], 0.4);
  const red: RGB = dark
    ? mixC(accent, [232, 92, 52], 0.5)
    : mixC(accent, [214, 72, 34], 0.7);
  const black: RGB = dark ? mixC(darkKoi, [0, 0, 0], 0.2) : darkKoi;
  const eye: RGB = dark ? [16, 15, 14] : [30, 27, 24];
  const fin: RGB = dark ? mixC(light, water, 0.25) : mixC(water, black, 0.34);
  const dot: RGB = dark ? light : ink;

  const scheme = (r: RGB, w: RGB, b: RGB) => ({
    red: r,
    white: w,
    black: b,
    fin: dark ? mixC(w, water, 0.25) : fin,
  });

  return {
    id: cfg.id,
    dark,
    water,
    ink,
    accent,
    koiLight: light,
    koiDark: darkKoi,
    food,
    dot,
    white,
    red,
    black,
    eye,
    fin,
    koi: {
      course: scheme(red, white, black),
      vermilion: scheme([214, 58, 36], [246, 242, 234], [24, 22, 20]),
      gold: scheme([230, 164, 52], [222, 228, 232], [98, 74, 42]),
      sakura: scheme([238, 132, 128], [250, 240, 228], [66, 60, 70]),
    },
  };
}

