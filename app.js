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
    sharedState: true,
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
    rulesZoneEnabled: false,
    rulesZoneAxis: "x",
    rulesZoneOffset: 0,
    rulesZoneRuleB2: new Set([3, 6]),
    rulesZoneRuleS2: new Set([2, 3]),
    forceFields: [],
    canvasMode: "paint",  // "paint" | "move" | "select" | "force"
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
      autoEnabled: true,
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
  const SPEED_LABELS = ["1×", "2×", "4×", "8×", "15×", "25×", "30×"];
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
  function is3DMode()  { return MANIFOLD_MODES.includes(state.mode); }
  function isGPUMode() { return window.ASF && ASF.isGPUMode(state.mode); }

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
    const rotate = opts.rotate ?? Number(rotateSelect.value);
    const flipX = opts.flipX ?? flipXInput.checked;
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
    let bonus = 0;
    for (const ff of state.forceFields) {
      const dist = Math.sqrt((col - ff.x) ** 2 + (row - ff.y) ** 2);
      if (dist < ff.radius) {
        const t = 1 - dist / ff.radius;
        const delta = Math.round(ff.strength * t);
        bonus += ff.type === "attract" ? delta : -delta;
      }
    }
    return bonus;
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
    for (const [k, v] of valueMap) {
      const [c, r] = parseKey(k);
      for (const [dc, dr] of offsets) {
        const nk = surface.cellKey(c + dc, r + dr);
        if (nk) neighborSums.set(nk, (neighborSums.get(nk) || 0) + v);
      }
    }
    // Ensure every existing cell is in the sum map (even if neighbors didn't reach it)
    for (const k of valueMap.keys()) {
      if (!neighborSums.has(k)) neighborSums.set(k, 0);
    }

    // Growth function: Gaussian around mu
    const nextMap = new Map();
    for (const [k, sum] of neighborSums) {
      const u = sum / nCount;
      const g = Math.exp(-0.5 * ((u - mu) / sigma) ** 2);
      const old = valueMap.get(k) ?? 0;
      const nv = Math.max(0, Math.min(1, old + dt * (2 * g - 1)));
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
    for (const k of alive) {
      const [c, r] = parseKey(k);
      const w = (repulse && (cellAgeMap.get(k) ?? 0) >= repulseAge) ? -repulseStrength : 1;
      for (const [dc, dr] of offsets) {
        const nk = surface.cellKey(c + dc, r + dr);
        if (nk !== null) neighborCounts.set(nk, (neighborCounts.get(nk) || 0) + w);
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
        for (const [dc, dr] of offsets) {
          const nk = surface.cellKey(c + dc, r + dr);
          if (nk === null) continue;
          if (isA) countsA.set(nk, (countsA.get(nk) || 0) + w);
          else countsB.set(nk, (countsB.get(nk) || 0) + w);
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
      const hasZone   = state.rulesZoneEnabled;
      const hasFields = state.forceFields.length > 0;
      const adjusted  = densityBonus !== 0 || hasZone || hasFields;

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
          const inZone2 = hasZone && (state.rulesZoneAxis === "x"
            ? col >= state.rulesZoneOffset
            : row >= state.rulesZoneOffset);
          const born    = inZone2 ? state.rulesZoneRuleB2 : state.ruleB;
          const survive = inZone2 ? state.rulesZoneRuleS2 : state.ruleS;
          const adj = Math.max(0, n + (hasFields ? getFieldBonus(col, row) : 0) + densityBonus);
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
      spherePlacePrefab(id, cell.col, cell.row);
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
    const cells = transformCells(prefab.cells, Number(rotateSelect.value), flipXInput.checked);
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

  // GPU world has Y-up (GL convention) — screen Y must be negated
  function screenToGPUWorld(px, py) {
    return {
      x:  (px - canvas.width  / 2) / state.zoom + state.cameraX,
      y: -(py - canvas.height / 2) / state.zoom + state.cameraY,
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

  function drawManifoldBorder() {
    if (is3DMode()) return;
    const surface = activeSurface();
    if (surface === SURFACES.flat) return;
    const tl = worldToScreen(0, 0);
    const br = worldToScreen(SPHERE_COLS, SPHERE_ROWS);
    const w = br.x - tl.x, h = br.y - tl.y;
    ctx.save();
    ctx.strokeStyle = "rgba(91,224,188,0.22)";
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(tl.x, tl.y, w, h);
    ctx.setLineDash([]);
    // Tick marks to hint at identification direction
    const mid = { x: tl.x + w / 2, y: tl.y + h / 2 };
    ctx.strokeStyle = "rgba(91,224,188,0.45)";
    ctx.lineWidth = 1.5;
    const t = 8; // tick half-length
    // Top edge arrow (→)
    ctx.beginPath(); ctx.moveTo(mid.x - t, tl.y); ctx.lineTo(mid.x + t, tl.y); ctx.stroke();
    // Bottom edge arrow: same direction for torus/cylinder, opposite for klein/mobius
    const flipY = surface === SURFACES.klein || surface === SURFACES.mobius;
    ctx.beginPath(); ctx.moveTo(mid.x + (flipY ? t : -t), br.y); ctx.lineTo(mid.x + (flipY ? -t : t), br.y); ctx.stroke();
    // Left edge arrow (↓)
    ctx.beginPath(); ctx.moveTo(tl.x, mid.y - t); ctx.lineTo(tl.x, mid.y + t); ctx.stroke();
    // Right edge: same for torus/klein, opposite for rp2
    const flipX = surface === SURFACES.rp2;
    ctx.beginPath(); ctx.moveTo(br.x, mid.y + (flipX ? t : -t)); ctx.lineTo(br.x, mid.y + (flipX ? -t : t)); ctx.stroke();
    ctx.restore();
  }

  function drawZoneBoundary() {
    if (!state.rulesZoneEnabled) return;
    ctx.save();
    ctx.strokeStyle = "rgba(242,184,75,0.45)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    if (state.rulesZoneAxis === "x") {
      const sx = worldToScreen(state.rulesZoneOffset, 0).x;
      ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, canvas.height); ctx.stroke();
      ctx.setLineDash([]); ctx.fillStyle = "rgba(242,184,75,0.6)"; ctx.font = "11px monospace";
      ctx.fillText("Zone 1", Math.max(4, sx - 54), 14);
      ctx.fillText("Zone 2", sx + 5, 14);
    } else {
      const sy = worldToScreen(0, state.rulesZoneOffset).y;
      ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(canvas.width, sy); ctx.stroke();
      ctx.setLineDash([]); ctx.fillStyle = "rgba(242,184,75,0.6)"; ctx.font = "11px monospace";
      ctx.fillText("Zone 1", 6, Math.max(14, sy - 4));
      ctx.fillText("Zone 2", 6, sy + 14);
    }
    ctx.restore();
  }

  function drawForceFields() {
    if (state.forceFields.length === 0 && (!state.canvasMode === "force" || !state.hoverCell)) return;
    for (const ff of state.forceFields) {
      const sc = worldToScreen(ff.x, ff.y);
      const cx = sc.x + state.zoom * 0.5;
      const cy = sc.y + state.zoom * 0.5;
      const r  = ff.radius * state.zoom;
      const rgb = ff.type === "attract" ? "91,224,188" : "255,107,107";
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${rgb},0.07)`; ctx.fill();
      ctx.strokeStyle = `rgba(${rgb},0.5)`; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${rgb},0.9)`; ctx.fill();
    }
    if (state.canvasMode === "force" && state.hoverCell) {
      const sc  = worldToScreen(state.hoverCell.x, state.hoverCell.y);
      const cx  = sc.x + state.zoom * 0.5;
      const cy  = sc.y + state.zoom * 0.5;
      const r   = state.forcePaintRadius * state.zoom;
      const rgb = state.forcePaintType === "attract" ? "91,224,188" : "255,107,107";
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${rgb},0.7)`; ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]); ctx.stroke();
      ctx.restore();
    }
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

  function draw() {
    if (isGPUMode()) {
      ASF.blit(ctx, canvas.width, canvas.height, state.cameraX, state.cameraY, state.zoom);
      drawNotebookPins();
      drawHover();
      return;
    }
    drawBackground();
    drawGrid();
    drawCells();
    drawZoneBoundary();
    drawForceFields();
    drawZones();
    drawManifoldBorder();
    drawSelection();
    drawNotebookPins();
    drawHover();
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

    if (state.mode === "arcade" && state.levelState) {
      const level = LEVELS[state.levelIndex];
      objectiveText.textContent = `${level.objective} ${level.progress(state.levelState)}`;
    } else if (isGPUMode()) {
      const spec = window.ASF && ASF.SPECS[state.mode];
      const name = spec ? spec.name : state.mode;
      objectiveText.textContent = `${name} — GPU shader engine · Paint to add life · Pan to explore.`;
    } else if (is3DMode()) {
      const surface = SURFACES[state.mode];
      const surfName = surface ? surface.name : "Sphere";
      objectiveText.textContent = `${surfName} — left-click to draw, right-drag to spin.`;
    } else {
      const surface = activeSurface();
      objectiveText.textContent = `${surface.name}: ${surface.desc}`;
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
    if (isGPUMode()) {
      ASF.step();
      state.generation += 1;
      if (state.notebook.autoEnabled && state.generation % 30 === 0) nbCheckAutoGPU();
      // Adaptive carrying-capacity control
      if (state.gpuAdaptive && state.gpuAdaptive.enabled && state.generation % 45 === 0) {
        const measured = ASF.estimateDensity();
        const target = state.gpuAdaptive.target;
        const str    = state.gpuAdaptive.strength;
        const err    = measured - target;
        const specId = ASF.getActiveSpecId();
        if (specId === 'lenia' || specId === 'lenia-mc2') {
          // Adjust mu: push toward target density via PI-like nudge on growth center
          const mu = ASF.getParam('mu') || 0.135;
          const newMu = Math.max(0.04, Math.min(0.45, mu + str * err));
          ASF.setParam('mu', newMu);
          const muEl = document.getElementById('asfMu');
          const muOut = document.getElementById('asfMuOut');
          if (muEl) { muEl.value = newMu; if (muOut) muOut.textContent = newMu.toFixed(4); }
        } else if (specId === 'smoothlife') {
          const dt = ASF.getParam('dt') || 0.05;
          ASF.setParam('dt', Math.max(0.005, Math.min(0.2, dt - str * err * 0.5)));
        }
        // If density collapses entirely, reseed
        if (measured < target * 0.12) {
          ASF.randomize(target * 0.4);
        }
        const rdEl = document.getElementById('asfDensityReading');
        if (rdEl) rdEl.textContent = `density: ${measured.toFixed(3)}`;
      }
      return;
    }
    if (state.leniaMode) stepLenia();
    else stepLife();
    snapshotNow();
    if (state.notebook.autoEnabled && state.generation % 30 === 0) nbCheckAuto();
  }

  function nbCheckAutoGPU() {
    // Lightweight GPU mode auto-detection using generation counter as proxy
    // Full pixel readback is expensive; only check every 150 gens
    if (state.generation % 150 !== 0) return;
    const gen = state.generation;
    const nb = state.notebook;
    const w = nb._watch;
    if (gen - (w._lastAutoGenGPU || -Infinity) < 120) return;
    w._lastAutoGenGPU = gen;
    nbPushAutoFeed(gen, 0, `Gen ${gen} — GPU automaton running (${ASF.getActiveSpecId()})`);
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
    updateTimeline();

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
    state.cameraX = 90;
    state.cameraY = 45;

    seedFromPattern("gosper", 32, 30);
    seedFromPattern("gosper", 112, 61, { rotate: 180 });
    seedFromPattern("lwss", 78, 67);
    seedFromPattern("glider", 60, 21);
    seedFromPattern("glider", 64, 24);
    seedFromPattern("glider", 67, 27);
    seedFromPattern("eater1", 102, 35);
    seedFromPattern("beacon", 92, 51);
    seedFromPattern("pinwheel-seed", 84, 41);
    seedFromPattern("spark-crab", 108, 49);
    snapshotNow();
    setOverlay("Demo loaded: dual gun crossfire in the lab.");
    setTimeout(() => setOverlay(""), 2200);
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

  function setCanvasMode(mode) {
    // Restore lifted cells when leaving select mid-move
    if (state.canvasMode === "select" && state._selMoving && state._selCells) {
      const sel = state.selection;
      for (const [ox, oy] of state._selCells) setCell(sel.x + ox, sel.y + oy, true);
      state._selCells = null;
      state._selMoving = false;
      state._selMoveDelta = { dx: 0, dy: 0 };
    }

    state.canvasMode = mode;

    const cursors = { paint: "crosshair", move: "grab", select: "crosshair", force: "crosshair" };
    canvas.style.cursor = cursors[mode] || "default";

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

    // GPU mode: paint by writing into the state texture
    if (isGPUMode() && state.canvasMode === "paint") {
      if (ev.button === 0 || ev.button === 2) {
        const rect = canvas.getBoundingClientRect();
        const wp = screenToGPUWorld(ev.clientX - rect.left, ev.clientY - rect.top);
        const [gW, gH] = ASF.getWorldSize();
        if (wp.x >= 0 && wp.x < gW && wp.y >= 0 && wp.y < gH) {
          const value = ev.button === 2 ? 0.0 : 1.0;
          ASF.paintAt(wp.x, wp.y, 10, value);
        }
        ev.preventDefault();
        return;
      }
      if (ev.button === 1) { state.pointer.mode = "pan"; return; }
      return;
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
      } else {
        state.pointer.mode = "select";
        state._selCells = null;
        state._selMoving = false;
        state._selMoveDelta = { dx: 0, dy: 0 };
        state._selStartCell = { x: cx, y: cy };
        state.selection = { x: cx, y: cy, w: 0, h: 0 };
      }
      return;
    }

    if (state.canvasMode === "force") {
      state.pointer.mode = null;
      if (ev.button === 2) {
        state.forceFields = state.forceFields.filter((ff) =>
          Math.sqrt((gxgy.x - ff.x) ** 2 + (gxgy.y - ff.y) ** 2) > ff.radius * 0.5);
      } else {
        state.forceFields.push({
          id: Date.now() + Math.random(),
          x: gxgy.x, y: gxgy.y,
          radius: state.forcePaintRadius,
          strength: state.forcePaintStrength,
          type: state.forcePaintType,
        });
      }
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

    // Update cursor when hovering (not dragging)
    if (!state.pointer.down) {
      if (state.canvasMode === "select") {
        const sel = state.selection;
        const hc = state.hoverCell;
        const overSel = sel && sel.w > 0 && hc
          && hc.x >= sel.x && hc.x < sel.x + sel.w
          && hc.y >= sel.y && hc.y < sel.y + sel.h;
        canvas.style.cursor = overSel ? "move" : "crosshair";
      } else if (state.canvasMode === "move") {
        canvas.style.cursor = "grab";
      }
    }

    if (!state.pointer.down) return;

    const dx = ev.clientX - state.pointer.lastX;
    const dy = ev.clientY - state.pointer.lastY;
    state.pointer.lastX = ev.clientX;
    state.pointer.lastY = ev.clientY;

    if (state.pointer.mode === "pan") {
      state.cameraX -= dx / state.zoom;
      // GPU world is Y-up so pan direction flips
      state.cameraY += (isGPUMode() ? 1 : -1) * dy / state.zoom;
      return;
    }

    // GPU drag-paint
    if (isGPUMode() && state.canvasMode === "paint" && state.pointer.down) {
      const rect = canvas.getBoundingClientRect();
      const wp = screenToGPUWorld(ev.clientX - rect.left, ev.clientY - rect.top);
      const [gW, gH] = ASF.getWorldSize();
      if (wp.x >= 0 && wp.x < gW && wp.y >= 0 && wp.y < gH) {
        const value = (ev.buttons & 2) ? 0.0 : 1.0;
        ASF.paintAt(wp.x, wp.y, 10, value);
      }
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

    if (state.pointer.mode === "paint") {
      const gxgy = screenToGrid(ev.clientX - rect.left, ev.clientY - rect.top);
      setCell(gxgy.x, gxgy.y, state.pointer.paintValue === 1);
    }
  }

  function handlePointerUp(ev) {
    if (canvas.hasPointerCapture(ev.pointerId)) {
      canvas.releasePointerCapture(ev.pointerId);
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

    const toWorld = isGPUMode() ? screenToGPUWorld : screenToWorld;
    const before = toWorld(mx, my);
    const zoomFactor = ev.deltaY < 0 ? 1.12 : 1 / 1.12;
    if (isGPUMode()) {
      state.zoom = Math.max(0.15, Math.min(12, state.zoom * zoomFactor));
    } else {
      state.zoom = Math.max(4, Math.min(60, state.zoom * zoomFactor));
    }
    const after = toWorld(mx, my);
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
    card.draggable = true;
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
    card.addEventListener("dragend", () => { state.draggingPrefabId = null; });
    return card;
  }

  function buildPalette(query = "") {
    paletteList.innerHTML = "";
    const q = query.trim().toLowerCase();
    const matches = (p) => !q || p.name.toLowerCase().includes(q)
      || (p.type || "").toLowerCase().includes(q)
      || (p.desc || "").toLowerCase().includes(q)
      || (p.category || "").toLowerCase().includes(q);

    const customs = lsLoad(LS_CUSTOM_PREFABS).filter(matches);
    const builtins = PREFABS.filter(matches);

    if (customs.length === 0 && builtins.length === 0) {
      const empty = document.createElement("p");
      empty.className = "palette-empty";
      empty.textContent = `No patterns match "${query}"`;
      paletteList.appendChild(empty);
      return;
    }

    if (customs.length > 0) {
      const hdr = document.createElement("div");
      hdr.className = "palette-section-hdr";
      hdr.textContent = "Custom";
      paletteList.appendChild(hdr);
      for (const p of [...customs].reverse()) paletteList.appendChild(makePaletteCard(p, true));
    }

    const sections = ["Required", "Custom", "Circuit"];
    const bySection = Object.fromEntries(sections.map(s => [s, builtins.filter(p => p.category === s)]));

    if (q) {
      if (customs.length > 0 && builtins.length > 0) {
        const hdr2 = document.createElement("div");
        hdr2.className = "palette-section-hdr";
        hdr2.textContent = "Built-in";
        paletteList.appendChild(hdr2);
      }
      for (const p of builtins) paletteList.appendChild(makePaletteCard(p, false));
    } else {
      if (customs.length > 0) {
        const hdr2 = document.createElement("div");
        hdr2.className = "palette-section-hdr";
        hdr2.textContent = "Built-in";
        paletteList.appendChild(hdr2);
      }
      for (const sec of sections) {
        if (bySection[sec].length === 0) continue;
        const hdr = document.createElement("div");
        hdr.className = "palette-section-hdr palette-section-hdr--sub";
        hdr.textContent = sec;
        paletteList.appendChild(hdr);
        for (const p of bySection[sec]) paletteList.appendChild(makePaletteCard(p, false));
      }
    }

    const allVisible = [...lsLoad(LS_CUSTOM_PREFABS).filter(matches).reverse(), ...builtins];
    const firstPrefab = allVisible[0] ? (getPrefabById(allVisible[0].id) || allVisible[0]) : PREFABS[0];
    const currentVisible = allVisible.some(p => p.id === state.selectedPrefabId);
    if (!currentVisible) {
      state.selectedPrefabId = firstPrefab.id;
      renderInspector(firstPrefab);
    }
    refreshPaletteSelection();
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
    // Mode toolbar
    document.querySelectorAll(".mode-btn").forEach((btn) => {
      btn.addEventListener("click", () => setCanvasMode(btn.dataset.mode));
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
      const prevMode = state.mode;
      state.mode = modeSelect.value;

      // Tear down GPU if leaving a GPU mode
      if (window.ASF && ASF.isGPUMode(prevMode) && !ASF.isGPUMode(state.mode)) {
        ASF.deactivate();
        asfPanelSetVisible(false);
      }

      if (isGPUMode()) {
        canvas.style.display = "block";
        sphereCanvas.style.display = "none";
        state.levelState = null;
        setOverlay("");
        const ok = ASF.activate(state.mode);
        if (!ok) {
          setOverlay("WebGL 2 not available — GPU modes require a modern browser.");
          state.mode = "sandbox";
          modeSelect.value = "sandbox";
        } else {
          // Center camera on GPU world with a fit-to-screen zoom
          const [gW, gH] = ASF.getWorldSize();
          state.cameraX = gW / 2;
          state.cameraY = gH / 2;
          state.zoom    = Math.min(canvas.width / gW, canvas.height / gH) * 0.88;
          asfPanelSetVisible(true);
          asfSyncPanel();
        }
      } else if (is3DMode()) {
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

    rotateSelect.addEventListener("change", () => {
      draw();
    });
    flipXInput.addEventListener("change", () => {
      draw();
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
          syncPlayUI(!state.running, false);
        }
        state.keys.spaceDown = true;
        ev.preventDefault();
        return;
      }

      if (ev.target && ["INPUT", "SELECT", "TEXTAREA"].includes(ev.target.tagName)) {
        return;
      }

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

      if ((ev.key === "Delete" || ev.key === "Backspace") && hasSel) {
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
      } else if (ev.key === "Escape") {
        setCanvasMode("paint");
        state.selection = null;
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
    });

    kernelRadiusEl.addEventListener("input", () => {
      state.kernelRadius = Number(kernelRadiusEl.value);
      kernelRadiusOut.textContent = kernelRadiusEl.value;
      _kernelOffsets = null;
      _kernelCacheKey = null;
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
      rulesZoneEnabled: state.rulesZoneEnabled,
      rulesZoneAxis: state.rulesZoneAxis,
      rulesZoneOffset: state.rulesZoneOffset,
      rulesZoneRuleB2: [...state.rulesZoneRuleB2],
      rulesZoneRuleS2: [...state.rulesZoneRuleS2],
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
    if (cfg.rulesZoneEnabled     !== undefined) state.rulesZoneEnabled     = cfg.rulesZoneEnabled;
    if (cfg.rulesZoneAxis        !== undefined) state.rulesZoneAxis        = cfg.rulesZoneAxis;
    if (cfg.rulesZoneOffset      !== undefined) state.rulesZoneOffset      = cfg.rulesZoneOffset;
    if (cfg.rulesZoneRuleB2) state.rulesZoneRuleB2 = new Set(cfg.rulesZoneRuleB2);
    if (cfg.rulesZoneRuleS2) state.rulesZoneRuleS2 = new Set(cfg.rulesZoneRuleS2);
    if (cfg.forceFields          !== undefined) state.forceFields          = cfg.forceFields.map((ff) => ({ ...ff }));
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

    // Zone lab
    sc("zoneEnabled",   state.rulesZoneEnabled);
    sv("zoneAxis",      state.rulesZoneAxis);
    sv("zoneOffset",    state.rulesZoneOffset);
    st("zoneOffsetOut", state.rulesZoneOffset);
    sv("zoneRule2",     ruleToString(state.rulesZoneRuleB2, state.rulesZoneRuleS2));

    // Field lab
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

  function setupZoneLab() {
    const enableEl  = document.getElementById("zoneEnabled");
    const axisEl    = document.getElementById("zoneAxis");
    const offsetEl  = document.getElementById("zoneOffset");
    const offsetOut = document.getElementById("zoneOffsetOut");
    const rule2El   = document.getElementById("zoneRule2");
    if (!enableEl) return;

    enableEl.addEventListener("change", (e) => { state.rulesZoneEnabled = e.target.checked; });
    axisEl.addEventListener("change", () => { state.rulesZoneAxis = axisEl.value; });
    offsetEl.addEventListener("input", () => {
      state.rulesZoneOffset = Number(offsetEl.value);
      offsetOut.textContent = offsetEl.value;
    });
    rule2El.addEventListener("change", () => {
      const r = parseRule(rule2El.value);
      if (r) { state.rulesZoneRuleB2 = r.B; state.rulesZoneRuleS2 = r.S; }
      else { rule2El.style.borderColor = "var(--danger)"; setTimeout(() => { rule2El.style.borderColor = ""; }, 600); }
    });
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
      setCanvasMode(state.canvasMode === "force" ? "paint" : "force");
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
    clearBtn.addEventListener("click", () => { state.forceFields = []; });
    densityEl.addEventListener("change", (e) => { state.densityFeedback = e.target.checked; });
    dTargetEl.addEventListener("input", () => {
      state.densityTarget = Number(dTargetEl.value);
      dTargetOut.textContent = dTargetEl.value;
    });
    dStrengthEl.addEventListener("input", () => {
      state.densityStrength = Number(dStrengthEl.value);
      dStrengthOut.textContent = dStrengthEl.value;
    });
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
      setOverlay("Notebook playback complete.");
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
      setOverlay("Notebook is empty — nothing to export.");
      setTimeout(() => setOverlay(""), 2000);
      return;
    }
    const lines = [
      "AUTOMATA ARCADE — NOTEBOOK",
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
      setOverlay("Notebook copied to clipboard.");
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

  // ─── ASF panel ────────────────────────────────────────────────────────────

  function asfPanelSetVisible(show) {
    const panel = document.getElementById("asfPanel");
    const body  = document.getElementById("inspectorBody");
    if (!panel || !body) return;
    panel.style.display = show ? "" : "none";
    body.style.display  = show ? "none" : "";
  }

  function asfSyncPanel() {
    if (!window.ASF) return;
    const specId = ASF.getActiveSpecId();
    const spec   = ASF.SPECS[specId];
    if (!spec) return;
    const nameEl = document.getElementById("asfModeName");
    if (nameEl) nameEl.textContent = spec.name;
    // Show/hide sections based on spec type
    const lSec = document.getElementById("asfLeniaSection");
    const gSec = document.getElementById("asfGsSection");
    const isGS = specId === "gray-scott";
    if (lSec) lSec.style.display = isGS ? "none" : "";
    if (gSec) gSec.style.display = isGS ? ""     : "none";
    // Sync slider values from pipeline
    const syncSlider = (id, outId, key) => {
      const el = document.getElementById(id);
      const out = document.getElementById(outId);
      const val = ASF.getParam(key);
      if (el && val !== undefined) { el.value = val; if (out) out.textContent = Number(val).toFixed(4); }
    };
    syncSlider("asfMu",    "asfMuOut",    "mu");
    syncSlider("asfSigma", "asfSigmaOut", "sigma");
    syncSlider("asfDt",    "asfDtOut",    "dt");
    syncSlider("asfF",     "asfFOut",     "F");
    syncSlider("asfK",     "asfKOut",     "K");
    // Populate creature list
    const list = document.getElementById("asfCreatureList");
    if (list && ASF.CREATURES) {
      list.innerHTML = "";
      ASF.CREATURES.filter(c => c.specId === specId).forEach(c => {
        const btn = document.createElement("button");
        btn.className = "asf-creature-btn";
        btn.textContent = c.name;
        btn.title = c.desc;
        btn.addEventListener("click", () => {
          const [W, H] = ASF.getWorldSize();
          ASF.spawnCreature(c.id, W/2, H/2);
        });
        list.appendChild(btn);
      });
    }
    // Rebuild kernel cards
    buildKernelCards();
    // Sync GLSL editor visibility and content
    const glslSec = document.getElementById("asfGlslSection");
    const glslEditor = document.getElementById("asfGlslEditor");
    const glsl = ASF.getGrowthGlsl();
    if (glslSec) glslSec.style.display = glsl !== null ? "" : "none";
    if (glslEditor && glsl !== null) glslEditor.value = glsl.trim();
    // Clear compile status on spec change
    const statusEl = document.getElementById("asfGlslStatus");
    const errorEl  = document.getElementById("asfGlslError");
    if (statusEl) { statusEl.textContent = ""; statusEl.className = "asf-glsl-status"; }
    if (errorEl)  errorEl.textContent = "";
  }

  function buildKernelCards() {
    const list = document.getElementById("asfKernelList");
    if (!list || !window.ASF || !ASF.isReady()) return;
    const n = ASF.getKernelCount();
    list.innerHTML = "";
    for (let i = 0; i < n; i++) {
      const k = ASF.getKernelParams(i);
      if (!k) continue;
      const card = document.createElement("div");
      card.className = "asf-kernel-card";

      const typeTag = document.createElement("span");
      typeTag.className = "asf-kernel-type";
      typeTag.textContent = `K${i}: ${k.type}`;
      card.appendChild(typeTag);

      card.appendChild(makeKernelSVG(k));

      card.appendChild(makeKernelSliderRow("Radius", k.radius, 5, 50, 1, (v) => {
        ASF.setKernelParam(i, "radius", v | 0);
        refreshKernelCard(card, i);
      }));
      if (k.type === "ring") {
        card.appendChild(makeKernelSliderRow("Inner", k.innerFrac, 0, 0.9, 0.05, (v) => {
          ASF.setKernelParam(i, "innerFrac", v);
          refreshKernelCard(card, i);
        }));
        card.appendChild(makeKernelSliderRow("Alpha", k.alpha, 1, 8, 0.25, (v) => {
          ASF.setKernelParam(i, "alpha", v);
          refreshKernelCard(card, i);
        }));
      }
      list.appendChild(card);
    }
  }

  function refreshKernelCard(card, idx) {
    const k = ASF.getKernelParams(idx);
    if (!k) return;
    const old = card.querySelector(".asf-kernel-svg");
    if (old) card.replaceChild(makeKernelSVG(k), old);
  }

  function makeKernelSVG(k) {
    const W = 120, H = 36, pad = 2;
    const pts = [];
    for (let i = 0; i <= 80; i++) {
      const r = i / 80;
      let w = 0;
      if (k.type === "disk") {
        w = r <= 1.0 ? 1.0 : 0.0;
      } else if (k.type === "ring") {
        const inner = k.innerFrac || 0;
        if (r > inner && r < 1.0) {
          const u = (r - inner) / (1.0 - inner + 1e-9);
          w = Math.exp((k.alpha || 4) * (1.0 - 1.0 / (4 * u * (1 - u) + 1e-6)));
        }
      }
      pts.push(`${(r * (W - pad * 2) + pad).toFixed(1)},${(H - pad - w * (H - pad * 3)).toFixed(1)}`);
    }
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("width", W);
    svg.setAttribute("height", H);
    svg.classList.add("asf-kernel-svg");
    const pl = document.createElementNS(ns, "polyline");
    pl.setAttribute("points", pts.join(" "));
    pl.setAttribute("fill", "none");
    pl.setAttribute("stroke", "#5be0bc");
    pl.setAttribute("stroke-width", "1.5");
    pl.setAttribute("stroke-linejoin", "round");
    svg.appendChild(pl);
    return svg;
  }

  function makeKernelSliderRow(label, val, min, max, step, onChange) {
    const row = document.createElement("label");
    row.className = "asf-row";
    const sp = document.createElement("span");
    sp.textContent = label;
    row.appendChild(sp);
    const input = document.createElement("input");
    input.type = "range"; input.min = min; input.max = max;
    input.step = step; input.value = val;
    input.className = "asf-slider";
    const out = document.createElement("span");
    out.className = "asf-val";
    out.textContent = Number(val).toFixed(2);
    input.addEventListener("input", () => {
      const v = Number(input.value);
      out.textContent = v.toFixed(2);
      onChange(v);
    });
    row.appendChild(input);
    row.appendChild(out);
    return row;
  }

  function setupASF() {
    if (!window.ASF) return;

    const slider = (id, outId, key, format) => {
      const el  = document.getElementById(id);
      const out = document.getElementById(outId);
      if (!el) return;
      el.addEventListener("input", () => {
        const v = Number(el.value);
        if (out) out.textContent = (format || (x => x.toFixed(4)))(v);
        ASF.setParam(key, v);
      });
    };

    slider("asfMu",    "asfMuOut",    "mu");
    slider("asfSigma", "asfSigmaOut", "sigma");
    slider("asfDt",    "asfDtOut",    "dt");
    slider("asfF",     "asfFOut",     "F");
    slider("asfK",     "asfKOut",     "K");

    const densEl = document.getElementById("asfDensity");
    const densOut = document.getElementById("asfDensityOut");
    if (densEl) {
      densEl.addEventListener("input", () => {
        if (densOut) densOut.textContent = Number(densEl.value).toFixed(2);
      });
    }

    document.getElementById("asfRandomizeBtn")?.addEventListener("click", () => {
      const density = densEl ? Number(densEl.value) : 0.15;
      ASF.randomize(density);
    });

    document.getElementById("asfClearBtn")?.addEventListener("click", () => {
      if (!window.ASF || !ASF.isReady()) return;
      const specId = ASF.getActiveSpecId();
      if (specId === "gray-scott") {
        ASF.activate("gray-scott"); // re-seed with GS initial condition
        asfSyncPanel();
      } else {
        ASF.randomize(0.0001); // near-zero density = effectively clear
      }
    });

    document.getElementById("asfColormap")?.addEventListener("change", (e) => {
      ASF.recompileDisplay(e.target.value);
    });

    // Gray-Scott presets
    document.querySelectorAll(".asf-gs-preset").forEach(btn => {
      btn.addEventListener("click", () => {
        const F = parseFloat(btn.dataset.f);
        const K = parseFloat(btn.dataset.k);
        ASF.setParam("F", F);
        ASF.setParam("K", K);
        const fEl = document.getElementById("asfF");
        const kEl = document.getElementById("asfK");
        if (fEl) { fEl.value = F; document.getElementById("asfFOut").textContent = F.toFixed(4); }
        if (kEl) { kEl.value = K; document.getElementById("asfKOut").textContent = K.toFixed(4); }
        // Re-seed for new params
        ASF.activate(ASF.getActiveSpecId());
        asfSyncPanel();
      });
    });

    // Edge/structural highlight slider
    const edgeEl  = document.getElementById("asfEdgeStr");
    const edgeOut = document.getElementById("asfEdgeStrOut");
    if (edgeEl) {
      edgeEl.addEventListener("input", () => {
        const v = Number(edgeEl.value);
        if (edgeOut) edgeOut.textContent = v.toFixed(1);
        ASF.setParam("edgeStr", v);
      });
    }

    // Adaptive density controls
    if (!state.gpuAdaptive) {
      state.gpuAdaptive = { enabled: false, target: 0.15, strength: 0.008 };
    }
    const adaptCheck  = document.getElementById("asfAdaptiveEnabled");
    const adaptTarget = document.getElementById("asfAdaptiveTarget");
    const adaptStr    = document.getElementById("asfAdaptiveStr");
    const adaptTOut   = document.getElementById("asfAdaptiveTargetOut");
    const adaptSOut   = document.getElementById("asfAdaptiveStrOut");
    if (adaptCheck) {
      adaptCheck.checked = state.gpuAdaptive.enabled;
      adaptCheck.addEventListener("change", () => {
        state.gpuAdaptive.enabled = adaptCheck.checked;
      });
    }
    if (adaptTarget) {
      adaptTarget.value = state.gpuAdaptive.target;
      adaptTarget.addEventListener("input", () => {
        state.gpuAdaptive.target = Number(adaptTarget.value);
        if (adaptTOut) adaptTOut.textContent = Number(adaptTarget.value).toFixed(2);
      });
    }
    if (adaptStr) {
      adaptStr.value = state.gpuAdaptive.strength;
      adaptStr.addEventListener("input", () => {
        state.gpuAdaptive.strength = Number(adaptStr.value);
        if (adaptSOut) adaptSOut.textContent = Number(adaptStr.value).toFixed(4);
      });
    }

    // GLSL growth editor
    const glslCompileBtn = document.getElementById("asfGlslCompileBtn");
    const glslStatusEl   = document.getElementById("asfGlslStatus");
    const glslErrorEl    = document.getElementById("asfGlslError");
    const glslEditorEl   = document.getElementById("asfGlslEditor");
    if (glslCompileBtn && glslEditorEl) {
      glslCompileBtn.addEventListener("click", () => {
        if (!window.ASF || !ASF.isReady()) return;
        const result = ASF.recompileGrowth(glslEditorEl.value);
        if (result.ok) {
          glslStatusEl.textContent = "OK";
          glslStatusEl.className = "asf-glsl-status asf-glsl-ok";
          if (glslErrorEl) glslErrorEl.textContent = "";
        } else {
          glslStatusEl.textContent = "Error";
          glslStatusEl.className = "asf-glsl-status asf-glsl-err";
          if (glslErrorEl) glslErrorEl.textContent = result.error.slice(0, 500);
        }
      });
    }
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
    setupLibrary();
    setupCaptureLab();
    setupAnalysisLab();
    setupNotebook();
    setupASF();
    buildPalette();
    const paletteSearchEl = document.getElementById("paletteSearch");
    if (paletteSearchEl) {
      paletteSearchEl.addEventListener("input", () => buildPalette(paletteSearchEl.value));
    }
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    loadDemo();
    requestAnimationFrame(runTick);
  }

  init();
})();
