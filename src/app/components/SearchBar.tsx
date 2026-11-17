import React, { useState, useEffect, useRef } from "react";
import {
  buildSearchUrl,
  fetchSearchSuggestions,
  SEARCH_ENGINES,
  isUrl,
} from "../../services/search";

interface TopSite {
  title: string;
  url: string;
}

const DEFAULT_TOP_SITES: TopSite[] = [
  { title: "github", url: "https://github.com" },
  { title: "youtube", url: "https://youtube.com" },
  { title: "reddit", url: "https://reddit.com" },
  { title: "gmail", url: "https://mail.google.com" },
  { title: "x/twitter", url: "https://x.com" },
];

interface SearchBarProps {
  engineId: "google" | "duckduckgo" | "bing" | "ecosia" | "custom";
  customUrl?: string;
  showSuggestions: boolean;
  showTopSites: boolean;
  onEngineChange: (
    engine: "google" | "duckduckgo" | "bing" | "ecosia" | "custom"
  ) => void;
  recentSearches: string[];
  onAddRecentSearch: (query: string) => void;
  dogObstructing?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  engineId,
  customUrl,
  showSuggestions,
  showTopSites,
  onEngineChange,
  recentSearches,
  onAddRecentSearch,
  dogObstructing,
}) => {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [isOpen, setIsOpen] = useState(false);
  const [dogTeaseMsg, setDogTeaseMsg] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

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

  // Suggestions fetch
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

  // Outside click
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
    if (dogObstructing && Math.random() < 0.4) {
      // Playful teasing dog obstructs typing!
      const teasers = ["*pawed!*", "*bark!*", "🐾", "*lick*", "*wag*"];
      setDogTeaseMsg(teasers[Math.floor(Math.random() * teasers.length)]);
      setTimeout(() => setDogTeaseMsg(null), 1200);
      return;
    }

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
      {/* Playful Dog Sit-On-Search Indicator */}
      {dogObstructing && (
        <div
          style={{
            position: "absolute",
            top: "-22px",
            left: "20px",
            fontSize: "11px",
            letterSpacing: "0.1em",
            color: "#e8784f",
            animation: "fadeIn 0.2s ease",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span>▼・ᴥ・▼</span>
          <span>{dogTeaseMsg || "[ Pup is sitting on your search bar! Pet or drag to move ]"}</span>
        </div>
      )}

      <div className="search-box">
        <span className="search-prefix">&gt;</span>
        <input
          ref={inputRef}
          type="text"
          className="search-input"
          placeholder={dogObstructing ? "*pup is resting here...*" : "Search the web or enter URL..."}
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

      {/* Real-time search suggestions */}
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

      {/* Minimal ASCII Top Sites */}
      {showTopSites && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "10px",
            marginTop: "12px",
            flexWrap: "wrap",
          }}
        >
          {DEFAULT_TOP_SITES.map((site) => (
            <a
              key={site.title}
              href={site.url}
              style={{
                fontSize: "11px",
                letterSpacing: "0.08em",
                color: "inherit",
                opacity: 0.65,
                textDecoration: "none",
                padding: "2px 6px",
                borderRadius: "4px",
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.02)",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = "1";
                e.currentTarget.style.borderColor = "var(--accent-color)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "0.65";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
              }}
            >
              [ {site.title} ]
            </a>
          ))}
        </div>
      )}
    </div>
  );
};
