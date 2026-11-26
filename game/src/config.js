// config.js — one job: every tunable number and named constant for NUSA RESCUE.
// Nothing here touches the DOM, the renderer, or game state.
export const CONFIG = {
  seed: 1,
  worldSize: 4400,          // playable sea, metres across (square, centred on 0,0)
  seaLevel: 0,
  gravity: 9.8,

  // Flight model (arcade, forgiving — a rescue plane, not a simulator)
  maxSpeed: 72,             // m/s at full throttle (~260 km/h)
  cruiseSpeed: 46,
  takeoffSpeed: 24,         // m/s needed to leave water / runway
  stallSpeed: 18,           // below this the nose drops
  climbRate: 9,             // m/s at full pull-up and speed
  sinkRate: 6,
  rollRate: 1.9,            // rad/s at full aileron
  pitchRate: 0.9,           // rad/s
  turnRate: 0.55,           // rad/s of heading per rad of bank
  throttleStep: 0.55,       // per second holding W/S
  fuelCapacity: 100,
  fuelBurn: 0.55,           // % per second at full throttle (scaled by throttle)
  fuelBurnIdle: 0.06,
  maxDamage: 100,
  stormDamage: 9,           // damage per second inside a storm cell
  hardLandingVs: 7,         // vertical speed (m/s) above which a touchdown hurts
  crashVs: 11,              // vertical speed above which a touchdown is a crash

  // Missions
  pickupRadius: 55,         // metres from stranded islanders to pick up
  pickupSpeed: 12,          // must be slower than this (m/s) on the water
  dropRadius: 60,           // metres from village centre for a good supply drop
  dropAltMin: 25,
  dropAltMax: 120,
  ringRadius: 26,           // navigation / gate ring radius
  ringPassRadius: 24,
  gateTimeLimit: 150,       // seconds for a gate run
  missionTimeBonus: 500,

  // Scoring
  scoreRescue: 1000,
  scoreDrop: 800,
  scoreRing: 250,
  scoreGateRun: 1200,
  scoreLandingBonus: 300,

  // Camera
  chaseDistance: 26,
  chaseHeight: 7,
  cameraLerp: 4.5,
};

export const COLOURS = {
  skyDawn: 0xffb36b,
  skyDay: 0x8ec9e8,
  sea: 0x1e7fa8,
  seaDeep: 0x0e5a80,
  sand: 0xe8d29a,
  grass: 0x4da64d,
  jungle: 0x2f7d3a,
  rock: 0x8a7f72,
  runway: 0x3a3f46,
  planeWhite: 0xf5f2ea,
  planeOrange: 0xff6b1a,
  planeRed: 0xd7263d,
  ring: 0xffa726,
  marker: 0xffe14d,
  storm: 0x3d4450,
};

// Mission script — a 6-sortie campaign, then it loops with harder timers.
export const MISSION_SCRIPT = [
  { type: 'rescue', island: 'Karang', title: 'Rescue — Pulau Karang',
    brief: 'Two islanders are stranded on the beach. Land on the water beside them (slow!) and bring them home.' },
  { type: 'drop', island: 'Nusa', title: 'Supply Drop — Pulau Nusa',
    brief: 'The village on Pulau Nusa needs medicine. Fly over the marked circle (25–120 m) and press SPACE to drop the crate.' },
  { type: 'gates', island: 'Senja', title: 'Gate Run — Senja Strait',
    brief: 'A storm is coming. Thread all 5 nav gates before the timer runs out.' },
  { type: 'rescue', island: 'Ombak', title: 'Rescue — Pulau Ombak',
    brief: 'A fisherman is stranded near the reef. Water-land beside the smoke signal and bring him home.' },
  { type: 'drop', island: 'Kecil', title: 'Supply Drop — Pulau Kecil',
    brief: 'Drop food and water on the marked circle on Pulau Kecil. Keep your altitude between 25 and 120 m.' },
  { type: 'gates', island: 'Badai', title: 'Gate Run — Storm Pass',
    brief: 'Five gates through the storm pass. Watch the grey cells — they shake the plane and chew the hull.' },
];

export const ISLANDS = [
  { name: 'Home',   x: 0,     z: 0,     r: 430, h: 62, runway: true,  village: true },
  { name: 'Karang', x: -950,  z: -750,  r: 260, h: 46, runway: false, village: false, stranded: true },
  { name: 'Nusa',   x: 1050,  z: -650,  r: 300, h: 56, runway: false, village: true },
  { name: 'Ombak',  x: -1150, z: 850,   r: 240, h: 40, runway: false, village: false, stranded: true },
  { name: 'Senja',  x: 950,   z: 950,   r: 280, h: 52, runway: false, village: true },
  { name: 'Kecil',  x: 250,   z: 1450,  r: 150, h: 26, runway: false, village: true },
  { name: 'Badai',  x: -450,  z: -1550, r: 220, h: 48, runway: false, village: false },
];

export const STORMS = [
  { x: -1350, z: -1250, r: 240, top: 320 }, // west of Karang — clear of the rescue approach
  { x: 500,  z: 1200,  r: 220, top: 300 },  // crowds the Senja gate run
  { x: -800, z: -1750, r: 230, top: 280 },  // edges the Storm Pass gate course
];

// Gate courses keyed by mission island (offsets are world coords).
export const GATE_COURSES = {
  Senja: [
    [350, 120, 500], [700, 150, 750], [950, 130, 950],
    [700, 160, 1150], [350, 120, 1100],
  ],
  Badai: [
    [-150, 140, -1200], [-450, 170, -1400], [-700, 150, -1550],
    [-350, 180, -1750], [0, 130, -1500],
  ],
};
