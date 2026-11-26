// hud.js — one job: the cockpit instruments and mission text, all DOM + one canvas.
// Altitude, speed, heading, fuel, damage, throttle, compass strip and an
// artificial horizon. main.js calls update() every frame with plain numbers.
export function createHud() {
  const el = (id) => document.getElementById(id);
  const horizon = el('horizon');
  const hctx = horizon.getContext('2d');

  function drawHorizon(pitch, roll) {
    const W = horizon.width, H = horizon.height;
    hctx.clearRect(0, 0, W, H);
    hctx.save();
    hctx.translate(W / 2, H / 2);
    hctx.rotate(roll);
    const dy = pitch * 60;
    hctx.fillStyle = '#3f8fd2'; hctx.fillRect(-W, -H + dy, W * 2, H);
    hctx.fillStyle = '#8a6b46'; hctx.fillRect(-W, dy, W * 2, H);
    hctx.fillStyle = '#ffffff'; hctx.fillRect(-W, dy - 1, W * 2, 2);
    hctx.restore();
    // Fixed wings marker
    hctx.strokeStyle = '#ffe14d'; hctx.lineWidth = 3;
    hctx.beginPath();
    hctx.moveTo(W / 2 - 34, H / 2); hctx.lineTo(W / 2 - 12, H / 2);
    hctx.moveTo(W / 2 + 12, H / 2); hctx.lineTo(W / 2 + 34, H / 2);
    hctx.stroke();
    hctx.fillStyle = '#ffe14d';
    hctx.beginPath(); hctx.arc(W / 2, H / 2, 4, 0, Math.PI * 2); hctx.fill();
  }

  function compass(headingDeg) {
    const pts = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    let s = '';
    for (let d = -60; d <= 60; d += 15) {
      const deg = (Math.round(headingDeg) + d + 360) % 360;
      const label = deg % 45 === 0 ? pts[Math.round(deg / 45) % 8] : String(deg);
      s += `<span style="opacity:${1 - Math.abs(d) / 75}">${label}</span>`;
    }
    return s;
  }

  let lastMsg = '';
  return {
    update(s) {
      el('alt').textContent = Math.max(0, Math.round(s.alt)) + ' m';
      el('spd').textContent = Math.round(s.speedKmh) + ' km/h';
      el('hdg').textContent = String(Math.round(s.headingDeg)).padStart(3, '0') + '°';
      el('compass').innerHTML = compass(s.headingDeg);
      el('fuel-fill').style.width = Math.max(0, s.fuel) + '%';
      el('fuel-fill').className = 'fill' + (s.fuel < 25 ? ' low' : '');
      el('dmg-fill').style.width = Math.max(0, s.damage) + '%';
      el('thr-fill').style.width = Math.round(s.throttle * 100) + '%';
      el('thr-val').textContent = Math.round(s.throttle * 100) + '%';
      el('score').textContent = String(s.score);
      el('mission-title').textContent = s.missionTitle;
      el('mission-brief').textContent = s.missionBrief;
      el('mission-state').textContent = s.missionState;
      el('timer').textContent = s.timerText;
      el('timer').style.display = s.timerText ? 'block' : 'none';
      el('storm-warn').style.display = s.inStorm ? 'block' : 'none';
      el('fuel-warn').style.display = s.fuel < 25 ? 'block' : 'none';
      drawHorizon(s.pitch, s.roll);
      if (s.message && s.message !== lastMsg) {
        const m = el('message');
        m.textContent = s.message;
        m.classList.remove('show'); void m.offsetWidth; m.classList.add('show');
        lastMsg = s.message;
      }
    },
    setOverlay(html) { el('overlay').innerHTML = html; el('overlay').style.display = html ? 'flex' : 'none'; },
    setBanner(text, sub) {
      const b = el('banner');
      b.innerHTML = text ? `<div class="banner-title">${text}</div><div class="banner-sub">${sub || ''}</div>` : '';
      b.style.display = text ? 'block' : 'none';
    },
  };
}
