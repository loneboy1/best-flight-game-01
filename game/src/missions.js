// missions.js — one job: the three mission types, their objectives and scoring.
// A mission is plain data + an update() that reads the plane and returns events.
// main.js owns the scene objects (rings, markers); this module owns the rules.
import { CONFIG, MISSION_SCRIPT, GATE_COURSES } from './config.js';
import { islandByName } from './world.js';

export function createMissionManager() {
  let index = 0;         // index into MISSION_SCRIPT
  let loop = 0;          // campaign loops completed
  let state = 'idle';    // idle | active | done
  let phase = '';        // e.g. 'fly-to', 'pickup', 'return', 'drop', 'gates'
  let rings = [];        // {x,y,z,passed} for gate runs
  let ringIndex = 0;
  let timer = 0;         // seconds left for gate runs
  let target = null;     // {x,z,name} for rescue/drop islands
  let score = 0;
  let completed = 0;
  let message = '';
  let messageAt = 0;

  function current() { return MISSION_SCRIPT[index % MISSION_SCRIPT.length]; }

  function start(now) {
    const m = current();
    state = 'active';
    timer = m.type === 'gates' ? CONFIG.gateTimeLimit - loop * 15 : 0;
    rings = [];
    ringIndex = 0;
    if (m.type === 'gates') {
      const course = GATE_COURSES[m.island] || [];
      rings = course.map(([x, y, z]) => ({ x, y, z, passed: false }));
      phase = 'gates';
    } else {
      target = islandByName(m.island);
      phase = m.type === 'rescue' ? 'fly-to' : 'drop';
    }
    setMessage(m.title + ' — ' + m.brief, now);
    return { mission: m, target, rings };
  }

  function setMessage(text, now) { message = text; messageAt = now; }

  // p = plane, now = seconds elapsed, opts = { dropped: bool } (space pressed)
  // Returns events: [{kind:'pickup'|'drop'|'ring'|'complete'|'fail', ...}]
  function update(p, now, opts, distToHome) {
    const events = [];
    if (state !== 'active') return events;
    const m = current();

    if (m.type === 'rescue') {
      if (phase === 'fly-to') {
        const d = Math.hypot(p.x - target.x, p.z - target.z);
        // Near the shore (on the water within 120 m of the sand), slow, on the water.
        if (d < target.r + 120 && !p.airborne && p.speed < CONFIG.pickupSpeed && p.onWater) {
          phase = 'return';
          score += CONFIG.scoreRescue;
          events.push({ kind: 'pickup' });
          setMessage('Islanders aboard! Bring them home — land on the runway or the lagoon.', now);
        }
      } else if (phase === 'return') {
        // Home: on the runway (near centre) or floating in the lagoon.
        if (!p.airborne && (distToHome < 220 || (p.onWater && distToHome < 750))) {
          state = 'done'; completed++;
          score += CONFIG.scoreLandingBonus + Math.round(p.fuel) * 2;
          events.push({ kind: 'complete', score: CONFIG.scoreRescue + CONFIG.scoreLandingBonus });
          setMessage('Rescue complete! +' + (CONFIG.scoreRescue + CONFIG.scoreLandingBonus) + ' pts', now);
        }
      }
    } else if (m.type === 'drop') {
      if (phase === 'drop') {
        const d = Math.hypot(p.x - target.x, p.z - target.z);
        const alt = p.y;
        if (opts.dropped) {
          if (d < CONFIG.dropRadius && alt > CONFIG.dropAltMin && alt < CONFIG.dropAltMax) {
            state = 'done'; completed++;
            score += CONFIG.scoreDrop + Math.round(p.fuel) * 2;
            events.push({ kind: 'complete', score: CONFIG.scoreDrop });
            setMessage('Supply drop on target! +' + CONFIG.scoreDrop + ' pts — return home to refuel.', now);
          } else if (d >= CONFIG.dropRadius) {
            setMessage('Crate missed the village — fly back over the yellow circle and try again.', now);
            events.push({ kind: 'drop-miss' });
          } else {
            setMessage('Too ' + (alt < CONFIG.dropAltMin ? 'low' : 'high') + ' — drop between 25 and 120 m.', now);
            events.push({ kind: 'drop-miss' });
          }
        }
      }
    } else if (m.type === 'gates') {
      timer -= opts.dt;
      if (timer <= 0) {
        state = 'done';
        events.push({ kind: 'fail', reason: 'Time up — the gates closed.' });
        setMessage('Time up! The gate run failed — try the next sortie.', now);
      } else if (ringIndex < rings.length) {
        const r = rings[ringIndex];
        const d = Math.hypot(p.x - r.x, p.y - r.y, p.z - r.z);
        if (d < CONFIG.ringPassRadius) {
          r.passed = true; ringIndex++;
          score += CONFIG.scoreRing;
          events.push({ kind: 'ring', left: rings.length - ringIndex });
          setMessage('Gate ' + ringIndex + '/' + rings.length + '! +' + CONFIG.scoreRing + ' pts', now);
          if (ringIndex >= rings.length) {
            state = 'done'; completed++;
            score += CONFIG.scoreGateRun + Math.max(0, Math.round(timer)) * 5;
            events.push({ kind: 'complete', score: CONFIG.scoreGateRun });
            setMessage('Gate run complete! +' + CONFIG.scoreGateRun + ' pts', now);
          }
        }
      }
    }
    return events;
  }

  function next(now) {
    index++;
    if (index % MISSION_SCRIPT.length === 0) loop++;
    return start(now);
  }

  function stateText() {
    if (state === 'idle') return 'Press ENTER to start the first sortie';
    if (state === 'done') return 'Sortie complete — press ENTER for the next one';
    const m = current();
    if (m.type === 'rescue') return phase === 'fly-to' ? 'Fly to ' + m.island + ' — land on the water by the smoke' : 'Islanders aboard — return to Home island';
    if (m.type === 'drop') return 'Drop the crate over the yellow circle on ' + m.island;
    return 'Gates: ' + ringIndex + '/' + rings.length + ' — ' + Math.max(0, Math.ceil(timer)) + 's left';
  }

  return {
    start, update, next, current, stateText,
    get state() { return state; },
    get phase() { return phase; },
    get rings() { return rings; },
    get ringIndex() { return ringIndex; },
    get target() { return target; },
    get timer() { return timer; },
    get score() { return score; },
    get completed() { return completed; },
    get message() { return message; },
    get messageAt() { return messageAt; },
    addScore(n) { score += n; },
  };
}
