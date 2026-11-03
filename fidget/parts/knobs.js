import {
  reduce, D2R, clamp, f2, f3, rnd, css, C, TICK, BUTTER, el, set, grad, DOWN, svgIn, mat, skin, wake, S, spring, rest, snd,
} from '../kit.js';

const MARKUP = `<div class="grp" role="group" aria-label="Knobs">${[1, 2, 3].map(i => `<div class="ctl knob" tabindex="0" role="slider" aria-label="Knob ${i}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50"></div>`).join('')}</div>`;

// Grain in the track: a faint tick every sixtieth of a turn.
const grain = v => snd.play('grit', 0.018, 0.01, (t, P, G) => {
  snd.hiss(t, 'bandpass', 3400 * P, 2, 0.002, 0.05 * G * (0.3 + 0.7 * v));
});

export default {
  id: 'knobs', slot: 'small',
  css: `.p-knobs .grp { --n: 2; --sr: 2; --rows: 1.84; --gi: calc(var(--gap) * 0.3); grid-auto-flow: row; grid-template-columns: auto auto; row-gap: 0; }
.p-knobs .knob { --ar: 1; border-radius: 50%; cursor: ns-resize; }
.p-knobs .knob:nth-child(3) { grid-column: 1 / -1; justify-self: center; margin-top: calc(var(--h) * -0.16); }`,
  mount(cell) {
    cell.insertAdjacentHTML('beforeend', MARKUP);
    const bodies = [], moves = [];
    // Two knobs on top, one nested below between them.
    // Navy knurled skirts, cream caps, coral pointer lines; ticks light butter.
    // One quiet scrape serves all three knobs.
    const grit = snd.drone(2.2), speeds = [0, 0, 0];
    const KNURL = css([0.22, 0.03, 265]);
    cell.querySelectorAll('.knob').forEach((knobEl, i) => {
      const svg = svgIn(knobEl, '0 0 100 100'), defs = svg.k.defs, CX = 50, CY = 52, N = 11;
      // The sweep runs from 135 degrees left to 135 degrees right.
      const ang = v => (-135 + 270 * v) * D2R;
      const at = (r, a) => [f2(CX + r * Math.sin(a)), f2(CY - r * Math.cos(a))];
      const base = el('g', { stroke: TICK, 'stroke-linecap': 'round' }, svg), lit = el('g', { stroke: BUTTER, 'stroke-linecap': 'round' }, svg), tl = [];
      for (let k = 0; k < N; k++) {
        const a = ang(k / (N - 1)), [x1, y1] = at(40, a), [x2, y2] = at(47, a);
        const t = { x1, y1, x2, y2, 'stroke-width': k % 5 ? 3 : 4.2 };
        el('line', t, base);
        tl.push(el('line', { ...t, opacity: 0 }, lit));
      }
      skin(svg, svg, 'circle', { cx: CX, cy: CY, r: 34 }, mat(C.navy, 0.04), { rim: 2, shadow: { b: 3, y: 4, o: 0.6 } });
      const rot = el('g', {}, svg);
      const kn = el('g', { stroke: KNURL, 'stroke-width': 1.6, 'stroke-linecap': 'round', opacity: 0.8 }, rot);
      for (let k = 0; k < 36; k++) {
        const a = (k / 36) * Math.PI * 2, [x1, y1] = at(28, a), [x2, y2] = at(33, a);
        el('line', { x1, y1, x2, y2 }, kn);
      }
      const top = el('g', {}, svg);
      const cap = skin(svg, top, 'circle', { cx: CX, cy: CY, r: 23.5 }, mat(C.cream, 0.12), { rim: 1.8, shadow: { b: 2.5, y: 3, o: 0.45 } });
      el('circle', { cx: CX, cy: CY, r: 17, fill: grad(defs, 'linearGradient', DOWN, [[0, '#000', 0.14], [0.55, '#000', 0], [1, '#fff', 0.5]]).url }, top);
      const ptr = el('line', { x1: CX, y1: CY - 7, x2: CX, y2: CY - 20.5, stroke: css([0.66, 0.16, 32]), 'stroke-width': 3.6, 'stroke-linecap': 'round' }, top);

      // v turns the knob; modes are drag, coast, sweep and rest.
      const s = { v: S(0.5), pr: S(), mode: 'rest', k: 70, pid: null, y0: 0, x0: 0, v0: 0, span: 1, trail: [], grain: 30 };
      const body = {
        step(h) {
          const v = s.v;
          spring(s.pr, 700, 0.6, h);
          // The finger drags the knob on a soft spring, so it lags a touch.
          if (s.mode === 'drag') spring(v, 500, 0.85, h);
          else if (s.mode === 'sweep') spring(v, s.k, 1, h);
          else if (s.mode === 'coast') {
            // Let go, the knob coasts briefly on its grease.
            if (reduce) v.v = 0;
            v.v *= Math.exp(-7 * h);
            v.x += v.v * h;
            if (Math.abs(v.v) < 0.01) { v.v = 0; v.t = v.x; s.mode = 'rest'; }
          }
          // The pot's stops end the travel dead.
          if (v.x < 0 || v.x > 1) { v.x = clamp(v.x); v.v = 0; if (s.mode === 'coast') { v.t = v.x; s.mode = 'rest'; } }
          const g = Math.round(v.x * 60);
          if (g !== s.grain) { s.grain = g; grain(clamp(Math.abs(v.v) / 2)); }
        },
        busy() {
          const p = rest(s.pr);
          if (s.mode === 'coast') return true;
          if (s.mode === 'drag' || s.mode === 'sweep') {
            const r = rest(s.v, 5e-4);
            if (r && s.mode === 'sweep') s.mode = 'rest';
            return !r || !p;
          }
          return !p;
        },
        draw() {
          const v = clamp(s.v.x), deg = f2(-135 + 270 * v);
          set(rot, 'transform', `rotate(${deg} ${CX} ${CY})`);
          set(ptr, 'transform', `rotate(${deg} ${CX} ${CY})`);
          set(top, 'transform', `translate(${CX} ${CY}) scale(${f3(1 - 0.04 * s.pr.x)}) translate(${-CX} ${-CY})`);
          cap.paint(0.6 * s.pr.x);
          // Ticks light up to the value; the frontier tick fades in.
          const f = v * (N - 1);
          for (let k = 0; k < N; k++) set(tl[k], 'opacity', f2(clamp(f - k + 1)));
          set(knobEl, 'aria-valuenow', Math.round(clamp(s.mode === 'sweep' ? s.v.t : v) * 100));
          speeds[i] = Math.abs(s.v.v);
          const sp = clamp(Math.max(...speeds) / 2);
          grit.set(0.06 * sp, 1800 + 1600 * sp);
        },
      };
      // A sweep turns the knob smoothly to a value.
      function sweep(t, k) {
        s.mode = 'sweep'; s.k = k; s.v.t = clamp(t);
        wake(body);
      }
      knobEl.addEventListener('pointerdown', e => {
        if (s.pid != null || e.button > 0) return;
        s.pid = e.pointerId;
        try { knobEl.setPointerCapture(e.pointerId); } catch {}
        // One and a half knob heights of drag turn it end to end.
        s.span = knobEl.getBoundingClientRect().height * 1.5;
        s.y0 = e.clientY; s.x0 = e.clientX; s.v0 = s.v.t = clamp(s.v.x);
        s.mode = 'drag'; s.pr.t = 1; s.trail = [[e.timeStamp, s.v.t]];
        knobEl.classList.add('held');
        wake(body);
      });
      knobEl.addEventListener('pointermove', e => {
        if (e.pointerId !== s.pid) return;
        // Up or right turns the knob up.
        s.v.t = clamp(s.v0 + (s.y0 - e.clientY + (e.clientX - s.x0)) / s.span);
        s.trail.push([e.timeStamp, s.v.t]);
        while (s.trail.length > 2 && e.timeStamp - s.trail[0][0] > 120) s.trail.shift();
        wake(body);
      });
      const up = e => {
        if (e.pointerId !== s.pid) return;
        s.pid = null; s.pr.t = 0; knobEl.classList.remove('held');
        const t = e.timeStamp, q = s.trail.filter(p => t - p[0] < 100);
        let w = 0;
        if (q.length > 1 && t - q[q.length - 1][0] < 50) {
          const dt = (q[q.length - 1][0] - q[0][0]) / 1000;
          if (dt > 0.008) w = (q[q.length - 1][1] - q[0][1]) / dt;
        }
        if (!reduce && Math.abs(w) > 0.3) { s.mode = 'coast'; s.v.v = clamp(w, -4, 4); }
        else sweep(reduce ? s.v.t : s.v.x, 500);
        wake(body);
      };
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => knobEl.addEventListener(t, up));
      knobEl.addEventListener('keydown', e => {
        if (s.pid != null) return;
        const d = { ArrowUp: 0.05, ArrowRight: 0.05, ArrowDown: -0.05, ArrowLeft: -0.05, PageUp: 0.2, PageDown: -0.2 }[e.key];
        const from = s.mode === 'sweep' ? s.v.t : s.v.x;
        if (d) sweep(from + d, 260);
        else if (e.key === 'Home') sweep(0, 160);
        else if (e.key === 'End') sweep(1, 160);
        else return;
        e.preventDefault();
      });
      moves.push({
        el: knobEl,
        shuffle() { if (s.pid == null) sweep(rnd(0, 1), 70); },
        reset() { if (s.pid == null) sweep(0.5, 70); },
      });
      bodies.push(body);
    });
    return { bodies, moves, destroy() { grit.stop(); } };
  },
};
