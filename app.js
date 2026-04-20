(() => {
  const canvas = document.getElementById("lifeCanvas");
  const ctx = canvas.getContext("2d");
  const sphereCanvas = document.getElementById("sphereCanvas");

  const genOut = document.getElementById("genOut");
  const popOut = document.getElementById("popOut");
  const scoreOut = document.getElementById("scoreOut");
  const comboOut = document.getElementById("comboOut");
  const speedInput = document.getElementById("speedInput");
  const speedOut = document.getElementById("speedOut");
  const modeSelect = document.getElementById("modeSelect");
  const levelSelect = document.getElementById("levelSelect");
  const objectiveText = document.getElementById("objectiveText");
  const rotateSelect = document.getElementById("rotateSelect");
  const flipXInput = document.getElementById("flipX");
  const paletteList = document.getElementById("paletteList");
  const inspectorBody = document.getElementById("inspectorBody");
  const overlayMessage = document.getElementById("overlayMessage");

  const state = {
    alive: new Set(),
    generation: 0,
    running: false,
    stepsPerSecond: Number(speedInput.value),
    cameraX: 0,
    cameraY: 0,
    zoom: 18,
    showGrid: true,
    hoverCell: null,
    pointer: {
      down: false,
      mode: null,
      lastX: 0,
      lastY: 0,
      paintValue: 1,
    },
    keys: {
      spaceDown: false,
    },
    selectedPrefabId: null,
    draggingPrefabId: null,
    mode: "sandbox",
    score: 0,
    combo: 1,
    comboTimer: 0,
    levelIndex: 0,
    levelState: null,
    message: "",
    tickCarry: 0,
    zoneFlash: [],
    sphereAlive: new Set(),
    sphereRotX: 0.4,
    sphereRotY: 0,
    sphereDrag: false,
    sphereDragLastX: 0,
    sphereDragLastY: 0,
    spherePaintDown: false,
    spherePaintValue: 1,
    sphereCameraZ: 13,
    sphereHoverCell: null,
  };

  const SPHERE_COLS = 180;
  const SPHERE_ROWS = 90;
  let sphereThree = null;

  const REQUIRED_PREFABS = [
    {
      id: "glider",
      name: "Glider",
      type: "ship",
      category: "Required",
      desc: "The classic diagonal courier. Good for triggering far receptors.",
      tip: "Rotate to steer: it travels diagonally relative to its nose.",
      cells: [
        [1, 0],
        [2, 1],
        [0, 2],
        [1, 2],
        [2, 2],
      ],
      period: 4,
    },
    {
      id: "lwss",
      name: "Lightweight Spaceship",
      type: "ship",
      category: "Required",
      desc: "Fast horizontal spacecraft. Useful in wide corridors.",
      tip: "Flip to reverse direction quickly.",
      cells: [
        [1, 0],
        [2, 0],
        [3, 0],
        [4, 0],
        [0, 1],
        [4, 1],
        [4, 2],
        [0, 3],
        [3, 3],
      ],
      period: 4,
    },
    {
      id: "gosper",
      name: "Gosper Glider Gun",
      type: "gun",
      category: "Required",
      desc: "First known infinite-growth pattern. Emits gliders forever.",
      tip: "Great for long combo chains if receptors are aligned.",
      cells: [
        [24, 0],
        [22, 1],
        [24, 1],
        [12, 2],
        [13, 2],
        [20, 2],
        [21, 2],
        [34, 2],
        [35, 2],
        [11, 3],
        [15, 3],
        [20, 3],
        [21, 3],
        [34, 3],
        [35, 3],
        [0, 4],
        [1, 4],
        [10, 4],
        [16, 4],
        [20, 4],
        [21, 4],
        [0, 5],
        [1, 5],
        [10, 5],
        [14, 5],
        [16, 5],
        [17, 5],
        [22, 5],
        [24, 5],
        [10, 6],
        [16, 6],
        [24, 6],
        [11, 7],
        [15, 7],
        [12, 8],
        [13, 8],
      ],
      period: 30,
    },
    {
      id: "eater1",
      name: "Eater-1",
      type: "still",
      category: "Required",
      desc: "Absorbs incoming gliders and survives. Precise defensive piece.",
      tip: "Use near receptors to avoid accidental re-triggers.",
      cells: [
        [1, 0],
        [2, 0],
        [0, 1],
        [2, 1],
        [2, 2],
        [4, 2],
        [4, 3],
        [4, 4],
        [5, 4],
      ],
      period: 1,
    },
    {
      id: "pulse-seed",
      name: "Pulse Seed",
      type: "seed",
      category: "Required",
      desc: "Small high-energy seed that blooms into periodic flicker.",
      tip: "Drop near switches to create transient sparks.",
      cells: [
        [1, 0],
        [2, 0],
        [0, 1],
        [3, 1],
        [1, 2],
        [2, 2],
      ],
      period: 6,
    },
    {
      id: "clock-seed",
      name: "Clock Seed",
      type: "seed",
      category: "Required",
      desc: "Compact seed that often settles into stable oscillators.",
      tip: "Useful for beacon missions where timing matters.",
      cells: [
        [1, 0],
        [2, 0],
        [0, 1],
        [3, 1],
        [1, 2],
        [3, 2],
        [2, 3],
      ],
      period: 8,
    },
  ];

  const CUSTOM_PREFABS = [
    {
      id: "beacon",
      name: "Beacon",
      type: "oscillator",
      category: "Custom",
      desc: "Classic period-2 oscillator and level objective anchor.",
      tip: "Keep both lobes intact to preserve timing.",
      period: 2,
      cells: [
        [0, 0],
        [1, 0],
        [0, 1],
        [3, 2],
        [2, 3],
        [3, 3],
      ],
    },
    {
      id: "toad",
      name: "Toad",
      type: "oscillator",
      category: "Custom",
      desc: "Period-2 oscillator with broad swing.",
      tip: "A good starter for population tuning objectives.",
      period: 2,
      cells: [
        [1, 0],
        [2, 0],
        [3, 0],
        [0, 1],
        [1, 1],
        [2, 1],
      ],
    },
    {
      id: "blinker-train",
      name: "Blinker Train",
      type: "seed",
      category: "Custom",
      desc: "Three staged blinkers that phase into a moving wavefront.",
      tip: "Place in open fields to avoid self-collision.",
      period: 3,
      cells: [
        [0, 1],
        [1, 1],
        [2, 1],
        [4, 0],
        [4, 1],
        [4, 2],
        [6, 1],
        [7, 1],
        [8, 1],
      ],
    },
    {
      id: "spark-crab",
      name: "Spark Crab",
      type: "seed",
      category: "Custom",
      desc: "Small asymmetric seed that ejects fast sparks.",
      tip: "Try near two switches for combo attempts.",
      period: 10,
      cells: [
        [1, 0],
        [3, 0],
        [0, 1],
        [1, 1],
        [2, 1],
        [4, 1],
        [2, 2],
        [3, 2],
        [1, 3],
      ],
    },
    {
      id: "drift-fork",
      name: "Drift Fork",
      type: "machine",
      category: "Custom",
      desc: "A forked structure that nudges gliders into diverging traces.",
      tip: "Use as a primitive router in courier levels.",
      period: 1,
      cells: [
        [0, 1],
        [1, 0],
        [1, 1],
        [1, 2],
        [2, 1],
        [4, 0],
        [5, 1],
        [4, 2],
      ],
    },
    {
      id: "pinwheel-seed",
      name: "Pinwheel Seed",
      type: "seed",
      category: "Custom",
      desc: "Cross-kernel seed with rotational blossom behavior.",
      tip: "Rotate to alter its early expansion lanes.",
      period: 12,
      cells: [
        [2, 0],
        [1, 1],
        [2, 1],
        [3, 1],
        [0, 2],
        [1, 2],
        [3, 2],
        [4, 2],
        [1, 3],
        [2, 3],
        [3, 3],
        [2, 4],
      ],
    },
    {
      id: "mini-lab",
      name: "Mini Lab Core",
      type: "machine",
      category: "Custom",
      desc: "Stable core chunk for defense and beacon support.",
      tip: "Anchor it near mission-critical structures.",
      period: 1,
      cells: [
        [0, 0],
        [1, 0],
        [3, 0],
        [4, 0],
        [0, 1],
        [4, 1],
        [0, 2],
        [4, 2],
        [0, 3],
        [1, 3],
        [3, 3],
        [4, 3],
      ],
    },
  ];

  const PREFABS = [...REQUIRED_PREFABS, ...CUSTOM_PREFABS];

  const LEVELS = [
    {
      name: "L1 Courier Duty",
      vibe: "Shift A begins. Deliver a glider signal to the receptor bay.",
      objective: "Hit the receptor zone within 180 generations.",
      genLimit: 180,
      setup() {
        seedFromPattern("mini-lab", -22, -10);
        return {
          type: "receptor",
          receptor: { x: 36, y: -8, w: 6, h: 6, hit: false },
          hitsNeeded: 1,
          hits: 0,
        };
      },
      evaluate(levelState) {
        const zone = levelState.receptor;
        if (!zone.hit && anyAliveInZone(zone)) {
          zone.hit = true;
          levelState.hits += 1;
          registerArcadeEvent("receptor", 240, zone);
        }
        if (levelState.hits >= levelState.hitsNeeded) {
          return { win: true, msg: "Signal delivered. Receptor bay online." };
        }
        if (state.generation >= this.genLimit) {
          return { fail: true, msg: "Time out. Courier packet lost." };
        }
        return null;
      },
      progress(levelState) {
        return `Receptor hits: ${levelState.hits}/${levelState.hitsNeeded}`;
      },
    },
    {
      name: "L2 Beacon Watch",
      vibe: "Night shift. Keep the station beacon oscillating while systems calibrate.",
      objective: "Keep beacon cluster alive for 120 generations.",
      genLimit: 160,
      setup() {
        seedFromPattern("beacon", -2, -2);
        seedFromPattern("eater1", -16, -4);
        seedFromPattern("toad", 10, 2);
        return {
          type: "beacon",
          targetGenerations: 120,
          aliveGenerations: 0,
          beaconZone: { x: -4, y: -4, w: 10, h: 10 },
        };
      },
      evaluate(levelState) {
        const beaconPop = countAliveInZone(levelState.beaconZone);
        if (beaconPop >= 4) {
          levelState.aliveGenerations += 1;
        }
        if (beaconPop < 2 && state.generation > 20) {
          return { fail: true, msg: "Beacon collapsed. Calibration aborted." };
        }
        if (levelState.aliveGenerations >= levelState.targetGenerations) {
          registerArcadeEvent("beacon", 300, levelState.beaconZone);
          return { win: true, msg: "Beacon stable. Calibration complete." };
        }
        if (state.generation >= this.genLimit) {
          return { fail: true, msg: "Shift ended before stable oscillation." };
        }
        return null;
      },
      progress(levelState) {
        return `Beacon uptime: ${levelState.aliveGenerations}/${levelState.targetGenerations}`;
      },
    },
    {
      name: "L3 Twin Switch Boot",
      vibe: "Two ancient relays need glider sparks to wake up.",
      objective: "Trigger both switches in 220 generations.",
      genLimit: 220,
      setup() {
        seedFromPattern("glider", -25, -8, { rotate: 90 });
        seedFromPattern("drift-fork", -10, -2);
        return {
          type: "switches",
          switches: [
            { x: 24, y: -14, w: 6, h: 6, hit: false },
            { x: 24, y: 10, w: 6, h: 6, hit: false },
          ],
        };
      },
      evaluate(levelState) {
        for (const sw of levelState.switches) {
          if (!sw.hit && anyAliveInZone(sw)) {
            sw.hit = true;
            registerArcadeEvent("switch", 220, sw);
          }
        }
        const hits = levelState.switches.filter((s) => s.hit).length;
        if (hits === levelState.switches.length) {
          return { win: true, msg: "Dual relay boot complete." };
        }
        if (state.generation >= this.genLimit) {
          return { fail: true, msg: "Relays stayed dormant." };
        }
        return null;
      },
      progress(levelState) {
        const hits = levelState.switches.filter((s) => s.hit).length;
        return `Switches: ${hits}/${levelState.switches.length}`;
      },
    },
    {
      name: "L4 Population Tempo",
      vibe: "The reactor likes a steady crowd, not chaos.",
      objective: "Maintain population between 60 and 180 for 150 generations.",
      genLimit: 220,
      setup() {
        seedFromPattern("pulse-seed", -20, -8);
        seedFromPattern("clock-seed", 14, 4);
        seedFromPattern("pinwheel-seed", -2, -2);
        return {
          type: "population-band",
          low: 60,
          high: 180,
          stableTarget: 150,
          stableCount: 0,
          misses: 0,
        };
      },
      evaluate(levelState) {
        const pop = state.alive.size;
        if (pop >= levelState.low && pop <= levelState.high) {
          levelState.stableCount += 1;
          if (levelState.stableCount % 25 === 0) {
            registerArcadeEvent("tempo", 120, { x: -2, y: -2, w: 4, h: 4 });
          }
        } else {
          levelState.misses += 1;
        }
        if (levelState.stableCount >= levelState.stableTarget) {
          return { win: true, msg: "Population rhythm locked." };
        }
        if (levelState.misses > 55 || state.generation >= this.genLimit) {
          return { fail: true, msg: "Reactor rejected unstable population." };
        }
        return null;
      },
      progress(levelState) {
        return `Tempo: ${levelState.stableCount}/${levelState.stableTarget} in-band gens`;
      },
    },
    {
      name: "L5 Final Assembly",
      vibe: "Final exam. Fire the receptor and protect the core block.",
      objective: "Trigger receptor and keep core block alive by gen 260.",
      genLimit: 260,
      setup() {
        seedFromPattern("mini-lab", -30, -8);
        seedFromPattern("gosper", -45, -20);
        placeCells(
          [
            [8, 8],
            [9, 8],
            [8, 9],
            [9, 9],
          ],
          0,
          0,
        );
        return {
          type: "finale",
          receptor: { x: 34, y: -10, w: 8, h: 8, hit: false },
          coreBlock: { x: 8, y: 8, w: 2, h: 2 },
        };
      },
      evaluate(levelState) {
        if (!levelState.receptor.hit && anyAliveInZone(levelState.receptor)) {
          levelState.receptor.hit = true;
          registerArcadeEvent("receptor", 280, levelState.receptor);
        }
        const coreAlive = countAliveInZone(levelState.coreBlock) >= 4;
        if (!coreAlive && state.generation > 60) {
          return { fail: true, msg: "Core block destroyed. Lab integrity lost." };
        }
        if (levelState.receptor.hit && coreAlive && state.generation >= 180) {
          registerArcadeEvent("final", 500, levelState.coreBlock);
          return { win: true, msg: "Assembly complete. You own this arcade lab." };
        }
        if (state.generation >= this.genLimit) {
          return { fail: true, msg: "Final assembly timed out." };
        }
        return null;
      },
      progress(levelState) {
        const coreAlive = countAliveInZone(levelState.coreBlock) >= 4 ? "alive" : "critical";
        return `Receptor: ${levelState.receptor.hit ? "hit" : "pending"}, Core: ${coreAlive}`;
      },
    },
  ];

  function key(x, y) {
    return `${x},${y}`;
  }

  function parseKey(k) {
    const idx = k.indexOf(",");
    return [Number(k.slice(0, idx)), Number(k.slice(idx + 1))];
  }

  function isAlive(x, y) {
    return state.alive.has(key(x, y));
  }

  function setCell(x, y, alive) {
    const k = key(x, y);
    if (alive) {
      state.alive.add(k);
    } else {
      state.alive.delete(k);
    }
  }

  function placeCells(cells, originX, originY) {
    for (const [x, y] of cells) {
      setCell(originX + x, originY + y, true);
    }
  }

  function clearBoard() {
    state.alive.clear();
    state.sphereAlive.clear();
    state.generation = 0;
    state.score = 0;
    state.combo = 1;
    state.comboTimer = 0;
    state.levelState = null;
    state.zoneFlash = [];
    setOverlay("");
    updateHud();
  }

  function transformCells(cells, rotateDeg, flipX) {
    let transformed = cells.map((c) => [c[0], c[1]]);
    if (flipX) {
      transformed = transformed.map(([x, y]) => [-x, y]);
    }
    const turns = ((rotateDeg % 360) + 360) % 360;
    for (let i = 0; i < turns / 90; i += 1) {
      transformed = transformed.map(([x, y]) => [-y, x]);
    }
    let minX = Infinity;
    let minY = Infinity;
    for (const [x, y] of transformed) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
    }
    return transformed.map(([x, y]) => [x - minX, y - minY]);
  }

  function getPrefabById(id) {
    return PREFABS.find((p) => p.id === id);
  }

  function placePrefab(id, gx, gy, opts = {}) {
    const prefab = getPrefabById(id);
    if (!prefab) return;
    const rotate = opts.rotate ?? Number(rotateSelect.value);
    const flipX = opts.flipX ?? flipXInput.checked;
    const cells = transformCells(prefab.cells, rotate, flipX);
    placeCells(cells, gx, gy);
  }

  function stepLife() {
    const neighborCounts = new Map();

    for (const k of state.alive) {
      const [x, y] = parseKey(k);
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) continue;
          const nk = key(x + dx, y + dy);
          neighborCounts.set(nk, (neighborCounts.get(nk) || 0) + 1);
        }
      }
    }

    const next = new Set();
    for (const [k, n] of neighborCounts) {
      const alive = state.alive.has(k);
      if (n === 3 || (alive && n === 2)) {
        next.add(k);
      }
    }

    state.alive = next;
    state.generation += 1;

    if (state.mode === "arcade") {
      if (state.comboTimer > 0) {
        state.comboTimer -= 1;
      } else {
        state.combo = 1;
      }
      state.score += 1;
      evaluateArcadeState();
    }

    if (state.zoneFlash.length > 0) {
      for (const z of state.zoneFlash) {
        z.ttl -= 1;
      }
      state.zoneFlash = state.zoneFlash.filter((z) => z.ttl > 0);
    }
  }

  // --- Sphere mode ---

  function sphereNeighbors(c, r) {
    const result = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        let nc = ((c + dc) % SPHERE_COLS + SPHERE_COLS) % SPHERE_COLS;
        let nr = r + dr;
        if (nr < 0) {
          nr = 0;
          nc = (nc + SPHERE_COLS / 2) % SPHERE_COLS;
        } else if (nr >= SPHERE_ROWS) {
          nr = SPHERE_ROWS - 1;
          nc = (nc + SPHERE_COLS / 2) % SPHERE_COLS;
        }
        result.push(key(nc, nr));
      }
    }
    return result;
  }

  function stepLifeSphere() {
    const neighborCounts = new Map();
    for (const k of state.sphereAlive) {
      const [c, r] = parseKey(k);
      for (const nk of sphereNeighbors(c, r)) {
        neighborCounts.set(nk, (neighborCounts.get(nk) || 0) + 1);
      }
    }
    const next = new Set();
    for (const [k, n] of neighborCounts) {
      if (n === 3 || (state.sphereAlive.has(k) && n === 2)) {
        next.add(k);
      }
    }
    state.sphereAlive = next;
    state.generation += 1;
  }

  function createSphereGridLines() {
    const R = 5.005;
    const verts = [];
    const LAT_SEGS = 128;
    const LON_SEGS = 64;

    for (let r = 0; r <= SPHERE_ROWS; r++) {
      const phi = (r / SPHERE_ROWS) * Math.PI;
      const rLat = R * Math.sin(phi);
      const y = R * Math.cos(phi);
      if (rLat < 1e-4) continue;
      for (let i = 0; i < LAT_SEGS; i++) {
        const t0 = (i / LAT_SEGS) * Math.PI * 2;
        const t1 = ((i + 1) / LAT_SEGS) * Math.PI * 2;
        verts.push(rLat * Math.cos(t0), y, rLat * Math.sin(t0));
        verts.push(rLat * Math.cos(t1), y, rLat * Math.sin(t1));
      }
    }

    for (let c = 0; c < SPHERE_COLS; c++) {
      const theta = (c / SPHERE_COLS) * Math.PI * 2;
      for (let i = 0; i < LON_SEGS; i++) {
        const phi0 = (i / LON_SEGS) * Math.PI;
        const phi1 = ((i + 1) / LON_SEGS) * Math.PI;
        verts.push(
          R * Math.sin(phi0) * Math.cos(theta),
          R * Math.cos(phi0),
          R * Math.sin(phi0) * Math.sin(theta),
        );
        verts.push(
          R * Math.sin(phi1) * Math.cos(theta),
          R * Math.cos(phi1),
          R * Math.sin(phi1) * Math.sin(theta),
        );
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
    const mat = new THREE.LineBasicMaterial({ color: 0x1a4a66, transparent: true, opacity: 0.55 });
    return new THREE.LineSegments(geo, mat);
  }

  function buildCellMesh() {
    const { cellMesh } = sphereThree;
    cellMesh.geometry.dispose();

    if (state.sphereAlive.size === 0) {
      cellMesh.geometry = new THREE.BufferGeometry();
      return;
    }

    const R = 5.015;
    const PAD = 0.08;
    const verts = [];
    const idxs = [];
    let vi = 0;

    for (const k of state.sphereAlive) {
      const [c, r] = parseKey(k);
      const phi1 = ((r + PAD) / SPHERE_ROWS) * Math.PI;
      const phi2 = ((r + 1 - PAD) / SPHERE_ROWS) * Math.PI;
      const theta1 = ((c + PAD) / SPHERE_COLS) * Math.PI * 2;
      const theta2 = ((c + 1 - PAD) / SPHERE_COLS) * Math.PI * 2;

      const corners = [[phi1, theta1], [phi1, theta2], [phi2, theta2], [phi2, theta1]];
      for (const [phi, theta] of corners) {
        verts.push(
          R * Math.sin(phi) * Math.cos(theta),
          R * Math.cos(phi),
          R * Math.sin(phi) * Math.sin(theta),
        );
      }
      idxs.push(vi, vi + 1, vi + 2, vi, vi + 2, vi + 3);
      vi += 4;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
    geo.setIndex(idxs);
    cellMesh.geometry = geo;
  }

  function spherePlaceCells(cells, col, row) {
    for (const [dx, dy] of cells) {
      const nc = ((col + dx) % SPHERE_COLS + SPHERE_COLS) % SPHERE_COLS;
      const nr = Math.max(0, Math.min(SPHERE_ROWS - 1, row + dy));
      state.sphereAlive.add(key(nc, nr));
    }
  }

  function spherePlacePrefab(id, col, row, opts = {}) {
    const prefab = getPrefabById(id);
    if (!prefab) return;
    const rotate = opts.rotate ?? Number(rotateSelect.value);
    const flipX = opts.flipX ?? flipXInput.checked;
    spherePlaceCells(transformCells(prefab.cells, rotate, flipX), col, row);
  }

  function buildHoverMesh() {
    const { hoverMesh } = sphereThree;
    hoverMesh.geometry.dispose();

    const prefabId = state.draggingPrefabId || state.selectedPrefabId;
    const hover = state.sphereHoverCell;
    if (!hover || !prefabId) {
      hoverMesh.geometry = new THREE.BufferGeometry();
      return;
    }

    const prefab = getPrefabById(prefabId);
    if (!prefab) {
      hoverMesh.geometry = new THREE.BufferGeometry();
      return;
    }

    const cells = transformCells(prefab.cells, Number(rotateSelect.value), flipXInput.checked);
    const R = 5.022;
    const PAD = 0.08;
    const verts = [];
    const idxs = [];
    let vi = 0;

    for (const [dx, dy] of cells) {
      const c = ((hover.col + dx) % SPHERE_COLS + SPHERE_COLS) % SPHERE_COLS;
      const r = Math.max(0, Math.min(SPHERE_ROWS - 1, hover.row + dy));
      const phi1 = ((r + PAD) / SPHERE_ROWS) * Math.PI;
      const phi2 = ((r + 1 - PAD) / SPHERE_ROWS) * Math.PI;
      const theta1 = ((c + PAD) / SPHERE_COLS) * Math.PI * 2;
      const theta2 = ((c + 1 - PAD) / SPHERE_COLS) * Math.PI * 2;
      const corners = [[phi1, theta1], [phi1, theta2], [phi2, theta2], [phi2, theta1]];
      for (const [phi, theta] of corners) {
        verts.push(
          R * Math.sin(phi) * Math.cos(theta),
          R * Math.cos(phi),
          R * Math.sin(phi) * Math.sin(theta),
        );
      }
      idxs.push(vi, vi + 1, vi + 2, vi, vi + 2, vi + 3);
      vi += 4;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
    geo.setIndex(idxs);
    hoverMesh.geometry = geo;
  }

  function initSphereRenderer() {
    const w = sphereCanvas.offsetWidth || 800;
    const h = sphereCanvas.offsetHeight || 600;
    const dpr = window.devicePixelRatio || 1;

    const renderer = new THREE.WebGLRenderer({ canvas: sphereCanvas, antialias: true });
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    renderer.setClearColor(0x07121a);

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100);
    camera.position.z = state.sphereCameraZ;

    const group = new THREE.Group();
    scene.add(group);

    const bgMesh = new THREE.Mesh(
      new THREE.SphereGeometry(5, 128, 64),
      new THREE.MeshBasicMaterial({ color: 0x07121a }),
    );
    group.add(bgMesh);

    const gridLines = createSphereGridLines();
    gridLines.visible = state.showGrid;
    group.add(gridLines);

    const cellMesh = new THREE.Mesh(
      new THREE.BufferGeometry(),
      new THREE.MeshBasicMaterial({ color: 0x8ef2ff, side: THREE.DoubleSide }),
    );
    group.add(cellMesh);

    const hoverMesh = new THREE.Mesh(
      new THREE.BufferGeometry(),
      new THREE.MeshBasicMaterial({ color: 0xf2b84b, transparent: true, opacity: 0.55, side: THREE.DoubleSide }),
    );
    group.add(hoverMesh);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    sphereThree = { renderer, scene, camera, group, bgMesh, gridLines, cellMesh, hoverMesh, raycaster, mouse };
  }

  function renderSphere() {
    if (!sphereThree) return;
    const { renderer, scene, camera, group, gridLines } = sphereThree;
    camera.position.z = state.sphereCameraZ;
    group.rotation.x = state.sphereRotX;
    group.rotation.y = state.sphereRotY;
    gridLines.visible = state.showGrid;
    buildCellMesh();
    buildHoverMesh();
    renderer.render(scene, camera);
  }

  function sphereHitCell(clientX, clientY) {
    if (!sphereThree) return null;
    const { raycaster, camera, bgMesh, mouse } = sphereThree;
    const rect = sphereCanvas.getBoundingClientRect();
    mouse.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObject(bgMesh);
    if (!hits.length) return null;
    const pt = hits[0].point.clone();
    bgMesh.worldToLocal(pt);
    const len = pt.length();
    const phi = Math.acos(Math.max(-1, Math.min(1, pt.y / len)));
    let theta = Math.atan2(pt.z, pt.x);
    if (theta < 0) theta += Math.PI * 2;
    const col = Math.floor((theta / (Math.PI * 2)) * SPHERE_COLS) % SPHERE_COLS;
    const row = Math.max(0, Math.min(SPHERE_ROWS - 1, Math.floor((phi / Math.PI) * SPHERE_ROWS)));
    return { col, row };
  }

  function sphereSetCell(col, row, alive) {
    const k = key(col, row);
    if (alive) {
      state.sphereAlive.add(k);
    } else {
      state.sphereAlive.delete(k);
    }
  }

  function initSphereInput() {
    sphereCanvas.addEventListener("contextmenu", (e) => e.preventDefault());

    sphereCanvas.addEventListener("pointerdown", (e) => {
      sphereCanvas.setPointerCapture(e.pointerId);
      if (e.button === 2) {
        state.sphereDrag = true;
        state.sphereDragLastX = e.clientX;
        state.sphereDragLastY = e.clientY;
      } else if (e.button === 0) {
        const cell = sphereHitCell(e.clientX, e.clientY);
        if (cell) {
          state.spherePaintValue = state.sphereAlive.has(key(cell.col, cell.row)) ? 0 : 1;
          state.spherePaintDown = true;
          sphereSetCell(cell.col, cell.row, state.spherePaintValue === 1);
        }
      }
    });

    sphereCanvas.addEventListener("pointermove", (e) => {
      if (state.sphereDrag) {
        const dx = e.clientX - state.sphereDragLastX;
        const dy = e.clientY - state.sphereDragLastY;
        state.sphereRotY += dx * 0.007;
        state.sphereRotX += dy * 0.007;
        state.sphereRotX = Math.max(-Math.PI * 0.9, Math.min(Math.PI * 0.9, state.sphereRotX));
        state.sphereDragLastX = e.clientX;
        state.sphereDragLastY = e.clientY;
      } else if (state.spherePaintDown) {
        const cell = sphereHitCell(e.clientX, e.clientY);
        if (cell) {
          sphereSetCell(cell.col, cell.row, state.spherePaintValue === 1);
        }
      }
    });

    sphereCanvas.addEventListener("pointerup", (e) => {
      state.sphereDrag = false;
      state.spherePaintDown = false;
      if (sphereCanvas.hasPointerCapture(e.pointerId)) {
        sphereCanvas.releasePointerCapture(e.pointerId);
      }
    });

    sphereCanvas.addEventListener("pointercancel", () => {
      state.sphereDrag = false;
      state.spherePaintDown = false;
    });

    sphereCanvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 0.92 : 1.08;
      state.sphereCameraZ = Math.max(5.6, Math.min(30, state.sphereCameraZ * factor));
    }, { passive: false });

    sphereCanvas.addEventListener("dragover", (e) => {
      e.preventDefault();
      state.sphereHoverCell = sphereHitCell(e.clientX, e.clientY);
      e.dataTransfer.dropEffect = "copy";
    });

    sphereCanvas.addEventListener("dragleave", () => {
      state.sphereHoverCell = null;
    });

    sphereCanvas.addEventListener("drop", (e) => {
      e.preventDefault();
      const id = e.dataTransfer.getData("text/plain") || state.draggingPrefabId;
      const cell = sphereHitCell(e.clientX, e.clientY);
      state.sphereHoverCell = null;
      if (!id || !cell) return;
      spherePlacePrefab(id, cell.col, cell.row);
      state.selectedPrefabId = id;
      refreshPaletteSelection();
      const prefab = getPrefabById(id);
      if (prefab) renderInspector(prefab);
      state.draggingPrefabId = null;
    });
  }

  // --- End sphere mode ---

  function worldToScreen(x, y) {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    return {
      x: (x - state.cameraX) * state.zoom + cx,
      y: (y - state.cameraY) * state.zoom + cy,
    };
  }

  function screenToWorld(px, py) {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    return {
      x: (px - cx) / state.zoom + state.cameraX,
      y: (py - cy) / state.zoom + state.cameraY,
    };
  }

  function screenToGrid(px, py) {
    const w = screenToWorld(px, py);
    return {
      x: Math.floor(w.x),
      y: Math.floor(w.y),
    };
  }

  function drawBackground() {
    ctx.fillStyle = "#0a1b25";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, "rgba(40,130,160,0.06)");
    grad.addColorStop(1, "rgba(255,170,70,0.05)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function drawGrid() {
    if (!state.showGrid || state.zoom < 7) return;
    const left = Math.floor(state.cameraX - canvas.width / (2 * state.zoom)) - 1;
    const right = Math.ceil(state.cameraX + canvas.width / (2 * state.zoom)) + 1;
    const top = Math.floor(state.cameraY - canvas.height / (2 * state.zoom)) - 1;
    const bottom = Math.ceil(state.cameraY + canvas.height / (2 * state.zoom)) + 1;

    ctx.strokeStyle = "rgba(180,220,235,0.12)";
    ctx.lineWidth = 1;
    ctx.beginPath();

    for (let x = left; x <= right; x += 1) {
      const p = worldToScreen(x, 0).x;
      ctx.moveTo(p, 0);
      ctx.lineTo(p, canvas.height);
    }
    for (let y = top; y <= bottom; y += 1) {
      const p = worldToScreen(0, y).y;
      ctx.moveTo(0, p);
      ctx.lineTo(canvas.width, p);
    }

    ctx.stroke();
  }

  function drawCells() {
    const minX = state.cameraX - canvas.width / (2 * state.zoom) - 1;
    const maxX = state.cameraX + canvas.width / (2 * state.zoom) + 1;
    const minY = state.cameraY - canvas.height / (2 * state.zoom) - 1;
    const maxY = state.cameraY + canvas.height / (2 * state.zoom) + 1;

    ctx.fillStyle = "#8ef2ff";
    for (const k of state.alive) {
      const [x, y] = parseKey(k);
      if (x < minX || x > maxX || y < minY || y > maxY) continue;
      const screen = worldToScreen(x, y);
      const pad = Math.max(1, Math.floor(state.zoom * 0.08));
      ctx.fillRect(
        Math.floor(screen.x) + pad,
        Math.floor(screen.y) + pad,
        Math.ceil(state.zoom) - pad * 2,
        Math.ceil(state.zoom) - pad * 2,
      );
    }
  }

  function drawZones() {
    if (state.mode !== "arcade" || !state.levelState) return;
    const zones = [];
    const ls = state.levelState;
    if (ls.receptor) zones.push({ ...ls.receptor, kind: "receptor" });
    if (ls.switches) {
      for (const sw of ls.switches) zones.push({ ...sw, kind: "switch" });
    }
    if (ls.beaconZone) zones.push({ ...ls.beaconZone, kind: "beacon" });
    if (ls.coreBlock) zones.push({ ...ls.coreBlock, kind: "core" });

    for (const z of zones) {
      const topLeft = worldToScreen(z.x, z.y);
      const width = z.w * state.zoom;
      const height = z.h * state.zoom;
      ctx.lineWidth = 2;
      if (z.kind === "receptor") ctx.strokeStyle = z.hit ? "#5be0bc" : "#f2b84b";
      else if (z.kind === "switch") ctx.strokeStyle = z.hit ? "#5be0bc" : "#ff8b5e";
      else if (z.kind === "core") ctx.strokeStyle = "#9cd4ff";
      else ctx.strokeStyle = "#9fd8ae";
      ctx.strokeRect(topLeft.x, topLeft.y, width, height);
    }

    for (const flash of state.zoneFlash) {
      const topLeft = worldToScreen(flash.zone.x, flash.zone.y);
      const width = flash.zone.w * state.zoom;
      const height = flash.zone.h * state.zoom;
      const alpha = Math.max(0, flash.ttl / 16);
      ctx.fillStyle = `rgba(255, 220, 110, ${alpha * 0.35})`;
      ctx.fillRect(topLeft.x, topLeft.y, width, height);
    }
  }

  function drawHover() {
    if (!state.hoverCell) return;
    const p = worldToScreen(state.hoverCell.x, state.hoverCell.y);
    ctx.strokeStyle = "rgba(242,184,75,0.9)";
    ctx.lineWidth = 2;
    ctx.strokeRect(p.x, p.y, state.zoom, state.zoom);

    if (!state.draggingPrefabId) return;
    const prefab = getPrefabById(state.draggingPrefabId);
    if (!prefab) return;
    const transformed = transformCells(prefab.cells, Number(rotateSelect.value), flipXInput.checked);
    ctx.fillStyle = "rgba(242,184,75,0.45)";
    for (const [dx, dy] of transformed) {
      const q = worldToScreen(state.hoverCell.x + dx, state.hoverCell.y + dy);
      ctx.fillRect(q.x + 1, q.y + 1, state.zoom - 2, state.zoom - 2);
    }
  }

  function draw() {
    drawBackground();
    drawGrid();
    drawCells();
    drawZones();
    drawHover();
  }

  function updateHud() {
    const pop = state.mode === "sphere" ? state.sphereAlive.size : state.alive.size;
    genOut.textContent = String(state.generation);
    popOut.textContent = String(pop);
    scoreOut.textContent = String(state.score);
    comboOut.textContent = `x${state.combo}`;
    speedOut.textContent = String(state.stepsPerSecond);

    if (state.mode === "arcade" && state.levelState) {
      const level = LEVELS[state.levelIndex];
      objectiveText.textContent = `${level.objective} ${level.progress(state.levelState)}`;
    } else if (state.mode === "sphere") {
      objectiveText.textContent = "Sphere: left-click to draw cells, right-drag to spin.";
    } else {
      objectiveText.textContent = "Sandbox: draw, drop, and experiment.";
    }
  }

  function runTick(now) {
    if (!runTick.last) runTick.last = now;
    const dt = (now - runTick.last) / 1000;
    runTick.last = now;

    if (state.mode === "sphere") {
      if (state.running) {
        state.tickCarry += dt;
        const stepInterval = 1 / state.stepsPerSecond;
        while (state.tickCarry >= stepInterval) {
          stepLifeSphere();
          state.tickCarry -= stepInterval;
        }
      }
      if (sphereThree) renderSphere();
    } else {
      if (state.running) {
        state.tickCarry += dt;
        const stepInterval = 1 / state.stepsPerSecond;
        while (state.tickCarry >= stepInterval) {
          stepLife();
          state.tickCarry -= stepInterval;
        }
      }
      draw();
    }

    updateHud();
    requestAnimationFrame(runTick);
  }

  function seedFromPattern(id, x, y, opts) {
    placePrefab(id, x, y, opts);
  }

  function loadDemo() {
    clearBoard();
    state.mode = "sandbox";
    modeSelect.value = "sandbox";
    canvas.style.display = "block";
    sphereCanvas.style.display = "none";
    state.cameraX = 0;
    state.cameraY = 0;

    seedFromPattern("gosper", -58, -15);
    seedFromPattern("gosper", 22, 16, { rotate: 180 });
    seedFromPattern("lwss", -12, 22);
    seedFromPattern("glider", -30, -24);
    seedFromPattern("glider", -26, -21);
    seedFromPattern("glider", -23, -18);
    seedFromPattern("eater1", 12, -10);
    seedFromPattern("beacon", 2, 6);
    seedFromPattern("pinwheel-seed", -6, -4);
    seedFromPattern("spark-crab", 18, 4);
    setOverlay("Demo loaded: dual gun crossfire in the lab.");
    setTimeout(() => setOverlay(""), 2200);
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (sphereThree && state.mode === "sphere") {
      const w = sphereCanvas.offsetWidth;
      const h = sphereCanvas.offsetHeight;
      if (w > 0 && h > 0) {
        sphereThree.renderer.setSize(w, h, false);
        sphereThree.camera.aspect = w / h;
        sphereThree.camera.updateProjectionMatrix();
      }
    }
  }

  function handlePointerDown(ev) {
    canvas.setPointerCapture(ev.pointerId);
    state.pointer.down = true;
    state.pointer.lastX = ev.clientX;
    state.pointer.lastY = ev.clientY;

    if (state.keys.spaceDown || ev.button === 1) {
      state.pointer.mode = "pan";
      return;
    }

    if (ev.button !== 0) return;
    const rect = canvas.getBoundingClientRect();
    const gxgy = screenToGrid(ev.clientX - rect.left, ev.clientY - rect.top);
    state.pointer.mode = "paint";
    state.pointer.paintValue = isAlive(gxgy.x, gxgy.y) ? 0 : 1;
    setCell(gxgy.x, gxgy.y, state.pointer.paintValue === 1);
  }

  function handlePointerMove(ev) {
    const rect = canvas.getBoundingClientRect();
    state.hoverCell = screenToGrid(ev.clientX - rect.left, ev.clientY - rect.top);

    if (!state.pointer.down) return;

    const dx = ev.clientX - state.pointer.lastX;
    const dy = ev.clientY - state.pointer.lastY;
    state.pointer.lastX = ev.clientX;
    state.pointer.lastY = ev.clientY;

    if (state.pointer.mode === "pan") {
      state.cameraX -= dx / state.zoom;
      state.cameraY -= dy / state.zoom;
      return;
    }

    if (state.pointer.mode === "paint") {
      const gxgy = screenToGrid(ev.clientX - rect.left, ev.clientY - rect.top);
      setCell(gxgy.x, gxgy.y, state.pointer.paintValue === 1);
    }
  }

  function handlePointerUp(ev) {
    if (canvas.hasPointerCapture(ev.pointerId)) {
      canvas.releasePointerCapture(ev.pointerId);
    }
    state.pointer.down = false;
    state.pointer.mode = null;
  }

  function handleWheel(ev) {
    ev.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mx = ev.clientX - rect.left;
    const my = ev.clientY - rect.top;

    const before = screenToWorld(mx, my);
    const zoomFactor = ev.deltaY < 0 ? 1.1 : 0.9;
    state.zoom = Math.max(4, Math.min(60, state.zoom * zoomFactor));
    const after = screenToWorld(mx, my);

    state.cameraX += before.x - after.x;
    state.cameraY += before.y - after.y;
  }

  function setOverlay(msg) {
    state.message = msg;
    if (msg) {
      overlayMessage.textContent = msg;
      overlayMessage.classList.remove("hidden");
    } else {
      overlayMessage.classList.add("hidden");
    }
  }

  function anyAliveInZone(zone) {
    for (let y = zone.y; y < zone.y + zone.h; y += 1) {
      for (let x = zone.x; x < zone.x + zone.w; x += 1) {
        if (isAlive(x, y)) return true;
      }
    }
    return false;
  }

  function countAliveInZone(zone) {
    let count = 0;
    for (let y = zone.y; y < zone.y + zone.h; y += 1) {
      for (let x = zone.x; x < zone.x + zone.w; x += 1) {
        if (isAlive(x, y)) count += 1;
      }
    }
    return count;
  }

  function registerArcadeEvent(kind, baseScore, zone) {
    state.score += Math.floor(baseScore * state.combo);
    state.combo = Math.min(8, state.combo + 1);
    state.comboTimer = 36;
    state.zoneFlash.push({ zone, ttl: 16, kind });
  }

  function startLevel(index) {
    clearBoard();
    state.mode = "arcade";
    modeSelect.value = "arcade";
    canvas.style.display = "block";
    sphereCanvas.style.display = "none";
    state.levelIndex = index;
    levelSelect.value = String(index);
    state.cameraX = 0;
    state.cameraY = 0;
    state.zoom = 16;
    const level = LEVELS[index];
    state.levelState = level.setup();
    state.score = 0;
    state.combo = 1;
    state.comboTimer = 0;
    setOverlay(`${level.name}: ${level.vibe}`);
    setTimeout(() => setOverlay(""), 2800);
    updateHud();
  }

  function evaluateArcadeState() {
    const level = LEVELS[state.levelIndex];
    if (!level || !state.levelState) return;
    const result = level.evaluate(state.levelState);
    if (!result) return;
    state.running = false;
    document.getElementById("playBtn").textContent = "Play";
    if (result.win) {
      state.score += 300;
      setOverlay(`${result.msg}\nScore: ${state.score}\nPress Start Level for next run.`);
    } else if (result.fail) {
      setOverlay(`${result.msg}\nPress Start Level to retry.`);
    }
  }

  function buildPalette() {
    for (const prefab of PREFABS) {
      const card = document.createElement("article");
      card.className = "palette-card";
      card.draggable = true;
      card.dataset.prefabId = prefab.id;
      card.innerHTML = `
        <strong>${prefab.name}</strong>
        <div class="meta"><span>${prefab.category}</span><span>${prefab.type}</span></div>
        <small>${prefab.desc}</small>
      `;

      card.addEventListener("click", () => {
        state.selectedPrefabId = prefab.id;
        refreshPaletteSelection();
        renderInspector(prefab);
      });

      card.addEventListener("dragstart", (ev) => {
        state.draggingPrefabId = prefab.id;
        ev.dataTransfer.setData("text/plain", prefab.id);
        ev.dataTransfer.effectAllowed = "copy";
      });

      card.addEventListener("dragend", () => {
        state.draggingPrefabId = null;
      });

      paletteList.appendChild(card);
    }

    state.selectedPrefabId = PREFABS[0].id;
    refreshPaletteSelection();
    renderInspector(PREFABS[0]);
  }

  function refreshPaletteSelection() {
    const cards = paletteList.querySelectorAll(".palette-card");
    cards.forEach((card) => {
      card.classList.toggle("active", card.dataset.prefabId === state.selectedPrefabId);
    });
  }

  function renderInspector(prefab) {
    const width = Math.max(...prefab.cells.map((c) => c[0])) + 1;
    const height = Math.max(...prefab.cells.map((c) => c[1])) + 1;
    inspectorBody.innerHTML = `
      <h3>${prefab.name}</h3>
      <p>${prefab.desc}</p>
      <p><strong>Type:</strong> ${prefab.type}</p>
      <p><strong>Footprint:</strong> ${width} x ${height}</p>
      <p><strong>Nominal period:</strong> ${prefab.period}</p>
      <p><strong>Tip:</strong> ${prefab.tip}</p>
    `;
  }

  function setupControls() {
    document.getElementById("playBtn").addEventListener("click", () => {
      state.running = !state.running;
      document.getElementById("playBtn").textContent = state.running ? "Pause" : "Play";
    });

    document.getElementById("stepBtn").addEventListener("click", () => {
      if (state.mode === "sphere") {
        stepLifeSphere();
        if (sphereThree) renderSphere();
      } else {
        stepLife();
        draw();
      }
      updateHud();
    });

    document.getElementById("clearBtn").addEventListener("click", () => {
      clearBoard();
    });

    document.getElementById("demoBtn").addEventListener("click", () => {
      loadDemo();
    });

    speedInput.addEventListener("input", () => {
      state.stepsPerSecond = Number(speedInput.value);
      speedOut.textContent = String(state.stepsPerSecond);
    });

    modeSelect.addEventListener("change", () => {
      state.mode = modeSelect.value;
      if (state.mode === "sphere") {
        canvas.style.display = "none";
        sphereCanvas.style.display = "block";
        if (!sphereThree) {
          initSphereRenderer();
          initSphereInput();
        } else {
          const w = sphereCanvas.offsetWidth;
          const h = sphereCanvas.offsetHeight;
          sphereThree.renderer.setSize(w, h, false);
          sphereThree.camera.aspect = w / h;
          sphereThree.camera.updateProjectionMatrix();
        }
        state.levelState = null;
        setOverlay("");
      } else {
        canvas.style.display = "block";
        sphereCanvas.style.display = "none";
        if (state.mode === "sandbox") {
          state.levelState = null;
          setOverlay("");
        }
      }
      updateHud();
    });

    rotateSelect.addEventListener("change", () => {
      draw();
    });
    flipXInput.addEventListener("change", () => {
      draw();
    });

    for (let i = 0; i < LEVELS.length; i += 1) {
      const opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = LEVELS[i].name;
      levelSelect.appendChild(opt);
    }

    levelSelect.addEventListener("change", () => {
      state.levelIndex = Number(levelSelect.value);
    });

    document.getElementById("startLevelBtn").addEventListener("click", () => {
      startLevel(Number(levelSelect.value));
    });
  }

  function setupCanvasInput() {
    canvas.addEventListener("contextmenu", (ev) => ev.preventDefault());
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointercancel", handlePointerUp);
    canvas.addEventListener("wheel", handleWheel, { passive: false });

    canvas.addEventListener("dragover", (ev) => {
      ev.preventDefault();
      const rect = canvas.getBoundingClientRect();
      state.hoverCell = screenToGrid(ev.clientX - rect.left, ev.clientY - rect.top);
      ev.dataTransfer.dropEffect = "copy";
    });

    canvas.addEventListener("drop", (ev) => {
      ev.preventDefault();
      const id = ev.dataTransfer.getData("text/plain") || state.draggingPrefabId;
      if (!id) return;
      const rect = canvas.getBoundingClientRect();
      const target = screenToGrid(ev.clientX - rect.left, ev.clientY - rect.top);
      placePrefab(id, target.x, target.y);
      state.selectedPrefabId = id;
      refreshPaletteSelection();
      const prefab = getPrefabById(id);
      if (prefab) renderInspector(prefab);
      state.draggingPrefabId = null;
      if (state.mode === "arcade") {
        state.score = Math.max(0, state.score - 8);
      }
    });
  }

  function setupShortcuts() {
    window.addEventListener("keydown", (ev) => {
      if (ev.code === "Space") {
        if (!state.keys.spaceDown) {
          state.running = !state.running;
          document.getElementById("playBtn").textContent = state.running ? "Pause" : "Play";
        }
        state.keys.spaceDown = true;
        ev.preventDefault();
        return;
      }

      if (ev.target && ["INPUT", "SELECT", "TEXTAREA"].includes(ev.target.tagName)) {
        return;
      }

      if (ev.key.toLowerCase() === "n") {
        if (state.mode === "sphere") {
          stepLifeSphere();
          if (sphereThree) renderSphere();
          updateHud();
        } else {
          stepLife();
        }
      } else if (ev.key.toLowerCase() === "c") {
        clearBoard();
      } else if (ev.key.toLowerCase() === "d") {
        loadDemo();
      } else if (ev.key.toLowerCase() === "r") {
        const values = [0, 90, 180, 270];
        const current = Number(rotateSelect.value);
        const idx = (values.indexOf(current) + 1) % values.length;
        rotateSelect.value = String(values[idx]);
      } else if (ev.key.toLowerCase() === "f") {
        flipXInput.checked = !flipXInput.checked;
      } else if (ev.key.toLowerCase() === "g") {
        state.showGrid = !state.showGrid;
      } else if (ev.key === "1") {
        state.mode = "sandbox";
        modeSelect.value = "sandbox";
        canvas.style.display = "block";
        sphereCanvas.style.display = "none";
      } else if (ev.key === "2") {
        state.mode = "arcade";
        modeSelect.value = "arcade";
        canvas.style.display = "block";
        sphereCanvas.style.display = "none";
      } else if (ev.key === "3") {
        state.mode = "sphere";
        modeSelect.value = "sphere";
        modeSelect.dispatchEvent(new Event("change"));
      } else if (ev.key.toLowerCase() === "p") {
        const id = state.selectedPrefabId;
        if (id && state.hoverCell) {
          placePrefab(id, state.hoverCell.x, state.hoverCell.y);
        }
      }
    });

    window.addEventListener("keyup", (ev) => {
      if (ev.code === "Space") {
        state.keys.spaceDown = false;
      }
    });
  }

  function init() {
    setupControls();
    setupCanvasInput();
    setupShortcuts();
    buildPalette();
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    loadDemo();
    requestAnimationFrame(runTick);
  }

  init();
})();
