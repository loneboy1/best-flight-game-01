// physics.js — one job: the arcade flight model.
// Pure numbers in, pure numbers out. It knows nothing about Three.js or the DOM.
// The plane is a point with heading/pitch/roll; terrainHeight(x, z) is injected.
import { CONFIG } from './config.js';

export function createPlane() {
  return {
    x: 0, y: 2, z: 0,            // position, metres (y = altitude above sea)
    heading: 0,                  // radians, 0 = north (-z), grows clockwise
    pitch: 0, roll: 0,           // radians
    speed: 0,                    // m/s forward
    throttle: 0,                 // 0..1
    vs: 0,                       // vertical speed m/s (for landing judgement)
    fuel: CONFIG.fuelCapacity,
    damage: 0,
    airborne: false,             // true once off water/runway
    onWater: true,
    onRunway: false,
    crashed: false,
    landed: false,               // set true on a gentle touchdown this frame
    inStorm: false,
    propAngle: 0,
  };
}

// dt seconds, input = { pitch, roll, throttleDelta } in -1..1, terrainHeight fn.
export function stepPlane(p, input, dt, terrainHeight, isRunwayAt) {
  if (p.crashed) return;
  const C = CONFIG;

  // Throttle
  p.throttle = Math.max(0, Math.min(1, p.throttle + input.throttle * C.throttleStep * dt));

  // Speed chases the throttle's target speed.
  const target = p.throttle * C.maxSpeed;
  const accel = p.airborne ? 7 : 11;
  p.speed += Math.max(-14 * dt, Math.min(accel * dt, target - p.speed));
  if (p.speed < 0) p.speed = 0;

  // Fuel
  const burn = (C.fuelBurnIdle + (C.fuelBurn - C.fuelBurnIdle) * p.throttle) * dt;
  p.fuel = Math.max(0, p.fuel - burn);
  if (p.fuel <= 0) { p.throttle = 0; }

  // Attitude
  const rollTarget = input.roll * 1.1;
  p.roll += (rollTarget - p.roll) * Math.min(1, 3.2 * dt);
  const pitchTarget = input.pitch * 0.55;
  p.pitch += (pitchTarget - p.pitch) * Math.min(1, 2.6 * dt);

  // Bank turns the plane; pitch authority grows with speed. Positive roll
  // (right bank) turns right: heading grows north -> east -> south.
  p.heading += p.roll * C.turnRate * dt * (0.4 + 0.6 * Math.min(1, p.speed / C.cruiseSpeed));
  const speedFactor = Math.max(0, Math.min(1, (p.speed - C.stallSpeed) / (C.cruiseSpeed - C.stallSpeed)));

  // Vertical motion
  const ground = terrainHeight(p.x, p.z);
  const clearance = p.y - Math.max(ground, 0);
  if (!p.airborne) {
    // On water or runway: roll along the surface. Floats sit ~1 m deep in
    // water; on the runway the gear offset keeps the floats on the strip.
    p.y = Math.max(ground, 0) + (p.onRunway ? 2.3 : p.onWater ? 1.2 : 1.5);
    if (p.speed >= C.takeoffSpeed && p.pitch > 0.08) {
      p.airborne = true; p.onWater = false; p.onRunway = false;
      // Lift clear of the touchdown band (surface + 1.2): without this the
      // plane takes off and instantly "lands" again in the same frame,
      // which resets pitch to 0 and makes water takeoffs impossible.
      p.y = Math.max(ground, 0) + 2.5;
    }
    p.vs = 0;
  } else {
    let climb = Math.sin(p.pitch) * C.climbRate * 2.2 * speedFactor;
    if (p.speed < C.stallSpeed) climb -= (C.stallSpeed - p.speed) * 0.32; // stall sinks, gently
    climb -= (1 - speedFactor) * C.sinkRate * 0.4;
    p.vs = climb;
    p.y += climb * dt;
  }

  // Forward motion
  const fx = Math.sin(p.heading), fz = -Math.cos(p.heading);
  p.x += fx * Math.cos(p.pitch) * p.speed * dt;
  p.z += fz * Math.cos(p.pitch) * p.speed * dt;

  // Storm turbulence is applied by main.js (it owns the storm list).

  // Surface contact while airborne
  if (p.airborne) {
    const g2 = terrainHeight(p.x, p.z);
    const surface = Math.max(g2, 0);
    if (p.y <= surface + 1.2) {
      const vsDown = -p.vs;
      const runway = isRunwayAt ? isRunwayAt(p.x, p.z) : false;
      const water = g2 <= 0.01;
      p.y = surface + (runway ? 2.3 : 1.2);
      // Water forgives a slow splash (a seaplane lands slow); land does not.
      const crashLimit = water ? 15 : C.crashVs;
      if (vsDown > crashLimit || (!water && !runway)) {
        p.crashed = true; p.damage = C.maxDamage;
      } else if (vsDown > C.hardLandingVs) {
        p.damage += 18;
        p.airborne = false; p.onWater = water; p.onRunway = runway;
        p.landed = true; p.speed *= 0.55;
      } else {
        p.airborne = false; p.onWater = water; p.onRunway = runway;
        p.landed = true; p.pitch = 0; p.roll = 0;
        if (p.damage >= C.maxDamage) p.crashed = true;
      }
      if (p.damage >= C.maxDamage) p.crashed = true;
    }
  }

  // Soft world edge: steer back with a gentle push.
  const edge = CONFIG.worldSize / 2 - 60;
  if (Math.abs(p.x) > edge || Math.abs(p.z) > edge) {
    p.heading += Math.PI * dt * 0.4; // slow U-turn cue handled by HUD message
  }

  p.propAngle += (2 + p.throttle * 40) * dt;
  return p;
}
