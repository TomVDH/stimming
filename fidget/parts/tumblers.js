import {
  reduce, TAU, clamp, mod, f2, f3, rnd, KEYS, css, ramp, C, el, set, nid, grad, DOWN, svgIn, mat, skin, well, wake, S, spring, rest, snd,
} from '../kit.js';

// The secret code opens the shackle.
const CODE = [2, 4, 6, 8];
// Drum centres and width in the 600 by 140 view box.
const WX = [92, 188, 284, 380], WW = 88;
const pc = v => f2(v) + '%';
const MARKUP = `<div class="grp"><div class="ctl lock" id="tumblers-lock" role="group" aria-label="Combination lock, locked">${WX.map((x, i) => `<div class="tw" tabindex="0" role="slider" aria-orientation="vertical" aria-label="Wheel ${i + 1}" aria-valuemin="0" aria-valuemax="9" aria-valuenow="0" style="left:${pc(((x - WW / 2) / 600) * 100)};width:${pc((WW / 600) * 100)}"></div>`).join('')}</div></div>`;

// A fine click for each digit that rolls past the read line.
const tick = v => snd.play('tumb', 0.012, 0.03, (t, P, G) => {
  G *= 0.35 + 0.65 * v;
  snd.hiss(t, 'highpass', 4800 * P, 0.9, 0.003, 0.32 * G);
  snd.ring(t, 3300 * P, 3240 * P, 0.018, 0.028 * G);
});
// The shackle springs free: an unlatch click, then two bright notes.
const chime = () => snd.play('chime', 0.3, 0.7, (t, P, G) => {
  snd.hiss(t, 'bandpass', 3600 * P, 1.4, 0.005, 0.24 * G);
  snd.ring(t, 260 * P, 150 * P, 0.07, 0.18 * G);
  [1046.5, 1568].forEach((f, i) => {
    const at = t + 0.07 + i * 0.11;
    snd.ring(at, f * P, f * P, i ? 0.55 : 0.22, 0.1 * G, 'triangle');
    snd.ring(at, 2 * f * P, 2 * f * P, i ? 0.3 : 0.12, 0.025 * G);
  });
});
// The shackle drops home with a dull clunk.
const clunk = () => snd.play('clunk', 0.05, 0.08, (t, P, G) => {
  snd.hiss(t, 'bandpass', 2200 * P, 1, 0.014, 0.4 * G);
  snd.ring(t, 160 * P, 100 * P, 0.06, 0.3 * G);
});

export default {
  id: 'tumblers', slot: 'row',
  css: `.p-tumblers .grp { --sr: 4.2857; }
.p-tumblers .lock { --ar: 600 / 140; border-radius: 20px; cursor: grab; }
.p-tumblers .tw { position: absolute; top: 15.714%; height: 68.571%; border-radius: 8px; pointer-events: none; }`,
  mount(cell) {
    cell.insertAdjacentHTML('beforeend', MARKUP);
    const bodies = [], moves = [];
    const lockEl = cell.querySelector('.lock'), tws = [...cell.querySelectorAll('.tw')];
    // A navy body holds four tall cream drums; a steel shackle loops off its right end.
    // The drum radius exceeds the window, so neighbours only peek at the edges.
    const VW = 600, VH = 140, CY = 70, R = 72, N = 10, STEP = TAU / N, FS = 52;
    const svg = svgIn(lockEl, `0 0 ${VW} ${VH}`), defs = svg.k.defs;
    // The shackle is a thick U lying on its side; its legs hide inside the body.
    const U = 'M420 24H536A46 46 0 0 1 536 116H420V96H536A26 26 0 0 0 536 44H420Z';
    const shG = el('g', {}, svg);
    skin(svg, shG, 'path', { d: U }, mat(C.steel, 0), { rim: 2, shadow: { b: 4, y: 6, o: 0.5 } });
    skin(svg, svg, 'rect', { x: 10, y: 8, width: 452, height: 124, rx: 30 }, mat(C.navy, 0.04), { rim: 2.5, shadow: { b: 7, y: 9, o: 0.6 } });
    well(svg, svg, 'rect', { x: 36, y: 17, width: 400, height: 106, rx: 14 }, { rim: 3.5 });
    // Two marks point at the read line; they light when the lock opens.
    const marks = ['M17 59L29 70L17 81Z', 'M455 59L443 70L455 81Z'].map(d => el('path', { d, 'stroke-width': 3, 'stroke-linejoin': 'round' }, svg));
    const LED = ramp([0.46, 0.02, 268], C.butter);
    // The drum's axis is level, so its light falls top to bottom.
    const tone = (dl, k = 1) => css([C.cream[0] + dl, C.cream[1] * k, C.cream[2]]);
    const drum = grad(defs, 'linearGradient', DOWN, [[0, tone(-0.45, 1.6)], [0.22, tone(-0.12, 1.3)], [0.42, tone(0.03)], [0.62, tone(-0.04)], [1, tone(-0.48, 1.6)]]).url;
    const shade = grad(defs, 'linearGradient', DOWN, [[0, '#000', 0.55], [0.3, '#000', 0], [0.7, '#000', 0], [1, '#000', 0.6]]).url;
    const INK = css([0.3, 0.04, 265]);
    const W = WX.map((x, i) => {
      const box = { x: x - WW / 2, y: 22, width: WW, height: 96 };
      const clip = el('clipPath', { id: nid('c') }, defs);
      el('rect', { ...box, rx: 9 }, clip);
      const g = el('g', { 'clip-path': `url(#${clip.id})` }, svg);
      el('rect', { ...box, fill: drum }, g);
      const dg = el('g', { fill: INK, 'font-size': FS, 'font-weight': 700, 'font-family': 'Gabarito, system-ui, sans-serif', 'text-anchor': 'middle' }, g);
      const digits = [];
      for (let k = 0; k < N; k++) { const d = el('text', { y: f2(0.355 * FS), opacity: 0 }, dg); d.textContent = String(k); digits.push(d); }
      // The shade curves the digits away; a gloss band catches the light.
      el('rect', { ...box, fill: shade }, g);
      el('rect', { x: x - 36, y: 34, width: 72, height: 6, rx: 3, fill: '#fff', opacity: 0.2 }, g);
      return { x, i, tw: tws[i], digits, th: 0, w: 0, a: 0, T: 0, mode: 'rest', near: 0, body: null };
    });

    // Drag follow, digit detents, flick friction, settle spring.
    const KD = 1500, CD = 70, AD = 50, AS = 30, CF = 1.6, MU = 9, WCAP = 3, KS = 600, CS = 26;
    // The front digit faces the read line.
    const val = w => mod(-w.near, N);
    W.forEach(w => {
      w.body = {
        step(h) {
          if (reduce) {
            if (w.mode === 'spin') { w.mode = 'settle'; w.T = Math.round(w.th / STEP) * STEP; }
            if (w.mode !== 'rest') { w.th = w.T; w.w = 0; w.a = 0; }
          } else {
            let a = 0;
            if (w.mode === 'drag') a = KD * (w.T - w.th) - CD * w.w - AD * Math.sin(N * w.th);
            else if (w.mode === 'spin') {
              a = -AS * Math.sin(N * w.th) - CF * w.w - MU * Math.sign(w.w);
              if (Math.abs(w.w) < WCAP) {
                w.mode = 'settle';
                w.T = (w.w > 0 ? Math.ceil(w.th / STEP) : Math.floor(w.th / STEP)) * STEP;
              }
            } else if (w.mode === 'settle') a = KS * (w.T - w.th) - CS * w.w;
            w.a = a;
            w.w += a * h;
            w.th += w.w * h;
          }
          // Each digit that crosses the read line clicks.
          const r = Math.round(w.th / STEP);
          if (r !== w.near) { w.near = r; tick(clamp(Math.abs(w.w) / 16)); check(); }
        },
        busy() {
          if (w.mode === 'drag') return Math.abs(w.w) > 1e-3 || Math.abs(w.a) > 1e-2;
          if (w.mode === 'spin') return true;
          if (w.mode === 'settle') {
            if (Math.abs(w.T - w.th) > 2e-4 || Math.abs(w.w) > 2e-3) return true;
            // At rest the angle folds back into one turn.
            const k = mod(Math.round(w.T / STEP), N);
            w.th = w.T = k * STEP; w.w = 0; w.mode = 'rest'; w.near = k;
            check();
          }
          return false;
        },
        draw() {
          for (let k = 0; k < N; k++) {
            const a = w.th + k * STEP, c = Math.cos(a), d = w.digits[k];
            if (c < 0.1) { set(d, 'opacity', 0); continue; }
            // Digits squash and fade as they curve round the drum.
            set(d, 'transform', `translate(${w.x} ${f2(CY + R * Math.sin(a))}) scale(1 ${f3(c)})`);
            set(d, 'opacity', f2(Math.min(1, 1.25 * c * c)));
          }
          const T = w.mode === 'settle' || w.mode === 'rest' ? w.T : w.th;
          set(w.tw, 'aria-valuenow', mod(-Math.round(T / STEP), N));
        },
      };
      bodies.push(w.body);
    });

    // The shackle pops out on a slack spring and swings up on its top leg.
    const sh = { lift: S(), tilt: S(), open: false };
    const shBody = {
      step(h) {
        if (sh.open) { spring(sh.lift, 420, 0.2, h); spring(sh.tilt, 140, 0.22, h); }
        else { spring(sh.lift, 1000, 0.55, h); spring(sh.tilt, 700, 0.7, h); }
        if (sh.lift.x < 0) { sh.lift.x = 0; if (sh.lift.v < 0) sh.lift.v *= -0.25; }
      },
      busy() { const a = rest(sh.lift), b = rest(sh.tilt); return !(a && b); },
      draw() {
        set(shG, 'transform', `translate(${f2(18 * sh.lift.x)} 0) rotate(${f2(-6 * sh.tilt.x)} 462 34)`);
        const c = LED(clamp(sh.lift.x));
        marks.forEach(m => { set(m, 'fill', c); set(m, 'stroke', c); });
      },
    };
    bodies.push(shBody);
    function pop() {
      sh.open = true; sh.lift.t = 1; sh.tilt.t = 1;
      if (!reduce) sh.lift.v = 5;
      chime(); snd.boing(0.6);
      lockEl.setAttribute('aria-label', 'Combination lock, open');
      wake(shBody);
    }
    function shut() {
      sh.open = false; sh.lift.t = 0; sh.tilt.t = 0;
      clunk();
      lockEl.setAttribute('aria-label', 'Combination lock, locked');
      wake(shBody);
    }
    // Any change breaks the code; the shackle opens only when all drums rest.
    function check() {
      const match = W.every((w, i) => val(w) === CODE[i]);
      if (sh.open && !match) shut();
      else if (!sh.open && match && W.every(w => w.mode === 'rest')) pop();
    }

    // The pointer takes the nearest drum; its surface moves with the finger.
    const s = { pid: null, di: -1, y0: 0, yv: 0, t0: 0, k: 0, trail: [], moved: false };
    lockEl.addEventListener('pointerdown', e => {
      if (s.pid != null || e.button > 0) return;
      const r = lockEl.getBoundingClientRect(), q = ((e.clientX - r.left) / r.width) * VW;
      let i = -1, best = 52;
      WX.forEach((x, k) => { const d = Math.abs(x - q); if (d < best) { best = d; i = k; } });
      if (i < 0) return;
      s.pid = e.pointerId;
      try { lockEl.setPointerCapture(e.pointerId); } catch {}
      const w = W[i];
      s.di = i; s.k = VH / r.height / R;
      s.y0 = e.clientY; s.yv = ((e.clientY - r.top) / r.height) * VH;
      s.t0 = w.T = w.th; w.mode = 'drag'; s.moved = false;
      s.trail = [[e.timeStamp, w.th]];
      lockEl.classList.add('held');
      wake(w.body);
    });
    lockEl.addEventListener('pointermove', e => {
      if (e.pointerId !== s.pid) return;
      const w = W[s.di], dy = e.clientY - s.y0;
      if (Math.abs(dy) > 4) s.moved = true;
      w.T = s.t0 + dy * s.k;
      s.trail.push([e.timeStamp, w.T]);
      while (s.trail.length > 2 && e.timeStamp - s.trail[0][0] > 120) s.trail.shift();
      wake(w.body);
    });
    function end(e) {
      if (e.pointerId !== s.pid) return;
      s.pid = null; lockEl.classList.remove('held');
      const w = W[s.di];
      // A tap rolls the digit above or below to the read line.
      if (!s.moved) {
        w.mode = 'settle';
        w.T = Math.round(w.th / STEP) * STEP + (e.type === 'pointerup' ? (s.yv < CY ? STEP : -STEP) : 0);
        wake(w.body);
        return;
      }
      const t = e.timeStamp, q = s.trail.filter(p => t - p[0] < 100);
      let v = 0;
      if (q.length > 1 && t - q[q.length - 1][0] < 50) {
        const dt = (q[q.length - 1][0] - q[0][0]) / 1000;
        if (dt > 0.008) v = (q[q.length - 1][1] - q[0][1]) / dt;
      }
      if (!reduce && Math.abs(v) > 4) { w.mode = 'spin'; w.w = clamp(v, -32, 32); }
      else { w.mode = 'settle'; w.T = Math.round((reduce ? w.T : w.th) / STEP) * STEP; }
      wake(w.body);
    }
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => lockEl.addEventListener(t, end));

    // A drum turns n digits up; the angle runs the other way.
    const base = w => (w.mode === 'settle' ? w.T : Math.round(w.th / STEP) * STEP);
    const turn = (w, n) => { w.mode = 'settle'; w.T = base(w) - n * STEP; wake(w.body); };
    // The shortest way round to a digit.
    const toDigit = (w, d) => turn(w, mod(d - mod(-Math.round(base(w) / STEP), N) + 5, N) - 5);
    function spin(w, dir, sp) {
      if (reduce) turn(w, -dir * Math.round(rnd(2, 8)));
      else { w.mode = 'spin'; w.w = clamp(w.w + dir * sp, -32, 32); wake(w.body); }
    }
    W.forEach(w => {
      w.tw.addEventListener('keydown', e => {
        if (s.pid != null) return;
        const d = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: 5, PageDown: -5 }[e.key];
        if (d) turn(w, d);
        else if (e.key === 'Home') toDigit(w, 0);
        else if (e.key === 'End') toDigit(w, 9);
        else if (/^[0-9]$/.test(e.key)) toDigit(w, +e.key);
        // Space flicks the drum up; Shift flicks it down.
        else if (KEYS.includes(e.key)) spin(w, e.shiftKey ? 1 : -1, 16);
        else return;
        e.preventDefault();
      });
      moves.push({
        el: w.tw,
        shuffle() { if (s.pid == null) spin(w, Math.random() < 0.5 ? -1 : 1, rnd(12, 26)); },
        reset() { if (s.pid == null) { w.mode = 'settle'; w.T = Math.round(w.th / TAU) * TAU; wake(w.body); } },
      });
    });
    return { bodies, moves, destroy() {} };
  },
};
