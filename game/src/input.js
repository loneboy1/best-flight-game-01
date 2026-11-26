// input.js — one job: turn keyboard, mouse and touch into a plain control state.
// main.js reads `state` every frame; nothing here knows about the plane.
export function createInput() {
  const state = {
    pitchUp: false, pitchDown: false,
    rollLeft: false, rollRight: false,
    throttleUp: false, throttleDown: false,
    action: false,          // Space — drop crate / confirm
    camera: false,          // C — toggle camera (edge-triggered by main)
    restart: false,         // R
    pause: false,           // P / Esc
    mute: false,            // M
    anyKey: false,
    // Touch: virtual stick values -1..1, set by the on-screen controls.
    touchPitch: 0, touchRoll: 0, touchThrottle: 0,
  };
  const keys = new Set();
  const down = (e) => {
    if (e.repeat) return;
    keys.add(e.code);
    state.anyKey = true;
    sync();
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  };
  const up = (e) => { keys.delete(e.code); sync(); };
  function sync() {
    state.pitchUp = keys.has('ArrowUp') || keys.has('KeyW');
    state.pitchDown = keys.has('ArrowDown') || keys.has('KeyS');
    state.rollLeft = keys.has('ArrowLeft') || keys.has('KeyA');
    state.rollRight = keys.has('ArrowRight') || keys.has('KeyD');
    state.throttleUp = keys.has('ShiftLeft') || keys.has('ShiftRight') || keys.has('KeyE');
    state.throttleDown = keys.has('ControlLeft') || keys.has('ControlRight') || keys.has('KeyQ');
    state.action = keys.has('Space');
    state.camera = keys.has('KeyC');
    state.restart = keys.has('KeyR');
    state.pause = keys.has('KeyP') || keys.has('Escape');
    state.mute = keys.has('KeyM');
  }
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('blur', () => { keys.clear(); sync(); });

  // Mouse: hold left button and drag to steer (pitch/roll by drag offset).
  let dragging = false, dragX = 0, dragY = 0;
  window.addEventListener('mousedown', (e) => {
    if (e.target.closest('button, .touch')) return;
    dragging = true; dragX = e.clientX; dragY = e.clientY;
  });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    state.touchRoll = Math.max(-1, Math.min(1, (e.clientX - dragX) / 120));
    state.touchPitch = Math.max(-1, Math.min(1, (dragY - e.clientY) / 120));
  });
  window.addEventListener('mouseup', () => {
    dragging = false; state.touchRoll = 0; state.touchPitch = 0;
  });

  return { state, keys };
}

// Wire the on-screen touch buttons (created in index.html) into the input state.
export function bindTouchControls(input) {
  const s = input.state;
  const hold = (id, on, off) => {
    const el = document.getElementById(id);
    if (!el) return;
    const start = (e) => { e.preventDefault(); on(); };
    const end = (e) => { e.preventDefault(); off(); };
    el.addEventListener('touchstart', start, { passive: false });
    el.addEventListener('touchend', end, { passive: false });
    el.addEventListener('mousedown', start);
    el.addEventListener('mouseup', end);
    el.addEventListener('mouseleave', end);
  };
  hold('btn-throttle-up', () => { s.touchThrottle = 1; }, () => { s.touchThrottle = 0; });
  hold('btn-throttle-down', () => { s.touchThrottle = -1; }, () => { s.touchThrottle = 0; });
  hold('btn-action', () => { s.action = true; }, () => { s.action = false; });
  hold('btn-cam', () => { s.camera = true; }, () => { s.camera = false; });
}
