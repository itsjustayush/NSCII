import React from "react";
import { UserSettings } from "../../services/storage";
import { BIOMES } from "../../engine/environment/Biomes";
import { PALETTES } from "../../engine/renderer/ColorPalettes";

interface SettingsProps {
  settings: UserSettings;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updated: Partial<UserSettings>) => void;
  onReset: () => void;
}

export const Settings: React.FC<SettingsProps> = ({
  settings,
  isOpen,
  onClose,
  onUpdate,
  onReset,
}) => {
  if (!isOpen) return null;

  const handleExport = () => {
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(settings, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "ascii-koi-settings.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        onUpdate(parsed);
      } catch (err) {
        alert("Invalid JSON settings file");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <span className="settings-title">&lt; Customization /&gt;</span>
          <button
            type="button"
            className="settings-close"
            onClick={onClose}
            title="Close Settings"
          >
            [ X ]
          </button>
        </div>

        {/* 1. Environment / Biome */}
        <section className="settings-section">
          <span className="section-label">Environment Biome</span>
          <div className="settings-grid">
            {Object.values(BIOMES).map((b) => (
              <div
                key={b.id}
                className={`biome-card ${
                  settings.biome === b.id ? "active" : ""
                }`}
                onClick={() =>
                  onUpdate({
                    biome: b.id,
                    palette: b.defaultPalette || settings.palette,
                  })
                }
              >
                <div className="biome-card-title">{b.name}</div>
                <div className="biome-card-desc">{b.description}</div>
              </div>
            ))}
          </div>
        </section>

        {/* 2. Weather & Day/Night Atmosphere */}
        <section className="settings-section">
          <span className="section-label">Atmosphere &amp; Weather</span>
          <div className="setting-row">
            <span className="setting-label-text">Time of Day</span>
            <select
              className="setting-input"
              value={settings.timeOfDay}
              onChange={(e) =>
                onUpdate({
                  timeOfDay: e.target.value as UserSettings["timeOfDay"],
                })
              }
            >
              <option value="auto">Auto (Matches Clock)</option>
              <option value="dawn">Dawn (Morning Dew)</option>
              <option value="day">Day (Brilliant Caustics)</option>
              <option value="dusk">Dusk (Golden Hour)</option>
              <option value="night">Night (Obsidian &amp; Moon)</option>
            </select>
          </div>
          <div className="setting-row">
            <span className="setting-label-text">Weather</span>
            <select
              className="setting-input"
              value={settings.weather}
              onChange={(e) =>
                onUpdate({
                  weather: e.target.value as UserSettings["weather"],
                })
              }
            >
              <option value="clear">Clear Skies</option>
              <option value="rain">Light Rain (Ripples)</option>
              <option value="snow">Snow (Winter Flakes)</option>
              <option value="wind">Windy (Current Drift)</option>
              <option value="mist">Morning Mist</option>
            </select>
          </div>
          <div className="setting-row">
            <span className="setting-label-text">Synthesized Audio Soundscape</span>
            <input
              type="checkbox"
              checked={!settings.soundMuted}
              onChange={(e) => onUpdate({ soundMuted: !e.target.checked })}
            />
          </div>
        </section>

        {/* 3. Color Palette / Theme */}
        <section className="settings-section">
          <span className="section-label">Visual Palette</span>
          <div className="theme-pill-grid">
            {Object.values(PALETTES).map((p) => (
              <button
                key={p.id}
                type="button"
                className={`theme-pill ${
                  settings.palette === p.id ? "active" : ""
                }`}
                onClick={() => onUpdate({ palette: p.id })}
              >
                <span
                  className="theme-dot"
                  style={{ backgroundColor: p.accentHex }}
                />
                <span>{p.name}</span>
              </button>
            ))}
          </div>
        </section>

        {/* 4. Clock & Information */}
        <section className="settings-section">
          <span className="section-label">Clock &amp; Greeting</span>
          <div className="setting-row">
            <span className="setting-label-text">12-Hour Time Format</span>
            <input
              type="checkbox"
              checked={settings.clock12h}
              onChange={(e) => onUpdate({ clock12h: e.target.checked })}
            />
          </div>
          <div className="setting-row">
            <span className="setting-label-text">Display Seconds</span>
            <input
              type="checkbox"
              checked={settings.showSeconds}
              onChange={(e) => onUpdate({ showSeconds: e.target.checked })}
            />
          </div>
          <div className="setting-row">
            <span className="setting-label-text">Your Name</span>
            <input
              type="text"
              className="setting-input"
              placeholder="e.g. Wanderer"
              value={settings.userName}
              onChange={(e) => onUpdate({ userName: e.target.value })}
            />
          </div>
        </section>

        {/* 5. Search Settings */}
        <section className="settings-section">
          <span className="section-label">Search &amp; Shortcuts</span>
          <div className="setting-row">
            <span className="setting-label-text">Default Engine</span>
            <select
              className="setting-input"
              value={settings.searchEngine}
              onChange={(e) =>
                onUpdate({
                  searchEngine: e.target.value as UserSettings["searchEngine"],
                })
              }
            >
              <option value="google">Google</option>
              <option value="duckduckgo">DuckDuckGo</option>
              <option value="bing">Bing</option>
              <option value="ecosia">Ecosia</option>
              <option value="custom">Custom Template</option>
            </select>
          </div>
          <div className="setting-row">
            <span className="setting-label-text">Show Top Site Shortcuts</span>
            <input
              type="checkbox"
              checked={settings.showTopSites}
              onChange={(e) =>
                onUpdate({ showTopSites: e.target.checked })
              }
            />
          </div>
          <div className="setting-row">
            <span className="setting-label-text">Query Suggestions</span>
            <input
              type="checkbox"
              checked={settings.showSuggestions}
              onChange={(e) =>
                onUpdate({ showSuggestions: e.target.checked })
              }
            />
          </div>
        </section>

        {/* 6. Performance & Quality */}
        <section className="settings-section">
          <span className="section-label">Performance &amp; Quality</span>
          <div className="setting-row">
            <span className="setting-label-text">Target FPS Cap</span>
            <select
              className="setting-input"
              value={settings.fpsLimit}
              onChange={(e) =>
                onUpdate({ fpsLimit: parseInt(e.target.value, 10) })
              }
            >
              <option value="60">60 FPS (Smooth)</option>
              <option value="30">30 FPS (Power Saver)</option>
              <option value="0">Monitor Native (120Hz+)</option>
            </select>
          </div>
          <div className="setting-row">
            <span className="setting-label-text">Cell Size / Density</span>
            <select
              className="setting-input"
              value={settings.cellSize}
              onChange={(e) =>
                onUpdate({ cellSize: parseFloat(e.target.value) })
              }
            >
              <option value="0.85">Small Cells (High Density)</option>
              <option value="1.0">Standard (Recommended)</option>
              <option value="1.25">Large Cells (Crisp ASCII)</option>
            </select>
          </div>
          <div className="setting-row">
            <span className="setting-label-text">Reduced Motion</span>
            <input
              type="checkbox"
              checked={settings.reduceMotion}
              onChange={(e) =>
                onUpdate({ reduceMotion: e.target.checked })
              }
            />
          </div>
        </section>

        {/* 7. Storage & Actions */}
        <section
          className="settings-section"
          style={{
            marginTop: "auto",
            borderTop: "1px solid rgba(255,255,255,0.1)",
            paddingTop: "14px",
          }}
        >
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn-pill"
              onClick={handleExport}
            >
              Export JSON
            </button>
            <label className="btn-pill" style={{ cursor: "pointer" }}>
              Import JSON
              <input
                type="file"
                accept=".json"
                style={{ display: "none" }}
                onChange={handleImport}
              />
            </label>
            <button
              type="button"
              className="btn-pill"
              onClick={onReset}
              style={{ color: "#f87171" }}
            >
              Reset Defaults
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
