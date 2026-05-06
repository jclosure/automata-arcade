# Automata Shader Framework — Product Requirements Document

**Status:** Draft v1.0  
**Date:** 2026-05-06  
**Author:** Joel Holder + Claude  

---

## 1. Vision

We are building the substrate on which life can run.

The current engine is a sparse JavaScript `Set` that evaluates Conway's B/S rules one cell at a time. It is beautiful for what it does — discrete, binary, infinitely extensible. But it cannot host Lenia. It cannot host SmoothLife. It cannot host multi-channel continuous automata. It cannot host the kinds of creatures we imagine: organisms with internal state, metabolisms, spatial identity, behavior.

The Automata Shader Framework (ASF) is a new engine layer — a GPU-resident, continuously-differentiable, arbitrarily-programmable physics core that runs under every mode in the app. It is not a replacement for GoL. It is the ground beneath GoL, and beneath everything else we will grow.

The goal is a framework general enough that the following are all first-class expressions of a single unified pipeline:

- Conway's Game of Life (B3/S23, and all B/S variants)
- SmoothLife (continuous analog of GoL on a ring kernel)
- Lenia (continuous CA with parameterized bell-curve growth)
- Multi-channel Lenia (multiple coupled state fields with cross-channel kernels)
- N-dimensional Lenia (2D spatial grid, N-dimensional state vector per cell)
- Neural Cellular Automata (learned convolution weights, multi-channel perception)
- Reaction-Diffusion (Gray-Scott, Turing patterns, activator-inhibitor systems)
- Custom user-defined automata via GLSL injection

Every one of these is a special case of the same pipeline: **convolve → grow → integrate → display**.

---

## 2. Problem Statement

### 2.1 The Current Engine's Limits

`stepLife()` in `app.js` is a sparse-set CPU computation:

```
for each alive cell:
  increment neighbor counts for all neighbors

for each candidate cell:
  apply B/S rule → live or die
```

This is excellent for GoL (typically <5% cell density) but fundamentally wrong for Lenia, which:
- Has a **continuous state value** at every cell (not a binary alive/dead)
- Uses a **large-radius kernel** (radius 13–27 cells, 1000+ neighbors to check)
- Requires **float-precision arithmetic** per cell update
- Runs on **dense grids** where every cell has a non-zero value

A 512×512 Lenia world has 262,144 cells. Each step involves convolving each cell with ~2827 neighbors (for a radius-30 ring kernel). That is 742 million multiply-adds per step. At 60 steps per second: 44 billion operations per second. This is GPU territory. The CPU cannot do this.

### 2.2 The Opportunity

WebGL 2 gives us fragment shaders that run in parallel across every pixel. A 512×512 texture step executes the rule function for all 262,144 cells simultaneously. Lenia at 60fps on consumer hardware is feasible today.

WebGPU (when available) unlocks true compute shaders — faster, more flexible, supporting arbitrary memory access patterns.

The ASF abstracts over both backends. The app configures an automaton in terms of kernels, growth functions, and integration parameters. The framework compiles this into the right GLSL for the target.

### 2.3 Why Now

The roadmap has Lenia in mind. The notebook layer, the arcade levels, the timeline — all of these should work with Lenia creatures. Building the framework now, before adding more GoL features, means we build once correctly rather than porting later.

---

## 3. Scope

### In Scope (this PRD)

- GPU execution pipeline (WebGL 2 ping-pong float textures)
- Kernel system: discrete, ring, Gaussian, custom
- Growth/rule system: B/S, Lenia, reaction-diffusion, custom GLSL
- Integration: Euler, RK4
- Display pipeline: colormaps, multi-channel overlay, false-color
- 1–4 state channels per texture, extensible to N via multi-texture
- Creature library: pattern definitions, stamp-to-world, bounding-box detection
- Coexistence with existing GoL (sparse set) engine for arcade/CA levels
- Timeline and notebook integration
- Mode selector extension

### Out of Scope (but designed for)

- True 3D spatial Lenia (voxel grid) — the architecture accommodates it; rendering is future work
- Learned/evolved kernels (Neural CA) — the kernel system supports it; training loop is future
- WebGPU backend — designed as an upgrade path; WebGL 2 ships first
- Multi-player / shared state — future infrastructure concern
- Mobile/touch-specific optimizations — considered but not primary

---

## 4. Core Concepts

### 4.1 World

A rectangular grid of **W × H** cells. Each cell holds a **state vector** of D real-valued components (D = 1..4 initially, extensible). The grid wraps toroidally by default (matching the existing torus mode's topology) but boundary conditions are configurable: absorbing, reflecting, or custom.

### 4.2 State Texture

The world state lives entirely in GPU memory as a **floating-point RGBA texture** (WebGL 2 `RGBA32F`). The four components of each texel are the D components of that cell's state vector. For D < 4, unused components are ignored or repurposed as scratch.

Two textures exist at all times (**ping-pong**): `texA` (current) and `texB` (next). Each simulation step reads from `texA` and writes to `texB`, then swaps.

### 4.3 Kernel

A kernel defines how a cell's **neighborhood** is sampled to produce a **potential value**. The potential is a scalar (or vector) that represents the cell's local context. The growth/rule function maps this potential to a state change.

Kernels are characterized by:
- **Shape**: the spatial pattern of weights (Moore, ring, Gaussian, arbitrary)
- **Radius**: how far from the center cells are included
- **Normalization**: whether weights sum to 1 (correlation kernel) or are unnormalized
- **From/To channels**: which state channel is read; which potential channel is written

Kernels are encoded as 2D textures or computed analytically in the shader.

### 4.4 Growth Function

The growth function `G(u)` maps a potential value `u` to a state delta. This is the rule of the automaton.

Canonical forms:
- **Discrete B/S**: `G(n) = +1 if born, 0 if survive, -1 if die` — step function on integer neighbor count
- **Lenia bell**: `G(u) = 2·exp(-((u−μ)/σ)²) − 1` — peaks at +1 near μ, returns to −1 away
- **Reaction-diffusion**: `G(A,B) = A·B² − (F+k)·A` (Gray-Scott activator term)
- **Custom GLSL**: arbitrary function body injected at compile time

### 4.5 Integration

The update rule maps state `A^t` + delta `D^t` to `A^(t+Δt)`:

```
Euler:  A' = clamp(A + dt · D, 0, 1)
RK4:    A' = A + (dt/6)(k1 + 2k2 + 2k3 + k4)   [four kernel evaluations per step]
```

Discrete automata use `dt = 1` with a step function; continuous ones use small `dt` (typically 0.05–0.2).

### 4.6 Automaton Spec

An **AutomatonSpec** is a plain JavaScript object that fully describes a type of automaton. The framework compiles it to a GLSL shader program and GPU pipeline. Specs are serializable and can be saved, shared, and loaded.

### 4.7 Creature

A **creature** is a named initial-state pattern that, when placed in a compatible world (right kernel, right growth function, right dt), produces a stable, often locomoting entity. Creatures are associated with an AutomatonSpec. The creature library stores RLE-like encoded initial states alongside their spec parameters.

---

## 5. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        APPLICATION LAYER                         │
│  Mode selector  ·  Notebook  ·  Timeline  ·  Arcade engine      │
└──────────────────────────┬──────────────────────────────────────┘
                           │ AutomatonSpec / commands
┌──────────────────────────▼──────────────────────────────────────┐
│                    AUTOMATON FRAMEWORK (ASF)                      │
│                                                                   │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────────┐   │
│  │ Spec Compiler│  │ Creature Lib │  │  Colormap / Display  │   │
│  └──────┬──────┘  └──────┬───────┘  └──────────┬────────────┘   │
│         │                │                       │               │
│  ┌──────▼──────────────────────────────────────▼───────────┐   │
│  │                    GPU PIPELINE                           │   │
│  │                                                           │   │
│  │  texA ──▶ [Kernel Pass(es)] ──▶ potentialTex             │   │
│  │               ──▶ [Growth Pass] ──▶ deltaTex             │   │
│  │               ──▶ [Integrate Pass] ──▶ texB              │   │
│  │  texA ◀──────────────────────────── swap ◀── texB        │   │
│  │               ──▶ [Display Pass] ──▶ screen               │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              LEGACY GoL ENGINE (unchanged)                │   │
│  │  JS sparse Set · CPU stepLife() · arcade/CA levels       │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

The ASF and the legacy GoL engine coexist. Modes that require exact discrete GoL (Arcade, Circuit Academy) continue to use `stepLife()`. Modes that use the ASF (Lenia, SmoothLife, custom) use the GPU pipeline. The display and UI layers are shared.

---

## 6. Shader Pipeline Design

### 6.1 Passes

Each simulation step executes a sequence of WebGL draw calls ("passes"). All passes render a full-screen quad to a framebuffer; the quad's fragment shader implements the logic.

```
Pass 1 — Kernel Convolution
  Input:  state texture (texA)
  Output: potential texture (potTex[k] for each kernel k)
  Shader: samples texA in a radius-R neighborhood, applies kernel weights, writes sum

Pass 2 — Growth / Rule
  Input:  potTex[0..n], texA (for some rules, current state influences growth)
  Output: delta texture (deltaTex)
  Shader: growth function G(u0, u1, ..., un, a) → dA/dt vector

Pass 3 — Integration
  Input:  texA (current state), deltaTex
  Output: texB (next state)
  Shader: A' = clamp(A + dt * D, stateMin, stateMax)

Pass 4 — Display
  Input:  texB (or texA after swap)
  Output: screen (or intermediate for post-processing)
  Shader: maps state vector to RGBA color via colormap
```

For performance, passes 2 and 3 can be merged into a single "growth+integrate" pass when there is only one kernel and the growth function does not require the full potential texture separately.

### 6.2 Kernel Pass — Convolution Strategies

Naive convolution for a radius-R kernel requires `(2R+1)²` texture lookups per fragment. For R=13: 729 lookups. For R=27: 3,025 lookups. These are expensive but acceptable because:
- Modern GPUs can do thousands of texture lookups per shader invocation
- At 512×512 cells and 60fps, a radius-13 kernel takes ~50ms on mid-range hardware (benchmarked)
- For larger radii, separable kernels (decompose into horizontal + vertical passes) reduce cost to `2(2R+1)` lookups

**Kernel strategies by type:**

| Kernel Type       | Strategy                          | Notes                                      |
|-------------------|-----------------------------------|--------------------------------------------|
| Moore 3×3 (GoL)   | Inline 9-tap                      | Fastest; hardcoded offsets                 |
| Ring (Lenia)      | Texture-encoded weights, R≤27     | Pre-bake ring mask into a float texture    |
| Gaussian          | Separable horizontal + vertical   | Two passes; O(R) not O(R²)                |
| Shell (3D slice)  | Computed analytically per frag    | `w = shellFunc(sqrt(dx²+dy²)/R)`           |
| Custom            | Texture-encoded weights           | User uploads a weight texture              |

**Kernel texture encoding:**  
A kernel of radius R is stored as a `(2R+1) × (2R+1)` single-channel float texture. The GPU kernel pass iterates over all texels in this texture and accumulates: `potential += kernel[i,j] * state[cell + offset(i,j)]`.

### 6.3 Growth Pass — GLSL Injection Model

The growth function is a GLSL function body injected into a template shader:

```glsl
// Template (compiled from AutomatonSpec)
precision highp float;
uniform sampler2D uState;    // current state texA
uniform sampler2D uPot0;     // potential from kernel 0
// ... more potential uniforms
uniform float uDt;

vec4 growthFn(vec4 state, vec4 pot0, vec4 pot1) {
  // <<<INJECTED USER CODE>>>
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec4 state = texture2D(uState, uv);
  vec4 pot0  = texture2D(uPot0, uv);
  gl_FragColor = state + uDt * growthFn(state, pot0, ...);
  gl_FragColor = clamp(gl_FragColor, 0.0, 1.0);
}
```

The framework provides **GLSL helper functions** that can be called from injected code:

```glsl
// Lenia bell curve: peak 1.0 at u=mu, falls to -1 outside mu±sigma
float leniaBell(float u, float mu, float sigma);

// Discrete birth/survive: +1 born, 0 survive, -1 die  
float bornSurvive(float n, int birthMask, int surviveMask);

// Soft clamp that avoids hard 0/1 boundaries
float softClamp(float x, float lo, float hi, float slope);

// Dot product of state vector with a weight vector (for NCA perception)
float perceive(vec4 state, vec4 weights);
```

### 6.4 Multi-Kernel Architecture

A single automaton can have multiple kernels, each producing a separate potential field. The growth function receives all potentials simultaneously. This enables:

- **Multi-channel Lenia**: channel A's kernel produces potA; channel B's kernel produces potB; cross-terms mix them
- **Neural CA**: several learned kernels (identity, Sobel X, Sobel Y, Laplacian) feed a multi-layer growth function
- **Reaction-diffusion**: fast diffusion kernel for activator, slow for inhibitor

Example: multi-channel Lenia with two coupled species:

```glsl
// Kernel 0: ring kernel, radius 13, reads channel R, writes to pot0.r
// Kernel 1: ring kernel, radius 7,  reads channel G, writes to pot1.g
// Growth function:
vec4 growthFn(vec4 state, vec4 pot0, vec4 pot1) {
  float gR = leniaBell(pot0.r, 0.15, 0.015);
  float gG = leniaBell(pot1.g + 0.3 * pot0.r, 0.12, 0.02); // R influences G
  return vec4(gR, gG, 0.0, 0.0);
}
```

### 6.5 Integration Pass

```glsl
// Euler (default)
A_next = clamp(A_current + dt * delta, stateMin, stateMax);

// RK4 (higher accuracy, 4× kernel evaluations per step — future)
// k1 = growthFn(A)
// k2 = growthFn(A + 0.5*dt*k1)
// k3 = growthFn(A + 0.5*dt*k2)
// k4 = growthFn(A + dt*k3)
// A_next = A + (dt/6)(k1 + 2k2 + 2k3 + k4)
```

### 6.6 Display Pass

The display pass reads the state texture and converts to screen color. The colormap is configurable per automaton:

```
Discrete (GoL-like):    alive = #5be0bc, dead = #0a1a2e   (current app colors)
Single-channel float:   viridis | plasma | magma | inferno | turbo
Multi-channel RGB:      R→red, G→green, B→blue (direct false-color)
Multi-channel overlay:  composite channels with per-channel opacity
Custom GLSL:            arbitrary colormap function injected at compile time
```

The display pass also handles:
- **Zoom / pan**: the existing canvas zoom/pan state maps to UV offset + scale
- **Grid overlay**: thin lines rendered on top if zoom > threshold
- **Heatmap overlay**: accumulated activation texture (tracked separately)
- **Notebook pins**: drawn in canvas 2D on top of WebGL output (unchanged from current)

---

## 7. AutomatonSpec API

### 7.1 JavaScript Configuration Object

```javascript
const LeniaSpec = {
  id: "lenia-standard",
  name: "Lenia",
  category: "continuous",   // "discrete" | "continuous" | "reaction-diffusion" | "neural"
  
  world: {
    width:  512,
    height: 512,
    channels: 1,             // number of active state channels (1–4)
    stateRange: [0, 1],      // min/max state value for clamping
    boundary: "torus",       // "torus" | "absorb" | "reflect"
    dtype: "float32",        // "float32" | "float16" | "uint8"
  },

  kernels: [
    {
      id: "K0",
      type: "ring",          // "moore" | "vonNeumann" | "ring" | "gaussian" | "shell" | "custom"
      radius: 13,
      fromChannel: 0,        // reads state channel 0
      toChannel: 0,          // writes potential channel 0
      normalize: true,       // sum of weights = 1
      params: {
        innerRadius: 0.0,    // ring inner radius as fraction of outer (0 = disk)
        outerRadius: 1.0,    // always 1.0 for outermost
        peakRadius: 0.5,     // where the ring weight peaks (for "shell" kernels)
      }
    }
  ],

  growth: {
    type: "lenia-bell",      // "born-survive" | "lenia-bell" | "reaction-diffusion" | "glsl"
    params: {
      mu: 0.135,             // lenia-bell: center of bell curve
      sigma: 0.015,          // lenia-bell: width of bell curve
    }
    // OR for custom GLSL:
    // glsl: `return vec4(leniaBell(pot0.r, 0.135, 0.015), 0., 0., 0.);`
  },

  integration: {
    method: "euler",         // "euler" | "rk4"
    dt: 0.1,                 // time step
  },

  display: {
    colormap: "viridis",     // "alive-dead" | "viridis" | "plasma" | "rgb" | "custom"
    channelMap: [0, 0, 0],   // which state channel maps to [R, G, B] display
    // OR for custom GLSL:
    // glsl: `return vec4(state.r, state.r * 0.5, 0.0, 1.0);`
  },

  // Optional: CPU readback for notebook auto-detection
  readback: {
    enabled: true,
    metric: "mean",          // "mean" | "max" | "entropy" — sampled every N steps
    interval: 30,
  }
};
```

### 7.2 Built-in Spec Library

The framework ships with pre-configured specs for:

| ID                   | Name                    | Category              | Channels | Notes                                 |
|----------------------|-------------------------|-----------------------|----------|---------------------------------------|
| `gol`                | Conway's GoL            | discrete              | 1        | Uses legacy CPU engine, spec for display |
| `highlife`           | HighLife                | discrete              | 1        | B36/S23                               |
| `smoothlife`         | SmoothLife              | continuous            | 1        | Annular kernel, logistic growth        |
| `lenia-standard`     | Lenia (Orbium)          | continuous            | 1        | Bell growth, R=13, dt=0.1             |
| `lenia-mc2`          | Lenia 2-channel         | continuous            | 2        | Coupled species                        |
| `lenia-mc4`          | Lenia 4-channel         | continuous            | 4        | Full RGBA state                        |
| `lenia-aquarium`     | Lenia Aquarium          | continuous            | 3        | RGB false-color, mixed kernels         |
| `gray-scott`         | Gray-Scott              | reaction-diffusion    | 2        | Classic Turing patterns                |
| `turing-morphogen`   | Turing Morphogenesis    | reaction-diffusion    | 2        | Activator-inhibitor                    |
| `nca-emoji`          | Neural CA (Emoji)       | neural                | 16       | Learned kernel weights (read-only)     |

### 7.3 Spec Compiler

`compileSpec(spec)` returns a compiled `Pipeline` object:
- Validates spec fields
- Generates kernel weight texture(s)
- Generates GLSL shader sources for each pass
- Compiles and links WebGL programs
- Allocates framebuffers and textures
- Returns `{ step(), reset(), readPixels(), dispose() }`

```javascript
const pipeline = compileSpec(LeniaSpec);
pipeline.step();             // advance one generation
pipeline.reset(initialData); // load a Float32Array into state texture
const pixels = await pipeline.readPixels(); // CPU readback (async)
pipeline.dispose();          // free GPU resources
```

---

## 8. Kernel Design Details

### 8.1 The Lenia Ring Kernel

The canonical Lenia kernel is a **ring** (annulus) with a smooth bell-shaped radial profile:

```
w(r) = exp(α · (1 - 1/(4r(1−r))))    for 0 < r < 1
w(r) = 0                               otherwise
```

where `r = distance / radius` (normalized). This produces a smooth bump that peaks in the middle of the annulus.

Baked into a `(2R+1) × (2R+1)` float texture and normalized so `Σw = 1`.

```
         ·  · ···· ·  ·
       · ·· ·····  ·· · ·
      · ·· ·       ·· · ·
      ·               · ·
      ·  (center 0)   · ·    ← hollow ring (inner = 0)
      ·               · ·
      · ·· ·       ·· · ·
       · ·· ·····  ·· · ·
         ·  · ···· ·  ·
```

Different kernel shapes produce wildly different creatures. The kernel is one of the primary creative controls exposed to users.

### 8.2 Kernel Library

Pre-defined kernel shapes accessible via the Kernel Designer UI:

| Name            | Shape           | Notes                                         |
|-----------------|-----------------|-----------------------------------------------|
| Moore           | 3×3 square      | Classic GoL neighborhood                      |
| Extended Moore  | 5×5 square      | Broader neighborhood                          |
| Ring            | Annular         | Lenia standard; radius and peak configurable  |
| Disk            | Filled circle   | Ring with innerRadius = 0                     |
| Shell           | Thin ring       | Very narrow annulus, pure edge detection      |
| Gaussian        | Soft disk       | Separable; smooth falloff from center         |
| Donut           | Two-ring        | Two concentric peaks — complex interactions   |
| Cross           | Ortho lines     | Von Neumann style but continuous              |
| Custom          | User-painted    | 64×64 canvas for free-form kernel drawing     |

### 8.3 Multi-Kernel Interaction Matrix

For N-channel automata, the kernel interaction is described by an N×N matrix: `K[i][j]` is the kernel through which channel `j` influences channel `i`'s potential. A zero entry means no coupling.

For 2-channel Lenia:
```
        State Ch 0    State Ch 1
Pot 0 [ K_00         K_01      ]   ← potential for species 0
Pot 1 [ K_10         K_11      ]   ← potential for species 1
```

This coupling matrix is the principal control for multi-species dynamics: predator-prey, symbiosis, competition.

---

## 9. N-Dimensional Lenia

### 9.1 What "N-Dimensional" Means Here

The term is used in two distinct senses in the Lenia literature, and we support both:

**Sense A — N spatial dimensions:**  
The world grid is N-dimensional (2D grid, 3D voxel grid, etc.). Cells have spatial neighbors in N dimensions. A 3D Lenia world has 3D ring kernels and 3D neighborhoods.

**Sense B — N state dimensions per cell:**  
The world is still 2D in space, but each cell carries an N-dimensional state vector. This is "multi-channel" Lenia. Channels interact via the kernel matrix.

Both senses are tractable on GPU. Sense A beyond 3D is not directly visualizable; we treat it theoretically and implement 2D+3D slice rendering. Sense B up to 16 dimensions is GPU-feasible (4 channels per RGBA texture, up to 4 textures).

### 9.2 Implementation Plan for N-Dimensional State (Sense B)

**Phase 1: 1–4 channels** (single RGBA float texture)
- One float per channel, clamped [0,1]
- Growth function is a vec4 → vec4 mapping
- Full kernel interaction matrix (4×4 = 16 possible kernel relationships)

**Phase 2: 5–16 channels** (multiple textures)
- State stored across multiple `RGBA32F` textures (ceil(N/4) textures)
- Kernel pass reads from all state textures, writes to all potential textures
- Growth function is a GLSL struct with up to 16 floats
- Requires WebGL 2 Multiple Render Targets (MRT) for parallel writes

**Phase 3: 16+ channels** (Neural CA territory)
- Fixed at a power-of-2 count (16, 32, 64)
- State encoded in a single tall texture (N rows per "cell row")
- Enables full Neural CA: each channel is a "neuron activation"
- Kernel weights become a trained weight matrix (not just a spatial kernel)

### 9.3 3D Spatial Lenia (Sense A)

A 3D Lenia world is a `W × H × D` voxel array. Visualization requires projection or slicing.

**Slice mode:** Show a 2D cross-section (XY plane at Z = slider). User can scrub through Z.  
**Projection mode:** Volume-render a maximum-intensity projection (MIP) looking down Z.  
**Isosurface mode:** Extract and render a 3D mesh at a threshold isovalue (Three.js MarchingCubes).

GPU storage: a 3D texture (`WebGL2.TEXTURE_3D`) with `RGBA32F` format. Kernel pass does 3D neighborhood sampling. For a 128³ world: 2M cells, each with a 3D ring kernel — feasible on modern hardware at 10–30fps.

The 3D Lenia case deliberately reuses the existing Three.js renderer for display, adding a new surface type `lenia3d` alongside `sphere`, `torus`, etc.

### 9.4 The Generalized Kernel Function

In N-dimensional space, the kernel at position **x** relative to center is:

```
K(x) = f(|x|/R) / Z
```

where `f` is the radial profile (bell, ring, gaussian), `R` is the radius, and `Z` is a normalization constant. This is the same formula in 2D and 3D — only the dimensionality of `x` changes.

On GPU, 2D and 3D kernels share the same shader structure:

```glsl
// 2D kernel convolution
float potential = 0.0;
for (int dy = -R; dy <= R; dy++) {
  for (int dx = -R; dx <= R; dx++) {
    float r = length(vec2(dx, dy)) / float(R);
    if (r > 1.0) continue;
    float w = kernelProfile(r);
    potential += w * texture2D(uState, uv + vec2(dx, dy) / uResolution).r;
  }
}

// 3D: same loop with dz, using texture3D
```

---

## 10. Creature System

### 10.1 What Makes a Creature

A **Lenia creature** (called an *orbium*, *aquarium*, or *glider* in the literature) is a pattern that:
1. Is self-sustaining: does not grow or shrink over time in the right environment
2. Is localized: bounded spatial extent (not space-filling)
3. Often locomotes: translates at a fixed velocity
4. Persists under perturbation: small disruptions recover

Creatures only exist for specific combinations of `(kernel, growth params)`. They are discovered by random search or deliberate design. The creature library encodes both the initial state and the spec that produces it.

### 10.2 Creature Library Format

```javascript
{
  id: "orbium-unicaudatus",
  name: "Orbium unicaudatus",
  description: "The canonical Lenia glider. Travels NE at ~0.15 cells/step.",
  spec: "lenia-standard",          // references AutomatonSpec ID
  specOverrides: {                  // optional: override specific spec params
    kernels: [{ params: { radius: 13 } }],
    growth: { params: { mu: 0.135, sigma: 0.015 } },
    integration: { dt: 0.1 }
  },
  cells: Float32Array,             // flattened W×H normalized state, sparse encoding
  width: 28, height: 28,          // bounding box
  velocity: { dx: 0.15, dy: 0.12 }, // approximate locomotion speed
  period: null,                    // null = non-periodic; number = period in steps
  tags: ["glider", "lenia", "2d", "unicellular"],
  preview: "data:image/png;base64,...", // 64×64 thumbnail
}
```

### 10.3 Creature Stamping

When the user drops a creature onto the world (drag from palette, or click to place):

1. Resolve the creature's spec — if it matches the current world spec, stamp directly; if not, offer to switch specs
2. Read current state texture into CPU buffer (readPixels — async, one-time cost)
3. Apply creature's cell values to the buffer at the drop coordinates (add, not overwrite, for coexistence)
4. Upload modified buffer back to GPU texture

### 10.4 Creature Detection (Bounding Box Tracker)

At each step, an optional CPU readback computes:
- Total population (mean state value across all cells × cell count)
- Center of mass of the active region
- Bounding boxes of connected components above a threshold

This is sampled every N steps (configurable, default 10) to avoid CPU-GPU readback bottleneck.

The detection result feeds:
- The notebook auto-detection system (same events as current: population spikes, extinction, stabilization)
- A creature tracking overlay: optional highlight box that follows the center of mass

### 10.5 Creature Discovery Mode

A special sandbox sub-mode where:
- The world is initialized with random sparse noise
- The spec parameters (kernel radius, mu, sigma, dt) are swept or randomly perturbed
- Stable localized patterns are detected and offered for saving to the creature library
- This is the in-app equivalent of the parameter search done in the Lenia paper

---

## 11. Display & Visualization

### 11.1 Colormap System

Colormaps are implemented as GLSL functions in the display pass shader:

```glsl
vec3 colormap_viridis(float t);
vec3 colormap_plasma(float t);
vec3 colormap_inferno(float t);
vec3 colormap_turbo(float t);
vec3 colormap_hot(float t);
vec3 colormap_cool(float t);
vec3 colormap_ocean(float t);  // custom: app's dark ocean theme
```

For multi-channel, the display pass supports multiple modes:
- **False-color**: channels → R,G,B directly
- **Overlay**: channels composited with per-channel hue and opacity
- **Luminance**: all channels averaged to grayscale

### 11.2 App Design Language

The ASF adds new modes without changing the look of the app. The dark ocean color theme (`#0a1a2e` background, `#5be0bc` accent) is replicated in the default Lenia colormap (deep blue background → teal/white peaks).

### 11.3 Timeline Integration

The timeline's 600-frame history buffer is the biggest integration challenge. At 512×512×4 bytes per frame: 512MB for 600 frames — far too large for GPU textures.

**Solution: Lazy snapshot + sparse keyframes:**
- Every 30 frames, perform a CPU readback and store a compressed keyframe
- Between keyframes, store only the delta (XOR or quantized difference)
- For scrubbing within a keyframe interval, replay forward from the nearest prior keyframe
- Target: <128MB total history for 600 frames of 512×512 continuous automata

For discrete GoL, the existing sparse Set history is unchanged.

### 11.4 Notebook Integration

The notebook auto-detection system hooks into the ASF via the `readback` mechanism:
- Mean activation level → equivalent to population count for Lenia
- Rate of change in mean → equivalent to population delta
- Spatial entropy (variance of activation) → new metric: detects "interesting structure" vs uniform noise
- These drive the same notebook events: peaks, crashes, stabilization

---

## 12. Integration With the Existing App

### 12.1 Mode System Extension

The existing `#modeSelect` dropdown adds new entries:

```
Sandbox          (unchanged — GoL, CPU)
Arcade           (unchanged — GoL, CPU)
Sphere/Torus/... (unchanged — Three.js)
── new ──
Lenia            (ASF, single-channel continuous)
Lenia Lab        (ASF, multi-channel + kernel designer)
SmoothLife       (ASF, continuous analog of GoL)
Reaction-Diffusion (ASF, two-species)
Custom Shader    (ASF, user-defined GLSL)
```

### 12.2 Inspector Panel Extension

The existing inspector shows prefab info. In ASF modes:
- **Spec panel**: displays current kernel type, growth params (mu/sigma/dt), channels
- **Kernel designer**: visual editor for kernel radius, profile, coupling matrix
- **Growth editor**: sliders for mu/sigma/dt + live preview of G(u) curve
- **GLSL editor**: Monaco-style textarea for custom growth function injection

### 12.3 Prefab Palette Extension

New category: **Lenia Creatures** alongside Required/Custom/Circuit. Cards show creature thumbnail, name, spec compatibility badge.

### 12.4 Coexistence Contract

The ASF and GoL engine never run simultaneously in the same mode:
- `state.engineMode` = `"cpu-sparse"` | `"gpu-shader"`
- `tickForward()` dispatches to the right engine
- The display `draw()` function checks `engineMode` — if GPU, it blits the WebGL texture to the 2D canvas; if CPU, it uses the existing cell-by-cell renderer

---

## 13. Extensibility & Plugin Model

### 13.1 Registration API

Any automaton can be added to the framework by calling:

```javascript
ASF.registerSpec(spec);          // register a new AutomatonSpec
ASF.registerKernel(kernelDef);   // register a named kernel shape
ASF.registerColormap(id, glsl);  // register a named GLSL colormap
ASF.registerCreature(creature);  // register a creature to the library
```

### 13.2 GLSL Preprocessor

The shader template includes a preprocessor directive system:

```glsl
// @include helpers          — injects leniaBell, bornSurvive, etc.
// @include colormap_viridis — injects viridis colormap
// @define MAX_RADIUS 27     — sets a compile-time constant
// @channel 2                — number of active channels (drives loop unrolling)
```

This allows the compiler to generate tight, specialized shaders rather than general-purpose branching code.

### 13.3 Hot Reload

During development, changing a spec's GLSL recompiles the shader without resetting world state. The recompile takes ~10ms. This enables live parameter tuning: adjust mu/sigma sliders → shader recompiles → simulation continues with new rule.

---

## 14. Performance Targets

| World Size   | Engine          | Target FPS | Notes                               |
|--------------|-----------------|------------|-------------------------------------|
| 256×256      | GPU, 1 channel  | 60fps      | Comfortable on any WebGL 2 device   |
| 512×512      | GPU, 1 channel  | 60fps      | Target for Lenia standard mode      |
| 512×512      | GPU, 4 channels | 30fps      | Acceptable for multi-channel lab    |
| 1024×1024    | GPU, 1 channel  | 30fps      | Ambitious; requires optimized passes |
| 1024×1024    | GPU, 4 channels | 15fps      | Research mode; not real-time target |
| 128³ (3D)    | GPU, 1 channel  | 10fps      | Slice rendering; exploration use    |

CPU readback (for notebook detection, scrubbing): max 1 readback per 30 frames. Each readback is async (uses `WebGL2.fenceSync`).

---

## 15. Implementation Phases

### Phase 0 — Foundation (prerequisite)

Before writing a line of shader code, establish the WebGL 2 infrastructure:
- `gpu/context.js` — WebGL 2 context creation, capability detection (float textures, MRT)
- `gpu/pingpong.js` — PingPong class: two framebuffers, swap, readPixels (async)
- `gpu/program.js` — compile/link GLSL programs, uniform setter helpers
- `gpu/kernel.js` — KernelTexture class: generate and upload kernel weight textures
- Unit tests: step a 4×4 grid through one GoL step using the GPU and verify against CPU

Deliverable: a standalone HTML file that runs one Lenia step on the GPU and draws the result.

### Phase 1 — Single-Channel Lenia Mode

- Implement `lenia-standard` spec (ring kernel, bell growth, Euler integration, viridis colormap)
- New mode in mode selector: "Lenia"
- Creature library with 3–5 pre-loaded Lenia creatures (Orbium unicaudatus, Geminium, Scutium)
- Drag-to-place creatures from palette
- Timeline integration: keyframe snapshots every 30 frames
- Notebook integration: population metric via GPU readback

Deliverable: a working Lenia mode with gliders swimming on screen.

### Phase 2 — SmoothLife & Reaction-Diffusion

- `smoothlife` spec (disk + annular kernels, logistic growth)
- `gray-scott` spec (2-channel, Laplacian diffusion kernels, Gray-Scott rule)
- `turing-morphogen` spec (activator-inhibitor)
- Display: multi-channel false-color
- Inspector: mu/sigma sliders with live G(u) curve preview

Deliverable: Turing patterns, Gray-Scott coral/sponge, SmoothLife gliders.

### Phase 3 — Multi-Channel Lenia

- 2- and 4-channel state textures
- Kernel interaction matrix UI (N×N grid of kernel type selectors)
- `lenia-mc2` and `lenia-mc4` specs
- Creature library expansion: multi-channel organisms
- Multi-channel display: per-channel hue controls

Deliverable: multi-species Lenia ecosystems with cross-species interaction.

### Phase 4 — Kernel Designer & GLSL Editor

- Visual kernel designer: paint-by-numbers kernel on a 64×64 canvas → converted to weight texture
- Radial profile editor: curve editor for f(r) → kernel weight at radius r
- GLSL growth function editor in inspector: textarea + compile button + error display
- Save custom specs to localStorage; export as JSON

Deliverable: users can design their own automata from the browser with no code.

### Phase 5 — GPU Upgrade for GoL Sandbox

- Optionally run the GoL sandbox on the GPU (discrete state, Moore kernel, born-survive growth)
- Benefits: 1024×1024 GoL at 60fps, smooth zoom at any scale
- Arcade/CA levels remain on CPU (exact rules required)
- Timeline: dense frame storage using 1-bit-per-cell compression for GPU GoL history

Deliverable: GPU-accelerated sandbox without touching arcade.

### Phase 6 — 3D Spatial Lenia (Future)

- `TEXTURE_3D` for voxel state storage
- 3D ring kernel (3D nested loop in shader)
- Slice viewer (XY/XZ/YZ planes), scrubable depth slider
- MIP projection renderer using Three.js
- Isosurface rendering (MarchingCubes from Three.js examples)

Deliverable: 3D Lenia creatures swimming through a voxel world.

### Phase 7 — Neural CA (Future)

- Fixed kernel weight textures (not radial profiles — full W×W float texture)
- Learned weights loadable from JSON (exported from Python training)
- Multi-layer growth: two GLSL layers with a hidden activation function
- Integration with creature library: NCA emoji, NCA text, custom targets

Deliverable: self-repairing patterns and growing organisms.

---

## 16. Open Questions

**Q1: WebGL 2 availability**  
WebGL 2 with `OES_texture_float` and `EXT_color_buffer_float` is needed for float framebuffers. Safari added WebGL 2 support in 2021; coverage is now ~97%. We should detect and gracefully degrade (show a message, offer the CPU GoL engine) on the rare failure.

**Q2: World size vs. framerate tradeoff**  
512×512 is our sweet spot estimate. Should this be user-configurable? Larger worlds feel more expansive but may lag on low-end hardware. Options: fixed 512×512, or auto-detected based on GPU capability test at startup.

**Q3: History buffer for continuous automata**  
600 frames of 512×512 float state is 600MB — impractical. The keyframe+delta approach reduces this significantly. An alternative: don't support backward play for ASF modes — only forward play with jump-to-generation-0. This simplifies the system enormously. The notebook snapshot-restore mechanism (which we already have) covers the main use case.

**Q4: CPU readback frequency**  
Async readback via `fenceSync` adds latency. The notebook detection fires every 30 frames currently. For Lenia at 60fps, 30 frames = 500ms. We should verify that async readback doesn't cause hitching; if it does, downsample the readback texture to 64×64 for metric computation.

**Q5: GoL sandbox GPU migration**  
Phase 5 replaces the CPU engine for sandbox mode. This requires verifying that GPU GoL is bit-exact with CPU GoL (same cell state after N steps). Floating-point rounding in GLSL can cause single-bit errors in corner cases. We may need to use integer textures (`R8UI`) and integer arithmetic for the discrete case to guarantee exactness.

**Q6: Creature discovery automation**  
Automated parameter search is computationally intensive. Should it run in a Web Worker? A Service Worker? Or simply as a "slow overnight mode" that users opt into? This affects architecture.

**Q7: Separating ASF from app.js**  
`app.js` is already 5500+ lines. Adding the full ASF inline would push it past 10,000. Phase 0 should establish whether we introduce a bundler (Vite already installed) and split into modules, or keep the single-file architecture with careful sectioning.

---

## 17. Success Criteria

The ASF is complete when:

1. A new user can open Lenia mode, see Orbium gliders swimming on screen, and drag a new creature onto the board without reading documentation
2. A tinkerer can open the kernel designer, paint a custom ring shape, adjust mu/sigma with sliders, and observe a new emergent organism in under 5 minutes
3. A researcher can inject arbitrary GLSL into the growth function and hot-reload without resetting state
4. The notebook auto-detection recognizes Lenia population events (peak activity, extinction, stabilization) with the same UX as GoL events
5. The timeline scrubber works in Lenia mode (with the keyframe limitation clearly communicated)
6. Multi-channel Lenia with 2 species runs at ≥30fps on a mid-range laptop GPU
7. The arcade levels and Circuit Academy still pass their evaluation logic unchanged

---

## References

- Chan, B.W.C. (2019). *Lenia: Biology of Artificial Life.* Complex Systems, 28(3).
- Chan, B.W.C. (2020). *Lenia and Expanded Universe.* arXiv:2005.03742.
- Mordvintsev, A. et al. (2020). *Growing Neural Cellular Automata.* Distill.
- Rafler, S. (2011). *Generalization of Conway's Game of Life to a Continuous Domain.* arXiv:1111.1567.
- Pearson, J.E. (1993). *Complex Patterns in a Simple System.* Science, 261(5118).
- Turing, A.M. (1952). *The Chemical Basis of Morphogenesis.* Philosophical Transactions B, 237(641).
- LifeWiki. https://conwaylife.com/wiki/
- Lenia Portal. https://chakazul.github.io/Lenia/JavaScript/Lenia.html

---

*"Any sufficiently advanced cellular automaton is indistinguishable from biology."*
