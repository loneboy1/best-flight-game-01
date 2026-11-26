// render.js — one job: the Three.js renderer and the two cameras.
// Chase camera (smooth follow behind the plane) and cockpit camera
// (at the nose, with a simple dashboard frame). No game logic here.
import * as THREE from 'three';
import { CONFIG } from './config.js';

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 12000);
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
  return { renderer, scene, camera };
}

// Cockpit frame: dashboard + struts drawn as a 3D overlay attached to the camera.
export function buildCockpitFrame(camera) {
  const g = new THREE.Group();
  const dark = new THREE.MeshLambertMaterial({ color: 0x23272e });
  const panel = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.5, 0.2), dark);
  panel.position.set(0, -0.82, -1.5); g.add(panel);
  const dialMat = new THREE.MeshBasicMaterial({ color: 0xffc93d });
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x111418 });
  for (const dx of [-0.85, -0.3, 0.3, 0.85]) {
    const ring = new THREE.Mesh(new THREE.CircleGeometry(0.14, 16), ringMat);
    ring.position.set(dx, -0.78, -1.39); g.add(ring);
    const dial = new THREE.Mesh(new THREE.CircleGeometry(0.1, 16), dialMat);
    dial.position.set(dx, -0.78, -1.38); g.add(dial);
  }
  const strutL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.6, 0.06), dark);
  strutL.position.set(-1.5, 0.3, -1.6); strutL.rotation.z = 0.18; g.add(strutL);
  const strutR = strutL.clone(); strutR.position.x = 1.5; strutR.rotation.z = -0.18; g.add(strutR);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.09, 0.09), dark);
  bar.position.set(0, 1.05, -1.6); g.add(bar);
  g.visible = false;
  camera.add(g);
  return g;
}

// Position the camera. mode: 'chase' | 'cockpit'. dt for smoothing.
const _chasePos = new THREE.Vector3();
const _lookAt = new THREE.Vector3();
const _fwd = new THREE.Vector3();
export function updateCamera(camera, p, mode, dt, shake) {
  if (mode === 'cockpit') {
    _fwd.set(Math.sin(p.heading), 0, -Math.cos(p.heading));
    // Sit in the cockpit: below the high wing, behind the propeller disc,
    // looking out through the (transparent) canopy.
    camera.position.set(
      p.x + _fwd.x * 2.4,
      p.y + 1.05,
      p.z + _fwd.z * 2.4,
    );
    _lookAt.set(
      p.x + Math.sin(p.heading) * Math.cos(p.pitch) * 60,
      p.y + Math.sin(p.pitch) * 60 + 1.05,
      p.z - Math.cos(p.heading) * Math.cos(p.pitch) * 60,
    );
    camera.up.set(0, 1, 0);
    camera.lookAt(_lookAt);
    camera.rotation.z += p.roll * 0.9; // horizon tilts with the bank
  } else {
    const back = CONFIG.chaseDistance;
    const bx = p.x - Math.sin(p.heading) * back;
    const bz = p.z + Math.cos(p.heading) * back;
    const by = p.y + CONFIG.chaseHeight + Math.abs(p.roll) * 2;
    _chasePos.set(bx, by, bz);
    const k = Math.min(1, CONFIG.cameraLerp * dt);
    camera.position.lerp(_chasePos, k);
    _lookAt.set(p.x, p.y + 1.5, p.z);
    camera.up.set(0, 1, 0);
    camera.lookAt(_lookAt);
    camera.rotation.z += p.roll * 0.25;
  }
  if (shake > 0) {
    camera.position.x += (Math.random() - 0.5) * shake;
    camera.position.y += (Math.random() - 0.5) * shake;
  }
}
