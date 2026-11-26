// audio.js — one job: all sound, synthesised live with WebAudio. No audio files.
// Engine hum (sawtooth + lowpass, pitch follows throttle), wind noise
// (looped noise buffer through a bandpass), and little chimes for events.
export function createAudio() {
  let ctx = null, engineOsc = null, engineGain = null, windGain = null, windFilter = null;
  let muted = false, started = false;

  function ensure() {
    if (started) return true;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch { return false; }
    started = true;
    // Engine: two detuned saws through a lowpass.
    engineOsc = ctx.createOscillator();
    engineOsc.type = 'sawtooth'; engineOsc.frequency.value = 55;
    const osc2 = ctx.createOscillator();
    osc2.type = 'sawtooth'; osc2.frequency.value = 55.7;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
    engineGain = ctx.createGain(); engineGain.gain.value = 0;
    engineOsc.connect(lp); osc2.connect(lp); lp.connect(engineGain); engineGain.connect(ctx.destination);
    engineOsc.start(); osc2.start();
    // Wind: white-noise buffer, bandpass, gain follows airspeed.
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource(); noise.buffer = buf; noise.loop = true;
    windFilter = ctx.createBiquadFilter(); windFilter.type = 'bandpass'; windFilter.frequency.value = 700; windFilter.Q.value = 0.6;
    windGain = ctx.createGain(); windGain.gain.value = 0;
    noise.connect(windFilter); windFilter.connect(windGain); windGain.connect(ctx.destination);
    noise.start();
    return true;
  }

  function tone(freq, dur, type, vol, when = 0) {
    if (!ctx || muted) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(vol || 0.15, ctx.currentTime + when);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + when + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(ctx.currentTime + when); o.stop(ctx.currentTime + when + dur + 0.05);
  }

  return {
    // Call from a user gesture (first key / click) — browsers require it.
    unlock() { if (ensure() && ctx.state === 'suspended') ctx.resume(); },
    setMuted(m) { muted = m; if (engineGain) engineGain.gain.value = m ? 0 : engineGain.gain.value; },
    get muted() { return muted; },
    // Per-frame: throttle 0..1, speed m/s.
    update(throttle, speed) {
      if (!ctx || muted) return;
      const t = ctx.currentTime;
      engineOsc.frequency.setTargetAtTime(48 + throttle * 90, t, 0.1);
      engineGain.gain.setTargetAtTime(0.02 + throttle * 0.075, t, 0.1);
      windGain.gain.setTargetAtTime(Math.min(0.12, speed * 0.0022), t, 0.2);
      windFilter.frequency.setTargetAtTime(500 + speed * 14, t, 0.2);
    },
    chime() { tone(660, 0.25, 'sine', 0.18); tone(880, 0.3, 'sine', 0.18, 0.12); tone(1320, 0.5, 'sine', 0.14, 0.26); },
    thud() { tone(90, 0.3, 'triangle', 0.3); tone(55, 0.4, 'sine', 0.25, 0.05); },
    splash() { tone(300, 0.4, 'sine', 0.12); tone(180, 0.5, 'sine', 0.1, 0.08); },
    ring() { tone(1046, 0.2, 'sine', 0.16); tone(1568, 0.35, 'sine', 0.12, 0.1); },
    alarm() { tone(440, 0.15, 'square', 0.08); tone(440, 0.15, 'square', 0.08, 0.2); },
  };
}
