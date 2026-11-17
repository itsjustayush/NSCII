import { RGB, mixC } from "../simulation/Physics";

export type TimeOfDay = "auto" | "dawn" | "day" | "dusk" | "night";

export interface LightingState {
  period: "dawn" | "day" | "dusk" | "night";
  ambientLight: number; // 0.4 to 1.3
  causticBoost: number; // 0.2 (night) to 1.4 (day)
  tintColor: RGB;
  showMoon: boolean;
  moonX: number;
  moonY: number;
  mistDensity: number;
}

export function computeLighting(mode: TimeOfDay = "auto"): LightingState {
  let period: "dawn" | "day" | "dusk" | "night" = "day";

  if (mode === "auto") {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 8) period = "dawn";
    else if (hour >= 8 && hour < 17) period = "day";
    else if (hour >= 17 && hour < 20) period = "dusk";
    else period = "night";
  } else {
    period = mode;
  }

  switch (period) {
    case "dawn":
      return {
        period: "dawn",
        ambientLight: 0.85,
        causticBoost: 0.7,
        tintColor: [180, 210, 240], // Soft cool cyan
        showMoon: false,
        moonX: 0.8,
        moonY: 0.2,
        mistDensity: 0.35,
      };
    case "day":
      return {
        period: "day",
        ambientLight: 1.15,
        causticBoost: 1.25,
        tintColor: [255, 255, 255],
        showMoon: false,
        moonX: 0.8,
        moonY: 0.2,
        mistDensity: 0.0,
      };
    case "dusk":
      return {
        period: "dusk",
        ambientLight: 0.9,
        causticBoost: 0.85,
        tintColor: [255, 180, 130], // Warm amber / rose
        showMoon: true,
        moonX: 0.75,
        moonY: 0.25,
        mistDensity: 0.1,
      };
    case "night":
      return {
        period: "night",
        ambientLight: 0.55,
        causticBoost: 0.3,
        tintColor: [120, 140, 190], // Deep midnight blue
        showMoon: true,
        moonX: 0.78,
        moonY: 0.22,
        mistDensity: 0.2,
      };
  }
}

