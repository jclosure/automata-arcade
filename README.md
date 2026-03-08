# Automata Arcade

Automata Arcade is a fully offline single-page browser game built with vanilla HTML/CSS/JS.

It includes:
- A large-grid Conway's Game of Life sandbox with pan/zoom.
- Play/pause/step/speed controls.
- Direct drawing on the board.
- Drag-and-drop prefab palette with rotate/flip placement controls.
- A right-side inspector with prefab details and usage tips.
- Arcade mode with 5 challenge levels, scoring, combo, and win/fail states.
- A seeded visual demo loaded at startup.

## Run locally

Requirements: Node.js 18+.

```bash
npm install
npm run serve
```

Server starts on `0.0.0.0:5173` by default.

Open:
- `http://127.0.0.1:5173`
- or `http://localhost:5173`

## Scripts

- `npm run serve` (or `npm start`): serve app on `0.0.0.0:5173`
- `npm run check`: syntax check for JS files

## Controls

Mouse:
- Left click/drag: paint/erase cells (auto toggles based on initial cell state)
- Mouse wheel: zoom
- `Space + drag` (or middle-mouse drag): pan
- Drag prefab card to board: stamp pattern

Keyboard:
- `Space`: play/pause
- `N`: step one generation
- `C`: clear board
- `D`: load demo
- `R`: rotate prefab placement
- `F`: flip prefab placement on X axis
- `G`: toggle grid visibility
- `1`: sandbox mode
- `2`: arcade mode
- `P`: place selected prefab at hover cell

## Palette

Required stamps:
- Glider
- Lightweight spaceship
- Gosper glider gun
- Eater-1
- Pulse seed
- Clock seed

Custom prefabs included:
- Beacon
- Toad
- Blinker Train
- Spark Crab
- Drift Fork
- Pinwheel Seed
- Mini Lab Core

## Arcade mode levels

1. **L1 Courier Duty**: hit one receptor zone in time.
2. **L2 Beacon Watch**: keep a beacon cluster alive for target generations.
3. **L3 Twin Switch Boot**: trigger two switch zones.
4. **L4 Population Tempo**: maintain population within a band.
5. **L5 Final Assembly**: trigger receptor while protecting a core block.

Arcade systems:
- Score increases by survival and objective events.
- Combo multiplier rises on chained objective events.
- Win/fail overlays communicate mission outcomes.

## Project structure

- `index.html`: app shell and UI layout
- `styles.css`: polished arcade-themed responsive styling
- `app.js`: Life engine, rendering, interactions, drag/drop, arcade game logic
- `server.js`: tiny static server (no dependencies)

## Self-check summary

The implementation was validated with:
- JS syntax check via `npm run check`
- Local server startup via `npm run serve`

Created deliverables:
- Offline, framework-free SPA game.
- Sandbox + arcade loop with 5 levels.
- Draggable palette with required machines/seeds and 7 custom prefabs.
- HUD, inspector, keyboard shortcuts, and seeded startup scenario.
