# Automata Arcade

![Automata Arcade Hero](docs/media/hero.gif)

A playful Game of Life lab where you build machines, route signals, and solve arcade-style engineering challenges.

## Live Demo

**Deployed URL:** https://automata-arcade.vercel.app

## What this is for

Automata Arcade helps people learn cellular automata by *doing*:
- drag known mechanisms onto the board
- wire glider flows like logic signals
- experiment in sandbox mode
- tackle structured arcade objectives

![What is Automata Arcade](docs/media/what-is-it.png)

## Feature Highlights

![Feature Highlights](docs/media/feature-highlights.png)

- Conway Life engine on a large grid
- Pan, zoom, paint, pause, step, and speed controls
- Draggable mechanism palette with rotate and flip placement
- Right-side inspector with prefab details and tips
- Arcade mode with score, combo, and win/fail states
- Works fully offline

## Included mechanism palette

Core patterns:
- Glider
- Lightweight spaceship (LWSS)
- Gosper glider gun
- Eater-1
- Pulse seed
- Clock seed

Custom prefabs:
- Beacon
- Toad
- Blinker Train
- Spark Crab
- Drift Fork
- Pinwheel Seed
- Mini Lab Core

## Arcade levels

1. **L1 Courier Duty**: hit one receptor zone in time
2. **L2 Beacon Watch**: keep a beacon cluster alive for target generations
3. **L3 Twin Switch Boot**: trigger two switch zones
4. **L4 Population Tempo**: maintain population within a band
5. **L5 Final Assembly**: trigger receptor while protecting a core block

## Good starter experiments (interesting board setups)

After launching the app:
1. Click **Load Demo** for a dual-gun crossfire scene
2. Drop a **Gosper glider gun**, then place an **Eater-1** in the stream to create a timed stop
3. Use two **gliders** aimed at a shared region to test collision logic
4. Build a mini relay with **Clock seed + Pulse seed + Eater** and observe stable cadence

## Run locally

Prototype location:
- `~/projects/automata-arcade`

Requirements: Node.js 18+

```bash
cd ~/projects/automata-arcade
npm install
npm run serve
```

Server binds to `0.0.0.0:5173`
- Local: `http://localhost:5173`
- LAN: `http://<your-lan-ip>:5173`

## Scripts

- `npm run serve` or `npm start`: run local server
- `npm run check`: syntax check (`node --check`)

## Controls

Mouse:
- Left drag: paint and erase cells
- Wheel: zoom
- `Space + Drag` (or middle mouse drag): pan
- Drag prefab card onto board: place mechanism

Keyboard:
- `Space` play/pause
- `N` step one generation
- `C` clear
- `D` load demo
- `R` rotate placement
- `F` flip X
- `G` toggle grid
- `1` sandbox mode
- `2` arcade mode
- `P` place selected prefab at hover cell
