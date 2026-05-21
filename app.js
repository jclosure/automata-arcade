(() => {
  const canvas = document.getElementById("lifeCanvas");
  const ctx = canvas.getContext("2d");
  const sphereCanvas = document.getElementById("sphereCanvas");
  const sharedStateInput = document.getElementById("sharedStateInput");

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
  const guideCard = document.getElementById("guideCard");
  const guideConcept = document.getElementById("guideConcept");
  const guideBody = document.getElementById("guideBody");
  const guideHints = document.getElementById("guideHints");
  const guideHintBtn = document.getElementById("guideHintBtn");
  const tlTrack = document.getElementById("tlTrack");
  const tlProgress = document.getElementById("tlProgress");
  const tlThumb = document.getElementById("tlThumb");
  const tlGenCur = document.getElementById("tlGenCur");
  const tlGenMax = document.getElementById("tlGenMax");
  const tlSpeed = document.getElementById("tlSpeed");
  const tlSpeedLabel = document.getElementById("tlSpeedLabel");
  const tlPlayPause = document.getElementById("tlPlayPause");
  const tlRevPlay = document.getElementById("tlRevPlay");
  const ruleInputEl = document.getElementById("ruleInput");
  const kernelShapeEl = document.getElementById("kernelShape");
  const kernelRadiusEl = document.getElementById("kernelRadius");
  const kernelRadiusOut = document.getElementById("kernelRadiusOut");

  const state = {
    sharedState: false,
    alive: new Set(), // shared game state (all modes)
    // per-mode alive sets used when sharedState is false
    modeAlive: {
      sandbox: new Set(), arcade: new Set(), sphere: new Set(),
      torus: new Set(), klein: new Set(), mobius: new Set(), cylinder: new Set(),
    },
    generation: 0,
    running: false,
    stepsPerSecond: Number(speedInput.value),
    cameraX: 90,
    cameraY: 45,
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
    _prefabStamp: null,  // { id, rotate, flipX } while in prefab stamp mode
    mode: "sandbox",
    score: 0,
    combo: 1,
    comboTimer: 0,
    levelIndex: 0,
    levelState: null,
    message: "",
    tickCarry: 0,
    zoneFlash: [],
    guide: { hintsRevealed: 0, hints: [] },
    histFrames: [],
    histCursor: -1,
    playReverse: false,
    ruleB: new Set([3]),
    ruleS: new Set([2, 3]),
    kernelShape: "moore",
    kernelRadius: 1,
    driftX: 0,
    driftY: 0,
    colorByAge: false,
    showTrails: false,
    trailDecay: 0.88,
    showHints: true,
    hintDuration: 10,
    manifoldRegions: [],
    manifoldOverlapProtocol: 'A',  // 'A' = last-wins, 'B' = compose (non-commutative)
    manifoldKernelInherit: true,
    _manifoldIdSeq: 0,
    _manifoldSelected: null,       // id of selected region
    _manifoldDrag: null,           // {x0,y0,x1,y1} while dragging a new region rect
    _manifoldDragMode: null,       // 'move'|'resize-nw'|... while moving/resizing
    _manifoldDragOrigin: null,     // {mx,my,rx,ry,rw,rh} snapshot for drag math
    christoffelVis: false,
    christoffelComponent: 'magnitude', // 'magnitude'|'gaussian'|'G0'..'G5'
    christoffelModStrength: 1.0,       // curvature modulation multiplier (K × this → N shift)
    repulseEnabled: false,
    repulseAge: 20,
    repulseStrength: 1,
    contigRepulseEnabled: false,
    contigRepulseRadius: 30,
    contigRepulseForce: 1.0,
    contigMinSize: 5,
    ruleB2: new Set([3, 6]),
    ruleS2: new Set([2, 3]),
    ruleCycleActive: false,
    ruleCyclePeriod: 60,
    _ruleDirty: false,
    leniaMode: false,
    leniaDecay: 0.95,
    leniaMu: 0.15,
    leniaSigma: 0.017,
    leniaTimeStep: 0.1,
    cellTypesEnabled: false,
    paintType: 0,
    typeAColor: "#5be0bc",
    typeBColor: "#f2b84b",
    typeARuleB: new Set([3]),
    typeARuleS: new Set([2, 3]),
    typeBRuleB: new Set([3, 6]),
    typeBRuleS: new Set([2, 3]),
    heatmapMode: false,
    heatmapOverlay: false,
    entrenchEnabled: false,
    entrenchThreshold: 8,
    adaptRulesEnabled: false,
    adaptTarget: 400,
    adaptRate: 80,
    _adaptPrevPop: 0,
    zones: [],             // [{id,x,y,w,h,ruleB,ruleS,name,color}] in grid coords
    _zoneIdSeq: 0,
    _zoneSelected: null,   // id of selected zone
    _zoneDrawing: null,    // {x0,y0,x1,y1} while drag-drawing
    _zoneDragMode: null,   // null | "move" | "resize-nw"|"resize-n"|...|"resize-se"
    _zoneDragOrigin: null, // {mx,my,zx,zy,zw,zh} snapshot at drag start
    forceFields: [],
    _ffIdSeq: 0,
    _ffSelected: null,
    _ffDragMode: null,   // null | "move" | "resize" | "draw"
    _ffDragOrigin: null,
    _ffDrawing: null,    // {cx,cy,r} while drag-drawing
    lenses: [],
    _lensSelected: null,
    canvasMode: "paint",  // "paint" | "move" | "select" | "object" | "force" | "zone" | "lens"
    _prevCanvasMode: null, // mode to restore when leaving object mode
    forcePaintType: "attract",
    forcePaintRadius: 15,
    forcePaintStrength: 3,
    densityFeedback: false,
    densityTarget: 500,
    densityStrength: 1,
    selection: null,
    _selStartCell: null,
    _selCells: null,
    _selMoving: false,
    _selMoveOriginCell: null,
    _selMoveDelta: { dx: 0, dy: 0 },
    _clipboard: null,
    notebook: {
      entries: [],
      open: false,
      pinMode: false,
      _pendingPin: null,
      autoEnabled: false,
      _watch: { lastPop: -1, peakPop: 0, stableSince: null, stableLogged: false, lastAutoGen: -Infinity },
      _nextId: 1,
      _colorIdx: 0,
      scenePlaying: false,
      _sceneTimer: null,
    },
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
  const MAX_HIST = 600;
  const SPEED_TIERS = [1, 2, 4, 8, 15, 25, 30];
  const SPEED_LABELS  = ["1×", "2×", "4×", "8×", "15×", "25×", "30×"];
  const ZONE_COLORS   = ['#ff6b9d','#ffa96b','#6bffa9','#6bbfff','#c56bff','#ffe06b','#ff6b6b','#6bffee'];
  const _ffExpanded   = new Set();  // field IDs with detail panel open
  const NB_COLORS = ['#5be0bc', '#f2b84b', '#e05b7a', '#9b7be8', '#5bc4e0', '#e0c45b'];
  const LS_NOTEBOOK = 'aa_notebook';

  // Precomputed age→color gradient: teal (newborn) → amber → warm white (ancient)
  const AGE_COLORS = (() => {
    const out = [];
    for (let i = 0; i <= 100; i++) {
      let r, g, b;
      if (i < 10) {
        const t = i / 10;
        r = Math.round(91 + 151 * t);
        g = Math.round(224 - 40 * t);
        b = Math.round(188 - 113 * t);
      } else if (i < 50) {
        const t = (i - 10) / 40;
        r = Math.round(242 + 13 * t);
        g = Math.round(184 + 56 * t);
        b = Math.round(75 + 129 * t);
      } else {
        r = 255; g = 240; b = 204;
      }
      out.push(`rgb(${r},${g},${b})`);
    }
    return out;
  })();

  // Precomputed Lenia value→color gradient: black → deep-violet → teal → amber → white
  const LENIA_COLORS = (() => {
    const out = [];
    for (let i = 0; i <= 100; i++) {
      let r, g, b;
      if (i < 20) {
        const t = i / 20;
        r = Math.round(20 * t);
        g = 0;
        b = Math.round(60 * t);
      } else if (i < 50) {
        const t = (i - 20) / 30;
        r = Math.round(20 + 71 * t);
        g = Math.round(110 * t);
        b = Math.round(60 + 128 * t);
      } else if (i < 80) {
        const t = (i - 50) / 30;
        r = Math.round(91 + 151 * t);
        g = Math.round(110 + 114 * t);
        b = Math.round(188 - 113 * t);
      } else {
        const t = (i - 80) / 20;
        r = 255;
        g = Math.round(224 + 16 * t);
        b = Math.round(75 + 129 * t);
      }
      out.push(`rgb(${r},${g},${b})`);
    }
    return out;
  })();

  // Precomputed heatmap gradient: transparent → navy → teal → amber → hot-white
  const HEAT_COLORS = (() => {
    const out = [];
    for (let i = 0; i <= 100; i++) {
      let r, g, b, a;
      if (i < 15) {
        const t = i / 15;
        r = 0; g = Math.round(30 * t); b = Math.round(100 * t); a = t * 0.6;
      } else if (i < 40) {
        const t = (i - 15) / 25;
        r = Math.round(0 + 91 * t); g = Math.round(30 + 194 * t); b = Math.round(100 + 88 * t); a = 0.6 + t * 0.2;
      } else if (i < 75) {
        const t = (i - 40) / 35;
        r = Math.round(91 + 151 * t); g = Math.round(224 - 40 * t); b = Math.round(188 - 113 * t); a = 0.8 + t * 0.15;
      } else {
        const t = (i - 75) / 25;
        r = 255; g = Math.round(184 + 71 * t); b = Math.round(75 + 129 * t); a = 0.95 + t * 0.05;
      }
      out.push(`rgba(${r},${g},${b},${a.toFixed(2)})`);
    }
    return out;
  })();

  let sphereThree = null;
  let manifoldThree = null;
  const _manifoldViewports = new Map(); // regionId → ManifoldViewport
  let _threeRenderer = null;
  let threeDInputSetup = false;
  let _kernelOffsets = null;
  let _kernelCacheKey = null;
  let _driftAccX = 0;
  let _driftAccY = 0;
  let cellAgeMap = new Map();
  let trailMap = new Map();
  let _contigAccum = new Map();
  let valueMap = new Map();
  let typeMap = new Map();
  let _syncActivePreset = () => {};
  let _ruleInput2El = null;
  let heatMap = new Map();
  let entrenchMap = new Map();

  // Lens state
  let _lensIdSeq = 0;
  let _lensOffscreen = null;
  let _lensDragOp = null; // { type: 'draw'|'move'|'resize', id?, startX, startY, origCx?, origCy?, origR? }
  let _lensZoomDefault = 4;

  // Script Kernel state
  let _scriptCells = [];
  let _scriptIdSeq = 0;
  const LS_SCRIPT = 'aa_script_v2';
  const _kernel = {
    globals: Object.create(null),
    hooks: { afterStep: new Set(), beforeDraw: new Set(), afterDraw: new Set() },
  };
  let _hookRegistry = []; // { id, hookName, cellId, enabled, fn }
  let _hookIdSeq = 0;
  let _hooksPaused = false;

  // Command mode state
  let _cmdModeCell   = null;  // selected cell id, or null when not in command mode
  let _cmdClipboard  = null;  // { code } for cut/copy/paste
  let _cmdDeletedStack = [];  // [{idx, code}] for undo (Z)
  let _cmdDPending   = false; let _cmdDTimer = null; // DD = delete
  let _cmdIPending   = false; let _cmdITimer = null; // II = pause hooks
  let _cmd0Pending   = false; let _cmd0Timer = null; // 00 = clear output

  // Sidebar state
  let _sidebarCollapsed = false;
  let _rightW = 300;
  function _syncTlBottom() {
    const panel = document.getElementById("scriptPanel");
    if (!panel) return;
    const h = panel.getBoundingClientRect().height;
    document.documentElement.style.setProperty("--tl-bottom", Math.max(0, h - 1) + "px");
  }

  function _toggleScriptPanel() {
    const panel = document.getElementById("scriptPanel");
    const btn   = document.getElementById("scriptDrawerToggle");
    const sel   = document.getElementById("scriptSampleSelect");
    if (!panel) return;
    const collapsed = panel.classList.toggle("bp-collapsed");
    if (btn) btn.textContent = collapsed ? "▲" : "▼";
    if (sel) sel.disabled = collapsed;
    if (collapsed) _exitCmdMode();
    requestAnimationFrame(_syncTlBottom);
    if (!collapsed) {
      // CodeMirror can't measure dimensions while bp-body is display:none.
      // Refresh all editors now that the panel is visible.
      requestAnimationFrame(() => {
        for (const cell of _scriptCells) cell.editor?.refresh();
      });
    }
  }

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

  const CIRCUIT_PREFABS = [
    // --- Still lifes: stable building blocks ---
    {
      id: "block",
      name: "Block",
      type: "still",
      category: "Circuit",
      desc: "Simplest 2×2 still life. Stable under all conditions.",
      tip: "Use as a wire anchor, eater support, or gate terminus. Almost every circuit contains at least one.",
      period: 1,
      cells: [[0,0],[1,0],[0,1],[1,1]],
    },
    {
      id: "tub",
      name: "Tub",
      type: "still",
      category: "Circuit",
      desc: "4-cell diamond still life.",
      tip: "Compact spacer between active components. Won't interact with distant gliders.",
      period: 1,
      cells: [[1,0],[0,1],[2,1],[1,2]],
    },
    {
      id: "beehive",
      name: "Beehive",
      type: "still",
      category: "Circuit",
      desc: "6-cell still life. Commonly appears as a natural byproduct of glider collisions.",
      tip: "Often the stable residue after a gate fires — useful to recognise in circuit debugging.",
      period: 1,
      cells: [[1,0],[2,0],[0,1],[3,1],[1,2],[2,2]],
    },
    {
      id: "loaf",
      name: "Loaf",
      type: "still",
      category: "Circuit",
      desc: "7-cell asymmetric still life.",
      tip: "Appears in some gate constructions as a stable reaction product.",
      period: 1,
      cells: [[1,0],[2,0],[0,1],[3,1],[1,2],[3,2],[2,3]],
    },
    // --- Oscillators: timing and clocking ---
    {
      id: "blinker",
      name: "Blinker",
      type: "oscillator",
      category: "Circuit",
      desc: "Simplest period-2 oscillator. Alternates between horizontal and vertical.",
      tip: "Place on a glider path at the right phase to gate or deflect the signal.",
      period: 2,
      cells: [[0,0],[1,0],[2,0]],
    },
    {
      id: "pulsar",
      name: "Pulsar",
      type: "oscillator",
      category: "Circuit",
      desc: "Period-3 oscillator, 48 cells. The most common large natural oscillator.",
      tip: "Its size and symmetry make it easy to spot. Use as a visual timing reference.",
      period: 3,
      cells: [
        [2,0],[3,0],[4,0],[8,0],[9,0],[10,0],
        [0,2],[5,2],[7,2],[12,2],
        [0,3],[5,3],[7,3],[12,3],
        [0,4],[5,4],[7,4],[12,4],
        [2,5],[3,5],[4,5],[8,5],[9,5],[10,5],
        [2,7],[3,7],[4,7],[8,7],[9,7],[10,7],
        [0,8],[5,8],[7,8],[12,8],
        [0,9],[5,9],[7,9],[12,9],
        [0,10],[5,10],[7,10],[12,10],
        [2,12],[3,12],[4,12],[8,12],[9,12],[10,12],
      ],
    },
    {
      id: "pentadecathlon",
      name: "Pentadecathlon",
      type: "oscillator",
      category: "Circuit",
      desc: "Period-15 oscillator, 18 cells. The longest-period common small oscillator.",
      tip: "Its p15 period can be combined with the p30 Gosper gun for synchronised signal logic.",
      period: 15,
      cells: [
        [2,0],
        [1,1],[3,1],
        [0,2],[4,2],[0,3],[4,3],[0,4],[4,4],
        [0,5],[4,5],[0,6],[4,6],[0,7],[4,7],
        [1,8],[3,8],
        [2,9],
      ],
    },
    // --- Seeds: signal generators and stress tests ---
    {
      id: "r-pentomino",
      name: "R-Pentomino",
      type: "seed",
      category: "Circuit",
      desc: "5-cell seed that lives 1103 generations and emits 6 escaping gliders.",
      tip: "Good for flooding a region with gliders to stress-test circuit defences.",
      period: 1103,
      cells: [[1,0],[2,0],[0,1],[1,1],[1,2]],
    },
    {
      id: "acorn",
      name: "Acorn",
      type: "seed",
      category: "Circuit",
      desc: "7-cell seed that lives 5206 generations and produces 13 gliders, 4 LWSSes.",
      tip: "Drop in open space to seed a complex environment. Unpredictable in constrained areas.",
      period: 5206,
      cells: [[1,0],[3,1],[0,2],[1,2],[4,2],[5,2],[6,2]],
    },
    {
      id: "die-hard",
      name: "Die Hard",
      type: "seed",
      category: "Circuit",
      desc: "7-cell methuselah that vanishes entirely at generation 130.",
      tip: "Useful for timed one-shot events — it self-destructs cleanly with no residue.",
      period: 130,
      cells: [[6,0],[0,1],[1,1],[1,2],[5,2],[6,2],[7,2]],
    },
    // --- Logic carriers ---
    {
      id: "herschel",
      name: "Herschel",
      type: "machine",
      category: "Circuit",
      desc: "7-cell signal carrier. Quickly emits a glider then stabilises — the primitive of Herschel conduits.",
      tip: "Chain conduits to route a Herschel signal around corners without information loss.",
      period: 1,
      cells: [[0,0],[0,1],[1,1],[2,1],[1,2],[1,3],[2,3]],
    },
    // --- Gates and signal logic (all verified by simulation) ---
    {
      id: "signal-train",
      name: "Signal Train",
      type: "machine",
      category: "Circuit",
      desc: "Three SE-moving gliders spaced at p30 Gosper-gun intervals. Represents one period of a glider stream.",
      tip: "Stamp near a Gosper gun output to visualise the signal spacing before wiring a gate.",
      period: 30,
      cells: [
        // Glider 1 at (0,0)
        [1,0],[2,1],[0,2],[1,2],[2,2],
        // Glider 2 at +8 diagonal
        [9,8],[10,9],[8,10],[9,10],[10,10],
        // Glider 3 at +16 diagonal
        [17,16],[18,17],[16,18],[17,18],[18,18],
      ],
    },
    {
      id: "annihilator",
      name: "Annihilator",
      type: "machine",
      category: "Circuit",
      desc: "SE + NW gliders on collision course — both vanish completely. The atom of signal cancellation.",
      tip: "Core of a NOT gate: put the NW glider on the path of a clock stream to block it when your input fires.",
      period: 1,
      cells: [
        // SE glider
        [1,0],[2,1],[0,2],[1,2],[2,2],
        // NW glider — arrives from ahead, both annihilate
        [12,12],[12,13],[13,12],[13,14],[14,12],
      ],
    },
    {
      id: "turn-gate",
      name: "Turn Gate",
      type: "machine",
      category: "Circuit",
      desc: "SE + SW gliders collide and produce a single NE output glider. Two signals in, one redirected out.",
      tip: "Place a Gosper gun (SE) and another gun (SW) aimed here. Output stream emerges heading NE.",
      period: 1,
      cells: [
        // SE glider
        [1,0],[2,1],[0,2],[1,2],[2,2],
        // SW glider — collides from below-right, redirects both into NE
        [1,4],[2,3],[3,3],[3,4],[3,5],
      ],
    },
    {
      id: "gosper-nw",
      name: "Gosper Gun (NW)",
      type: "gun",
      category: "Circuit",
      desc: "Gosper glider gun rotated 180° — fires NW gliders instead of SE. Period 30.",
      tip: "Aim this at an SE gun stream to build a NOT gate: the NW gliders annihilate the SE clock.",
      period: 30,
      cells: [
        [22,0],[23,0],[20,1],[24,1],
        [11,2],[19,2],[25,2],
        [11,3],[13,3],[18,3],[19,3],[21,3],[25,3],[34,3],[35,3],
        [14,4],[15,4],[19,4],[25,4],[34,4],[35,4],
        [0,5],[1,5],[14,5],[15,5],[20,5],[24,5],
        [0,6],[1,6],[14,6],[15,6],[22,6],[23,6],
        [11,7],[13,7],[11,8],
      ],
    },
  ];

  const PREFABS = [...REQUIRED_PREFABS, ...CUSTOM_PREFABS, ...CIRCUIT_PREFABS];

  const LEVELS = [
    {
      name: "L1 Courier Duty",
      vibe: "Shift A begins. Deliver a glider signal to the receptor bay.",
      objective: "Hit the receptor zone within 180 generations.",
      genLimit: 180,
      setup() {
        seedFromPattern("mini-lab", 68, 35);
        return {
          type: "receptor",
          receptor: { x: 126, y: 37, w: 6, h: 6, hit: false },
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
        seedFromPattern("beacon", 88, 43);
        seedFromPattern("eater1", 74, 41);
        seedFromPattern("toad", 100, 47);
        return {
          type: "beacon",
          targetGenerations: 120,
          aliveGenerations: 0,
          beaconZone: { x: 86, y: 41, w: 10, h: 10 },
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
        seedFromPattern("glider", 65, 37, { rotate: 90 });
        seedFromPattern("drift-fork", 80, 43);
        return {
          type: "switches",
          switches: [
            { x: 114, y: 31, w: 6, h: 6, hit: false },
            { x: 114, y: 55, w: 6, h: 6, hit: false },
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
        seedFromPattern("pulse-seed", 70, 37);
        seedFromPattern("clock-seed", 104, 49);
        seedFromPattern("pinwheel-seed", 88, 43);
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
        const pop = activeAlive().size;
        if (pop >= levelState.low && pop <= levelState.high) {
          levelState.stableCount += 1;
          if (levelState.stableCount % 25 === 0) {
            registerArcadeEvent("tempo", 120, { x: 88, y: 43, w: 4, h: 4 });
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
        seedFromPattern("mini-lab", 60, 37);
        seedFromPattern("gosper", 45, 25);
        placeCells(
          [
            [8, 8],
            [9, 8],
            [8, 9],
            [9, 9],
          ],
          90,
          45,
        );
        return {
          type: "finale",
          receptor: { x: 124, y: 35, w: 8, h: 8, hit: false },
          coreBlock: { x: 98, y: 53, w: 2, h: 2 },
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

  // --- Circuit Academy ---
  // Gun geometry reference: SE Gosper gun at (35,20) fires first glider at gen ~29,
  // center ≈ (59,30), traveling SE at c/4 (+1,+1 per 4 gens).
  const CIRCUIT_LEVELS = [
    {
      name: "CA-1 Stream Rider",
      vibe: "Your first glider stream — just press Play and watch.",
      objective: "Let the glider stream reach the receptor.",
      genLimit: 250,
      guide: {
        concept: "Glider Streams",
        body: "The Gosper Gun fires one glider every 30 generations — a perpetual signal clock. Each glider travels diagonally SE at c/4 speed: one step every four generations. This is the fundamental signal carrier of GoL circuits.",
        hints: [
          "Press Play. The first glider exits the gun at generation ~30.",
          "Watch the 45° diagonal trail — one cell right + one cell down every four generations.",
          "The amber zone is the receptor bay. It lights up on first contact.",
        ],
      },
      setup() {
        state.cameraX = 65; state.cameraY = 38; state.zoom = 11;
        seedFromPattern("gosper", 35, 20);
        return {
          type: "receptor",
          receptor: { x: 75, y: 46, w: 10, h: 10, hit: false },
          hitsNeeded: 1,
          hits: 0,
        };
      },
      evaluate(levelState) {
        const zone = levelState.receptor;
        if (!zone.hit && anyAliveInZone(zone)) {
          zone.hit = true;
          levelState.hits += 1;
          registerArcadeEvent("receptor", 200, zone);
        }
        if (levelState.hits >= levelState.hitsNeeded) {
          return { win: true, msg: "Signal received. Stream Rider complete." };
        }
        if (state.generation >= this.genLimit) {
          return { fail: true, msg: "Timed out. Glider missed the receptor." };
        }
        return null;
      },
      progress(levelState) {
        return `Receptor: ${levelState.hits ? "hit" : "waiting"}`;
      },
    },
    {
      name: "CA-2 Signal Stop",
      vibe: "A rogue stream threatens the lab. Block it before it breaches.",
      objective: "Place an Eater-1 in the glider stream to keep the danger zone clear.",
      genLimit: 350,
      guide: {
        concept: "Signal Termination",
        body: "An Eater-1 absorbs incoming gliders and survives intact. Place one directly in the stream to intercept every packet. The red zone must stay empty — any glider that enters it fails the mission.",
        hints: [
          "Select Eater-1 from the palette (Circuit category). Drag it onto the board.",
          "Drop it somewhere along the diagonal stream path, between the gun and the red danger zone.",
          "The eater's 'bite' corner must face the incoming glider — rotate with R if needed.",
        ],
      },
      setup() {
        state.cameraX = 68; state.cameraY = 44; state.zoom = 10;
        seedFromPattern("gosper", 35, 20);
        return {
          type: "prevent",
          dangerZone: { x: 86, y: 57, w: 10, h: 10, breached: false },
        };
      },
      evaluate(levelState) {
        const dz = levelState.dangerZone;
        if (!dz.breached && anyAliveInZone(dz)) {
          dz.breached = true;
          return { fail: true, msg: "Breach! Glider entered the danger zone." };
        }
        if (state.generation >= this.genLimit) {
          return { win: true, msg: "Stream contained. Signal termination confirmed." };
        }
        return null;
      },
      progress(levelState) {
        return `Danger zone: ${levelState.dangerZone.breached ? "BREACHED" : "clear"}`;
      },
    },
    {
      name: "CA-3 Parallel Streams",
      vibe: "Two independent signal lanes. Observe — they do not interact.",
      objective: "Both receptors must register a hit.",
      genLimit: 300,
      guide: {
        concept: "Signal Independence",
        body: "Two Gosper Guns fire independent SE streams. Gliders only interact on direct collision, so parallel streams coexist without interference. This is how GoL circuits route multiple signals side by side.",
        hints: [
          "Press Play — both guns fire at period 30 but their diagonal paths never cross.",
          "Trace each stream: upper gun → upper receptor; lower gun → lower receptor.",
          "Try placing a Block between the two streams — it won't disturb either unless it sits directly on a glider path.",
        ],
      },
      setup() {
        state.cameraX = 60; state.cameraY = 50; state.zoom = 7;
        seedFromPattern("gosper", 35, 15);
        seedFromPattern("gosper", 35, 55);
        return {
          type: "switches",
          switches: [
            { x: 75, y: 41, w: 8, h: 8, hit: false },
            { x: 75, y: 81, w: 8, h: 8, hit: false },
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
          return { win: true, msg: "Both streams delivered. Signal independence confirmed." };
        }
        if (state.generation >= this.genLimit) {
          return { fail: true, msg: "One or both streams missed their receptor." };
        }
        return null;
      },
      progress(levelState) {
        const hits = levelState.switches.filter((s) => s.hit).length;
        return `Receptors: ${hits}/${levelState.switches.length}`;
      },
    },
    {
      name: "CA-4 Not Today",
      vibe: "Two streams on a collision course. Both vanish — this is the NOT gate.",
      objective: "Watch the SE stream get cancelled. Keep the danger zone clear for 200 gens.",
      genLimit: 400,
      guide: {
        concept: "Signal Cancellation (NOT Gate)",
        body: "When an SE glider meets an NW glider head-on, they annihilate completely — no residue. A counter-stream fired at the correct phase blocks every packet of the original stream. Input present → output absent. This is the NOT gate.",
        hints: [
          "Press Play and watch the two streams converge toward the centre of the board.",
          "Each opposing pair produces a brief flash then vanishes. Cancellation repeats every 30 generations.",
          "The red danger zone is placed on the SE glider's path. It stays empty because every glider is intercepted before reaching it.",
        ],
      },
      setup() {
        state.cameraX = 80; state.cameraY = 48; state.zoom = 7;
        seedFromPattern("gosper", 32, 30);
        seedFromPattern("gosper", 112, 61, { rotate: 180 });
        return {
          type: "prevent",
          dangerZone: { x: 88, y: 62, w: 8, h: 8, breached: false },
        };
      },
      evaluate(levelState) {
        const dz = levelState.dangerZone;
        if (!dz.breached && anyAliveInZone(dz)) {
          dz.breached = true;
          return { fail: true, msg: "Signal broke through. Cancellation failed — a glider reached the danger zone." };
        }
        if (state.generation >= 200 && !dz.breached) {
          return { win: true, msg: "Annihilation confirmed. NOT gate operating." };
        }
        if (state.generation >= this.genLimit) {
          return dz.breached
            ? { fail: true, msg: "Signal broke through. Cancellation failed." }
            : { win: true, msg: "Annihilation confirmed. NOT gate operating." };
        }
        return null;
      },
      progress(levelState) {
        return `Danger zone: ${levelState.dangerZone.breached ? "BREACHED" : "clear"}`;
      },
    },
    {
      name: "CA-5 OR Gate",
      vibe: "Two independent streams, one logical output. Either signal wins.",
      objective: "Let either receptor fire.",
      genLimit: 300,
      guide: {
        concept: "OR Gate",
        body: "An OR gate fires when any input is high. Two independent Gosper streams each aim at their own receptor. The OR condition is satisfied if either one lands. Try blocking one gun with an Eater — the other stream still wins.",
        hints: [
          "Press Play. Both guns fire SE gliders every 30 generations.",
          "Drag an Eater-1 from the palette onto one of the gun streams to absorb it.",
          "The second gun keeps firing — the OR condition is still met. Any single input is enough.",
        ],
      },
      setup() {
        state.cameraX = 60; state.cameraY = 55; state.zoom = 7;
        seedFromPattern("gosper", 30, 18);
        seedFromPattern("gosper", 30, 53);
        return {
          type: "switches",
          switches: [
            { x: 65, y: 46, w: 9, h: 9, hit: false },
            { x: 65, y: 81, w: 9, h: 9, hit: false },
          ],
          hitsNeeded: 1,
          hits: 0,
        };
      },
      evaluate(levelState) {
        for (const sw of levelState.switches) {
          if (!sw.hit && anyAliveInZone(sw)) {
            sw.hit = true;
            levelState.hits++;
            registerArcadeEvent("receptor", 200, sw);
          }
        }
        if (levelState.hits >= 1) {
          return { win: true, msg: "Signal received. OR gate confirmed — any input produces output." };
        }
        if (state.generation >= this.genLimit) {
          return { fail: true, msg: "No stream reached a receptor." };
        }
        return null;
      },
      progress(levelState) {
        return `Receptors: ${levelState.hits}/1 (OR — either suffices)`;
      },
    },
    {
      name: "CA-6 AND Gate",
      vibe: "Two streams, two required targets. All inputs must succeed.",
      objective: "Both receptors must fire.",
      genLimit: 300,
      guide: {
        concept: "AND Gate",
        body: "An AND gate requires every input to be high before the output fires. Two independent streams each target a separate receptor — both must land. Block either gun with an Eater and you fail, even though the other stream succeeds.",
        hints: [
          "Press Play — both guns must reach both receptors before gen 300.",
          "Try placing an Eater on one stream. The remaining receptor fires, but the mission still fails.",
          "AND logic: partial success is not success. Every condition must be met.",
        ],
      },
      setup() {
        state.cameraX = 60; state.cameraY = 55; state.zoom = 7;
        seedFromPattern("gosper", 30, 18);
        seedFromPattern("gosper", 30, 53);
        return {
          type: "switches",
          switches: [
            { x: 65, y: 46, w: 9, h: 9, hit: false },
            { x: 65, y: 81, w: 9, h: 9, hit: false },
          ],
        };
      },
      evaluate(levelState) {
        for (const sw of levelState.switches) {
          if (!sw.hit && anyAliveInZone(sw)) {
            sw.hit = true;
            registerArcadeEvent("receptor", 200, sw);
          }
        }
        const hits = levelState.switches.filter((s) => s.hit).length;
        if (hits >= 2) {
          return { win: true, msg: "Both signals received. AND gate confirmed — all inputs required." };
        }
        if (state.generation >= this.genLimit) {
          return hits >= 2
            ? { win: true, msg: "AND gate confirmed." }
            : { fail: true, msg: "Not all receptors triggered. AND requires every input." };
        }
        return null;
      },
      progress(levelState) {
        const hits = levelState.switches.filter((s) => s.hit).length;
        return `Receptors: ${hits}/2 (AND — all required)`;
      },
    },
    {
      name: "CA-7 Signal Crossing",
      vibe: "One stream heads right-down, the other left-down — they cross in the centre.",
      objective: "Both receptors must fire. Both streams reach their targets.",
      genLimit: 500,
      guide: {
        concept: "Signal Crossing",
        body: "An SE stream and a SW stream travel on completely different diagonal rails. SE gliders go (+1,+1) every 4 gens; SW gliders go (-1,+1). Their geometric paths cross in the centre of the board, yet gliders on perpendicular diagonal families cannot interact — both streams deliver their packets intact.",
        hints: [
          "Press Play. The SE gun (top-left) fires down-right. The SW gun (top-right) fires down-left.",
          "Watch the crossing zone near the centre — the streams converge, pass through the same region, then diverge to their receptors.",
          "Both receptors eventually fire: SE stream → lower-right receptor, SW stream → lower-left receptor. Different diagonal families — no collision.",
        ],
      },
      setup() {
        state.cameraX = 75; state.cameraY = 58; state.zoom = 6;
        seedFromPattern("gosper", 15, 5);
        seedFromPattern("gosper", 130, 5, { rotate: 90 });
        return {
          type: "switches",
          switches: [
            { x: 105, y: 70, w: 12, h: 12, hit: false },
            { x: 44, y: 100, w: 12, h: 12, hit: false },
          ],
        };
      },
      evaluate(levelState) {
        for (const sw of levelState.switches) {
          if (!sw.hit && anyAliveInZone(sw)) {
            sw.hit = true;
            registerArcadeEvent("receptor", 300, sw);
          }
        }
        const hits = levelState.switches.filter((s) => s.hit).length;
        if (hits >= 2) {
          return { win: true, msg: "Both streams delivered. Signal crossing confirmed — perpendicular diagonal families, zero collision." };
        }
        if (state.generation >= this.genLimit) {
          return hits >= 2
            ? { win: true, msg: "Signal crossing confirmed." }
            : { fail: true, msg: `Only ${hits}/2 receptors hit. Check that both streams have a clear path.` };
        }
        return null;
      },
      progress(levelState) {
        const hits = levelState.switches.filter((s) => s.hit).length;
        return `Receptors: ${hits}/2`;
      },
    },
  ];

  for (const lvl of CIRCUIT_LEVELS) LEVELS.push(lvl);

  function key(x, y) {
    return `${x},${y}`;
  }

  function parseKey(k) {
    const idx = k.indexOf(",");
    return [Number(k.slice(0, idx)), Number(k.slice(idx + 1))];
  }

  // Surface descriptors — cellKey(x,y) returns canonical key string or null.
  // null = absorbing boundary (coordinate outside the manifold's domain).
  // To add a new manifold: add an entry with name, desc, and cellKey.
  const SURFACES = {
    flat: {
      name: "Infinite Plane",
      desc: "Unbounded 2D field. No wrapping — cells may expand forever.",
      cellKey(x, y) { return key(Math.floor(x), Math.floor(y)); },
    },
    torus: {
      name: "Torus",
      desc: "Both axes wrap: left↔right and top↔bottom connect seamlessly.",
      cellKey(x, y) {
        const W = SPHERE_COLS, H = SPHERE_ROWS;
        return key(((Math.floor(x) % W) + W) % W, ((Math.floor(y) % H) + H) % H);
      },
      // s,t ∈ [0,1) — canonical cell coords normalised to unit square
      surfaceFunc(s, t) {
        const u = s * Math.PI * 2, v = t * Math.PI * 2;
        const R = 3, r = 1.2;
        return {
          x: (R + r * Math.cos(v)) * Math.cos(u),
          y: r * Math.sin(v),
          z: (R + r * Math.cos(v)) * Math.sin(u),
        };
      },
    },
    klein: {
      name: "Klein Bottle",
      desc: "Left↔right wraps normally. Top↔bottom wraps with left-right flip. Non-orientable.",
      cellKey(x, y) {
        const W = SPHERE_COLS, H = SPHERE_ROWS;
        let cx = Math.floor(x), cy = Math.floor(y);
        const yWraps = Math.floor(cy / H);
        cy = ((cy % H) + H) % H;
        cx = ((cx % W) + W) % W;
        if (Math.abs(yWraps) % 2 === 1) cx = W - 1 - cx;
        return key(cx, cy);
      },
      // Figure-8 immersion: row→big circle (u), col→tube (v).
      // One u-cycle reflects v (matches cellKey: y-wrap flips x).
      surfaceFunc(s, t) {
        const u = t * Math.PI * 2, v = s * Math.PI * 2;
        const a = 2.5;
        return {
          x: (a + Math.cos(u / 2) * Math.sin(v) - Math.sin(u / 2) * Math.sin(2 * v)) * Math.cos(u),
          y: (a + Math.cos(u / 2) * Math.sin(v) - Math.sin(u / 2) * Math.sin(2 * v)) * Math.sin(u),
          z: Math.sin(u / 2) * Math.sin(v) + Math.cos(u / 2) * Math.sin(2 * v),
        };
      },
    },
    rp2: {
      name: "Projective Plane",
      desc: "Left↔right wrap flips Y; top↔bottom wrap flips X. Antipodal identification.",
      cellKey(x, y) {
        const W = SPHERE_COLS, H = SPHERE_ROWS;
        let cx = Math.floor(x), cy = Math.floor(y);
        const xWraps = Math.floor(cx / W);
        const yWraps = Math.floor(cy / H);
        cx = ((cx % W) + W) % W;
        cy = ((cy % H) + H) % H;
        if (Math.abs(xWraps) % 2 === 1) cy = H - 1 - cy;
        if (Math.abs(yWraps) % 2 === 1) cx = W - 1 - cx;
        return key(cx, cy);
      },
    },
    cylinder: {
      name: "Cylinder",
      desc: "Left↔right wraps. Top and bottom are absorbing boundaries.",
      cellKey(x, y) {
        const W = SPHERE_COLS, H = SPHERE_ROWS;
        const cy = Math.floor(y);
        if (cy < 0 || cy >= H) return null;
        return key(((Math.floor(x) % W) + W) % W, cy);
      },
      surfaceFunc(s, t) {
        const u = s * Math.PI * 2;
        const R = 2.5;
        return {
          x: R * Math.cos(u),
          y: 5 * (t - 0.5),
          z: R * Math.sin(u),
        };
      },
    },
    mobius: {
      name: "Möbius Strip",
      desc: "Left↔right wraps with vertical flip. Top/bottom are absorbing boundaries. Non-orientable.",
      cellKey(x, y) {
        const W = SPHERE_COLS, H = SPHERE_ROWS;
        let cx = Math.floor(x), cy = Math.floor(y);
        if (cy < 0 || cy >= H) return null;
        const xWraps = Math.floor(cx / W);
        cx = ((cx % W) + W) % W;
        if (Math.abs(xWraps) % 2 === 1) cy = H - 1 - cy;
        return key(cx, cy);
      },
      // One u-cycle reflects v (t→1-t): matches Möbius cellKey.
      surfaceFunc(s, t) {
        const u = s * Math.PI * 2;
        const v = (t - 0.5) * 1.5;
        const R = 3;
        return {
          x: (R + v * Math.cos(u / 2)) * Math.cos(u),
          y: v * Math.sin(u / 2),
          z: (R + v * Math.cos(u / 2)) * Math.sin(u),
        };
      },
    },
  };

  const MANIFOLD_MODES = ["sphere", "torus", "klein", "mobius", "cylinder"];
  function is3DMode() { return MANIFOLD_MODES.includes(state.mode); }

  // 3D modes use torus wrapping for their topology; flat sandbox/arcade fall back to flat (infinite).
  function activeSurface() {
    if (SURFACES[state.mode]) return SURFACES[state.mode]; // torus, klein, mobius, cylinder
    if (state.mode === "sphere" || state.sharedState) return SURFACES.torus;
    return SURFACES.flat; // sandbox / arcade in individual mode
  }

  function activeAlive() {
    if (state.sharedState) return state.alive;
    return state.modeAlive[state.mode] ?? state.alive;
  }

  function normCoord(x, y) {
    return activeSurface().cellKey(x, y);
  }

  function isAlive(x, y) {
    const k = normCoord(x, y);
    return k !== null && activeAlive().has(k);
  }

  function setCell(x, y, alive) {
    const k = normCoord(x, y);
    if (k === null) return;
    const s = activeAlive();
    if (alive) {
      s.add(k);
      if (state.leniaMode) valueMap.set(k, 1.0);
      if (state.cellTypesEnabled) typeMap.set(k, state.paintType);
    } else {
      s.delete(k);
      valueMap.delete(k);
      typeMap.delete(k);
    }
  }

  function placeCells(cells, originX, originY) {
    for (const [x, y] of cells) {
      setCell(originX + x, originY + y, true);
    }
  }

  function clearBoard() {
    activeAlive().clear();
    state.generation = 0;
    state.score = 0;
    state.combo = 1;
    state.comboTimer = 0;
    state.levelState = null;
    state.zoneFlash = [];
    state.histFrames = [];
    state.histCursor = -1;
    state.playReverse = false;
    cellAgeMap.clear();
    trailMap.clear();
    _contigAccum.clear();
    valueMap.clear();
    typeMap.clear();
    heatMap.clear();
    entrenchMap.clear();
    state._adaptPrevPop = 0;
    _driftAccX = 0;
    _driftAccY = 0;
    state.demoCircuit = false;
    setOverlay("");
    hideGuide();
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

  const LS_CUSTOM_PREFABS = "aa_custom_prefabs";

  function getPrefabById(id) {
    return PREFABS.find((p) => p.id === id)
      || lsLoad(LS_CUSTOM_PREFABS).find((p) => p.id === id)
      || null;
  }

  function captureSelection(name, desc) {
    const sel = state.selection;
    if (!sel || sel.w <= 0 || sel.h <= 0) return false;
    const x1 = sel.x, y1 = sel.y, x2 = sel.x + sel.w, y2 = sel.y + sel.h;
    const cells = [];
    for (const k of activeAlive()) {
      const [col, row] = parseKey(k);
      if (col >= x1 && col < x2 && row >= y1 && row < y2) {
        cells.push([col - x1, row - y1]);
      }
    }
    if (cells.length === 0) return false;
    const prefab = {
      id: "custom_" + Date.now(),
      name: name || "Custom Pattern",
      type: "custom",
      category: "Custom",
      desc: desc || `${cells.length} cells, ${sel.w}×${sel.h}`,
      tip: "",
      period: 0,
      cells,
    };
    const all = lsLoad(LS_CUSTOM_PREFABS);
    all.push(prefab);
    lsSave(LS_CUSTOM_PREFABS, all);
    buildPalette();
    return true;
  }

  function deleteCustomPrefab(id) {
    lsSave(LS_CUSTOM_PREFABS, lsLoad(LS_CUSTOM_PREFABS).filter((p) => p.id !== id));
    if (state.selectedPrefabId === id) state.selectedPrefabId = PREFABS[0].id;
    buildPalette();
  }

  function placePrefab(id, gx, gy, opts = {}) {
    const prefab = getPrefabById(id);
    if (!prefab) return;
    const stamp = state._prefabStamp?.id === id ? state._prefabStamp : null;
    const rotate = opts.rotate ?? stamp?.rotate ?? 0;
    const flipX  = opts.flipX  ?? stamp?.flipX  ?? false;
    const cells = transformCells(prefab.cells, rotate, flipX);
    placeCells(cells, gx, gy);
  }

  function ageColor(age) {
    return AGE_COLORS[Math.min(age, AGE_COLORS.length - 1)];
  }

  function leniaColor(v) {
    return LENIA_COLORS[Math.min(100, Math.max(0, Math.round(v * 100)))];
  }

  function heatColor(count, maxCount) {
    const idx = Math.min(100, Math.round((count / Math.max(1, maxCount)) * 100));
    return HEAT_COLORS[idx];
  }

  function getFieldBonus(col, row) {
    let stackBonus = 0;
    let exclBonus = 0, exclMag = 0;
    for (const ff of state.forceFields) {
      const dist = Math.sqrt((col - ff.x) ** 2 + (row - ff.y) ** 2);
      if (dist >= ff.radius) continue;
      const u = dist / ff.radius;
      let t;
      if (ff.falloff === "bell")      t = Math.exp(-3 * u * u);
      else if (ff.falloff === "step") t = 1;
      else                            t = 1 - u;
      const delta = Math.round(ff.strength * t);
      const contribution = ff.type === "attract" ? delta : -delta;
      if (ff.combine === false) {
        // Exclusive: strongest exclusive wins
        if (Math.abs(contribution) > exclMag) { exclBonus = contribution; exclMag = Math.abs(contribution); }
      } else {
        stackBonus += contribution;
      }
    }
    // If any exclusive field covers this cell, it takes over; otherwise sum stacking fields
    return exclMag > 0 ? exclBonus : stackBonus;
  }

  function _fieldDensity(ff) {
    const alive = activeAlive();
    let inside = 0, area = 0;
    const r2 = ff.radius * ff.radius;
    // sample a bounding box — count cells inside radius
    const x0 = Math.floor(ff.x - ff.radius), x1 = Math.ceil(ff.x + ff.radius);
    const y0 = Math.floor(ff.y - ff.radius), y1 = Math.ceil(ff.y + ff.radius);
    for (let c = x0; c <= x1; c++) {
      for (let r = y0; r <= y1; r++) {
        if ((c - ff.x) ** 2 + (r - ff.y) ** 2 < r2) {
          area++;
          if (alive.has(key(c, r))) inside++;
        }
      }
    }
    return area > 0 ? inside / area : 0;
  }

  function applyDrift(aliveSet, ageMap, tMap) {
    const dx = state.driftX;
    const dy = state.driftY;
    if (dx === 0 && dy === 0) return { alive: aliveSet, ages: ageMap, types: tMap };

    _driftAccX += dx;
    _driftAccY += dy;
    const intX = Math.trunc(_driftAccX);
    const intY = Math.trunc(_driftAccY);
    _driftAccX -= intX;
    _driftAccY -= intY;

    if (intX === 0 && intY === 0) return { alive: aliveSet, ages: ageMap, types: tMap };

    const surface = activeSurface();
    const shifted = new Set();
    const shiftedAges = new Map();
    const shiftedTypes = tMap ? new Map() : null;
    for (const k of aliveSet) {
      const [c, r] = parseKey(k);
      const nk = surface.cellKey(c + intX, r + intY);
      if (nk !== null) {
        shifted.add(nk);
        shiftedAges.set(nk, ageMap.get(k) ?? 0);
        if (shiftedTypes && tMap.has(k)) shiftedTypes.set(nk, tMap.get(k));
      }
    }
    return { alive: shifted, ages: shiftedAges, types: shiftedTypes };
  }

  function ruleToString(B, S) {
    const b = [...B].sort((a, x) => a - x).join("");
    const s = [...S].sort((a, x) => a - x).join("");
    return `B${b}/S${s}`;
  }
  // Short alias used in zone rendering (avoids circular ref issues in IIFE order)
  function _ruleToStr(B, S) { return ruleToString(B, S); }

  function parseRule(str) {
    const m = str.toUpperCase().match(/^B([0-8]*)\/?S([0-8]*)$/);
    if (!m) return null;
    return {
      B: new Set(m[1].split("").filter(Boolean).map(Number)),
      S: new Set(m[2].split("").filter(Boolean).map(Number)),
    };
  }

  function setRule(str) {
    const r = parseRule(str);
    if (!r) return false;
    state.ruleB = r.B;
    state.ruleS = r.S;
    return true;
  }

  function getKernelOffsets() {
    const cacheKey = `${state.kernelShape}:${state.kernelRadius}`;
    if (_kernelCacheKey === cacheKey) return _kernelOffsets;

    const r = state.kernelRadius;
    const offsets = [];

    switch (state.kernelShape) {
      case "moore":
        for (let dr = -r; dr <= r; dr++)
          for (let dc = -r; dc <= r; dc++)
            if (dc !== 0 || dr !== 0) offsets.push([dc, dr]);
        break;
      case "vonNeumann":
        for (let dr = -r; dr <= r; dr++)
          for (let dc = -r; dc <= r; dc++)
            if ((dc !== 0 || dr !== 0) && Math.abs(dc) + Math.abs(dr) <= r)
              offsets.push([dc, dr]);
        break;
      case "ring":
        for (let dr = -r; dr <= r; dr++)
          for (let dc = -r; dc <= r; dc++)
            if (Math.max(Math.abs(dc), Math.abs(dr)) === r) offsets.push([dc, dr]);
        break;
      case "cross":
        for (let i = 1; i <= r; i++)
          offsets.push([i, 0], [-i, 0], [0, i], [0, -i]);
        break;
      case "hex":
        offsets.push([1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]);
        break;
      case "knight":
        for (const [a, b] of [[1, 2], [2, 1]])
          for (const sx of [1, -1])
            for (const sy of [1, -1])
              offsets.push([a * sx, b * sy]);
        break;
    }

    _kernelOffsets = offsets;
    _kernelCacheKey = cacheKey;
    return offsets;
  }

  // ─── Manifold Region Engine integration ───────────────────────────────────

  const { ManifoldRegion: MRegion } = window.ManifoldEngine;

  // ─── Surface parametric functions (u,v) → {x,y,z}, u,v ∈ [0,1] ───────────
  const SURFACE_FUNCS = {
    torus(u, v) {
      const R = 2.0, r = 0.7, phi = u * Math.PI * 2, theta = v * Math.PI * 2;
      return { x: (R + r * Math.cos(theta)) * Math.cos(phi), y: (R + r * Math.cos(theta)) * Math.sin(phi), z: r * Math.sin(theta) };
    },
    sphere(u, v) {
      const phi = u * Math.PI * 2, theta = v * Math.PI;
      return { x: Math.sin(theta) * Math.cos(phi), y: Math.sin(theta) * Math.sin(phi), z: Math.cos(theta) };
    },
    cylinder(u, v) {
      const phi = u * Math.PI * 2;
      return { x: Math.cos(phi), y: Math.sin(phi), z: (v - 0.5) * 3 };
    },
    mobius(u, v) {
      const phi = u * Math.PI * 2, w = (v - 0.5) * 1.2, R = 1.5;
      return { x: (R + w * Math.cos(phi / 2)) * Math.cos(phi), y: (R + w * Math.cos(phi / 2)) * Math.sin(phi), z: w * Math.sin(phi / 2) };
    },
    klein(u, v) {
      // Lawson's immersion: φ=u·2π, θ=v·2π
      const phi = u * Math.PI * 2, theta = v * Math.PI * 2, a = 2;
      const cp2 = Math.cos(phi / 2), sp2 = Math.sin(phi / 2);
      const st = Math.sin(theta), s2t = Math.sin(2 * theta);
      return {
        x: (a + cp2 * st - sp2 * s2t) * Math.cos(phi),
        y: (a + cp2 * st - sp2 * s2t) * Math.sin(phi),
        z: sp2 * st + cp2 * s2t,
      };
    },
    rp2(u, v) {
      // Roman surface (Steiner) — standard RP² immersion
      const phi = u * Math.PI, theta = v * Math.PI / 2;
      return {
        x: Math.sin(2 * theta) * Math.cos(phi) * Math.cos(phi),
        y: Math.sin(2 * theta) * Math.sin(phi) * Math.cos(phi),
        z: Math.cos(2 * theta) * 0.5,
      };
    },
  };

  // ─── ManifoldViewport ──────────────────────────────────────────────────────
  // Floating Three.js panel per manifold region. Draggable, resizable.

  class ManifoldViewport {
    constructor(region, panelX, panelY) {
      this.region   = region;
      this.panelX   = panelX;
      this.panelY   = panelY;
      this.panelW   = 300;
      this.panelH   = 290;
      this._orbit   = { theta: 0.6, phi: 1.0, dist: 5, dragging: false, lastX: 0, lastY: 0 };
      this._painting = false;
      this._destroyed = false;
      this._buildDOM();
      this._buildScene();
    }

    _buildDOM() {
      const { SHAPE_META } = window.ManifoldEngine;
      const meta = SHAPE_META[this.region.shape] || {};

      const panel = document.createElement('div');
      panel.className = 'mv-panel';
      panel.style.left   = this.panelX + 'px';
      panel.style.top    = this.panelY + 'px';
      panel.style.width  = this.panelW + 'px';
      panel.style.height = this.panelH + 'px';

      // ── Header ──────────────────────────────────────────────────────────────
      const header = document.createElement('div');
      header.className = 'mv-header';
      const title = document.createElement('span');
      title.className = 'mv-title';
      title.textContent = `${meta.icon || '⬡'} ${meta.label || this.region.shape} #${this.region.id}`;
      const closeBtn = document.createElement('button');
      closeBtn.className = 'mv-close'; closeBtn.textContent = '×'; closeBtn.title = 'Close';
      closeBtn.addEventListener('click', () => this.destroy());
      header.appendChild(title); header.appendChild(closeBtn);

      // ── 3D canvas ───────────────────────────────────────────────────────────
      const cvs = document.createElement('canvas');
      cvs.className = 'mv-canvas';

      // ── Resize handle ───────────────────────────────────────────────────────
      const resizeHandle = document.createElement('div');
      resizeHandle.className = 'mv-resize';

      panel.appendChild(header);
      panel.appendChild(cvs);
      panel.appendChild(resizeHandle);

      // Drag panel by header
      this._setupPanelDrag(header, panel);
      // Resize by corner handle
      this._setupPanelResize(resizeHandle, panel, cvs);

      const wrap = document.querySelector('.board-wrap');
      wrap.appendChild(panel);

      this.panel  = panel;
      this.canvas3d = cvs;
    }

    _setupPanelDrag(handle, panel) {
      handle.addEventListener('mousedown', e => {
        if (e.target.classList.contains('mv-close')) return;
        const startX = e.clientX, startY = e.clientY;
        const startL = parseInt(panel.style.left) || 0;
        const startT = parseInt(panel.style.top) || 0;
        const onMove = e => {
          panel.style.left = (startL + e.clientX - startX) + 'px';
          panel.style.top  = (startT + e.clientY - startY) + 'px';
        };
        const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        e.preventDefault();
      });
    }

    _setupPanelResize(handle, panel, cvs) {
      handle.addEventListener('mousedown', e => {
        const startX = e.clientX, startY = e.clientY;
        const startW = panel.offsetWidth, startH = panel.offsetHeight;
        const onMove = e => {
          const nw = Math.max(200, startW + e.clientX - startX);
          const nh = Math.max(180, startH + e.clientY - startY);
          panel.style.width  = nw + 'px';
          panel.style.height = nh + 'px';
          // Renderer resize happens in render()
        };
        const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        e.preventDefault();
      });
    }

    _buildScene() {
      const cvs = this.canvas3d;
      const W = this.panelW, H = this.panelH - 32;
      const { w: CW, h: CH } = this.region.rect;

      const renderer = new THREE.WebGLRenderer({ canvas: cvs, antialias: true, alpha: false });
      renderer.setSize(W, H, false);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x060c18, 1);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 50);
      this._updateCamera(camera);

      scene.add(new THREE.HemisphereLight(0x9ac8ee, 0x0c2035, 2.2));
      const dLight = new THREE.DirectionalLight(0xffffff, 1.8);
      dLight.position.set(4, 6, 5); scene.add(dLight);
      const dLight2 = new THREE.DirectionalLight(0x40e0c0, 0.9);
      dLight2.position.set(-3, -1, -4); scene.add(dLight2);

      // One texel per cell — NearestFilter gives crisp cell boundaries
      const texData = new Uint8Array(CW * CH * 4);
      const tex = new THREE.DataTexture(texData, CW, CH, THREE.RGBAFormat);
      tex.minFilter = tex.magFilter = THREE.NearestFilter;
      tex.flipY = false;

      const sfn = SURFACE_FUNCS[this.region.shape] || SURFACE_FUNCS.torus;
      const US = Math.min(CW * 4, 320), VS = Math.min(CH * 4, 160);
      const bgMesh  = this._buildBgMesh(sfn, US, VS, tex);
      const cellGrid = this._buildCellGrid(sfn, CW, CH);

      scene.add(bgMesh);
      scene.add(cellGrid);

      this.renderer  = renderer;
      this.scene     = scene;
      this.camera    = camera;
      this.bgMesh    = bgMesh;
      this.cellGrid  = cellGrid;
      this.sfn       = sfn;
      this.stateTexture = tex;
      this.texData   = texData;
      this.CW = CW; this.CH = CH;

      this._setupCanvasInput(cvs);
      this._syncCells();
    }

    _buildBgMesh(sfn, US, VS, tex) {
      const pos = [], uvs = [], idx = [];
      for (let iv = 0; iv <= VS; iv++) {
        for (let iu = 0; iu <= US; iu++) {
          const p = sfn(iu / US, iv / VS);
          pos.push(p.x, p.y, p.z);
          uvs.push(iu / US, iv / VS);
        }
      }
      for (let iv = 0; iv < VS; iv++) {
        for (let iu = 0; iu < US; iu++) {
          const a = iv * (US + 1) + iu;
          idx.push(a, a + 1, a + US + 1, a + 1, a + US + 2, a + US + 1);
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geo.setIndex(idx);
      geo.computeVertexNormals();
      return new THREE.Mesh(geo, new THREE.MeshPhongMaterial({
        map: tex,
        color: 0xffffff,
        specular: 0x2a6088,
        shininess: 40,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1,
      }));
    }

    // Exact cell-boundary grid — lines follow the surface curvature
    _buildCellGrid(sfn, CW, CH) {
      const SEGS = Math.max(3, Math.ceil(60 / Math.max(CW, CH)));
      const verts = [];
      // Horizontal lines at v = ly/CH
      for (let ly = 0; ly <= CH; ly++) {
        const v = ly / CH;
        for (let s = 0; s < CW * SEGS; s++) {
          const u0 = s / (CW * SEGS), u1 = (s + 1) / (CW * SEGS);
          const p0 = sfn(u0, v), p1 = sfn(u1, v);
          verts.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z);
        }
      }
      // Vertical lines at u = lx/CW
      for (let lx = 0; lx <= CW; lx++) {
        const u = lx / CW;
        for (let s = 0; s < CH * SEGS; s++) {
          const v0 = s / (CH * SEGS), v1 = (s + 1) / (CH * SEGS);
          const p0 = sfn(u, v0), p1 = sfn(u, v1);
          verts.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z);
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
      return new THREE.LineSegments(geo, new THREE.LineBasicMaterial({
        color: 0x1c4878,
        transparent: true,
        opacity: 0.9,
      }));
    }

    _syncCells() {
      if (this._destroyed) return;
      const { x: rx, y: ry } = this.region.rect;
      const { CW, CH, texData, stateTexture } = this;
      const alive = activeAlive();
      for (let ly = 0; ly < CH; ly++) {
        for (let lx = 0; lx < CW; lx++) {
          const i = (ly * CW + lx) * 4;
          if (alive.has(key(rx + lx, ry + ly))) {
            texData[i] = 0; texData[i+1] = 220; texData[i+2] = 168; texData[i+3] = 255;
          } else {
            texData[i] = 10; texData[i+1] = 25; texData[i+2] = 58; texData[i+3] = 255;
          }
        }
      }
      stateTexture.needsUpdate = true;
    }

    _updateCamera(camera) {
      const { theta, phi, dist } = this._orbit;
      camera.position.set(
        dist * Math.sin(phi) * Math.sin(theta),
        dist * Math.cos(phi),
        dist * Math.sin(phi) * Math.cos(theta),
      );
      camera.lookAt(0, 0, 0);
    }

    _hitTest(clientX, clientY) {
      const rect = this.canvas3d.getBoundingClientRect();
      const mx = ((clientX - rect.left) / rect.width) * 2 - 1;
      const my = -((clientY - rect.top) / rect.height) * 2 + 1;
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(mx, my), this.camera);
      const hits = raycaster.intersectObject(this.bgMesh);
      if (!hits.length || !hits[0].uv) return null;
      const { x: rx, y: ry, w: W, h: H } = this.region.rect;
      const lx = Math.max(0, Math.min(W - 1, Math.floor(hits[0].uv.x * W)));
      const ly = Math.max(0, Math.min(H - 1, Math.floor(hits[0].uv.y * H)));
      return { cx: rx + lx, cy: ry + ly };
    }

    _setupCanvasInput(cvs) {
      // Orbit: right-drag (or alt+left-drag)
      cvs.addEventListener('mousedown', e => {
        const isOrbit = e.button === 2 || (e.button === 0 && e.altKey);
        const isPaint = e.button === 0 && !e.altKey;
        if (isOrbit) {
          this._orbit.dragging = true;
          this._orbit.lastX = e.clientX; this._orbit.lastY = e.clientY;
          e.preventDefault();
        } else if (isPaint) {
          this._painting = true;
          const hit = this._hitTest(e.clientX, e.clientY);
          if (hit) setCell(hit.cx, hit.cy, e.shiftKey ? false : !isAlive(hit.cx, hit.cy));
          e.preventDefault();
        }
      });
      window.addEventListener('mousemove', e => {
        if (this._destroyed) return;
        if (this._orbit.dragging) {
          const dx = e.clientX - this._orbit.lastX;
          const dy = e.clientY - this._orbit.lastY;
          this._orbit.theta -= dx * 0.007;
          this._orbit.phi    = Math.max(0.1, Math.min(Math.PI - 0.1, this._orbit.phi + dy * 0.007));
          this._orbit.lastX  = e.clientX; this._orbit.lastY = e.clientY;
        } else if (this._painting) {
          const hit = this._hitTest(e.clientX, e.clientY);
          if (hit) setCell(hit.cx, hit.cy, !e.shiftKey);
        }
      });
      window.addEventListener('mouseup', () => {
        this._orbit.dragging = false;
        this._painting = false;
      });
      cvs.addEventListener('wheel', e => {
        this._orbit.dist = Math.max(1.5, Math.min(12, this._orbit.dist + e.deltaY * 0.008));
        e.preventDefault();
      }, { passive: false });
      cvs.addEventListener('contextmenu', e => e.preventDefault());
    }

    render() {
      if (this._destroyed) return;
      const panel = this.panel;
      const cvs   = this.canvas3d;
      const cw = panel.clientWidth;
      const ch = Math.max(60, panel.clientHeight - 32);
      if (cvs.width !== cw || cvs.height !== ch) {
        this.renderer.setSize(cw, ch, false);
        this.camera.aspect = cw / ch;
        this.camera.updateProjectionMatrix();
      }
      this._syncCells();
      this._updateCamera(this.camera);
      this.renderer.render(this.scene, this.camera);
    }

    destroy() {
      if (this._destroyed) return;
      this._destroyed = true;
      this.cellMesh.geometry.dispose();
      this.bgMesh.geometry.dispose();
      this.renderer.dispose();
      this.panel.remove();
      _manifoldViewports.delete(this.region.id);
      manifoldInspectorSync();
      draw();
    }
  }

  function openManifoldViewport(region) {
    if (_manifoldViewports.has(region.id)) {
      _manifoldViewports.get(region.id).panel.style.zIndex = '50';
      return;
    }
    // Position near the region's screen rect, offset to avoid overlap
    const tl = worldToScreen(region.rect.x, region.rect.y);
    const vp = new ManifoldViewport(region, Math.max(10, tl.x + 10), Math.max(10, tl.y + 10));
    _manifoldViewports.set(region.id, vp);
    manifoldInspectorSync();
  }

  function _renderAllViewports() {
    for (const vp of _manifoldViewports.values()) vp.render();
  }

  function _manifoldKernelWeights() {
    // Convert flat kernel offsets to [dx, dy, weight] triples (weight=1 for binary kernels)
    return getKernelOffsets().map(([dx, dy]) => [dx, dy, 1.0]);
  }

  function createManifoldRegion(rect, shape, protocol = 'A') {
    const id = ++state._manifoldIdSeq;
    const region = new MRegion({ id, rect, shape, boundaryProtocol: protocol });
    region.build(_manifoldKernelWeights());
    state.manifoldRegions.push(region);
    return region;
  }

  function removeManifoldRegion(id) {
    const idx = state.manifoldRegions.findIndex(r => r.id === id);
    if (idx !== -1) state.manifoldRegions.splice(idx, 1);
    if (state._manifoldSelected === id) state._manifoldSelected = null;
    if (_manifoldViewports.has(id)) _manifoldViewports.get(id).destroy();
    manifoldInspectorSync();
  }

  function rebuildAllManifoldRegions() {
    const weights = _manifoldKernelWeights();
    for (const r of state.manifoldRegions) {
      if (state.manifoldKernelInherit || !r.kernelOverride) r.build(weights);
    }
  }

  function getRegionsContaining(cx, cy) {
    // Returns regions in stack order (insertion order = stack order for non-commutative compose)
    const out = [];
    for (const r of state.manifoldRegions) {
      if (r.containsCell(cx, cy)) out.push(r);
    }
    return out;
  }

  function getManifoldNeighborWeights(cx, cy) {
    // Returns [{key, weight}] array or null (null → use default flat kernel)
    const regions = getRegionsContaining(cx, cy);
    if (regions.length === 0) return null;

    if (state.manifoldOverlapProtocol === 'A' || regions.length === 1) {
      // Last wins: highest-index region in the array
      return regions[regions.length - 1].neighborWeightMap.get(key(cx, cy)) ?? null;
    }

    // Protocol B — compose in stack order (non-commutative)
    return _composeNeighborWeights(cx, cy, regions);
  }

  function _composeNeighborWeights(cx, cy, regions) {
    // Start with innermost (first) region's neighbors, then remap through outer regions
    let neighbors = regions[0].neighborWeightMap.get(key(cx, cy));
    if (!neighbors) return null;

    for (let i = 1; i < regions.length; i++) {
      const outer = regions[i];
      neighbors = neighbors.map(({ key: nk, weight }) => {
        const [nx, ny] = parseKey(nk);
        const remapped = outer.neighborWeightMap.get(nk);
        if (remapped && outer.containsCell(nx, ny)) {
          // Cell lands inside outer region — apply outer topology too
          // Use same weight (composition preserves the inner weight)
          return remapped.map(r2 => ({ key: r2.key, weight: weight * r2.weight }));
        }
        return [{ key: nk, weight }];
      }).flat();
    }
    return neighbors;
  }

  // Returns {born, survive, n} for cells inside regions with rule/curvature overrides, or null.
  // `n` is the effective (possibly shifted) neighbor count.
  function getManifoldCellRule(cx, cy, n) {
    const regions = getRegionsContaining(cx, cy);
    if (!regions.length) return null;
    const r = regions[regions.length - 1]; // last-wins for rules
    if (!r.ruleOverride && !r.curvatureModulate) return null;

    const born    = r.ruleOverride ? r.ruleOverride.B : state.ruleB;
    const survive = r.ruleOverride ? r.ruleOverride.S : state.ruleS;
    let effectiveN = n;

    if (r.curvatureModulate && state.christoffelModStrength !== 0) {
      const { x: rx, y: ry, w: W, h: H } = r.rect;
      const K = window.ManifoldEngine.computeGaussianCurvature(cx - rx, cy - ry, W, H, r.shape);
      effectiveN = Math.max(0, Math.round(n + K * state.christoffelModStrength));
    }

    return { born, survive, n: effectiveN };
  }

  const MAX_CELLS_CONTIG = 4000;

  function findComponents(aliveSet, minSize) {
    if (aliveSet.size > MAX_CELLS_CONTIG) return [];
    const surface = activeSurface();
    const visited = new Set();
    const comps = [];
    for (const k of aliveSet) {
      if (visited.has(k)) continue;
      const comp = [];
      const stack = [k];
      visited.add(k);
      while (stack.length) {
        const curr = stack.pop();
        comp.push(curr);
        const [cx, cy] = parseKey(curr);
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (!dc && !dr) continue;
            const nk = surface.cellKey(cx + dc, cy + dr);
            if (nk && aliveSet.has(nk) && !visited.has(nk)) {
              visited.add(nk);
              stack.push(nk);
            }
          }
        }
      }
      if (comp.length >= minSize) comps.push(comp);
    }
    return comps;
  }

  function applyContigRepulsion() {
    const aliveSet = activeAlive();
    const comps = findComponents(aliveSet, state.contigMinSize);
    if (comps.length < 2) return;

    const R = state.contigRepulseRadius;
    const F = state.contigRepulseForce;
    const surface = activeSurface();

    const centroids = comps.map((comp) => {
      let sx = 0, sy = 0;
      for (const k of comp) { const [x, y] = parseKey(k); sx += x; sy += y; }
      return { x: sx / comp.length, y: sy / comp.length };
    });

    const forces = comps.map(() => ({ x: 0, y: 0 }));
    for (let i = 0; i < comps.length; i++) {
      for (let j = i + 1; j < comps.length; j++) {
        const dx = centroids[i].x - centroids[j].x;
        const dy = centroids[i].y - centroids[j].y;
        const d2 = dx * dx + dy * dy;
        if (d2 > R * R || d2 < 1) continue;
        const d = Math.sqrt(d2);
        const mag = F / d2;
        forces[i].x += (dx / d) * mag;
        forces[i].y += (dy / d) * mag;
        forces[j].x -= (dx / d) * mag;
        forces[j].y -= (dy / d) * mag;
      }
    }

    const shifts = [];
    for (let i = 0; i < comps.length; i++) {
      if (forces[i].x === 0 && forces[i].y === 0) continue;
      const ck = `${Math.round(centroids[i].x / 8)},${Math.round(centroids[i].y / 8)}`;
      const acc = _contigAccum.get(ck) ?? { x: 0, y: 0 };
      acc.x += forces[i].x;
      acc.y += forces[i].y;
      const intX = Math.trunc(acc.x);
      const intY = Math.trunc(acc.y);
      acc.x -= intX;
      acc.y -= intY;
      _contigAccum.set(ck, acc);
      if (intX !== 0 || intY !== 0) shifts.push({ comp: comps[i], intX, intY });
    }

    if (shifts.length === 0) return;

    const target = state.sharedState ? state.alive : state.modeAlive[state.mode];
    for (const { comp, intX, intY } of shifts) {
      const moved = comp.map((k) => {
        const age = cellAgeMap.get(k) ?? 0;
        target.delete(k);
        cellAgeMap.delete(k);
        const [x, y] = parseKey(k);
        const nk = surface.cellKey(x + intX, y + intY);
        return nk ? { nk, age } : null;
      }).filter(Boolean);
      for (const { nk, age } of moved) {
        target.add(nk);
        cellAgeMap.set(nk, age);
      }
    }
  }

  function stepLenia() {
    const surface = activeSurface();
    const offsets = getKernelOffsets();
    const nCount = Math.max(1, offsets.length);
    const mu = state.leniaMu;
    const sigma = state.leniaSigma;
    const dt = state.leniaTimeStep;
    const THRESH = 0.02;

    // Seed from alive set if valueMap is empty
    if (valueMap.size === 0) {
      for (const k of activeAlive()) valueMap.set(k, 1.0);
    }

    // Convolve: each live cell broadcasts its value to neighbors
    const neighborSums = new Map();
    const hasManifolds_l = state.manifoldRegions.length > 0;
    for (const [k, v] of valueMap) {
      const [c, r] = parseKey(k);
      const mNeighbors = hasManifolds_l ? getManifoldNeighborWeights(c, r) : null;
      if (mNeighbors) {
        for (const { key: nk, weight } of mNeighbors)
          neighborSums.set(nk, (neighborSums.get(nk) || 0) + v * weight);
      } else {
        for (const [dc, dr] of offsets) {
          const nk = surface.cellKey(c + dc, r + dr);
          if (nk) neighborSums.set(nk, (neighborSums.get(nk) || 0) + v);
        }
      }
    }
    // Ensure every existing cell is in the sum map (even if neighbors didn't reach it)
    for (const k of valueMap.keys()) {
      if (!neighborSums.has(k)) neighborSums.set(k, 0);
    }

    // Growth function: Gaussian around mu
    const nextMap = new Map();
    const hasFields = state.forceFields.length > 0;
    for (const [k, sum] of neighborSums) {
      const u = sum / nCount;
      const g = Math.exp(-0.5 * ((u - mu) / sigma) ** 2);
      const old = valueMap.get(k) ?? 0;
      let growth = 2 * g - 1;
      if (hasFields) {
        const [c, r] = parseKey(k);
        growth += getFieldBonus(c, r) / 10; // attract pushes toward growth, repel toward decay
      }
      const nv = Math.max(0, Math.min(1, old + dt * growth));
      if (nv > THRESH) nextMap.set(k, nv);
    }

    // Apply drift: compute shift, move alive set and valueMap together
    const dx = state.driftX, dy = state.driftY;
    let nextAlive;
    if (dx !== 0 || dy !== 0) {
      _driftAccX += dx; _driftAccY += dy;
      const intX = Math.trunc(_driftAccX);
      const intY = Math.trunc(_driftAccY);
      _driftAccX -= intX; _driftAccY -= intY;
      if (intX !== 0 || intY !== 0) {
        const shiftedValues = new Map();
        const shiftedAlive = new Set();
        for (const [k, v] of nextMap) {
          const [c, r] = parseKey(k);
          const nk = surface.cellKey(c + intX, r + intY);
          if (nk) { shiftedValues.set(nk, v); shiftedAlive.add(nk); }
        }
        valueMap = shiftedValues;
        nextAlive = shiftedAlive;
      } else {
        valueMap = nextMap;
        nextAlive = new Set(nextMap.keys());
      }
    } else {
      valueMap = nextMap;
      nextAlive = new Set(nextMap.keys());
    }

    if (state.sharedState) state.alive = nextAlive;
    else state.modeAlive[state.mode] = nextAlive;
    state.generation += 1;

    if (state.mode === "arcade") {
      if (state.comboTimer > 0) state.comboTimer -= 1;
      else state.combo = 1;
      state.score += 1;
      evaluateArcadeState();
    }
    if (state.zoneFlash.length > 0) {
      for (const z of state.zoneFlash) z.ttl -= 1;
      state.zoneFlash = state.zoneFlash.filter((z) => z.ttl > 0);
    }
  }

  function stepLife() {
    const alive = activeAlive();
    const surface = activeSurface();
    const neighborCounts = new Map();

    const offsets = getKernelOffsets();
    const repulse = state.repulseEnabled;
    const repulseAge = state.repulseAge;
    const repulseStrength = state.repulseStrength;
    const hasManifolds     = state.manifoldRegions.length > 0;
    const hasManifoldRules = hasManifolds && state.manifoldRegions.some(r => r.ruleOverride || r.curvatureModulate);

    for (const k of alive) {
      const [c, r] = parseKey(k);
      const w = (repulse && (cellAgeMap.get(k) ?? 0) >= repulseAge) ? -repulseStrength : 1;
      const mNeighbors = hasManifolds ? getManifoldNeighborWeights(c, r) : null;
      if (mNeighbors) {
        for (const { key: nk, weight } of mNeighbors)
          neighborCounts.set(nk, (neighborCounts.get(nk) || 0) + w * weight);
      } else {
        for (const [dc, dr] of offsets) {
          const nk = surface.cellKey(c + dc, r + dr);
          if (nk !== null) neighborCounts.set(nk, (neighborCounts.get(nk) || 0) + w);
        }
      }
    }

    const next = new Set();
    const nextAgeMap = new Map();
    const nextTypeMap = state.cellTypesEnabled ? new Map() : null;

    if (state.cellTypesEnabled) {
      // Per-type neighbor counts
      const countsA = new Map();
      const countsB = new Map();
      for (const k of alive) {
        const [c, r] = parseKey(k);
        const isA = (typeMap.get(k) ?? 0) === 0;
        const w = (repulse && (cellAgeMap.get(k) ?? 0) >= repulseAge) ? -repulseStrength : 1;
        const mNeighbors = hasManifolds ? getManifoldNeighborWeights(c, r) : null;
        if (mNeighbors) {
          for (const { key: nk, weight } of mNeighbors) {
            if (isA) countsA.set(nk, (countsA.get(nk) || 0) + w * weight);
            else countsB.set(nk, (countsB.get(nk) || 0) + w * weight);
          }
        } else {
          for (const [dc, dr] of offsets) {
            const nk = surface.cellKey(c + dc, r + dr);
            if (nk === null) continue;
            if (isA) countsA.set(nk, (countsA.get(nk) || 0) + w);
            else countsB.set(nk, (countsB.get(nk) || 0) + w);
          }
        }
      }
      // Evaluate per-cell survival/birth using each type's own rules
      const allCells = new Set([...neighborCounts.keys()]);
      for (const k of allCells) {
        const na = countsA.get(k) || 0;
        const nb = countsB.get(k) || 0;
        const n = neighborCounts.get(k) || 0;
        const wasAlive = alive.has(k);
        const myType = typeMap.get(k) ?? 0;
        const bornA = state.typeARuleB, survA = state.typeARuleS;
        const bornB = state.typeBRuleB, survB = state.typeBRuleS;
        let survives = false;
        if (wasAlive) {
          survives = myType === 0 ? survA.has(n) : survB.has(n);
        } else {
          survives = bornA.has(n) || bornB.has(n);
        }
        if (survives) {
          next.add(k);
          nextAgeMap.set(k, wasAlive ? (cellAgeMap.get(k) ?? 0) + 1 : 1);
          // Inherit type: majority vote among type-A vs type-B neighbors
          if (!wasAlive) {
            nextTypeMap.set(k, na >= nb ? 0 : 1);
          } else {
            nextTypeMap.set(k, myType);
          }
        }
      }
    } else {
      const densityBonus = state.densityFeedback
        ? Math.sign(state.densityTarget - alive.size) * state.densityStrength
        : 0;
      const hasZones  = state.zones.length > 0;
      const hasFields = state.forceFields.length > 0;
      const adjusted  = densityBonus !== 0 || hasZones || hasFields || hasManifoldRules;

      if (!adjusted) {
        const born = state.ruleB;
        const survive = state.ruleS;
        for (const [k, n] of neighborCounts) {
          if (born.has(n) || (alive.has(k) && survive.has(n))) {
            next.add(k);
            nextAgeMap.set(k, alive.has(k) ? (cellAgeMap.get(k) ?? 0) + 1 : 1);
          }
        }
      } else {
        for (const [k, n] of neighborCounts) {
          const [col, row] = parseKey(k);
          // Zones: last non-combining zone wins; combining zones union their rules on top
          let born = state.ruleB, survive = state.ruleS;
          if (hasZones) {
            let unionB = null, unionS = null;
            for (const z of state.zones) {
              if (col >= z.x && col < z.x + z.w && row >= z.y && row < z.y + z.h) {
                if (z.combine) {
                  if (!unionB) { unionB = new Set(born); unionS = new Set(survive); }
                  for (const b of z.ruleB) unionB.add(b);
                  for (const s of z.ruleS) unionS.add(s);
                } else {
                  born = z.ruleB; survive = z.ruleS;
                  unionB = null; unionS = null; // reset union on each exclusive zone
                }
              }
            }
            if (unionB) { born = unionB; survive = unionS; }
          }
          let adj = Math.max(0, n + (hasFields ? getFieldBonus(col, row) : 0) + densityBonus);
          if (hasManifoldRules) {
            const mr = getManifoldCellRule(col, row, adj);
            if (mr) { born = mr.born; survive = mr.survive; adj = mr.n; }
          }
          if (born.has(adj) || (alive.has(k) && survive.has(adj))) {
            next.add(k);
            nextAgeMap.set(k, alive.has(k) ? (cellAgeMap.get(k) ?? 0) + 1 : 1);
          }
        }
      }
    }

    const drifted = applyDrift(next, nextAgeMap, nextTypeMap);
    cellAgeMap = drifted.ages;
    if (nextTypeMap) {
      typeMap = drifted.types ?? nextTypeMap;
    }

    if (state.sharedState) state.alive = drifted.alive;
    else state.modeAlive[state.mode] = drifted.alive;
    state.generation += 1;

    if (state.contigRepulseEnabled) applyContigRepulsion();

    if (state.showTrails) {
      for (const k of alive) {
        if (!drifted.alive.has(k)) trailMap.set(k, 1.0);
      }
      for (const [k, v] of trailMap) {
        if (drifted.alive.has(k)) { trailMap.delete(k); continue; }
        const nv = v * state.trailDecay;
        if (nv < 0.02) trailMap.delete(k);
        else trailMap.set(k, nv);
      }
    }

    if (state.ruleCycleActive && state.generation > 0 && state.generation % state.ruleCyclePeriod === 0) {
      [state.ruleB, state.ruleB2] = [state.ruleB2, state.ruleB];
      [state.ruleS, state.ruleS2] = [state.ruleS2, state.ruleS];
      state._ruleDirty = true;
    }

    // Heatmap accumulation
    if (state.heatmapMode || state.heatmapOverlay) {
      for (const k of drifted.alive) {
        heatMap.set(k, (heatMap.get(k) || 0) + 1);
      }
    }

    // Trail entrenchment: cells that die repeatedly get carved in
    if (state.entrenchEnabled) {
      for (const k of alive) {
        if (!drifted.alive.has(k)) {
          const count = (entrenchMap.get(k) || 0) + 1;
          entrenchMap.set(k, count);
        }
      }
    }

    // Adaptive rules: pressure B/S toward a target population
    if (state.adaptRulesEnabled && state.generation > 0 && state.generation % state.adaptRate === 0) {
      const pop = drifted.alive.size;
      const prev = state._adaptPrevPop;
      state._adaptPrevPop = pop;
      if (pop < state.adaptTarget * 0.7 && prev !== 0) {
        // Too sparse: add a random birth neighbor count not already in ruleB
        const candidates = [1,2,3,4,5,6,7,8].filter(n => !state.ruleB.has(n));
        if (candidates.length > 0) {
          state.ruleB = new Set([...state.ruleB, candidates[Math.floor(Math.random() * candidates.length)]]);
          state._ruleDirty = true;
        }
      } else if (pop > state.adaptTarget * 1.3) {
        // Too dense: remove a random survival neighbor count from ruleS
        const surviving = [...state.ruleS];
        if (surviving.length > 1) {
          surviving.splice(Math.floor(Math.random() * surviving.length), 1);
          state.ruleS = new Set(surviving);
          state._ruleDirty = true;
        }
      }
    }

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
      const theta = Math.PI / 2 - (c / SPHERE_COLS) * Math.PI * 2;
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

    const sphereAlive = activeAlive();
    if (sphereAlive.size === 0) {
      cellMesh.geometry = new THREE.BufferGeometry();
      return;
    }

    const R = 5.015;
    const PAD = 0.08;
    const verts = [];
    const idxs = [];
    let vi = 0;

    for (const k of sphereAlive) {
      const [col, row] = parseKey(k);
      const phi1 = ((row + PAD) / SPHERE_ROWS) * Math.PI;
      const phi2 = ((row + 1 - PAD) / SPHERE_ROWS) * Math.PI;
      const theta1 = Math.PI / 2 - ((col + PAD) / SPHERE_COLS) * Math.PI * 2;
      const theta2 = Math.PI / 2 - ((col + 1 - PAD) / SPHERE_COLS) * Math.PI * 2;

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
      setCell(col + dx, row + dy, true);
    }
  }

  function spherePlacePrefab(id, col, row, opts = {}) {
    const prefab = getPrefabById(id);
    if (!prefab) return;
    const stamp = state._prefabStamp?.id === id ? state._prefabStamp : null;
    const rotate = opts.rotate ?? stamp?.rotate ?? 0;
    const flipX  = opts.flipX  ?? stamp?.flipX  ?? false;
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

    const stamp = state._prefabStamp?.id === prefabId ? state._prefabStamp : null;
    const cells = transformCells(prefab.cells, stamp?.rotate ?? 0, stamp?.flipX ?? false);
    const R = 5.022;
    const PAD = 0.08;
    const verts = [];
    const idxs = [];
    let vi = 0;

    for (const [dx, dy] of cells) {
      const col = (((hover.col + dx) % SPHERE_COLS) + SPHERE_COLS) % SPHERE_COLS;
      const row = (((hover.row + dy) % SPHERE_ROWS) + SPHERE_ROWS) % SPHERE_ROWS;
      const phi1 = ((row + PAD) / SPHERE_ROWS) * Math.PI;
      const phi2 = ((row + 1 - PAD) / SPHERE_ROWS) * Math.PI;
      const theta1 = Math.PI / 2 - ((col + PAD) / SPHERE_COLS) * Math.PI * 2;
      const theta2 = Math.PI / 2 - ((col + 1 - PAD) / SPHERE_COLS) * Math.PI * 2;
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

  function getRenderer() {
    if (!_threeRenderer) {
      const dpr = window.devicePixelRatio || 1;
      _threeRenderer = new THREE.WebGLRenderer({ canvas: sphereCanvas, antialias: true });
      _threeRenderer.setPixelRatio(dpr);
      _threeRenderer.setClearColor(0x07121a);
    }
    return _threeRenderer;
  }

  function initSphereRenderer() {
    const w = sphereCanvas.offsetWidth || 800;
    const h = sphereCanvas.offsetHeight || 600;

    const renderer = getRenderer();
    renderer.setSize(w, h, false);

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
    const col = ((Math.floor((0.25 - theta / (Math.PI * 2)) * SPHERE_COLS) % SPHERE_COLS) + SPHERE_COLS) % SPHERE_COLS;
    const row = Math.max(0, Math.min(SPHERE_ROWS - 1, Math.floor((phi / Math.PI) * SPHERE_ROWS)));
    return { col, row };
  }

  function sphereSetCell(col, row, alive) {
    setCell(col, row, alive);
  }

  function hitCell3D(clientX, clientY) {
    if (state.mode === "sphere") return sphereHitCell(clientX, clientY);
    return manifoldHitCell(clientX, clientY);
  }

  function init3DInput() {
    if (threeDInputSetup) return;
    threeDInputSetup = true;

    sphereCanvas.addEventListener("contextmenu", (e) => e.preventDefault());

    sphereCanvas.addEventListener("pointerdown", (e) => {
      sphereCanvas.setPointerCapture(e.pointerId);
      if (e.button === 2) {
        state.sphereDrag = true;
        state.sphereDragLastX = e.clientX;
        state.sphereDragLastY = e.clientY;
      } else if (e.button === 0) {
        const cell = hitCell3D(e.clientX, e.clientY);
        if (cell) {
          state.spherePaintValue = activeAlive().has(normCoord(cell.col, cell.row)) ? 0 : 1;
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
        const cell = hitCell3D(e.clientX, e.clientY);
        if (cell) sphereSetCell(cell.col, cell.row, state.spherePaintValue === 1);
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
      state.sphereHoverCell = hitCell3D(e.clientX, e.clientY);
      e.dataTransfer.dropEffect = "copy";
    });

    sphereCanvas.addEventListener("dragleave", () => {
      state.sphereHoverCell = null;
    });

    sphereCanvas.addEventListener("drop", (e) => {
      e.preventDefault();
      const id = e.dataTransfer.getData("text/plain") || state.draggingPrefabId;
      const cell = hitCell3D(e.clientX, e.clientY);
      state.sphereHoverCell = null;
      if (!id || !cell) return;
      const stamp = state._prefabStamp?.id === id ? state._prefabStamp : null;
      spherePlacePrefab(id, cell.col, cell.row, { rotate: stamp?.rotate ?? 0, flipX: stamp?.flipX ?? false });
      state.selectedPrefabId = id;
      refreshPaletteSelection();
      const prefab = getPrefabById(id);
      if (prefab) renderInspector(prefab);
      state.draggingPrefabId = null;
    });
  }

  // --- End sphere mode ---

  // --- Generic parametric manifold renderer ---

  function buildParametricBgMesh(sfn) {
    const W = SPHERE_COLS, H = SPHERE_ROWS;
    const pos = [], uvs = [], idx = [];
    for (let iv = 0; iv <= H; iv++) {
      for (let iu = 0; iu <= W; iu++) {
        const s = iu / W, t = iv / H, p = sfn(s, t);
        pos.push(p.x, p.y, p.z);
        uvs.push(s, t);
      }
    }
    for (let iv = 0; iv < H; iv++) {
      for (let iu = 0; iu < W; iu++) {
        const a = iv * (W + 1) + iu, b = a + 1, c = a + (W + 1), d = c + 1;
        idx.push(a, b, c, b, d, c);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(idx);
    return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x07121a, side: THREE.DoubleSide }));
  }

  function buildParametricGridLines(sfn) {
    const W = SPHERE_COLS, H = SPHERE_ROWS, SEGS = 32;
    const verts = [];
    for (let row = 0; row <= H; row++) {
      const t = row / H;
      for (let i = 0; i < SEGS; i++) {
        const p0 = sfn(i / SEGS, t), p1 = sfn((i + 1) / SEGS, t);
        verts.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z);
      }
    }
    for (let col = 0; col <= W; col++) {
      const s = col / W;
      for (let i = 0; i < SEGS; i++) {
        const p0 = sfn(s, i / SEGS), p1 = sfn(s, (i + 1) / SEGS);
        verts.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
    return new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x1a4a66, transparent: true, opacity: 0.55 }));
  }

  function buildManifoldCellMesh(mT) {
    mT.cellMesh.geometry.dispose();
    const sfn = mT.surfaceFunc, W = SPHERE_COLS, H = SPHERE_ROWS, PAD = 0.05;
    const alive = activeAlive();
    if (alive.size === 0) { mT.cellMesh.geometry = new THREE.BufferGeometry(); return; }
    const verts = [], idx = [];
    let vi = 0;
    for (const k of alive) {
      const [col, row] = parseKey(k);
      const s1 = (col + PAD) / W, s2 = (col + 1 - PAD) / W;
      const t1 = (row + PAD) / H, t2 = (row + 1 - PAD) / H;
      for (const p of [sfn(s1, t1), sfn(s2, t1), sfn(s2, t2), sfn(s1, t2)]) verts.push(p.x, p.y, p.z);
      idx.push(vi, vi + 1, vi + 2, vi, vi + 2, vi + 3);
      vi += 4;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
    geo.setIndex(idx);
    mT.cellMesh.geometry = geo;
  }

  function buildManifoldHoverMesh(mT) {
    mT.hoverMesh.geometry.dispose();
    const sfn = mT.surfaceFunc, W = SPHERE_COLS, H = SPHERE_ROWS, PAD = 0.05;
    const prefabId = state.draggingPrefabId || state.selectedPrefabId;
    const hover = state.sphereHoverCell;
    if (!hover || !prefabId) { mT.hoverMesh.geometry = new THREE.BufferGeometry(); return; }
    const prefab = getPrefabById(prefabId);
    if (!prefab) { mT.hoverMesh.geometry = new THREE.BufferGeometry(); return; }
    const stampM = state._prefabStamp?.id === prefabId ? state._prefabStamp : null;
    const cells = transformCells(prefab.cells, stampM?.rotate ?? 0, stampM?.flipX ?? false);
    const verts = [], idx = [];
    let vi = 0;
    for (const [dx, dy] of cells) {
      const col = (((hover.col + dx) % W) + W) % W;
      const row = Math.max(0, Math.min(H - 1, hover.row + dy));
      const s1 = (col + PAD) / W, s2 = (col + 1 - PAD) / W;
      const t1 = (row + PAD) / H, t2 = (row + 1 - PAD) / H;
      for (const p of [sfn(s1, t1), sfn(s2, t1), sfn(s2, t2), sfn(s1, t2)]) verts.push(p.x, p.y, p.z);
      idx.push(vi, vi + 1, vi + 2, vi, vi + 2, vi + 3);
      vi += 4;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
    geo.setIndex(idx);
    mT.hoverMesh.geometry = geo;
  }

  function manifoldHitCell(clientX, clientY) {
    if (!manifoldThree) return null;
    const { raycaster, camera, bgMesh, mouse } = manifoldThree;
    const rect = sphereCanvas.getBoundingClientRect();
    mouse.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObject(bgMesh);
    if (!hits.length || !hits[0].uv) return null;
    const col = Math.max(0, Math.min(SPHERE_COLS - 1, Math.floor(hits[0].uv.x * SPHERE_COLS)));
    const row = Math.max(0, Math.min(SPHERE_ROWS - 1, Math.floor(hits[0].uv.y * SPHERE_ROWS)));
    return { col, row };
  }

  function initManifoldRenderer() {
    const surface = SURFACES[state.mode];
    if (!surface || !surface.surfaceFunc) return;
    const sfn = (s, t) => surface.surfaceFunc(s, t);
    const renderer = getRenderer();
    const w = sphereCanvas.offsetWidth || 800;
    const h = sphereCanvas.offsetHeight || 600;
    renderer.setSize(w, h, false);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100);
    camera.position.z = state.sphereCameraZ;
    const group = new THREE.Group();
    scene.add(group);
    const bgMesh = buildParametricBgMesh(sfn);
    group.add(bgMesh);
    const gridLines = buildParametricGridLines(sfn);
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
    manifoldThree = {
      renderer, scene, camera, group, bgMesh, gridLines, cellMesh, hoverMesh,
      raycaster: new THREE.Raycaster(), mouse: new THREE.Vector2(), surfaceFunc: sfn,
    };
  }

  function renderManifold() {
    if (!manifoldThree) return;
    const { renderer, scene, camera, group, gridLines } = manifoldThree;
    camera.position.z = state.sphereCameraZ;
    group.rotation.x = state.sphereRotX;
    group.rotation.y = state.sphereRotY;
    gridLines.visible = state.showGrid;
    buildManifoldCellMesh(manifoldThree);
    buildManifoldHoverMesh(manifoldThree);
    renderer.render(scene, camera);
  }

  // --- End generic manifold renderer ---

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
    const pad = Math.max(1, Math.floor(state.zoom * 0.08));
    const cw = Math.ceil(state.zoom) - pad * 2;

    // Entrench layer (deepest, always rendered under everything else)
    if (state.entrenchEnabled && entrenchMap.size > 0) {
      for (const [k, count] of entrenchMap) {
        if (count < state.entrenchThreshold) continue;
        const [col, row] = parseKey(k);
        if (col < minX || col > maxX || row < minY || row > maxY) continue;
        const screen = worldToScreen(col, row);
        const alpha = Math.min(0.85, 0.2 + (count - state.entrenchThreshold) * 0.04);
        ctx.fillStyle = `rgba(60,80,180,${alpha.toFixed(2)})`;
        ctx.fillRect(Math.floor(screen.x) + pad, Math.floor(screen.y) + pad, cw, cw);
      }
    }

    // Heatmap-only mode: render heat instead of live cells
    if (state.heatmapMode && heatMap.size > 0) {
      let maxCount = 1;
      for (const v of heatMap.values()) if (v > maxCount) maxCount = v;
      for (const [k, count] of heatMap) {
        const [col, row] = parseKey(k);
        if (col < minX || col > maxX || row < minY || row > maxY) continue;
        const screen = worldToScreen(col, row);
        ctx.fillStyle = heatColor(count, maxCount);
        ctx.fillRect(Math.floor(screen.x) + pad, Math.floor(screen.y) + pad, cw, cw);
      }
      return;
    }

    if (state.showTrails && trailMap.size > 0) {
      for (const [k, v] of trailMap) {
        const [col, row] = parseKey(k);
        if (col < minX || col > maxX || row < minY || row > maxY) continue;
        const screen = worldToScreen(col, row);
        ctx.fillStyle = `rgba(142,242,255,${(v * 0.55).toFixed(3)})`;
        ctx.fillRect(Math.floor(screen.x) + pad, Math.floor(screen.y) + pad, cw, cw);
      }
    }

    // Heatmap overlay on top of trails, under cells
    if (state.heatmapOverlay && heatMap.size > 0) {
      let maxCount = 1;
      for (const v of heatMap.values()) if (v > maxCount) maxCount = v;
      for (const [k, count] of heatMap) {
        const [col, row] = parseKey(k);
        if (col < minX || col > maxX || row < minY || row > maxY) continue;
        const screen = worldToScreen(col, row);
        ctx.fillStyle = heatColor(count, maxCount);
        ctx.fillRect(Math.floor(screen.x) + pad, Math.floor(screen.y) + pad, cw, cw);
      }
    }

    if (state.leniaMode && valueMap.size > 0) {
      for (const [k, v] of valueMap) {
        const [col, row] = parseKey(k);
        if (col < minX || col > maxX || row < minY || row > maxY) continue;
        const screen = worldToScreen(col, row);
        ctx.fillStyle = leniaColor(v);
        ctx.fillRect(Math.floor(screen.x) + pad, Math.floor(screen.y) + pad, cw, cw);
      }
    } else if (state.cellTypesEnabled) {
      for (const k of activeAlive()) {
        const [col, row] = parseKey(k);
        if (col < minX || col > maxX || row < minY || row > maxY) continue;
        const screen = worldToScreen(col, row);
        ctx.fillStyle = (typeMap.get(k) ?? 0) === 0 ? state.typeAColor : state.typeBColor;
        ctx.fillRect(Math.floor(screen.x) + pad, Math.floor(screen.y) + pad, cw, cw);
      }
    } else if (state.colorByAge) {
      for (const k of activeAlive()) {
        const [col, row] = parseKey(k);
        if (col < minX || col > maxX || row < minY || row > maxY) continue;
        const screen = worldToScreen(col, row);
        ctx.fillStyle = ageColor(cellAgeMap.get(k) ?? 0);
        ctx.fillRect(Math.floor(screen.x) + pad, Math.floor(screen.y) + pad, cw, cw);
      }
    } else {
      ctx.fillStyle = "#8ef2ff";
      for (const k of activeAlive()) {
        const [col, row] = parseKey(k);
        if (col < minX || col > maxX || row < minY || row > maxY) continue;
        const screen = worldToScreen(col, row);
        ctx.fillRect(Math.floor(screen.x) + pad, Math.floor(screen.y) + pad, cw, cw);
      }
    }
  }

  function drawZones() {
    if (state.mode !== "arcade" || !state.levelState) return;
    const zones = [];
    const ls = state.levelState;
    if (ls.receptor) zones.push({ ...ls.receptor, kind: "receptor" });
    if (ls.receptors) for (const r of ls.receptors) zones.push({ ...r, kind: "receptor" });
    if (ls.switches) for (const sw of ls.switches) zones.push({ ...sw, kind: "switch" });
    if (ls.beaconZone) zones.push({ ...ls.beaconZone, kind: "beacon" });
    if (ls.coreBlock) zones.push({ ...ls.coreBlock, kind: "core" });
    if (ls.dangerZone) zones.push({ ...ls.dangerZone, kind: "danger" });

    for (const z of zones) {
      const topLeft = worldToScreen(z.x, z.y);
      const width = z.w * state.zoom;
      const height = z.h * state.zoom;
      ctx.lineWidth = 2;
      if (z.kind === "receptor") ctx.strokeStyle = z.hit ? "#5be0bc" : "#f2b84b";
      else if (z.kind === "switch") ctx.strokeStyle = z.hit ? "#5be0bc" : "#ff8b5e";
      else if (z.kind === "core") ctx.strokeStyle = "#9cd4ff";
      else if (z.kind === "danger") ctx.strokeStyle = z.breached ? "#ff3b3b" : "#ff6b6b";
      else ctx.strokeStyle = "#9fd8ae";
      ctx.strokeRect(topLeft.x, topLeft.y, width, height);
      if (z.kind === "danger" && !z.breached) {
        ctx.fillStyle = "rgba(255, 107, 107, 0.06)";
        ctx.fillRect(topLeft.x, topLeft.y, width, height);
      }
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

    // Ghost preview: stamp mode takes priority over drag
    const stamp = state._prefabStamp;
    const dragId = state.draggingPrefabId;
    const ghostId = stamp?.id ?? dragId;
    if (!ghostId) return;

    const prefab = getPrefabById(ghostId);
    if (!prefab) return;

    const rotate = stamp?.rotate ?? 0;
    const flipX  = stamp?.flipX  ?? false;
    const transformed = transformCells(prefab.cells, rotate, flipX);

    ctx.fillStyle = "rgba(91,224,188,0.35)";
    ctx.strokeStyle = "rgba(91,224,188,0.7)";
    ctx.lineWidth = 1;
    let minSX = Infinity, minSY = Infinity, maxSX = -Infinity, maxSY = -Infinity;
    for (const [dx, dy] of transformed) {
      const q = worldToScreen(state.hoverCell.x + dx, state.hoverCell.y + dy);
      ctx.fillRect(q.x + 1, q.y + 1, state.zoom - 2, state.zoom - 2);
      ctx.strokeRect(q.x + 0.5, q.y + 0.5, state.zoom - 1, state.zoom - 1);
      if (q.x < minSX) minSX = q.x;
      if (q.y < minSY) minSY = q.y;
      if (q.x + state.zoom > maxSX) maxSX = q.x + state.zoom;
      if (q.y + state.zoom > maxSY) maxSY = q.y + state.zoom;
    }

    // Transform badge above the pattern
    if (stamp && (rotate !== 0 || flipX)) {
      const label = [rotate ? `↻${rotate}°` : "", flipX ? "↔" : ""].filter(Boolean).join(" ");
      ctx.save();
      ctx.font = "bold 11px monospace";
      const tw = ctx.measureText(label).width;
      const bx = minSX + (maxSX - minSX) / 2 - tw / 2 - 4;
      const by = minSY - 18;
      ctx.fillStyle = "rgba(7,18,26,0.78)";
      ctx.fillRect(bx, by, tw + 8, 16);
      ctx.fillStyle = "#5be0bc";
      ctx.fillText(label, bx + 4, by + 12);
      ctx.restore();
    }
  }

  function drawStampHint() {
    if (state.canvasMode !== "prefab" || !state._prefabStamp) return;
    const prefab = getPrefabById(state._prefabStamp.id);
    const name = prefab?.name ?? "";
    const rot = state._prefabStamp.rotate;
    const flp = state._prefabStamp.flipX;
    const transformPart = [rot ? `↻${rot}°` : "", flp ? "↔" : ""].filter(Boolean).join(" ");
    const label = `Stamp: ${name}${transformPart ? "  " + transformPart : ""}   R rotate · F flip · Esc cancel`;
    const cw = canvas.clientWidth;
    const tlBar = document.getElementById("timelineBar");
    const canvasRect = canvas.getBoundingClientRect();
    const tlRect = tlBar?.getBoundingClientRect();
    const hintBottom = tlRect ? (tlRect.top - canvasRect.top) : canvas.clientHeight;
    ctx.save();
    ctx.fillStyle = "rgba(7,18,26,0.82)";
    ctx.fillRect(0, hintBottom - 26, cw, 26);
    ctx.font = "11px 'Trebuchet MS', monospace";
    ctx.fillStyle = "#9dc5d2";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, cw / 2, hintBottom - 13);
    ctx.restore();
  }

  function drawSelectionHint() {
    const sel = state.selection;
    if (state.canvasMode !== "select" || !sel || sel.w <= 0 || sel.h <= 0) return;
    const label = `${sel.w} × ${sel.h}   R rotate · F flip · Del delete · drag to move`;
    const cw = canvas.clientWidth;
    const tlBar = document.getElementById("timelineBar");
    const canvasRect = canvas.getBoundingClientRect();
    const tlRect = tlBar?.getBoundingClientRect();
    const hintBottom = tlRect ? (tlRect.top - canvasRect.top) : canvas.clientHeight;
    ctx.save();
    ctx.fillStyle = "rgba(7,18,26,0.82)";
    ctx.fillRect(0, hintBottom - 26, cw, 26);
    ctx.font = "11px 'Trebuchet MS', monospace";
    ctx.fillStyle = "#9dc5d2";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, cw / 2, hintBottom - 13);
    ctx.restore();
  }

  function drawManifoldBorder() {
    if (is3DMode()) return;
    // Legacy global surface border
    const surface = activeSurface();
    if (surface !== SURFACES.flat) {
      const tl = worldToScreen(0, 0);
      const br = worldToScreen(SPHERE_COLS, SPHERE_ROWS);
      const w = br.x - tl.x, h = br.y - tl.y;
      ctx.save();
      ctx.strokeStyle = "rgba(91,224,188,0.22)";
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(tl.x, tl.y, w, h);
      ctx.setLineDash([]);
      const mid = { x: tl.x + w / 2, y: tl.y + h / 2 };
      ctx.strokeStyle = "rgba(91,224,188,0.45)";
      ctx.lineWidth = 1.5;
      const t = 8;
      ctx.beginPath(); ctx.moveTo(mid.x - t, tl.y); ctx.lineTo(mid.x + t, tl.y); ctx.stroke();
      const flipY = surface === SURFACES.klein || surface === SURFACES.mobius;
      ctx.beginPath(); ctx.moveTo(mid.x + (flipY ? t : -t), br.y); ctx.lineTo(mid.x + (flipY ? -t : t), br.y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(tl.x, mid.y - t); ctx.lineTo(tl.x, mid.y + t); ctx.stroke();
      const flipX = surface === SURFACES.rp2;
      ctx.beginPath(); ctx.moveTo(br.x, mid.y + (flipX ? t : -t)); ctx.lineTo(br.x, mid.y + (flipX ? -t : t)); ctx.stroke();
      ctx.restore();
    }

    // Draw manifold region overlays
    if (state.manifoldRegions.length === 0 && !state._manifoldDrag) return;
    ctx.save();

    const { SHAPE_META } = window.ManifoldEngine;

    for (const region of state.manifoldRegions) {
      if (region.visible === false) continue;
      const { x, y, w, h } = region.rect;
      const shape = region.shape;
      const tl = worldToScreen(x, y);
      const br = worldToScreen(x + w, y + h);
      const sw = br.x - tl.x, sh = br.y - tl.y;
      const selected = state._manifoldSelected === region.id;

      // Tint fill
      ctx.fillStyle = selected ? 'rgba(91,224,188,0.10)' : 'rgba(91,224,188,0.04)';
      ctx.fillRect(tl.x, tl.y, sw, sh);

      // Border
      ctx.strokeStyle = selected ? 'rgba(91,224,188,0.95)' : 'rgba(91,224,188,0.45)';
      ctx.lineWidth = selected ? 1.5 : 1;
      ctx.setLineDash(selected ? [] : [4, 4]);
      ctx.strokeRect(tl.x + 0.5, tl.y + 0.5, sw - 1, sh - 1);
      ctx.setLineDash([]);

      // Label (icon + id) at top-left if region is large enough on screen
      if (sw > 40 && sh > 16) {
        const meta = SHAPE_META[shape] || {};
        const label = `${meta.icon || '?'} ${shape} #${region.id}`;
        ctx.font = 'bold 10px monospace';
        ctx.fillStyle = 'rgba(91,224,188,0.85)';
        ctx.fillText(label, tl.x + 4, tl.y + 12);
      }

      // Identification-direction tick marks on edges
      const mid = { x: tl.x + sw / 2, y: tl.y + sh / 2 };
      ctx.strokeStyle = 'rgba(91,224,188,0.55)';
      ctx.lineWidth = 1.2;
      const t = Math.min(7, sw / 4, sh / 4);
      const flipY = shape === 'klein' || shape === 'mobius';
      const flipX = shape === 'rp2';
      ctx.beginPath(); ctx.moveTo(mid.x - t, tl.y); ctx.lineTo(mid.x + t, tl.y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(mid.x + (flipY ? t : -t), tl.y + sh); ctx.lineTo(mid.x + (flipY ? -t : t), tl.y + sh); ctx.stroke();
      if (shape !== 'cylinder') {
        ctx.beginPath(); ctx.moveTo(tl.x, mid.y - t); ctx.lineTo(tl.x, mid.y + t); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(br.x, mid.y + (flipX ? t : -t)); ctx.lineTo(br.x, mid.y + (flipX ? -t : t)); ctx.stroke();
      }

      // 8 resize handles when selected
      if (selected) {
        const HANDLE = 6;
        const hpts = [
          [tl.x, tl.y], [mid.x, tl.y], [br.x, tl.y],
          [tl.x, mid.y],                [br.x, mid.y],
          [tl.x, br.y], [mid.x, br.y], [br.x, br.y],
        ];
        ctx.fillStyle = 'rgba(91,224,188,1)';
        for (const [hx, hy] of hpts) {
          ctx.fillRect(hx - HANDLE / 2, hy - HANDLE / 2, HANDLE, HANDLE);
        }
      }
    }

    // Ghost while dragging a new region
    if (state.canvasMode === 'manifold' && state._manifoldDrag) {
      const d = state._manifoldDrag;
      const tl2 = worldToScreen(Math.min(d.x0, d.x1), Math.min(d.y0, d.y1));
      const br2 = worldToScreen(Math.max(d.x0, d.x1) + 1, Math.max(d.y0, d.y1) + 1);
      ctx.strokeStyle = 'rgba(91,224,188,0.7)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(tl2.x, tl2.y, br2.x - tl2.x, br2.y - tl2.y);
      ctx.fillStyle = 'rgba(91,224,188,0.05)';
      ctx.fillRect(tl2.x, tl2.y, br2.x - tl2.x, br2.y - tl2.y);
      ctx.setLineDash([]);
    }

    ctx.restore();
  }

  // ─── Christoffel / curvature visualization ────────────────────────────────

  // Precomputed 256-entry rgba strings for two colormaps.
  // Magnitude: dark navy → teal → amber → red
  const _CMAP_MAG = (() => {
    const stops = [[7,17,40],[0,53,128],[91,224,188],[255,209,102],[239,35,60]];
    return Array.from({ length: 256 }, (_, i) => {
      const t = i / 255, n = stops.length - 1;
      const fi = t * n, j = Math.min(n - 1, Math.floor(fi)), f = fi - j;
      const [r0,g0,b0] = stops[j], [r1,g1,b1] = stops[j + 1];
      return `rgba(${Math.round(r0+(r1-r0)*f)},${Math.round(g0+(g1-g0)*f)},${Math.round(b0+(b1-b0)*f)},0.76)`;
    });
  })();
  // Diverging: deep violet (negative) → near-black (zero) → electric gold (positive)
  const _CMAP_DIV = (() => {
    const neg = [[140,30,220],[70,10,110],[15,5,35]];
    const pos = [[30,5,15],[160,90,5],[255,204,50]];
    return Array.from({ length: 256 }, (_, i) => {
      const t = i / 255;
      let r, g, b;
      if (t <= 0.5) {
        const s = (0.5 - t) * 2, j = Math.min(1, Math.floor(s * 2)), f = s * 2 - j;
        const [r0,g0,b0] = neg[j], [r1,g1,b1] = neg[j + 1] ?? neg[j];
        r = r0+(r1-r0)*f; g = g0+(g1-g0)*f; b = b0+(b1-b0)*f;
      } else {
        const s = (t - 0.5) * 2, j = Math.min(1, Math.floor(s * 2)), f = s * 2 - j;
        const [r0,g0,b0] = pos[j], [r1,g1,b1] = pos[j + 1] ?? pos[j];
        r = r0+(r1-r0)*f; g = g0+(g1-g0)*f; b = b0+(b1-b0)*f;
      }
      return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},0.76)`;
    });
  })();

  function _christoffelRoundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function drawChristoffelHeatmap() {
    if (!state.christoffelVis || !state.manifoldRegions.length) return;
    ctx.save();
    const comp = state.christoffelComponent;
    const isBipolar = comp !== 'magnitude';
    const gaussK = window.ManifoldEngine.computeGaussianCurvature;

    for (const region of state.manifoldRegions) {
      if (region.visible === false) continue;
      const { x: rx, y: ry, w: W, h: H } = region.rect;

      // First pass: collect values and find range
      const vals = new Float32Array(W * H);
      let minV = Infinity, maxV = -Infinity;
      for (let ly = 0; ly < H; ly++) {
        for (let lx = 0; lx < W; lx++) {
          const G = region.christoffelMap.get(key(rx + lx, ry + ly));
          let v = 0;
          if (G) {
            if (comp === 'magnitude') {
              let s = 0; for (let i = 0; i < 6; i++) s += G[i] * G[i]; v = Math.sqrt(s);
            } else if (comp === 'gaussian') {
              v = gaussK(lx, ly, W, H, region.shape);
            } else {
              v = G[parseInt(comp.slice(1), 10)];
            }
          }
          vals[ly * W + lx] = v;
          if (v < minV) minV = v;
          if (v > maxV) maxV = v;
        }
      }

      const absMax = Math.max(Math.abs(minV), Math.abs(maxV));
      if (absMax === 0) continue;

      // Second pass: draw colored cell rects
      const cmap = isBipolar ? _CMAP_DIV : _CMAP_MAG;
      for (let ly = 0; ly < H; ly++) {
        for (let lx = 0; lx < W; lx++) {
          const v = vals[ly * W + lx];
          const t = isBipolar ? 0.5 + 0.5 * (v / absMax) : (maxV > 0 ? v / maxV : 0);
          const sc = worldToScreen(rx + lx, ry + ly);
          ctx.fillStyle = cmap[Math.round(Math.max(0, Math.min(1, t)) * 255)];
          ctx.fillRect(sc.x, sc.y, state.zoom + 0.5, state.zoom + 0.5);
        }
      }
    }
    ctx.restore();
  }

  function drawChristoffelHover() {
    if (!state.christoffelVis || !state.hoverCell) return;
    const hc = state.hoverCell;
    const cx = Math.floor(hc.x), cy = Math.floor(hc.y);

    // Find topmost visible manifold region containing the hover cell
    let region = null;
    for (let i = state.manifoldRegions.length - 1; i >= 0; i--) {
      const r = state.manifoldRegions[i];
      if (r.visible !== false && r.containsCell(cx, cy)) { region = r; break; }
    }
    if (!region) return;

    const G = region.christoffelMap.get(key(cx, cy));
    if (!G) return;

    const { computeGaussianCurvature: gaussK, SHAPE_META } = window.ManifoldEngine;
    const { x: rx, y: ry, w: W, h: H } = region.rect;
    const lx = cx - rx, ly = cy - ry;

    let mag = 0; for (let i = 0; i < 6; i++) mag += G[i] * G[i]; mag = Math.sqrt(mag);
    const gaussCurv = gaussK(lx, ly, W, H, region.shape);
    const uStr = ((lx + 0.5) / W).toFixed(3);
    const vStr = ((ly + 0.5) / H).toFixed(3);
    const meta = SHAPE_META[region.shape] || {};

    ctx.save();

    // ── Neighbor web ────────────────────────────────────────────────────────
    const neighbors = region.neighborWeightMap.get(key(cx, cy)) || [];
    const cellCenter = worldToScreen(cx + 0.5, cy + 0.5);

    for (const { key: nk, weight } of neighbors) {
      const [nkx, nky] = parseKey(nk);
      const nc = worldToScreen(nkx + 0.5, nky + 0.5);
      const alpha = Math.min(0.9, 0.35 + weight * 0.55);
      ctx.strokeStyle = `rgba(91,224,188,${alpha.toFixed(2)})`;
      ctx.lineWidth = weight > 0.5 ? 1.5 : 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(cellCenter.x, cellCenter.y); ctx.lineTo(nc.x, nc.y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = `rgba(91,224,188,${alpha.toFixed(2)})`;
      ctx.beginPath(); ctx.arc(nc.x, nc.y, 2.5, 0, Math.PI * 2); ctx.fill();
    }

    // Highlight hovered cell
    const sc = worldToScreen(cx, cy);
    ctx.strokeStyle = 'rgba(91,224,188,1)';
    ctx.lineWidth = 2;
    ctx.strokeRect(sc.x + 1, sc.y + 1, state.zoom - 2, state.zoom - 2);

    // ── Tensor card ─────────────────────────────────────────────────────────
    const lines = [
      `[${cx}, ${cy}]  ${meta.label || region.shape} #${region.id}`,
      `u = ${uStr}   v = ${vStr}`,
      `|Γ| = ${mag.toFixed(4)}   K = ${gaussCurv.toFixed(4)}`,
      `Γᵘᵤᵤ ${G[0].toFixed(3)}  Γᵘᵤᵥ ${G[1].toFixed(3)}  Γᵘᵥᵥ ${G[2].toFixed(3)}`,
      `Γᵛᵤᵤ ${G[3].toFixed(3)}  Γᵛᵤᵥ ${G[4].toFixed(3)}  Γᵛᵥᵥ ${G[5].toFixed(3)}`,
    ];
    const PAD = 9, LH = 14, TW = 274, TH = PAD * 2 + lines.length * LH;
    let tx = sc.x + state.zoom + 10, ty = sc.y - 4;
    if (tx + TW > canvas.width - 4) tx = sc.x - TW - 10;
    ty = Math.max(4, Math.min(canvas.height - TH - 4, ty));

    ctx.fillStyle = 'rgba(6,14,26,0.93)';
    _christoffelRoundRect(tx, ty, TW, TH, 6); ctx.fill();
    ctx.strokeStyle = 'rgba(91,224,188,0.38)';
    ctx.lineWidth = 1;
    _christoffelRoundRect(tx, ty, TW, TH, 6); ctx.stroke();

    ctx.font = '9.5px "JetBrains Mono", ui-monospace, monospace';
    ctx.textBaseline = 'top';
    lines.forEach((line, i) => {
      ctx.fillStyle = i === 0 ? 'rgba(91,224,188,1)'
                    : i === 2 ? 'rgba(255,209,102,0.92)'
                    : 'rgba(190,215,205,0.8)';
      ctx.fillText(line, tx + PAD, ty + PAD + i * LH);
    });

    ctx.restore();
  }

  function drawZoneBoundary() {
    if (state.zones.length === 0 && !state._zoneDrawing) return;
    ctx.save();
    ctx.font = "bold 11px monospace";

    // Committed zones
    for (const z of state.zones) {
      if (z.visible === false) continue;
      const tl = worldToScreen(z.x, z.y);
      const br = worldToScreen(z.x + z.w, z.y + z.h);
      const sw = br.x - tl.x, sh = br.y - tl.y;
      const isSelected = z.id === state._zoneSelected;
      const hex = z.color;

      // Fill
      ctx.fillStyle = hex + (isSelected ? '28' : '18');
      ctx.fillRect(tl.x, tl.y, sw, sh);

      // Border
      ctx.strokeStyle = hex + (isSelected ? 'cc' : '88');
      ctx.lineWidth = isSelected ? 2 : 1.5;
      ctx.setLineDash(isSelected ? [] : [5, 3]);
      ctx.strokeRect(tl.x, tl.y, sw, sh);
      ctx.setLineDash([]);

      // Label
      ctx.fillStyle = hex + 'dd';
      const label = z.name + '  ' + _ruleToStr(z.ruleB, z.ruleS);
      if (sw > 40 && sh > 14) ctx.fillText(label, tl.x + 4, tl.y + 13);

      // Resize handles when selected
      if (isSelected) {
        const HANDLE = 7;
        const hpts = [
          [tl.x, tl.y], [tl.x + sw/2, tl.y], [br.x, tl.y],
          [tl.x, tl.y + sh/2],                 [br.x, tl.y + sh/2],
          [tl.x, br.y], [tl.x + sw/2, br.y],   [br.x, br.y],
        ];
        ctx.fillStyle = hex + 'ff';
        for (const [hx, hy] of hpts) {
          ctx.fillRect(hx - HANDLE/2, hy - HANDLE/2, HANDLE, HANDLE);
        }
      }
    }

    // In-progress drag ghost
    if (state._zoneDrawing) {
      const d = state._zoneDrawing;
      const x1 = Math.min(d.x0, d.x1), y1 = Math.min(d.y0, d.y1);
      const x2 = Math.max(d.x0, d.x1), y2 = Math.max(d.y0, d.y1);
      const tl = worldToScreen(x1, y1);
      const br = worldToScreen(x2 + 1, y2 + 1);
      ctx.fillStyle = 'rgba(255,224,107,0.15)';
      ctx.fillRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
      ctx.strokeStyle = 'rgba(255,224,107,0.8)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
      ctx.setLineDash([]);
    }

    ctx.restore();
  }

  function _ffScreenCenter(ff) {
    const sc = worldToScreen(ff.x, ff.y);
    return { cx: sc.x + state.zoom * 0.5, cy: sc.y + state.zoom * 0.5 };
  }

  function drawForceFields() {
    if (state.forceFields.length === 0 && !state._ffDrawing) return;
    ctx.save();
    ctx.font = "bold 10px monospace";

    for (const ff of state.forceFields) {
      if (ff.visible === false) continue;
      const { cx, cy } = _ffScreenCenter(ff);
      const r   = ff.radius * state.zoom;
      const rgb = ff.type === "attract" ? "91,224,188" : "255,107,107";
      const isSel = ff.id === state._ffSelected;

      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${rgb},${isSel ? 0.12 : 0.06})`; ctx.fill();
      ctx.strokeStyle = `rgba(${rgb},${isSel ? 0.9 : 0.45})`;
      ctx.lineWidth = isSel ? 2 : 1.5;
      ctx.setLineDash(isSel ? [] : [5, 3]);
      ctx.stroke(); ctx.setLineDash([]);

      // Center dot
      ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${rgb},0.9)`; ctx.fill();

      // Label
      ctx.fillStyle = `rgba(${rgb},0.85)`;
      const label = (ff.name || (ff.type === "attract" ? "Attract" : "Repel")) + `  ×${ff.strength}`;
      ctx.fillText(label, cx + 6, cy - 6);

      // Resize handle at rightmost point of circle
      if (isSel) {
        ctx.beginPath(); ctx.arc(cx + r, cy, 5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb},1)`; ctx.fill();
      }
    }

    // Draw ghost while drag-drawing a new field
    if (state._ffDrawing) {
      const d = state._ffDrawing;
      const rgb = state.forcePaintType === "attract" ? "91,224,188" : "255,107,107";
      ctx.beginPath(); ctx.arc(d.cx, d.cy, Math.max(2, d.r), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${rgb},0.1)`; ctx.fill();
      ctx.strokeStyle = `rgba(${rgb},0.75)`; ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]); ctx.stroke(); ctx.setLineDash([]);
    }

    ctx.restore();
  }

  function drawSelection() {
    const sel = state.selection;
    if (!sel || sel.w <= 0 || sel.h <= 0) return;
    const z = state.zoom;
    const ccx = canvas.width / 2;
    const ccy = canvas.height / 2;
    const { dx, dy } = state._selMoveDelta;
    const ox = sel.x + dx, oy = sel.y + dy;

    ctx.save();

    if (state._selMoving && state._selCells) {
      // Ghost cells at move-offset position
      ctx.fillStyle = "rgba(242,184,75,0.45)";
      for (const [cx, cy] of state._selCells) {
        const px = (ox + cx - state.cameraX) * z + ccx;
        const py = (oy + cy - state.cameraY) * z + ccy;
        ctx.fillRect(px + 1, py + 1, z - 2, z - 2);
      }
    }

    // Selection rectangle (amber when moving, teal when idle)
    const sx = (ox - state.cameraX) * z + ccx;
    const sy = (oy - state.cameraY) * z + ccy;
    const sw = sel.w * z;
    const sh = sel.h * z;
    ctx.fillStyle = state._selMoving ? "rgba(242,184,75,0.06)" : "rgba(91,224,188,0.07)";
    ctx.fillRect(sx, sy, sw, sh);
    ctx.strokeStyle = state._selMoving ? "#f2b84b" : "#5be0bc";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    ctx.strokeRect(sx + 0.75, sy + 0.75, sw - 1.5, sh - 1.5);
    ctx.setLineDash([]);

    ctx.restore();
  }

  function drawLenses() {
    const visible = state.lenses.filter(l => l.visible !== false);
    if (!visible.length) return;
    const dpr = window.devicePixelRatio || 1;

    // Snapshot current canvas pixels before we overdraw
    if (!_lensOffscreen || _lensOffscreen.width !== canvas.width || _lensOffscreen.height !== canvas.height) {
      _lensOffscreen = document.createElement('canvas');
      _lensOffscreen.width = canvas.width;
      _lensOffscreen.height = canvas.height;
    }
    _lensOffscreen.getContext('2d').drawImage(canvas, 0, 0);

    for (const lens of visible) {
      const { cx, cy, radius, zoom } = lens;
      const isSel = lens.id === state._lensSelected;

      ctx.save();
      // Dark fill so magnified area reads clearly
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = '#06090f';
      ctx.fill();
      // Clip to circle
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.clip();

      // Source in physical pixels: region of (2r/zoom) centered on lens
      const srcW = (radius * 2 / zoom) * dpr;
      const srcH = (radius * 2 / zoom) * dpr;
      const rawSX = cx * dpr - srcW / 2;
      const rawSY = cy * dpr - srcH / 2;
      const srcX = Math.max(0, rawSX);
      const srcY = Math.max(0, rawSY);
      const clampW = Math.min(srcW, _lensOffscreen.width - srcX);
      const clampH = Math.min(srcH, _lensOffscreen.height - srcY);
      // Dest: map clamped src to full 2r × 2r dest rect
      const destX = cx - radius + (rawSX < 0 ? (-rawSX / dpr) * zoom : 0);
      const destY = cy - radius + (rawSY < 0 ? (-rawSY / dpr) * zoom : 0);
      ctx.drawImage(_lensOffscreen, srcX, srcY, clampW, clampH,
        destX, destY, (clampW / dpr) * zoom, (clampH / dpr) * zoom);

      ctx.restore();

      // Decorations (outside clip)
      ctx.save();

      // Vignette ring
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      const vg = ctx.createRadialGradient(cx, cy, radius * 0.6, cx, cy, radius);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(0,0,0,0.35)');
      ctx.fillStyle = vg;
      ctx.fill();

      // Border
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = isSel ? 'rgba(100,220,255,1)' : 'rgba(100,220,255,0.5)';
      ctx.lineWidth = isSel ? 2.5 : 1.5;
      ctx.stroke();

      // Crosshair
      ctx.strokeStyle = 'rgba(100,220,255,0.28)';
      ctx.lineWidth = 0.75;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(cx - radius * 0.18, cy); ctx.lineTo(cx + radius * 0.18, cy);
      ctx.moveTo(cx, cy - radius * 0.18); ctx.lineTo(cx, cy + radius * 0.18);
      ctx.stroke();
      ctx.setLineDash([]);

      // Zoom label top-left
      const labelSize = Math.max(9, Math.min(12, radius * 0.18));
      ctx.fillStyle = 'rgba(100,220,255,0.9)';
      ctx.font = `bold ${labelSize}px monospace`;
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText(`${zoom}×`, cx - radius + 6, cy - radius + 5);

      // Name bottom-center
      if (lens.name) {
        ctx.fillStyle = 'rgba(100,220,255,0.65)';
        ctx.font = `${Math.max(8, labelSize - 1)}px monospace`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.fillText(lens.name, cx, cy + radius - 5);
      }

      // Resize handle (bottom-right quadrant)
      const hx = cx + radius * 0.707, hy = cy + radius * 0.707;
      ctx.beginPath();
      ctx.arc(hx, hy, isSel ? 6 : 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(100,220,255,0.9)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.restore();
    }

    // Draw lens ghost while drawing
    if (_lensDragOp?.type === 'draw' && _lensDragOp.curX !== undefined) {
      const { startX, startY, curX, curY } = _lensDragOp;
      const r = Math.sqrt((curX - startX) ** 2 + (curY - startY) ** 2);
      if (r > 5) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(startX, startY, r, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(100,220,255,0.7)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  function drawDemoCircuitOverlay() {
    if (!state.demoCircuit) return;
    const g = state.generation || 0;
    const pulse = (Math.sin(g * 0.28) + 1) / 2;
    const beat = (g % 30) / 30;

    const W = (x, y) => worldToScreen(x, y);
    const route = (pts, color, label, phase = 0) => {
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.setLineDash([10, 9]);
      ctx.lineDashOffset = -((g * 0.9 + phase) % 19);
      ctx.strokeStyle = color.replace("ALPHA", (0.34 + pulse * 0.28).toFixed(2));
      ctx.lineWidth = 2.5;
      ctx.shadowBlur = 14;
      ctx.shadowColor = color.replace("ALPHA", "0.75");
      ctx.beginPath();
      pts.forEach(([x, y], i) => {
        const p = W(x, y);
        i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
      });
      ctx.stroke();

      // arrow head on the last segment
      const [ax, ay] = pts[pts.length - 2];
      const [bx, by] = pts[pts.length - 1];
      const a = W(ax, ay), b = W(bx, by);
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      ctx.setLineDash([]);
      ctx.fillStyle = color.replace("ALPHA", "0.88");
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x - Math.cos(ang - 0.55) * 13, b.y - Math.sin(ang - 0.55) * 13);
      ctx.lineTo(b.x - Math.cos(ang + 0.55) * 13, b.y - Math.sin(ang + 0.55) * 13);
      ctx.closePath();
      ctx.fill();

      if (label) {
        const m = W((pts[0][0] + pts[pts.length - 1][0]) / 2, (pts[0][1] + pts[pts.length - 1][1]) / 2 - 4);
        ctx.shadowBlur = 10;
        ctx.font = "bold 11px monospace";
        ctx.fillStyle = color.replace("ALPHA", "0.95");
        ctx.fillText(label, m.x, m.y);
      }
      ctx.restore();
    };

    const ping = (x, y, color, label, phase = 0) => {
      const local = ((g + phase) % 30) / 30;
      const p = W(x, y);
      const r = 12 + local * 46;
      ctx.save();
      ctx.strokeStyle = color.replace("ALPHA", (0.9 * (1 - local)).toFixed(2));
      ctx.fillStyle = color.replace("ALPHA", (0.09 * (1 - local)).toFixed(2));
      ctx.shadowBlur = 22;
      ctx.shadowColor = color.replace("ALPHA", "0.95");
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (label && local < 0.18) {
        ctx.font = "bold 11px monospace";
        ctx.fillStyle = color.replace("ALPHA", "0.95");
        ctx.fillText(label, p.x + 13, p.y - 13);
      }
      ctx.restore();
    };

    route([[78,62],[112,72],[134,74]], "rgba(91,224,188,ALPHA)", "CLOCK", 0);
    route([[134,74],[168,74],[200,72]], "rgba(242,184,75,ALPHA)", "ROUTE", 8);
    route([[128,108],[128,132],[156,146],[220,148]], "rgba(155,123,232,ALPHA)", "LATCH → OUTPUT", 15);
    route([[88,184],[126,184],[166,184],[210,184]], "rgba(107,255,169,ALPHA)", "SEARCH", 5);

    ping(132, 74, "rgba(224,91,122,ALPHA)", "NOT: annihilate", 0);
    ping(204, 72, "rgba(242,184,75,ALPHA)", "turn", 10);
    ping(96, 136, "rgba(155,123,232,ALPHA)", "memory", 18);
    ping(222, 146, "rgba(91,196,224,ALPHA)", "output", 24);

    // Pipeline status strip: makes cause/effect readable at a glance.
    ctx.save();
    const x0 = 18, y0 = 62, step = 76;
    const stages = [
      ["CLOCK", "#5be0bc", 0],
      ["GATE", "#e05b7a", 6],
      ["MEM", "#9b7be8", 13],
      ["ROUTE", "#f2b84b", 20],
      ["OUT", "#5bc4e0", 26],
    ];
    ctx.fillStyle = "rgba(5,14,22,0.58)";
    ctx.strokeStyle = "rgba(140,220,240,0.18)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x0 - 10, y0 - 22, 400, 45, 12);
    ctx.fill();
    ctx.stroke();
    ctx.font = "bold 10px monospace";
    stages.forEach(([name, color, ph], i) => {
      const lit = ((g + ph) % 30) < 12;
      const cx = x0 + i * step;
      ctx.beginPath();
      ctx.fillStyle = lit ? color : "rgba(70,90,105,0.55)";
      ctx.shadowBlur = lit ? 16 : 0;
      ctx.shadowColor = color;
      ctx.arc(cx, y0, lit ? 7 : 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = lit ? "#dffcff" : "#6f8592";
      ctx.fillText(name, cx + 11, y0 + 4);
      if (i < stages.length - 1) {
        ctx.strokeStyle = "rgba(130,210,230,0.28)";
        ctx.beginPath();
        ctx.moveTo(cx + 48, y0);
        ctx.lineTo(cx + step - 12, y0);
        ctx.stroke();
      }
    });
    ctx.restore();
  }

  function draw() {
    for (const fn of _kernel.hooks.beforeDraw) { ctx.save(); try { fn(); } catch (_) {} ctx.restore(); }
    drawBackground();
    drawGrid();
    drawCells();
    drawChristoffelHeatmap();
    drawZoneBoundary();
    drawForceFields();
    drawZones();
    drawDemoCircuitOverlay();
    drawManifoldBorder();
    drawSelection();
    drawNotebookPins();
    drawHover();
    drawChristoffelHover();
    drawLenses();
    drawStampHint();
    drawSelectionHint();
    for (const fn of _kernel.hooks.afterDraw) { ctx.save(); try { fn(); } catch (_) {} ctx.restore(); }
  }

  function updateHud() {
    if (state._ruleDirty) {
      ruleInputEl.value = ruleToString(state.ruleB, state.ruleS);
      if (_ruleInput2El) _ruleInput2El.value = ruleToString(state.ruleB2, state.ruleS2);
      _syncActivePreset();
      state._ruleDirty = false;
    }
    genOut.textContent = String(state.generation);
    popOut.textContent = String(activeAlive().size);
    scoreOut.textContent = String(state.score);
    comboOut.textContent = `x${state.combo}`;
    speedOut.textContent = String(state.stepsPerSecond);

    let newHintText;
    if (state.mode === "arcade" && state.levelState) {
      const level = LEVELS[state.levelIndex];
      newHintText = `${level.objective} ${level.progress(state.levelState)}`;
    } else if (is3DMode()) {
      const surface = SURFACES[state.mode];
      const surfName = surface ? surface.name : "Sphere";
      newHintText = `${surfName} — left-click to draw, right-drag to spin.`;
    } else {
      const surface = activeSurface();
      newHintText = `${surface.name}: ${surface.desc}`;
    }
    if (newHintText !== _lastHintText) {
      _lastHintText = newHintText;
      showHint(newHintText);
    } else {
      objectiveText.textContent = newHintText;
    }
  }

  // --- Time machine ---

  function snapshotNow() {
    if (state.histCursor < state.histFrames.length - 1) {
      state.histFrames.splice(state.histCursor + 1);
    }
    state.histFrames.push({ gen: state.generation, alive: new Set(activeAlive()) });
    if (state.histFrames.length > MAX_HIST) state.histFrames.shift();
    state.histCursor = state.histFrames.length - 1;
  }

  function restoreFrame(idx) {
    const frame = state.histFrames[idx];
    if (!frame) return;
    const copy = new Set(frame.alive);
    if (state.sharedState) state.alive = copy;
    else state.modeAlive[state.mode] = copy;
    state.generation = frame.gen;
    state.histCursor = idx;
    cellAgeMap.clear();
    trailMap.clear();
    _contigAccum.clear();
    valueMap.clear();
    typeMap.clear();
    heatMap.clear();
    entrenchMap.clear();
    _driftAccX = 0;
    _driftAccY = 0;
  }

  function tickForward() {
    if (state.leniaMode) stepLenia();
    else stepLife();
    snapshotNow();
    for (const fn of _kernel.hooks.afterStep) try { fn(); } catch (_) {}
    if (state.notebook.autoEnabled && state.generation % 30 === 0) nbCheckAuto();
  }

  function tickBackward() {
    if (state.histCursor <= 0) {
      syncPlayUI(false, false);
      return;
    }
    restoreFrame(state.histCursor - 1);
  }

  function syncPlayUI(running, reverse) {
    state.running = running;
    state.playReverse = reverse;
    document.getElementById("playBtn").textContent = running ? "Pause" : "Play";
    tlPlayPause.textContent = (running && !reverse) ? "⏸" : "▶";
    tlRevPlay.classList.toggle("tl-active", running && reverse);
  }

  function updateTimeline() {
    const n = state.histFrames.length;
    const cur = state.histCursor;
    tlGenCur.textContent = String(state.generation);
    if (n > 0) {
      tlGenMax.textContent = String(state.histFrames[n - 1].gen);
      const pct = n > 1 ? (Math.max(0, cur) / (n - 1)) * 100 : 100;
      tlProgress.style.width = pct + "%";
      tlThumb.style.left = pct + "%";
    } else {
      tlGenMax.textContent = "0";
      tlProgress.style.width = "0%";
      tlThumb.style.left = "0%";
    }
    nbUpdateMarkers();
  }

  // --- Main loop ---

  function runTick(now) {
    if (!runTick.last) runTick.last = now;
    const dt = (now - runTick.last) / 1000;
    runTick.last = now;

    if (state.running) {
      state.tickCarry += dt;
      const stepInterval = 1 / state.stepsPerSecond;
      while (state.tickCarry >= stepInterval) {
        if (state.playReverse) tickBackward();
        else tickForward();
        state.tickCarry -= stepInterval;
      }
    }

    if (state.mode === "sphere") {
      if (sphereThree) renderSphere();
    } else if (is3DMode()) {
      if (manifoldThree) renderManifold();
    } else {
      draw();
    }
    if (_manifoldViewports.size > 0) _renderAllViewports();
    updateTimeline();
    _updateFieldDensityBars();
    updateHud();
    requestAnimationFrame(runTick);
  }

  function seedFromPattern(id, x, y, opts) {
    placePrefab(id, x, y, opts);
  }

  function loadDemo() {
    const GLYPHS = {
      " ": ["00000","00000","00000","00000","00000","00000","00000"],
      "0": ["01110","10001","10011","10101","11001","10001","01110"],
      "1": ["00100","01100","00100","00100","00100","00100","01110"],
      "2": ["01110","10001","00001","00010","00100","01000","11111"],
      "3": ["11110","00001","00001","01110","00001","00001","11110"],
      "4": ["00010","00110","01010","10010","11111","00010","00010"],
      "5": ["11111","10000","10000","11110","00001","00001","11110"],
      "6": ["00110","01000","10000","11110","10001","10001","01110"],
      "7": ["11111","00001","00010","00100","01000","01000","01000"],
      "8": ["01110","10001","10001","01110","10001","10001","01110"],
      "9": ["01110","10001","10001","01111","00001","00010","01100"],
      "A": ["01110","10001","10001","11111","10001","10001","10001"],
      "B": ["11110","10001","10001","11110","10001","10001","11110"],
      "C": ["01111","10000","10000","10000","10000","10000","01111"],
      "D": ["11110","10001","10001","10001","10001","10001","11110"],
      "E": ["11111","10000","10000","11110","10000","10000","11111"],
      "F": ["11111","10000","10000","11110","10000","10000","10000"],
      "G": ["01111","10000","10000","10011","10001","10001","01111"],
      "H": ["10001","10001","10001","11111","10001","10001","10001"],
      "I": ["01110","00100","00100","00100","00100","00100","01110"],
      "J": ["00111","00010","00010","00010","00010","10010","01100"],
      "K": ["10001","10010","10100","11000","10100","10010","10001"],
      "L": ["10000","10000","10000","10000","10000","10000","11111"],
      "M": ["10001","11011","10101","10101","10001","10001","10001"],
      "N": ["10001","11001","10101","10011","10001","10001","10001"],
      "O": ["01110","10001","10001","10001","10001","10001","01110"],
      "P": ["11110","10001","10001","11110","10000","10000","10000"],
      "Q": ["01110","10001","10001","10001","10101","10010","01101"],
      "R": ["11110","10001","10001","11110","10100","10010","10001"],
      "S": ["01111","10000","10000","01110","00001","00001","11110"],
      "T": ["11111","00100","00100","00100","00100","00100","00100"],
      "U": ["10001","10001","10001","10001","10001","10001","01110"],
      "V": ["10001","10001","10001","10001","10001","01010","00100"],
      "W": ["10001","10001","10001","10101","10101","10101","01010"],
      "X": ["10001","10001","01010","00100","01010","10001","10001"],
      "Y": ["10001","10001","01010","00100","00100","00100","00100"],
      "Z": ["11111","00001","00010","00100","01000","10000","11111"],
      "-": ["00000","00000","00000","11111","00000","00000","00000"],
      ">": ["10000","01000","00100","00010","00100","01000","10000"],
    };

    const drawCellText = (text, x, y, scale = 1) => {
      let ox = x;
      for (const rawCh of text.toUpperCase()) {
        const glyph = GLYPHS[rawCh] || GLYPHS[" "];
        for (let gy = 0; gy < glyph.length; gy++) {
          for (let gx = 0; gx < glyph[gy].length; gx++) {
            if (glyph[gy][gx] === "1") {
              for (let sy = 0; sy < scale; sy++) for (let sx = 0; sx < scale; sx++) {
                setCell(ox + gx * scale + sx, y + gy * scale + sy, true);
              }
            }
          }
        }
        ox += 6 * scale;
      }
    };

    const addZone = (name, x, y, w, h, color, B = [3], S = [2, 3]) => {
      const id = ++state._zoneIdSeq;
      state.zones.push({ id, x, y, w, h, name, color, ruleB: new Set(B), ruleS: new Set(S), visible: true, combine: false });
      return id;
    };

    const addLens = (name, cx, cy, radius, zoom = 4) => {
      const id = ++_lensIdSeq;
      state.lenses.push({ id, name, cx, cy, radius, zoom, visible: true });
      return id;
    };

    state.mode = "sandbox";
    modeSelect.value = "sandbox";
    canvas.style.display = "block";
    sphereCanvas.style.display = "none";
    clearBoard();
    state.running = false;
    document.getElementById("playBtn").textContent = "Play";
    state.zoom = 3.4;
    state.cameraX = 260;
    state.cameraY = 230;
    state.zones = [];
    state.forceFields = [];
    state.lenses = [];
    state._zoneSelected = null;
    state._ffSelected = null;
    state._lensSelected = null;
    state.demoCircuit = true;
    state.ruleB = new Set([3]);
    state.ruleS = new Set([2, 3]);
    state._ruleDirty = true;

    // Title / legend as live matter. It will mutate if the user presses Play.
    drawCellText("TURING COMPLETE", 34, 6, 1);
    drawCellText("CLOCKS  GATES  MEMORY  ROUTING", 38, 18, 1);

    // Soft lab panels: normal Life, but labelled as conceptual circuit regions.
    addZone("CLOCK BUS — p30 glider guns", 8, 30, 86, 56, "#5be0bc");
    addZone("NOT — annihilation gate", 100, 48, 70, 52, "#e05b7a");
    addZone("ROUTER — collision turns", 176, 45, 70, 58, "#f2b84b");
    addZone("MEMORY — stable state bank", 58, 112, 78, 50, "#9b7be8");
    addZone("OUTPUT TAP — reusable signal", 150, 116, 98, 48, "#5bc4e0");
    addZone("SEARCH ECOLOGY", 30, 174, 194, 32, "#6bffa9");

    // Clock sources: period-30 glider guns aimed into the board from multiple phases.
    seedFromPattern("gosper", 18, 38);
    seedFromPattern("gosper", 18, 80);
    seedFromPattern("gosper", 216, 44, { rotate: 180 });
    seedFromPattern("gosper", 216, 86, { rotate: 180 });
    seedFromPattern("gosper", 112, 136, { rotate: 270 });

    // Signal packets / paths. These are deliberately visible as data flowing through a substrate.
    seedFromPattern("signal-train", 72, 52);
    seedFromPattern("signal-train", 74, 84);
    seedFromPattern("signal-train", 164, 54, { rotate: 180 });
    seedFromPattern("signal-train", 164, 92, { rotate: 180 });
    seedFromPattern("glider", 96, 44);
    seedFromPattern("glider", 104, 52);
    seedFromPattern("glider", 112, 60);
    seedFromPattern("glider", 150, 62, { rotate: 180 });
    seedFromPattern("glider", 142, 70, { rotate: 180 });
    seedFromPattern("glider", 134, 78, { rotate: 180 });

    // Gates and routing collisions.
    seedFromPattern("annihilator", 119, 65);
    seedFromPattern("annihilator", 131, 77, { rotate: 180 });
    seedFromPattern("turn-gate", 188, 64);
    seedFromPattern("turn-gate", 206, 76, { rotate: 90 });
    seedFromPattern("herschel", 178, 94);

    // Absorbers / terminators: demonstrate clean signal handling.
    seedFromPattern("eater1", 90, 38);
    seedFromPattern("eater1", 92, 99, { rotate: 90 });
    seedFromPattern("eater1", 246, 56, { rotate: 180 });
    seedFromPattern("eater1", 242, 106, { rotate: 270 });

    // Memory/state bank: stable still lifes plus oscillators as timing references.
    for (let i = 0; i < 6; i++) {
      seedFromPattern("block", 64 + i * 10, 121);
      seedFromPattern(i % 2 ? "beehive" : "loaf", 62 + i * 10, 134);
    }
    seedFromPattern("pulsar", 46, 134);
    seedFromPattern("pentadecathlon", 132, 118);
    seedFromPattern("beacon", 142, 144);

    // Output / display bus: spaceships, blocks, and glider packets arranged as a readable stream.
    seedFromPattern("lwss", 160, 126);
    seedFromPattern("lwss", 184, 126);
    seedFromPattern("lwss", 208, 126);
    seedFromPattern("signal-train", 158, 146);
    seedFromPattern("block", 238, 126);
    seedFromPattern("block", 238, 134);
    seedFromPattern("block", 238, 142);
    drawCellText("OUTPUT", 174, 156, 1);
    drawCellText("101101", 184, 168, 1);

    // A lower discovery ecology: methuselahs feed a chaotic lab without overwhelming the circuit.
    seedFromPattern("r-pentomino", 44, 184);
    seedFromPattern("acorn", 98, 188);
    seedFromPattern("die-hard", 158, 186);
    seedFromPattern("pinwheel-seed", 206, 184);

    // No altered physics here: the demo is pure B3/S23 Life, just arranged as circuitry.

    snapshotNow();
    zonesPanelSync();
    fieldsPanelSync();
    lensesPanelSync();
    setCanvasMode("object");
    draw();
    setOverlay("Press Play: glider clocks drive gates, memory, routing, and output.");
    setTimeout(() => setOverlay(""), 3600);
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (is3DMode()) {
      const w = sphereCanvas.offsetWidth;
      const h = sphereCanvas.offsetHeight;
      if (w > 0 && h > 0) {
        const renderer = getRenderer();
        renderer.setSize(w, h, false);
        if (state.mode === "sphere" && sphereThree) {
          sphereThree.camera.aspect = w / h;
          sphereThree.camera.updateProjectionMatrix();
        } else if (manifoldThree) {
          manifoldThree.camera.aspect = w / h;
          manifoldThree.camera.updateProjectionMatrix();
        }
      }
    }
  }

  // ─── Shape picker ─────────────────────────────────────────────────────────

  let _pendingManifoldRect = null;

  function showShapePicker(sx, sy, rect) {
    _pendingManifoldRect = rect;
    const picker = document.getElementById('shapePicker');
    if (!picker) return;
    // Position near the mouse, nudge to keep inside board-wrap
    const wrap = document.querySelector('.board-wrap');
    const wRect = wrap ? wrap.getBoundingClientRect() : { left: 0, top: 0, width: 800, height: 600 };
    const canvasRect = canvas.getBoundingClientRect();
    let px = (canvasRect.left - wRect.left) + sx + 12;
    let py = (canvasRect.top  - wRect.top)  + sy + 12;
    px = Math.min(px, wRect.width  - picker.offsetWidth  - 8);
    py = Math.min(py, wRect.height - picker.offsetHeight - 8);
    picker.style.left = px + 'px';
    picker.style.top  = py + 'px';
    picker.style.display = 'flex';
    picker.focus();
  }

  function hideShapePicker() {
    const picker = document.getElementById('shapePicker');
    if (picker) picker.style.display = 'none';
    _pendingManifoldRect = null;
  }

  function confirmShape(shape) {
    if (!_pendingManifoldRect) return;
    createManifoldRegion(_pendingManifoldRect, shape, 'A');
    hideShapePicker();
    manifoldInspectorSync();
    draw();
  }

  // ─── Manifold inspector sync ───────────────────────────────────────────────

  function manifoldInspectorSync() {
    const list = document.getElementById('manifoldRegionList');
    if (!list) return;
    const { SHAPE_META } = window.ManifoldEngine;
    list.innerHTML = '';
    for (const region of state.manifoldRegions) {
      const meta    = SHAPE_META[region.shape] || {};
      const isSel   = state._manifoldSelected === region.id;
      const isHidden = region.visible === false;
      const row = document.createElement('div');
      row.className = 'mr-row' + (isSel ? ' mr-row-sel' : '') + (isHidden ? ' mr-row-hidden' : '');
      const has3D = _manifoldViewports.has(region.id);
      row.innerHTML = `
        <span class="mr-icon">${meta.icon || '?'}</span>
        <span class="mr-name">${meta.label || region.shape} #${region.id}</span>
        <span class="mr-dim">${region.rect.w}×${region.rect.h}</span>
        <button class="mr-proto" title="Boundary: ${region.boundaryProtocol === 'A' ? 'Closed' : 'Membrane'}">${region.boundaryProtocol}</button>
        <button class="mr-3d" title="${has3D ? 'Focus 3D viewport' : 'Open 3D viewport'}">${has3D ? '⬡·' : '⬡'}</button>
        <button class="mr-eye" title="${isHidden ? 'Show' : 'Hide'} region">${isHidden ? '🙈' : '👁'}</button>
        <button class="mr-del" title="Delete region">×</button>
      `;
      row.querySelector('.mr-3d').addEventListener('click', (e) => {
        e.stopPropagation();
        openManifoldViewport(region);
      });
      row.addEventListener('click', (e) => {
        if (e.target.classList.contains('mr-del')) return;
        if (e.target.classList.contains('mr-proto')) return;
        if (e.target.classList.contains('mr-eye')) return;
        if (e.target.classList.contains('mr-3d')) return;
        state._manifoldSelected = region.id;
        manifoldInspectorSync();
        draw();
      });
      row.querySelector('.mr-proto').addEventListener('click', (e) => {
        e.stopPropagation();
        region.boundaryProtocol = region.boundaryProtocol === 'A' ? 'B' : 'A';
        region.build(_manifoldKernelWeights());
        manifoldInspectorSync();
      });
      row.querySelector('.mr-eye').addEventListener('click', (e) => {
        e.stopPropagation();
        region.visible = region.visible === false ? true : false;
        manifoldInspectorSync();
        draw();
      });
      row.querySelector('.mr-del').addEventListener('click', (e) => {
        e.stopPropagation();
        removeManifoldRegion(region.id);
        draw();
      });
      list.appendChild(row);
    }
    // Curvature stats for selected region
    const statsEl = document.getElementById('manifoldCurvStats');
    if (statsEl) {
      const sel = state.manifoldRegions.find(r => r.id === state._manifoldSelected);
      if (sel) {
        const { computeGaussianCurvature: gaussK } = window.ManifoldEngine;
        let minMag = Infinity, maxMag = -Infinity, sumMag = 0, n = 0;
        let minK = Infinity, maxK = -Infinity;
        const { x: rx, y: ry, w: W, h: H } = sel.rect;
        for (let ly = 0; ly < H; ly++) {
          for (let lx = 0; lx < W; lx++) {
            const mag = sel.christoffelMagnitudeAt(rx + lx, ry + ly);
            if (mag < minMag) minMag = mag;
            if (mag > maxMag) maxMag = mag;
            sumMag += mag; n++;
            const k = gaussK(lx, ly, W, H, sel.shape);
            if (k < minK) minK = k;
            if (k > maxK) maxK = k;
          }
        }
        const meanMag = n > 0 ? sumMag / n : 0;
        statsEl.innerHTML = `<span class="mr-stat-label">|Γ|</span> min <b>${minMag.toFixed(3)}</b> max <b>${maxMag.toFixed(3)}</b> mean <b>${meanMag.toFixed(3)}</b>` +
          `<br><span class="mr-stat-label">K</span> min <b>${minK.toFixed(3)}</b> max <b>${maxK.toFixed(3)}</b>`;
        statsEl.style.display = '';
      } else {
        statsEl.style.display = 'none';
      }
    }

    // Per-region physics panel for selected region
    const physEl = document.getElementById('manifoldRegionPhysics');
    if (physEl) {
      const sel = state.manifoldRegions.find(r => r.id === state._manifoldSelected);
      if (sel) {
        physEl.style.display = '';
        physEl.innerHTML = '';

        // Rule Override
        const ruleRow = document.createElement('div');
        ruleRow.className = 'mr-phys-row';
        const ruleCheck = document.createElement('input');
        ruleCheck.type = 'checkbox'; ruleCheck.id = 'mr-rule-check';
        ruleCheck.checked = !!sel.ruleOverride;
        const ruleLabel = document.createElement('label');
        ruleLabel.htmlFor = 'mr-rule-check'; ruleLabel.textContent = 'Rule override';
        ruleLabel.className = 'mr-phys-label';
        const ruleInput = document.createElement('input');
        ruleInput.type = 'text'; ruleInput.className = 'mr-phys-input';
        ruleInput.placeholder = 'B3/S23';
        ruleInput.title = 'B/S notation, e.g. B36/S23';
        ruleInput.style.width = '80px';
        ruleInput.value = sel.ruleOverride
          ? 'B' + [...sel.ruleOverride.B].sort((a,b)=>a-b).join('') + '/S' + [...sel.ruleOverride.S].sort((a,b)=>a-b).join('')
          : (ruleToString ? ruleToString(state.ruleB, state.ruleS) : 'B3/S23');
        ruleInput.disabled = !sel.ruleOverride;
        const applyRuleBtn = document.createElement('button');
        applyRuleBtn.textContent = 'Set'; applyRuleBtn.className = 'mr-phys-btn';
        applyRuleBtn.disabled = !sel.ruleOverride;
        applyRuleBtn.title = 'Apply rule to this region';
        ruleCheck.addEventListener('change', () => {
          ruleInput.disabled = !ruleCheck.checked;
          applyRuleBtn.disabled = !ruleCheck.checked;
          if (!ruleCheck.checked) { sel.ruleOverride = null; }
        });
        applyRuleBtn.addEventListener('click', () => {
          const parsed = parseRule(ruleInput.value);
          if (parsed) {
            sel.ruleOverride = { B: parsed.B, S: parsed.S };
            ruleInput.style.outline = '';
          } else {
            ruleInput.style.outline = '1.5px solid #f55';
          }
        });
        ruleRow.appendChild(ruleCheck); ruleRow.appendChild(ruleLabel);
        ruleRow.appendChild(ruleInput); ruleRow.appendChild(applyRuleBtn);
        physEl.appendChild(ruleRow);

        // Curvature Modulation
        const curvRow = document.createElement('div');
        curvRow.className = 'mr-phys-row';
        const curvCheck = document.createElement('input');
        curvCheck.type = 'checkbox'; curvCheck.id = 'mr-curv-mod-check';
        curvCheck.checked = !!sel.curvatureModulate;
        const curvLabel = document.createElement('label');
        curvLabel.htmlFor = 'mr-curv-mod-check'; curvLabel.textContent = 'K modulation';
        curvLabel.className = 'mr-phys-label';
        curvLabel.title = 'Gaussian curvature shifts effective neighbor count: positive K → denser pressure';
        const strengthLabel = document.createElement('span');
        strengthLabel.className = 'mr-phys-label'; strengthLabel.style.marginLeft = '6px';
        strengthLabel.textContent = 'str';
        const strengthInput = document.createElement('input');
        strengthInput.type = 'number'; strengthInput.className = 'mr-phys-input';
        strengthInput.min = 0; strengthInput.max = 8; strengthInput.step = 0.5;
        strengthInput.value = state.christoffelModStrength;
        strengthInput.style.width = '46px';
        curvCheck.addEventListener('change', () => {
          sel.curvatureModulate = curvCheck.checked;
        });
        strengthInput.addEventListener('input', () => {
          state.christoffelModStrength = parseFloat(strengthInput.value) || 0;
        });
        curvRow.appendChild(curvCheck); curvRow.appendChild(curvLabel);
        curvRow.appendChild(strengthLabel); curvRow.appendChild(strengthInput);
        physEl.appendChild(curvRow);
      } else {
        physEl.style.display = 'none';
      }
    }

    // Show/hide the manifold section
    const section = document.getElementById('manifoldSection');
    if (section) section.style.display = state.manifoldRegions.length > 0 ? '' : 'none';
  }

  function toggleToolPalette() {
    const palette = document.getElementById("toolPalette");
    const reveal  = document.getElementById("tpReveal");
    if (!palette) return;
    const hidden = palette.classList.toggle("tp-hidden");
    if (reveal) reveal.classList.toggle("tp-show", hidden);
  }

  function toggleChristoffelVis() {
    state.christoffelVis = !state.christoffelVis;
    const bar = document.getElementById('christoffelBar');
    if (bar) bar.style.display = state.christoffelVis ? 'flex' : 'none';
    if (state.christoffelVis) _christoffelBarSync();
    draw();
  }

  function _christoffelBarSync() {
    document.querySelectorAll('.cv-btn').forEach(btn => {
      btn.classList.toggle('cv-active', btn.dataset.comp === state.christoffelComponent);
    });
  }

  function setupChristoffelBar() {
    const bar = document.getElementById('christoffelBar');
    if (!bar) return;
    bar.querySelectorAll('.cv-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.christoffelComponent = btn.dataset.comp;
        _christoffelBarSync();
        draw();
      });
    });
    const closeBtn = bar.querySelector('.cv-close');
    if (closeBtn) closeBtn.addEventListener('click', () => {
      state.christoffelVis = false;
      bar.style.display = 'none';
      draw();
    });
    const toggleBtn = document.getElementById('manifoldCurvToggle');
    if (toggleBtn) toggleBtn.addEventListener('click', toggleChristoffelVis);
  }

  // --- Hint / objective HUD auto-dismiss ---
  let _hintTimer = null;
  let _lastHintText = "";

  function showHint(text) {
    const hud   = document.getElementById("objectiveText");
    const tab   = document.getElementById("hintReveal");
    if (!hud) return;
    if (!state.showHints) {
      hud.classList.add("obj-hud-hidden");
      if (tab) tab.classList.remove("tp-show");
      return;
    }
    if (text !== undefined) hud.textContent = text;
    hud.classList.remove("obj-hud-hidden");
    if (tab) tab.classList.remove("tp-show");
    clearTimeout(_hintTimer);
    if (state.hintDuration > 0) {
      _hintTimer = setTimeout(() => {
        hud.classList.add("obj-hud-hidden");
        if (tab) tab.classList.add("tp-show");
      }, state.hintDuration * 1000);
    }
  }

  function toggleHint() {
    const hud = document.getElementById("objectiveText");
    const tab = document.getElementById("hintReveal");
    if (!hud) return;
    if (hud.classList.contains("obj-hud-hidden")) {
      showHint();
    } else {
      clearTimeout(_hintTimer);
      hud.classList.add("obj-hud-hidden");
      if (tab) tab.classList.add("tp-show");
    }
  }

  function setCanvasMode(mode) {
    // Restore lifted cells when leaving select mid-move
    if (state.canvasMode === "select" && state._selMoving && state._selCells) {
      const sel = state.selection;
      for (const [ox, oy] of state._selCells) setCell(sel.x + ox, sel.y + oy, true);
      state._selCells = null;
      state._selMoving = false;
      state._selMoveDelta = { dx: 0, dy: 0 };
    }

    if (mode !== "prefab") state._prefabStamp = null;

    state.canvasMode = mode;

    const cursors = { paint: "crosshair", move: "grab", select: "crosshair", force: "crosshair", zone: "crosshair", lens: "cell", object: "default", prefab: "crosshair", manifold: "crosshair" };
    canvas.style.cursor = cursors[mode] || "default";
    if (mode !== "zone")     { state._zoneDrawing = null; state._zoneDragMode = null; }
    if (mode !== "force")    { state._ffDrawing = null; state._ffDragMode = null; }
    if (mode !== "manifold") { state._manifoldDrag = null; state._manifoldDragMode = null; state._manifoldDragOrigin = null; }

    // Sync mode buttons
    document.querySelectorAll(".mode-btn").forEach((btn) => {
      btn.classList.toggle("mode-btn-active", btn.dataset.mode === mode);
    });

    // Sync selModeBtn in capture panel
    const selModeBtn = document.getElementById("selModeBtn");
    if (selModeBtn) selModeBtn.classList.toggle("rl-type-active", mode === "select");

    // Sync forcePaintToggle in field panel
    const fpt = document.getElementById("forcePaintToggle");
    if (fpt) fpt.classList.toggle("rl-type-active", mode === "force");

    // Sync lensDrawToggle
    const ldt = document.getElementById("lensDrawToggle");
    if (ldt) ldt.classList.toggle("rl-type-active", mode === "lens");

    // Update selInfo hint
    const selInfoEl = document.getElementById("selInfo");
    if (selInfoEl && mode === "select") selInfoEl.textContent = "Drag to select region";

    // Pointer mode reset when switching away from a drag
    if (!state.pointer.down) state.pointer.mode = null;
  }

  function handlePointerDown(ev) {
    canvas.setPointerCapture(ev.pointerId);
    state.pointer.down = true;
    state.pointer.lastX = ev.clientX;
    state.pointer.lastY = ev.clientY;

    // Manifold tool: move/resize selected, select existing, or draw new
    if (state.canvasMode === 'manifold' && ev.button === 0) {
      const rect = canvas.getBoundingClientRect();
      const sx = ev.clientX - rect.left, sy = ev.clientY - rect.top;
      const gxy = screenToGrid(sx, sy);
      const gx = Math.floor(gxy.x), gy = Math.floor(gxy.y);

      // Check handles of selected region first
      const selMR = state.manifoldRegions.find(r => r.id === state._manifoldSelected);
      if (selMR && selMR.visible !== false) {
        const handle = _manifoldHitHandle(sx, sy, selMR);
        if (handle) {
          state._manifoldDragMode   = handle;
          state._manifoldDragOrigin = { mx: gx, my: gy, rx: selMR.rect.x, ry: selMR.rect.y, rw: selMR.rect.w, rh: selMR.rect.h };
          ev.preventDefault(); return;
        }
        if (selMR.containsCell(gx, gy)) {
          state._manifoldDragMode   = 'move';
          state._manifoldDragOrigin = { mx: gx, my: gy, rx: selMR.rect.x, ry: selMR.rect.y, rw: selMR.rect.w, rh: selMR.rect.h };
          ev.preventDefault(); return;
        }
      }

      // Try selecting another region (topmost wins)
      let hit = null;
      for (let i = state.manifoldRegions.length - 1; i >= 0; i--) {
        const r = state.manifoldRegions[i];
        if (r.visible === false || r.id === state._manifoldSelected) continue;
        if (r.containsCell(gx, gy)) { hit = r; break; }
      }
      if (hit) {
        state._manifoldSelected = hit.id;
        state._manifoldDragMode   = 'move';
        state._manifoldDragOrigin = { mx: gx, my: gy, rx: hit.rect.x, ry: hit.rect.y, rw: hit.rect.w, rh: hit.rect.h };
        manifoldInspectorSync();
        draw(); ev.preventDefault(); return;
      }

      // Empty click: deselect and start drawing new region
      state._manifoldSelected = null;
      state._manifoldDragMode = null;
      state._manifoldDragOrigin = null;
      state._manifoldDrag = { x0: gx, y0: gy, x1: gx, y1: gy };
      manifoldInspectorSync();
      draw(); ev.preventDefault(); return;
    }

    // Object mode: interact with any object, or exit to previous mode on empty click
    if (state.canvasMode === "object" && ev.button === 0) {
      const rectO = canvas.getBoundingClientRect();
      const sxO = ev.clientX - rectO.left, syO = ev.clientY - rectO.top;
      const hitO = _anyObjectHitTest(sxO, syO);
      if (!hitO) {
        const prev = state._prevCanvasMode || "paint";
        state._prevCanvasMode = null;
        setCanvasMode(prev);
        ev.preventDefault(); return;
      }
      if (hitO.type === "field") {
        state._ffSelected = hitO.id; state._zoneSelected = null; state._lensSelected = null;
        const ff = state.forceFields.find(f => f.id === hitO.id);
        if (ff) {
          const { cx, cy } = _ffScreenCenter(ff);
          state._ffDragMode = hitO.mode;
          state._ffDragOrigin = { sx: sxO, sy: syO, fx: ff.x, fy: ff.y, fr: ff.radius, cx, cy };
        }
        fieldsPanelSync();
      } else if (hitO.type === "zone") {
        state._zoneSelected = hitO.id; state._ffSelected = null; state._lensSelected = null;
        const zz = state.zones.find(z => z.id === hitO.id);
        if (zz) {
          const gxyO = screenToGrid(sxO, syO);
          state._zoneDragMode = hitO.mode;
          state._zoneDragOrigin = { mx: Math.floor(gxyO.x), my: Math.floor(gxyO.y), zx: zz.x, zy: zz.y, zw: zz.w, zh: zz.h };
        }
        zonesPanelSync();
      } else if (hitO.type === "lens") {
        state._lensSelected = hitO.id; state._ffSelected = null; state._zoneSelected = null;
        state.pointer.mode = "lens";
        const ll = state.lenses.find(l => l.id === hitO.id);
        if (ll) {
          _lensDragOp = hitO.mode === "resize"
            ? { type: "resize", id: ll.id, startX: sxO, startY: syO, origR: ll.radius, origCx: ll.cx, origCy: ll.cy }
            : { type: "move", id: ll.id, startX: sxO, startY: syO, origCx: ll.cx, origCy: ll.cy };
        }
        lensesPanelSync();
      }
      ev.preventDefault(); return;
    }

    // Zone mode: draw / select / move / resize zones
    if (state.canvasMode === "zone" && ev.button === 0) {
      const rect = canvas.getBoundingClientRect();
      const gxy  = screenToGrid(ev.clientX - rect.left, ev.clientY - rect.top);
      const gx   = Math.floor(gxy.x), gy = Math.floor(gxy.y);

      // Check if clicking a handle or body of selected zone
      const selZ = state.zones.find(z => z.id === state._zoneSelected);
      if (selZ) {
        const handle = _zoneHitHandle(ev.clientX - rect.left, ev.clientY - rect.top, selZ);
        if (handle) {
          state._zoneDragMode   = handle;
          state._zoneDragOrigin = { mx: gx, my: gy, zx: selZ.x, zy: selZ.y, zw: selZ.w, zh: selZ.h };
          ev.preventDefault(); return;
        }
        if (gx >= selZ.x && gx < selZ.x + selZ.w && gy >= selZ.y && gy < selZ.y + selZ.h) {
          state._zoneDragMode   = "move";
          state._zoneDragOrigin = { mx: gx, my: gy, zx: selZ.x, zy: selZ.y, zw: selZ.w, zh: selZ.h };
          ev.preventDefault(); return;
        }
      }

      // Try selecting another zone (last drawn on top wins)
      let hit = null;
      for (let i = state.zones.length - 1; i >= 0; i--) {
        const z = state.zones[i];
        if (gx >= z.x && gx < z.x + z.w && gy >= z.y && gy < z.y + z.h) { hit = z; break; }
      }
      if (hit) {
        state._zoneSelected = hit.id;
        state._zoneDragMode   = "move";
        state._zoneDragOrigin = { mx: gx, my: gy, zx: hit.x, zy: hit.y, zw: hit.w, zh: hit.h };
        zonesPanelSync();
        ev.preventDefault(); return;
      }

      // No zone hit — check cross-type objects before drawing
      { const cH = _anyObjectHitTest(ev.clientX - rect.left, ev.clientY - rect.top);
        if (cH && cH.type !== "zone") { _applyCrossTypeHit(cH, ev.clientX - rect.left, ev.clientY - rect.top); ev.preventDefault(); return; } }

      // Otherwise start drawing a new zone
      state._zoneSelected = null;
      state._zoneDrawing  = { x0: gx, y0: gy, x1: gx, y1: gy };
      state._zoneDragMode = "draw";
      ev.preventDefault(); return;
    }

    // Notebook pin drop mode intercepts left-click
    if (state.notebook.pinMode && ev.button === 0) {
      const rect = canvas.getBoundingClientRect();
      const gxgy = screenToGrid(ev.clientX - rect.left, ev.clientY - rect.top);
      state.notebook._pendingPin = { x: Math.floor(gxgy.x), y: Math.floor(gxgy.y) };
      state.notebook.pinMode = false;
      canvas.style.cursor = "";
      document.getElementById("notebookBtn")?.classList.remove("nb-pin-active");
      const px = document.getElementById("nbPinCX");
      const py = document.getElementById("nbPinCY");
      if (px) px.textContent = state.notebook._pendingPin.x;
      if (py) py.textContent = state.notebook._pendingPin.y;
      const prev = document.getElementById("nbPinPreview");
      if (prev) prev.style.display = "";
      nbOpenPanel();
      nbShowForm();
      ev.preventDefault();
      return;
    }

    // Middle mouse always pans
    if (ev.button === 1) {
      state.pointer.mode = "pan";
      return;
    }

    if (ev.button !== 0 && ev.button !== 2) return;
    const rect = canvas.getBoundingClientRect();
    const gxgy = screenToGrid(ev.clientX - rect.left, ev.clientY - rect.top);

    // In paint or move mode, clicking an object enters unified object mode
    if ((state.canvasMode === "paint" || state.canvasMode === "move") && ev.button === 0) {
      const rectE = canvas.getBoundingClientRect();
      const sxE = ev.clientX - rectE.left, syE = ev.clientY - rectE.top;
      const hitE = _anyObjectHitTest(sxE, syE);
      if (hitE) {
        state._prevCanvasMode = state.canvasMode;
        setCanvasMode("object");
        if (hitE.type === "field") {
          state._ffSelected = hitE.id; state._zoneSelected = null; state._lensSelected = null;
          const ff = state.forceFields.find(f => f.id === hitE.id);
          if (ff) {
            const { cx, cy } = _ffScreenCenter(ff);
            state._ffDragMode = hitE.mode;
            state._ffDragOrigin = { sx: sxE, sy: syE, fx: ff.x, fy: ff.y, fr: ff.radius, cx, cy };
          }
          fieldsPanelSync();
        } else if (hitE.type === "zone") {
          state._zoneSelected = hitE.id; state._ffSelected = null; state._lensSelected = null;
          const zz = state.zones.find(z => z.id === hitE.id);
          if (zz) {
            const gxyE = screenToGrid(sxE, syE);
            state._zoneDragMode = hitE.mode;
            state._zoneDragOrigin = { mx: Math.floor(gxyE.x), my: Math.floor(gxyE.y), zx: zz.x, zy: zz.y, zw: zz.w, zh: zz.h };
          }
          zonesPanelSync();
        } else if (hitE.type === "lens") {
          state._lensSelected = hitE.id; state._ffSelected = null; state._zoneSelected = null;
          state.pointer.mode = "lens";
          const ll = state.lenses.find(l => l.id === hitE.id);
          if (ll) {
            _lensDragOp = hitE.mode === "resize"
              ? { type: "resize", id: ll.id, startX: sxE, startY: syE, origR: ll.radius, origCx: ll.cx, origCy: ll.cy }
              : { type: "move", id: ll.id, startX: sxE, startY: syE, origCx: ll.cx, origCy: ll.cy };
          }
          lensesPanelSync();
        }
        ev.preventDefault(); return;
      }
    }

    // Prefab stamp mode: click to place, stay in mode for multi-stamp
    if (state.canvasMode === "prefab" && ev.button === 0 && state._prefabStamp) {
      const { id, rotate, flipX } = state._prefabStamp;
      placePrefab(id, Math.floor(gxgy.x), Math.floor(gxgy.y), { rotate, flipX });
      if (state.mode === "arcade") state.score = Math.max(0, state.score - 8);
      snapshotNow(); draw();
      ev.preventDefault(); return;
    }

    if (state.canvasMode === "move") {
      state.pointer.mode = "pan";
      canvas.style.cursor = "grabbing";
      return;
    }

    if (state.canvasMode === "select") {
      const cx = Math.floor(gxgy.x), cy = Math.floor(gxgy.y);
      const sel = state.selection;
      const insideSel = sel && sel.w > 0 && sel.h > 0
        && cx >= sel.x && cx < sel.x + sel.w
        && cy >= sel.y && cy < sel.y + sel.h;

      if (insideSel) {
        state.pointer.mode = "move";
        state._selMoveOriginCell = { x: cx, y: cy };
        state._selMoveDelta = { dx: 0, dy: 0 };
        if (!state._selMoving) {
          // Lift cells from the board (only if not already lifted, e.g. after R/F)
          const cells = [];
          const alive = activeAlive();
          for (const k of alive) {
            const [col, row] = parseKey(k);
            if (col >= sel.x && col < sel.x + sel.w && row >= sel.y && row < sel.y + sel.h)
              cells.push([col - sel.x, row - sel.y]);
          }
          for (const [ox, oy] of cells) alive.delete(key(sel.x + ox, sel.y + oy));
          state._selCells = cells;
          state._selMoving = true;
        }
      } else {
        // Not on the selection — commit any lifted cells before starting fresh
        if (state._selMoving && state._selCells) {
          for (const [ox, oy] of state._selCells)
            setCell(sel.x + ox, sel.y + oy, true);
        }
        const sxS = ev.clientX - rect.left, syS = ev.clientY - rect.top;
        const cHS = _anyObjectHitTest(sxS, syS);
        if (cHS) { _applyCrossTypeHit(cHS, sxS, syS); ev.preventDefault(); return; }
        state.pointer.mode = "select";
        state._selCells = null;
        state._selMoving = false;
        state._selMoveDelta = { dx: 0, dy: 0 };
        state._selStartCell = { x: cx, y: cy };
        state.selection = { x: cx, y: cy, w: 0, h: 0 };
      }
      return;
    }

    if (state.canvasMode === "force" && ev.button === 0) {
      ev.preventDefault();
      const rect4 = canvas.getBoundingClientRect();
      const sx4 = ev.clientX - rect4.left, sy4 = ev.clientY - rect4.top;
      const hit = _ffHitTest(sx4, sy4);
      if (hit) {
        state._ffSelected = hit.field.id;
        state._ffDragMode = hit.mode;
        const { cx, cy } = _ffScreenCenter(hit.field);
        state._ffDragOrigin = { sx: sx4, sy: sy4, fx: hit.field.x, fy: hit.field.y, fr: hit.field.radius, cx, cy };
        fieldsPanelSync();
      } else {
        // No field hit — check cross-type objects before drawing
        const cH4 = _anyObjectHitTest(sx4, sy4);
        if (cH4 && cH4.type !== "field") { _applyCrossTypeHit(cH4, sx4, sy4); ev.preventDefault(); return; }
        state._ffSelected = null;
        state._ffDragMode = "draw";
        state._ffDrawing  = { cx: sx4, cy: sy4, r: 0 };
      }
      state.pointer.mode = null;
      return;
    }

    if (state.canvasMode === "lens") {
      state.pointer.mode = "lens";
      const rect2 = canvas.getBoundingClientRect();
      const px = ev.clientX - rect2.left;
      const py = ev.clientY - rect2.top;

      if (ev.button === 2) {
        // Right-click removes lens under cursor
        state.lenses = state.lenses.filter(l => {
          const dx = px - l.cx, dy = py - l.cy;
          return Math.sqrt(dx * dx + dy * dy) > l.radius;
        });
        state._lensSelected = null;
        _lensDragOp = null;
        lensesPanelSync();
        return;
      }

      // Check if clicking resize handle of a lens
      for (const l of [...state.lenses].reverse()) {
        if (l.visible === false) continue;
        const hx = l.cx + l.radius * 0.707, hy = l.cy + l.radius * 0.707;
        if (Math.sqrt((px - hx) ** 2 + (py - hy) ** 2) < 10) {
          state._lensSelected = l.id;
          _lensDragOp = { type: 'resize', id: l.id, startX: px, startY: py, origR: l.radius, origCx: l.cx, origCy: l.cy };
          lensesPanelSync();
          return;
        }
      }

      // Check if clicking inside a lens (move)
      for (const l of [...state.lenses].reverse()) {
        if (l.visible === false) continue;
        const dx = px - l.cx, dy = py - l.cy;
        if (Math.sqrt(dx * dx + dy * dy) <= l.radius) {
          state._lensSelected = l.id;
          _lensDragOp = { type: 'move', id: l.id, startX: px, startY: py, origCx: l.cx, origCy: l.cy };
          lensesPanelSync();
          return;
        }
      }

      // No lens hit — check cross-type objects before drawing
      const cHL = _anyObjectHitTest(px, py);
      if (cHL && cHL.type !== "lens") { _applyCrossTypeHit(cHL, px, py); ev.preventDefault(); return; }

      // Start drawing a new lens
      _lensDragOp = { type: 'draw', startX: px, startY: py, curX: px, curY: py };
      return;
    }

    // paint mode (default)
    state.pointer.mode = "paint";
    state.pointer.paintValue = ev.button === 2 ? 0 : (isAlive(gxgy.x, gxgy.y) ? 0 : 1);
    setCell(gxgy.x, gxgy.y, state.pointer.paintValue === 1);
  }

  function handlePointerMove(ev) {
    const rect = canvas.getBoundingClientRect();
    state.hoverCell = screenToGrid(ev.clientX - rect.left, ev.clientY - rect.top);

    // Manifold drag update — new region draw
    if (state.canvasMode === 'manifold' && state.pointer.down && state._manifoldDrag) {
      const gxy = screenToGrid(ev.clientX - rect.left, ev.clientY - rect.top);
      state._manifoldDrag.x1 = Math.floor(gxy.x);
      state._manifoldDrag.y1 = Math.floor(gxy.y);
      draw(); ev.preventDefault(); return;
    }

    // Manifold drag update — move/resize existing region
    if (state.canvasMode === 'manifold' && state.pointer.down && state._manifoldDragMode) {
      const gxy = screenToGrid(ev.clientX - rect.left, ev.clientY - rect.top);
      _manifoldApplyDrag(Math.floor(gxy.x), Math.floor(gxy.y));
      draw(); ev.preventDefault(); return;
    }

    // Update cursor when hovering (not dragging)
    if (!state.pointer.down) {
      if (state.canvasMode === 'manifold') {
        // Show directional resize cursor over handles of selected region
        const selMR = state.manifoldRegions.find(r => r.id === state._manifoldSelected);
        if (selMR && selMR.visible !== false) {
          const hx = ev.clientX - rect.left, hy = ev.clientY - rect.top;
          const handle = _manifoldHitHandle(hx, hy, selMR);
          if (handle) {
            const RMAP = { 'resize-nw':'nw-resize','resize-n':'n-resize','resize-ne':'ne-resize',
              'resize-w':'w-resize','resize-e':'e-resize',
              'resize-sw':'sw-resize','resize-s':'s-resize','resize-se':'se-resize' };
            canvas.style.cursor = RMAP[handle] || 'crosshair';
          } else if (selMR.containsCell(Math.floor(state.hoverCell?.x ?? 0), Math.floor(state.hoverCell?.y ?? 0))) {
            canvas.style.cursor = 'move';
          } else {
            canvas.style.cursor = 'crosshair';
          }
        } else {
          canvas.style.cursor = 'crosshair';
        }
      } else if (state.canvasMode === "move") {
        canvas.style.cursor = "grab";
      } else if (state.canvasMode === "paint") {
        const rectP = canvas.getBoundingClientRect();
        const sxP = ev.clientX - rectP.left, syP = ev.clientY - rectP.top;
        canvas.style.cursor = _anyObjectHitTest(sxP, syP) ? "pointer" : "crosshair";
      } else if (state.canvasMode === "object" || state.canvasMode === "select" || state.canvasMode === "force" || state.canvasMode === "zone" || state.canvasMode === "lens") {
        const rectH = canvas.getBoundingClientRect();
        const sxH = ev.clientX - rectH.left, syH = ev.clientY - rectH.top;
        // In select mode, hovering over the active selection box takes priority
        if (state.canvasMode === "select") {
          const sel = state.selection;
          const hc  = state.hoverCell;
          const overSel = sel && sel.w > 0 && hc
            && hc.x >= sel.x && hc.x < sel.x + sel.w
            && hc.y >= sel.y && hc.y < sel.y + sel.h;
          if (overSel) { canvas.style.cursor = "move"; return; }
        }
        const hitH = _anyObjectHitTest(sxH, syH);
        if (!hitH) {
          canvas.style.cursor = state.canvasMode === "object" ? "default" : "crosshair";
        } else if (hitH.mode === "move") {
          canvas.style.cursor = "move";
        } else if (hitH.mode === "resize") {
          canvas.style.cursor = "ew-resize";
        } else {
          const RMAP = { 'resize-nw':'nw-resize','resize-n':'n-resize','resize-ne':'ne-resize',
            'resize-w':'w-resize','resize-e':'e-resize',
            'resize-sw':'sw-resize','resize-s':'s-resize','resize-se':'se-resize' };
          canvas.style.cursor = RMAP[hitH.mode] || "crosshair";
        }
      }
    }

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

    if (state.pointer.mode === "move" && state._selMoveOriginCell) {
      const gxgy = screenToGrid(ev.clientX - rect.left, ev.clientY - rect.top);
      state._selMoveDelta = {
        dx: Math.floor(gxgy.x) - state._selMoveOriginCell.x,
        dy: Math.floor(gxgy.y) - state._selMoveOriginCell.y,
      };
      const selInfoEl = document.getElementById("selInfo");
      if (selInfoEl) {
        const { dx: ddx, dy: ddy } = state._selMoveDelta;
        selInfoEl.textContent = `Move (${ddx > 0 ? "+" : ""}${ddx}, ${ddy > 0 ? "+" : ""}${ddy})`;
      }
      return;
    }

    if ((state.canvasMode === "force" || state.canvasMode === "object") && state._ffDragMode) {
      const rect5 = canvas.getBoundingClientRect();
      const sx5 = ev.clientX - rect5.left, sy5 = ev.clientY - rect5.top;
      if (state._ffDragMode === "draw" && state._ffDrawing) {
        state._ffDrawing.r = Math.hypot(sx5 - state._ffDrawing.cx, sy5 - state._ffDrawing.cy);
      } else {
        _ffApplyDrag(sx5, sy5);
      }
      return;
    }

    if ((state.canvasMode === "zone" || state.canvasMode === "object") && state._zoneDragMode) {
      const rect2 = canvas.getBoundingClientRect();
      const gxy2  = screenToGrid(ev.clientX - rect2.left, ev.clientY - rect2.top);
      const gx2   = Math.floor(gxy2.x), gy2 = Math.floor(gxy2.y);
      if (state._zoneDragMode === "draw" && state._zoneDrawing) {
        state._zoneDrawing.x1 = gx2; state._zoneDrawing.y1 = gy2;
      } else {
        _zoneApplyDrag(gx2, gy2);
      }
      return;
    }

    // Object-mode manifold drag
    if (state.canvasMode === "object" && state._manifoldDragMode) {
      const gxy3 = screenToGrid(ev.clientX - rect.left, ev.clientY - rect.top);
      _manifoldApplyDrag(Math.floor(gxy3.x), Math.floor(gxy3.y));
      draw(); return;
    }

    if (state.pointer.mode === "select" && state._selStartCell) {
      const gxgy = screenToGrid(ev.clientX - rect.left, ev.clientY - rect.top);
      const cx = Math.floor(gxgy.x);
      const cy = Math.floor(gxgy.y);
      const x1 = Math.min(state._selStartCell.x, cx);
      const y1 = Math.min(state._selStartCell.y, cy);
      const x2 = Math.max(state._selStartCell.x, cx) + 1;
      const y2 = Math.max(state._selStartCell.y, cy) + 1;
      state.selection = { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
      const selInfoEl = document.getElementById("selInfo");
      if (selInfoEl) selInfoEl.textContent = `${state.selection.w} × ${state.selection.h}`;
    }

    if (state.pointer.mode === "lens" && _lensDragOp) {
      const rect2 = canvas.getBoundingClientRect();
      const px = ev.clientX - rect2.left;
      const py = ev.clientY - rect2.top;
      if (_lensDragOp.type === 'draw') {
        _lensDragOp.curX = px;
        _lensDragOp.curY = py;
      } else if (_lensDragOp.type === 'move') {
        const l = state.lenses.find(x => x.id === _lensDragOp.id);
        if (l) { l.cx = _lensDragOp.origCx + (px - _lensDragOp.startX); l.cy = _lensDragOp.origCy + (py - _lensDragOp.startY); }
      } else if (_lensDragOp.type === 'resize') {
        const l = state.lenses.find(x => x.id === _lensDragOp.id);
        if (l) {
          const dr = Math.sqrt((px - _lensDragOp.origCx) ** 2 + (py - _lensDragOp.origCy) ** 2);
          l.radius = Math.max(20, dr);
        }
      }
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

    // Manifold: commit move/resize (rebuild neighbor map)
    if (state.canvasMode === 'manifold' && state._manifoldDragMode) {
      const mr = state.manifoldRegions.find(r => r.id === state._manifoldSelected);
      if (mr) mr.build(_manifoldKernelWeights());
      state._manifoldDragMode   = null;
      state._manifoldDragOrigin = null;
      state.pointer.down = false;
      state.pointer.mode = null;
      manifoldInspectorSync();
      draw(); ev.preventDefault(); return;
    }

    // Manifold tool: finish drawing new region → show shape picker if big enough
    if (state.canvasMode === 'manifold' && state._manifoldDrag) {
      const d = state._manifoldDrag;
      state._manifoldDrag = null;
      const x = Math.min(d.x0, d.x1), y = Math.min(d.y0, d.y1);
      const w = Math.abs(d.x1 - d.x0) + 1, h = Math.abs(d.y1 - d.y0) + 1;
      if (w >= 3 && h >= 3) {
        const rect2 = canvas.getBoundingClientRect();
        showShapePicker(ev.clientX - rect2.left, ev.clientY - rect2.top, { x, y, w, h });
      }
      draw(); ev.preventDefault(); return;
    }

    if (state.pointer.mode === "lens" && _lensDragOp) {
      if (_lensDragOp.type === 'draw') {
        const rect2 = canvas.getBoundingClientRect();
        // (curX/curY already updated in move)
        const r = Math.sqrt((_lensDragOp.curX - _lensDragOp.startX) ** 2 + (_lensDragOp.curY - _lensDragOp.startY) ** 2);
        if (r >= 15) {
          const newLens = {
            id: ++_lensIdSeq,
            name: `Lens ${_lensIdSeq}`,
            cx: _lensDragOp.startX,
            cy: _lensDragOp.startY,
            radius: r,
            zoom: _lensZoomDefault,
            visible: true,
          };
          state.lenses.push(newLens);
          state._lensSelected = newLens.id;
          lensesPanelSync();
        }
      } else if (_lensDragOp.type === 'move' || _lensDragOp.type === 'resize') {
        lensesPanelSync();
      }
      _lensDragOp = null;
      state.pointer.mode = null;
      state.pointer.down = false;
      return;
    }

    if (state.pointer.mode === "move" && state._selMoving && state._selCells) {
      // Commit: place lifted cells at new position
      const sel = state.selection;
      const { dx, dy } = state._selMoveDelta;
      const newX = sel.x + dx, newY = sel.y + dy;
      for (const [ox, oy] of state._selCells) {
        setCell(newX + ox, newY + oy, true);
      }
      state.selection = { x: newX, y: newY, w: sel.w, h: sel.h };
      state._selCells = null;
      state._selMoving = false;
      state._selMoveDelta = { dx: 0, dy: 0 };
      const selInfoEl = document.getElementById("selInfo");
      if (selInfoEl) selInfoEl.textContent = `${sel.w} × ${sel.h}`;
    }

    if ((state.canvasMode === "force" || state.canvasMode === "object") && state._ffDragMode) {
      if (state._ffDragMode === "draw" && state._ffDrawing) {
        const d = state._ffDrawing;
        const worldR = d.r / state.zoom;
        if (worldR >= 2) {
          const wc = screenToWorld(d.cx, d.cy);
          const id = ++state._ffIdSeq;
          state.forceFields.push({
            id, x: wc.x, y: wc.y,
            radius: Math.round(worldR),
            type: state.forcePaintType,
            strength: state.forcePaintStrength,
            falloff: state.forcePaintFalloff || "linear",
            combine: true,
            visible: true,
            name: `Field ${id}`,
          });
          state._ffSelected = id;
          fieldsPanelSync();
        }
        state._ffDrawing = null;
      }
      state._ffDragMode = null;
      state._ffDragOrigin = null;
      state.pointer.down = false;
      state.pointer.mode = null;
      return;
    }

    if ((state.canvasMode === "zone" || state.canvasMode === "object") && state._zoneDragMode) {
      if (state._zoneDragMode === "draw" && state._zoneDrawing) {
        const d = state._zoneDrawing;
        const x = Math.min(d.x0, d.x1);
        const y = Math.min(d.y0, d.y1);
        const w = Math.abs(d.x1 - d.x0) + 1;
        const h = Math.abs(d.y1 - d.y0) + 1;
        if (w >= 2 && h >= 2) {
          const id = ++state._zoneIdSeq;
          state.zones.push({
            id, x, y, w, h,
            ruleB: new Set([...state.ruleB]),
            ruleS: new Set([...state.ruleS]),
            name: `Zone ${id}`,
            color: ZONE_COLORS[(id - 1) % ZONE_COLORS.length],
            combine: true,
            visible: true,
          });
          state._zoneSelected = id;
          zonesPanelSync();
        }
        state._zoneDrawing = null;
      }
      state._zoneDragMode = null;
      state._zoneDragOrigin = null;
      state.pointer.down = false;
      state.pointer.mode = null;
      return;
    }

    // Manifold object-mode drag commit
    if (state.canvasMode === "object" && state._manifoldDragMode) {
      const mr = state.manifoldRegions.find(r => r.id === state._manifoldSelected);
      if (mr) mr.build(_manifoldKernelWeights());
      state._manifoldDragMode   = null;
      state._manifoldDragOrigin = null;
      state.pointer.down = false;
      state.pointer.mode = null;
      manifoldInspectorSync();
      return;
    }

    state.pointer.down = false;
    state.pointer.mode = null;
    // Restore mode cursor after drag
    if (state.canvasMode === "move") canvas.style.cursor = "grab";

  }

  function handleWheel(ev) {
    ev.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mx = ev.clientX - rect.left;
    const my = ev.clientY - rect.top;

    // If hovering over a lens, adjust lens zoom instead of camera zoom
    for (const l of [...state.lenses].reverse()) {
      if (l.visible === false) continue;
      const dx = mx - l.cx, dy = my - l.cy;
      if (Math.sqrt(dx * dx + dy * dy) <= l.radius) {
        l.zoom = Math.max(1, Math.min(16, l.zoom + (ev.deltaY < 0 ? 1 : -1)));
        lensesPanelSync();
        return;
      }
    }

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

  function showGuide(guideData) {
    state.guide.hintsRevealed = 0;
    state.guide.hints = guideData.hints || [];
    guideConcept.textContent = guideData.concept;
    guideBody.textContent = guideData.body;
    guideHints.innerHTML = "";
    guideHintBtn.disabled = state.guide.hints.length === 0;
    guideHintBtn.textContent = "Hint";
    guideCard.classList.remove("hidden");
  }

  function hideGuide() {
    guideCard.classList.add("hidden");
  }

  function revealHint() {
    const { hints, hintsRevealed } = state.guide;
    if (hintsRevealed >= hints.length) return;
    const item = document.createElement("div");
    item.className = "hint-item";
    item.textContent = `${hintsRevealed + 1}. ${hints[hintsRevealed]}`;
    guideHints.appendChild(item);
    state.guide.hintsRevealed += 1;
    if (state.guide.hintsRevealed >= hints.length) {
      guideHintBtn.textContent = "No more hints";
      guideHintBtn.disabled = true;
    }
  }

  function startLevel(index) {
    clearBoard();
    syncPlayUI(false, false);
    state.mode = "arcade";
    modeSelect.value = "arcade";
    canvas.style.display = "block";
    sphereCanvas.style.display = "none";
    state.levelIndex = index;
    levelSelect.value = String(index);
    state.cameraX = 90;
    state.cameraY = 45;
    state.zoom = 16;
    const level = LEVELS[index];
    state.levelState = level.setup();
    state.score = 0;
    state.combo = 1;
    state.comboTimer = 0;
    if (level.guide) {
      showGuide(level.guide);
    } else {
      hideGuide();
    }
    snapshotNow();
    draw();
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

  function makePaletteCard(prefab, isCustom) {
    const card = document.createElement("article");
    card.className = "palette-card";
    card.dataset.prefabId = prefab.id;
    card.innerHTML = `
      <div class="palette-card-head">
        <strong>${prefab.name}</strong>
        ${isCustom ? `<button class="palette-del-btn" title="Delete prefab">×</button>` : ""}
      </div>
      <div class="meta"><span>${prefab.category}</span><span>${prefab.type}</span></div>
      <small>${prefab.desc}</small>
    `;
    if (isCustom) {
      card.querySelector(".palette-del-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        deleteCustomPrefab(prefab.id);
      });
    }

    card.addEventListener("pointerdown", (ev) => {
      if (ev.button !== 0) return;
      ev.preventDefault();
      card.setPointerCapture(ev.pointerId);

      // Select card and enter stamp mode immediately
      state.selectedPrefabId = prefab.id;
      refreshPaletteSelection();
      renderInspector(prefab);
      const prev = state._prefabStamp;
      state._prefabStamp = {
        id: prefab.id,
        rotate: (prev?.id === prefab.id ? prev.rotate : 0),
        flipX:  (prev?.id === prefab.id ? prev.flipX  : false),
      };
      setCanvasMode("prefab");
      draw();

      let dragging = false;
      const startX = ev.clientX, startY = ev.clientY;

      const onMove = (me) => {
        if (!dragging) {
          if (Math.hypot(me.clientX - startX, me.clientY - startY) > 6) {
            dragging = true;
            state.draggingPrefabId = prefab.id;
          }
        }
        if (!dragging) return;
        const canvasRect = canvas.getBoundingClientRect();
        const cx = me.clientX - canvasRect.left, cy = me.clientY - canvasRect.top;
        if (!is3DMode() && cx >= 0 && cy >= 0 && cx <= canvasRect.width && cy <= canvasRect.height) {
          state.hoverCell = screenToGrid(cx, cy);
        } else {
          state.hoverCell = null;
          if (state.mode === "sphere" && sphereThree) {
            state.sphereHoverCell = hitCell3D(me.clientX, me.clientY);
          }
        }
        draw();
        if (state.mode === "sphere" && sphereThree) renderSphere();
      };

      const onUp = (ue) => {
        card.removeEventListener("pointermove", onMove);
        card.removeEventListener("pointerup", onUp);
        card.removeEventListener("pointercancel", onUp);
        if (dragging && state._prefabStamp) {
          const { id, rotate, flipX } = state._prefabStamp;
          const canvasRect = canvas.getBoundingClientRect();
          const cx = ue.clientX - canvasRect.left, cy = ue.clientY - canvasRect.top;
          if (!is3DMode() && cx >= 0 && cy >= 0 && cx <= canvasRect.width && cy <= canvasRect.height) {
            const target = screenToGrid(cx, cy);
            placePrefab(id, Math.floor(target.x), Math.floor(target.y), { rotate, flipX });
            state.selectedPrefabId = id;
            refreshPaletteSelection();
            const pf = getPrefabById(id);
            if (pf) renderInspector(pf);
            if (state.mode === "arcade") state.score = Math.max(0, state.score - 8);
            snapshotNow();
          } else if (state.mode === "sphere" && sphereThree) {
            const cell = hitCell3D(ue.clientX, ue.clientY);
            if (cell) {
              spherePlacePrefab(id, cell.col, cell.row, { rotate, flipX });
              state.selectedPrefabId = id;
              refreshPaletteSelection();
              const pf = getPrefabById(id);
              if (pf) renderInspector(pf);
              state.sphereHoverCell = null;
            }
          }
        }
        state.draggingPrefabId = null;
        draw();
      };

      card.addEventListener("pointermove", onMove);
      card.addEventListener("pointerup", onUp);
      card.addEventListener("pointercancel", onUp);
    });

    return card;
  }

  function buildPalette() {
    paletteList.innerHTML = "";
    const customs = lsLoad(LS_CUSTOM_PREFABS);
    if (customs.length > 0) {
      const hdr = document.createElement("div");
      hdr.className = "palette-section-hdr";
      hdr.textContent = "Custom";
      paletteList.appendChild(hdr);
      for (const p of [...customs].reverse()) {
        paletteList.appendChild(makePaletteCard(p, true));
      }
      const hdr2 = document.createElement("div");
      hdr2.className = "palette-section-hdr";
      hdr2.textContent = "Built-in";
      paletteList.appendChild(hdr2);
    }
    for (const prefab of PREFABS) {
      paletteList.appendChild(makePaletteCard(prefab, false));
    }
    const firstId = customs.length > 0 ? customs[customs.length - 1].id : PREFABS[0].id;
    const firstPrefab = getPrefabById(firstId) || PREFABS[0];
    state.selectedPrefabId = firstPrefab.id;
    refreshPaletteSelection();
    renderInspector(firstPrefab);
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
    const periodLine = prefab.period ? `<p><strong>Nominal period:</strong> ${prefab.period}</p>` : "";
    const tipLine = prefab.tip ? `<p><strong>Tip:</strong> ${prefab.tip}</p>` : "";
    inspectorBody.innerHTML = `
      <h3>${prefab.name}</h3>
      <p>${prefab.desc}</p>
      <p><strong>Type:</strong> ${prefab.type}</p>
      <p><strong>Footprint:</strong> ${width} × ${height}</p>
      ${periodLine}${tipLine}
    `;
  }

  function setupControls() {
    // Floating tool palette
    document.querySelectorAll(".mode-btn").forEach((btn) => {
      btn.addEventListener("click", () => setCanvasMode(btn.dataset.mode));
    });
    const tpCollapse = document.getElementById("tpCollapse");
    const tpReveal   = document.getElementById("tpReveal");
    if (tpCollapse) tpCollapse.addEventListener("click", toggleToolPalette);
    if (tpReveal)   tpReveal.addEventListener("click", toggleToolPalette);

    const hintReveal = document.getElementById("hintReveal");
    if (hintReveal) hintReveal.addEventListener("click", toggleHint);

    // Shape picker
    const shapePicker = document.getElementById('shapePicker');
    if (shapePicker) {
      shapePicker.querySelectorAll('[data-shape]').forEach(btn => {
        btn.addEventListener('click', () => confirmShape(btn.dataset.shape));
      });
      document.getElementById('shapePickerCancel')?.addEventListener('click', () => {
        hideShapePicker(); draw();
      });
      // Close on outside click
      document.addEventListener('pointerdown', (e) => {
        if (shapePicker.style.display !== 'none' && !shapePicker.contains(e.target))
          hideShapePicker();
      }, { capture: true });
    }

    // Manifold overlap protocol & kernel inherit settings
    const mOverlapA = document.getElementById('manifoldOverlapA');
    const mOverlapB = document.getElementById('manifoldOverlapB');
    if (mOverlapA) mOverlapA.addEventListener('change', () => { state.manifoldOverlapProtocol = 'A'; });
    if (mOverlapB) mOverlapB.addEventListener('change', () => { state.manifoldOverlapProtocol = 'B'; });

    const mKernelInherit = document.getElementById('manifoldKernelInherit');
    if (mKernelInherit) mKernelInherit.addEventListener('change', () => {
      state.manifoldKernelInherit = mKernelInherit.checked;
      if (state.manifoldKernelInherit) rebuildAllManifoldRegions();
    });

    document.getElementById("playBtn").addEventListener("click", () => {
      syncPlayUI(!state.running, false);
    });

    document.getElementById("stepBtn").addEventListener("click", () => {
      syncPlayUI(false, false);
      tickForward();
      if (state.mode === "sphere" && sphereThree) renderSphere();
      else if (is3DMode() && manifoldThree) renderManifold();
      else draw();
      updateHud();
    });

    document.getElementById("clearBtn").addEventListener("click", () => {
      clearBoard();
      snapshotNow();
    });

    document.getElementById("demoBtn").addEventListener("click", () => {
      loadDemo();
    });

    speedInput.addEventListener("input", () => {
      state.stepsPerSecond = Number(speedInput.value);
      speedOut.textContent = String(state.stepsPerSecond);
      const closest = SPEED_TIERS.reduce((best, v, i) =>
        Math.abs(v - state.stepsPerSecond) < Math.abs(SPEED_TIERS[best] - state.stepsPerSecond) ? i : best, 0);
      tlSpeed.value = String(closest);
      tlSpeedLabel.textContent = SPEED_LABELS[closest];
    });

    modeSelect.addEventListener("change", () => {
      state.mode = modeSelect.value;
      if (is3DMode()) {
        canvas.style.display = "none";
        sphereCanvas.style.display = "block";
        if (state.mode === "sphere") {
          if (!sphereThree) initSphereRenderer();
          else {
            const renderer = getRenderer();
            const w = sphereCanvas.offsetWidth, h = sphereCanvas.offsetHeight;
            renderer.setSize(w, h, false);
            sphereThree.camera.aspect = w / h;
            sphereThree.camera.updateProjectionMatrix();
          }
        } else {
          initManifoldRenderer();
        }
        init3DInput();
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

    sharedStateInput.addEventListener("change", () => {
      state.sharedState = sharedStateInput.checked;
      updateHud();
      draw();
    });
    for (let i = 0; i < LEVELS.length; i += 1) {
      const opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = LEVELS[i].name;
      levelSelect.appendChild(opt);
    }

    levelSelect.addEventListener("change", () => {
      startLevel(Number(levelSelect.value));
    });

    document.getElementById("startLevelBtn").addEventListener("click", () => {
      startLevel(Number(levelSelect.value));
    });

    document.getElementById("guideClose").addEventListener("click", hideGuide);
    guideHintBtn.addEventListener("click", revealHint);
  }

  function setupCanvasInput() {
    canvas.addEventListener("contextmenu", (ev) => ev.preventDefault());
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointercancel", handlePointerUp);
    canvas.addEventListener("wheel", handleWheel, { passive: false });

  }

  function transformSelection(rotateDeg, doFlipX = false) {
    const sel = state.selection;
    if (!sel || sel.w <= 0 || sel.h <= 0) return;

    // Commit any pending translation into sel.x/y first
    if (state._selMoving && (state._selMoveDelta.dx !== 0 || state._selMoveDelta.dy !== 0)) {
      sel.x += state._selMoveDelta.dx;
      sel.y += state._selMoveDelta.dy;
      state._selMoveDelta = { dx: 0, dy: 0 };
    }

    // Lift cells from the board if not already lifted
    if (!state._selMoving) {
      const cells = [];
      const alive = activeAlive();
      for (const k of alive) {
        const [col, row] = parseKey(k);
        if (col >= sel.x && col < sel.x + sel.w && row >= sel.y && row < sel.y + sel.h)
          cells.push([col - sel.x, row - sel.y]);
      }
      for (const [ox, oy] of cells) alive.delete(key(sel.x + ox, sel.y + oy));
      state._selCells = cells;
      state._selMoving = true;
      state._selMoveDelta = { dx: 0, dy: 0 };
    }

    const w = sel.w, h = sel.h;
    const cells = state._selCells || [];

    if (doFlipX) {
      // Mirror horizontally within the box — box stays W×H
      state._selCells = cells.map(([ox, oy]) => [w - 1 - ox, oy]);
    } else {
      // 90° CW rotation within the box: [ox,oy] → [H-1-oy, ox], box becomes H×W
      state._selCells = cells.map(([ox, oy]) => [h - 1 - oy, ox]);
      sel.w = h;
      sel.h = w;
    }
  }

  function setupShortcuts() {
    window.addEventListener("keydown", (ev) => {
      if (ev.code === "Space") {
        if (!state.keys.spaceDown) {
          syncPlayUI(!state.running, false);
        }
        state.keys.spaceDown = true;
        ev.preventDefault();
        return;
      }

      if (ev.target && ["INPUT", "SELECT", "TEXTAREA"].includes(ev.target.tagName)) {
        return;
      }

      if (ev.key === "`") { toggleToolPalette(); ev.preventDefault(); return; }
      if (ev.key === "?" || (ev.key === "h" && !mod)) { toggleHint(); ev.preventDefault(); return; }
      if (ev.key === "t" && !mod) { setCanvasMode("manifold"); ev.preventDefault(); return; }
      if (ev.key === "k" && !mod) { toggleChristoffelVis(); ev.preventDefault(); return; }

      // Selection edit shortcuts
      const hasSel = state.selection && state.selection.w > 0 && state.selection.h > 0;
      const mod = ev.ctrlKey || ev.metaKey;

      function selCells() {
        if (state._selMoving && state._selCells) return [...state._selCells];
        const sel = state.selection;
        const out = [];
        for (const k of activeAlive()) {
          const [col, row] = parseKey(k);
          if (col >= sel.x && col < sel.x + sel.w && row >= sel.y && row < sel.y + sel.h)
            out.push([col - sel.x, row - sel.y]);
        }
        return out;
      }

      function deleteSelCells() {
        if (state._selMoving && state._selCells) {
          state._selCells = null; state._selMoving = false; state._selMoveDelta = { dx: 0, dy: 0 };
        } else {
          const sel = state.selection;
          const alive = activeAlive();
          for (let c = sel.x; c < sel.x + sel.w; c++)
            for (let r = sel.y; r < sel.y + sel.h; r++) alive.delete(key(c, r));
        }
      }

      if ((ev.key === "Delete" || ev.key === "Backspace") && state._manifoldSelected != null) {
        removeManifoldRegion(state._manifoldSelected);
        draw();
        ev.preventDefault();
      } else if ((ev.key === "Delete" || ev.key === "Backspace") && state._zoneSelected != null) {
        state.zones = state.zones.filter(z => z.id !== state._zoneSelected);
        state._zoneSelected = null;
        zonesPanelSync();
        ev.preventDefault();
      } else if ((ev.key === "Delete" || ev.key === "Backspace") && state._ffSelected != null) {
        state.forceFields = state.forceFields.filter(f => f.id !== state._ffSelected);
        _ffExpanded.delete(state._ffSelected);
        state._ffSelected = null;
        fieldsPanelSync();
        ev.preventDefault();
      } else if ((ev.key === "Delete" || ev.key === "Backspace") && state._lensSelected != null) {
        state.lenses = state.lenses.filter(l => l.id !== state._lensSelected);
        state._lensSelected = null;
        _lensDragOp = null;
        lensesPanelSync();
        ev.preventDefault();
      } else if ((ev.key === "Delete" || ev.key === "Backspace") && hasSel) {
        deleteSelCells();
        state.selection = null;
        ev.preventDefault();
      } else if (mod && ev.key === "c" && hasSel) {
        state._clipboard = selCells();
        ev.preventDefault();
      } else if (mod && ev.key === "x" && hasSel) {
        state._clipboard = selCells();
        deleteSelCells();
        state.selection = null;
        ev.preventDefault();
      } else if (mod && ev.key === "v" && state._clipboard && state._clipboard.length > 0) {
        const hc = state.hoverCell;
        const ox = hc ? hc.x : Math.round(state.cameraX);
        const oy = hc ? hc.y : Math.round(state.cameraY);
        for (const [dx, dy] of state._clipboard) setCell(ox + dx, oy + dy, true);
        ev.preventDefault();
      } else if (ev.key.toLowerCase() === "n") {
        syncPlayUI(false, false);
        tickForward();
        if (state.mode === "sphere" && sphereThree) renderSphere();
        else if (is3DMode() && manifoldThree) renderManifold();
        updateHud();
      } else if (ev.key.toLowerCase() === "b") {
        syncPlayUI(false, false);
        tickBackward();
        if (state.mode === "sphere" && sphereThree) renderSphere();
        else if (is3DMode() && manifoldThree) renderManifold();
        updateHud();
      } else if (ev.key.toLowerCase() === "c") {
        clearBoard();
        snapshotNow();
      } else if (ev.key.toLowerCase() === "d") {
        loadDemo();
      } else if (ev.key.toLowerCase() === "r" && state.canvasMode === "prefab" && state._prefabStamp) {
        state._prefabStamp.rotate = (state._prefabStamp.rotate + 90) % 360;
        draw();
      } else if (ev.key.toLowerCase() === "r" && state.canvasMode === "select" && hasSel) {
        transformSelection(90);
        draw();
      } else if (ev.key.toLowerCase() === "f" && state.canvasMode === "prefab" && state._prefabStamp) {
        state._prefabStamp.flipX = !state._prefabStamp.flipX;
        draw();
      } else if (ev.key.toLowerCase() === "f" && state.canvasMode === "select" && hasSel) {
        transformSelection(0, true);
        draw();
      } else if (ev.key.toLowerCase() === "g") {
        state.showGrid = !state.showGrid;
      } else if (ev.key === "1") {
        modeSelect.value = "sandbox";
        modeSelect.dispatchEvent(new Event("change"));
      } else if (ev.key === "2") {
        modeSelect.value = "arcade";
        modeSelect.dispatchEvent(new Event("change"));
      } else if (ev.key === "3") {
        modeSelect.value = "sphere";
        modeSelect.dispatchEvent(new Event("change"));
      } else if (ev.key === "4") {
        modeSelect.value = "torus";
        modeSelect.dispatchEvent(new Event("change"));
      } else if (ev.key === "5") {
        modeSelect.value = "klein";
        modeSelect.dispatchEvent(new Event("change"));
      } else if (ev.key === "6") {
        modeSelect.value = "mobius";
        modeSelect.dispatchEvent(new Event("change"));
      } else if (ev.key === "7") {
        modeSelect.value = "cylinder";
        modeSelect.dispatchEvent(new Event("change"));
      } else if (ev.key.toLowerCase() === "p") {
        setCanvasMode("paint");
      } else if (ev.key.toLowerCase() === "m") {
        setCanvasMode(state.canvasMode === "move" ? "paint" : "move");
      } else if (ev.key.toLowerCase() === "s") {
        setCanvasMode(state.canvasMode === "select" ? "paint" : "select");
        if (state.canvasMode !== "select") state.selection = null;
      } else if (ev.key.toLowerCase() === "v" && !mod) {
        setCanvasMode(state.canvasMode === "force" ? "paint" : "force");
      } else if (ev.key.toLowerCase() === "l" && !mod) {
        setCanvasMode(state.canvasMode === "lens" ? "paint" : "lens");
      } else if (ev.key === "~" || ev.key === "`") {
        _toggleScriptPanel();
        ev.preventDefault();
      } else if (ev.key === "Escape") {
        if (state.canvasMode === "prefab") {
          setCanvasMode("paint"); // clears _prefabStamp via setCanvasMode
          draw();
        } else if (state.canvasMode === "object") {
          const prev = state._prevCanvasMode || "paint";
          state._prevCanvasMode = null;
          setCanvasMode(prev);
        } else {
          setCanvasMode("paint");
          state.selection = null;
        }
        ev.preventDefault();
      } else if (ev.key.toLowerCase() === "x" && !mod) {
        if (state.cellTypesEnabled) {
          state.paintType = state.paintType === 0 ? 1 : 0;
          const btnA = document.getElementById("typeABtn");
          const btnB = document.getElementById("typeBBtn");
          if (btnA && btnB) {
            btnA.classList.toggle("rl-type-active", state.paintType === 0);
            btnB.classList.toggle("rl-type-active", state.paintType === 1);
          }
        }
      }
    });

    window.addEventListener("keyup", (ev) => {
      if (ev.code === "Space") {
        state.keys.spaceDown = false;
      }
    });
  }

  function setupTimeline() {
    // Speed tier slider — initialised at index 3 (8×), matching HTML default value="3"
    state.stepsPerSecond = SPEED_TIERS[3];

    tlSpeed.addEventListener("input", () => {
      const tier = Number(tlSpeed.value);
      state.stepsPerSecond = SPEED_TIERS[tier];
      tlSpeedLabel.textContent = SPEED_LABELS[tier];
      speedOut.textContent = String(SPEED_TIERS[tier]);
    });

    // Forward play / pause
    tlPlayPause.addEventListener("click", () => {
      syncPlayUI(!state.running || state.playReverse, false);
    });

    // Reverse play
    tlRevPlay.addEventListener("click", () => {
      if (state.histFrames.length <= 1) return;
      const goingReverse = !(state.running && state.playReverse);
      syncPlayUI(goingReverse, goingReverse);
    });

    // Step backward
    document.getElementById("tlStepBack").addEventListener("click", () => {
      syncPlayUI(false, false);
      tickBackward();
      if (state.mode === "sphere" && sphereThree) renderSphere();
      else if (is3DMode() && manifoldThree) renderManifold();
      else draw();
      updateHud();
    });

    // Step forward
    document.getElementById("tlStepFwd").addEventListener("click", () => {
      syncPlayUI(false, false);
      tickForward();
      if (state.mode === "sphere" && sphereThree) renderSphere();
      else if (is3DMode() && manifoldThree) renderManifold();
      else draw();
      updateHud();
    });

    // Jump to history start
    document.getElementById("tlStart").addEventListener("click", () => {
      syncPlayUI(false, false);
      if (state.histFrames.length > 0) restoreFrame(0);
      if (state.mode === "sphere" && sphereThree) renderSphere();
      else if (is3DMode() && manifoldThree) renderManifold();
      else draw();
      updateHud();
    });

    // Jump to live (latest frame)
    document.getElementById("tlGoLive").addEventListener("click", () => {
      syncPlayUI(false, false);
      if (state.histFrames.length > 0) restoreFrame(state.histFrames.length - 1);
      if (state.mode === "sphere" && sphereThree) renderSphere();
      else if (is3DMode() && manifoldThree) renderManifold();
      else draw();
      updateHud();
    });

    // Scrubber drag
    let scrubbing = false;

    function scrubToX(clientX) {
      const rect = tlTrack.getBoundingClientRect();
      const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const idx = Math.round(frac * (state.histFrames.length - 1));
      if (state.histFrames.length > 0) {
        syncPlayUI(false, false);
        restoreFrame(idx);
        if (state.mode === "sphere" && sphereThree) renderSphere();
        else if (is3DMode() && manifoldThree) renderManifold();
        else draw();
        updateHud();
      }
    }

    tlTrack.addEventListener("pointerdown", (e) => {
      scrubbing = true;
      tlTrack.setPointerCapture(e.pointerId);
      scrubToX(e.clientX);
      e.preventDefault();
    });
    tlTrack.addEventListener("pointermove", (e) => {
      if (scrubbing) scrubToX(e.clientX);
    });
    tlTrack.addEventListener("pointerup", () => { scrubbing = false; });
  }

  function setupPhysicsLab() {
    const driftXEl = document.getElementById("driftX");
    const driftYEl = document.getElementById("driftY");
    const driftXOut = document.getElementById("driftXOut");
    const driftYOut = document.getElementById("driftYOut");
    const colorByAgeEl = document.getElementById("colorByAge");

    driftXEl.addEventListener("input", () => {
      state.driftX = Number(driftXEl.value);
      driftXOut.textContent = Number(driftXEl.value).toFixed(2);
    });

    driftYEl.addEventListener("input", () => {
      state.driftY = Number(driftYEl.value);
      driftYOut.textContent = Number(driftYEl.value).toFixed(2);
    });

    colorByAgeEl.addEventListener("change", () => {
      state.colorByAge = colorByAgeEl.checked;
    });

    const showTrailsEl = document.getElementById("showTrails");
    const trailDecayEl = document.getElementById("trailDecay");
    const trailDecayOut = document.getElementById("trailDecayOut");

    showTrailsEl.addEventListener("change", () => {
      state.showTrails = showTrailsEl.checked;
      if (!state.showTrails) trailMap.clear();
    });

    trailDecayEl.addEventListener("input", () => {
      state.trailDecay = Number(trailDecayEl.value);
      trailDecayOut.textContent = trailDecayEl.value;
    });

    document.getElementById("repulseEnabled").addEventListener("change", (e) => {
      state.repulseEnabled = e.target.checked;
    });
    document.getElementById("repulseAge").addEventListener("input", (e) => {
      state.repulseAge = Number(e.target.value);
      document.getElementById("repulseAgeOut").textContent = e.target.value;
    });
    document.getElementById("repulseStrength").addEventListener("input", (e) => {
      state.repulseStrength = Number(e.target.value);
      document.getElementById("repulseStrengthOut").textContent = e.target.value;
    });

    document.getElementById("contigRepulseEnabled").addEventListener("change", (e) => {
      state.contigRepulseEnabled = e.target.checked;
      if (!e.target.checked) _contigAccum.clear();
    });
    document.getElementById("contigRepulseRadius").addEventListener("input", (e) => {
      state.contigRepulseRadius = Number(e.target.value);
      document.getElementById("contigRepulseRadiusOut").textContent = e.target.value;
    });
    document.getElementById("contigRepulseForce").addEventListener("input", (e) => {
      state.contigRepulseForce = Number(e.target.value);
      document.getElementById("contigRepulseForceOut").textContent = Number(e.target.value).toFixed(1);
    });
    document.getElementById("contigMinSize").addEventListener("input", (e) => {
      state.contigMinSize = Number(e.target.value);
      document.getElementById("contigMinSizeOut").textContent = e.target.value;
    });

    const showHintsEl    = document.getElementById("showHints");
    const hintDurationEl = document.getElementById("hintDuration");
    const hintDurationOut= document.getElementById("hintDurationOut");
    if (showHintsEl) showHintsEl.addEventListener("change", () => {
      state.showHints = showHintsEl.checked;
      showHint();
    });
    if (hintDurationEl) hintDurationEl.addEventListener("input", () => {
      state.hintDuration = Number(hintDurationEl.value);
      if (hintDurationOut) hintDurationOut.textContent = state.hintDuration + "s";
      showHint();
    });
  }

  function setupRuleLab() {
    function syncActivePreset() {
      const current = ruleInputEl.value.toUpperCase().replace(/\s/g, "");
      document.querySelectorAll(".rl-preset").forEach((btn) => {
        btn.classList.toggle("rl-active", btn.dataset.rule.toUpperCase() === current);
      });
    }
    _syncActivePreset = syncActivePreset;

    document.getElementById("ruleApply").addEventListener("click", () => {
      if (setRule(ruleInputEl.value)) {
        syncActivePreset();
      } else {
        ruleInputEl.style.borderColor = "var(--danger)";
        setTimeout(() => { ruleInputEl.style.borderColor = ""; }, 600);
      }
    });

    ruleInputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") document.getElementById("ruleApply").click();
    });

    document.querySelectorAll(".rl-preset").forEach((btn) => {
      btn.addEventListener("click", () => {
        ruleInputEl.value = btn.dataset.rule;
        setRule(btn.dataset.rule);
        syncActivePreset();
      });
    });

    kernelShapeEl.addEventListener("change", () => {
      state.kernelShape = kernelShapeEl.value;
      _kernelOffsets = null;
      _kernelCacheKey = null;
      if (state.manifoldKernelInherit) rebuildAllManifoldRegions();
    });

    kernelRadiusEl.addEventListener("input", () => {
      state.kernelRadius = Number(kernelRadiusEl.value);
      kernelRadiusOut.textContent = kernelRadiusEl.value;
      _kernelOffsets = null;
      _kernelCacheKey = null;
      if (state.manifoldKernelInherit) rebuildAllManifoldRegions();
    });

    const ruleInput2El = document.getElementById("ruleInput2");
    _ruleInput2El = ruleInput2El;
    const ruleCyclePeriodEl = document.getElementById("ruleCyclePeriod");
    const ruleCyclePeriodOut = document.getElementById("ruleCyclePeriodOut");
    const ruleCycleActiveEl = document.getElementById("ruleCycleActive");

    ruleInput2El.addEventListener("change", () => {
      const r = parseRule(ruleInput2El.value);
      if (r) { state.ruleB2 = r.B; state.ruleS2 = r.S; }
      else {
        ruleInput2El.style.borderColor = "var(--danger)";
        setTimeout(() => { ruleInput2El.style.borderColor = ""; }, 600);
      }
    });

    ruleCyclePeriodEl.addEventListener("input", () => {
      state.ruleCyclePeriod = Number(ruleCyclePeriodEl.value);
      ruleCyclePeriodOut.textContent = ruleCyclePeriodEl.value;
    });

    ruleCycleActiveEl.addEventListener("change", () => {
      state.ruleCycleActive = ruleCycleActiveEl.checked;
    });

    syncActivePreset();
  }

  function setupWaveLab() {
    const leniaModeEl = document.getElementById("leniaModeChk");
    const leniaMuEl = document.getElementById("leniaMu");
    const leniaMuOut = document.getElementById("leniaMuOut");
    const leniaSigmaEl = document.getElementById("leniaSigma");
    const leniaSigmaOut = document.getElementById("leniaSigmaOut");
    const leniaDtEl = document.getElementById("leniaDt");
    const leniaDtOut = document.getElementById("leniaDtOut");
    if (!leniaModeEl) return;

    leniaModeEl.addEventListener("change", (e) => {
      state.leniaMode = e.target.checked;
      if (state.leniaMode) valueMap.clear();
    });
    leniaMuEl.addEventListener("input", () => {
      state.leniaMu = Number(leniaMuEl.value);
      leniaMuOut.textContent = leniaMuEl.value;
    });
    leniaSigmaEl.addEventListener("input", () => {
      state.leniaSigma = Number(leniaSigmaEl.value);
      leniaSigmaOut.textContent = leniaSigmaEl.value;
    });
    leniaDtEl.addEventListener("input", () => {
      state.leniaTimeStep = Number(leniaDtEl.value);
      leniaDtOut.textContent = leniaDtEl.value;
    });
  }

  function setupTypeLab() {
    const cellTypesEl = document.getElementById("cellTypesChk");
    const typeABtn = document.getElementById("typeABtn");
    const typeBBtn = document.getElementById("typeBBtn");
    const typeARuleEl = document.getElementById("typeARule");
    const typeBRuleEl = document.getElementById("typeBRule");
    if (!cellTypesEl) return;

    cellTypesEl.addEventListener("change", (e) => {
      state.cellTypesEnabled = e.target.checked;
    });
    typeABtn.addEventListener("click", () => {
      state.paintType = 0;
      typeABtn.classList.add("rl-type-active");
      typeBBtn.classList.remove("rl-type-active");
    });
    typeBBtn.addEventListener("click", () => {
      state.paintType = 1;
      typeBBtn.classList.add("rl-type-active");
      typeABtn.classList.remove("rl-type-active");
    });
    typeARuleEl.addEventListener("change", () => {
      const r = parseRule(typeARuleEl.value);
      if (r) { state.typeARuleB = r.B; state.typeARuleS = r.S; }
    });
    typeBRuleEl.addEventListener("change", () => {
      const r = parseRule(typeBRuleEl.value);
      if (r) { state.typeBRuleB = r.B; state.typeBRuleS = r.S; }
    });
  }

  // ── Library (save / load configs and boards) ──────────────────────────────

  const LS_CONFIGS = "aa_configs";
  const LS_BOARDS  = "aa_boards";

  function lsLoad(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; }
  }
  function lsSave(key, data) {
    try { localStorage.setItem(key, JSON.stringify(data)); } catch { /* quota */ }
  }

  function encodeRLE() {
    const alive = activeAlive();
    if (alive.size === 0) return "";
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const k of alive) {
      const [x, y] = parseKey(k);
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
    let body = "";
    for (let row = minY; row <= maxY; row++) {
      const runs = [];
      let run = 0, cur = false;
      for (let col = minX; col <= maxX; col++) {
        const c = alive.has(key(col, row));
        if (c === cur) { run++; }
        else { if (run > 0) runs.push({ n: run, a: cur }); cur = c; run = 1; }
      }
      if (run > 0) runs.push({ n: run, a: cur });
      while (runs.length && !runs[runs.length - 1].a) runs.pop();
      for (const r of runs) body += (r.n > 1 ? r.n : "") + (r.a ? "o" : "b");
      if (row < maxY) body += "$";
    }
    body += "!";
    let wrapped = "";
    while (body.length > 70) { wrapped += body.slice(0, 70) + "\n"; body = body.slice(70); }
    wrapped += body;
    return `x = ${maxX - minX + 1}, y = ${maxY - minY + 1}, rule = ${ruleToString(state.ruleB, state.ruleS)}\n${wrapped}`;
  }

  function decodeRLE(text) {
    const lines = text.split(/\r?\n/);
    let headerLine = null;
    const bodyLines = [];
    for (const l of lines) {
      if (l.startsWith("#") || l.trim() === "") continue;
      if (headerLine === null) { headerLine = l; continue; }
      bodyLines.push(l);
    }
    if (!headerLine) return null;
    const xm = headerLine.match(/x\s*=\s*(\d+)/i);
    const ym = headerLine.match(/y\s*=\s*(\d+)/i);
    if (!xm || !ym) return null;
    const body = bodyLines.join("").split("!")[0];
    const cells = [];
    let col = 0, row = 0, count = "";
    for (const ch of body) {
      if (ch >= "0" && ch <= "9") { count += ch; continue; }
      const n = count ? parseInt(count) : 1;
      count = "";
      if (ch === "b") { col += n; }
      else if (ch === "o") { for (let i = 0; i < n; i++) cells.push([col + i, row]); col += n; }
      else if (ch === "$") { col = 0; row += n; }
    }
    return cells;
  }

  function detectPeriod(maxP = 512) {
    const alive = activeAlive();
    if (alive.size === 0) return { found: false, msg: "Board is empty." };
    if (alive.size > 3000) return { found: false, msg: "Too many cells (> 3000) — detection skipped." };

    const savedKeys = [...alive];
    const savedGen = state.generation;
    const savedAgeMap = new Map(cellAgeMap);

    let minX0 = Infinity, minY0 = Infinity;
    for (const k of alive) {
      const [x, y] = parseKey(k);
      minX0 = Math.min(minX0, x); minY0 = Math.min(minY0, y);
    }
    const fp0 = savedKeys.map((k) => { const [x, y] = parseKey(k); return `${x - minX0},${y - minY0}`; }).sort().join("|");
    const origSize = alive.size;

    let foundPeriod = null, displacement = null;

    for (let p = 1; p <= maxP; p++) {
      stepLife();
      const cur = activeAlive();
      if (cur.size === origSize) {
        let minX = Infinity, minY = Infinity;
        for (const k of cur) { const [x, y] = parseKey(k); minX = Math.min(minX, x); minY = Math.min(minY, y); }
        const fp = [...cur].map((k) => { const [x, y] = parseKey(k); return `${x - minX},${y - minY}`; }).sort().join("|");
        if (fp === fp0) { foundPeriod = p; displacement = { dx: minX - minX0, dy: minY - minY0 }; break; }
      }
    }

    if (state.sharedState) state.alive = new Set(savedKeys);
    else state.modeAlive[state.mode] = new Set(savedKeys);
    state.generation = savedGen;
    cellAgeMap = new Map(savedAgeMap);

    if (foundPeriod === null) return { found: false, msg: `No period ≤ ${maxP} gens found.` };
    const { dx, dy } = displacement;
    if (dx === 0 && dy === 0) return { found: true, msg: `Period: ${foundPeriod}` };
    const sign = (n) => (n > 0 ? "+" : "") + n;
    return { found: true, msg: `Period: ${foundPeriod}, shift (${sign(dx)}, ${sign(dy)})` };
  }

  function serializeConfig() {
    return {
      rule1: ruleToString(state.ruleB, state.ruleS),
      rule2: ruleToString(state.ruleB2, state.ruleS2),
      kernelShape: state.kernelShape,
      kernelRadius: state.kernelRadius,
      driftX: state.driftX,
      driftY: state.driftY,
      colorByAge: state.colorByAge,
      showTrails: state.showTrails,
      trailDecay: state.trailDecay,
      showHints: state.showHints,
      hintDuration: state.hintDuration,
      manifoldRegions: state.manifoldRegions.map(r => r.toJSON()),
      manifoldOverlapProtocol: state.manifoldOverlapProtocol,
      manifoldKernelInherit: state.manifoldKernelInherit,
      christoffelModStrength: state.christoffelModStrength,
      repulseEnabled: state.repulseEnabled,
      repulseAge: state.repulseAge,
      repulseStrength: state.repulseStrength,
      contigRepulseEnabled: state.contigRepulseEnabled,
      contigRepulseRadius: state.contigRepulseRadius,
      contigRepulseForce: state.contigRepulseForce,
      contigMinSize: state.contigMinSize,
      ruleCycleActive: state.ruleCycleActive,
      ruleCyclePeriod: state.ruleCyclePeriod,
      leniaMode: state.leniaMode,
      leniaMu: state.leniaMu,
      leniaSigma: state.leniaSigma,
      leniaTimeStep: state.leniaTimeStep,
      cellTypesEnabled: state.cellTypesEnabled,
      typeAColor: state.typeAColor,
      typeBColor: state.typeBColor,
      typeARuleB: [...state.typeARuleB],
      typeARuleS: [...state.typeARuleS],
      typeBRuleB: [...state.typeBRuleB],
      typeBRuleS: [...state.typeBRuleS],
      heatmapMode: state.heatmapMode,
      heatmapOverlay: state.heatmapOverlay,
      entrenchEnabled: state.entrenchEnabled,
      entrenchThreshold: state.entrenchThreshold,
      adaptRulesEnabled: state.adaptRulesEnabled,
      adaptTarget: state.adaptTarget,
      adaptRate: state.adaptRate,
      stepsPerSecond: state.stepsPerSecond,
      zoom: state.zoom,
      showGrid: state.showGrid,
      zones: state.zones.map(z => ({ ...z, ruleB: [...z.ruleB], ruleS: [...z.ruleS] })),
      forceFields: state.forceFields.map((ff) => ({ ...ff })),
      densityFeedback: state.densityFeedback,
      densityTarget: state.densityTarget,
      densityStrength: state.densityStrength,
    };
  }

  function applyConfig(cfg) {
    if (cfg.rule1) { const r = parseRule(cfg.rule1); if (r) { state.ruleB = r.B; state.ruleS = r.S; } }
    if (cfg.rule2) { const r = parseRule(cfg.rule2); if (r) { state.ruleB2 = r.B; state.ruleS2 = r.S; } }
    if (cfg.kernelShape  !== undefined) state.kernelShape  = cfg.kernelShape;
    if (cfg.kernelRadius !== undefined) state.kernelRadius = cfg.kernelRadius;
    _kernelOffsets = null; _kernelCacheKey = null;
    if (cfg.driftX               !== undefined) state.driftX               = cfg.driftX;
    if (cfg.driftY               !== undefined) state.driftY               = cfg.driftY;
    if (cfg.colorByAge           !== undefined) state.colorByAge           = cfg.colorByAge;
    if (cfg.showTrails           !== undefined) state.showTrails           = cfg.showTrails;
    if (cfg.trailDecay           !== undefined) state.trailDecay           = cfg.trailDecay;
    if (cfg.showHints                !== undefined) state.showHints                = cfg.showHints;
    if (cfg.hintDuration             !== undefined) state.hintDuration             = cfg.hintDuration;
    if (cfg.manifoldOverlapProtocol  !== undefined) state.manifoldOverlapProtocol  = cfg.manifoldOverlapProtocol;
    if (cfg.manifoldKernelInherit    !== undefined) state.manifoldKernelInherit    = cfg.manifoldKernelInherit;
    if (cfg.christoffelModStrength   !== undefined) state.christoffelModStrength   = cfg.christoffelModStrength;
    if (cfg.manifoldRegions) {
      state.manifoldRegions = cfg.manifoldRegions.map(d => {
        const r = new MRegion(d);
        r.build(_manifoldKernelWeights());
        return r;
      });
      state._manifoldIdSeq = state.manifoldRegions.reduce((m, r) => Math.max(m, r.id), 0);
    }
    if (cfg.repulseEnabled       !== undefined) state.repulseEnabled       = cfg.repulseEnabled;
    if (cfg.repulseAge           !== undefined) state.repulseAge           = cfg.repulseAge;
    if (cfg.repulseStrength      !== undefined) state.repulseStrength      = cfg.repulseStrength;
    if (cfg.contigRepulseEnabled !== undefined) state.contigRepulseEnabled = cfg.contigRepulseEnabled;
    if (cfg.contigRepulseRadius  !== undefined) state.contigRepulseRadius  = cfg.contigRepulseRadius;
    if (cfg.contigRepulseForce   !== undefined) state.contigRepulseForce   = cfg.contigRepulseForce;
    if (cfg.contigMinSize        !== undefined) state.contigMinSize        = cfg.contigMinSize;
    if (cfg.ruleCycleActive      !== undefined) state.ruleCycleActive      = cfg.ruleCycleActive;
    if (cfg.ruleCyclePeriod      !== undefined) state.ruleCyclePeriod      = cfg.ruleCyclePeriod;
    if (cfg.leniaMode            !== undefined) state.leniaMode            = cfg.leniaMode;
    if (cfg.leniaMu              !== undefined) state.leniaMu              = cfg.leniaMu;
    if (cfg.leniaSigma           !== undefined) state.leniaSigma           = cfg.leniaSigma;
    if (cfg.leniaTimeStep        !== undefined) state.leniaTimeStep        = cfg.leniaTimeStep;
    if (cfg.cellTypesEnabled     !== undefined) state.cellTypesEnabled     = cfg.cellTypesEnabled;
    if (cfg.typeAColor           !== undefined) state.typeAColor           = cfg.typeAColor;
    if (cfg.typeBColor           !== undefined) state.typeBColor           = cfg.typeBColor;
    if (cfg.typeARuleB) state.typeARuleB = new Set(cfg.typeARuleB);
    if (cfg.typeARuleS) state.typeARuleS = new Set(cfg.typeARuleS);
    if (cfg.typeBRuleB) state.typeBRuleB = new Set(cfg.typeBRuleB);
    if (cfg.typeBRuleS) state.typeBRuleS = new Set(cfg.typeBRuleS);
    if (cfg.heatmapMode      !== undefined) state.heatmapMode      = cfg.heatmapMode;
    if (cfg.heatmapOverlay   !== undefined) state.heatmapOverlay   = cfg.heatmapOverlay;
    if (cfg.entrenchEnabled  !== undefined) state.entrenchEnabled  = cfg.entrenchEnabled;
    if (cfg.entrenchThreshold!== undefined) state.entrenchThreshold= cfg.entrenchThreshold;
    if (cfg.adaptRulesEnabled!== undefined) state.adaptRulesEnabled= cfg.adaptRulesEnabled;
    if (cfg.adaptTarget      !== undefined) state.adaptTarget      = cfg.adaptTarget;
    if (cfg.adaptRate        !== undefined) state.adaptRate        = cfg.adaptRate;
    if (cfg.stepsPerSecond   !== undefined) state.stepsPerSecond   = cfg.stepsPerSecond;
    if (cfg.zoom             !== undefined) state.zoom             = cfg.zoom;
    if (cfg.showGrid             !== undefined) state.showGrid             = cfg.showGrid;
    if (cfg.zones) {
      state.zones = cfg.zones.map(z => ({ ...z, ruleB: new Set(z.ruleB), ruleS: new Set(z.ruleS) }));
      state._zoneIdSeq = state.zones.reduce((m, z) => Math.max(m, z.id), 0);
    }
    if (cfg.forceFields !== undefined) {
      state.forceFields = cfg.forceFields.map((ff) => ({ ...ff }));
      state._ffIdSeq = state.forceFields.reduce((m, f) => Math.max(m, f.id || 0), 0);
    }
    if (cfg.densityFeedback      !== undefined) state.densityFeedback      = cfg.densityFeedback;
    if (cfg.densityTarget        !== undefined) state.densityTarget        = cfg.densityTarget;
    if (cfg.densityStrength      !== undefined) state.densityStrength      = cfg.densityStrength;
    syncDOMFromState();
  }

  function syncDOMFromState() {
    const el  = (id) => document.getElementById(id);
    const sv  = (id, val) => { const e = el(id); if (e) e.value = String(val); };
    const sc  = (id, val) => { const e = el(id); if (e) e.checked = !!val; };
    const st  = (id, val) => { const e = el(id); if (e) e.textContent = String(val); };

    // Rule Lab
    sv("ruleInput", ruleToString(state.ruleB, state.ruleS));
    if (_ruleInput2El) _ruleInput2El.value = ruleToString(state.ruleB2, state.ruleS2);
    sv("kernelShape", state.kernelShape);
    sv("kernelRadius", state.kernelRadius);
    st("kernelRadiusOut", state.kernelRadius);
    sc("ruleCycleActive", state.ruleCycleActive);
    sv("ruleCyclePeriod", state.ruleCyclePeriod);
    st("ruleCyclePeriodOut", state.ruleCyclePeriod);
    _syncActivePreset();

    // Physics Lab
    sv("driftX", state.driftX);
    st("driftXOut", state.driftX.toFixed(2));
    sv("driftY", state.driftY);
    st("driftYOut", state.driftY.toFixed(2));
    sc("colorByAge",           state.colorByAge);
    sc("showTrails",           state.showTrails);
    sv("trailDecay",           state.trailDecay);
    st("trailDecayOut",        state.trailDecay.toFixed(2));
    sc("showHints",            state.showHints);
    sv("hintDuration",         state.hintDuration);
    st("hintDurationOut",      state.hintDuration + "s");
    sc("manifoldKernelInherit", state.manifoldKernelInherit);
    const mOA = document.getElementById('manifoldOverlapA');
    const mOB = document.getElementById('manifoldOverlapB');
    if (mOA) mOA.checked = state.manifoldOverlapProtocol === 'A';
    if (mOB) mOB.checked = state.manifoldOverlapProtocol === 'B';
    sc("repulseEnabled",       state.repulseEnabled);
    sv("repulseAge",           state.repulseAge);
    st("repulseAgeOut",        state.repulseAge);
    sv("repulseStrength",      state.repulseStrength);
    st("repulseStrengthOut",   state.repulseStrength);
    sc("contigRepulseEnabled", state.contigRepulseEnabled);
    sv("contigRepulseRadius",  state.contigRepulseRadius);
    st("contigRepulseRadiusOut",state.contigRepulseRadius);
    sv("contigRepulseForce",   state.contigRepulseForce);
    st("contigRepulseForceOut",state.contigRepulseForce.toFixed(1));
    sv("contigMinSize",        state.contigMinSize);
    st("contigMinSizeOut",     state.contigMinSize);

    // Wave Lab
    sc("leniaModeChk",  state.leniaMode);
    sv("leniaMu",       state.leniaMu);
    st("leniaMuOut",    String(state.leniaMu));
    sv("leniaSigma",    state.leniaSigma);
    st("leniaSigmaOut", String(state.leniaSigma));
    sv("leniaDt",       state.leniaTimeStep);
    st("leniaDtOut",    state.leniaTimeStep.toFixed(2));

    // Cell Types
    sc("cellTypesChk", state.cellTypesEnabled);
    sv("typeARule", ruleToString(state.typeARuleB, state.typeARuleS));
    sv("typeBRule", ruleToString(state.typeBRuleB, state.typeBRuleS));

    // Evo / Heatmap Lab
    sc("heatmapMode",      state.heatmapMode);
    sc("heatmapOverlay",   state.heatmapOverlay);
    sc("entrenchEnabled",  state.entrenchEnabled);
    sv("entrenchThresh",   state.entrenchThreshold);
    st("entrenchThreshOut",state.entrenchThreshold);
    sc("adaptRulesEnabled",state.adaptRulesEnabled);
    sv("adaptTarget",      state.adaptTarget);
    st("adaptTargetOut",   state.adaptTarget);
    sv("adaptRate",        state.adaptRate);
    st("adaptRateOut",     state.adaptRate);

    // Zone lab — panel rebuilt dynamically via zonesPanelSync()
    zonesPanelSync();

    // Field lab — list rebuilt dynamically
    fieldsPanelSync();
    sc("densityFeedback",  state.densityFeedback);
    sv("densityTarget",    state.densityTarget);
    st("densityTargetOut", state.densityTarget);
    sv("densityStrength",  state.densityStrength);
    st("densityStrengthOut",state.densityStrength);
    sv("forceRadius",      state.forcePaintRadius);
    st("forceRadiusOut",   state.forcePaintRadius);
    sv("forceStrength",    state.forcePaintStrength);
    st("forceStrengthOut", state.forcePaintStrength);

    // Timeline speed
    const tierIdx = SPEED_TIERS.indexOf(state.stepsPerSecond);
    if (tierIdx >= 0) {
      sv("tlSpeed", tierIdx);
      st("tlSpeedLabel", SPEED_LABELS[tierIdx]);
    }
  }

  function serializeBoard() {
    return {
      cells: [...activeAlive()],
      generation: state.generation,
      types: state.cellTypesEnabled ? [...typeMap.entries()] : [],
    };
  }

  function applyBoard(board) {
    clearBoard();
    const s = activeAlive();
    for (const k of board.cells) s.add(k);
    state.generation = board.generation || 0;
    if (board.types && board.types.length > 0) {
      for (const [k, t] of board.types) typeMap.set(k, t);
    }
    snapshotNow();
    updateHud();
  }

  // ─── Zone helpers ──────────────────────────────────────────────────────────

  function _zoneHitHandle(sx, sy, z) {
    const HANDLE = 9;
    const tl = worldToScreen(z.x, z.y);
    const br = worldToScreen(z.x + z.w, z.y + z.h);
    const mx = (tl.x + br.x) / 2, my = (tl.y + br.y) / 2;
    const hits = [
      [tl.x, tl.y, 'resize-nw'], [mx, tl.y, 'resize-n'], [br.x, tl.y, 'resize-ne'],
      [tl.x, my,   'resize-w'],                            [br.x, my,   'resize-e'],
      [tl.x, br.y, 'resize-sw'], [mx, br.y, 'resize-s'],  [br.x, br.y, 'resize-se'],
    ];
    for (const [hx, hy, tag] of hits) {
      if (Math.abs(sx - hx) <= HANDLE && Math.abs(sy - hy) <= HANDLE) return tag;
    }
    return null;
  }

  function _zoneApplyDrag(gx, gy) {
    const o  = state._zoneDragOrigin;
    const z  = state.zones.find(z => z.id === state._zoneSelected);
    if (!z || !o) return;
    const dx = gx - o.mx, dy = gy - o.my;
    const dm = state._zoneDragMode;
    if (dm === 'move') {
      z.x = o.zx + dx; z.y = o.zy + dy;
    } else {
      let x1 = o.zx, y1 = o.zy, x2 = o.zx + o.zw - 1, y2 = o.zy + o.zh - 1;
      if (dm.includes('e'))  x2 = Math.max(x1 + 1, o.zx + o.zw - 1 + dx);
      if (dm.includes('w'))  x1 = Math.min(x2 - 1, o.zx + dx);
      if (dm.includes('s'))  y2 = Math.max(y1 + 1, o.zy + o.zh - 1 + dy);
      if (dm.includes('n'))  y1 = Math.min(y2 - 1, o.zy + dy);
      z.x = x1; z.y = y1; z.w = x2 - x1 + 1; z.h = y2 - y1 + 1;
    }
    zonesPanelSync();
  }

  function _manifoldHitHandle(sx, sy, region) {
    const HANDLE = 9;
    const { x, y, w, h } = region.rect;
    const tl = worldToScreen(x, y);
    const br = worldToScreen(x + w, y + h);
    const mx = (tl.x + br.x) / 2, my = (tl.y + br.y) / 2;
    const hits = [
      [tl.x, tl.y, 'resize-nw'], [mx, tl.y, 'resize-n'], [br.x, tl.y, 'resize-ne'],
      [tl.x, my,   'resize-w'],                            [br.x, my,   'resize-e'],
      [tl.x, br.y, 'resize-sw'], [mx, br.y, 'resize-s'],  [br.x, br.y, 'resize-se'],
    ];
    for (const [hx, hy, tag] of hits) {
      if (Math.abs(sx - hx) <= HANDLE && Math.abs(sy - hy) <= HANDLE) return tag;
    }
    return null;
  }

  function _manifoldApplyDrag(gx, gy) {
    const o  = state._manifoldDragOrigin;
    const r  = state.manifoldRegions.find(r => r.id === state._manifoldSelected);
    if (!r || !o) return;
    const dx = gx - o.mx, dy = gy - o.my;
    const dm = state._manifoldDragMode;
    if (dm === 'move') {
      r.rect.x = o.rx + dx;
      r.rect.y = o.ry + dy;
    } else {
      let x1 = o.rx, y1 = o.ry, x2 = o.rx + o.rw - 1, y2 = o.ry + o.rh - 1;
      if (dm.includes('e')) x2 = Math.max(x1 + 2, o.rx + o.rw - 1 + dx);
      if (dm.includes('w')) x1 = Math.min(x2 - 2, o.rx + dx);
      if (dm.includes('s')) y2 = Math.max(y1 + 2, o.ry + o.rh - 1 + dy);
      if (dm.includes('n')) y1 = Math.min(y2 - 2, o.ry + dy);
      r.rect.x = x1; r.rect.y = y1; r.rect.w = x2 - x1 + 1; r.rect.h = y2 - y1 + 1;
    }
    manifoldInspectorSync();
  }

  function zonesPanelSync() {
    const list = document.getElementById("zoneList");
    if (!list) return;
    list.innerHTML = "";
    for (const z of state.zones) {
      const isSelected = z.id === state._zoneSelected;
      const row = document.createElement("div");
      row.className = "zone-row" + (isSelected ? " zone-row-selected" : "") + (z.visible === false ? " zone-row-hidden" : "");
      row.dataset.zid = z.id;

      const dot = document.createElement("span");
      dot.className = "zone-dot"; dot.style.background = z.color;

      const nameEl = document.createElement("input");
      nameEl.className = "zone-name-input"; nameEl.value = z.name; nameEl.spellcheck = false;
      nameEl.addEventListener("change", () => { z.name = nameEl.value; });

      const ruleEl = document.createElement("input");
      ruleEl.className = "zone-rule-input"; ruleEl.value = ruleToString(z.ruleB, z.ruleS);
      ruleEl.spellcheck = false;
      ruleEl.addEventListener("change", () => {
        const r = parseRule(ruleEl.value);
        if (r) { z.ruleB = r.B; z.ruleS = r.S; ruleEl.style.color = ""; }
        else ruleEl.style.color = "var(--danger)";
      });

      // Combine toggle
      const combBtn = document.createElement("button");
      combBtn.className = "zone-del-btn zone-comb-btn" + (z.combine ? " zone-comb-on" : "");
      combBtn.title = z.combine ? "Rules union with overlaps — click for exclusive" : "Exclusive (last wins) — click to combine";
      combBtn.textContent = "⊕";
      combBtn.addEventListener("click", () => { z.combine = !z.combine; zonesPanelSync(); });

      const eyeBtn = document.createElement("button");
      eyeBtn.className = "zone-del-btn zone-eye-btn";
      eyeBtn.title = z.visible === false ? "Show zone" : "Hide zone";
      eyeBtn.textContent = z.visible === false ? "🙈" : "👁";
      eyeBtn.addEventListener("click", () => { z.visible = !z.visible; zonesPanelSync(); });

      const delBtn = document.createElement("button");
      delBtn.className = "zone-del-btn"; delBtn.textContent = "✕";
      delBtn.addEventListener("click", () => {
        state.zones = state.zones.filter(zz => zz.id !== z.id);
        if (state._zoneSelected === z.id) state._zoneSelected = null;
        zonesPanelSync();
      });

      row.appendChild(dot); row.appendChild(nameEl); row.appendChild(ruleEl); row.appendChild(combBtn); row.appendChild(eyeBtn); row.appendChild(delBtn);
      row.addEventListener("click", (e) => {
        if (e.target === delBtn || e.target === eyeBtn || e.target === combBtn || e.target === nameEl || e.target === ruleEl) return;
        state._zoneSelected = z.id;
        setCanvasMode("zone");
        zonesPanelSync();
      });
      list.appendChild(row);
    }
    if (state.zones.length === 0) {
      list.innerHTML = '<div style="color:#556;font-size:11px;padding:4px 0">No zones yet — draw on canvas</div>';
    }
  }

  function setupZoneLab() {
    const drawBtn = document.getElementById("zoneDrawBtn");
    const clearBtn = document.getElementById("zoneClearBtn");
    const delSelBtn = document.getElementById("zoneDelSelBtn");
    if (!drawBtn) return;

    drawBtn.addEventListener("click", () => {
      const next = state.canvasMode === "zone" ? "paint" : "zone";
      setCanvasMode(next);
      drawBtn.classList.toggle("rl-type-active", next === "zone");
      drawBtn.textContent = next === "zone" ? "Drawing… (Esc to stop)" : "Draw Zone";
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && state.canvasMode === "zone") {
        setCanvasMode("paint");
        if (drawBtn) { drawBtn.classList.remove("rl-type-active"); drawBtn.textContent = "Draw Zone"; }
        state._zoneDrawing = null; state._zoneDragMode = null;
      }
    });
    clearBtn?.addEventListener("click", () => {
      state.zones = []; state._zoneSelected = null;
      state._zoneDrawing = null; state._zoneDragMode = null;
      if (state.canvasMode === "zone") setCanvasMode("paint");
      zonesPanelSync();
    });
    delSelBtn?.addEventListener("click", () => {
      if (state._zoneSelected == null) return;
      state.zones = state.zones.filter(z => z.id !== state._zoneSelected);
      state._zoneSelected = null;
      zonesPanelSync();
    });

    zonesPanelSync();
  }

  // ─── Force-field helpers ──────────────────────────────────────────────────

  function _ffHitTest(sx, sy) {
    const EDGE = 10;
    for (let i = state.forceFields.length - 1; i >= 0; i--) {
      const ff = state.forceFields[i];
      if (ff.visible === false) continue;
      const { cx, cy } = _ffScreenCenter(ff);
      const r = ff.radius * state.zoom;
      const d = Math.hypot(sx - cx, sy - cy);
      if (d <= r + EDGE) return { field: ff, mode: d >= r - EDGE ? "resize" : "move" };
    }
    return null;
  }

  // Hit-test across ALL object types (fields, zones, lenses).
  // sx/sy are CSS-pixel canvas coordinates.
  // Returns { type, id, mode } or null.
  function _anyObjectHitTest(sx, sy) {
    // Force fields
    const ffHit = _ffHitTest(sx, sy);
    if (ffHit) return { type: "field", id: ffHit.field.id, mode: ffHit.mode };

    // Zones — check selected zone handles first, then all zone bodies
    const gxy = screenToGrid(sx, sy);
    const gx = Math.floor(gxy.x), gy = Math.floor(gxy.y);
    const selZ = state.zones.find(z => z.id === state._zoneSelected);
    if (selZ && selZ.visible !== false) {
      const handle = _zoneHitHandle(sx, sy, selZ);
      if (handle) return { type: "zone", id: selZ.id, mode: handle };
      if (gx >= selZ.x && gx < selZ.x + selZ.w && gy >= selZ.y && gy < selZ.y + selZ.h)
        return { type: "zone", id: selZ.id, mode: "move" };
    }
    for (let i = state.zones.length - 1; i >= 0; i--) {
      const z = state.zones[i];
      if (z.visible === false || z.id === state._zoneSelected) continue;
      if (gx >= z.x && gx < z.x + z.w && gy >= z.y && gy < z.y + z.h)
        return { type: "zone", id: z.id, mode: "move" };
    }

    // Lenses
    for (const l of [...state.lenses].reverse()) {
      if (l.visible === false) continue;
      const hx = l.cx + l.radius * 0.707, hy = l.cy + l.radius * 0.707;
      if (Math.hypot(sx - hx, sy - hy) < 10) return { type: "lens", id: l.id, mode: "resize" };
      if (Math.hypot(sx - l.cx, sy - l.cy) <= l.radius) return { type: "lens", id: l.id, mode: "move" };
    }

    // Manifold regions — check selected handles first, then bodies
    const selMR = state.manifoldRegions.find(r => r.id === state._manifoldSelected);
    if (selMR && selMR.visible !== false) {
      const mHandle = _manifoldHitHandle(sx, sy, selMR);
      if (mHandle) return { type: "manifold", id: selMR.id, mode: mHandle };
      const { x: mrx, y: mry, w: mrw, h: mrh } = selMR.rect;
      if (gx >= mrx && gx < mrx + mrw && gy >= mry && gy < mry + mrh)
        return { type: "manifold", id: selMR.id, mode: "move" };
    }
    for (let i = state.manifoldRegions.length - 1; i >= 0; i--) {
      const mr = state.manifoldRegions[i];
      if (mr.visible === false || mr.id === state._manifoldSelected) continue;
      const { x: mrx, y: mry, w: mrw, h: mrh } = mr.rect;
      if (gx >= mrx && gx < mrx + mrw && gy >= mry && gy < mry + mrh)
        return { type: "manifold", id: mr.id, mode: "move" };
    }

    return null;
  }

  // Switch to an object's native mode and start a move/resize drag.
  // Called when user clicks an object type different from the current canvasMode.
  function _applyCrossTypeHit(hit, sx, sy) {
    if (hit.type === "field") {
      setCanvasMode("force");
      state._ffSelected = hit.id;
      const ff = state.forceFields.find(f => f.id === hit.id);
      if (ff) {
        const { cx, cy } = _ffScreenCenter(ff);
        state._ffDragMode   = hit.mode;
        state._ffDragOrigin = { sx, sy, fx: ff.x, fy: ff.y, fr: ff.radius, cx, cy };
      }
      state.pointer.mode = null;
      fieldsPanelSync();
    } else if (hit.type === "zone") {
      setCanvasMode("zone");
      state._zoneSelected = hit.id;
      const zz = state.zones.find(z => z.id === hit.id);
      if (zz) {
        const gxy = screenToGrid(sx, sy);
        state._zoneDragMode   = hit.mode;
        state._zoneDragOrigin = { mx: Math.floor(gxy.x), my: Math.floor(gxy.y), zx: zz.x, zy: zz.y, zw: zz.w, zh: zz.h };
      }
      zonesPanelSync();
    } else if (hit.type === "lens") {
      setCanvasMode("lens");
      state._lensSelected = hit.id;
      state.pointer.mode = "lens";
      const ll = state.lenses.find(l => l.id === hit.id);
      if (ll) {
        _lensDragOp = hit.mode === "resize"
          ? { type: "resize", id: ll.id, startX: sx, startY: sy, origR: ll.radius, origCx: ll.cx, origCy: ll.cy }
          : { type: "move",   id: ll.id, startX: sx, startY: sy, origCx: ll.cx, origCy: ll.cy };
      }
      lensesPanelSync();
    } else if (hit.type === "manifold") {
      setCanvasMode("manifold");
      state._manifoldSelected = hit.id;
      const mr = state.manifoldRegions.find(r => r.id === hit.id);
      if (mr) {
        const gxy = screenToGrid(sx, sy);
        state._manifoldDragMode   = hit.mode;
        state._manifoldDragOrigin = { mx: Math.floor(gxy.x), my: Math.floor(gxy.y), rx: mr.rect.x, ry: mr.rect.y, rw: mr.rect.w, rh: mr.rect.h };
      }
      manifoldInspectorSync();
    }
  }

  function _ffApplyDrag(sx, sy) {
    const o  = state._ffDragOrigin;
    const ff = state.forceFields.find(f => f.id === state._ffSelected);
    if (!ff || !o) return;
    if (state._ffDragMode === "move") {
      const wPrev = screenToWorld(o.sx, o.sy);
      const wNow  = screenToWorld(sx, sy);
      ff.x = o.fx + (wNow.x - wPrev.x);
      ff.y = o.fy + (wNow.y - wPrev.y);
    } else if (state._ffDragMode === "resize") {
      const newR = Math.hypot(sx - o.cx, sy - o.cy) / state.zoom;
      ff.radius = Math.max(2, Math.round(newR));
    }
    fieldsPanelSync();
  }

  function fieldsPanelSync() {
    const list = document.getElementById("ffList");
    if (!list) return;
    list.innerHTML = "";

    for (const ff of state.forceFields) {
      const isSel    = ff.id === state._ffSelected;
      const isOpen   = _ffExpanded.has(ff.id);
      const isHidden = ff.visible === false;
      const isAttract= ff.type === "attract";
      const accent   = isAttract ? "#5be0bc" : "#ff6b6b";
      const isCombine= ff.combine !== false;

      // ── Card ───────────────────────────────────────────────────────────────
      const card = document.createElement("div");
      card.className = "ff-card" + (isSel ? " ff-card-selected" : "") + (isHidden ? " ff-card-hidden" : "");
      card.style.setProperty("--ff-accent", accent);

      // ── Header ─────────────────────────────────────────────────────────────
      const hdr = document.createElement("div"); hdr.className = "ff-header";

      const dot = document.createElement("span");
      dot.className = "zone-dot ff-dot"; dot.style.background = accent;

      const nameEl = document.createElement("input");
      nameEl.className = "zone-name-input ff-name";
      nameEl.value = ff.name || (isAttract ? "Attract" : "Repel");
      nameEl.spellcheck = false;
      nameEl.addEventListener("change", () => { ff.name = nameEl.value; });

      const chip = document.createElement("span");
      chip.className = "ff-chip ff-chip-" + ff.type;
      chip.textContent = isAttract ? "A" : "R";

      const stats = document.createElement("span");
      stats.className = "ff-stats";
      stats.textContent = `r${ff.radius} s${ff.strength}`;

      // Combine toggle in header (⊕ = combines, dimmed ⊕ = exclusive)
      const combBtn = document.createElement("button");
      combBtn.className = "zone-del-btn zone-comb-btn" + (isCombine ? " zone-comb-on" : "");
      combBtn.title = isCombine ? "Combining with overlapping fields — click for exclusive" : "Exclusive (blocks others) — click to combine";
      combBtn.textContent = "⊕";
      combBtn.addEventListener("click", (e) => { e.stopPropagation(); ff.combine = !isCombine; fieldsPanelSync(); });

      const eyeBtn = document.createElement("button");
      eyeBtn.className = "zone-del-btn";
      eyeBtn.title = isHidden ? "Show" : "Hide";
      eyeBtn.textContent = isHidden ? "🙈" : "👁";
      eyeBtn.addEventListener("click", (e) => { e.stopPropagation(); ff.visible = !ff.visible; fieldsPanelSync(); });

      const chevron = document.createElement("button");
      chevron.className = "ff-chevron" + (isOpen ? " ff-chevron-open" : "");
      chevron.textContent = "›"; chevron.title = isOpen ? "Collapse" : "Expand";
      chevron.addEventListener("click", (e) => {
        e.stopPropagation();
        if (_ffExpanded.has(ff.id)) _ffExpanded.delete(ff.id); else _ffExpanded.add(ff.id);
        fieldsPanelSync();
      });

      const delBtn = document.createElement("button");
      delBtn.className = "zone-del-btn"; delBtn.title = "Delete"; delBtn.textContent = "✕";
      delBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        state.forceFields = state.forceFields.filter(f => f.id !== ff.id);
        _ffExpanded.delete(ff.id);
        if (state._ffSelected === ff.id) state._ffSelected = null;
        fieldsPanelSync();
      });

      hdr.appendChild(dot); hdr.appendChild(nameEl); hdr.appendChild(chip);
      hdr.appendChild(stats); hdr.appendChild(combBtn); hdr.appendChild(eyeBtn);
      hdr.appendChild(chevron); hdr.appendChild(delBtn);
      hdr.addEventListener("click", (e) => {
        if ([nameEl, combBtn, eyeBtn, delBtn].includes(e.target)) return;
        if (_ffExpanded.has(ff.id)) _ffExpanded.delete(ff.id); else _ffExpanded.add(ff.id);
        state._ffSelected = ff.id; setCanvasMode("force"); fieldsPanelSync();
      });
      card.appendChild(hdr);

      // ── Expanded detail ────────────────────────────────────────────────────
      if (isOpen) {
        const detail = document.createElement("div"); detail.className = "ff-detail";

        const mkDRow = (label, content) => {
          const r = document.createElement("div"); r.className = "ff-detail-row";
          const lbl = document.createElement("span"); lbl.className = "ff-detail-label"; lbl.textContent = label;
          r.appendChild(lbl); r.appendChild(content); return r;
        };
        const mkSlider = (min, max, step, val, onChange) => {
          const wrap = document.createElement("div"); wrap.className = "ff-slider-wrap";
          const sl = document.createElement("input"); sl.type = "range"; sl.className = "ff-slider";
          sl.min = min; sl.max = max; sl.step = step; sl.value = val;
          const out = document.createElement("span"); out.className = "ff-slider-out"; out.textContent = val;
          sl.addEventListener("input", () => {
            out.textContent = sl.value; onChange(Number(sl.value));
            stats.textContent = `r${ff.radius} s${ff.strength}`;
          });
          wrap.appendChild(sl); wrap.appendChild(out); return wrap;
        };

        // Type
        const typeSel = document.createElement("select"); typeSel.className = "ff-select";
        [["attract","Attract"],["repel","Repel"]].forEach(([v, t]) => {
          const o = document.createElement("option"); o.value = v; o.textContent = t;
          if (ff.type === v) o.selected = true; typeSel.appendChild(o);
        });
        typeSel.addEventListener("change", () => {
          ff.type = typeSel.value;
          const a2 = ff.type === "attract";
          const ac = a2 ? "#5be0bc" : "#ff6b6b";
          dot.style.background = ac; chip.textContent = a2 ? "A" : "R";
          chip.className = "ff-chip ff-chip-" + ff.type;
          card.style.setProperty("--ff-accent", ac);
        });

        // Falloff
        const fallSel = document.createElement("select"); fallSel.className = "ff-select";
        [["linear","Linear"],["bell","Bell (Gaussian)"],["step","Step (Flat)"]].forEach(([v, t]) => {
          const o = document.createElement("option"); o.value = v; o.textContent = t;
          if ((ff.falloff || "linear") === v) o.selected = true; fallSel.appendChild(o);
        });
        fallSel.addEventListener("change", () => { ff.falloff = fallSel.value; });

        // Density — live read-only metric, tagged for rAF updates
        const densWrap  = document.createElement("div"); densWrap.className = "ff-density-wrap";
        const densBar   = document.createElement("div"); densBar.className = "ff-density-bar";
        const denseFill = document.createElement("div");
        denseFill.className = "ff-density-fill"; denseFill.dataset.ffid = ff.id;
        denseFill.style.background = accent;
        const densLabel = document.createElement("span");
        densLabel.className = "ff-density-label"; densLabel.dataset.ffid = ff.id;
        densBar.appendChild(denseFill); densWrap.appendChild(densBar); densWrap.appendChild(densLabel);
        // seed initial value
        const d0 = _fieldDensity(ff);
        denseFill.style.width = (d0 * 100).toFixed(1) + "%";
        densLabel.textContent  = (d0 * 100).toFixed(1) + "%";

        // Density metric row — styled as read-only, not a control
        const densMetaRow = document.createElement("div"); densMetaRow.className = "ff-density-row";
        const densMetaLbl = document.createElement("span"); densMetaLbl.className = "ff-detail-label";
        densMetaLbl.textContent = "Density";
        const densNote = document.createElement("span"); densNote.className = "ff-density-note";
        densNote.textContent = "live";
        densMetaRow.appendChild(densMetaLbl); densMetaRow.appendChild(densWrap); densMetaRow.appendChild(densNote);

        detail.appendChild(mkDRow("Type",     typeSel));
        detail.appendChild(mkDRow("Radius",   mkSlider(3, 80, 1, ff.radius,   v => { ff.radius   = v; })));
        detail.appendChild(mkDRow("Strength", mkSlider(1, 10, 1, ff.strength, v => { ff.strength = v; })));
        detail.appendChild(mkDRow("Falloff",  fallSel));
        detail.appendChild(densMetaRow);

        card.appendChild(detail);
      }

      list.appendChild(card);
    }

    if (state.forceFields.length === 0) {
      list.innerHTML = '<div style="color:#556;font-size:11px;padding:4px 0">No fields yet — draw on canvas</div>';
    }
  }

  let _ffDensityTick = 0;
  function _updateFieldDensityBars() {
    if (++_ffDensityTick % 30 !== 0) return;  // update every 30 ticks (~1s at 30fps)
    const list = document.getElementById("ffList");
    if (!list) return;
    for (const ff of state.forceFields) {
      if (!_ffExpanded.has(ff.id)) continue;
      const fill = list.querySelector(`.ff-density-fill[data-ffid="${ff.id}"]`);
      const lbl  = list.querySelector(`.ff-density-label[data-ffid="${ff.id}"]`);
      if (!fill && !lbl) continue;
      const d = _fieldDensity(ff);
      const pct = (d * 100).toFixed(1) + "%";
      if (fill) fill.style.width = pct;
      if (lbl)  lbl.textContent  = pct;
    }
  }

  function setupFieldLab() {
    const toggleBtn  = document.getElementById("forcePaintToggle");
    const attractBtn = document.getElementById("forceAttractBtn");
    const repelBtn   = document.getElementById("forceRepelBtn");
    const radiusEl   = document.getElementById("forceRadius");
    const radiusOut  = document.getElementById("forceRadiusOut");
    const strengthEl = document.getElementById("forceStrength");
    const strengthOut= document.getElementById("forceStrengthOut");
    const clearBtn   = document.getElementById("forceClearBtn");
    const densityEl  = document.getElementById("densityFeedback");
    const dTargetEl  = document.getElementById("densityTarget");
    const dTargetOut = document.getElementById("densityTargetOut");
    const dStrengthEl= document.getElementById("densityStrength");
    const dStrengthOut=document.getElementById("densityStrengthOut");
    if (!toggleBtn) return;

    toggleBtn.addEventListener("click", () => {
      const next = state.canvasMode === "force" ? "paint" : "force";
      setCanvasMode(next);
      toggleBtn.classList.toggle("rl-type-active", next === "force");
      toggleBtn.textContent = next === "force" ? "Drawing… (Esc)" : "Draw Field  ⊛";
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && state.canvasMode === "force") {
        setCanvasMode("paint");
        if (toggleBtn) { toggleBtn.classList.remove("rl-type-active"); toggleBtn.textContent = "Draw Field  ⊛"; }
        state._ffDrawing = null; state._ffDragMode = null;
      }
    });
    attractBtn.addEventListener("click", () => {
      state.forcePaintType = "attract";
      attractBtn.classList.add("rl-type-active");
      repelBtn.classList.remove("rl-type-active");
    });
    repelBtn.addEventListener("click", () => {
      state.forcePaintType = "repel";
      repelBtn.classList.add("rl-type-active");
      attractBtn.classList.remove("rl-type-active");
    });
    radiusEl.addEventListener("input", () => {
      state.forcePaintRadius = Number(radiusEl.value);
      radiusOut.textContent = radiusEl.value;
    });
    strengthEl.addEventListener("input", () => {
      state.forcePaintStrength = Number(strengthEl.value);
      strengthOut.textContent = strengthEl.value;
    });
    const falloffEl = document.getElementById("forceFalloff");
    falloffEl?.addEventListener("change", () => { state.forcePaintFalloff = falloffEl.value; });

    clearBtn?.addEventListener("click", () => {
      state.forceFields = []; state._ffSelected = null; _ffExpanded.clear();
      fieldsPanelSync();
    });
    densityEl.addEventListener("change", (e) => { state.densityFeedback = e.target.checked; });
    dTargetEl.addEventListener("input", () => {
      state.densityTarget = Number(dTargetEl.value);
      dTargetOut.textContent = dTargetEl.value;
    });
    dStrengthEl.addEventListener("input", () => {
      state.densityStrength = Number(dStrengthEl.value);
      dStrengthOut.textContent = dStrengthEl.value;
    });

    fieldsPanelSync();
  }

  function setupLibrary() {
    const modal    = document.getElementById("libraryModal");
    const closeBtn = document.getElementById("libClose");
    const tabCfg   = document.getElementById("libTabCfg");
    const tabBoard = document.getElementById("libTabBoard");
    const tabRLE   = document.getElementById("libTabRLE");
    const nameInput= document.getElementById("libNameInput");
    const saveBtn  = document.getElementById("libSaveBtn");
    const listEl   = document.getElementById("libList");
    const libSaveRow = document.getElementById("libSaveRow");
    const rlePanel = document.getElementById("libRLEPanel");
    if (!modal) return;

    let activeTab = "config";

    function setTab(tab) {
      activeTab = tab;
      tabCfg.classList.toggle("lib-tab-active", tab === "config");
      tabBoard.classList.toggle("lib-tab-active", tab === "board");
      tabRLE.classList.toggle("lib-tab-active", tab === "rle");
      const isRLE = tab === "rle";
      if (libSaveRow) libSaveRow.style.display = isRLE ? "none" : "";
      listEl.style.display = isRLE ? "none" : "";
      rlePanel.style.display = isRLE ? "flex" : "none";
      if (isRLE) refreshRLEPanel();
      else renderList();
    }

    document.getElementById("libraryBtn").addEventListener("click", () => {
      modal.classList.add("lib-open");
      setTab(activeTab);
    });
    closeBtn.addEventListener("click", () => modal.classList.remove("lib-open"));
    modal.addEventListener("click", (e) => { if (e.target === modal) modal.classList.remove("lib-open"); });

    tabCfg.addEventListener("click", () => setTab("config"));
    tabBoard.addEventListener("click", () => setTab("board"));
    tabRLE.addEventListener("click", () => setTab("rle"));

    function refreshRLEPanel() {
      const ta = document.getElementById("rleExportArea");
      if (ta) ta.value = encodeRLE() || "(board is empty)";
    }

    const rleImportArea = document.getElementById("rleImportArea");
    const rleLoadBtn = document.getElementById("rleLoadBtn");
    const rleCopyBtn = document.getElementById("rleCopyBtn");
    const rleDownloadBtn = document.getElementById("rleDownloadBtn");

    if (rleCopyBtn) {
      rleCopyBtn.addEventListener("click", () => {
        const ta = document.getElementById("rleExportArea");
        if (!ta || !ta.value) return;
        navigator.clipboard.writeText(ta.value).catch(() => {});
        rleCopyBtn.textContent = "Copied!";
        setTimeout(() => { rleCopyBtn.textContent = "Copy"; }, 1400);
      });
    }

    if (rleDownloadBtn) {
      rleDownloadBtn.addEventListener("click", () => {
        const rle = encodeRLE();
        if (!rle) return;
        const blob = new Blob([rle], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = "pattern.rle"; a.click();
        URL.revokeObjectURL(url);
      });
    }

    if (rleLoadBtn && rleImportArea) {
      rleLoadBtn.addEventListener("click", () => {
        const cells = decodeRLE(rleImportArea.value);
        if (!cells || cells.length === 0) {
          rleLoadBtn.textContent = "Parse error";
          setTimeout(() => { rleLoadBtn.textContent = "Load RLE"; }, 1400);
          return;
        }
        clearBoard();
        const cx = Math.round(state.cameraX), cy = Math.round(state.cameraY);
        for (const [dx, dy] of cells) setCell(cx + dx, cy + dy, true);
        snapshotNow(); updateHud();
        modal.classList.remove("lib-open");
      });
    }

    nameInput.addEventListener("keydown", (e) => { if (e.key === "Enter") saveBtn.click(); });

    saveBtn.addEventListener("click", () => {
      const name = nameInput.value.trim();
      if (!name) { nameInput.focus(); return; }
      if (activeTab === "config") libSaveConfig(name);
      else libSaveBoard(name);
      renderList();
    });

    function renderList() {
      const key   = activeTab === "config" ? LS_CONFIGS : LS_BOARDS;
      const items = lsLoad(key);
      listEl.innerHTML = "";
      if (items.length === 0) {
        const p = document.createElement("p");
        p.className = "lib-empty";
        p.textContent = activeTab === "config" ? "No saved configs." : "No saved boards.";
        listEl.appendChild(p);
        return;
      }
      for (const item of [...items].reverse()) {
        const row = document.createElement("div");
        row.className = "lib-row";

        const nameEl = document.createElement("span");
        nameEl.className = "lib-name";
        nameEl.textContent = item.name;
        nameEl.title = item.name;

        const dateEl = document.createElement("span");
        dateEl.className = "lib-date";
        dateEl.textContent = new Date(item.savedAt).toLocaleDateString();

        const loadBtn = document.createElement("button");
        loadBtn.className = "lib-btn";
        loadBtn.textContent = "Load";
        loadBtn.addEventListener("click", () => {
          if (activeTab === "config") applyConfig(item.config);
          else applyBoard(item.board);
          nameInput.value = item.name;
          modal.classList.remove("lib-open");
        });

        const renBtn = document.createElement("button");
        renBtn.className = "lib-btn";
        renBtn.textContent = "Ren";
        renBtn.title = "Rename";
        renBtn.addEventListener("click", () => {
          const newName = prompt("Rename to:", item.name);
          if (!newName || !newName.trim()) return;
          const all = lsLoad(key);
          const idx = all.findIndex((x) => x.id === item.id);
          if (idx >= 0) { all[idx].name = newName.trim(); lsSave(key, all); }
          renderList();
        });

        const delBtn = document.createElement("button");
        delBtn.className = "lib-btn lib-btn-del";
        delBtn.textContent = "Del";
        delBtn.addEventListener("click", () => {
          const all = lsLoad(key);
          lsSave(key, all.filter((x) => x.id !== item.id));
          renderList();
        });

        row.appendChild(nameEl);
        row.appendChild(dateEl);
        row.appendChild(loadBtn);
        row.appendChild(renBtn);
        row.appendChild(delBtn);
        listEl.appendChild(row);
      }
    }

    function libSaveConfig(name) {
      const all = lsLoad(LS_CONFIGS);
      const idx = all.findIndex((c) => c.name === name);
      const entry = { id: idx >= 0 ? all[idx].id : Date.now(), name, savedAt: Date.now(), config: serializeConfig() };
      if (idx >= 0) all[idx] = entry; else all.push(entry);
      lsSave(LS_CONFIGS, all);
    }

    function libSaveBoard(name) {
      const all = lsLoad(LS_BOARDS);
      const idx = all.findIndex((b) => b.name === name);
      const entry = { id: idx >= 0 ? all[idx].id : Date.now(), name, savedAt: Date.now(), board: serializeBoard() };
      if (idx >= 0) all[idx] = entry; else all.push(entry);
      lsSave(LS_BOARDS, all);
    }
  }

  function setupEvoLab() {
    const heatmapModeEl = document.getElementById("heatmapMode");
    const heatmapOverlayEl = document.getElementById("heatmapOverlay");
    const clearHeatEl = document.getElementById("clearHeatBtn");
    const entrenchEl = document.getElementById("entrenchEnabled");
    const entrenchThreshEl = document.getElementById("entrenchThresh");
    const entrenchThreshOut = document.getElementById("entrenchThreshOut");
    const adaptEl = document.getElementById("adaptRulesEnabled");
    const adaptTargetEl = document.getElementById("adaptTarget");
    const adaptTargetOut = document.getElementById("adaptTargetOut");
    const adaptRateEl = document.getElementById("adaptRate");
    const adaptRateOut = document.getElementById("adaptRateOut");
    if (!heatmapModeEl) return;

    heatmapModeEl.addEventListener("change", (e) => {
      state.heatmapMode = e.target.checked;
      if (state.heatmapMode) state.heatmapOverlay = false;
      if (heatmapOverlayEl) heatmapOverlayEl.checked = false;
    });
    heatmapOverlayEl.addEventListener("change", (e) => {
      state.heatmapOverlay = e.target.checked;
      if (state.heatmapOverlay) state.heatmapMode = false;
      if (heatmapModeEl) heatmapModeEl.checked = false;
    });
    clearHeatEl.addEventListener("click", () => { heatMap.clear(); });

    entrenchEl.addEventListener("change", (e) => { state.entrenchEnabled = e.target.checked; });
    entrenchThreshEl.addEventListener("input", () => {
      state.entrenchThreshold = Number(entrenchThreshEl.value);
      entrenchThreshOut.textContent = entrenchThreshEl.value;
    });

    adaptEl.addEventListener("change", (e) => {
      state.adaptRulesEnabled = e.target.checked;
      state._adaptPrevPop = activeAlive().size;
    });
    adaptTargetEl.addEventListener("input", () => {
      state.adaptTarget = Number(adaptTargetEl.value);
      adaptTargetOut.textContent = adaptTargetEl.value;
    });
    adaptRateEl.addEventListener("input", () => {
      state.adaptRate = Number(adaptRateEl.value);
      adaptRateOut.textContent = adaptRateEl.value;
    });
  }

  // ── Lens Lab ─────────────────────────────────────────────────────────────
  function lensesPanelSync() {
    const list = document.getElementById("lensList");
    if (!list) return;
    list.innerHTML = "";
    for (const l of state.lenses) {
      const card = document.createElement("div");
      card.className = "lens-card" + (l.id === state._lensSelected ? " lens-card-selected" : "");

      const nameEl = document.createElement("input");
      nameEl.className = "lens-card-name";
      nameEl.value = l.name;
      nameEl.spellcheck = false;
      nameEl.addEventListener("change", () => { l.name = nameEl.value; });

      const zoomBadge = document.createElement("span");
      zoomBadge.className = "lens-zoom-badge";
      zoomBadge.textContent = `${l.zoom}×`;

      const eyeBtn = document.createElement("button");
      eyeBtn.className = "zone-del-btn";
      eyeBtn.title = l.visible === false ? "Show" : "Hide";
      eyeBtn.textContent = l.visible === false ? "🙈" : "👁";
      eyeBtn.addEventListener("click", () => { l.visible = !l.visible; lensesPanelSync(); });

      const delBtn = document.createElement("button");
      delBtn.className = "zone-del-btn";
      delBtn.title = "Delete";
      delBtn.textContent = "✕";
      delBtn.addEventListener("click", () => {
        state.lenses = state.lenses.filter(x => x.id !== l.id);
        if (state._lensSelected === l.id) state._lensSelected = null;
        lensesPanelSync();
      });

      card.addEventListener("click", (e) => {
        if ([nameEl, eyeBtn, delBtn].includes(e.target)) return;
        state._lensSelected = l.id;
        lensesPanelSync();
      });

      card.appendChild(nameEl);
      card.appendChild(zoomBadge);
      card.appendChild(eyeBtn);
      card.appendChild(delBtn);
      list.appendChild(card);
    }
    if (state.lenses.length === 0) {
      const msg = document.createElement("p");
      msg.style.cssText = "font-size:11px;color:var(--muted);margin:4px 0";
      msg.textContent = "Draw a lens on the canvas, or click Lens mode and drag.";
      list.appendChild(msg);
    }
  }

  function setupLensLab() {
    const toggleBtn = document.getElementById("lensDrawToggle");
    const zoomEl = document.getElementById("lensZoomDefault");
    const zoomOut = document.getElementById("lensZoomDefaultOut");
    if (!toggleBtn) return;

    toggleBtn.addEventListener("click", () => {
      setCanvasMode(state.canvasMode === "lens" ? "paint" : "lens");
    });
    if (zoomEl) {
      zoomEl.addEventListener("input", () => {
        _lensZoomDefault = Number(zoomEl.value);
        if (zoomOut) zoomOut.textContent = `${_lensZoomDefault}×`;
      });
    }
    lensesPanelSync();
  }

  // ── Sidebar (VSCode-style) ───────────────────────────────────────────────
  function _setSidebarCollapsed(collapse) {
    _sidebarCollapsed = collapse;
    const workspace = document.getElementById("workspaceGrid");
    const sidebarContent = document.getElementById("sidebarContent");
    if (sidebarContent) sidebarContent.classList.toggle("sc-hidden", collapse);
    if (workspace) {
      workspace.classList.toggle("sidebar-collapsed", collapse);
      if (!collapse) workspace.style.setProperty("--right-w", _rightW + "px");
    }
    resizeCanvas();
  }

  function initPaneResizers() {
    const workspace = document.getElementById("workspaceGrid");
    const sidebarContent = document.getElementById("sidebarContent");
    const sidebarResizer = document.getElementById("sidebarResizer");

    // Activity bar tab switching
    document.querySelectorAll(".abar-btn[data-stab]").forEach(btn => {
      btn.addEventListener("click", () => {
        const tab = btn.dataset.stab;
        const alreadyActive = btn.classList.contains("abar-active");
        if (alreadyActive && !_sidebarCollapsed) {
          _setSidebarCollapsed(true);
          return;
        }
        document.querySelectorAll(".abar-btn").forEach(b => b.classList.toggle("abar-active", b === btn));
        document.querySelectorAll(".stab-panel").forEach(p => { p.style.display = "none"; });
        const panel = document.getElementById("stab" + tab.charAt(0).toUpperCase() + tab.slice(1));
        if (panel) panel.style.display = "";
        if (_sidebarCollapsed) _setSidebarCollapsed(false);
      });
    });

    // Sidebar drag resize
    if (sidebarResizer && workspace) {
      let dragging = false;
      sidebarResizer.addEventListener("pointerdown", (e) => {
        dragging = true;
        sidebarResizer.setPointerCapture(e.pointerId);
        sidebarResizer.classList.add("dragging");
        e.preventDefault();
      });
      document.addEventListener("pointermove", (e) => {
        if (!dragging) return;
        const rect = workspace.getBoundingClientRect();
        const newW = Math.max(200, Math.min(640, rect.right - e.clientX));
        _rightW = newW;
        workspace.style.setProperty("--right-w", newW + "px");
        resizeCanvas();
      });
      document.addEventListener("pointerup", () => {
        if (dragging) { dragging = false; sidebarResizer.classList.remove("dragging"); }
      });
    }

    // Bottom panel drag resize
    const bottomResizer = document.getElementById("bottomResizer");
    const scriptPanel = document.getElementById("scriptPanel");
    if (bottomResizer && scriptPanel) {
      let dragging = false;
      let startY = 0, startH = 0;
      bottomResizer.addEventListener("pointerdown", (e) => {
        if (scriptPanel.classList.contains("bp-collapsed")) return;
        dragging = true;
        startY = e.clientY;
        startH = scriptPanel.getBoundingClientRect().height;
        bottomResizer.setPointerCapture(e.pointerId);
        bottomResizer.classList.add("dragging");
        e.preventDefault();
      });
      document.addEventListener("pointermove", (e) => {
        if (!dragging) return;
        const newH = Math.max(80, Math.min(600, startH - (e.clientY - startY)));
        scriptPanel.style.setProperty("--bottom-h", newH + "px");
        scriptPanel.style.height = `${newH}px`;
        document.documentElement.style.setProperty("--tl-bottom", Math.max(0, newH - 1) + "px");
      });
      document.addEventListener("pointerup", () => {
        if (dragging) { dragging = false; bottomResizer.classList.remove("dragging"); }
      });
    }

    // Script Kernel toggle
    document.getElementById("scriptHandle")?.addEventListener("click", (e) => {
      if (e.target.closest(".sc-btn") || e.target.closest("select")) return;
      _toggleScriptPanel();
    });
    document.getElementById("scriptDrawerToggle")?.addEventListener("click", (e) => {
      e.stopPropagation();
      _toggleScriptPanel();
    });
  }

  // ── Script Kernel ────────────────────────────────────────────────────────
  function _updateHooksBadge() {
    const badge = document.getElementById("hooksActiveBadge");
    const btn   = document.getElementById("scriptClearHooks");
    const n = _hookRegistry.length;
    if (badge) {
      badge.style.display = n > 0 ? "" : "none";
      badge.textContent   = _hooksPaused ? `${n} paused` : `${n} hook${n !== 1 ? "s" : ""}`;
      badge.style.opacity = _hooksPaused ? "0.5" : "1";
    }
    if (btn) btn.textContent = _hooksPaused ? "▶ Hooks" : "⊘ Hooks";
  }

  function _saveScript() {
    try {
      const data = _scriptCells.map(c => ({ code: _cellCode(c) }));
      localStorage.setItem(LS_SCRIPT, JSON.stringify(data));
    } catch (_) {}
  }

  function _loadScript() {
    try {
      const raw = localStorage.getItem(LS_SCRIPT);
      if (!raw) return;
      const data = JSON.parse(raw);
      for (const { code } of data) _addCell(code);
    } catch (_) {}
  }

  function _cellCode(cell) {
    return cell.editor ? cell.editor.getValue() : (cell.ta ? cell.ta.value : (cell.code || ""));
  }

  function _addCellAt(insertIdx, code = "", focusEditor = true) {
    const id = ++_scriptIdSeq;
    const cell = { id, code, _hookCleanups: [], _status: "idle" };
    _scriptCells.splice(insertIdx, 0, cell);

    const container = document.getElementById("scriptCells");
    if (!container) return cell;

    const wrap = document.createElement("div");
    wrap.className = "sc-cell";
    wrap.dataset.cellId = id;
    wrap.tabIndex = -1; // focusable so command mode keeps focus inside the panel

    // ── cell bar ─────────────────────────────────────────────────────
    const bar = document.createElement("div");
    bar.className = "sc-cell-bar";

    const dot = document.createElement("span");
    dot.className = "sc-dot sc-dot-idle";
    dot.title = "idle";
    cell._dot = dot;

    const label = document.createElement("span");
    label.className = "sc-cell-label";
    label.textContent = `[${id}]`;

    const hooksChip = document.createElement("span");
    hooksChip.className = "sc-hooks-chip";
    hooksChip.style.display = "none";
    cell._hooksChip = hooksChip;

    const spacer = document.createElement("span");
    spacer.style.flex = "1";

    const runBtn = document.createElement("button");
    runBtn.className = "sc-btn sc-run-btn";
    runBtn.textContent = "▶ Run";
    runBtn.title = "Shift+Enter";
    runBtn.addEventListener("click", () => _runCell(id));

    const delBtn = document.createElement("button");
    delBtn.className = "sc-btn sc-btn-danger";
    delBtn.textContent = "✕";
    delBtn.title = "Delete cell";
    delBtn.addEventListener("click", () => _deleteCell(id));

    bar.appendChild(dot);
    bar.appendChild(label);
    bar.appendChild(hooksChip);
    bar.appendChild(spacer);
    bar.appendChild(runBtn);
    bar.appendChild(delBtn);

    // ── editor ───────────────────────────────────────────────────────
    const editorWrap = document.createElement("div");
    editorWrap.className = "sc-editor-wrap";

    if (typeof CodeMirror !== "undefined") {
      const editor = CodeMirror(editorWrap, {
        value: code,
        mode: "javascript",
        theme: "dracula",
        lineNumbers: true,
        matchBrackets: true,
        lineWrapping: false,
        indentUnit: 2,
        tabSize: 2,
        viewportMargin: Infinity,
        extraKeys: {
          "Shift-Enter": () => _runCell(id),
          "Tab":         cm => cm.execCommand("indentMore"),
          "Shift-Tab":   cm => cm.execCommand("indentLess"),
          "Ctrl-Enter":  () => _runCell(id),
        },
      });
      cell.editor = editor;
      editor.on("change", () => { cell.code = editor.getValue(); _saveScript(); });
      // Escape → command mode (use native keydown — CM5 names the key "Esc" not "Escape"
      // so extraKeys is unreliable; native ev.key is always "Escape")
      editor.on("keydown", (_cm, ev) => {
        if (ev.key === "Escape") { ev.preventDefault(); _enterCmdMode(id); }
      });
      editor.on("focus", () => { wrap.classList.add("sc-cell-focused"); _exitCmdMode(); });
      editor.on("blur",  () => wrap.classList.remove("sc-cell-focused"));
      setTimeout(() => editor.refresh(), 200);
    } else {
      const ta = document.createElement("textarea");
      ta.value = code;
      ta.spellcheck = false;
      ta.autocomplete = "off";
      ta.placeholder = "// Shift+Enter to run";
      ta.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && e.shiftKey) { e.preventDefault(); _runCell(id); }
      });
      ta.addEventListener("input", () => { cell.code = ta.value; _saveScript(); });
      cell.ta = ta;
      editorWrap.appendChild(ta);
    }

    // ── output ───────────────────────────────────────────────────────
    const output = document.createElement("div");
    output.className = "sc-output";
    output.style.display = "none";
    cell._output = output;

    wrap.addEventListener("mousedown", (e) => {
      if (!e.target.closest(".sc-editor-wrap") && !e.target.closest(".sc-btn") && !e.target.closest("select")) {
        e.preventDefault();
        _enterCmdMode(id);
      }
    });

    wrap.appendChild(bar);
    wrap.appendChild(editorWrap);
    wrap.appendChild(output);
    container.insertBefore(wrap, container.children[insertIdx] ?? null);
    cell._elem = wrap;

    if (focusEditor) {
      if (cell.editor) cell.editor.focus();
      else cell.ta?.focus();
    }
    return cell;
  }

  function _addCell(code = "") {
    return _addCellAt(_scriptCells.length, code, true);
  }

  function _setCellStatus(cell, status) {
    cell._status = status;
    if (!cell._dot) return;
    cell._dot.className = `sc-dot sc-dot-${status}`;
    cell._dot.title = status;
  }

  function _updateCellHooksChip(cell) {
    if (!cell._hooksChip) return;
    const count = _hookRegistry.filter(h => h.cellId === cell.id).length;
    if (count > 0) {
      cell._hooksChip.textContent = `${count} hook${count > 1 ? "s" : ""}`;
      cell._hooksChip.style.display = "";
    } else {
      cell._hooksChip.style.display = "none";
    }
  }

  const _HOOK_LABELS = { afterStep: "after-step", beforeDraw: "pre-draw", afterDraw: "after-draw" };

  function _hookActiveFn(entry) { return entry._wrapper || entry.fn; }

  function _setHookProfiling(entry, enable) {
    if (entry.profiling === enable) return;
    const hooks = _kernel.hooks[entry.hookName];
    const active = entry.enabled && !_hooksPaused;
    if (enable) {
      if (active) hooks?.delete(entry.fn);
      const p = entry.profile;
      entry._wrapper = () => {
        const t0 = performance.now();
        try { entry.fn(); } catch (_) {}
        const ms = performance.now() - t0;
        p.lastMs = ms;
        p.calls++;
        p.totalMs += ms;
        p.avgMs = p.avgMs * 0.85 + ms * 0.15;
        if (ms < p.minMs) p.minMs = ms;
        if (ms > p.maxMs) p.maxMs = ms;
        if (entry._statEl) {
          const avg = p.avgMs < 0.1 ? p.avgMs.toFixed(3) : p.avgMs.toFixed(2);
          const peak = p.maxMs < 0.1 ? p.maxMs.toFixed(3) : p.maxMs.toFixed(2);
          entry._statEl.textContent = `${avg}ms avg  ${peak}ms pk  ×${p.calls}`;
        }
      };
      entry.profiling = true;
      if (active) hooks?.add(entry._wrapper);
    } else {
      if (active && entry._wrapper) { hooks?.delete(entry._wrapper); hooks?.add(entry.fn); }
      entry._wrapper = null;
      entry.profiling = false;
      if (entry._statEl) entry._statEl.textContent = "";
    }
  }

  function _renderHooksList() {
    const panel = document.getElementById("hooksListPanel");
    const list  = document.getElementById("hooksList");
    if (!panel || !list) return;
    if (_hookRegistry.length === 0) { panel.style.display = "none"; return; }
    panel.style.display = "";
    list.innerHTML = "";

    for (const entry of _hookRegistry) {
      const active = entry.enabled && !_hooksPaused;
      const row = document.createElement("div");
      row.className = "sc-hook-row" + (active ? "" : " sc-hook-row-dim");

      const dot = document.createElement("span");
      dot.className = `sc-dot ${active ? (entry.profiling ? "sc-dot-running" : "sc-dot-hooked") : "sc-dot-idle"}`;

      const nameEl = document.createElement("span");
      nameEl.className = "sc-hook-name";
      nameEl.textContent = _HOOK_LABELS[entry.hookName] || entry.hookName;

      const cellRef = document.createElement("span");
      cellRef.className = "sc-hook-cell-ref";
      cellRef.textContent = `[${entry.cellId}]`;

      // stat display — written directly by the profiling wrapper each frame
      const statEl = document.createElement("span");
      statEl.className = "sc-hook-stat";
      entry._statEl = statEl;
      if (entry.profiling && entry.profile.calls > 0) {
        const p = entry.profile;
        const avg  = p.avgMs  < 0.1 ? p.avgMs.toFixed(3)  : p.avgMs.toFixed(2);
        const peak = p.maxMs  < 0.1 ? p.maxMs.toFixed(3)  : p.maxMs.toFixed(2);
        statEl.textContent = `${avg}ms avg  ${peak}ms pk  ×${p.calls}`;
      }

      const spacer = document.createElement("span");
      spacer.style.flex = "1";

      // profile toggle
      const profBtn = document.createElement("button");
      profBtn.className = "sc-btn" + (entry.profiling ? " sc-prof-active" : "");
      profBtn.title = entry.profiling ? "Stop profiling" : "Profile execution time";
      profBtn.textContent = "⏱";
      profBtn.addEventListener("click", () => {
        _setHookProfiling(entry, !entry.profiling);
        _renderHooksList();
      });

      // enable/disable toggle
      const toggleBtn = document.createElement("button");
      toggleBtn.className = "sc-btn";
      toggleBtn.title = entry.enabled ? "Disable" : "Enable";
      toggleBtn.textContent = entry.enabled ? "⏸" : "▶";
      toggleBtn.addEventListener("click", () => {
        entry.enabled = !entry.enabled;
        const afn = _hookActiveFn(entry);
        if (entry.enabled && !_hooksPaused) _kernel.hooks[entry.hookName]?.add(afn);
        else _kernel.hooks[entry.hookName]?.delete(afn);
        const c = _scriptCells.find(s => s.id === entry.cellId);
        if (c) {
          const any = _hookRegistry.some(h => h.cellId === entry.cellId && h.enabled);
          _setCellStatus(c, any ? "hooked" : "ok");
          _updateCellHooksChip(c);
        }
        _updateHooksBadge();
        _renderHooksList();
      });

      // delete
      const delBtn = document.createElement("button");
      delBtn.className = "sc-btn sc-btn-danger";
      delBtn.title = "Remove hook";
      delBtn.textContent = "✕";
      delBtn.addEventListener("click", () => {
        _kernel.hooks[entry.hookName]?.delete(entry.fn);
        if (entry._wrapper) _kernel.hooks[entry.hookName]?.delete(entry._wrapper);
        _hookRegistry = _hookRegistry.filter(h => h.id !== entry.id);
        const c = _scriptCells.find(s => s.id === entry.cellId);
        if (c) {
          _updateCellHooksChip(c);
          const any = _hookRegistry.some(h => h.cellId === entry.cellId && h.enabled);
          if (!any && c._status === "hooked") _setCellStatus(c, "ok");
        }
        _updateHooksBadge();
        _renderHooksList();
      });

      row.append(dot, nameEl, cellRef, statEl, spacer, profBtn, toggleBtn, delBtn);
      list.appendChild(row);
    }
  }

  // ── Command mode ─────────────────────────────────────────────────────────
  function _enterCmdMode(cellId) {
    if (_cmdModeCell !== null) {
      _scriptCells.find(c => c.id === _cmdModeCell)?._elem?.classList.remove("sc-cell-cmd");
    }
    _cmdModeCell = cellId;
    if (cellId === null) return;
    const cell = _scriptCells.find(c => c.id === cellId);
    if (cell?._elem) {
      cell._elem.classList.add("sc-cell-cmd");
      cell._elem.scrollIntoView({ block: "nearest", behavior: "smooth" });
      cell._elem.focus({ preventScroll: true }); // keep focus inside panel so focusin guard doesn't fire
    }
  }

  function _exitCmdMode() {
    _enterCmdMode(null);
    _cmdDPending = false; _cmdIPending = false; _cmd0Pending = false;
    clearTimeout(_cmdDTimer); clearTimeout(_cmdITimer); clearTimeout(_cmd0Timer);
  }

  function _cmdSelectDelta(delta) {
    const idx = _scriptCells.findIndex(c => c.id === _cmdModeCell);
    if (idx === -1) return;
    const ni = Math.max(0, Math.min(_scriptCells.length - 1, idx + delta));
    if (ni !== idx) _enterCmdMode(_scriptCells[ni].id);
  }

  function _cmdDeleteSelected() {
    const idx = _scriptCells.findIndex(c => c.id === _cmdModeCell);
    if (idx === -1) return;
    const cell = _scriptCells[idx];
    _cmdDeletedStack.push({ idx, code: _cellCode(cell) });
    if (_cmdDeletedStack.length > 30) _cmdDeletedStack.shift();
    _deleteCell(cell.id);
    if (_scriptCells.length === 0) { _exitCmdMode(); return; }
    _enterCmdMode(_scriptCells[Math.min(idx, _scriptCells.length - 1)].id);
  }

  function _cmdUndoDelete() {
    if (!_cmdDeletedStack.length) return;
    const { idx, code } = _cmdDeletedStack.pop();
    const cell = _addCellAt(Math.min(idx, _scriptCells.length), code, false);
    _enterCmdMode(cell.id);
  }

  function _cmdCutSelected() {
    const cell = _scriptCells.find(c => c.id === _cmdModeCell);
    if (!cell) return;
    _cmdClipboard = { code: _cellCode(cell) };
    _cmdDeleteSelected();
  }

  function _cmdCopySelected() {
    const cell = _scriptCells.find(c => c.id === _cmdModeCell);
    if (!cell) return;
    _cmdClipboard = { code: _cellCode(cell) };
  }

  function _cmdPaste(above) {
    if (!_cmdClipboard) return;
    const idx = _scriptCells.findIndex(c => c.id === _cmdModeCell);
    const insertIdx = idx === -1 ? _scriptCells.length : (above ? idx : idx + 1);
    const cell = _addCellAt(insertIdx, _cmdClipboard.code, false);
    _enterCmdMode(cell.id);
  }

  function _cmdToggleOutput() {
    const cell = _scriptCells.find(c => c.id === _cmdModeCell);
    if (!cell?._output) return;
    const out = cell._output;
    out.style.display = (out.style.display === "none" || !out.textContent) ? "" : "none";
    if (!out.textContent) out.style.display = "none";
  }

  function _cmdToggleLineNumbers() {
    const cell = _scriptCells.find(c => c.id === _cmdModeCell);
    if (!cell?.editor) return;
    cell.editor.setOption("lineNumbers", !cell.editor.getOption("lineNumbers"));
  }

  function _handleCmdModeKey(ev) {
    const panel = document.getElementById("scriptPanel");
    if (!panel || panel.classList.contains("bp-collapsed")) return;
    const k = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
    const mod = ev.ctrlKey || ev.metaKey;

    const clearSeq = () => {
      _cmdDPending = false; _cmdIPending = false; _cmd0Pending = false;
      clearTimeout(_cmdDTimer); clearTimeout(_cmdITimer); clearTimeout(_cmd0Timer);
    };
    const done = () => { ev.preventDefault(); return true; };

    // Shift+Enter — run + advance
    if (k === "Enter" && ev.shiftKey) {
      const idx = _scriptCells.findIndex(c => c.id === _cmdModeCell);
      _runCell(_cmdModeCell);
      if (idx >= _scriptCells.length - 1) _enterCmdMode(_addCellAt(_scriptCells.length, "", false).id);
      else _cmdSelectDelta(1);
      return done();
    }
    // Ctrl+Enter — run in place
    if (k === "Enter" && mod) { _runCell(_cmdModeCell); return done(); }
    // Enter — edit mode
    if (k === "Enter") {
      const cell = _scriptCells.find(c => c.id === _cmdModeCell);
      _exitCmdMode();
      cell?.editor ? cell.editor.focus() : cell?.ta?.focus();
      return done();
    }
    // Escape — exit command mode
    if (k === "Escape") { _exitCmdMode(); return done(); }
    // Navigation
    if ((k === "arrowup"   || k === "k") && !mod) { clearSeq(); _cmdSelectDelta(-1); return done(); }
    if ((k === "arrowdown" || k === "j") && !mod) { clearSeq(); _cmdSelectDelta( 1); return done(); }
    // Insert above / below
    if (k === "a" && !mod) {
      clearSeq();
      const idx = _scriptCells.findIndex(c => c.id === _cmdModeCell);
      _enterCmdMode(_addCellAt(idx === -1 ? 0 : idx, "", false).id);
      return done();
    }
    if (k === "b" && !mod) {
      clearSeq();
      const idx = _scriptCells.findIndex(c => c.id === _cmdModeCell);
      _enterCmdMode(_addCellAt(idx === -1 ? _scriptCells.length : idx + 1, "", false).id);
      return done();
    }
    // Delete (D D)
    if (k === "d" && !mod) {
      if (_cmdDPending) { clearTimeout(_cmdDTimer); _cmdDPending = false; _cmdDeleteSelected(); }
      else { _cmdDPending = true; _cmdDTimer = setTimeout(() => { _cmdDPending = false; }, 500); }
      return done();
    }
    // Undo delete
    if (k === "z" && !mod) { clearSeq(); _cmdUndoDelete(); return done(); }
    // Cut / copy / paste
    if (k === "x" && !mod) { clearSeq(); _cmdCutSelected();  return done(); }
    if (k === "c" && !mod) { clearSeq(); _cmdCopySelected(); return done(); }
    if (k === "v" && !mod) { clearSeq(); _cmdPaste(ev.shiftKey); return done(); }
    // Toggle output / line numbers
    if (k === "o" && !mod) { clearSeq(); _cmdToggleOutput();      return done(); }
    if (k === "l" && !mod) { clearSeq(); _cmdToggleLineNumbers(); return done(); }
    // I I — pause/resume hooks
    if (k === "i" && !mod) {
      if (_cmdIPending) { clearTimeout(_cmdITimer); _cmdIPending = false; document.getElementById("scriptClearHooks")?.click(); }
      else { _cmdIPending = true; _cmdITimer = setTimeout(() => { _cmdIPending = false; }, 500); }
      return done();
    }
    // 0 0 — clear selected cell output
    if (k === "0") {
      if (_cmd0Pending) {
        clearTimeout(_cmd0Timer); _cmd0Pending = false;
        const cell = _scriptCells.find(c => c.id === _cmdModeCell);
        if (cell?._output) { cell._output.style.display = "none"; cell._output.textContent = ""; }
      } else { _cmd0Pending = true; _cmd0Timer = setTimeout(() => { _cmd0Pending = false; }, 500); }
      return done();
    }
    clearSeq();
    return false;
  }

  function _deleteCell(id) {
    const idx = _scriptCells.findIndex(c => c.id === id);
    if (idx === -1) return;
    const cell = _scriptCells[idx];
    cell._hookCleanups.forEach(fn => fn());
    _scriptCells.splice(idx, 1);
    cell._elem?.remove();
    _updateHooksBadge();
    _saveScript();
  }

  async function _runCell(id) {
    const cell = _scriptCells.find(c => c.id === id);
    if (!cell) return;
    // Clean previous hooks
    cell._hookCleanups.forEach(fn => fn());
    cell._hookCleanups = [];
    _setCellStatus(cell, "running");
    _updateCellHooksChip(cell);

    const code = _cellCode(cell);
    const out = cell._output;
    if (out) { out.style.display = "none"; out.textContent = ""; out.className = "sc-output"; }

    const printFn = (...args) => {
      if (!out) return;
      out.style.display = "";
      out.textContent += args.map(a => typeof a === "object" ? JSON.stringify(a) : String(a)).join(" ") + "\n";
    };

    const sdkHook = (hookName, fn) => {
      if (!_kernel.hooks[hookName]) return () => {};
      const hid = ++_hookIdSeq;
      const entry = {
        id: hid, hookName, cellId: id, enabled: true, fn,
        profiling: false, _wrapper: null, _statEl: null,
        profile: { calls: 0, totalMs: 0, avgMs: 0, lastMs: 0, minMs: Infinity, maxMs: 0 },
      };
      _hookRegistry.push(entry);
      if (!_hooksPaused) _kernel.hooks[hookName].add(fn);
      const unsub = () => {
        _kernel.hooks[hookName].delete(fn);
        if (entry._wrapper) _kernel.hooks[hookName].delete(entry._wrapper);
        _hookRegistry = _hookRegistry.filter(h => h.id !== hid);
        _updateCellHooksChip(cell);
        _updateHooksBadge();
        _renderHooksList();
      };
      cell._hookCleanups.push(unsub);
      _updateCellHooksChip(cell);
      _updateHooksBadge();
      _renderHooksList();
      return unsub;
    };

    const sdkCells = {
      get size() { return activeAlive().size; },
      add(col, row) { setCell(col, row, true); },
      remove(col, row) { setCell(col, row, false); },
      fill(x, y, w, h, density = 1) {
        for (let r = y; r < y + h; r++) for (let c = x; c < x + w; c++)
          if (Math.random() < density) setCell(c, r, true);
      },
      clear() { clearBoard(); },
      forEach(fn) { for (const k of activeAlive()) { const [c, r] = parseKey(k); fn(c, r); } },
    };
    const sdkRules = {
      get birth() { return [...state.ruleB].sort((a, b) => a - b); },
      get survival() { return [...state.ruleS].sort((a, b) => a - b); },
      set(B, S) { state.ruleB = new Set(B); state.ruleS = new Set(S); state._ruleDirty = true; },
      toString() { return ruleToString(state.ruleB, state.ruleS); },
    };
    const sdkSim = {
      get generation() { return state.generation; },
      step(n = 1) { for (let i = 0; i < n; i++) tickForward(); },
      play() { if (!state.running) { state.running = true; document.getElementById("playBtn").textContent = "Pause"; } },
      pause() { if (state.running) { state.running = false; document.getElementById("playBtn").textContent = "Play"; } },
      get running() { return state.running; },
    };
    const sdkCanvas = {
      get ctx() { return ctx; },
      get width() { return canvas.clientWidth; },
      get height() {
        const tlBar = document.getElementById("timelineBar");
        if (!tlBar) return canvas.clientHeight;
        const cr = canvas.getBoundingClientRect();
        const tr = tlBar.getBoundingClientRect();
        return Math.max(0, tr.top - cr.top);
      },
    };

    // Manifold SDK — read-only view of each region's topology/curvature data
    const { computeGaussianCurvature: _gaussK } = window.ManifoldEngine;
    const sdkManifold = state.manifoldRegions.map(r => ({
      get shape()    { return r.shape; },
      get rect()     { return { ...r.rect }; },
      get protocol() { return r.boundaryProtocol; },
      get id()       { return r.id; },
      contains(x, y) { return r.containsCell(x, y); },
      christoffelAt(x, y) {
        const G = r.christoffelMap.get(key(x, y));
        return G ? Array.from(G) : [0,0,0,0,0,0];
      },
      christoffelMagnitudeAt(x, y) { return r.christoffelMagnitudeAt(x, y); },
      gaussianCurvatureAt(x, y) {
        const { w: W, h: H, x: rx, y: ry } = r.rect;
        return _gaussK(x - rx, y - ry, W, H, r.shape);
      },
      get ruleOverride() {
        if (!r.ruleOverride) return null;
        return { B: [...r.ruleOverride.B], S: [...r.ruleOverride.S] };
      },
      setRuleOverride(B, S) {
        r.ruleOverride = B && S ? { B: new Set(B), S: new Set(S) } : null;
      },
      get curvatureModulate() { return r.curvatureModulate; },
      set curvatureModulate(v) { r.curvatureModulate = !!v; },
    }));

    try {
      const fn = new Function("cells", "rules", "sim", "canvas", "globals", "hook", "log", "print", "manifold", `"use strict"; return (async () => { ${code} })()`);
      await fn(sdkCells, sdkRules, sdkSim, sdkCanvas, _kernel.globals, sdkHook, printFn, printFn, sdkManifold);
      if (out && out.textContent === "") out.style.display = "none";
      _setCellStatus(cell, _hookRegistry.some(h => h.cellId === id) ? "hooked" : "ok");
    } catch (err) {
      if (out) { out.style.display = ""; out.textContent = String(err); out.className = "sc-output sc-err"; }
      _setCellStatus(cell, "err");
    }
    _updateCellHooksChip(cell);
    _updateHooksBadge();
  }

  const SCRIPT_SAMPLES = {

    status: `log('gen:', sim.generation, '  pop:', cells.size, '  rules:', rules.toString());`,

    seed: `cells.fill(-20, -20, 40, 40, 0.35);\nlog('seeded', cells.size, 'cells');`,

    symmetric:
`// 4-fold symmetric random seed — great for studying symmetric attractors
cells.clear();
const N = 18;
for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
  if (Math.random() < 0.38) {
    cells.add( x,  y); cells.add(-x-1,  y);
    cells.add( x, -y-1); cells.add(-x-1, -y-1);
  }
}
log('symmetric seed —', cells.size, 'cells');`,

    sparkline:
`// Live population sparkline drawn on canvas corner
const hist = [];
hook('afterStep', () => {
  hist.push(cells.size);
  if (hist.length > 200) hist.shift();
});
hook('afterDraw', () => {
  if (hist.length < 2) return;
  const { ctx, width, height } = canvas;
  const W = 160, H = 48, x0 = width - W - 10, y0 = height - H - 22;
  const mx = Math.max(...hist, 1), mn = Math.min(...hist, 0), rng = mx - mn || 1;
  ctx.save();
  ctx.fillStyle = 'rgba(8,14,22,0.82)';
  ctx.fillRect(x0-6, y0-6, W+12, H+20);
  ctx.strokeStyle = '#6fffaa'; ctx.lineWidth = 1.5;
  ctx.beginPath();
  hist.forEach((v,i) => {
    const px = x0 + (i/(hist.length-1))*W;
    const py = y0 + H - ((v-mn)/rng)*H;
    i === 0 ? ctx.moveTo(px,py) : ctx.lineTo(px,py);
  });
  ctx.stroke();
  ctx.fillStyle = '#8ecfaa'; ctx.font = '10px monospace';
  ctx.fillText('pop ' + cells.size, x0, y0+H+13);
  ctx.fillStyle = '#334455';
  ctx.fillText('peak ' + mx, x0+W-52, y0+H+13);
  ctx.restore();
});
log('sparkline active');`,

    hud:
`// Persistent gen/pop overlay — great for recording sessions
hook('afterDraw', () => {
  const { ctx } = canvas;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.62)';
  ctx.fillRect(8, 8, 162, 46);
  ctx.font = 'bold 11px monospace';
  ctx.fillStyle = '#6fffaa';
  ctx.fillText('GEN  ' + String(sim.generation).padStart(9), 14, 24);
  ctx.fillStyle = '#5be0bc';
  ctx.fillText('POP  ' + String(cells.size).padStart(9), 14, 40);
  ctx.restore();
});`,

    stability:
`// Auto-pause when population stabilises (useful for finding still-lifes & oscillators)
const win = [];
hook('afterStep', () => {
  win.push(cells.size); if (win.length > 50) win.shift();
  if (win.length < 50) return;
  const lo = Math.min(...win), hi = Math.max(...win);
  if (hi - lo <= 2 && cells.size > 0) {
    sim.pause();
    log('stable — gen', sim.generation, ' pop', cells.size, '±' + (hi-lo));
  }
});`,

    events:
`// Population event monitor — logs growth bursts and detects extinction
let prev = cells.size, peak = 0;
hook('afterStep', () => {
  const d = cells.size - prev; prev = cells.size;
  peak = Math.max(peak, cells.size);
  if (d >  60) log('▲ +' + d + '  gen ' + sim.generation + '  pop ' + cells.size);
  if (d < -60) log('▼ '  + d + '  gen ' + sim.generation + '  pop ' + cells.size);
  if (cells.size === 0) {
    sim.pause();
    log('extinction  gen ' + sim.generation + '  peak was ' + peak);
  }
});`,

    oneShot:
`// Fire-once hook — removes itself after first step.
// Pattern: store the unsub, call it inside the callback.
const off = hook('afterStep', () => {
  log('snapshot  gen:', sim.generation, '  pop:', cells.size);
  off(); // unregisters this hook immediately
});`,

    ruleExplore:
`// Rule explorer — tries each birth count against S23, logs results
// Restores your original rules when done.
(async () => {
  const origB = [...rules.birth], origS = [...rules.survival];
  log('exploring birth rules with S' + origS.join('') + '…');
  for (const b of [1,2,3,4,5,6,7,8]) {
    cells.clear(); cells.fill(-12,-12,24,24,0.40);
    rules.set([b], origS); sim.step(80);
    log('B' + b + '/S' + origS.join('') + '  →  pop ' + cells.size);
  }
  rules.set(origB, origS);
  log('restored →', rules.toString());
})();`,

    manifoldInspect:
`// Manifold region inspector — live curvature readout overlay
if (!manifold.length) { log('No manifold regions. Draw one first.'); }
else {
  log(manifold.length + ' region(s):', manifold.map(r => r.shape + ' #' + r.id).join(', '));
  for (const r of manifold) {
    const { x, y, w, h } = r.rect;
    let sumK = 0, minK = Infinity, maxK = -Infinity;
    for (let cy = y; cy < y + h; cy++) for (let cx = x; cx < x + w; cx++) {
      const K = r.gaussianCurvatureAt(cx, cy);
      sumK += K; if (K < minK) minK = K; if (K > maxK) maxK = K;
    }
    log(r.shape + ' #' + r.id + '  K∈[' + minK.toFixed(3) + ',' + maxK.toFixed(3) +
        ']  mean=' + (sumK / (w * h)).toFixed(3));
  }
}`,

    manifoldHUD:
`// Live manifold overlay — draws curvature hotspot ring on canvas each frame
hook('afterDraw', () => {
  if (!manifold.length) return;
  const { ctx } = canvas;
  ctx.save();
  for (const r of manifold) {
    const { x, y, w, h } = r.rect;
    let peakK = -Infinity, px = x, py = y;
    for (let cy = y; cy < y + h; cy++) for (let cx = x; cx < x + w; cx++) {
      const K = r.gaussianCurvatureAt(cx, cy);
      if (K > peakK) { peakK = K; px = cx; py = cy; }
    }
    // world→screen: use the canvas transform directly
    // We approximate using the zoom/pan from globals if available
    // Simple fallback: log the peak cell
  }
  ctx.restore();
});
log('manifold HUD active — ' + manifold.length + ' region(s)');`,

  };

  function setupScriptKernel() {
    document.getElementById("scriptAddCell")?.addEventListener("click", () => {
      _addCell();
      document.getElementById("scriptPanel")?.classList.remove("bp-collapsed");
      const btn = document.getElementById("scriptDrawerToggle");
      if (btn) btn.textContent = "▼";
    });
    document.getElementById("scriptRunAll")?.addEventListener("click", async () => {
      for (const cell of _scriptCells) await _runCell(cell.id);
    });
    document.getElementById("scriptClearHooks")?.addEventListener("click", () => {
      _hooksPaused = !_hooksPaused;
      for (const h of _hookRegistry) {
        if (h.enabled) {
          const afn = _hookActiveFn(h);
          if (_hooksPaused) _kernel.hooks[h.hookName]?.delete(afn);
          else              _kernel.hooks[h.hookName]?.add(afn);
        }
      }
      _updateHooksBadge();
      _renderHooksList();
    });
    document.getElementById("scriptClearAll")?.addEventListener("click", () => {
      [..._scriptCells].map(c => c.id).forEach(id => _deleteCell(id));
    });

    const sampleSel = document.getElementById("scriptSampleSelect");
    if (sampleSel) sampleSel.disabled = true; // starts collapsed
    sampleSel?.addEventListener("change", () => {
      const code = SCRIPT_SAMPLES[sampleSel.value];
      if (!code) return;
      sampleSel.value = "";
      const panel = document.getElementById("scriptPanel");
      if (panel?.classList.contains("bp-collapsed")) {
        panel.classList.remove("bp-collapsed");
        const btn = document.getElementById("scriptDrawerToggle");
        if (btn) btn.textContent = "▼";
        sampleSel.disabled = false;
      }
      const first = _scriptCells[0];
      if (first && _cellCode(first).trim() === "") {
        if (first.editor) { first.editor.setValue(code); first.editor.focus(); }
        else if (first.ta) { first.ta.value = code; first.code = code; first.ta.focus(); }
        first.code = code;
        _saveScript();
      } else {
        _addCell(code);
      }
    });

    _loadScript();
    if (_scriptCells.length === 0) {
      _addCell("log('gen:', sim.generation, '  pop:', cells.size);");
    }

    // Capture-phase keydown: fires before canvas/CodeMirror handlers.
    // Only active when a cell is in command mode and the user isn't typing inside an editor.
    document.addEventListener("keydown", (ev) => {
      if (_cmdModeCell === null) return;
      const panel = document.getElementById("scriptPanel");
      if (!panel || panel.classList.contains("bp-collapsed")) return;
      if (document.activeElement?.closest(".sc-editor-wrap")) return; // user is editing
      if (_handleCmdModeKey(ev)) ev.stopPropagation();
    }, { capture: true });

    // Exit command mode when clicking outside the script panel
    document.addEventListener("mousedown", (ev) => {
      if (_cmdModeCell === null) return;
      const panel = document.getElementById("scriptPanel");
      if (panel && !panel.contains(ev.target)) _exitCmdMode();
    });
  }

  function setupCaptureLab() {
    const selModeBtn = document.getElementById("selModeBtn");
    const selInfoEl = document.getElementById("selInfo");
    const captureNameInput = document.getElementById("captureNameInput");
    const captureDescInput = document.getElementById("captureDescInput");
    const captureSaveBtn = document.getElementById("captureSaveBtn");
    const clearSelBtn = document.getElementById("clearSelBtn");
    if (!selModeBtn) return;

    selModeBtn.addEventListener("click", () => {
      setCanvasMode(state.canvasMode === "select" ? "paint" : "select");
      if (state.canvasMode !== "select") state.selection = null;
    });

    clearSelBtn.addEventListener("click", () => {
      if (state._selMoving && state._selCells) {
        const sel = state.selection;
        for (const [ox, oy] of state._selCells) setCell(sel.x + ox, sel.y + oy, true);
        state._selCells = null; state._selMoving = false; state._selMoveDelta = { dx: 0, dy: 0 };
      }
      state.selection = null;
      selInfoEl.textContent = "";
    });

    captureSaveBtn.addEventListener("click", () => {
      const name = captureNameInput.value.trim() || "Custom Pattern";
      const desc = captureDescInput.value.trim();
      const ok = captureSelection(name, desc);
      if (ok) {
        captureNameInput.value = "";
        captureDescInput.value = "";
        selInfoEl.textContent = "Saved!";
        setTimeout(() => {
          if (selInfoEl.textContent === "Saved!") selInfoEl.textContent = "";
        }, 1800);
      } else {
        selInfoEl.textContent = "No cells in selection.";
      }
    });

    captureNameInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") captureSaveBtn.click();
    });
  }

  function setupAnalysisLab() {
    const detectBtn  = document.getElementById("detectPeriodBtn");
    const resultEl   = document.getElementById("periodResult");
    const exportBtn  = document.getElementById("exportRLEBtn");
    const importBtn  = document.getElementById("importRLEBtn");
    const rleArea    = document.getElementById("rleAreaInline");
    const rleLoadBtn = document.getElementById("rleLoadInlineBtn");
    if (!detectBtn) return;

    detectBtn.addEventListener("click", () => {
      resultEl.textContent = "Analysing…";
      setTimeout(() => {
        const r = detectPeriod(512);
        resultEl.textContent = r.msg;
        resultEl.style.color = r.found ? "var(--accent)" : "var(--muted)";
      }, 10);
    });

    if (exportBtn) {
      exportBtn.addEventListener("click", () => {
        const rle = encodeRLE();
        if (!rle) { resultEl.textContent = "Board is empty."; return; }
        const blob = new Blob([rle], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = "pattern.rle"; a.click();
        URL.revokeObjectURL(url);
      });
    }

    if (importBtn && rleArea && rleLoadBtn) {
      importBtn.addEventListener("click", () => {
        const hidden = rleArea.style.display === "none" || rleArea.style.display === "";
        rleArea.style.display = hidden ? "block" : "none";
        rleLoadBtn.style.display = hidden ? "block" : "none";
      });
      rleLoadBtn.addEventListener("click", () => {
        const cells = decodeRLE(rleArea.value);
        if (!cells || cells.length === 0) {
          resultEl.textContent = "RLE parse error.";
          resultEl.style.color = "var(--muted)";
          return;
        }
        clearBoard();
        const cx = Math.round(state.cameraX), cy = Math.round(state.cameraY);
        for (const [dx, dy] of cells) setCell(cx + dx, cy + dy, true);
        snapshotNow(); updateHud();
        rleArea.style.display = "none";
        rleLoadBtn.style.display = "none";
        resultEl.textContent = `Loaded ${cells.length} cells.`;
        resultEl.style.color = "var(--accent)";
      });
    }
  }

  // ─── Notebook ────────────────────────────────────────────────────────────────

  function nbSave() {
    try {
      localStorage.setItem(LS_NOTEBOOK, JSON.stringify({
        entries: state.notebook.entries,
        _nextId: state.notebook._nextId,
        _colorIdx: state.notebook._colorIdx,
      }));
    } catch (e) {}
  }

  function nbLoad() {
    try {
      const d = JSON.parse(localStorage.getItem(LS_NOTEBOOK) || "null");
      if (!d) return;
      state.notebook.entries = d.entries || [];
      state.notebook._nextId = d._nextId || 1;
      state.notebook._colorIdx = d._colorIdx || 0;
    } catch (e) {}
  }

  function nbNextColor() {
    return NB_COLORS[state.notebook._colorIdx++ % NB_COLORS.length];
  }

  function nbOpenPanel() {
    state.notebook.open = true;
    document.getElementById("notebookPanel")?.classList.add("nb-open");
    nbRender();
    nbUpdateMarkers();
  }

  function nbClosePanel() {
    state.notebook.open = false;
    document.getElementById("notebookPanel")?.classList.remove("nb-open");
    nbCancelForm();
    if (state.notebook.pinMode) {
      state.notebook.pinMode = false;
      canvas.style.cursor = "";
      document.getElementById("notebookBtn")?.classList.remove("nb-pin-active");
    }
  }

  function nbShowForm() {
    document.getElementById("nbForm").style.display = "";
    document.getElementById("nbTitleInput")?.focus();
  }

  function nbCancelForm() {
    document.getElementById("nbForm").style.display = "none";
    if (document.getElementById("nbTitleInput")) document.getElementById("nbTitleInput").value = "";
    if (document.getElementById("nbBodyInput")) document.getElementById("nbBodyInput").value = "";
    if (document.getElementById("nbPinPreview")) document.getElementById("nbPinPreview").style.display = "none";
    if (document.getElementById("nbSceneChk")) document.getElementById("nbSceneChk").checked = false;
    state.notebook._pendingPin = null;
  }

  function nbCreateEntry() {
    const titleEl = document.getElementById("nbTitleInput");
    const bodyEl = document.getElementById("nbBodyInput");
    const snapChk = document.getElementById("nbSnapshotChk");
    const sceneChk = document.getElementById("nbSceneChk");
    const title = (titleEl?.value.trim()) || `Gen ${state.generation.toLocaleString()}`;
    const body = bodyEl?.value.trim() || "";
    const withSnap = snapChk?.checked ?? true;
    const isScene = sceneChk?.checked ?? false;
    const pin = state.notebook._pendingPin;

    // Compute bounding-box offset so we can restore absolute positions later
    let rleOffX = 0, rleOffY = 0;
    const alive = activeAlive();
    if (withSnap && alive.size > 0) {
      let minX = Infinity, minY = Infinity;
      for (const k of alive) {
        const [cx, cy] = parseKey(k);
        if (cx < minX) minX = cx;
        if (cy < minY) minY = cy;
      }
      rleOffX = minX; rleOffY = minY;
    }

    const entry = {
      id: state.notebook._nextId++,
      type: "note",
      title,
      body,
      gen: state.generation,
      pop: alive.size,
      rle: withSnap ? encodeRLE() : null,
      rleOffX,
      rleOffY,
      cameraX: state.cameraX,
      cameraY: state.cameraY,
      zoom: state.zoom,
      pinX: pin ? pin.x : null,
      pinY: pin ? pin.y : null,
      color: nbNextColor(),
      isScene,
      createdAt: Date.now(),
    };

    state.notebook.entries.push(entry);
    state.notebook.entries.sort((a, b) => a.gen - b.gen);
    nbSave();
    nbCancelForm();
    nbRender();
    nbUpdateMarkers();
    setOverlay(`Entry "${title}" saved.`);
    setTimeout(() => setOverlay(""), 2000);
  }

  function nbDeleteEntry(id) {
    state.notebook.entries = state.notebook.entries.filter(e => e.id !== id);
    nbSave();
    nbRender();
    nbUpdateMarkers();
  }

  function nbToggleScene(id) {
    const e = state.notebook.entries.find(e => e.id === id);
    if (e) { e.isScene = !e.isScene; nbSave(); nbRender(); }
  }

  function nbRestoreEntry(id) {
    const entry = state.notebook.entries.find(e => e.id === id);
    if (!entry) return;

    state.cameraX = entry.cameraX;
    state.cameraY = entry.cameraY;
    state.zoom = entry.zoom;

    if (entry.rle && entry.rle.length > 10) {
      const cells = decodeRLE(entry.rle);
      clearBoard();
      state.generation = entry.gen;
      const ox = entry.rleOffX || 0, oy = entry.rleOffY || 0;
      for (const [col, row] of cells) setCell(ox + col, oy + row, true);
      snapshotNow();
    }
    updateHud();
    setOverlay(`↺ Restored gen ${entry.gen}: "${entry.title}"`);
    setTimeout(() => setOverlay(""), 2200);
  }

  function nbUpdateMarkers() {
    const track = document.getElementById("tlTrack");
    if (!track) return;
    track.querySelectorAll(".nb-tl-marker").forEach(m => m.remove());
    const frames = state.histFrames;
    const maxGen = frames.length > 0 ? frames[frames.length - 1].gen : state.generation;
    if (maxGen <= 0) return;
    for (const entry of state.notebook.entries) {
      if (entry.gen < 0) continue;
      const pct = Math.min(100, (entry.gen / maxGen) * 100);
      const m = document.createElement("div");
      m.className = "nb-tl-marker";
      m.style.left = pct + "%";
      m.style.background = entry.color;
      m.title = `Gen ${entry.gen}: ${entry.title}`;
      m.addEventListener("click", ev => { ev.stopPropagation(); nbRestoreEntry(entry.id); });
      track.appendChild(m);
    }
  }

  function nbRender() {
    const el = document.getElementById("nbEntries");
    if (!el) return;
    const entries = state.notebook.entries;
    if (entries.length === 0) {
      el.innerHTML = '<div class="nb-feed-empty">No entries yet. Press + Entry to document a discovery.</div>';
      return;
    }
    const esc = s => s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\n/g,"<br>");
    el.innerHTML = entries.map((e, i) => {
      const pinBadge = e.pinX !== null ? `<span class="nb-badge nb-pin-badge">📍${i+1}</span>` : "";
      const sceneBadge = e.isScene ? `<span class="nb-badge nb-scene-badge">◆ scene</span>` : "";
      const snapBadge = e.rle ? `<span class="nb-badge nb-snap-badge">📷</span>` : "";
      const autoBadge = e.type === "auto" ? `<span class="nb-badge nb-auto-badge">auto</span>` : "";
      const bodyHtml = e.body ? `<div class="nb-entry-body">${esc(e.body)}</div>` : "";
      return `<div class="nb-entry" style="border-left-color:${e.color}" data-id="${e.id}">
        <div class="nb-entry-meta">
          <span class="nb-entry-gen">gen ${e.gen.toLocaleString()}</span>
          <span class="nb-entry-pop">${e.pop.toLocaleString()} cells</span>
          <span class="nb-entry-badges">${pinBadge}${sceneBadge}${snapBadge}${autoBadge}</span>
        </div>
        <div class="nb-entry-title">${esc(e.title)}</div>
        ${bodyHtml}
        <div class="nb-entry-actions">
          <button class="nb-act nb-restore-act" data-id="${e.id}" title="Jump to this moment">↺ restore</button>
          <button class="nb-act nb-scene-act" data-id="${e.id}" title="${e.isScene ? "Remove from scenes" : "Mark as scene"}">◆</button>
          <button class="nb-act nb-del-act" data-id="${e.id}" title="Delete">✕</button>
        </div>
      </div>`;
    }).join("");

    el.querySelectorAll(".nb-restore-act").forEach(b =>
      b.addEventListener("click", () => nbRestoreEntry(+b.dataset.id)));
    el.querySelectorAll(".nb-scene-act").forEach(b =>
      b.addEventListener("click", () => nbToggleScene(+b.dataset.id)));
    el.querySelectorAll(".nb-del-act").forEach(b =>
      b.addEventListener("click", () => nbDeleteEntry(+b.dataset.id)));
  }

  function nbCheckAuto() {
    const nb = state.notebook;
    const w = nb._watch;
    const pop = activeAlive().size;
    const gen = state.generation;
    if (gen - w.lastAutoGen < 30) { w.lastPop = pop; return; }

    let msg = null;
    if (pop === 0 && w.lastPop > 0) {
      msg = `Extinction — all ${w.lastPop.toLocaleString()} cells vanished.`;
      w.peakPop = 0;
    } else if (pop > w.peakPop + 200) {
      w.peakPop = pop;
      msg = `Population peak — ${pop.toLocaleString()} live cells.`;
    } else if (pop > 0 && pop < 8 && w.lastPop >= 8) {
      msg = `Near-extinction — only ${pop} cells remain.`;
    } else if (pop === w.lastPop && pop > 0) {
      if (w.stableSince === null) w.stableSince = gen;
      else if ((gen - w.stableSince) >= 20 && !w.stableLogged) {
        w.stableLogged = true;
        msg = `Board stabilized — ${pop.toLocaleString()} cells locked since gen ${w.stableSince.toLocaleString()}.`;
      }
    } else {
      w.stableSince = null;
      w.stableLogged = false;
    }

    if (msg) {
      w.lastAutoGen = gen;
      nbPushAutoFeed(gen, pop, msg);
    }
    w.lastPop = pop;
  }

  function nbPushAutoFeed(gen, pop, msg) {
    // Update live feed UI
    const feed = document.getElementById("nbAutoFeed");
    if (feed) {
      const empty = feed.querySelector(".nb-feed-empty");
      if (empty) empty.remove();
      const item = document.createElement("div");
      item.className = "nb-auto-item";
      item.innerHTML = `<span class="nb-auto-gen">${gen.toLocaleString()}</span><span class="nb-auto-msg">${msg}</span>`;
      feed.insertBefore(item, feed.firstChild);
      while (feed.children.length > 14) feed.removeChild(feed.lastChild);
    }

    // Create an auto entry in the journal
    const entry = {
      id: state.notebook._nextId++,
      type: "auto",
      title: msg,
      body: "",
      gen, pop,
      rle: null, rleOffX: 0, rleOffY: 0,
      cameraX: state.cameraX, cameraY: state.cameraY, zoom: state.zoom,
      pinX: null, pinY: null,
      color: "#9dc5d2",
      isScene: false,
      createdAt: Date.now(),
    };
    state.notebook.entries.push(entry);
    state.notebook.entries.sort((a, b) => a.gen - b.gen);
    nbSave();
    if (state.notebook.open) nbRender();
    nbUpdateMarkers();
  }

  function drawNotebookPins() {
    if (!state.notebook.entries.length) return;
    const z = state.zoom;
    const ccx = canvas.width / 2, ccy = canvas.height / 2;
    let pinIdx = 1;
    for (const entry of state.notebook.entries) {
      if (entry.pinX === null) { pinIdx++; continue; }
      const sx = (entry.pinX - state.cameraX) * z + ccx;
      const sy = (entry.pinY - state.cameraY) * z + ccy;
      if (sx < -30 || sx > canvas.width + 30 || sy < -30 || sy > canvas.height + 30) { pinIdx++; continue; }
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.6)"; ctx.shadowBlur = 6;
      // Circle head
      ctx.beginPath();
      ctx.arc(sx, sy - 6, 9, 0, Math.PI * 2);
      ctx.fillStyle = entry.color;
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 1.5;
      ctx.stroke();
      // Stem
      ctx.beginPath();
      ctx.moveTo(sx - 3.5, sy - 1); ctx.lineTo(sx + 3.5, sy - 1); ctx.lineTo(sx, sy + 6);
      ctx.closePath(); ctx.fillStyle = entry.color; ctx.fill();
      ctx.shadowBlur = 0;
      // Number
      ctx.fillStyle = "rgba(0,0,0,0.9)"; ctx.font = "bold 8px monospace";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(String(pinIdx), sx, sy - 6);
      ctx.restore();
      pinIdx++;
    }
  }

  function nbPlayScenes() {
    const scenes = state.notebook.entries.filter(e => e.isScene).sort((a, b) => a.gen - b.gen);
    if (scenes.length === 0) {
      setOverlay("No scenes marked — edit entries and check \"Mark as scene\".");
      setTimeout(() => setOverlay(""), 3000);
      return;
    }
    const overlay = document.getElementById("sceneOverlay");
    const counterEl = document.getElementById("sceneCounter");
    const titleEl = document.getElementById("sceneTitle");
    const bodyEl = document.getElementById("sceneBody");
    overlay.classList.remove("hidden");
    state.notebook.scenePlaying = true;

    function playScene(idx) {
      if (!state.notebook.scenePlaying || idx >= scenes.length) { endScenes(); return; }
      const sc = scenes[idx];
      counterEl.textContent = `Scene ${idx + 1} of ${scenes.length}`;
      titleEl.textContent = sc.title;
      bodyEl.textContent = sc.body || "";
      nbRestoreEntry(sc.id);
      state.running = true; syncPlayUI(true, false);
      state.notebook._sceneTimer = setTimeout(() => {
        state.running = false; syncPlayUI(false, false);
        state.notebook._sceneTimer = setTimeout(() => playScene(idx + 1), 700);
      }, 8000);
    }

    function endScenes() {
      state.notebook.scenePlaying = false;
      state.running = false; syncPlayUI(false, false);
      overlay.classList.add("hidden");
      setOverlay("Journal playback complete.");
      setTimeout(() => setOverlay(""), 2500);
    }

    document.getElementById("sceneStopBtn").onclick = () => {
      if (state.notebook._sceneTimer) clearTimeout(state.notebook._sceneTimer);
      endScenes();
    };
    playScene(0);
  }

  function nbExport() {
    const entries = state.notebook.entries;
    if (entries.length === 0) {
      setOverlay("Journal is empty — nothing to export.");
      setTimeout(() => setOverlay(""), 2000);
      return;
    }
    const lines = [
      "AUTOMATA ARCADE — JOURNAL",
      `Exported: ${new Date().toLocaleString()}`,
      `Entries: ${entries.length}`,
      "",
    ];
    for (const e of entries) {
      lines.push("─".repeat(44));
      const tag = e.type === "auto" ? " [auto]" : "";
      lines.push(`Gen ${e.gen.toLocaleString()} · ${e.pop.toLocaleString()} cells${tag}`);
      lines.push(e.title);
      if (e.body) lines.push(e.body);
      if (e.isScene) lines.push("[★ Scene]");
      if (e.pinX !== null) lines.push(`[📍 Pin at (${e.pinX}, ${e.pinY})]`);
      if (e.rle) lines.push(`[📷 Snapshot: ${e.rle.split("\n")[0]}]`);
      lines.push("");
    }
    const text = lines.join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setOverlay("Journal copied to clipboard.");
      setTimeout(() => setOverlay(""), 2500);
    }).catch(() => {
      const w = window.open("", "_blank", "width=620,height=520");
      if (w) w.document.write(`<pre style="font:12px monospace;padding:20px;background:#07121a;color:#daf6ff;white-space:pre-wrap">${text.replace(/</g,"&lt;")}</pre>`);
    });
  }

  function setupNotebook() {
    nbLoad();
    nbRender();

    document.getElementById("notebookBtn")?.addEventListener("click", () => {
      if (state.notebook.open) nbClosePanel(); else nbOpenPanel();
    });
    document.getElementById("nbCloseBtn")?.addEventListener("click", nbClosePanel);

    document.getElementById("nbNewBtn")?.addEventListener("click", () => {
      nbCancelForm();
      nbShowForm();
    });

    document.getElementById("nbPinBtn")?.addEventListener("click", () => {
      if (!state.notebook.open) nbOpenPanel();
      state.notebook.pinMode = true;
      canvas.style.cursor = "crosshair";
      document.getElementById("notebookBtn")?.classList.add("nb-pin-active");
      setOverlay("📍 Click anywhere on the board to drop a pin…");
      setTimeout(() => { if (state.notebook.pinMode) setOverlay(""); }, 4000);
    });

    document.getElementById("nbSaveBtn")?.addEventListener("click", nbCreateEntry);
    document.getElementById("nbCancelBtn")?.addEventListener("click", nbCancelForm);

    document.getElementById("nbTitleInput")?.addEventListener("keydown", ev => {
      if (ev.key === "Enter") { ev.preventDefault(); nbCreateEntry(); }
      if (ev.key === "Escape") nbCancelForm();
    });

    document.getElementById("nbScenesBtn")?.addEventListener("click", nbPlayScenes);
    document.getElementById("nbExportBtn")?.addEventListener("click", nbExport);

    const autoToggle = document.getElementById("nbAutoToggle");
    const autoClear  = document.getElementById("nbAutoClear");
    function _syncAutoToggle() {
      const dot = document.querySelector(".nb-auto-dot");
      if (!autoToggle) return;
      if (state.notebook.autoEnabled) {
        autoToggle.textContent = "⏸ Pause";
        dot?.classList.remove("nb-auto-dot-off");
      } else {
        autoToggle.textContent = "▶ Enable";
        dot?.classList.add("nb-auto-dot-off");
      }
    }
    autoToggle?.addEventListener("click", () => {
      state.notebook.autoEnabled = !state.notebook.autoEnabled;
      _syncAutoToggle();
    });
    autoClear?.addEventListener("click", () => {
      state.notebook.entries = state.notebook.entries.filter(e => e.type !== "auto");
      const feed = document.getElementById("nbAutoFeed");
      if (feed) feed.innerHTML = '<div class="nb-feed-empty">Feed cleared.</div>';
      nbSave();
      if (state.notebook.open) nbRender();
    });
    _syncAutoToggle();

    // Escape closes pin mode
    window.addEventListener("keydown", ev => {
      if (ev.key === "Escape" && state.notebook.pinMode) {
        state.notebook.pinMode = false;
        canvas.style.cursor = "";
        document.getElementById("notebookBtn")?.classList.remove("nb-pin-active");
        setOverlay("");
      }
    }, { capture: true });
  }

  function init() {
    setupControls();
    setupCanvasInput();
    setupShortcuts();
    setupTimeline();
    setupRuleLab();
    setupPhysicsLab();
    setupWaveLab();
    setupTypeLab();
    setupEvoLab();
    setupZoneLab();
    setupFieldLab();
    setupLensLab();
    setupChristoffelBar();
    setupLibrary();
    setupCaptureLab();
    setupAnalysisLab();
    setupNotebook();
    buildPalette();
    const paletteSearchEl = document.getElementById("paletteSearch");
    if (paletteSearchEl) {
      paletteSearchEl.addEventListener("input", () => buildPalette(paletteSearchEl.value));
    }
    initPaneResizers();
    setupScriptKernel();
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    requestAnimationFrame(_syncTlBottom);

    loadDemo();
    requestAnimationFrame(runTick);
  }

  init();
})();
