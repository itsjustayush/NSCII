# ASCII World — Interactive Animated ASCII New Tab Extension

An atmospheric, interactive, character-based new tab extension for Chrome and Chromium-based browsers, inspired directly by **[ASCII Koi](https://pursurer.github.io/ascii-koi)** and combining the diverse procedural fauna of **[ASCII Animals](https://github.com/bothuany/ascii-animals)**.

Rather than placing an animal animation inside a background card of a generic dashboard, **the ASCII environment is the application**. The new tab utilities (clock, greeting, search, biomes, and interactions) are seamlessly integrated into the ASCII character grid.

---

## Key Features

### 1. Authentic Character-Grid Rendering & Simulation Engine
- **Canvas 2D Character Cell Grid**: The entire viewport is partitioned into monospace character cells rendered at 60 FPS using `Geist Mono` font.
- **Batched Rendering Architecture**: Separation of solid shaded cells, ambient caustic fields (`~`, `-`, `·`), tail wakes (`:` and `·`), and foreground ASCII characters (`RAMP = " .:-=+*#%@"`).
- **Soft UI Dimming Zone**: Animals and environmental effects gently dim behind the central clock and search bar, ensuring 100% typography legibility without artificial opaque cards.
- **Completely Decoupled**: The simulation and rendering loop runs independently on `requestAnimationFrame` with zero React re-render overhead during animation ticks.

### 2. Living Procedural Creatures
- 🐟 **Koi**: The complete, authentic ASCII Koi analytical mathematical simulation:
  - 10-node spine with bend limit constraints (`BEND = 0.42`) and natural undulating swimming waves.
  - Procedural Kohaku (red saddles), Sanke (red + black sumi patches), and Tancho (forehead red circle) skin classification.
  - Fins, tail flare, eyes (`o`), barbels at snout, and upper-left light shading.
  - Scale glints when intersecting the caustic light net (`*`).
  - Trailing wake diffusion and shadows cast onto the pond floor.
  - Natural feeding instinct: koi notice falling pellets, race to the surface (`rise`), open mouths, and gulp with bubble emissions (`o`, `°`, `·`).
- 🪼 **Jellyfish**: Rhythmic pulsing bell contractions (`e.c = sin²(phase)`), translucent glowing core, and flowing trailing tentacles with `$§%&` and `()|:`. Emits bioluminescent pulses when disturbed.
- 🦋 **Butterfly**: Delicate flapping wings with inner/outer gradients and noise-generated white spots, antennas (`o` and `.`), and floral wander paths. Scatters on cursor approach.
- 🪰 **Dragonfly**: Dual pairs of high-frequency wings (`e.beat = 0.8 + 0.2 * cos(phase)`), segmented abdominal stripes, and swift dart-and-hover flight.
- 🐸 **Frog**: Resting state on lilypads, coiling leap cycles with extending hind legs (`lerp`), and water ripple landings.
- 🦀 **Crab**: Sideways scuttling across the shoreline, articulated claw pincers opening and closing, eye stalks, and cursor avoidance.
- 🪿 **Crane**: Majestic gliding flight with wide feathered wingspan, black wingtips, and red crown.

### 3. Multiple Atmospheric Biomes
- 🎋 **Japanese Pond**: Koi, water caustics, floating petals, food pellets, ripples, and cat paw poke.
- 🌸 **Butterfly Garden**: Flocks of butterflies, dragonflies, and night fireflies.
- 🌊 **Deep Ocean**: Abyssal midnight depths, pulsating jellyfish, and rising bubbles.
- 🏖️ **Shoreline**: Tide pools and wet sand with scuttling crabs.
- 🌿 **Misty Wetlands**: Leaping frogs, darting dragonflies, and ambient water rings.
- 🌐 **Living Ecosystem**: A grand harmonious mixed biome featuring all species together.

### 4. Interactive Behavioral Depth
| Interaction | Behavior |
| :--- | :--- |
| **Left Click** | Cat paw reaches from screen edge with splashes and spray, or water disturbance. Creatures scatter! |
| **Right Click** | Tosses a handful of floating fish food pellets. Hungry koi race to feed. |
| **Hover / Move** | Shy creatures (butterflies, crabs) notice and avoid the cursor. |
| **Click & Drag** | Stirs the water and generates wake lines. |
| **Key `F`** | Feed fish. |
| **Key `Space`** | Disturb water / Poke paw. |
| **Key `T`** | Cycle through visual palettes. |

### 5. Minimalist ASCII New Tab Utilities
- **Integrated Digital Clock**: 12h or 24h formats, optional seconds, time-of-day greeting ("Good morning", "Good afternoon", "Good evening", "Good night") with customizable name.
- **ASCII Search Area**:
  - Direct URL detection and navigation (e.g. `github.com` or `http://localhost:3000`).
  - Search engine switcher (Google, DuckDuckGo, Bing, Ecosia, or Custom template `%s`).
  - Real-time search suggestions with keyboard navigation (Up / Down / Enter / Esc).
  - Search history management.
- **Customization Drawer**:
  - Biome and visual palette selection (Pond, Obsidian Noir, Deep Ocean, Emerald Garden, Amber CRT, Cyber Neon, Sakura Dusk, Parchment Light).
  - Performance controls (60 FPS, 30 FPS power saver, monitor native, cell density, reduce motion).
  - JSON settings export and import.

---

## Installation Guide (Chrome / Chromium)

1. Build the extension:
   ```bash
   npm run build
   ```
2. Open your browser and navigate to the extensions page:
   - **Google Chrome**: `chrome://extensions`
   - **Microsoft Edge**: `edge://extensions`
   - **Brave**: `brave://extensions`
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked**.
5. Select the `dist` folder located in `D:\NSCII\dist`.
6. Open a new tab (`Ctrl + T`) and enjoy your living ASCII world!

---

## Development

```bash
# Start local live-reload dev server:
npm run dev

# Run TypeScript type check and production build:
npm run build
```

---

## License

MIT License.
Character cell simulation inspired by [ASCII Koi](https://github.com/pursurer/ascii-koi) and [ASCII Animals](https://github.com/bothuany/ascii-animals).
Geist Mono font by Vercel under OFL.

