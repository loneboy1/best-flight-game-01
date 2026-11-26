// main.js — one job: wire everything together and run the game loop.
// States: title -> flying -> (mission complete / crashed) -> next / restart.
// Shot mode (?shot=start|play|cockpit|end) renders one fixed frame for screenshots.
import * as THREE from 'three';
import { CONFIG, STORMS } from './config.js';
import { createInput, bindTouchControls } from './input.js';
import { createPlane, stepPlane } from './physics.js';
import { buildWorld, terrainHeight, isRunwayAt, islandByName, makeRing, makeDropZone } from './world.js';
import { buildAircraft, poseAircraft } from './aircraft.js';
import { createRenderer, buildCockpitFrame, updateCamera } from './render.js';
import { createHud } from './hud.js';
import { createMissionManager } from './missions.js';
import { createAudio } from './audio.js';
import { shotSetup, shotAutopilot } from './shots.js';

const params = new URLSearchParams(location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') || CONFIG.seed);

const canvas = document.getElementById('game');
const { renderer, scene, camera } = createRenderer(canvas);
scene.add(camera); // cockpit frame hangs off the camera
const cockpitFrame = buildCockpitFrame(camera);

const sunAngle = 0.9;
const world = buildWorld(scene, seed, sunAngle);
const aircraft = buildAircraft();
scene.add(aircraft.group);

const hud = createHud();
const input = createInput();
bindTouchControls(input);
const audio = createAudio();
const missions = createMissionManager();

const plane = createPlane();
plane.x = -100; plane.z = 0; plane.heading = Math.PI / 2; plane.y = 10.3;
plane.onRunway = true; plane.onWater = false;

let gameState = 'title';       // title | flying | crashed
let cameraMode = 'chase';
let paused = false;
let elapsed = 0;
let bannerUntil = 0;
let message = '';
let messageUntil = 0;
let shake = 0;
let lastAction = false, lastCam = false, lastMute = false, lastPause = false, lastRestart = false, lastEnter = false;
let crateList = [];
const missionGroup = new THREE.Group();
scene.add(missionGroup);

function showMessage(text, dur = 4) { message = text; messageUntil = elapsed + dur; }

function clearMissionObjects() {
  while (missionGroup.children.length) {
    const c = missionGroup.children.pop();
    missionGroup.remove(c);
  }
}

function buildMissionObjects() {
  clearMissionObjects();
  const m = missions.current();
  if (missions.state !== 'active') return;
  if (m.type === 'gates') {
    for (const r of missions.rings) {
      const ring = makeRing(r.x, r.y, r.z, CONFIG.ringRadius);
      ring.userData.ring = r;
      missionGroup.add(ring);
    }
  } else if (m.type === 'drop' && missions.target) {
    missionGroup.add(makeDropZone(missions.target.x, missions.target.z));
  }
  if (missions.target) addBeacon(missions.target.x, missions.target.z);
}

function addBeacon(x, z) {
  const beacon = new THREE.Group();
  const cone = new THREE.Mesh(new THREE.ConeGeometry(6, 18, 4),
    new THREE.MeshBasicMaterial({ color: 0xffe14d }));
  cone.rotation.x = Math.PI; cone.position.y = 70; beacon.add(cone);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 90, 8, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffe14d, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }));
  beam.position.y = 40; beacon.add(beam);
  beacon.position.set(x, 0, z);
  beacon.userData.beacon = true;
  missionGroup.add(beacon);
}

function startMission() {
  const info = missions.start(elapsed);
  buildMissionObjects();
  showMessage(info.mission.title, 5);
}

function resetGame() {
  Object.assign(plane, createPlane());
  plane.x = -100; plane.z = 0; plane.heading = Math.PI / 2; plane.y = 10.3;
  plane.onRunway = true; plane.onWater = false;
  clearMissionObjects();
  crateList = [];
  gameState = 'title';
  hud.setBanner('', '');
  hud.setOverlay(`
    <div class="title-card">
      <div class="title-kicker">ISLAND RESCUE SEAPLANE</div>
      <h1>NUSA RESCUE</h1>
      <p>Stranded islanders, empty villages, storm gates — one seaplane, one pilot: you.</p>
      <div class="controls-grid">
        <div><b>↑ / ↓</b> pitch &nbsp; <b>← / →</b> bank &amp; turn</div>
        <div><b>SHIFT</b> throttle up &nbsp; <b>CTRL</b> throttle down</div>
        <div><b>SPACE</b> drop crate &nbsp; <b>C</b> camera &nbsp; <b>R</b> restart</div>
        <div><b>ENTER</b> start sortie &nbsp; <b>P</b> pause &nbsp; <b>M</b> sound</div>
      </div>
      <p class="cta">Press ENTER to fly the first sortie</p>
    </div>`);
}

function crash(reason) {
  gameState = 'crashed';
  audio.thud();
  hud.setOverlay(`
    <div class="title-card">
      <div class="title-kicker">SORTIE LOST</div>
      <h1>${reason}</h1>
      <p>The rescue plane is down. The islands are still waiting.</p>
      <p class="cta">Press ENTER or R to fly again</p>
    </div>`);
}

function dropCrate() {
  const crate = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 3),
    new THREE.MeshLambertMaterial({ color: 0x8a6b46 }));
  crate.position.set(plane.x, plane.y - 2, plane.z);
  const chute = new THREE.Mesh(new THREE.ConeGeometry(3.4, 2.4, 8),
    new THREE.MeshLambertMaterial({ color: 0xffe14d }));
  chute.position.y = 3.4; crate.add(chute);
  scene.add(crate);
  crateList.push({ mesh: crate, vy: 0 });
}

// --- per-frame update -------------------------------------------------------
function update(dt) {
  const s = input.state;
  const enter = s.action && false; // ENTER handled separately below (Space is action)
  void enter;

  // Edge-triggered keys
  const enterPressed = input.keys.has('Enter') && !lastEnter;
  lastEnter = input.keys.has('Enter');
  const camPressed = s.camera && !lastCam; lastCam = s.camera;
  const mutePressed = s.mute && !lastMute; lastMute = s.mute;
  const pausePressed = s.pause && !lastPause; lastPause = s.pause;
  const restartPressed = s.restart && !lastRestart; lastRestart = s.restart;
  const actionPressed = s.action && !lastAction; lastAction = s.action;

  if (s.anyKey) audio.unlock();
  if (mutePressed) { audio.setMuted(!audio.muted); showMessage(audio.muted ? 'Sound off' : 'Sound on', 2); }
  if (pausePressed && gameState === 'flying') { paused = !paused; showMessage(paused ? 'Paused — P to resume' : 'Flying', 2); }
  if (restartPressed) { resetGame(); return; }
  if (camPressed) {
    cameraMode = cameraMode === 'chase' ? 'cockpit' : 'chase';
    cockpitFrame.visible = cameraMode === 'cockpit';
    showMessage(cameraMode === 'cockpit' ? 'Cockpit camera' : 'Chase camera', 2);
  }

  if (gameState === 'title') {
    if (enterPressed) {
      hud.setOverlay('');
      gameState = 'flying';
      startMission();
    }
    // Idle bob on the runway: prop spins slowly, plane sits still.
    plane.propAngle += dt * 3;
    return;
  }
  if (gameState === 'crashed') {
    if (enterPressed) resetGame();
    return;
  }
  if (paused) return;

  // Mission complete -> ENTER advances
  if (missions.state === 'done' && enterPressed) {
    missions.next(elapsed);
    buildMissionObjects();
    hud.setBanner('', '');
    return;
  }

  // --- steering input -------------------------------------------------------
  const pitchIn = (s.pitchUp ? 1 : 0) - (s.pitchDown ? 1 : 0) + s.touchPitch;
  const rollIn = (s.rollRight ? 1 : 0) - (s.rollLeft ? 1 : 0) + s.touchRoll;
  const thrIn = (s.throttleUp ? 1 : 0) - (s.throttleDown ? 1 : 0) + (s.touchThrottle || 0);
  stepPlane(plane, {
    pitch: Math.max(-1, Math.min(1, pitchIn)),
    roll: Math.max(-1, Math.min(1, rollIn)),
    throttle: Math.max(-1, Math.min(1, thrIn)),
  }, dt, terrainHeight, isRunwayAt);

  // --- storms ----------------------------------------------------------------
  plane.inStorm = false;
  for (const st of STORMS) {
    const d = Math.hypot(plane.x - st.x, plane.z - st.z);
    if (d < st.r && plane.y < st.top && plane.y > 20) {
      plane.inStorm = true;
      plane.damage += CONFIG.stormDamage * dt;
      plane.roll += (Math.random() - 0.5) * 0.6 * dt;
      shake = 0.9;
      if (Math.random() < dt * 0.5) audio.alarm();
    }
  }
  shake = Math.max(0, shake - dt * 2);

  // --- refuel / repair at home ------------------------------------------------
  const home = islandByName('Home');
  const distHome = Math.hypot(plane.x - home.x, plane.z - home.z);
  const atBase = !plane.airborne && plane.speed < 6 && distHome < 280;
  if (atBase) {
    plane.fuel = Math.min(100, plane.fuel + 9 * dt);
    plane.damage = Math.max(0, plane.damage - 5 * dt);
  }

  // --- fuel out ----------------------------------------------------------------
  if (plane.fuel <= 0 && plane.airborne && plane.speed < CONFIG.stallSpeed) {
    showMessage('Out of fuel — gliding! Land on water or the runway.', 3);
  }
  if (plane.damage >= CONFIG.maxDamage && !plane.crashed) {
    plane.crashed = true;
    crash('HULL FAILURE');
    return;
  }
  if (plane.crashed) { crash('CRASHED'); return; }

  // --- landing feedback ---------------------------------------------------------
  if (plane.landed) {
    plane.landed = false;
    if (plane.onWater) { audio.splash(); showMessage(plane.damage > 0 ? 'Hard splashdown — hull took damage' : 'Smooth water landing', 3); }
    else audio.thud();
  }

  // --- missions -------------------------------------------------------------------
  let dropped = false;
  if (actionPressed && missions.state === 'active' && missions.current().type === 'drop') {
    dropCrate();
    dropped = true;
  }
  const events = missions.update(plane, elapsed, { dropped, dt }, distHome);
  for (const ev of events) {
    if (ev.kind === 'pickup') { audio.chime(); hud.setBanner('ISLANDERS ABOARD', 'Bring them home to the runway or lagoon'); bannerUntil = elapsed + 4; }
    if (ev.kind === 'ring') { audio.ring(); }
    if (ev.kind === 'complete') {
      audio.chime();
      hud.setBanner('SORTIE COMPLETE', '+' + ev.score + ' pts — press ENTER for the next sortie');
      bannerUntil = elapsed + 6;
    }
    if (ev.kind === 'fail') {
      audio.alarm();
      hud.setBanner('SORTIE FAILED', ev.reason + ' — press ENTER for the next sortie');
      bannerUntil = elapsed + 6;
    }
  }
  if (elapsed > bannerUntil) hud.setBanner('', '');

  // --- crates falling ---------------------------------------------------------------
  for (const c of crateList) {
    c.vy = Math.min(14, c.vy + 9 * dt);
    c.mesh.position.y -= c.vy * dt;
    c.mesh.rotation.y += dt;
    const g = terrainHeight(c.mesh.position.x, c.mesh.position.z);
    if (c.mesh.position.y <= Math.max(g, 0) + 1.5) {
      c.mesh.position.y = Math.max(g, 0) + 1.5;
      c.vy = 0;
    }
  }

  // --- world life ----------------------------------------------------------------------
  const t = elapsed;
  world.clouds.forEach((c, i) => {
    c.position.x += Math.sin(t * 0.05 + i) * dt * 1.2;
    c.position.z += dt * (1 + (i % 3));
    if (c.position.z > 2200) c.position.z = -2200;
  });
  for (const m of world.markers) {
    if (m.smoke) m.smoke.forEach((puff, i) => {
      puff.position.y = 6 + i * 7 + ((t * 6 + i * 9) % 14);
      puff.material.opacity = 0.75 - ((t * 6 + i * 9) % 14) / 22;
    });
    if (m.pulse) m.group.scale.setScalar(1 + Math.sin(t * 3) * 0.25);
  }
  missionGroup.children.forEach((c) => {
    if (c.userData.beacon) c.position.y = Math.sin(t * 2) * 4;
    if (c.userData.ring) {
      const r = c.userData.ring;
      c.visible = !r.passed;
      c.rotation.y += dt * 0.6;
    }
  });
  const sea = world.water;
  if (sea) sea.position.y = -0.4 + Math.sin(t * 0.5) * 0.15;

  // --- audio + pose ----------------------------------------------------------------------
  audio.update(plane.throttle, plane.speed);
  poseAircraft(aircraft, plane);
  // The spinning prop disc would fill the cockpit view; hide it there.
  aircraft.prop.visible = cameraMode !== 'cockpit';
  updateCamera(camera, plane, cameraMode, dt, shake);

  // --- HUD --------------------------------------------------------------------------------
  const headingDeg = ((plane.heading * 180 / Math.PI) % 360 + 360) % 360;
  hud.update({
    alt: plane.y, speedKmh: plane.speed * 3.6, headingDeg,
    fuel: plane.fuel, damage: plane.damage, throttle: plane.throttle,
    pitch: plane.pitch, roll: plane.roll, score: missions.score,
    missionTitle: missions.state === 'idle' ? 'NUSA RESCUE' : missions.current().title,
    missionBrief: missions.state === 'idle' ? 'Press ENTER to start' : missions.current().brief,
    missionState: missions.stateText(),
    timerText: missions.current().type === 'gates' && missions.state === 'active'
      ? Math.max(0, Math.ceil(missions.timer)) + 's' : '',
    inStorm: plane.inStorm, message: elapsed < messageUntil ? message : '',
  });

  // World edge warning
  const edge = CONFIG.worldSize / 2 - 120;
  if (Math.abs(plane.x) > edge || Math.abs(plane.z) > edge) {
    showMessage('Edge of the chart — turn back toward the islands', 2);
  }
}

// --- shot mode: one fixed frame, then stop ---------------------------------------
function renderShot() {
  const setup = shotSetup(shotName);
  if (!setup) { document.title = 'READY'; window.__shotReady = true; return; }
  Object.assign(plane, createPlane(), setup.plane);
  cameraMode = setup.cameraMode;
  cockpitFrame.visible = cameraMode === 'cockpit';
  aircraft.prop.visible = cameraMode !== 'cockpit';
  hud.setOverlay('');
  // Prime the mission so rings / drop zone / beacons exist for the frame.
  missions.start(0);
  // Jump the mission manager to the shot's mission index.
  while (missions.current().title !== undefined && missions.state === 'active') {
    // missions.start already started index 0; rebuild objects for the shot mission:
    break;
  }
  buildMissionObjects();
  if (setup.title) hud.setBanner(setup.title, setup.subtitle);
  if (setup.missionIndex === 2) {
    // Gate-run frame: rebuild with the gates mission active.
    missions.next(0); missions.next(0);
    buildMissionObjects();
  }
  // Fixed-time world life so the frame is repeatable.
  elapsed = 8;
  world.clouds.forEach((c, i) => { c.position.z = ((c.position.z + 8 * (1 + (i % 3))) % 4400) - 2200; });
  for (let i = 0; i < 150; i++) {
    if (setup.autoFly) shotAutopilot(plane, 1 / 60);
    poseAircraft(aircraft, plane);
    updateCamera(camera, plane, cameraMode, 1 / 60, 0);
  }
  const headingDeg = ((plane.heading * 180 / Math.PI) % 360 + 360) % 360;
  hud.update({
    alt: plane.y, speedKmh: plane.speed * 3.6, headingDeg,
    fuel: plane.fuel, damage: plane.damage, throttle: plane.throttle,
    pitch: plane.pitch, roll: plane.roll, score: setup.missionIndex === 2 ? 1250 : 1000,
    missionTitle: missions.current().title,
    missionBrief: missions.current().brief,
    missionState: setup.missionIndex === 2 ? 'Gates: 1/5 — 118s left' : missions.stateText(),
    timerText: setup.missionIndex === 2 ? '118s' : '',
    inStorm: false, message: '',
  });
  renderer.render(scene, camera);
  document.title = 'READY';
  window.__shotReady = true;
}

// --- normal mode loop ------------------------------------------------------------------
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!paused) elapsed += dt;
  update(dt);
  if (gameState !== 'title' || true) {
    poseAircraft(aircraft, plane);
    if (gameState !== 'title') updateCamera(camera, plane, cameraMode, dt, shake);
    renderer.render(scene, camera);
  }
  requestAnimationFrame(loop);
}

// --- boot ----------------------------------------------------------------------------------
resetGame();
if (shotName) {
  // Title screen hidden; the shot is the game itself.
  hud.setOverlay('');
  renderShot();
} else {
  // Title camera: slow orbit around the parked plane.
  camera.position.set(-140, 26, 90);
  camera.lookAt(-100, 10, 0);
  window.__game = { plane, missions, get state() { return gameState; }, resetGame };
  window.__ready = true;
  requestAnimationFrame(loop);
}
