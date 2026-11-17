import React, { useEffect, useRef, useState, useCallback } from "react";
import { CharacterGrid } from "../engine/renderer/CharacterGrid";
import { World } from "../engine/simulation/World";
import { GlyphRenderer } from "../engine/renderer/GlyphRenderer";
import { Scheduler } from "../engine/simulation/Scheduler";
import { PALETTES } from "../engine/renderer/ColorPalettes";
import { BIOMES } from "../engine/environment/Biomes";
import { WeatherType } from "../engine/environment/Weather";
import { TimeOfDay } from "../engine/environment/DayNight";
import {
  UserSettings,
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
} from "../services/storage";
import { audioService } from "../services/audio";
import { Dog } from "../creatures/terrestrial/Dog";
import { Clock } from "./components/Clock";
import { SearchBar } from "./components/SearchBar";
import { InteractionBar } from "./components/InteractionBar";
import { Settings } from "./components/Settings";

export const NewTab: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const centerBoxRef = useRef<HTMLDivElement>(null);

  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDogOnSearch, setIsDogOnSearch] = useState(false);

  // Engine references kept outside React state to avoid re-renders during 60FPS loop
  const engineRef = useRef<{
    world: World;
    grid: CharacterGrid;
    renderer: GlyphRenderer;
    scheduler: Scheduler;
    draggedDog: Dog | null;
  } | null>(null);

  // Load initial settings
  useEffect(() => {
    loadSettings().then((loaded) => {
      setSettings(loaded);
      audioService.setMuted(loaded.soundMuted);
    });
  }, []);

  // Initialize ASCII simulation & rendering engine once canvas mounts
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const grid = new CharacterGrid();
    const world = new World(settings.biome, settings.palette);
    world.setWeather(settings.weather);
    world.setTimeOfDay(settings.timeOfDay);
    const renderer = new GlyphRenderer(canvas, grid);

    const scheduler = new Scheduler(
      (dt) => {
        world.advance(dt, grid);

        // Check if any dog is playfully sitting on the search bar
        const dogSitting = world.creatures.some(
          (c) => c.species === "dog" && (c as Dog).state === "sit_search"
        );
        setIsDogOnSearch(dogSitting);
      },
      () => {
        renderer.render(world);
      },
      {
        fpsLimit: settings.fpsLimit,
        reduceMotion: settings.reduceMotion,
      }
    );

    const handleResize = () => {
      const dpr = Math.min(3, window.devicePixelRatio || 1);
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.resize(w, h, dpr, settings.cellSize);
      world.vw = w;
      world.vh = h;

      if (centerBoxRef.current) {
        world.dimBox = centerBoxRef.current.getBoundingClientRect();
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    scheduler.start();

    engineRef.current = { world, grid, renderer, scheduler, draggedDog: null };

    return () => {
      window.removeEventListener("resize", handleResize);
      scheduler.destroy();
    };
  }, []);

  // Update engine when settings change
  useEffect(() => {
    const eng = engineRef.current;
    if (!eng) return;

    if (eng.world.biome.id !== settings.biome) {
      eng.world.setBiome(settings.biome);
    }
    if (eng.world.palette.id !== settings.palette) {
      eng.world.setPalette(settings.palette);
    }
    eng.world.setWeather(settings.weather);
    eng.world.setTimeOfDay(settings.timeOfDay);
    audioService.setMuted(settings.soundMuted);

    eng.scheduler.fpsLimit = settings.fpsLimit;
    eng.scheduler.reduceMotion = settings.reduceMotion;

    const dpr = Math.min(3, window.devicePixelRatio || 1);
    eng.renderer.resize(window.innerWidth, window.innerHeight, dpr, settings.cellSize);

    // Update CSS background to seamlessly match theme
    const pal = PALETTES[settings.palette];
    if (pal) {
      document.documentElement.style.setProperty("--bg-water", pal.waterHex);
      document.documentElement.style.setProperty("--text-ink", pal.inkHex);
      document.documentElement.style.setProperty("--accent-color", pal.accentHex);
    }
  }, [settings]);

  // Register dim box callback
  const handleRegisterDim = useCallback((box: DOMRect | null) => {
    if (engineRef.current) {
      engineRef.current.world.dimBox = box;
    }
  }, []);

  // Update settings handler
  const handleUpdateSettings = (updated: Partial<UserSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...updated };
      saveSettings(next);
      return next;
    });
  };

  const handleResetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    saveSettings(DEFAULT_SETTINGS);
  };

  // User interactions: Pointer click / drag dog / feed
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const eng = engineRef.current;
    if (!eng) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    const x = e.clientX - (rect?.left || 0);
    const y = e.clientY - (rect?.top || 0);

    eng.world.pointerX = x;
    eng.world.pointerY = y;
    eng.world.pointerActive = true;

    // Check if user clicked directly on a dog to drag it!
    for (const c of eng.world.creatures) {
      if (c.species === "dog") {
        const dog = c as Dog;
        const dist = Math.hypot(dog.x - x, dog.y - y);
        if (dist < 40) {
          dog.startDrag();
          eng.draggedDog = dog;
          return;
        }
      }
    }

    if (e.button === 2) {
      // Right click feeds (tosses food/bones)
      eng.world.feed(x, y);
    } else {
      // Left click: Poke paw if pond or disturb water/ground
      if (eng.world.biome.hasPawInteraction) {
        eng.world.poke(x, y);
      } else {
        eng.world.disturb(x, y, 1.4);
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const eng = engineRef.current;
    if (!eng) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    const x = e.clientX - (rect?.left || 0);
    const y = e.clientY - (rect?.top || 0);

    eng.world.pointerX = x;
    eng.world.pointerY = y;

    // Dragging stirs the water
    if (e.buttons === 1) {
      if (eng.draggedDog) {
        // Dog follows cursor while dragged
        eng.draggedDog.x = x;
        eng.draggedDog.y = y;
      } else {
        eng.grid.stampWake(x, y, 2, 0.4);
        eng.world.disturb(x, y, 0.6);
      }
    } else {
      // Hovering near creatures allows petting or avoidance
      for (const c of eng.world.creatures) {
        if (c.onPointerDisturb) {
          c.onPointerDisturb(x, y, 0.4);
        }
      }
    }
  };

  const handlePointerUp = () => {
    const eng = engineRef.current;
    if (!eng) return;
    eng.world.pointerActive = false;
    if (eng.draggedDog) {
      eng.draggedDog.stopDrag();
      eng.draggedDog = null;
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    const x = e.clientX - (rect?.left || 0);
    const y = e.clientY - (rect?.top || 0);
    if (engineRef.current) {
      engineRef.current.world.feed(x, y);
    }
  };

  // Keyboard shortcuts (F to feed, Space to disturb, T to cycle theme, L to drop lantern)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "SELECT"
      ) {
        return;
      }

      const eng = engineRef.current;
      if (!eng) return;

      if (e.key === "f" || e.key === "F") {
        eng.world.feed(window.innerWidth / 2, window.innerHeight / 2);
      } else if (e.key === " ") {
        e.preventDefault();
        eng.world.disturb(window.innerWidth / 2, window.innerHeight / 2, 1.5);
        if (eng.world.biome.hasPawInteraction) {
          eng.world.poke(window.innerWidth / 2, window.innerHeight / 2);
        }
      } else if (e.key === "t" || e.key === "T") {
        cyclePalette();
      } else if (e.key === "l" || e.key === "L") {
        dropLantern();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [settings.palette]);

  const cyclePalette = () => {
    const paletteIds = Object.keys(PALETTES);
    const nextIdx = (paletteIds.indexOf(settings.palette) + 1) % paletteIds.length;
    handleUpdateSettings({ palette: paletteIds[nextIdx] });
  };

  const cycleWeather = () => {
    const list: WeatherType[] = ["clear", "rain", "snow", "wind", "mist"];
    const nextIdx = (list.indexOf(settings.weather) + 1) % list.length;
    handleUpdateSettings({ weather: list[nextIdx] });
  };

  const cycleTimeOfDay = () => {
    const list: TimeOfDay[] = ["auto", "dawn", "day", "dusk", "night"];
    const nextIdx = (list.indexOf(settings.timeOfDay) + 1) % list.length;
    handleUpdateSettings({ timeOfDay: list[nextIdx] });
  };

  const toggleSound = () => {
    const nextMuted = !settings.soundMuted;
    audioService.setMuted(nextMuted);
    handleUpdateSettings({ soundMuted: nextMuted });
  };

  const triggerFeed = () => {
    if (engineRef.current) {
      engineRef.current.world.feed(
        window.innerWidth / 2 + (Math.random() - 0.5) * 100,
        window.innerHeight / 2 + (Math.random() - 0.5) * 80
      );
    }
  };

  const triggerDisturb = () => {
    if (engineRef.current) {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      if (engineRef.current.world.biome.hasPawInteraction) {
        engineRef.current.world.poke(cx, cy);
      } else {
        engineRef.current.world.disturb(cx, cy, 1.5);
      }
    }
  };

  const dropLantern = () => {
    if (engineRef.current) {
      const x = window.innerWidth / 2 + (Math.random() - 0.5) * 200;
      const y = window.innerHeight * 0.65 + (Math.random() - 0.5) * 100;
      engineRef.current.world.obstacles.addLantern(x, y);
      audioService.playSplash(0.8);
    }
  };

  const handleAddRecentSearch = (q: string) => {
    handleUpdateSettings({
      recentSearches: [q, ...settings.recentSearches.filter((s) => s !== q)].slice(
        0,
        20
      ),
    });
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {/* 1. Fullscreen Interactive ASCII Simulation Canvas */}
      <div className="ascii-canvas-container">
        <canvas
          ref={canvasRef}
          className="ascii-canvas"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onContextMenu={handleContextMenu}
        />
      </div>

      {/* 2. Central Integrated New Tab Utilities */}
      <main className="newtab-center-container">
        <div ref={centerBoxRef} className="newtab-interactive-box">
          <Clock
            use12h={settings.clock12h}
            showSeconds={settings.showSeconds}
            userName={settings.userName}
            onRegisterDim={handleRegisterDim}
          />

          <SearchBar
            engineId={settings.searchEngine}
            customUrl={settings.customSearchUrl}
            showSuggestions={settings.showSuggestions}
            showTopSites={settings.showTopSites}
            onEngineChange={(engine) => handleUpdateSettings({ searchEngine: engine })}
            recentSearches={settings.recentSearches}
            onAddRecentSearch={handleAddRecentSearch}
            dogObstructing={isDogOnSearch}
          />
        </div>
      </main>

      {/* 3. Subtle ASCII Footer Interaction Bar */}
      <InteractionBar
        currentBiomeId={settings.biome}
        currentPaletteId={settings.palette}
        currentWeather={settings.weather}
        currentTimeOfDay={settings.timeOfDay}
        soundMuted={settings.soundMuted}
        onFeed={triggerFeed}
        onDisturb={triggerDisturb}
        onCycleTheme={cyclePalette}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onSelectBiome={(bId) => {
          const b = BIOMES[bId];
          handleUpdateSettings({
            biome: bId,
            palette: b?.defaultPalette || settings.palette,
          });
        }}
        onToggleSound={toggleSound}
        onCycleWeather={cycleWeather}
        onCycleTimeOfDay={cycleTimeOfDay}
        onDropLantern={dropLantern}
      />

      {/* 4. Customization Settings Drawer */}
      <Settings
        settings={settings}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onUpdate={handleUpdateSettings}
        onReset={handleResetSettings}
      />
    </div>
  );
};
