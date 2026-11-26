// aircraft.js — one job: build the rescue seaplane out of primitives and pose it.
// White fuselage, orange rescue stripe, twin floats, high wing, spinning prop.
// No textures, no external models — everything is a box, cylinder or cone.
import * as THREE from 'three';
import { COLOURS } from './config.js';

export function buildAircraft() {
  const g = new THREE.Group();
  const white = new THREE.MeshLambertMaterial({ color: COLOURS.planeWhite, flatShading: true });
  const orange = new THREE.MeshLambertMaterial({ color: COLOURS.planeOrange, flatShading: true });
  const red = new THREE.MeshLambertMaterial({ color: COLOURS.planeRed, flatShading: true });
  const dark = new THREE.MeshLambertMaterial({ color: 0x2b2f36, flatShading: true });
  const glass = new THREE.MeshPhongMaterial({ color: 0x9fd8ef, shininess: 120, specular: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false });

  // Fuselage: nose cone + body + tail cone
  const body = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.1, 7.5, 10), white);
  body.rotation.x = Math.PI / 2; body.position.z = 0.4; g.add(body);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(1.5, 10, 8), white);
  nose.scale.set(1, 1, 1.6); nose.position.z = 4.2; g.add(nose);
  const tailCone = new THREE.Mesh(new THREE.ConeGeometry(1.1, 4.5, 8), white);
  tailCone.rotation.x = -Math.PI / 2; tailCone.position.z = -5.4; g.add(tailCone);

  // Orange rescue stripe along the fuselage
  const stripe = new THREE.Mesh(new THREE.CylinderGeometry(1.56, 1.16, 5.4, 10, 1, true), orange);
  stripe.rotation.x = Math.PI / 2; stripe.position.z = 0.9; g.add(stripe);

  // Cockpit glass
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(1.25, 10, 8), glass);
  canopy.scale.set(1, 0.75, 1.5); canopy.position.set(0, 1.0, 2.6); g.add(canopy);

  // High wing + struts
  const wing = new THREE.Mesh(new THREE.BoxGeometry(15.5, 0.35, 2.6), white);
  wing.position.set(0, 1.55, 0.6); g.add(wing);
  const wingTipL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 2.6), orange);
  wingTipL.position.set(-7.7, 1.55, 0.6); g.add(wingTipL);
  const wingTipR = wingTipL.clone(); wingTipR.position.x = 7.7; g.add(wingTipR);
  for (const sx of [-1, 1]) {
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 2.4, 6), dark);
    strut.position.set(sx * 2.2, 0.6, 0.6); strut.rotation.z = sx * 0.5; g.add(strut);
  }

  // Tail: horizontal stabiliser + vertical fin with red flash
  const stab = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.28, 1.7), white);
  stab.position.set(0, 0.5, -6.6); g.add(stab);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.8, 2.4), orange);
  fin.position.set(0, 1.5, -6.8); g.add(fin);
  const finFlash = new THREE.Mesh(new THREE.BoxGeometry(0.34, 1.0, 2.0), red);
  finFlash.position.set(0, 2.1, -6.8); g.add(finFlash);

  // Twin floats with struts (the seaplane part)
  for (const sx of [-1, 1]) {
    const float = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.4, 5.6, 8), orange);
    float.rotation.x = Math.PI / 2; float.position.set(sx * 1.7, -1.7, 0.6); g.add(float);
    const floatNose = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.4, 8), orange);
    floatNose.rotation.x = Math.PI / 2; floatNose.position.set(sx * 1.7, -1.7, 4.1); g.add(floatNose);
    for (const sz of [-1.4, 1.8]) {
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.9, 6), dark);
      strut.position.set(sx * 1.7, -0.8, sz); strut.rotation.z = sx * 0.35; g.add(strut);
    }
  }

  // Propeller: hub + 3 blades + spinner (spins in main.js via propAngle)
  const prop = new THREE.Group();
  const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.2, 8), red);
  spinner.rotation.x = Math.PI / 2; spinner.position.z = 0.6; prop.add(spinner);
  for (let i = 0; i < 3; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.35, 3.4, 0.12), dark);
    const holder = new THREE.Group();
    holder.add(blade); blade.position.y = 1.9;
    holder.rotation.z = (i / 3) * Math.PI * 2;
    prop.add(holder);
  }
  prop.position.set(0, 0.2, 5.6);
  g.add(prop);

  // Rescue cross on the wing (white box + red cross, reads from above)
  const crossBase = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.1, 2.6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  crossBase.position.set(0, 1.76, 0.6); g.add(crossBase);
  const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 2.2), red);
  crossV.position.set(0, 1.8, 0.6); g.add(crossV);
  const crossH = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 0.7), red);
  crossH.position.set(0, 1.8, 0.6); g.add(crossH);

  // Navigation lights: red on port (local +x), green on starboard (local -x).
  const navL = new THREE.Mesh(new THREE.SphereGeometry(0.28, 6, 5), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
  navL.position.set(7.9, 1.55, 0.6); g.add(navL);
  const navR = new THREE.Mesh(new THREE.SphereGeometry(0.28, 6, 5), new THREE.MeshBasicMaterial({ color: 0x22ff66 }));
  navR.position.set(-7.9, 1.55, 0.6); g.add(navR);

  return { group: g, prop };
}

// Pose the aircraft group from the physics state (position + attitude).
export function poseAircraft(aircraft, p) {
  const g = aircraft.group;
  g.position.set(p.x, p.y, p.z);
  g.rotation.order = 'YXZ';
  // The model faces +z; physics forward is (sin h, -cos h), so yaw is PI - h.
  g.rotation.y = Math.PI - p.heading;
  g.rotation.x = -p.pitch;
  g.rotation.z = p.roll;
  aircraft.prop.rotation.z = p.propAngle;
}
