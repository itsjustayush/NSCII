# ASCII World — Interactive Animated ASCII New Tab Extension

An atmospheric, interactive, character-based new tab extension for Chrome and Chromium-based browsers, inspired directly by **[ASCII Koi](https://pursurer.github.io/ascii-koi)** and combining procedural ecosystems, interactive Japanese water gardens, and a **playful puppy playground**.

Rather than placing an animal animation inside a background card of a generic dashboard, **the ASCII environment is the application**. The new tab utilities (clock, greeting, search, biomes, and interactions) are seamlessly integrated into the ASCII character grid.

---

## What's New & Key Features

### 1. Puppy Playground Biome (`dogpark`) & Ultra-Detailed Playful ASCII Dogs
- **Anatomical Procedural Dog Model**:
  - Head, snout with wet black nose (`▼`), panting pink tongue (`U`), cute eyes that turn into happy arcs (`^`) when pet or belly-rubbed!
  - Floppy ears, neck collar with shiny gold bell (`o`), breathing ribcage torso, 4 articulated running legs with paws, and dynamic wagging tail (`~`, `/`, `\`).
  - Breed variations (Golden Retriever/Shiba Inu, Corgi/Tricolor, Dalmatian, Chocolate Lab).
- **Playful Stunts & Mischievous Teasing**:
  - **Zoomies**: Sudden bursts of frantic figure-8 running with dust clouds and happy barks!
  - **Belly Rubs**: Flips onto its back with 4 paws kicking in the air. Hovering your cursor over its belly pops ASCII hearts (`♥`)!
  - **Begging & Sitting**: Sits attentively on haunches or stands on hind paws.
  - **Cursor Stalking & Pouncing**: Drops low to the ground, wiggles its butt excitedly, then springs through the air in a parabolic leap to catch your cursor!
  - **Search Bar Intrusion**: Trots over and leaps right onto the search bar! Sits on top of the search input, dangles paws over the box, and wags its tail across the text.
  - **Teasing & Typing Obstruction**: Playfully taps the search box with its paws, leaving little paw prints (`🐾`) and puppy barks (`*pawed!*`, `*lick*`).
  - **Click & Drag**: Click directly on any pup to pick them up and drag them anywhere across the screen—they dangle with kicking paws and happy panting faces!
  - **Toss Treats / Bones**: Right-click or press `F` to toss bones that dogs sprint after and carry back in their mouths.

### 2. Environmental Water Physics & Japanese Garden Elements
- **Floating Water Lilies & Lotus Leaves**:
  - Circular leaves drifting on gentle current vectors.
  - **Cross-creature interaction**: Frogs actively leap onto lilypads to rest; koi swim underneath them with soft depth occlusion.
- **Stepping Stones & River Rocks**:
  - Textured stones with ASCII bevel shading. Swimming fish dynamically calculate obstacle avoidance vectors to steer smoothly around them.
- **Floating Paper Lanterns (*Toro Nagashi*)**:
  - Drop candle lanterns into the water (press `L` or tap Lantern). Emits a warm dynamic radial illumination field that brightens passing koi and water caustics.
- **Bamboo Water Spout (*Shishi-odoshi*)**:
  - A traditional Japanese water rocker fountain in the corner: slowly fills with trickling water drops, tips forward, and clacks down with a crisp acoustic sound (`*CLACK*`), sending an expanding wave ring across the pond.

### 3. Dynamic Day/Night & Twilight Cycles
- Syncs automatically with your real local clock time or can be forced via settings:
  - **Dawn**: Dewy morning mist (`~`, `.`) with pale cool cyan tones.
  - **Day**: Brilliant high-contrast caustics (`*`, `#`) and sharp shadows.
  - **Dusk (Golden Hour)**: Warm amber and sakura dusk gradients.
  - **Night**: Deep obsidian waters, glowing bioluminescence, night fireflies, and a crescent moon reflection in the pond (`)`).

### 4. Ambient Weather System
- **Light Rain**: Diagonal rain streaks (`/`, `\`) with tiny splash ripple rings (`o`, `·`) hitting the water surface.
- **Winter Snow**: Floating snowflakes (`*`, `+`) gently settling on the ground.
- **Wind**: Dynamic wind gusts that steer floating petals, water drift, and particles.
- **Morning Mist**: Low-lying cloud glyphs drifting across the horizon.

### 5. Procedurally Synthesized Soundscape (Web Audio API)
- Zero external audio files — synthesized live using browser oscillators and noise generators:
  - Soft water laps, splashes, and bubble gulps.
  - Wooden bamboo rocker clacks (*Shishi-odoshi*).
  - Playful puppy yips, barks, and panting breaths.
  - Distant night crickets.
  - Toggle anytime via the bottom bar: `[ ♫ Sound: ON / OFF ]`.

### 6. Minimalist ASCII New Tab Utilities
- **Integrated Digital Clock**: 12h/24h formats, optional seconds, time-of-day greeting with customizable user name.
- **ASCII Search Area**:
  - Direct URL detection and navigation (e.g. `github.com` or `http://localhost:3000`).
  - Engine switcher (Google, DuckDuckGo, Bing, Ecosia, or Custom template `%s`).
  - Real-time search suggestions with keyboard navigation (Up / Down / Enter / Esc).
  - Minimal ASCII Top Sites (`[ github ] [ youtube ] [ reddit ] [ gmail ] [ x/twitter ]`).

---

## Environments (7 Biomes)
1. **Japanese Pond**: Koi, water caustics, floating lilypads, river stones, bamboo water fountain, and lanterns.
2. **Puppy Playground**: Grassy park with playful dogs doing stunts, zoomies, pouncing at cursors, and sitting on the search bar!
3. **Butterfly Garden**: Flocks of butterflies, dragonflies, and night fireflies.
4. **Deep Ocean**: Abyssal midnight waters, pulsating bioluminescent jellyfish, and rising bubbles.
5. **Shoreline**: Tide pools and wet sand with sideways scuttling crabs.
6. **Misty Wetlands**: Reeds with leaping frogs and darting dragonflies.
7. **Living Ecosystem**: A grand harmonious mixed biome featuring all species together.

---

## Controls & Shortcuts

| Action | Shortcut / Gesture |
| :--- | :--- |
| **Feed / Toss Bone** | Right Click or `F` key |
| **Disturb / Paw Poke** | Left Click or `Spacebar` |
| **Pick up & Drag Dog** | Click directly on a dog and drag |
| **Pet Dog** | Hover cursor over dog (produces hearts `♥`) |
| **Drop Floating Lantern** | `L` key or tap `▲ Lantern` |
| **Cycle Visual Themes** | `T` key |
| **Cycle Weather** | Tap `☂ Weather` (Clear, Rain, Snow, Wind, Mist) |
| **Cycle Day/Night** | Tap `☼ Lighting` (Auto, Dawn, Day, Dusk, Night) |
| **Toggle Procedural Audio** | Tap `♫ Sound` |

---

## Installation Guide (Chrome / Edge / Brave)

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
