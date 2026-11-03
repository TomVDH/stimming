import {
  reduce, D2R, R2D, clamp, f2, f3, KEYS, css, C, el, set, nid, grad, svgIn, mat, skin, wake, S, spring, rest, snd,
} from '../kit.js';

const MARKUP = `<div class="grp"><div class="ctl eggt" tabindex="0" role="slider" aria-label="Egg timer" aria-valuemin="0" aria-valuemax="60" aria-valuenow="0" aria-valuetext="Off"></div></div>`;

// Winding: a dry ratchet click per minute.
const ratchet = () => snd.play('timer-wind', 0.018, 0.03, (t, P, G) => {
  snd.hiss(t, 'bandpass', 3400 * P, 2, 0.004, 0.32 * G);
  snd.ring(t, 1700 * P, 1600 * P, 0.012, 0.04 * G);
});
// Running: a faint clockwork tick.
const tick = () => snd.play('timer-tick', 0.05, 0.02, (t, P, G) => {
  snd.hiss(t, 'highpass', 4800 * P, 0.7, 0.003, 0.09 * G);
  snd.ring(t, 2300 * P, 2280 * P, 0.01, 0.012 * G);
});
// Zero: a hammer trills on a small bell, the last strike rings on.
const ding = () => snd.play('timer-ding', 0.5, 1.2, (t, P, G) => {
  for (let i = 0; i < 8; i++) {
    const at = t + i * 0.055, g = G * (1 - i * 0.07), end = i === 7, f = 2350 * P;
    snd.hiss(at, 'highpass', 6000 * P, 0.7, 0.003, 0.1 * g);
    snd.ring(at, f, f * 0.998, end ? 0.9 : 0.3, 0.07 * g);
    snd.ring(at, f * 2.76, f * 2.75, end ? 0.4 : 0.12, 0.02 * g);
  }
});
// The ring meets an end stop.
const knock = () => snd.play('timer-stop', 0.1, 0.05, (t, P, G) => {
  snd.hiss(t, 'lowpass', 900 * P, 1, 0.02, 0.3 * G);
  snd.ring(t, 220 * P, 170 * P, 0.04, 0.18 * G);
});

export default {
  id: 'timer', slot: 'small',
  css: `.p-timer .grp { --sr: 0.842; } .p-timer .eggt { --ar: 160 / 190; border-radius: 45%; cursor: grab; }`,
  mount(cell) {
    cell.insertAdjacentHTML('beforeend', MARKUP);
    const bodies = [], moves = [];
    // A cream egg base under a coral dome.
    // A cream band on the dome carries the minutes and turns with it.
    const tEl = cell.querySelector('.eggt');
    bodies.push((() => {
      const svg = svgIn(tEl, '0 0 160 190'), defs = svg.k.defs;
      // The band wraps a cylinder of radius R.
      // One minute turns DEG degrees, so 0 and 60 stay apart.
      const CX = 80, SEAM = 104, R = 64, DEG = 5.5, RATE = 5, ink = css([0.3, 0.04, 262]);
      const rad = y => 66 * Math.sqrt(Math.max(0, 1 - ((SEAM - y) / 92) ** 2));
      const tg = el('g', {}, svg);
      skin(svg, tg, 'path', { d: `M14 ${SEAM}A66 80 0 0 0 146 ${SEAM}Z` }, mat(C.cream, 0), { rim: 2.5, shadow: { b: 6, y: 7, o: 0.6 } });
      el('path', { d: `M18 ${SEAM + 3}H142`, stroke: '#000', 'stroke-opacity': 0.18, 'stroke-width': 3, 'stroke-linecap': 'round' }, tg);
      const cg = el('g', {}, tg);
      const capD = `M14 ${SEAM}A66 92 0 0 1 146 ${SEAM}Z`;
      const cap = skin(svg, cg, 'path', { d: capD }, mat(C.coral, 0.1), { rim: 2.5, shadow: { b: 4, y: 4, o: 0.5 } });
      const id = nid('e');
      el('path', { d: capD }, el('clipPath', { id }, defs));
      const inCap = el('g', { 'clip-path': `url(#${id})` }, cg);
      // Grip ribs run up the dome and turn with it.
      const ribs = el('path', { fill: 'none', stroke: css([0.5, 0.15, 33]), 'stroke-width': 2.4, 'stroke-linecap': 'round', opacity: 0.55 }, inCap);
      // The band shades toward its edges like a drum.
      el('rect', { x: 0, y: 72, width: 160, height: 30, fill: css(C.cream) }, inCap);
      const marks = el('path', { fill: 'none', stroke: ink, 'stroke-width': 1.3, 'stroke-linecap': 'round' }, inCap);
      const lg = el('g', { fill: ink, 'font-family': 'Gabarito, sans-serif', 'font-weight': 800, 'font-size': 17, 'text-anchor': 'middle' }, inCap);
      const labels = [];
      for (let m = 0; m <= 60; m += 5) {
        const t = el('text', { x: 0, y: 90, dy: '0.36em' }, lg);
        t.textContent = String(m);
        labels.push([m, t]);
      }
      el('rect', { x: 0, y: 72, width: 160, height: 30, fill: grad(defs, 'linearGradient', { x1: 0, y1: 0, x2: 1, y2: 0 }, [[0, '#000', 0.45], [0.22, '#000', 0], [0.4, '#fff', 0.18], [0.6, '#fff', 0], [0.8, '#000', 0], [1, '#000', 0.45]]).url }, inCap);
      skin(svg, cg, 'ellipse', { cx: CX, cy: 13, rx: 11, ry: 7 }, mat(C.steel, 0), { rim: 1.5, shadow: { b: 2, y: 2, o: 0.5 } });
      // A navy index on the base reads the band.
      el('path', { d: `M${CX} 97L${CX + 7} 111L${CX - 7} 111Z`, fill: css(C.navy), stroke: css([0.25, 0.03, 265]), 'stroke-width': 1, 'stroke-linejoin': 'round' }, tg);

      // m is the set time; r is the band's drawn turn, both in minutes.
      // wb wobbles the timer and jp lifts the dome.
      const s = { m: 0, r: S(), wb: S(), jp: S(), mode: 'idle', n: 0, rt: 0, rk: -1, pid: null, x0: 0, m0: 0, moved: false, hit: false, rect: null, val: '' };
      const body = {
        step(h) {
          const r = s.r;
          if (s.mode === 'run') {
            // The clockwork runs a whole dial in twelve seconds.
            s.m = Math.max(0, s.m - RATE * h);
            r.x = r.t = s.m; r.v = 0;
            if (s.m === 0) { s.mode = 'ring'; s.rt = 0; s.rk = -1; ding(); }
          } else if (s.mode === 'wind') spring(r, 1500, 0.9, h);
          else if (s.mode === 'auto') {
            spring(r, 120, 0.9, h);
            if (Math.abs(r.t - r.x) < 0.03 && Math.abs(r.v) < 0.5) { r.x = r.t; r.v = 0; s.mode = s.m > 0 ? 'run' : 'idle'; }
          } else spring(r, 400, 0.9, h);
          // A minute boundary clicks while winding and ticks while running.
          const n = Math.floor(r.x + 1e-6);
          if (n !== s.n) {
            s.n = n;
            if (s.mode === 'run') tick();
            else if (s.mode === 'wind' || s.mode === 'auto') ratchet();
          }
          if (s.mode === 'ring') {
            // The hammer buzzes the whole timer for a moment.
            s.rt += h;
            const k = Math.floor(s.rt / 0.055);
            if (k !== s.rk && k < 8 && !reduce) { s.rk = k; s.wb.v += (k % 2 ? 1 : -1) * 70; s.jp.v -= 45; }
            if (s.rt > 0.5) s.mode = 'idle';
          }
          spring(s.wb, 500, 0.1, h);
          spring(s.jp, 900, 0.18, h);
        },
        busy() {
          const a = rest(s.r, 1e-3), b = rest(s.wb, 0.01), c = rest(s.jp, 0.01);
          return s.mode === 'run' || s.mode === 'ring' || s.mode === 'auto' || !(a && b && c);
        },
        draw() {
          const r = s.r.x;
          let rb = '', mk = '';
          // Ribs sit every 18 degrees round the dome.
          for (let i = 0; i < 20; i++) {
            const a = (i * 18 - r * DEG) * D2R, c = Math.cos(a), sn = Math.sin(a);
            if (c < 0.15) continue;
            rb += [24, 40, 56, 70].map((y, j) => `${j ? 'L' : 'M'}${f2(CX + rad(y) * sn)} ${y}`).join('');
          }
          for (let j = 0; j <= 60; j++) {
            const a = (j - r) * DEG * D2R;
            if (Math.cos(a) < 0.1) continue;
            mk += `M${f2(CX + R * Math.sin(a))} 73.5v${j % 5 ? 3.5 : 6}`;
          }
          set(ribs, 'd', rb || 'M0 0');
          set(marks, 'd', mk || 'M0 0');
          labels.forEach(([m, t]) => {
            const a = (m - r) * DEG * D2R, c = Math.cos(a);
            if (c < 0.2) { set(t, 'opacity', 0); return; }
            set(t, 'opacity', f3(clamp((c - 0.2) / 0.3)));
            set(t, 'transform', `translate(${f2(CX + R * Math.sin(a))} 0) scale(${f3(c)} 1)`);
          });
          set(tg, 'transform', `rotate(${f2(s.wb.x)} 80 186)`);
          set(cg, 'transform', `translate(0 ${f2(Math.min(0, s.jp.x))})`);
          cap.paint(s.pid != null ? 0.5 : 0);
          const v = Math.ceil(s.m - 1e-6), val = v ? `${v} minutes, ${s.mode === 'run' ? 'running' : 'set'}` : 'Off';
          if (val !== s.val) { s.val = val; tEl.setAttribute('aria-valuenow', String(v)); tEl.setAttribute('aria-valuetext', val); }
        },
      };
      // The band turns to a time, then the clockwork takes over.
      function setTo(m) {
        s.m = clamp(m, 0, 60); s.r.t = s.m;
        s.mode = 'auto';
        wake(body);
      }
      const local = e => ((e.clientX - s.rect.left) / s.rect.width) * 160;
      tEl.addEventListener('pointerdown', e => {
        if (s.pid != null || e.button > 0) return;
        s.pid = e.pointerId;
        try { tEl.setPointerCapture(e.pointerId); } catch {}
        s.rect = tEl.getBoundingClientRect();
        // A hand on the dome stops the clockwork where it is.
        s.x0 = local(e); s.m0 = s.mode === 'idle' || s.mode === 'ring' ? s.r.t : s.m; s.moved = false; s.hit = false;
        s.m = s.m0; s.r.t = s.m0;
        s.mode = 'wind'; tEl.classList.add('held');
        wake(body);
      });
      tEl.addEventListener('pointermove', e => {
        if (e.pointerId !== s.pid) return;
        const dx = local(e) - s.x0;
        if (Math.abs(dx) > 4) s.moved = true;
        // The band surface follows the finger, so a left drag winds it.
        const raw = s.m0 - (dx / R) * R2D / DEG, m = clamp(raw, 0, 60);
        if (m !== raw) { if (!s.hit) { s.hit = true; knock(); } }
        else s.hit = false;
        s.m = m; s.r.t = m;
        wake(body);
      });
      const up = e => {
        if (e.pointerId !== s.pid) return;
        s.pid = null; tEl.classList.remove('held');
        // A tap adds five minutes.
        if (!s.moved && e.type === 'pointerup') setTo(Math.ceil(s.m - 1e-6) + 5);
        else if (s.m > 0.5) { s.mode = 'run'; s.r.x = s.r.t = s.m; s.r.v = 0; }
        else { s.m = 0; s.r.t = 0; s.mode = 'idle'; }
        wake(body);
      };
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => tEl.addEventListener(t, up));
      tEl.addEventListener('keydown', e => {
        if (s.pid != null) return;
        const d = { ArrowUp: 5, ArrowRight: 5, ArrowDown: -5, ArrowLeft: -5, PageUp: 15, PageDown: -15 }[e.key];
        const now = Math.ceil(s.m - 1e-6);
        if (d) setTo(now + d);
        else if (KEYS.includes(e.key)) setTo(now + 5);
        else if (e.key === 'Home') zero();
        else return;
        e.preventDefault();
      });
      // Zeroing turns the band home without a sound.
      function zero() {
        s.m = 0; s.r.t = 0; s.mode = 'idle';
        wake(body);
      }
      moves.push({
        el: tEl,
        shuffle() { if (s.pid == null) setTo(10 + Math.round(Math.random() * 35)); },
        reset() { if (s.pid == null) zero(); },
      });
      return body;
    })());
    return { bodies, moves, destroy() {} };
  },
};
