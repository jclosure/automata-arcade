// Manifold Region Engine — loaded before app.js, exposes window.ManifoldEngine
// Provides topology functions, ManifoldRegion class, and Christoffel computation.
(function () {
  'use strict';

  function bk(x, y) { return x + ',' + y; }

  // ─── Topology functions ────────────────────────────────────────────────────
  // Each returns a board-coordinate key string, or null for absorbing boundary
  // (null only possible for open-boundary shapes under Protocol A).
  // Protocol B: null is never stored — the flat board key is used instead.

  function _bkFlat(rx, ry, lx, ly, dx, dy) {
    return bk(rx + lx + dx, ry + ly + dy);
  }

  const TOPOLOGY = {
    torus(lx, ly, dx, dy, W, H, rx, ry /*, protocol always closed */) {
      return bk(rx + ((lx + dx) % W + W) % W, ry + ((ly + dy) % H + H) % H);
    },

    cylinder(lx, ly, dx, dy, W, H, rx, ry, protocol) {
      const nx = ((lx + dx) % W + W) % W;
      const ny = ly + dy;
      if (ny < 0 || ny >= H)
        return protocol === 'B' ? _bkFlat(rx, ry, lx, ly, dx, dy) : null;
      return bk(rx + nx, ry + ny);
    },

    sphere(lx, ly, dx, dy, W, H, rx, ry /*, always closed */) {
      let nx = lx + dx;
      let ny = ly + dy;
      // Pole-flip: crossing top/bottom maps to antipodal column
      if (ny < 0) {
        nx = (nx + (W >> 1)) % W;
        if (nx < 0) nx += W;
        ny = -ny - 1;
      } else if (ny >= H) {
        nx = (nx + (W >> 1)) % W;
        if (nx < 0) nx += W;
        ny = 2 * H - ny - 1;
      }
      ny = Math.max(0, Math.min(H - 1, ny));
      nx = ((nx % W) + W) % W;
      return bk(rx + nx, ry + ny);
    },

    mobius(lx, ly, dx, dy, W, H, rx, ry, protocol) {
      let nx = lx + dx;
      let ny = ly + dy;
      const xWraps = Math.floor(nx / W); // negative if nx < 0
      if (xWraps !== 0) {
        if (Math.abs(xWraps) % 2 === 1) ny = H - 1 - ny;
        nx = ((nx % W) + W) % W;
      }
      if (ny < 0 || ny >= H)
        return protocol === 'B' ? _bkFlat(rx, ry, lx, ly, dx, dy) : null;
      return bk(rx + nx, ry + ny);
    },

    klein(lx, ly, dx, dy, W, H, rx, ry /*, always closed */) {
      let nx = lx + dx;
      let ny = ly + dy;
      const xWraps = Math.floor(nx / W);
      if (xWraps !== 0) {
        if (Math.abs(xWraps) % 2 === 1) ny = H - 1 - ny;
        nx = ((nx % W) + W) % W;
      }
      ny = ((ny % H) + H) % H;
      return bk(rx + nx, ry + ny);
    },

    rp2(lx, ly, dx, dy, W, H, rx, ry /*, always closed */) {
      let nx = lx + dx;
      let ny = ly + dy;
      const xWraps = Math.floor(nx / W);
      const yWraps = Math.floor(ny / H);
      nx = ((nx % W) + W) % W;
      ny = ((ny % H) + H) % H;
      if (Math.abs(xWraps) % 2 === 1) ny = H - 1 - ny;
      if (Math.abs(yWraps) % 2 === 1) nx = W - 1 - nx;
      return bk(rx + nx, ry + ny);
    },
  };

  // ─── Christoffel symbols ───────────────────────────────────────────────────
  // Returns Float32Array(6): [Γ^u_uu, Γ^u_uv, Γ^u_vv, Γ^v_uu, Γ^v_uv, Γ^v_vv]
  // Parameterization: u = (lx+0.5)/W, v = (ly+0.5)/H, both in [0,1).

  function computeChristoffel(lx, ly, W, H, shape) {
    const G = new Float32Array(6);
    switch (shape) {
      case 'torus': {
        // Standard torus, R=3 r=1.2. Coords: u=φ (azimuth), v=θ (tube angle)
        // g_uu=(R+r·cosv)², g_vv=r², g_uv=0
        // Γ^u_uv = Γ^u_vu = -r·sinv / (R+r·cosv)
        // Γ^v_uu = (R+r·cosv)·sinv / r
        const R = 3, r = 1.2;
        const v = ((ly + 0.5) / H) * Math.PI * 2;
        const cosV = Math.cos(v), sinV = Math.sin(v);
        const denom = R + r * cosV;
        G[1] = -r * sinV / denom;     // Γ^u_uv
        G[3] = denom * sinV / r;      // Γ^v_uu
        break;
      }
      case 'sphere': {
        // Unit sphere. Coords: u=φ (longitude), v=θ (colatitude, 0=north)
        // g_uu=sin²θ, g_vv=1, g_uv=0
        // Γ^u_uv = Γ^u_vu = cosθ/sinθ = cotθ  (diverges at poles — clamped)
        // Γ^v_uu = -sinθ·cosθ
        const theta = ((ly + 0.5) / H) * Math.PI;
        const sinT = Math.sin(theta), cosT = Math.cos(theta);
        G[1] = sinT > 1e-6 ? cosT / sinT : 0;  // Γ^u_uv (cot θ, clamped)
        G[3] = -sinT * cosT;                    // Γ^v_uu
        break;
      }
      case 'cylinder':
        // Intrinsically flat — all Γ = 0
        break;
      case 'klein':
      case 'mobius':
      case 'rp2':
        // Locally flat; curvature is distributional at the identification seams.
        // Phase 2 will compute these numerically via finite differences of the metric.
        break;
    }
    return G;
  }

  // ─── Gaussian curvature ───────────────────────────────────────────────────
  // Returns K (scalar) — intrinsic curvature at the given cell.
  // Torus: K = cos(θ) / (r·(R + r·cos(θ))), ranges negative→positive
  // Sphere: K = 1 (uniform positive)
  // All others: K = 0 (intrinsically flat, curvature is distributional at seams)

  function computeGaussianCurvature(lx, ly, W, H, shape) {
    switch (shape) {
      case 'torus': {
        const R = 3, r = 1.2;
        const theta = ((ly + 0.5) / H) * Math.PI * 2;
        const cosT = Math.cos(theta);
        return cosT / (r * (R + r * cosT));
      }
      case 'sphere': return 1.0;
      default: return 0.0;
    }
  }

  // ─── ManifoldRegion class ──────────────────────────────────────────────────

  class ManifoldRegion {
    constructor({ id, rect, shape, boundaryProtocol = 'A', kernelOverride = null, visible = true,
                  ruleOverride = null, curvatureModulate = false }) {
      this.id = id;
      this.rect = { ...rect };
      this.shape = shape;
      this.boundaryProtocol  = boundaryProtocol; // 'A' = closed bubble, 'B' = open membrane
      this.kernelOverride    = kernelOverride;    // null = inherit flat kernel
      this.visible           = visible;
      // ruleOverride: null | { B: Set<number>, S: Set<number> } — per-region birth/survival rule
      // curvatureModulate: shift effective neighbor count by Gaussian K × strength
      this.ruleOverride      = ruleOverride ? { B: new Set(ruleOverride.B), S: new Set(ruleOverride.S) } : null;
      this.curvatureModulate = curvatureModulate;
      // kernelOverride shape: { offsets: [[dx,dy,weight],...] }

      // Precomputed maps — rebuilt via build()
      this.neighborWeightMap = new Map(); // cellKey → [{key, weight}]
      this.christoffelMap    = new Map(); // cellKey → Float32Array(6)
    }

    containsCell(cx, cy) {
      const { x, y, w, h } = this.rect;
      return cx >= x && cx < x + w && cy >= y && cy < y + h;
    }

    // kernelWeights: Array of [dx, dy, weight] triples
    build(kernelWeights) {
      const { x: rx, y: ry, w: W, h: H } = this.rect;
      const topoFn  = TOPOLOGY[this.shape];
      const proto   = this.boundaryProtocol;
      const weights = this.kernelOverride ? this.kernelOverride.offsets : kernelWeights;

      this.neighborWeightMap.clear();
      this.christoffelMap.clear();

      for (let ly = 0; ly < H; ly++) {
        for (let lx = 0; lx < W; lx++) {
          const k = bk(rx + lx, ry + ly);
          const neighbors = [];

          for (const [dx, dy, weight] of weights) {
            const nk = topoFn(lx, ly, dx, dy, W, H, rx, ry, proto);
            if (nk !== null) neighbors.push({ key: nk, weight });
          }

          this.neighborWeightMap.set(k, neighbors);
          this.christoffelMap.set(k, computeChristoffel(lx, ly, W, H, this.shape));
        }
      }
    }

    christoffelMagnitudeAt(cx, cy) {
      const G = this.christoffelMap.get(bk(cx, cy));
      if (!G) return 0;
      let s = 0;
      for (let i = 0; i < 6; i++) s += G[i] * G[i];
      return Math.sqrt(s);
    }

    toJSON() {
      return {
        id: this.id,
        rect: { ...this.rect },
        shape: this.shape,
        boundaryProtocol: this.boundaryProtocol,
        kernelOverride: this.kernelOverride,
        ruleOverride: this.ruleOverride
          ? { B: [...this.ruleOverride.B], S: [...this.ruleOverride.S] }
          : null,
        curvatureModulate: this.curvatureModulate,
      };
    }
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  window.ManifoldEngine = {
    ManifoldRegion,
    computeChristoffel,
    computeGaussianCurvature,
    TOPOLOGY,

    SHAPES: ['torus', 'sphere', 'cylinder', 'mobius', 'klein', 'rp2'],

    SHAPE_META: {
      torus:    { label: 'Torus',            icon: '⬭', key: '1', closed: true },
      sphere:   { label: 'Sphere',           icon: '●', key: '2', closed: true },
      cylinder: { label: 'Cylinder',         icon: '⌭', key: '3', closed: false },
      mobius:   { label: 'Möbius',           icon: '∞', key: '4', closed: false },
      klein:    { label: 'Klein Bottle',     icon: '⧖', key: '5', closed: true },
      rp2:      { label: 'Proj. Plane RP²',  icon: 'ℙ', key: '6', closed: true },
    },
  };
})();
