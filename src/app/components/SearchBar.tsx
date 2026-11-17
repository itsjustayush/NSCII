import React, { useState, useEffect, useRef } from "react";
import {
  buildSearchUrl,
  fetchSearchSuggestions,
  SEARCH_ENGINES,
  isUrl,
} from "../../services/search";

interface SearchBarProps {
  engineId: "google" | "duckduckgo" | "bing" | "ecosia" | "custom";
  customUrl?: string;
  showSuggestions: boolean;
  onEngineChange: (
    engine: "google" | "duckduckgo" | "bing" | "ecosia" | "custom"
  ) => void;
  recentSearches: string[];
  onAddRecentSearch: (query: string) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  engineId,
  customUrl,
  showSuggestions,
  onEngineChange,
  recentSearches,
  onAddRecentSearch,
}) => {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Cycle search engine when clicking the badge
  const cycleEngine = () => {
    const list: ("google" | "duckduckgo" | "bing" | "ecosia" | "custom")[] = [
      "google",
      "duckduckgo",
      "bing",
      "ecosia",
    ];
    const nextIdx = (list.indexOf(engineId) + 1) % list.length;
    onEngineChange(list[nextIdx]);
  };

  const currentEngineName =
    SEARCH_ENGINES.find((e) => e.id === engineId)?.name || "Search";

  // Fetch suggestions with debounce
  useEffect(() => {
    if (!showSuggestions || !query.trim()) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      const results = await fetchSearchSuggestions(query);
      setSuggestions(results);
      setIsOpen(results.length > 0);
      setSelectedIndex(-1);
    }, 160);

    return () => clearTimeout(timer);
  }, [query, showSuggestions]);

  // Handle outside click to close suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const executeSearch = (targetQuery: string) => {
    const q = targetQuery.trim();
    if (!q) return;

    if (!isUrl(q)) {
      onAddRecentSearch(q);
    }
    const targetUrl = buildSearchUrl(q, engineId, customUrl);
    window.location.href = targetUrl;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen && suggestions.length > 0) {
        setIsOpen(true);
        setSelectedIndex(0);
        return;
      }
      setSelectedIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setSelectedIndex(-1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        executeSearch(suggestions[selectedIndex]);
      } else {
        executeSearch(query);
      }
    }
  };

  return (
    <div ref={wrapperRef} className="search-wrapper">
      <div className="search-box">
        <span className="search-prefix">&gt;</span>
        <input
          ref={inputRef}
          type="text"
          className="search-input"
          placeholder="Search the web or enter URL..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          spellCheck={false}
          autoComplete="off"
        />
        <button
          type="button"
          className="search-engine-badge"
          onClick={cycleEngine}
          title="Click to cycle search engine"
        >
          {currentEngineName}
        </button>
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="suggestions-dropdown">
          {suggestions.map((item, idx) => (
            <div
              key={item}
              className={`suggestion-item ${
                idx === selectedIndex ? "active" : ""
              }`}
              onClick={() => executeSearch(item)}
            >
              <span className="suggestion-icon">&gt;</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

