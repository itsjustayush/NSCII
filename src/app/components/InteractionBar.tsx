import React, { useState, useEffect } from "react";
import { BIOMES } from "../../engine/environment/Biomes";
import { PALETTES } from "../../engine/renderer/ColorPalettes";
import { WeatherType } from "../../engine/environment/Weather";
import { TimeOfDay } from "../../engine/environment/DayNight";
import { audioService } from "../../services/audio";

interface InteractionBarProps {
  currentBiomeId: string;
  currentPaletteId: string;
  currentWeather: WeatherType;
  currentTimeOfDay: TimeOfDay;
  soundMuted: boolean;
  onFeed: () => void;
  onDisturb: () => void;
  onCycleTheme: () => void;
  onOpenSettings: () => void;
  onSelectBiome: (biomeId: string) => void;
  onToggleSound: () => void;
  onCycleWeather: () => void;
  onCycleTimeOfDay: () => void;
  onDropLantern?: () => void;
}

export const InteractionBar: React.FC<InteractionBarProps> = ({
  currentBiomeId,
  currentPaletteId,
  currentWeather,
  currentTimeOfDay,
  soundMuted,
  onFeed,
  onDisturb,
  onCycleTheme,
  onOpenSettings,
  onSelectBiome,
  onToggleSound,
  onCycleWeather,
  onCycleTimeOfDay,
  onDropLantern,
}) => {
  const [isIdle, setIsIdle] = useState(false);
  const [showBiomeMenu, setShowBiomeMenu] = useState(false);

  useEffect(() => {
    let idleTimer: ReturnType<typeof setTimeout>;
    const resetIdle = () => {
      setIsIdle(false);
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => setIsIdle(true), 4000);
    };

    window.addEventListener("mousemove", resetIdle);
    window.addEventListener("keydown", resetIdle);
    resetIdle();

    return () => {
      window.removeEventListener("mousemove", resetIdle);
      window.removeEventListener("keydown", resetIdle);
      clearTimeout(idleTimer);
    };
  }, []);

  const currentBiome = BIOMES[currentBiomeId] || BIOMES.pond;
  const currentPalette = PALETTES[currentPaletteId] || PALETTES.pond;

  return (
    <footer className={`interaction-bar ${isIdle ? "idle" : ""}`}>
      <div className="bar-left">
        <div style={{ position: "relative" }}>
          <button
            type="button"
            className="btn-pill"
            onClick={() => setShowBiomeMenu((prev) => !prev)}
            title="Switch environment biome"
          >
            <span>[ {currentBiome.name} ]</span>
          </button>

          {showBiomeMenu && (
            <div
              style={{
                position: "absolute",
                bottom: "100%",
                left: 0,
                marginBottom: "8px",
                background: "rgba(11, 22, 28, 0.95)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                borderRadius: "8px",
                padding: "6px",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
                width: "210px",
                backdropFilter: "blur(12px)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                zIndex: 40,
              }}
            >
              {Object.values(BIOMES).map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    onSelectBiome(b.id);
                    setShowBiomeMenu(false);
                  }}
                  style={{
                    background:
                      b.id === currentBiomeId
                        ? "rgba(232, 120, 79, 0.2)"
                        : "transparent",
                    color: b.id === currentBiomeId ? "#e8784f" : "#ebe6dc",
                    border: "none",
                    textAlign: "left",
                    padding: "6px 10px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {b.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          className="btn-pill"
          onClick={onFeed}
          title={currentBiomeId === "dogpark" ? "Toss bones / treats (F key)" : "Toss fish food into the pond (F key)"}
        >
          <span>{currentBiomeId === "dogpark" ? "🦴 Toss Treat" : ":: Feed"}</span>
        </button>

        <button
          type="button"
          className="btn-pill"
          onClick={onDisturb}
          title="Disturb water / Poke paw (Space)"
        >
          <span>~ Disturb</span>
        </button>

        {onDropLantern && (
          <button
            type="button"
            className="btn-pill"
            onClick={onDropLantern}
            title="Place floating candle lantern (L key)"
          >
            <span>▲ Lantern</span>
          </button>
        )}

        <button
          type="button"
          className="btn-pill"
          onClick={onCycleWeather}
          title="Cycle Weather (Clear, Rain, Snow, Wind, Mist)"
        >
          <span>☂ {currentWeather}</span>
        </button>

        <button
          type="button"
          className="btn-pill"
          onClick={onCycleTimeOfDay}
          title="Cycle Lighting (Auto, Dawn, Day, Dusk, Night)"
        >
          <span>☼ {currentTimeOfDay}</span>
        </button>

        <button
          type="button"
          className={`btn-pill ${!soundMuted ? "active" : ""}`}
          onClick={onToggleSound}
          title="Toggle ambient synthesized soundscape"
        >
          <span>{soundMuted ? "♫ Mute" : "♫ Sound"}</span>
        </button>
      </div>

      <div className="bar-right">
        <button
          type="button"
          className="btn-pill"
          onClick={onCycleTheme}
          title="Cycle theme palette"
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: currentPalette.accentHex,
              display: "inline-block",
            }}
          />
          <span>{currentPalette.name}</span>
        </button>

        <button
          type="button"
          className="btn-pill"
          onClick={onOpenSettings}
          title="Open Customization Settings"
        >
          <span>[ Settings ]</span>
        </button>
      </div>
    </footer>
  );
};
