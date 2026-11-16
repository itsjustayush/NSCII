export interface UserSettings {
  biome: string;
  palette: string;
  userName: string;
  clock12h: boolean;
  showSeconds: boolean;
  searchEngine: "google" | "duckduckgo" | "bing" | "ecosia" | "custom";
  customSearchUrl: string;
  showSuggestions: boolean;
  fpsLimit: number;
  reduceMotion: boolean;
  cellSize: number; // 0.8 to 1.4
  recentSearches: string[];
}

export const DEFAULT_SETTINGS: UserSettings = {
  biome: "pond",
  palette: "pond",
  userName: "",
  clock12h: false,
  showSeconds: false,
  searchEngine: "google",
  customSearchUrl: "https://www.google.com/search?q=%s",
  showSuggestions: true,
  fpsLimit: 60,
  reduceMotion: false,
  cellSize: 1.0,
  recentSearches: [],
};

const STORAGE_KEY = "ascii_newtab_settings";

export async function loadSettings(): Promise<UserSettings> {
  try {
    if (typeof chrome !== "undefined" && chrome.storage?.sync) {
      const result = await chrome.storage.sync.get([STORAGE_KEY]);
      if (result && result[STORAGE_KEY]) {
        return { ...DEFAULT_SETTINGS, ...result[STORAGE_KEY] };
      }
    }
  } catch (err) {
    console.warn("Could not read from chrome.storage.sync, using fallback:", err);
  }

  // Fallback to localStorage (for development server)
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (err) {
    console.warn("Could not read from localStorage:", err);
  }

  return { ...DEFAULT_SETTINGS };
}

export async function saveSettings(settings: UserSettings): Promise<void> {
  try {
    if (typeof chrome !== "undefined" && chrome.storage?.sync) {
      await chrome.storage.sync.set({ [STORAGE_KEY]: settings });
    }
  } catch (err) {
    console.warn("Could not save to chrome.storage.sync:", err);
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.warn("Could not save to localStorage:", err);
  }
}

