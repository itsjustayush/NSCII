export interface SearchEngineOption {
  id: "google" | "duckduckgo" | "bing" | "ecosia" | "custom";
  name: string;
  url: string;
}

export const SEARCH_ENGINES: SearchEngineOption[] = [
  { id: "google", name: "Google", url: "https://www.google.com/search?q=" },
  { id: "duckduckgo", name: "DuckDuckGo", url: "https://duckduckgo.com/?q=" },
  { id: "bing", name: "Bing", url: "https://www.bing.com/search?q=" },
  { id: "ecosia", name: "Ecosia", url: "https://www.ecosia.org/search?q=" },
  { id: "custom", name: "Custom", url: "" },
];

export function isUrl(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || /\s/.test(trimmed)) return false;
  if (/^https?:\/\//i.test(trimmed)) return true;
  if (/^localhost(:\d+)?/i.test(trimmed)) return true;
  if (/^(\d{1,3}\.){3}\d{1,3}(:\d+)?/i.test(trimmed)) return true;
  return /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/i.test(trimmed);
}

export function buildSearchUrl(
  query: string,
  engineId: string,
  customTemplate?: string
): string {
  const trimmed = query.trim();
  if (isUrl(trimmed)) {
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  }

  const encoded = encodeURIComponent(trimmed);
  if (engineId === "custom" && customTemplate) {
    return customTemplate.replace("%s", encoded);
  }

  const engine = SEARCH_ENGINES.find((e) => e.id === engineId) || SEARCH_ENGINES[0];
  return `${engine.url}${encoded}`;
}

export async function fetchSearchSuggestions(query: string): Promise<string[]> {
  const q = query.trim();
  if (!q) return [];
  try {
    const url = `https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(
      q
    )}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    if (Array.isArray(data) && Array.isArray(data[1])) {
      return data[1].slice(0, 5) as string[];
    }
  } catch {
    // Silent fallback if network/CORS restricts suggestions in dev mode
  }
  return [];
}

