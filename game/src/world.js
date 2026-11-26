// world.js — one job: build the whole visible world from a seed.
// Low-poly tropical islands, sea, sky, clouds, runway, palms, villages,
// storm cells, nav rings and rescue markers. Also owns terrainHeight() so
// physics and the plane agree on where the ground is.
import * as THREE from 'three';
import { CONFIG, COLOURS, ISLANDS, STORMS } from './config.js';
import { mulberry32, range } from './random.js';

const HOME_BUMP = { x: -260, z: -200, r: 130, h: 34 }; // jungle hill on Home (matches the offset cone visual)

export function terrainHeight(x, z) {
  let h = 0;
  for (const isl of ISLANDS) {
    const dx = x - isl.x, dz = z - isl.z;
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d >= isl.r) continue;
    if (isl.name === 'Home') {
      // Home is a flat-topped mesa (8 m) matching the visual cylinder,
      // falling off to the sand at the island edge.
      if (d < isl.r * 0.82) h = Math.max(h, 8);
      else {
        const t = 1 - (d - isl.r * 0.82) / (isl.r * 0.18);
        h = Math.max(h, 8 * (t * t * (3 - 2 * t)));
      }
    } else {
      const t = 1 - d / isl.r;
      h = Math.max(h, isl.h * (t * t * (3 - 2 * t))); // smoothstep hill
    }
  }
  // Jungle hill bump on Home: cone sits on the 8 m mesa, so its top is 8 + 34.
  const bdx = x - HOME_BUMP.x, bdz = z - HOME_BUMP.z;
  const bd = Math.hypot(bdx, bdz);
  if (bd < HOME_BUMP.r) {
    const t = 1 - bd / HOME_BUMP.r;
    h = Math.max(h, 8 + HOME_BUMP.h * (t * t * (3 - 2 * t)));
  }
  return h;
}

export function isRunwayAt(x, z) {
  // Home runway: a strip 320 long (x) by 26 wide (z), centred on (0,0).
  return Math.abs(x) < 160 && Math.abs(z) < 13;
}

export function islandByName(name) {
  return ISLANDS.find((i) => i.name === name);
}

export function buildWorld(scene, seed, sunAngle) {
  const rng = mulberry32(seed);
  const group = new THREE.Group();
  scene.add(group);
  const animated = { clouds: [], smoke: [], rings: [], markers: [], water: null, buoys: [] };

  // --- Sky: warm dawn gradient dome (vertex-coloured, no shader) -------------
  const skyGeo = new THREE.SphereGeometry(5200, 24, 16);
  const skyTop = new THREE.Color(0x6fa8dc);
  const skyMid = new THREE.Color(0xffc98a);
  const skyBot = new THREE.Color(0xff8f5c);
  const skyPos = skyGeo.attributes.position;
  const skyCols = [];
  for (let i = 0; i < skyPos.count; i++) {
    const y = skyPos.getY(i) / 5200;
    const c = y > 0.25
      ? skyMid.clone().lerp(skyTop, THREE.MathUtils.smoothstep(y, 0.25, 0.8))
      : skyBot.clone().lerp(skyMid, THREE.MathUtils.smoothstep(y, -0.05, 0.25));
    skyCols.push(c.r, c.g, c.b);
  }
  skyGeo.setAttribute('color', new THREE.Float32BufferAttribute(skyCols, 3));
  const skyMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false });
  group.add(new THREE.Mesh(skyGeo, skyMat));

  const sun = new THREE.DirectionalLight(0xffd9a0, 2.4);
  const sa = sunAngle ?? 0.6;
  sun.position.set(Math.cos(sa) * 900, 320, Math.sin(sa) * 900);
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xbfd9ff, 0x3d6b4f, 1.1));
  scene.fog = new THREE.Fog(0xf2b98a, 900, 4200);

  // --- Sea ------------------------------------------------------------------
  const seaGeo = new THREE.PlaneGeometry(9000, 9000, 48, 48);
  const seaMat = new THREE.MeshPhongMaterial({ color: COLOURS.sea, shininess: 90, specular: 0x99ccff });
  const sea = new THREE.Mesh(seaGeo, seaMat);
  sea.rotation.x = -Math.PI / 2; sea.position.y = -0.4;
  group.add(sea); animated.water = sea;

  // --- Islands --------------------------------------------------------------
  const grassMat = new THREE.MeshLambertMaterial({ color: COLOURS.grass, flatShading: true });
  const jungleMat = new THREE.MeshLambertMaterial({ color: COLOURS.jungle, flatShading: true });
  const sandMat = new THREE.MeshLambertMaterial({ color: COLOURS.sand, flatShading: true });
  const rockMat = new THREE.MeshLambertMaterial({ color: COLOURS.rock, flatShading: true });

  for (const isl of ISLANDS) {
    // Sand base disc, then a low-poly hill cone, then a jungle cap.
    const sand = new THREE.Mesh(new THREE.CylinderGeometry(isl.r, isl.r * 1.06, 4, 18), sandMat);
    sand.position.set(isl.x, 0.4, isl.z); group.add(sand);
    if (isl.name === 'Home') {
      // Flat-topped mesa so the runway plateau is genuinely flat and visible
      // from the air; the jungle hill lives on an offset cone instead.
      const mesa = new THREE.Mesh(new THREE.CylinderGeometry(isl.r * 0.82, isl.r * 0.9, 8, 18), grassMat);
      mesa.position.set(isl.x, 4, isl.z); group.add(mesa);
      const bump = new THREE.Mesh(new THREE.ConeGeometry(130, 34, 9), jungleMat);
      bump.position.set(-260, 17, -200); group.add(bump);
      const peak = new THREE.Mesh(new THREE.ConeGeometry(16, 12, 6), rockMat);
      peak.position.set(-260, 36, -200); group.add(peak);
    } else {
      const hill = new THREE.Mesh(new THREE.ConeGeometry(isl.r * 0.82, isl.h, 9), grassMat);
      hill.position.set(isl.x, isl.h / 2 + 1, isl.z);
      hill.rotation.y = rng() * Math.PI; group.add(hill);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(isl.r * 0.45, isl.h * 0.7, 8), jungleMat);
      cap.position.set(isl.x + range(rng, -30, 30), isl.h * 0.62, isl.z + range(rng, -30, 30));
      cap.rotation.y = rng() * Math.PI; group.add(cap);
      // Rocky peak
      const peak = new THREE.Mesh(new THREE.ConeGeometry(isl.r * 0.12, isl.h * 0.35, 6), rockMat);
      peak.position.set(isl.x, isl.h * 0.95, isl.z); group.add(peak);
    }
    // Foam ring on the waterline
    const foam = new THREE.Mesh(
      new THREE.TorusGeometry(isl.r * 1.02, 3.5, 6, 40),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }));
    foam.rotation.x = Math.PI / 2; foam.position.set(isl.x, 0.2, isl.z); group.add(foam);

    // Palms around the beach
    const palms = Math.floor(isl.r / 22);
    for (let i = 0; i < palms; i++) {
      const a = rng() * Math.PI * 2;
      const rr = isl.r * range(rng, 0.72, 0.98);
      const px = isl.x + Math.cos(a) * rr, pz = isl.z + Math.sin(a) * rr;
      group.add(makePalm(px, terrainHeight(px, pz), pz, rng));
    }

    // Village huts
    if (isl.village) {
      const huts = isl.name === 'Home' ? 7 : 5;
      for (let i = 0; i < huts; i++) {
        const a = rng() * Math.PI * 2;
        const rr = isl.r * range(rng, 0.35, 0.62);
        const px = isl.x + Math.cos(a) * rr, pz = isl.z + Math.sin(a) * rr;
        group.add(makeHut(px, terrainHeight(px, pz), pz, rng));
      }
    }

    // Stranded islanders + smoke signal on the beach
    if (isl.stranded) {
      const a = rng() * Math.PI * 2;
      const px = isl.x + Math.cos(a) * isl.r * 0.9;
      const pz = isl.z + Math.sin(a) * isl.r * 0.9;
      const marker = makeStranded(px, pz);
      group.add(marker.group);
      animated.markers.push(marker);
    }
  }

  // --- Home runway (sits on the 8 m plateau: box top at y=10) ----------------
  const runway = new THREE.Mesh(new THREE.BoxGeometry(340, 2, 28),
    new THREE.MeshLambertMaterial({ color: COLOURS.runway }));
  runway.position.set(0, 9, 0); group.add(runway);
  for (let i = -7; i <= 7; i++) {
    const dash = new THREE.Mesh(new THREE.BoxGeometry(6, 0.6, 2),
      new THREE.MeshBasicMaterial({ color: 0xffffff }));
    dash.position.set(i * 22, 10.2, 0); group.add(dash);
  }
  // Windsock + beacon tower at the runway end
  const sock = makeWindsock(180, 8, 0);
  group.add(sock); animated.markers.push({ group: sock, spin: true });
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(4, 6, 42, 8),
    new THREE.MeshLambertMaterial({ color: 0xf5f2ea }));
  beacon.position.set(-190, 29, 40); group.add(beacon);
  const beaconTop = new THREE.Mesh(new THREE.SphereGeometry(5, 10, 8),
    new THREE.MeshBasicMaterial({ color: COLOURS.marker }));
  beaconTop.position.set(-190, 52, 40); group.add(beaconTop);
  animated.markers.push({ group: beaconTop, pulse: true });

  // --- Clouds -----------------------------------------------------------------
  for (let i = 0; i < 26; i++) {
    const cloud = makeCloud(range(rng, -2000, 2000), range(rng, 180, 420), range(rng, -2000, 2000), rng);
    group.add(cloud); animated.clouds.push(cloud);
  }

  // --- Storm cells -------------------------------------------------------------
  for (const s of STORMS) {
    const cell = new THREE.Group();
    for (let i = 0; i < 9; i++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(range(rng, 45, 90), 8, 6),
        new THREE.MeshLambertMaterial({ color: COLOURS.storm, transparent: true, opacity: 0.88 }));
      puff.position.set(range(rng, -s.r * 0.6, s.r * 0.6), s.top + range(rng, -30, 40), range(rng, -s.r * 0.6, s.r * 0.6));
      puff.scale.y = 0.55; cell.add(puff);
    }
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(s.r * 0.8, s.r, s.top, 16, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x2c3440, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }));
    shaft.position.y = s.top / 2; cell.add(shaft);
    cell.position.set(s.x, 0, s.z);
    group.add(cell); animated.clouds.push(cell);
  }

  // --- Buoys marking the home lagoon -------------------------------------------
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const b = new THREE.Mesh(new THREE.ConeGeometry(3, 6, 8),
      new THREE.MeshLambertMaterial({ color: COLOURS.planeRed }));
    b.position.set(Math.cos(a) * 520, 2, Math.sin(a) * 520);
    group.add(b); animated.buoys.push(b);
  }

  return animated;
}

function makePalm(x, y, z, rng) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.8, 13, 6),
    new THREE.MeshLambertMaterial({ color: 0x8a6b46, flatShading: true }));
  trunk.position.y = 6.5; trunk.rotation.z = range(rng, -0.12, 0.12); g.add(trunk);
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2f9e44, flatShading: true });
  for (let i = 0; i < 6; i++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(2.4, 9, 4), leafMat);
    const a = (i / 6) * Math.PI * 2;
    leaf.position.set(Math.cos(a) * 3.4, 13.5, Math.sin(a) * 3.4);
    leaf.rotation.z = Math.cos(a) * 1.1; leaf.rotation.x = -Math.sin(a) * 1.1;
    g.add(leaf);
  }
  const nut = new THREE.Mesh(new THREE.SphereGeometry(1.2, 6, 5),
    new THREE.MeshLambertMaterial({ color: 0x6b4a2a }));
  nut.position.y = 12.6; g.add(nut);
  g.position.set(x, y, z);
  return g;
}

function makeHut(x, y, z, rng) {
  const g = new THREE.Group();
  const wall = new THREE.Mesh(new THREE.BoxGeometry(9, 6, 8),
    new THREE.MeshLambertMaterial({ color: pickColour(rng), flatShading: true }));
  wall.position.y = 3; g.add(wall);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(7.5, 5, 4),
    new THREE.MeshLambertMaterial({ color: 0xb5651d, flatShading: true }));
  roof.position.y = 8.5; roof.rotation.y = Math.PI / 4; g.add(roof);
  g.position.set(x, y, z); g.rotation.y = rng() * Math.PI;
  return g;
}
function pickColour(rng) {
  return [0xf2e3c6, 0xdfeef5, 0xf5c9a8, 0xcfe3b8][Math.floor(rng() * 4)];
}

function makeStranded(x, z) {
  const g = new THREE.Group();
  // Two little figures waving, bright orange so they read from the air.
  for (let i = 0; i < 2; i++) {
    const fig = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.4, 3.4, 6),
      new THREE.MeshLambertMaterial({ color: COLOURS.planeOrange }));
    body.position.y = 1.7; fig.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 6),
      new THREE.MeshLambertMaterial({ color: 0xe8b98a }));
    head.position.y = 4; fig.add(head);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 3, 5),
      new THREE.MeshLambertMaterial({ color: 0xe8b98a }));
    arm.position.set(1.2, 4.6, 0); arm.rotation.z = -0.9; fig.add(arm);
    fig.position.set(i * 4 - 2, 0, i * 2);
    g.add(fig);
  }
  // Smoke column: rising grey puffs (animated in main.js).
  const smoke = [];
  for (let i = 0; i < 5; i++) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(2.2 + i * 0.7, 7, 5),
      new THREE.MeshLambertMaterial({ color: 0xcccccc, transparent: true, opacity: 0.75 }));
    puff.position.set(6, 6 + i * 7, 0); g.add(puff); smoke.push(puff);
  }
  // Ground marker ring
  const ring = new THREE.Mesh(new THREE.TorusGeometry(10, 0.8, 6, 24),
    new THREE.MeshBasicMaterial({ color: COLOURS.marker }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 1; g.add(ring);
  g.position.set(x, Math.max(terrainHeight(x, z), 0.5), z);
  return { group: g, smoke, ring, x, z };
}

function makeCloud(x, y, z, rng) {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.92 });
  const n = 4 + Math.floor(rng() * 3);
  for (let i = 0; i < n; i++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(range(rng, 14, 30), 8, 6), mat);
    s.position.set(range(rng, -30, 30), range(rng, -4, 6), range(rng, -14, 14));
    s.scale.y = 0.55; g.add(s);
  }
  g.position.set(x, y, z);
  return g;
}

function makeWindsock(x, y, z) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 14, 6),
    new THREE.MeshLambertMaterial({ color: 0xdddddd }));
  pole.position.y = 7; g.add(pole);
  const sock = new THREE.Mesh(new THREE.ConeGeometry(1.6, 8, 8),
    new THREE.MeshLambertMaterial({ color: COLOURS.planeOrange }));
  sock.rotation.z = Math.PI / 2; sock.position.set(4, 13.4, 0); g.add(sock);
  g.position.set(x, y, z);
  return g;
}

// A glowing nav ring; returns the mesh plus a pulse helper.
export function makeRing(x, y, z, radius) {
  const g = new THREE.Group();
  const torus = new THREE.Mesh(new THREE.TorusGeometry(radius, 1.6, 10, 40),
    new THREE.MeshBasicMaterial({ color: COLOURS.ring }));
  g.add(torus);
  const inner = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.55, 0.7, 8, 32),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 }));
  g.add(inner);
  g.position.set(x, y, z);
  return g;
}

// A glowing drop-zone circle on the ground.
export function makeDropZone(x, z) {
  const y = Math.max(terrainHeight(x, z), 0.5);
  const g = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CircleGeometry(55, 32),
    new THREE.MeshBasicMaterial({ color: COLOURS.marker, transparent: true, opacity: 0.35, side: THREE.DoubleSide }));
  disc.rotation.x = -Math.PI / 2; disc.position.y = 1.5; g.add(disc);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(55, 1.4, 6, 40),
    new THREE.MeshBasicMaterial({ color: COLOURS.marker }));
  rim.rotation.x = Math.PI / 2; rim.position.y = 1.5; g.add(rim);
  g.position.set(x, y, z);
  return g;
}
