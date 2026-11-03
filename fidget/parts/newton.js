import {
  reduce, clamp, f2, f3, rnd, KEYS, css, C, el, set, svgIn, mat, skin, wake, snd,
} from '../kit.js';

// The view box, the pivot line, the string length and the ball size.
const VW = 640, VH = 170, PY = 18, L = 108, BR = 22, NB = 5;
// A hair of space keeps the resting balls apart.
const X0 = Array.from({ length: NB }, (_, i) => VW / 2 + (i - 2) * (2 * BR + 0.2));
const MARKUP = `<div class="grp"><div class="ctl cradle" id="newton" tabindex="0" role="button" aria-label="Newton's cradle. Space swings one ball; arrows pick the side, up and down swing two."></div></div>`;

// Steel on steel: a sharp click with a high, short ring.
const knock = v => snd.play('newton', 0.02, 0.05, (t, P, G) => {
  G *= 0.2 + 0.8 * v;
  snd.hiss(t, 'highpass', 5200 * P, 0.8, 0.003, 0.32 * G);
  snd.ring(t, 3700 * P, 3650 * P, 0.035, 0.05 * G);
  snd.ring(t, 6100 * P, 6050 * P, 0.02, 0.025 * G);
  snd.ring(t, 1500 * P, 1450 * P, 0.015, 0.04 * G);
});

export default {
  id: 'newton', slot: 'row',
  css: `.p-newton .grp { --sr: ${f3(VW / VH)}; } .p-newton .cradle { --ar: ${VW} / ${VH}; border-radius: 16px; cursor: grab; }`,
  mount(cell) {
    cell.insertAdjacentHTML('beforeend', MARKUP);
    const bodies = [], moves = [];
    // A navy frame on a coral base hangs five steel balls on string pairs.
    const nEl = cell.querySelector('.cradle');
    bodies.push((() => {
      const svg = svgIn(nEl, `0 0 ${VW} ${VH}`);
      const NAVY = mat(C.navy, 0), FRAME = { b: 5, y: 7, o: 0.55 };
      skin(svg, svg, 'rect', { x: 40, y: 152, width: VW - 80, height: 16, rx: 8 }, mat(C.coral, 0), { rim: 2, shadow: { b: 6, y: 6, o: 0.55 } });
      skin(svg, svg, 'rect', { x: 68, y: 10, width: 14, height: 146, rx: 6 }, NAVY, { rim: 2, shadow: FRAME });
      skin(svg, svg, 'rect', { x: VW - 82, y: 10, width: 14, height: 146, rx: 6 }, NAVY, { rim: 2, shadow: FRAME });
      const strings = el('g', { stroke: css([0.9, 0.03, 85]), 'stroke-width': 1.6, 'stroke-linecap': 'round', opacity: 0.85 }, svg);
      const lines = X0.map(() => [el('line', {}, strings), el('line', {}, strings)]);
      skin(svg, svg, 'rect', { x: 60, y: 6, width: VW - 120, height: 15, rx: 7.5 }, NAVY, { rim: 2, shadow: { b: 4, y: 5, o: 0.5 } });
      // Each ball is chrome: a dark horizon below and a hot spot above.
      const STEEL = mat(C.steel, 0), HORIZON = css(C.navy);
      const balls = X0.map(() => {
        const g = el('g', {}, svg);
        skin(svg, g, 'circle', { cx: 0, cy: 0, r: BR }, STEEL, { rim: 2, shadow: { b: 4, y: 7, o: 0.5 } });
        el('path', { d: `M${-BR + 1} 2A${BR - 1} ${BR - 1} 0 0 0 ${BR - 1} 2Q0 -3 ${-BR + 1} 2Z`, fill: HORIZON, opacity: 0.28 }, g);
        el('ellipse', { cx: 0, cy: 14, rx: 11, ry: 3.5, fill: '#fff', opacity: 0.22 }, g);
        el('ellipse', { cx: -7, cy: -9, rx: 7, ry: 4.2, fill: '#fff', opacity: 0.8, transform: 'rotate(-35 -7 -9)' }, g);
        return g;
      });

      // th and w hold each ball's angle and swing speed.
      // kin is a group the hand or a shuffle holds; it moves like a wall.
      const th = new Float64Array(NB), w = new Float64Array(NB);
      const s = { kin: null, damp: false, pid: null, rect: null, off: 0, grab: 0 };
      // Gravity over length, air drag, pivot friction, bounce.
      const GL = 49, AIR = 0.3, FR = 0.25, E = 0.985, TOL = 0.6;
      const held = i => !!s.kin && s.kin.g.includes(i);
      const xOf = i => X0[i] + L * Math.sin(th[i]);
      const put = (i, x) => { th[i] = Math.asin(clamp((x - X0[i]) / L, -1, 1)); };
      // One pass of contacts; equal masses trade their speeds.
      function contacts() {
        let hit = 0;
        for (let pass = 0; pass < 6; pass++) {
          for (let k = 0; k < 2 * (NB - 1); k++) {
            const i = k < NB - 1 ? k : 2 * (NB - 1) - k - 1, j = i + 1;
            const hi = held(i), hj = held(j);
            if (hi && hj) continue;
            const gap = xOf(j) - xOf(i) - 2 * BR;
            if (gap > TOL) continue;
            const wi = w[i], wj = w[j];
            if (wi > wj) {
              if (hi) w[j] = wi + E * (wi - wj);
              else if (hj) w[i] = wj - E * (wi - wj);
              else { const m = (wi + wj) / 2, d = (E * (wi - wj)) / 2; w[i] = m - d; w[j] = m + d; }
              if (!pass) hit = Math.max(hit, wi - wj);
            }
            // Overlap pushes the free ball or balls apart.
            if (gap < 0) {
              if (hi) put(j, xOf(j) - gap);
              else if (hj) put(i, xOf(i) + gap);
              else { const xi = xOf(i), xj = xOf(j); put(i, xi + gap / 2); put(j, xj - gap / 2); }
            }
          }
        }
        return hit;
      }
      const body = {
        step(h) {
          if (reduce) {
            // Reduced motion: the held group follows the hand; nothing swings.
            for (let i = 0; i < NB; i++) { th[i] = held(i) ? s.kin.T : 0; w[i] = 0; }
            if (s.kin?.auto) s.kin = null;
            return;
          }
          let hit = 0;
          const hh = h / 2, follow = 1 - Math.exp(-30 * hh), air = Math.exp(-(s.damp ? 8 : AIR) * hh);
          for (let n = 0; n < 2; n++) {
            for (let i = 0; i < NB; i++) {
              if (held(i)) {
                const d = (s.kin.T - th[i]) * follow;
                th[i] += d; w[i] = d / hh;
                continue;
              }
              w[i] = (w[i] - GL * Math.sin(th[i]) * hh) * air;
              w[i] -= Math.sign(w[i]) * Math.min(Math.abs(w[i]), FR * hh);
              th[i] += w[i] * hh;
            }
            hit = Math.max(hit, contacts());
          }
          if (hit > 0.3) knock(clamp(hit / 6));
          // A shuffle lets go once its balls reach their mark.
          const k = s.kin;
          if (k?.auto && k.g.every(i => Math.abs(th[i] - k.T) < 0.01)) {
            k.g.forEach(i => { w[i] = 0; });
            s.kin = null;
          }
        },
        busy() {
          if (s.kin) return s.kin.auto || s.kin.g.some(i => Math.abs(th[i] - s.kin.T) > 1e-3) || [...w].some((v, i) => !held(i) && Math.abs(v) > 0.02);
          // Near the bottom the balls settle and stop.
          if (th.every(v => Math.abs(v) < 0.012) && w.every(v => Math.abs(v) < 0.04)) {
            th.fill(0); w.fill(0); s.damp = false;
            return false;
          }
          return true;
        },
        draw() {
          for (let i = 0; i < NB; i++) {
            const x = f2(xOf(i)), y = f2(PY + L * Math.cos(th[i]));
            set(balls[i], 'transform', `translate(${x} ${y})`);
            lines[i].forEach((ln, k) => {
              set(ln, 'x1', f2(X0[i] + (k ? 11 : -11))); set(ln, 'y1', PY);
              set(ln, 'x2', x); set(ln, 'y2', y);
            });
          }
        },
      };
      // A pulled ball takes its outer neighbours along.
      function group(i, right) {
        if (i < 2 || (i === 2 && !right)) return { g: Array.from({ length: i + 1 }, (_, k) => k), side: -1 };
        return { g: Array.from({ length: NB - i }, (_, k) => i + k), side: 1 };
      }
      const lim = (side, T) => (side < 0 ? clamp(T, -1.05, 0) : clamp(T, 0, 1.05));
      // Shuffle and keys pull one or two end balls out, then let go.
      function launch(side, n) {
        if (s.pid != null) return;
        const g = side < 0 ? [0, 1].slice(0, n) : [4, 3].slice(0, n).reverse();
        if (reduce) { knock(0.7); return; }
        s.damp = false;
        s.kin = { g, side, T: side * rnd(0.6, 0.85), auto: true };
        wake(body);
      }
      const local = e => [((e.clientX - s.rect.left) / s.rect.width) * VW, ((e.clientY - s.rect.top) / s.rect.height) * VH];
      nEl.addEventListener('pointerdown', e => {
        if (s.pid != null || e.button > 0) return;
        s.rect = nEl.getBoundingClientRect();
        const [px, py] = local(e);
        let best = -1, bd = 1.7 * BR;
        for (let i = 0; i < NB; i++) {
          const d = Math.hypot(px - xOf(i), py - (PY + L * Math.cos(th[i])));
          if (d < bd) { bd = d; best = i; }
        }
        if (best < 0) return;
        s.pid = e.pointerId;
        try { nEl.setPointerCapture(e.pointerId); } catch {}
        const { g, side } = group(best, px > xOf(best));
        // The grab point stays under the finger.
        s.grab = best;
        s.off = th[best] - Math.atan2(px - X0[best], py - PY);
        s.kin = { g, side, T: lim(side, th[best]), auto: false };
        s.damp = false;
        nEl.classList.add('held');
        wake(body);
      });
      nEl.addEventListener('pointermove', e => {
        if (e.pointerId !== s.pid || !s.kin) return;
        const [px, py] = local(e);
        s.kin.T = lim(s.kin.side, Math.atan2(px - X0[s.grab], py - PY) + s.off);
        wake(body);
      });
      const up = e => {
        if (e.pointerId !== s.pid) return;
        s.pid = null; nEl.classList.remove('held');
        // The hand lets go; a flick keeps its speed.
        if (s.kin) {
          s.kin.g.forEach(i => { w[i] = clamp(w[i], -6, 6); });
          if (reduce) knock(0.5);
          s.kin = null;
        }
        wake(body);
      };
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => nEl.addEventListener(t, up));
      nEl.addEventListener('keydown', e => {
        const k = { ArrowLeft: [-1, 1], ArrowRight: [1, 1], ArrowUp: [-1, 2], ArrowDown: [1, 2] }[e.key];
        if (k) launch(...k);
        else if (KEYS.includes(e.key)) { if (!e.repeat) launch(-1, 1); }
        else if (e.key === 'Escape' || e.key === 'Home') stop();
        else return;
        e.preventDefault();
      });
      // A hand on the balls damps them all.
      function stop() {
        if (s.pid != null) return;
        if (s.kin?.auto) s.kin = null;
        s.damp = true;
        wake(body);
      }
      moves.push({
        el: nEl,
        shuffle() { launch(Math.random() < 0.5 ? -1 : 1, Math.random() < 0.65 ? 1 : 2); },
        reset: stop,
      });
      return body;
    })());
    return { bodies, moves, destroy() {} };
  },
};
