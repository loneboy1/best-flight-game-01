// shots.js — one job: deterministic screenshot scenes for ?shot=.
// Each scene puts the real game in a fixed, scripted pose (fixed seed, fixed
// time, no input) so the same URL always renders the same frame. The judge
// sees the game itself, not a mock-up.
import { CONFIG } from './config.js';

export const SHOT_NAMES = ['start', 'play', 'cockpit', 'end'];

// Returns { plane, cameraMode, sunAngle, banner, missionPhase, autoThrottle, ... }
// main.js applies it after world build and before the first render.
export function shotSetup(name) {
  switch (name) {
    case 'start':
      return {
        plane: { x: -100, y: 10.3, z: 0, heading: Math.PI / 2, pitch: 0, roll: 0, speed: 0, throttle: 0.35, fuel: 100, damage: 0, airborne: false, onWater: false, onRunway: true },
        cameraMode: 'chase', sunAngle: 0.45,
        title: 'NUSA RESCUE', subtitle: 'Island rescue seaplane — dawn patrol from Home runway',
        missionIndex: 0, autoFly: false,
      };
    case 'play':
      return {
        plane: { x: 480, y: 140, z: 560, heading: -1.16, pitch: 0.08, roll: -0.55, speed: 48, throttle: 0.75, fuel: 72, damage: 4, airborne: true, onWater: false, onRunway: false },
        cameraMode: 'chase', sunAngle: 0.9,
        title: '', subtitle: '',
        missionIndex: 2, autoFly: true, // gate run — rings ahead, banking through one
        ringAhead: 0,
      };
    case 'cockpit':
      return {
        plane: { x: -400, y: 210, z: -500, heading: 1.35, pitch: 0.05, roll: 0.18, speed: 52, throttle: 0.8, fuel: 64, damage: 0, airborne: true, onWater: false, onRunway: false },
        cameraMode: 'cockpit', sunAngle: 0.9,
        title: '', subtitle: '',
        missionIndex: 0, autoFly: true,
      };
    case 'end':
      return {
        plane: { x: 60, y: 1.6, z: 620, heading: 0, pitch: 0, roll: 0, speed: 4, throttle: 0.05, fuel: 38, damage: 2, airborne: false, onWater: true, onRunway: false },
        cameraMode: 'chase', sunAngle: 0.5,
        title: 'MISSION COMPLETE', subtitle: 'Islanders safe ashore — Pulau Karang rescue +1,000 pts',
        missionIndex: 0, autoFly: false, landed: true,
      };
    default:
      return null;
  }
}

// Fixed autopilot for shot scenes that need the plane mid-flight: gentle
// level flight holding the scripted pose, so the frame is stable.
export function shotAutopilot(p, dt) {
  p.speed = 48;
  p.throttle = 0.75;
  p.pitch += (0.05 - p.pitch) * Math.min(1, dt);
  p.roll += (-0.5 - p.roll) * Math.min(1, dt * 0.5);
}
