import {
  NS, reduce, TAU, PI, D2R, R2D, clamp, lerp, mod, f2, f3, rnd, angDiff, KEYS, css, mixLch, ramp, C, TICK, BUTTER, el, set, nid, grad, DOWN, blur, LIGHT, svgIn, mat, skin, WELL, well, shine, wake, sleep, S, spring, rest, board, snd, BEZEL,
} from '../kit.js';

const MARKUP = `<div class="grp"><div class="ctl dial" id="dial" tabindex="0" role="slider" aria-label="Dial" aria-valuemin="0" aria-valuemax="23" aria-valuenow="0"></div></div>`;

export default {
  id: 'dial', slot: 'big',
  mount(cell) {
    cell.insertAdjacentHTML('beforeend', MARKUP);
    const bodies = [], moves = [];
    // A navy knurled skirt and a cream dished cap; the ticks light butter.
    const dialEl = document.getElementById('dial');
    bodies.push((() => {
      const svg = svgIn(dialEl, '0 0 400 400'), defs = svg.k.defs;
      const CX = 200, N = 24, STEP = TAU / N;
      const at = (r, a) => [f2(CX + r * Math.sin(a)), f2(CX - r * Math.cos(a))];
      const ticks = el('g', { stroke: TICK, 'stroke-linecap': 'round' }, svg), lit = el('g', { stroke: BUTTER, 'stroke-linecap': 'round' }, svg), tl = [];
      for (let k = 0; k < N; k++) {
        const [x1, y1] = at(k % 6 ? 180 : 171, k * STEP), [x2, y2] = at(194, k * STEP);
        const a = { x1, y1, x2, y2, 'stroke-width': k % 6 ? 5 : 8 };
        el('line', a, ticks);
        tl.push(el('line', { ...a, opacity: 0 }, lit));
      }
      // The skirt's body stays lit from the top left; only its knurl turns.
      const skirt = skin(svg, svg, 'circle', { cx: CX, cy: CX, r: 156 }, mat(C.navy, 0.04), { rim: 3, shadow: { b: 9, y: 11, o: 0.6 } });
      const knob = el('g', { stroke: css([0.22, 0.03, 265]), 'stroke-width': 3.2, 'stroke-linecap': 'round', opacity: 0.75 }, svg);
      for (let k = 0; k < 60; k++) {
        const [x1, y1] = at(139, (k / 60) * TAU), [x2, y2] = at(153, (k / 60) * TAU);
        el('line', { x1, y1, x2, y2 }, knob);
      }
      const top = el('g', {}, svg);
      const cap = skin(svg, top, 'circle', { cx: CX, cy: CX, r: 120 }, mat(C.cream, 0.12), { rim: 2.5, shadow: { b: 5, y: 6, o: 0.45 } });
      // The dish darkens at the top edge and catches light below.
      el('circle', { cx: CX, cy: CX, r: 92, fill: grad(defs, 'linearGradient', DOWN, [[0, '#000', 0.16], [0.55, '#000', 0], [1, '#fff', 0.5]]).url }, top);
      const ind = el('g', {}, top);
      el('rect', { x: CX - 12, y: CX - 113, width: 24, height: 66, rx: 12, fill: css([0.5, 0.05, 265]), opacity: 0.35 }, ind);
      el('rect', { x: CX - 9, y: CX - 110, width: 18, height: 60, rx: 9, fill: grad(defs, 'linearGradient', DOWN, [[0, css([0.77, 0.14, 38])], [1, css([0.62, 0.16, 30])]]).url }, ind);
      void skirt;

      const s = { th: 0, w: 0, a: 0, T: 0, mode: 'rest', pr: S(), fl: new Float32Array(N), floor: 0, near: 0, pid: null, pu: 0, prev: 0, off: 0, trail: [], rect: null, run: -1, rk: 0, r0: 0 };
      // The launch run lights one tick every 18 ms.
      const RUN = 0.018;
      // Drag follow, detent pull, spin friction, settle spring.
      const KD = 1600, CD = 68, AD = 70;
      const AS = 14, CF = 0.4, MU = 4.5, WCAP = 2.2;
      const KS = 520, CS = 23;

      function cross() {
        const f = Math.floor(s.th / STEP + 1e-6);
        if (f === s.floor) return;
        // Each detent the indicator passes lights its tick.
        if (!reduce && (s.mode === 'drag' || Math.abs(s.w) > 0.3)) {
          const lo = Math.min(f, s.floor), hi = Math.min(Math.max(f, s.floor), lo + N);
          for (let k = lo + 1; k <= hi; k++) s.fl[mod(k, N)] = 1;
        }
        s.floor = f;
      }
      function click() {
        // Each ridge between detents clicks as the knob rolls over it.
        const r = Math.round(s.th / STEP);
        if (r !== s.near) { s.near = r; snd.dial(clamp(Math.abs(s.w) / 24)); }
      }
      const body = {
        step(h) {
          if (reduce) {
            if (s.mode === 'spin') { s.mode = 'settle'; s.T = Math.round(s.th / STEP) * STEP; }
            if (s.mode !== 'rest') { s.th = s.T; s.w = 0; s.a = 0; }
            s.fl.fill(0);
            s.run = -1;
            spring(s.pr, 700, 0.45, h);
            cross();
            click();
            return;
          }
          let a = 0;
          if (s.mode === 'drag') a = KD * (s.T - s.th) - CD * s.w - AD * Math.sin(N * s.th);
          else if (s.mode === 'spin') {
            // Friction drains the flick; detents ripple its speed.
            a = -AS * Math.sin(N * s.th) - CF * s.w - MU * Math.sign(s.w);
            if (Math.abs(s.w) < WCAP) {
              s.mode = 'settle';
              s.T = (s.w > 0 ? Math.ceil(s.th / STEP) : Math.floor(s.th / STEP)) * STEP;
            }
          } else if (s.mode === 'settle') a = KS * (s.T - s.th) - CS * s.w;
          s.a = a;
          s.w += a * h;
          s.th += s.w * h;
          cross();
          click();
          // The run laps the ring once, clockwise from the indicator.
          if (s.run >= 0) {
            s.run += h;
            const n = Math.min(N, Math.floor(s.run / RUN));
            for (; s.rk < n; s.rk++) s.fl[mod(s.r0 + s.rk + 1, N)] = 1;
            if (s.rk >= N) s.run = -1;
          }
          const k = Math.exp(-6 * h);
          for (let i = 0; i < N; i++) if (s.fl[i]) s.fl[i] = s.fl[i] < 0.004 ? 0 : s.fl[i] * k;
          spring(s.pr, 700, 0.45, h);
        },
        busy() {
          let moving = s.mode === 'spin';
          if (s.mode === 'drag') moving = Math.abs(s.w) > 1e-3 || Math.abs(s.a) > 1e-2;
          else if (s.mode === 'settle') {
            if (Math.abs(s.T - s.th) < 2e-4 && Math.abs(s.w) < 2e-3) {
              // At rest the angle folds back into one turn.
              const k = mod(Math.round(s.T / STEP), N);
              s.th = s.T = k * STEP; s.w = 0; s.mode = 'rest'; s.floor = s.near = k;
            } else moving = true;
          }
          const lit = s.fl.some(v => v > 0), still = rest(s.pr);
          return moving || lit || !still || s.run >= 0;
        },
        draw() {
          const deg = mod(s.th * R2D, 360), r = `rotate(${f2(deg)} 200 200)`;
          set(knob, 'transform', r);
          set(ind, 'transform', r);
          const p = s.pr.x;
          set(top, 'transform', `translate(200 200) scale(${f3(1 - 0.03 * p)}) translate(-200 -200)`);
          cap.paint(p * 0.8);
          const cur = mod(Math.round(s.th / STEP), N);
          // A primed board holds the whole ring faintly lit.
          const base = board.primed ? 0.45 : 0;
          for (let k = 0; k < N; k++) set(tl[k], 'opacity', f2(Math.max(s.fl[k], base, k === cur ? 0.55 : 0)));
          set(dialEl, 'aria-valuenow', s.mode === 'settle' || s.mode === 'rest' ? mod(Math.round(s.T / STEP), N) : cur);
        },
      };

      function polar(e) {
        const r = s.rect, dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        return [Math.atan2(dx, -dy), Math.hypot(dx, dy) / (r.width / 2)];
      }
      dialEl.addEventListener('pointerdown', e => {
        if (s.pid != null || e.button > 0) return;
        s.pid = e.pointerId;
        try { dialEl.setPointerCapture(e.pointerId); } catch {}
        s.rect = dialEl.getBoundingClientRect();
        const [a] = polar(e);
        // The grab point stays under the finger as the knob turns.
        s.prev = s.pu = a; s.off = s.th - a; s.T = s.th;
        s.mode = 'drag'; s.trail = [[e.timeStamp, a]];
        s.pr.t = 1; dialEl.classList.add('held');
        wake(body);
      });
      dialEl.addEventListener('pointermove', e => {
        if (e.pointerId !== s.pid) return;
        const [a, d] = polar(e);
        if (d < 0.1) return;
        s.pu += angDiff(a, s.prev); s.prev = a;
        s.T = s.pu + s.off;
        s.trail.push([e.timeStamp, s.pu]);
        while (s.trail.length > 2 && e.timeStamp - s.trail[0][0] > 120) s.trail.shift();
        wake(body);
      });
      function end(e) {
        if (e.pointerId !== s.pid) return;
        s.pid = null; s.pr.t = 0; dialEl.classList.remove('held');
        // Pointer speed over the last 100 ms decides flick or snap.
        const t = e.timeStamp, q = s.trail.filter(p => t - p[0] < 100);
        let w = 0;
        if (q.length > 1 && t - q[q.length - 1][0] < 50) {
          const dt = (q[q.length - 1][0] - q[0][0]) / 1000;
          if (dt > 0.008) w = (q[q.length - 1][1] - q[0][1]) / dt;
        }
        if (!reduce && Math.abs(w) > 5) { s.mode = 'spin'; s.w = clamp(w, -45, 45); }
        else { s.mode = 'settle'; s.T = Math.round((reduce ? s.T : s.th) / STEP) * STEP; }
        wake(body);
      }
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => dialEl.addEventListener(t, end));
      dialEl.addEventListener('keydown', e => {
        if (s.pid != null) return;
        const d = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 6, PageDown: -6 }[e.key];
        const base = s.mode === 'settle' ? s.T : Math.round(s.th / STEP) * STEP;
        if (d) { s.mode = 'settle'; s.T = base + d * STEP; }
        else if (e.key === 'Home') { s.mode = 'settle'; s.T = Math.round(s.th / TAU) * TAU; }
        else if (KEYS.includes(e.key)) {
          // Space flicks the knob; Shift flicks it backwards.
          const dir = e.shiftKey ? -1 : 1;
          if (reduce) { s.mode = 'settle'; s.T = base + dir * STEP; }
          else { s.mode = 'spin'; s.w = clamp(s.w + dir * 14, -45, 45); }
        } else return;
        e.preventDefault();
        if (s.mode === 'settle') set(dialEl, 'aria-valuenow', mod(Math.round(s.T / STEP), N));
        wake(body);
      });
      moves.push({
        el: dialEl,
        // Shuffle flicks the knob; reduced motion steps it instead.
        shuffle() {
          if (s.pid != null) return;
          const dir = Math.random() < 0.5 ? -1 : 1;
          if (reduce) { s.mode = 'settle'; s.T = Math.round(s.th / STEP) * STEP + dir * Math.round(rnd(3, 11)) * STEP; }
          else { s.mode = 'spin'; s.w = dir * rnd(16, 34); }
          wake(body);
        },
        // Reset turns the indicator back to the top.
        reset() {
          if (s.pid != null) return;
          s.mode = 'settle'; s.T = Math.round(s.th / TAU) * TAU;
          wake(body);
        },
      });
      board.dial = {
        // One woken frame redraws the ring.
        prime() { wake(body); },
        run() {
          if (reduce) return;
          s.r0 = mod(Math.round(s.th / STEP), N); s.run = 0; s.rk = 0;
          wake(body);
        },
      };
      return body;
    })());
    return { bodies, moves, destroy() { board.dial = null; } };
  },
};
