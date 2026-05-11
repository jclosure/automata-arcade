# Manifold Regions — Product Requirements Document

**Project:** Automata Arcade  
**Feature Area:** Topology Engine / Manifold Regions  
**Status:** Decisions locked — ready for Phase 1 implementation  
**Author:** Joel Holder + Claude  

---

## 1. Vision

Cellular automata, as traditionally implemented, are prisoners of the flat plane. The rules govern what happens at each cell, but the geometry — which cells are neighbors of which — is assumed to be Euclidean and infinite. This is a profound constraint that most people never question.

**Manifold Regions lift that constraint.**

A Manifold Region is a patch of the flat board where the topology is declared to be something other than flat. Cells inside it compute neighbors according to the geometry of a chosen surface — torus, sphere, Klein bottle, Möbius strip, real projective plane, cylinder. The simulation still runs normally. The cells still follow the same rules. But the *fabric of the neighborhood* is curved.

This is not decoration. When a glider enters a torus region it wraps. When it enters a sphere region, it gets compressed near the poles. When it crosses the edge of a Klein bottle region, it comes back mirror-reflected. These are not visual tricks — they are genuine topological effects playing out in the dynamics of the automaton.

The deeper purpose is to make topology and curvature *tangible* — things you can run your cursor over, paint into, feel in the behavior of the simulation. The Christoffel visualization mode makes curvature a first-class observable: every cell in a manifold region has a local curvature signature, and you can see it, measure it, and interact with patterns that live in it.

This is a power tool for people who want to use cellular automata to reason about the deep interplay between geometry, topology, and emergence.

**The frame can be escaped. This is how.**

---

## 2. Goals

1. **Topologically correct simulation** — cells in a manifold region use neighbor coordinates computed from the surface geometry, not the flat grid. The simulation physics change.

2. **Multiple simultaneous regions** — any number of manifold regions can coexist on the same board, each with its own shape, boundary protocol, and kernel settings.

3. **Configurable boundary behavior** — the interface between a manifold region and flat space is a first-class design choice, not an implementation detail.

4. **Configurable overlap behavior** — when regions overlap, the protocol for resolving that overlap is explicit and controllable.

5. **Kernel inheritance** — manifold regions run with the same neighborhood kernel as flat space by default, with the option to override per-region.

6. **Christoffel / curvature visualization** — a dedicated vis mode that colors cells by local curvature magnitude and allows per-cell inspection of the full Christoffel tensor.

7. **3D viewport** — each manifold region can optionally spawn a floating, interactive Three.js viewport that renders the region mapped onto its surface shape. Painting in the 3D view writes back to the flat board.

8. **Persistence** — manifold regions are saved and restored with the rest of the board configuration.

---

## 3. Core Concepts

### 3.1 Manifold Region

A rectangular patch of the flat board `{x, y, w, h}` (in board/cell coordinates) associated with a surface shape. At creation time, a neighbor lookup table is precomputed for every cell inside the region: given a cell's position and a neighbor offset `(dx, dy)`, what is the actual board coordinate of that neighbor?

This precomputation is deterministic, shape-specific, and happens once per region creation or resize. It is stored as:

```
neighborMap: Map<cellKey, cellKey[]>
```

Where `cellKey` is the canonical encoding of a board coordinate, and the array contains the actual neighbor keys in kernel order (same order as the flat kernel offsets).

### 3.2 Surface Shapes

| Shape | Symbol | Topology | Orientable | Notes |
|---|---|---|---|---|
| **Torus** | ⬭ | Compact, genus-1 | Yes | Simplest wrap; classic in CAs |
| **Cylinder** | ⌭ | Open in one axis | Yes | Wraps x, open y-boundary |
| **Sphere** | ● | Compact, genus-0 | Yes | Pole compression — interesting emergent effects |
| **Möbius Strip** | ∞ | Non-compact | **No** | x-wrap with y-reflection; half-twist |
| **Klein Bottle** | ⧖ | Compact | **No** | x and y wrap with x-reflection; no 3D embedding without self-intersection |
| **RP²** | ℙ | Compact | **No** | Both axes wrap with reflection; most exotic |

All shapes are parameterized by the bounding rect's dimensions (W×H cells).

### 3.3 Boundary Behavior

The boundary of a manifold region is where it meets flat space. When a cell *inside* the region computes a neighbor that falls *outside* it, the boundary protocol determines what happens.

**Protocol A — Closed (Topological Bubble)**  
The neighbor is remapped back inside the region using the manifold topology as if the flat border does not exist. The region is self-contained. No information crosses the boundary. Topologically, the region *is* the surface — it has no edge.

**Protocol B — Open (Membrane)**  
The neighbor is read from whatever is actually at that flat board coordinate — including flat cells, or cells in another manifold region. The boundary is a semi-permeable membrane. Curvature leaks at the seam. Gliders can cross in and out. The topology gradient at the boundary produces emergent interface physics.

Both protocols are valid and produce interesting dynamics. The toggle is per-region.

> **Edge case:** A cell on the flat board just *outside* a region whose neighbor falls *inside* the region always reads from the flat board coordinate — the manifold topology only applies to cells that are inside the region. This is asymmetric by design.

### 3.4 Overlap Protocol

When two manifold regions overlap, every cell in the overlap zone belongs to both regions and is subject to both topologies.

**Protocol A — Last Wins**  
The region with the higher ID (most recently created) determines the neighbor topology for cells in the overlap. Clean and predictable.

**Protocol B — Compose**  
Neighbors are resolved by applying both topologies in sequence. Concretely: the neighbor offset is resolved through Region 1's mapping, then the resulting coordinate is checked against Region 2's mapping, and if it falls inside Region 2, it is further remapped by Region 2. This creates *composed* topology — a cell in the overlap navigates two layers of curvature. Mathematically this is a fiber-bundle-like structure. Practically it produces exotic and often surprising dynamics.

Both protocols are global settings (not per-region), since composed topology requires global awareness anyway.

### 3.5 Kernel Inheritance

The flat board's active kernel (Moore, Von Neumann, custom radius, Lenia kernel) defines which `(dx, dy)` offsets are considered neighbors and with what weights. Manifold regions precompute their `neighborMap` using the current flat kernel offsets — by default, they inherit exactly whatever is driving flat space.

**Per-region kernel override** allows a specific manifold region to use a different kernel. This is particularly meaningful on curved surfaces:
- A sphere region with kernel radius 2 near the poles will have dramatically compressed, overlapping neighborhoods
- A torus region with a hex-grid kernel (manually specified offsets) maps correctly onto the torus surface

Kernel override is stored per ManifoldRegion. When the flat kernel changes, any region *without* a kernel override recomputes its neighborMap automatically.

### 3.6 Christoffel Tensor

For each cell `(lx, ly)` in a manifold region, the Christoffel symbols `Γ^k_ij` describe how the local coordinate frame rotates as you move across the surface. They are computed from the metric tensor `g_ij` of the surface embedding:

```
Γ^k_ij = ½ g^kl (∂_i g_jl + ∂_j g_il − ∂_l g_ij)
```

In practice, the metric is evaluated analytically at the continuous coordinate `(lx/W, ly/H) → (u,v) ∈ [0,1]²` using the known formula for each shape. Christoffel symbols are then computed analytically or by finite-difference of the metric. The result is 6 independent components (for 2D surfaces embedded in 3D): `Γ^u_uu, Γ^u_uv, Γ^u_vv, Γ^v_uu, Γ^v_uv, Γ^v_vv`.

These are stored per-cell in `christoffelMap: Map<cellKey, Float32Array(6)>`.

**Key values by shape:**

| Shape | Key Christoffel behavior |
|---|---|
| Torus | `Γ^θ_φφ = −(R+r cosθ)sinθ/r` — grows at outer equator, shrinks at inner |
| Sphere | `Γ^φ_θφ = cot θ` — diverges at poles; patterns are crushed inward |
| Cylinder | Flat — all Γ = 0 (cylinder is intrinsically flat) |
| Möbius | Defined only for orientable patches; sign-flips at the seam |
| Klein | Path-dependent; computed along canonical geodesics |
| RP² | Symmetric under antipodal reflection; double-covers sphere |

---

## 4. Feature Requirements

### 4.1 Manifold Tool (Palette)

- New tool button in the floating palette (after the existing 5 tools)
- Icon: a folding/topology glyph (e.g. ⬡ or a custom SVG fold icon)
- While active: user drags to define a rectangular region on the flat board
- On mouseup: a **Shape Picker** appears at the cursor with 6 shape options
- Selecting a shape creates the ManifoldRegion and returns to Paint mode
- Keyboard shortcut: `T` (topology)

### 4.2 Manifold Region Visual Indicator

On the flat board, active manifold regions are shown by:
- A dashed teal border around the rect (`border: 2px dashed var(--accent-2)`)
- A subtle fill tint (very low opacity teal)
- A small label in the top-left corner showing the shape symbol and region ID
- When selected: border becomes solid, corners show resize handles

In curvature vis mode: the tint is replaced by the Christoffel magnitude heatmap.

### 4.3 Region Inspector

When a manifold region is selected (click its border or label):
- Inspector sidebar shows a dedicated "Manifold Region" section
- Fields: Shape selector, Boundary protocol toggle (A/B), Kernel override (inherit / specify), dimensions, ID
- Delete button
- "Open 3D Viewport" button
- Christoffel stats: min/max/mean `|Γ|` across the region

### 4.4 Region Management Panel

A new sub-tab or section in the Inspector listing all active manifold regions:
- ID, shape symbol, rect dimensions, boundary protocol indicator
- Click to select/highlight
- Drag to reorder (affects overlap resolution when using Last Wins protocol)
- Bulk delete

### 4.5 Global Settings

In the Settings panel, a new "Manifold Engine" section:

| Setting | Type | Default | Description |
|---|---|---|---|
| Overlap Protocol | Toggle A/B | A (Last Wins) | How overlapping regions resolve neighbor conflicts |
| Kernel Inheritance | Checkbox | On | Regions recompute neighborMap when flat kernel changes |
| Show Region Overlays | Checkbox | On | Draw dashed borders and labels on the flat board |
| Christoffel Precision | Select (float32/float64) | float32 | Trade speed for precision in curvature computation |

### 4.6 Christoffel / Curvature Visualization Mode

A new vis mode accessible from the Inspector or a hotkey (`K` for curvature):

- Overlays a color map on the flat board
- Cells outside manifold regions: neutral gray or invisible
- Cells inside manifold regions: colored by a selected Christoffel component or magnitude
- Color maps: magnitude `|Γ|` (cool→warm), or individual components (red=Γ^u_uu, green=Γ^u_vv, blue=Γ^v_vv, etc.)
- Hover over any cell in a manifold region:
  - Small overlay panel shows the full 6-component Christoffel tensor as numbers
  - Polar diagram showing the actual neighbor connectivity — lines from the cell to each of its actual neighbors on the flat board (which may jump far across the board due to wrapping)
  - For non-orientable surfaces: shows the orientation sign at that point

### 4.7 3D Viewport

Each ManifoldRegion can optionally have one attached floating 3D viewport:

- Spawned via "Open 3D Viewport" in the region inspector, or via a button on the region label overlay
- A draggable, resizable glass panel rendered on top of `board-wrap`
- Contains its own Three.js scene with:
  - A 3D mesh of the surface shape, parameterized to match the region's `(W×H)` aspect ratio
  - Cells mapped onto the mesh surface as colored quads (alive = accent teal, dead = near-black)
  - Ambient + directional lighting, subtle emissive glow on alive cells
  - Camera orbits on drag; scroll to zoom
- Updates every frame (reads from the region's live cell data)
- **Interactive painting**: click or drag on the 3D surface → ray-cast → find (u,v) hit → convert to region `(lx, ly)` → convert to board `(cx, cy)` → write to `alive` set, trigger redraw
- Controls: shape selector (switch shape, recomputes neighborMap + remaps viewport mesh), close (×), detach/pin, resize handle
- Min-size: 200×200px. Max: unconstrained.

### 4.8 Persistence

ManifoldRegions are included in `serializeConfig` / `applyConfig`:

```json
{
  "manifoldRegions": [
    {
      "id": 1,
      "rect": { "x": 10, "y": 5, "w": 40, "h": 30 },
      "shape": "torus",
      "boundaryProtocol": "A",
      "kernelOverride": null
    }
  ]
}
```

The `neighborMap` and `christoffelMap` are not serialized (they are deterministic and recomputed on load). The 3D viewport position/size is serialized separately if open.

---

## 5. Technical Architecture

### 5.1 Data Model

```javascript
// Global state additions
state.manifoldRegions = [];          // ManifoldRegion[]
state.manifoldOverlapProtocol = "A"; // "A" | "B"
state.manifoldKernelInherit = true;
state.christoffelVis = false;
state.christoffelComponent = "magnitude"; // "magnitude"|"uu"|"uv"|"vv"|...

class ManifoldRegion {
  id:               number
  rect:             { x, y, w, h }
  shape:            ShapeType
  boundaryProtocol: "A" | "B"        // "A" = closed, "B" = open membrane
  kernelOffsets:    Array<[dx,dy]>   // null = inherit flat kernel
  neighborMap:      Map<string, string[]>
  christoffelMap:   Map<string, Float32Array>  // 6 components per cell
  viewport:         ManifoldViewport | null
}
```

### 5.2 Neighbor Resolution

```javascript
function getNeighborKeys(cx, cy, kernelOffsets) {
  // Find all regions this cell belongs to
  const regions = getRegionsContaining(cx, cy);
  
  if (regions.length === 0) {
    return defaultNeighbors(cx, cy, kernelOffsets);
  }
  
  if (state.manifoldOverlapProtocol === "A") {
    // Last wins: use highest-ID region
    const region = regions[regions.length - 1];
    return region.neighborMap.get(key(cx, cy));
  } else {
    // Compose: apply regions in sequence
    return composeNeighbors(cx, cy, regions, kernelOffsets);
  }
}

function composeNeighbors(cx, cy, regions, kernelOffsets) {
  // Start with the innermost region's neighbors,
  // then remap any that fall into outer regions
  let neighbors = regions[0].neighborMap.get(key(cx, cy));
  for (let i = 1; i < regions.length; i++) {
    neighbors = neighbors.map(nk => {
      const [nx, ny] = fromKey(nk);
      if (regions[i].containsCell(nx, ny)) {
        return regions[i].neighborMap.get(nk)?.[/* same offset index */] ?? nk;
      }
      return nk;
    });
  }
  return neighbors;
}
```

### 5.3 Topology Functions

Each shape provides:

```javascript
function torusNeighbor(lx, ly, dx, dy, W, H, rect) {
  const nx = ((lx + dx) % W + W) % W;
  const ny = ((ly + dy) % H + H) % H;
  return key(rect.x + nx, rect.y + ny);
}

function sphereNeighbor(lx, ly, dx, dy, W, H, rect) {
  let nx = lx + dx;
  let ny = ly + dy;
  // Pole-flip: crossing top/bottom wraps to antipodal column
  if (ny < 0) {
    nx = (nx + W / 2) | 0;
    ny = -ny - 1;
  } else if (ny >= H) {
    nx = (nx + W / 2) | 0;
    ny = 2 * H - ny - 1;
  }
  nx = ((nx % W) + W) % W;
  // Clamp in case pole-flip overshoots (W odd)
  ny = Math.max(0, Math.min(H - 1, ny));
  return key(rect.x + nx, rect.y + ny);
}

function mobiusNeighbor(lx, ly, dx, dy, W, H, rect) {
  let nx = lx + dx;
  let ny = ly + dy;
  if (nx < 0 || nx >= W) {
    ny = H - 1 - ny; // reflect on x-wrap
    nx = ((nx % W) + W) % W;
  }
  // y is open boundary — outside neighbors are flat board
  if (ny < 0 || ny >= H) return null; // boundary — handled by protocol
  return key(rect.x + nx, rect.y + ny);
}

function kleinNeighbor(lx, ly, dx, dy, W, H, rect) {
  let nx = lx + dx;
  let ny = ly + dy;
  if (nx < 0 || nx >= W) {
    ny = H - 1 - ny; // reflect y on x-wrap
    nx = ((nx % W) + W) % W;
  }
  ny = ((ny % H) + H) % H; // y wraps normally
  return key(rect.x + nx, rect.y + ny);
}

function rp2Neighbor(lx, ly, dx, dy, W, H, rect) {
  let nx = lx + dx;
  let ny = ly + dy;
  if (nx < 0 || nx >= W) {
    ny = H - 1 - ny;
    nx = ((nx % W) + W) % W;
  }
  if (ny < 0 || ny >= H) {
    nx = W - 1 - nx;
    ny = ((ny % H) + H) % H;
  }
  return key(rect.x + nx, rect.y + ny);
}
```

When `null` is returned (open boundary cell), the boundary protocol determines whether to read from flat space (Protocol B) or wrap back inside (Protocol A fallback to torus-like closure along that axis).

### 5.4 Christoffel Computation

```javascript
function computeChristoffel(lx, ly, W, H, shape) {
  const u = lx / W; // normalized [0,1]
  const v = ly / H;
  // Returns Float32Array([Γ_uu_u, Γ_uv_u, Γ_vv_u, Γ_uu_v, Γ_uv_v, Γ_vv_v])
  switch (shape) {
    case "torus":   return christoffelTorus(u, v);
    case "sphere":  return christoffelSphere(u, v);
    case "klein":   return christoffelKlein(u, v);
    // cylinder: all zeros (intrinsically flat)
    // mobius: defined piecewise, sign-flipped post-seam
  }
}

function christoffelSphere(u, v) {
  const theta = v * Math.PI;        // [0, π]
  const sinT  = Math.sin(theta);
  const cosT  = Math.cos(theta);
  // Γ^θ_φφ = −sinθ cosθ
  // Γ^φ_θφ = Γ^φ_φθ = cosθ/sinθ (cot θ)
  const G0 = new Float32Array(6);
  G0[2] = -sinT * cosT;            // Γ^u_vv
  G0[4] = sinT > 1e-9 ? cosT / sinT : 0; // Γ^v_uv (cot θ, clamped at poles)
  return G0;
}
```

### 5.5 Tick Loop Integration

The tick function currently iterates over `alive` cells and counts neighbors using fixed offsets. The integration point is the neighbor-counting loop:

**Before (current):**
```javascript
for (const [dx, dy] of kernelOffsets) {
  const nk = key(cx + dx, cy + dy);
  count += alive.has(nk) ? 1 : 0;
}
```

**After:**
```javascript
const neighborKeys = getNeighborKeys(cx, cy, kernelOffsets);
for (const nk of neighborKeys) {
  if (nk !== null) count += alive.has(nk) ? 1 : 0;
}
```

This is the single change to existing tick logic. Everything else is additive.

### 5.6 3D Viewport — ManifoldViewport Class

```javascript
class ManifoldViewport {
  constructor(region, initialPosition) { ... }

  buildDOM()       // creates the panel element, appends to board-wrap
  buildScene()     // Three.js: scene, camera, renderer, mesh geometry
  
  buildMesh()      // parameterized geometry for the shape:
                   // torus → THREE.TorusGeometry
                   // sphere → THREE.SphereGeometry
                   // klein → custom BufferGeometry (analytic parameterization)
                   // mobius → THREE.TubeGeometry along Möbius curve
  
  update(alive)    // read cells from region rect, update mesh vertex colors
  
  onCanvasClick(e) // rayCast → uv → (lx,ly) → write to alive
  
  destroy()        // remove DOM, dispose Three.js objects
}
```

---

## 6. Interaction Design

### 6.1 Creation Flow

```
User selects Manifold tool (T)
  → cursor changes to crosshair
  → drag rect on board
  → mouseup triggers Shape Picker (small floating panel at cursor)
  → user selects shape (click icon or 1-6 hotkey)
  → ManifoldRegion created, neighborMap + christoffelMap computed
  → region overlay renders on board
  → tool returns to Paint mode
```

Shape Picker shows: ⬭ Torus  ⌭ Cylinder  ● Sphere  ∞ Möbius  ⧖ Klein  ℙ RP²

### 6.2 Selection and Editing

- Click anywhere inside a region's overlay border → selects it
- Selected region: border becomes solid, shows resize handles at corners
- Drag border → move region (recomputes neighborMap)
- Drag corner handle → resize (recomputes neighborMap)
- Inspector updates to show region properties
- Delete key while region selected → removes region

### 6.3 Christoffel Inspect Mode

- Hover a cell inside any manifold region → tooltip-style overlay:
  ```
  [Cell 34, 17]  Torus Region #2
  u=0.43  v=0.28
  |Γ| = 0.312
  Γ_uu^u = 0.000   Γ_uv^u = 0.000   Γ_vv^u = -0.184
  Γ_uu^v = 0.000   Γ_uv^v = 0.218   Γ_vv^v = 0.000
  [polar diagram showing 8 neighbor directions with actual positions]
  ```
- Lines on the flat board canvas show where this cell's actual neighbors are (may be spatially distant due to wrapping)

### 6.4 Keyboard Shortcuts

| Key | Action |
|---|---|
| `T` | Activate Manifold tool |
| `K` | Toggle Christoffel / curvature vis mode |
| `1-6` | In Shape Picker: select shape |
| `Escape` | Cancel region creation / deselect |
| `Delete` | Delete selected region |
| `Ctrl+D` | Duplicate selected region |

---

## 7. Scope and Phasing

### Phase 1 — Topology Engine (ship first)
- ManifoldRegion data model + precomputed neighborMap
- All 6 topology functions
- Boundary protocol A and B, per-region toggle
- Overlap protocol A and B, global toggle
- Kernel inheritance + per-region override
- Tick loop integration
- Manifold tool (palette) + shape picker
- Region overlay on flat board
- Inspector section
- Persistence (serialize/apply)

### Phase 2 — Christoffel Engine
- christoffelMap computation for all shapes
- Curvature vis mode (flat board heatmap)
- Per-cell hover overlay with tensor values and polar neighbor diagram

### Phase 3 — 3D Viewport
- ManifoldViewport class
- Three.js scene per viewport
- Live cell sync → mesh vertex colors
- Interactive painting (3D → flat board)
- Drag, resize, close controls
- Shape swap in-place (recompute neighborMap + rebuild mesh)

### Phase 4 — Advanced
- Custom kernel per region (specify offsets manually)
- Composed overlap protocol (Protocol B) full implementation
- RP² and Klein 3D viewport mesh (self-intersecting, requires careful rendering)
- Christoffel-driven rule modulation (cells with high |Γ| use different birth/survival rules)
- Export: save a manifold region's state as a standalone snapshot
- Scripting API: access `manifoldRegions[id].christoffelAt(x, y)` from Script Kernel

---

## 8. Non-Goals (for now)

- **Continuous/smooth simulation on manifolds** — we are a discrete CA, not a PDE solver. The topology changes the neighbor graph; it does not change to a continuous metric.
- **Arbitrary mesh import** — shapes are limited to the 6 analytically parameterizable surfaces listed above.
- **Geodesic kernel** — the kernel offsets are still defined in the flat local (u,v) coordinate space, not along geodesics of the surface. Geodesic kernel is a future research feature.
- **Riemann curvature tensor** — we compute Christoffel symbols (connection coefficients) from the metric, but not the full Riemann tensor R^k_lij. The scalar curvature K (Gaussian curvature) *is* derivable from the Christoffels and will be included in Phase 2 as a vis option.

---

## 9. Decisions Log

All open questions resolved. The following are locked for implementation.

### 9.1 Boundary Protocol B — Membrane Asymmetry (resolved)

**Decision:** Yes, flat cells just outside the region include manifold cells as normal neighbors. The membrane leaks outward by default.

**Rationale:** This creates the richer physics. The manifold region is not a walled garden — it is a zone of altered topology that interacts with its surroundings. Patterns from flat space can be "pulled in" by the topological gradient at the boundary, and wrapped patterns inside the region bleed energy outward into flat space. This asymmetric interface is a feature, not a bug. A toggle to make the boundary one-directional (manifold cells can see flat cells but not vice versa) is a power-user option but not the default.

### 9.2 Kernel — Continuous, Weighted, General (resolved)

**Decision:** Build continuous kernel support into the base neighbor map from day one. No retrofit later.

The `neighborMap` is replaced by a fully general `neighborWeightMap`:

```javascript
// Instead of:
neighborMap: Map<cellKey, cellKey[]>

// Use:
neighborWeightMap: Map<cellKey, Array<{ key: string, weight: number }>>
```

For binary (Moore/VN) kernels, all weights are `1.0`. For Lenia or custom continuous kernels, weights are floats. This structure supports:

- **Symmetric kernels** (standard): weight of neighbor (dx,dy) equals weight of (-dx,-dy)
- **Asymmetric kernels**: directional weighting — e.g. neighbors "downhill" on the manifold curvature gradient get higher weight than "uphill" ones
- **Irregular kernels**: arbitrary (key, weight) pairs, not necessarily derived from a regular offset grid — can be hand-authored or generated by a Script Kernel function
- **Continuous Lenia kernel**: weights computed from a growth function evaluated at continuous (u,v) distance

The `kernelOverride` field on ManifoldRegion stores the kernel spec:
```javascript
kernelOverride: null | {
  type: 'inherit' | 'moore' | 'vn' | 'lenia' | 'custom',
  radius: number,          // for moore/vn/lenia
  weights: Float32Array,   // for custom: flat array of weights, indexed by offset order
  offsets: Int16Array,     // for custom: [dx0,dy0, dx1,dy1, ...] pairs
  asymmetric: boolean,     // if false, weights are mirrored across origin
  growthFn: string | null, // for lenia: function body as string (eval'd)
}
```

When the flat kernel changes and a region has `type: 'inherit'`, its `neighborWeightMap` is recomputed automatically.

### 9.3 Script Kernel API Entrypoint (resolved)

**Decision:** The proposed API surface is confirmed as the Phase 1 entrypoint. A richer framework covering metric tensors, geodesics, Riemann curvature, and spatial/temporal pattern matching pipelines will be built on top in later phases.

Phase 1 API:
```javascript
// Read
kernel.manifoldRegions                         // ManifoldRegion[]
kernel.manifoldRegions[i].shape                // string
kernel.manifoldRegions[i].boundaryProtocol     // 'A' | 'B'
kernel.manifoldRegions[i].rect                 // {x,y,w,h}
kernel.manifoldRegions[i].christoffelAt(x, y)  // Float32Array(6)
kernel.manifoldRegions[i].neighborsOf(x, y)    // [{x,y,weight}, ...]
kernel.manifoldRegions[i].curvatureAt(x, y)    // number (|Γ| scalar magnitude)

// Mutate
kernel.createManifoldRegion({ rect, shape, boundaryProtocol, kernelOverride })
kernel.removeManifoldRegion(id)
kernel.setRegionShape(id, shape)               // recomputes neighborWeightMap
kernel.setRegionKernel(id, kernelSpec)         // recomputes neighborWeightMap
```

Future phases will add `kernel.manifoldRegions[i].metricAt(x,y)`, `.parallelTransport(path)`, `.holonomy(loop)`, `.riemannAt(x,y)`, and pattern-matching hooks into the spatial/temporal analysis pipeline.

### 9.4 Overlap Composition — Non-Commutative (resolved)

**Decision:** Protocol B (Compose) is explicitly non-commutative. Region stacking order is a meaningful first-class parameter, not an implementation detail.

**Rationale:** The non-commutativity of parallel transport around a closed loop on a curved surface is the geometric definition of curvature itself — it is the holonomy of the Levi-Civita connection. Applying topology A then B produces a different composite manifold than B then A, and this difference encodes something geometrically real about the curvature of the combined space. Making composition order controllable gives users access to that structure directly.

Concretely: the `manifoldRegions` array is ordered. In Protocol B, neighbors are resolved by iterating through the array in order. Reordering the array in the Region Management panel changes the composition and thus the dynamics of the overlap zone. This is exposed as a drag-to-reorder UI in the panel — the user is literally manipulating the holonomy group of their topology stack.

There is no commutative mode. Protocol A (Last Wins) is the "I don't care about ordering" escape hatch. Protocol B always operates on the ordered stack.

**Note on dot products:** The dot product is commutative (a·b = b·a). The relevant non-commutative structure here is function composition and matrix multiplication — the same structure that underlies non-abelian gauge theories (Yang-Mills) in physics. Our overlap composition is exactly this: a path-ordered product of topology maps, whose non-commutativity measures curvature.

---

## 10. Resizing a Region — Edge Case

When a region is resized, cells that were inside and are now outside return to flat topology. Their `alive` state is preserved. 

A topological subtlety: a cell that was "wrapped" (its canonical position was remapped via the manifold topology) has its canonical key as the flat board coordinate — there is no secondary "wrapped position" stored. The alive set always uses flat board coordinates. So no cell becomes unreachable on resize. The neighbor remapping is applied at tick time from the neighborWeightMap; shrinking the region simply removes those entries from the map, and those cells revert to standard kernel neighbor resolution on the next tick.

---

*This document is the authoritative reference for the Manifold Regions feature. All decisions are locked. Implementation of Phase 1 may proceed.*
