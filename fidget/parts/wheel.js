import {
  NS, reduce, TAU, PI, D2R, R2D, clamp, lerp, mod, f2, f3, rnd, angDiff, KEYS, css, mixLch, ramp, C, TICK, BUTTER, el, set, nid, grad, DOWN, blur, LIGHT, svgIn, mat, skin, WELL, well, shine, wake, sleep, S, spring, rest, board, snd, BEZEL,
} from '../kit.js';

const MARKUP = `<div class="grp"><div class="ctl wheel" id="wheel" tabindex="0" role="slider" aria-orientation="vertical" aria-label="Thumb wheel" aria-valuemin="0" aria-valuemax="19" aria-valuenow="0"></div></div>`;

export default {
  id: 'wheel', slot: 'small',
  mount(cell) {
    cell.insertAdjacentHTML('beforeend', MARKUP);
    const bodies = [], moves = [];
    // A mint drum in a recessed slot; its ribs crowd toward the edges.
    const wheelEl = document.getElementById('wheel');
    bodies.push((() => {
      const svg = svgIn(wheelEl, '0 0 60 180'), defs = svg.k.defs;
      const N = 20, STEP = TAU / N, CY = 90, RR = 80, m = C.mint;
      well(svg, svg, 'rect', { width: 60, height: 180, rx: 15 }, { rim: 4 });
      // The drum's axis is level, so its light falls top to bottom.
      const tone = (dl, k = 1) => css([m[0] + dl, m[1] * k, m[2]]);
      el('rect', { x: 9, y: 9, width: 42, height: 162, rx: 9, fill: grad(defs, 'linearGradient', DOWN, [[0, tone(-0.3, 0.7)], [0.2, tone(-0.06)], [0.42, tone(0.09, 0.6)], [0.64, tone(0)], [1, tone(-0.34, 0.7)]]).url }, svg);
      const g = el('g', { stroke: tone(-0.34), 'stroke-linecap': 'round' }, svg), ribs = [];
      for (let k = 0; k < N; k++) ribs.push(el('line', { x1: 13, x2: 47 }, g));
      const s = { th: 0, w: 0, a: 0, T: 0, mode: 'rest', near: 0, pid: null, y0: 0, t0: 0, k: 0, trail: [] };
      // Drag follow, rib detents, flick friction, settle spring.
      const KD = 1500, CD = 70, AD = 50, AS = 30, CF = 1.6, MU = 9, WCAP = 3, KS = 600, CS = 26;
      const body = {
        step(h) {
          if (reduce) {
            if (s.mode === 'spin') { s.mode = 'settle'; s.T = Math.round(s.th / STEP) * STEP; }
            if (s.mode !== 'rest') { s.th = s.T; s.w = 0; s.a = 0; }
          } else {
            let a = 0;
            if (s.mode === 'drag') a = KD * (s.T - s.th) - CD * s.w - AD * Math.sin(N * s.th);
            else if (s.mode === 'spin') {
              // A light drum: friction drains a flick fast.
              a = -AS * Math.sin(N * s.th) - CF * s.w - MU * Math.sign(s.w);
              if (Math.abs(s.w) < WCAP) {
                s.mode = 'settle';
                s.T = (s.w > 0 ? Math.ceil(s.th / STEP) : Math.floor(s.th / STEP)) * STEP;
              }
            } else if (s.mode === 'settle') a = KS * (s.T - s.th) - CS * s.w;
            s.a = a;
            s.w += a * h;
            s.th += s.w * h;
          }
          // Each rib that rolls past the slot edge ticks.
          const r = Math.round(s.th / STEP);
          if (r !== s.near) { s.near = r; snd.rib(clamp(Math.abs(s.w) / 20)); }
        },
        busy() {
          if (s.mode === 'drag') return Math.abs(s.w) > 1e-3 || Math.abs(s.a) > 1e-2;
          if (s.mode === 'spin') return true;
          if (s.mode === 'settle') {
            if (Math.abs(s.T - s.th) > 2e-4 || Math.abs(s.w) > 2e-3) return true;
            // At rest the angle folds back into one turn.
            const k = mod(Math.round(s.T / STEP), N);
            s.th = s.T = k * STEP; s.w = 0; s.mode = 'rest'; s.near = k;
          }
          return false;
        },
        draw() {
          for (let k = 0; k < N; k++) {
            const a = s.th + k * STEP, c = Math.cos(a), rib = ribs[k];
            if (c < 0.05) { set(rib, 'opacity', 0); continue; }
            // Ribs crowd and thin toward the drum's edges.
            const y = f2(CY + RR * Math.sin(a));
            set(rib, 'y1', y); set(rib, 'y2', y);
            set(rib, 'stroke-width', f2(0.8 + 3 * c)); set(rib, 'opacity', f2(0.85 * Math.min(1, 1.6 * c)));
          }
          const T = s.mode === 'settle' || s.mode === 'rest' ? s.T : s.th;
          set(wheelEl, 'aria-valuenow', mod(-Math.round(T / STEP), N));
        },
      };
      wheelEl.addEventListener('pointerdown', e => {
        if (s.pid != null || e.button > 0) return;
        s.pid = e.pointerId;
        try { wheelEl.setPointerCapture(e.pointerId); } catch {}
        // The drum surface moves with the finger.
        s.k = 180 / wheelEl.getBoundingClientRect().height / RR;
        s.y0 = e.clientY; s.t0 = s.T = s.th;
        s.mode = 'drag'; s.trail = [[e.timeStamp, s.th]];
        wheelEl.classList.add('held');
        wake(body);
      });
      wheelEl.addEventListener('pointermove', e => {
        if (e.pointerId !== s.pid) return;
        s.T = s.t0 + (e.clientY - s.y0) * s.k;
        s.trail.push([e.timeStamp, s.T]);
        while (s.trail.length > 2 && e.timeStamp - s.trail[0][0] > 120) s.trail.shift();
        wake(body);
      });
      function end(e) {
        if (e.pointerId !== s.pid) return;
        s.pid = null; wheelEl.classList.remove('held');
        const t = e.timeStamp, q = s.trail.filter(p => t - p[0] < 100);
        let w = 0;
        if (q.length > 1 && t - q[q.length - 1][0] < 50) {
          const dt = (q[q.length - 1][0] - q[0][0]) / 1000;
          if (dt > 0.008) w = (q[q.length - 1][1] - q[0][1]) / dt;
        }
        if (!reduce && Math.abs(w) > 4) { s.mode = 'spin'; s.w = clamp(w, -40, 40); }
        else { s.mode = 'settle'; s.T = Math.round((reduce ? s.T : s.th) / STEP) * STEP; }
        wake(body);
      }
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => wheelEl.addEventListener(t, end));
      // Up rolls the drum away from you and counts up.
      wheelEl.addEventListener('keydown', e => {
        if (s.pid != null) return;
        const d = { ArrowUp: -1, ArrowRight: -1, ArrowDown: 1, ArrowLeft: 1, PageUp: -5, PageDown: 5 }[e.key];
        const base = s.mode === 'settle' ? s.T : Math.round(s.th / STEP) * STEP;
        if (d) { s.mode = 'settle'; s.T = base + d * STEP; }
        else if (e.key === 'Home') { s.mode = 'settle'; s.T = Math.round(s.th / TAU) * TAU; }
        else if (KEYS.includes(e.key)) {
          const dir = e.shiftKey ? 1 : -1;
          if (reduce) { s.mode = 'settle'; s.T = base + dir * STEP; }
          else { s.mode = 'spin'; s.w = clamp(s.w + dir * 16, -40, 40); }
        } else return;
        e.preventDefault();
        wake(body);
      });
      moves.push({
        el: wheelEl,
        shuffle() {
          if (s.pid != null) return;
          const dir = Math.random() < 0.5 ? -1 : 1;
          if (reduce) { s.mode = 'settle'; s.T = Math.round(s.th / STEP) * STEP + dir * Math.round(rnd(3, 9)) * STEP; }
          else { s.mode = 'spin'; s.w = dir * rnd(18, 34); }
          wake(body);
        },
        reset() {
          if (s.pid != null) return;
          s.mode = 'settle'; s.T = Math.round(s.th / TAU) * TAU;
          wake(body);
        },
      });
      return body;
    })());
    return { bodies, moves, destroy() {  } };
  },
};
