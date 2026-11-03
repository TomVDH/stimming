import { clamp, f2, f3, css, ramp, C, el, set, grad, svgIn, mat, skin, well, wake, S, spring, rest, snd } from '../kit.js';

const MARKUP = `<div class="grp" role="group" aria-label="Light switches">${[1, 2, 3, 4].map(n => `<button class="ctl lsw" type="button" role="switch" aria-checked="false" aria-label="Light ${n}"></button>`).join('')}</div>`;

// The spring loads with a tick, then the lever snaps over with a thump.
const snap = up => snd.play('switchbank', 0.04, 0.09, (t, P, G) => {
  const k = (up ? 1.06 : 0.94) * P;
  snd.hiss(t, 'highpass', 5200 * k, 0.7, 0.003, 0.2 * G);
  snd.hiss(t + 0.012, 'bandpass', 1800 * k, 1.3, 0.02, 0.55 * G);
  snd.ring(t + 0.012, 210 * k, 125 * k, 0.06, 0.38 * G);
  snd.ring(t + 0.012, 3300 * k, 3200 * k, 0.02, 0.03 * G);
});

export default {
  id: 'switchbank', slot: 'row',
  css: `.p-switchbank .grp { --n: 4; --sr: 3; width: calc(100cqw - 2 * var(--p)); justify-content: space-evenly; } .p-switchbank .lsw { --ar: 90 / 120; border-radius: 12px; }`,
  mount(cell) {
    cell.insertAdjacentHTML('beforeend', MARKUP);
    const bodies = [], moves = [];
    // A bulb in a steel socket sits above each cream wall plate.
    // The lever pivots at SY and its tip travels L either way.
    const SY = 82, L = 17, SPAN = 2 * L;
    const GLASS = ramp([0.36, 0.02, 270], C.butter), WIRE = ramp([0.62, 0.01, 260], [0.6, 0.17, 45]);
    // A caramel lever stands out against the cream plate.
    const steel = mat(C.steel, 0), lev = mat([0.76, 0.075, 62], 0.1);
    cell.querySelectorAll('.lsw').forEach(btn => {
      const svg = svgIn(btn, '0 0 90 120'), defs = svg.k.defs;
      // A short stem joins the socket to the plate.
      el('rect', { x: 41, y: 40, width: 8, height: 8, fill: css([0.5, 0.012, 258]) }, svg);
      skin(svg, svg, 'rect', { x: 12, y: 46, width: 66, height: 72, rx: 9 }, mat(C.cream, 0), { rim: 2.5, shadow: { b: 4, y: 5, o: 0.55 } });
      // Each screw slot sits at its own angle.
      [54, 110].forEach(y => {
        skin(svg, svg, 'circle', { cx: 45, cy: y, r: 3.6 }, steel, { rim: 1, sheen: false, shadow: { b: 0.8, y: 1, o: 0.45 } });
        el('line', { x1: 42.4, y1: y, x2: 47.6, y2: y, stroke: css([0.42, 0.015, 258]), 'stroke-width': 1.1, transform: `rotate(${Math.round(Math.random() * 180)} 45 ${y})` }, svg);
      });
      // A navy bezel frames the dark slot.
      skin(svg, svg, 'rect', { x: 35, y: SY - 16, width: 20, height: 32, rx: 5 }, mat(C.navy, 0), { rim: 1.5, sheen: false });
      well(svg, svg, 'rect', { x: 38, y: SY - 13, width: 14, height: 26, rx: 3.5 }, { rim: 2 });
      const lever = skin(svg, svg, 'rect', { x: 39, y: SY - 6, width: 12, height: 12, rx: 6 }, lev, { rim: 1.5, shadow: { b: 1.6, y: 2.5, o: 0.6 } });
      // A bright cap marks the lever's end.
      const tip = el('ellipse', { cx: 45, rx: 4, ry: 2.6, fill: '#fff', opacity: 0.6 }, svg);
      // The bulb pops a little as it comes on.
      const bg = el('g', {}, svg);
      skin(svg, bg, 'rect', { x: 37, y: 32, width: 16, height: 11, rx: 2.5 }, steel, { rim: 1.2, cyl: true, sheen: false });
      el('path', { d: 'M37 35.5h16M37 39h16', stroke: '#000', 'stroke-opacity': 0.25, 'stroke-width': 1 }, bg);
      const glass = el('path', { d: 'M38.5 33C38.5 28 30 26 30 18A15 15 0 1 1 60 18C60 26 51.5 28 51.5 33Z' }, bg);
      el('path', { d: 'M38.5 33C38.5 28 30 26 30 18A15 15 0 1 1 60 18C60 26 51.5 28 51.5 33Z', fill: grad(defs, 'radialGradient', { cx: 0.35, cy: 0.3, r: 0.75 }, [[0, '#fff', 0.35], [0.5, '#fff', 0], [1, '#000', 0.3]]).url }, bg);
      const wire = el('path', { d: 'M41 32V22M49 32V22M41 22l2 -3 2 3 2 -3 2 3', fill: 'none', 'stroke-width': 1.1, 'stroke-linejoin': 'round' }, bg);
      el('ellipse', { cx: 38, cy: 12, rx: 3.2, ry: 5, fill: '#fff', opacity: 0.55, transform: 'rotate(30 38 12)' }, bg);

      const s = { p: S(), lit: S(), bq: S(), on: false, side: 0, pid: null, y0: 0, p0: 0, span: 1, drag: false };
      const body = {
        step(h) {
          spring(s.p, s.drag ? 1400 : 900, s.drag ? 0.9 : 0.42, h);
          // The lever snaps the circuit as it crosses the middle.
          const side = s.p.x > 0.5 ? 1 : 0;
          if (side !== s.side) {
            s.side = side; s.lit.t = side;
            snap(!!side);
            if (side) s.bq.v += 7;
          }
          spring(s.lit, 2400, 1, h);
          spring(s.bq, 700, 0.25, h);
        },
        busy() { const a = rest(s.p), b = rest(s.lit), c = rest(s.bq); return !(a && b && c); },
        draw() {
          // Pointing out, the lever shows its end; pointing up or down, its length.
          const ty = SY - L * (2 * s.p.x - 1), y = Math.min(SY, ty) - 6;
          set(lever.shape, 'y', f2(y));
          set(lever.shape, 'height', f2(Math.abs(ty - SY) + 12));
          set(tip, 'cy', f2(ty));
          lever.paint(s.pid != null ? 0.5 : 0);
          set(glass, 'fill', GLASS(clamp(s.lit.x)));
          set(wire, 'stroke', WIRE(clamp(s.lit.x)));
          const q = s.bq.x;
          set(bg, 'transform', `translate(45 38) scale(${f3(1 - 0.05 * q)} ${f3(1 + 0.06 * q)}) translate(-45 -38)`);
        },
      };
      function flip(v) {
        s.on = v; s.p.t = +v; btn.setAttribute('aria-checked', String(v));
        wake(body);
      }
      btn.addEventListener('pointerdown', e => {
        if (s.pid != null || e.button > 0) return;
        s.pid = e.pointerId;
        try { btn.setPointerCapture(e.pointerId); } catch {}
        s.y0 = e.clientY; s.p0 = s.p.x; s.drag = false;
        s.span = (btn.getBoundingClientRect().height * SPAN) / 120;
        wake(body);
      });
      btn.addEventListener('pointermove', e => {
        if (e.pointerId !== s.pid) return;
        const dy = e.clientY - s.y0;
        if (!s.drag && Math.abs(dy) > 4) s.drag = true;
        // The finger can push the lever a little past its stops.
        if (s.drag) { s.p.t = clamp(s.p0 - dy / s.span, -0.1, 1.1); wake(body); }
      });
      const up = e => {
        if (e.pointerId !== s.pid) return;
        s.pid = null;
        if (s.drag) { s.drag = false; flip(s.p.x + s.p.v * 0.04 > 0.5); }
        else if (e.type === 'pointerup') flip(!s.on);
        else wake(body);
      };
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => btn.addEventListener(t, up));
      // Keyboard clicks arrive with detail 0; pointer taps are handled above.
      btn.addEventListener('click', e => { if (e.detail === 0) flip(!s.on); });
      btn.addEventListener('keydown', e => {
        const v = e.key === 'ArrowUp' ? true : e.key === 'ArrowDown' ? false : null;
        if (v === null) return;
        e.preventDefault();
        if (v !== s.on) flip(v);
      });
      const to = v => { if (s.pid == null && v !== s.on) flip(v); };
      moves.push({ el: btn, shuffle: () => to(Math.random() < 0.5), reset: () => to(false) });
      bodies.push(body);
    });
    return { bodies, moves, destroy() {} };
  },
};
