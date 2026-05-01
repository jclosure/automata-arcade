<div align="center">

# 🎮 Automata Arcade

### Conway's Game of Life — reimagined as an engineering playground, circuit lab, and research instrument.

![Automata Arcade](docs/media/hero.gif)

[![Live Demo](https://img.shields.io/badge/Live_Demo-Online-5be0bc?style=flat-square)](https://automata-arcade.vercel.app)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js)](https://nodejs.org)
[![Vanilla JS](https://img.shields.io/badge/Built_with-Vanilla_JS-f2b84b?style=flat-square)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Three.js](https://img.shields.io/badge/3D-Three.js_r158-black?style=flat-square)](https://threejs.org)
[![Zero dependencies](https://img.shields.io/badge/Runtime_deps-Zero-accent?style=flat-square)](#)

</div>

---

## What is this?

Automata Arcade is a browser-based Game of Life environment that grows with you — from first-time explorer to circuit designer. Start by dragging gliders onto the board and watching them fly. Progress to solving structured arcade missions. Eventually you'll be building NOT gates, routing signal streams across a torus, and rewinding time to replay a particularly beautiful collision.

It runs entirely in your browser. No install required for the demo. All pattern data is computed locally with no network calls after the first page load.

---

## Quick Start

```bash
git clone https://github.com/jclosure/automata-arcade.git
cd automata-arcade
npm install
npm run serve
# → http://localhost:5173
```

Or hit the [Live Demo](https://automata-arcade.vercel.app) directly.

---

## Feature Overview

| Layer | What it gives you |
|---|---|
| 🎨 **Sandbox** | Infinite flat grid — draw, drop prefabs, experiment |
| 🏆 **Arcade** | 9 structured missions with scoring, zones, and win states |
| 🎓 **Circuit Academy** | 4 guided tutorial levels that teach GoL signal logic |
| 🌐 **3D Manifolds** | Live GoL on a sphere, torus, Klein bottle, Möbius strip, cylinder |
| ⏱️ **Time Machine** | Full history playhead — scrub, rewind, replay any moment |
| 📦 **Prefab Palette** | 30+ drag-and-drop patterns across Required, Custom, and Circuit categories |

---

## 🎨 The Board

The main canvas is a pan-and-zoom 2D grid running Conway's B3/S23 rules.

**Mouse controls:**

| Action | Result |
|---|---|
| Left-click / drag | Paint cells alive |
| Right-click / drag | Erase cells |
| Scroll wheel | Zoom in / out |
| Space + drag | Pan the view |
| Drag palette card → board | Place a prefab |
| Right-drag on sphere | Rotate the 3D view |

**Keyboard controls:**

| Key | Action |
|---|---|
| `Space` | Play / Pause |
| `N` | Step one generation forward |
| `B` | Step one generation backward |
| `C` | Clear board |
| `D` | Load demo scene |
| `R` | Cycle rotation (0° → 90° → 180° → 270°) |
| `F` | Flip prefab on X axis |
| `G` | Toggle grid overlay |
| `P` | Place selected prefab at cursor |
| `1` | Sandbox mode |
| `2` | Arcade mode |
| `3` | Sphere |
| `4` | Torus |
| `5` | Klein Bottle |
| `6` | Möbius Strip |
| `7` | Cylinder |

---

## ⏱️ Time Machine

Every generation you run is recorded — up to **600 frames** of full board state. The timeline bar lives at the bottom of the board.

```
  ⏮   ⏴   ⏪   ▶   ⏵   ⏭        gen 0 ════════●════════ gen 342        8×
  │    │    │    │    │    │                      │
  │    │    │    │    │    └─ jump to newest frame
  │    │    │    │    └─ step one generation forward (N)
  │    │    │    └─ play / pause forward  (Space)
  │    │    └─ play backward through history
  │    └─ step one generation backward   (B)
  └─ jump to oldest recorded frame
```

**How it works:**

- **Forward play** computes new generations and appends them to history.
- **Backward play** replays stored frames — reverse evolution without re-computation.
- **Scrubbing** — click or drag anywhere on the track to jump to any generation instantly.
- **Forking** — if you scrub back to gen 100 and press Play, history after gen 100 is discarded and a fresh branch grows from that state.
- **Speed tiers** — 1×, 2×, 4×, 8×, 15×, 25×, 30× steps per second, controlled by the slider at the right of the bar. The top-bar speed slider is a fine-grained override.

> **Tip:** Pause the simulation, scrub backward until you see an interesting collision, then step forward frame-by-frame with `N` to watch it in slow motion.

---

## 📦 Prefab Palette

Drag any card from the left panel onto the board. Use the **Rotate** selector (or `R`) and **Flip X** (`F`) to orient it before dropping. The right-hand **Inspector** shows the selected prefab's description, dimensions, nominal period, and a usage tip.

### 🔵 Required Patterns

Fundamental building blocks — every GoL practitioner should know these.

| Pattern | Type | Description |
|---|---|---|
| **Glider** | Ship | The classic 5-cell diagonal courier. Travels c/4 south-east, period 4. |
| **Lightweight Spaceship** | Ship | Faster horizontal craft. Useful across wide corridors. |
| **Gosper Glider Gun** | Gun | First known infinite-growth pattern. Fires one SE glider every 30 generations. |
| **Eater-1** | Still life | Absorbs incoming gliders and survives intact. The canonical terminator. |
| **Pulse Seed** | Seed | Small high-energy seed that blooms into a periodic flicker. |
| **Clock Seed** | Seed | Compact seed that typically settles into stable oscillators. |

### 🟠 Custom Patterns

Hand-crafted mechanisms for interesting dynamics.

| Pattern | Type | Description |
|---|---|---|
| **Beacon** | Oscillator | Classic period-2 oscillator. Used as the objective anchor in L2. |
| **Toad** | Oscillator | Period-2 with a broad alternating swing. |
| **Blinker Train** | Seed | Three staged blinkers that phase into a moving wavefront. |
| **Spark Crab** | Seed | Asymmetric seed that ejects fast diagonal sparks. |
| **Drift Fork** | Machine | Forked structure that nudges gliders into diverging traces. |
| **Pinwheel Seed** | Seed | Cross-kernel seed with rotational blossom behavior. |
| **Mini Lab Core** | Machine | Stable 4-sided core used as a defensive anchor in arcade missions. |

### 🟢 Circuit Patterns

Verified signal-logic components — all behavior confirmed by simulation before encoding.

#### Still Lives (stable anchors)

| Pattern | Cells | Description |
|---|---|---|
| **Block** | 4 | 2×2 stable. Universal anchor — appears in nearly every circuit. |
| **Beehive** | 6 | Common stable product of glider collisions. |
| **Tub** | 4 | Compact diamond spacer. Won't disturb distant gliders. |
| **Loaf** | 7 | Asymmetric 7-cell still life. Appears as gate residue. |

#### Oscillators (clocks and timing)

| Pattern | Cells | Period | Description |
|---|---|---|---|
| **Blinker** | 3 | 2 | Simplest oscillator. Gate or deflect at the right phase. |
| **Pulsar** | 48 | 3 | Largest common natural oscillator. Visual timing reference. |
| **Pentadecathlon** | 18 | 15 | Longest-period common small oscillator. Combines with the p30 Gosper gun for synchronised logic (LCM = 30). |

#### Seeds (long-lived generators)

| Pattern | Cells | Lifespan | Output |
|---|---|---|---|
| **R-Pentomino** | 5 | 1,103 gen | 6 escaping gliders |
| **Acorn** | 7 | 5,206 gen | 13 gliders + 4 LWSSes |
| **Die Hard** | 7 | 130 gen | Vanishes completely — clean timed event |

#### Gates & Signal Logic

| Pattern | Type | Description |
|---|---|---|
| **Herschel** | Carrier | 7-cell primitive of Herschel conduits. Emits a glider then stabilises. |
| **Signal Train** | Machine | Three SE gliders at p30 spacing — one period of a Gosper stream. |
| **Annihilator** | Gate | SE + NW gliders on collision course. Both vanish — zero residue. The NOT gate primitive. |
| **Turn Gate** | Gate | SE + SW collision produces a single NE output — signal redirection. |
| **Gosper Gun (NW)** | Gun | Gosper gun rotated 180°. Fires NW gliders, period 30. Aim at an SE stream for cancellation. |

---

## 🏆 Arcade Missions

Switch to **Arcade** mode, select a level, and press **Start Level**. The board is pre-loaded with the mission layout. Coloured zones appear on the grid — amber receptors, orange switches, blue core blocks, and red danger zones.

Earn score multipliers by triggering zone events in quick succession.

### Standard Levels

| # | Name | Objective | Key mechanic |
|---|---|---|---|
| L1 | **Courier Duty** | Hit receptor within 180 gens | Route a glider to an amber zone |
| L2 | **Beacon Watch** | Keep beacon alive 120/160 gens | Protect an oscillating cluster |
| L3 | **Twin Switch Boot** | Trigger both switches ≤ 220 gens | Split a signal to two zones |
| L4 | **Population Tempo** | Hold 60–180 cells for 150 gens | Balance growth and stability |
| L5 | **Final Assembly** | Hit receptor + keep core alive to gen 260 | Multi-objective under pressure |

### Circuit Academy

A guided practice range that teaches GoL signal logic from first principles. Each level ships with a **guide card** (bottom-left of the board) that explains the concept and offers up to three progressive hints on demand.

```
┌──────────────────────────────────┐
│  SIGNAL CANCELLATION (NOT GATE)  │
│                                  │
│  When an SE glider meets an NW   │
│  glider head-on, they annihilate │
│  completely — no residue. This   │
│  is the atomic NOT operation.    │
│                                  │
│  [ Hint 1 ]  [ Hint 2 ]  ...    │
└──────────────────────────────────┘
```

| # | Name | Teaches | Interaction |
|---|---|---|---|
| CA-1 | **Stream Rider** | Gliders as signal packets, c/4 speed | Watch — just press Play |
| CA-2 | **Signal Stop** | Eater-1 as a signal terminator | Place an Eater to protect the red danger zone |
| CA-3 | **Parallel Streams** | Independent streams don't interfere | Watch — two guns, two receptors |
| CA-4 | **Not Today** | Head-on annihilation = NOT gate | Watch — two opposing guns cancel every glider pair |

#### How the NOT gate works

```
  ⊞ SE Gun ──── glider → · · · · ✦ · · · · ← glider ──── NW Gun ⊞
                                  ↑
                            annihilate
                         (both disappear)

  Without the NW gun, the SE stream continues → danger zone.
  With the NW gun correctly aimed → all packets cancel → zone stays empty.
```

---

## 🌐 3D Manifold Modes

Switch from the mode dropdown (keys `3`–`7`) to run the same GoL engine on curved surfaces rendered in WebGL via Three.js.

Left-click paints. Right-drag rotates the view. Scroll zooms. The game uses the surface's topology to determine which cells are neighbours — wrapping and identification are exact.

### Surface Topology Reference

```
FLAT (Sandbox)          TORUS                   KLEIN BOTTLE
┌───────────┐           ┌───────────┐           ┌───────────┐
│           │           │           │⟷          │           │⟷
│  no edge  │           │  wraps    │           │  wraps    │
│  wrap     │           │  all 4    │           │  L/R norm │
│           │           │  sides    │           │  T/B flip │
└───────────┘           └───────────┘           └───────────┘
                              ↕↕                     ↕↑ flipped

MÖBIUS STRIP            CYLINDER
┌───────────┐           ┌───────────┐
│           │⟷ flipped  │           │⟷ wraps
│  L/R wrap │           │  open top │
│  with     │           │  and      │
│  Y flip   │           │  bottom   │
└───────────┘           └───────────┘
  absorbing top/bottom    absorbing top/bottom
```

| Mode | Topology | Orientable | Boundary |
|---|---|---|---|
| **Sphere** | S² | ✅ Yes | None |
| **Torus** | T² | ✅ Yes | None |
| **Klein Bottle** | K | ❌ No | None |
| **Möbius Strip** | M | ❌ No | Open edges (absorbing) |
| **Cylinder** | C | ✅ Yes | Open edges (absorbing) |

Each surface uses a parametric `surfaceFunc(s, t)` where `s, t ∈ [0, 1)` to map cell coordinates onto a 3D mesh. Click raycasting uses UV attributes on the background mesh to identify which cell you tapped.

---

## 💡 Starter Experiments

You don't need to know any GoL theory to have fun. Here are five things to try in the first five minutes:

**1. The Crossfire**
Click **Load Demo**. Two Gosper guns fire at each other. Watch gliders annihilate on contact. You've just seen a NOT gate in the wild.

**2. Tame the Stream**
Start a fresh Sandbox. Drop a **Gosper Glider Gun** (Required category). Let it fire for 30–50 gens. Then drag an **Eater-1** directly into the stream and watch it intercept every packet and survive.

**3. Rewind a Crash**
Run any setup until something chaotic happens. Hit the **⏮** button to jump back to generation 0. Scrub slowly forward with `N` to replay the crash frame by frame.

**4. GoL on a Doughnut**
Press `4` to switch to Torus mode. Draw a glider near the right edge and watch it re-enter from the left. Drop a gun near the top and watch its stream wrap around.

**5. The Die Hard Self-Destruct**
Drop a **Die Hard** methuselah (Circuit category → Seeds). Press Play and step away. At exactly generation 130, every cell vanishes. No residue. A clean timed demolition.

---

## Architecture Notes

For contributors and the curious:

- **Single-file IIFE** — all logic lives in `app.js` (~2500 lines). No bundler, no framework.
- **Two canvases** — `#lifeCanvas` (Canvas 2D, flat modes) and `#sphereCanvas` (WebGL via Three.js, 3D modes) share the same DOM slot; one is hidden at a time.
- **Shared WebGL renderer** — `getRenderer()` returns a singleton `THREE.WebGLRenderer`. Switching between 3D manifolds reuses it without creating a new context.
- **Alive cell storage** — cells are stored as `Set<string>` of `"x,y"` keys. Shared state or per-mode state depending on the checkbox.
- **Surface polymorphism** — every topology is a `SURFACES[mode]` entry with a `cellKey(x, y)` function. The core `stepLife()` loop calls `surface.cellKey()` for neighbour lookups — no mode-specific branching.
- **History buffer** — `state.histFrames` is a 600-entry circular array of `{gen, alive: Set}` snapshots. `tickForward()` snapshots after each step; `tickBackward()` restores from the buffer. Scrubbing calls `restoreFrame(idx)` which replaces the alive set in place.
- **Level system** — each level is a plain JS object with `setup()`, `evaluate(levelState)`, and `progress(levelState)`. Circuit Academy levels add a `guide: {concept, body, hints[]}` field that auto-shows the guide card.

```
app.js structure (high level)
─────────────────────────────
DOM refs
State object
Constants (SPHERE_COLS, MAX_HIST, SPEED_TIERS …)
REQUIRED_PREFABS  ──┐
CUSTOM_PREFABS    ──┤── merged into PREFABS[]
CIRCUIT_PREFABS   ──┘
LEVELS[]  (L1–L5 + CA-1–CA-4)
SURFACES{}  (flat, torus, klein, mobius, cylinder, sphere)
Core functions  (stepLife, activeAlive, setCell …)
3D renderers    (sphere, manifold, shared getRenderer)
Draw pipeline   (drawBackground → drawGrid → drawCells → drawZones → drawHover)
Time machine    (snapshotNow, restoreFrame, tickForward, tickBackward)
UI setup        (setupControls, setupTimeline, setupCanvasInput, setupShortcuts)
init()
```

---

## Development Scripts

```bash
npm run serve   # start local server on :5173
npm run check   # node --check syntax validation
npm start       # alias for serve
```

---

## Roadmap ideas

- [ ] Export / import board state as RLE or plaintext Life format
- [ ] Rule editor (try HighLife B36/S23, Seeds B2/S, Day & Night B3678/S34678)
- [ ] Pattern search / period detector
- [ ] Notebook layer — annotate discoveries, save named sessions
- [ ] WebAssembly core for large boards (10,000+ live cells without slowdown)
- [ ] More Circuit Academy levels: AND gate, OR gate, signal crossing

---

<div align="center">

Built with 🟢 vanilla JS · 🌐 Three.js · ❤️ curiosity

*"Any sufficiently complicated cellular automaton contains an ad hoc, informally-specified, bug-ridden, slow implementation of half of Conway's Game of Life."* — apologies to Greenspun

</div>
