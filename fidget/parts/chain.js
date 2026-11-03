import { reduce, R2D, clamp, f2, f3, rnd, css, ramp, C, el, set, grad, svgIn, mat, skin, wake, S, spring, rest, snd } from '../kit.js';

const MARKUP = `<div class="grp"><button class="ctl pchain" id="chain-pull" type="button" role="switch" aria-checked="false" aria-label="Pull chain lamp"></button></div>`;

// The switch: a crisp click with a small body knock.
const click = on => snd.play('chain-click', 0.03, 0.07, (t, P, G) => {
  const k = (on ? 1.06 : 0.94) * P;
  snd.hiss(t, 'highpass', 5000 * k, 0.7, 0.003, 0.3 * G);
  snd.hiss(t + 0.004, 'bandpass', 2400 * k, 1.5, 0.01, 0.25 * G);
  snd.ring(t + 0.004, 1900 * k, 1850 * k, 0.025, 0.05 * G);
  snd.ring(t + 0.004, 160 * k, 120 * k, 0.04, 0.15 * G);
});
// Beads: a few faint, quick metal ticks.
const rattle = v => snd.play('chain-rattle', 0.08, 0.12, (t, P, G) => {
  for (let k = 0; k < 4; k++) {
    const at = t + k * 0.021 + Math.random() * 0.01, g = G * v * (1 - k * 0.2);
    snd.hiss(at, 'bandpass', rnd(4200, 6800) * P, 3, 0.006, 0.12 * g);
    snd.ring(at, rnd(3000, 4200) * P, rnd(2900, 4000) * P, 0.012, 0.012 * g);
  }
});

export default {
  id: 'chain', slot: 'small',
  css: `.p-chain .grp { --sr: 0.8933; } .p-chain .pchain { --ar: 134 / 150; border-radius: 14px; cursor: grab; }`,
  mount(cell) {
    cell.insertAdjacentHTML('beforeend', MARKUP);
    const bodies = [], moves = [];
    // A ball chain hangs left of a ceiling plate.
    // A bulb hangs on the right.
    const btn = cell.querySelector('.pchain');
    bodies.push((() => {
      // The view crops close to the parts at rest.
      // A deep pull overflows a little at the bottom.
      const VH = 150, svg = svgIn(btn, `3 2 134 ${VH}`), defs = svg.k.defs;
      // The chain hangs from (AX, AY).
      // A full pull stretches it TR more.
      const AX = 44, AY = 30, L0 = 84, TR = 20, NB = 14;
      const cream = css(C.cream);
      el('line', { x1: 100, y1: 24, x2: 100, y2: 60, stroke: css([0.25, 0.02, 270]), 'stroke-width': 2.5 }, svg);
      // The glow is two cream discs whose opacity follows the switch.
      const halo2 = el('circle', { cx: 100, cy: 90, r: 44, fill: cream, opacity: 0 }, svg);
      const halo = el('circle', { cx: 100, cy: 90, r: 30, fill: cream, opacity: 0 }, svg);
      const bulb = el('circle', { cx: 100, cy: 90, r: 18 }, svg);
      el('circle', { cx: 100, cy: 90, r: 18, fill: grad(defs, 'radialGradient', { cx: 0.4, cy: 0.35, r: 0.7 }, [[0.55, '#000', 0], [1, '#000', 0.35]]).url }, svg);
      const fil = el('path', { d: 'M93 94L96 86L100 94L104 86L107 94', fill: 'none', 'stroke-width': 1.6, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, svg);
      el('ellipse', { cx: 93, cy: 82, rx: 3.5, ry: 6, fill: '#fff', opacity: 0.45, transform: 'rotate(30 93 82)' }, svg);
      skin(svg, svg, 'rect', { x: 91, y: 58, width: 18, height: 18, rx: 4 }, mat(C.steel, 0.05), { rim: 1.5, shadow: { b: 2, y: 3, o: 0.5 } });
      const BULB = ramp([0.34, 0.02, 85], [0.97, 0.06, 92]), FIL = ramp([0.5, 0.02, 60], [0.7, 0.17, 55]);
      // The plate covers the cord's top end.
      skin(svg, svg, 'rect', { x: 6, y: 4, width: 128, height: 24, rx: 12 }, mat(C.navy, 0), { rim: 2, shadow: { b: 3, y: 4, o: 0.55 } });
      [18, 122].forEach(x => {
        el('circle', { cx: x, cy: 16, r: 3.6, fill: css([0.7, 0.01, 255]) }, svg);
        el('line', { x1: x - 2.2, y1: 16, x2: x + 2.2, y2: 16, stroke: css([0.35, 0.02, 265]), 'stroke-width': 1.2 }, svg);
      });
      const BEAD = grad(defs, 'radialGradient', { cx: 0.35, cy: 0.3, r: 0.75 }, [[0, '#fff'], [0.35, css(C.steel)], [1, css([0.45, 0.01, 255])]]).url;
      const line = el('line', { x1: AX, y1: AY, stroke: css([0.5, 0.01, 255]), 'stroke-width': 0.9 }, svg);
      const beads = [];
      for (let i = 0; i < NB; i++) beads.push(el('circle', { r: 2.3, fill: BEAD }, svg));
      skin(svg, svg, 'ellipse', { cx: AX, cy: AY, rx: 7, ry: 4.5 }, mat(C.steel, 0), { rim: 1.5 });
      // The coral drop hangs from its own small bead.
      const pg = el('g', {}, svg);
      el('circle', { cy: 1, r: 2.6, fill: BEAD }, pg);
      skin(svg, pg, 'path', { d: 'M0 3C4 6 9 13 9 18A9 9 0 0 1 -9 18C-9 13 -4 6 0 3Z' }, mat(C.coral, 0.1), { rim: 1.5, shadow: { b: 2, y: 3, o: 0.5 } });
      el('ellipse', { cy: 8, rx: 3.6, ry: 1.4, fill: cream, opacity: 0.8 }, pg);

      // The pendulum swings at about 1.1 Hz.
      const W2 = 48, ZP = 0.1;
      const s = { l: S(L0), ph: S(), lit: S(), on: false, drag: false, moved: false, fired: false, auto: false, pid: null, x0: 0, y0: 0, l0: L0, k: 1 };
      function toggle() {
        s.on = !s.on; s.lit.t = +s.on;
        click(s.on);
        btn.setAttribute('aria-checked', String(s.on));
      }
      // A free release always swings a little, harder from a deep pull.
      function kick(m) { if (!reduce) s.ph.v += (Math.random() < 0.5 ? -1 : 1) * rnd(0.7, 1.2) * m; }
      const body = {
        step(h) {
          const l = s.l, pv = l.v;
          if (s.drag) { spring(l, 1400, 0.8, h); spring(s.ph, 300, 0.7, h); }
          else {
            spring(l, s.auto ? 900 : 520, s.auto ? 0.7 : 0.2, h);
            spring(s.ph, W2, ZP, h);
            // At the top of its bounce the chain goes slack and rattles.
            if (pv < 0 && l.v >= 0 && L0 - l.x > 2) rattle(clamp((L0 - l.x) / 10));
          }
          if (l.x > L0 + TR + 2) { l.x = L0 + TR + 2; if (l.v > 0) l.v = 0; }
          // The switch trips near the bottom, then rearms on the way up.
          if (!s.fired && l.x > L0 + TR * 0.82) {
            s.fired = true;
            toggle();
            if (s.auto) { s.auto = false; l.t = L0; kick(1); }
          } else if (s.fired && l.x < L0 + TR * 0.35) s.fired = false;
          spring(s.lit, 600, 1, h);
        },
        busy() {
          const a = rest(s.l, 0.01), b = rest(s.ph, 0.003), c = rest(s.lit);
          return s.auto || !(a && b && c);
        },
        draw() {
          const l = s.l.x, ph = s.ph.x, px = AX + l * Math.sin(ph), py = AY + l * Math.cos(ph);
          set(line, 'x2', f2(px)); set(line, 'y2', f2(py));
          // Beads spread evenly, so a stretch opens the gaps.
          for (let i = 0; i < NB; i++) {
            const f = (i + 1) / (NB + 1);
            set(beads[i], 'cx', f2(AX + (px - AX) * f)); set(beads[i], 'cy', f2(AY + (py - AY) * f));
          }
          set(pg, 'transform', `translate(${f2(px)} ${f2(py)}) rotate(${f2(-ph * R2D)})`);
          const g = s.lit.x;
          set(bulb, 'fill', BULB(g)); set(fil, 'stroke', FIL(g));
          set(halo, 'opacity', f3(0.16 * clamp(g))); set(halo2, 'opacity', f3(0.07 * clamp(g)));
        },
      };
      // A tap or a key pulls the chain once by itself.
      function pull() {
        if (s.pid != null || s.auto) return;
        s.auto = true; s.l.t = L0 + TR;
        if (s.l.x < L0 + TR * 0.35) s.fired = false;
        wake(body);
      }
      btn.addEventListener('pointerdown', e => {
        if (s.pid != null || e.button > 0) return;
        s.pid = e.pointerId;
        try { btn.setPointerCapture(e.pointerId); } catch {}
        s.k = VH / btn.getBoundingClientRect().height;
        s.x0 = e.clientX; s.y0 = e.clientY; s.l0 = s.l.x;
        // A hand on the drop stops its swing.
        s.drag = true; s.moved = false; s.auto = false; s.ph.t = s.ph.x;
        btn.classList.add('held');
        wake(body);
      });
      btn.addEventListener('pointermove', e => {
        if (e.pointerId !== s.pid) return;
        const dx = (e.clientX - s.x0) * s.k, dy = (e.clientY - s.y0) * s.k;
        if (!s.moved && Math.hypot(dx, dy) > 4) { s.moved = true; rattle(0.3); }
        if (!s.moved) return;
        s.l.t = clamp(s.l0 + dy, L0 - 6, L0 + TR);
        s.ph.t = clamp(Math.atan2(dx * 0.6, s.l.t), -0.3, 0.3);
        wake(body);
      });
      const up = e => {
        if (e.pointerId !== s.pid) return;
        s.pid = null; s.drag = false; btn.classList.remove('held');
        s.l.t = L0; s.ph.t = 0;
        if (!s.moved && e.type === 'pointerup') pull();
        else { const m = clamp((s.l.x - L0) / TR); kick(m + 0.3); rattle(m); }
        wake(body);
      };
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => btn.addEventListener(t, up));
      // Keyboard clicks arrive with detail 0; pointer taps are handled above.
      btn.addEventListener('click', e => { if (e.detail === 0) pull(); });
      btn.addEventListener('keydown', e => {
        if (e.key !== 'ArrowDown') return;
        e.preventDefault();
        pull();
      });
      moves.push({ el: btn, shuffle: pull, reset() { if (s.on) pull(); } });
      return body;
    })());
    return { bodies, moves, destroy() {} };
  },
};
