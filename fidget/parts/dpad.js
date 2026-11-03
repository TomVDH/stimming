import {
  clamp, f2, f3, KEYS, css, ramp, C, el, set, grad, DOWN, svgIn, mat, skin, well, wake, S, spring, rest, snd,
} from '../kit.js';

// Up, right, down, left: name, unit vector, label, arrow key.
const DIRS = [['up', 0, -1, 'Up', 'ArrowUp'], ['right', 1, 0, 'Right', 'ArrowRight'], ['down', 0, 1, 'Down', 'ArrowDown'], ['left', -1, 0, 'Left', 'ArrowLeft']];
const MARKUP = `<div class="grp"><div class="ctl dpad" id="dpad-pad" role="group" aria-label="Direction pad">${DIRS.map(([k, , , n]) => `<button class="hit ${k}" type="button" aria-label="${n}"></button>`).join('')}</div></div>`;

// A cross with rounded tips: half width a, reach e, tip radius r.
function cross(a, e, r, c = 100) {
  const A = (x, y) => `A${r} ${r} 0 0 1 ${x} ${y}`;
  return `M${c - a} ${c - e + r}${A(c - a + r, c - e)}H${c + a - r}${A(c + a, c - e + r)}V${c - a}H${c + e - r}${A(c + e, c - a + r)}V${c + a - r}${A(c + e - r, c + a)}H${c + a}V${c + e - r}${A(c + a - r, c + e)}H${c - a + r}${A(c - a, c + e - r)}V${c + a}H${c - e + r}${A(c - e, c + a - r)}V${c - a + r}${A(c - e + r, c - a)}H${c - a}Z`;
}
// A soft membrane click as an arm bottoms out.
const press = () => snd.play('pad', 0.015, 0.05, (t, P, G) => {
  snd.hiss(t, 'lowpass', 1500 * P, 0.9, 0.012, 0.3 * G);
  snd.hiss(t, 'bandpass', 2400 * P, 1.4, 0.003, 0.08 * G);
  snd.ring(t, 180 * P, 130 * P, 0.03, 0.12 * G);
});
// The membrane lets go with a lighter tick.
const lift = () => snd.play('padup', 0.015, 0.02, (t, P, G) => {
  snd.hiss(t, 'bandpass', 1900 * P, 1.3, 0.006, 0.08 * G);
});

export default {
  id: 'dpad', slot: 'small',
  css: `.p-dpad .grp { --sr: 1; }
.p-dpad .dpad { --ar: 1; border-radius: 26%; }
.p-dpad .hit { position: absolute; margin: 0; padding: 0; border: 0; background: none; border-radius: 6px; pointer-events: none; }
.p-dpad .hit.up, .p-dpad .hit.down { left: 35.5%; width: 29%; height: 25.5%; }
.p-dpad .hit.left, .p-dpad .hit.right { top: 35.5%; height: 29%; width: 25.5%; }
.p-dpad .hit.up { top: 10%; } .p-dpad .hit.down { top: 64.5%; }
.p-dpad .hit.left { left: 10%; } .p-dpad .hit.right { left: 64.5%; }`,
  mount(cell) {
    cell.insertAdjacentHTML('beforeend', MARKUP);
    const bodies = [], moves = [];
    // A navy bezel, a cross cut into it, a cream pad that rocks on a pivot.
    const padEl = cell.querySelector('.dpad'), hits = [...padEl.querySelectorAll('.hit')];
    bodies.push((() => {
      const svg = svgIn(padEl, '0 0 200 200'), defs = svg.k.defs, c = 100, a = 29, e = 79;
      skin(svg, svg, 'rect', { x: 6, y: 6, width: 188, height: 188, rx: 50 }, mat(C.navy, 0), { rim: 2.5, shadow: { b: 6, y: 8, o: 0.6 } });
      well(svg, svg, 'path', { d: cross(35, 86, 14) }, { rim: 3.5 });
      const cg = el('g', {}, svg);
      const pad = skin(svg, cg, 'path', { d: cross(a, e, 11) }, mat(C.cream, 0.12), { rim: 2.5, shadow: { b: 4, y: 6, o: 0.6 } });
      const clip = el('clipPath', { id: pad.shape.id + 'k' }, defs);
      el('use', { href: '#' + pad.shape.id }, clip);
      const arms = el('g', { 'clip-path': `url(#${clip.id})` }, cg);
      // Each arm darkens toward its tip as it sinks and brightens as it rises.
      const ART = ramp([0.55, 0.03, 265], C.coral);
      const parts = DIRS.map(([, dx, dy], j) => {
        const box = dx ? { x: dx > 0 ? c + a : c - e, y: c - a, width: e - a, height: 2 * a } : { x: c - a, y: dy > 0 ? c + a : c - e, width: 2 * a, height: e - a };
        const dir = dx ? { x1: dx > 0 ? 1 : 0, x2: dx > 0 ? 0 : 1, y1: 0, y2: 0 } : { x1: 0, x2: 0, y1: dy > 0 ? 1 : 0, y2: dy > 0 ? 0 : 1 };
        const dark = el('rect', { ...box, opacity: 0, fill: grad(defs, 'linearGradient', dir, [[0, '#000', 0.55], [1, '#000', 0]]).url }, arms);
        const light = el('rect', { ...box, opacity: 0, fill: grad(defs, 'linearGradient', dir, [[0, '#fff', 0.5], [1, '#fff', 0]]).url }, arms);
        // An arrow near the tip points outward.
        const arrow = el('path', { d: 'M100 37L110 51H90Z', 'stroke-width': 4, 'stroke-linejoin': 'round', transform: `rotate(${j * 90} 100 100)` }, cg);
        return { dx, dy, dark, light, arrow };
      });
      // The pivot: a small dish with a pin at its centre.
      el('circle', { cx: c, cy: c, r: 14, fill: grad(defs, 'linearGradient', DOWN, [[0, '#000', 0.22], [0.55, '#000', 0], [1, '#fff', 0.55]]).url }, cg);
      el('circle', { cx: c, cy: c, r: 3.2, fill: css([0.62, 0.03, 80]) }, cg);

      const s = { tx: S(), ty: S(), dir: -1, pid: null, kb: null, rect: null };
      const body = {
        step(h) {
          // A firm rock toward the press, a springy rock back to level.
          const k = s.dir >= 0 ? 900 : 600, z = s.dir >= 0 ? 0.55 : 0.32;
          spring(s.tx, k, z, h); spring(s.ty, k, z, h);
        },
        busy() { const p = rest(s.tx), q = rest(s.ty); return !(p && q); },
        draw() {
          const tx = s.tx.x, ty = s.ty.x, m = clamp(Math.hypot(tx, ty));
          set(cg, 'transform', `translate(${f2(100 + 2.5 * tx)} ${f2(100 + 2.5 * ty)}) scale(${f3(1 - 0.025 * m)}) translate(-100 -100)`);
          // Tipped, the pad nears the bezel and its shadow tightens.
          set(pad.sh, 'opacity', f3(0.6 - 0.22 * m));
          pad.paint(0.25 * m);
          parts.forEach(p => {
            const d = tx * p.dx + ty * p.dy, sink = clamp(d), up = clamp(-d);
            set(p.dark, 'opacity', f3(sink));
            set(p.light, 'opacity', f3(up));
            const col = ART(sink);
            set(p.arrow, 'fill', col); set(p.arrow, 'stroke', col);
            set(p.arrow, 'opacity', f2(0.45 + 0.55 * sink));
          });
        },
      };
      // One direction at a time; a new one clicks as the pad rocks over.
      function aim(j) {
        if (j === s.dir) return;
        const was = s.dir;
        s.dir = j;
        if (j >= 0) { s.tx.t = DIRS[j][1]; s.ty.t = DIRS[j][2]; press(); }
        else { s.tx.t = 0; s.ty.t = 0; if (was >= 0) lift(); }
        wake(body);
      }
      function pick(e) {
        const r = s.rect, dx = (e.clientX - r.left) / r.width - 0.5, dy = (e.clientY - r.top) / r.height - 0.5;
        // The pivot is dead ground.
        if (Math.hypot(dx, dy) < 0.08) return -1;
        return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0);
      }
      padEl.addEventListener('pointerdown', e => {
        if (s.pid != null || s.kb != null || e.button > 0) return;
        s.pid = e.pointerId;
        try { padEl.setPointerCapture(e.pointerId); } catch {}
        s.rect = padEl.getBoundingClientRect();
        aim(pick(e));
      });
      padEl.addEventListener('pointermove', e => { if (e.pointerId === s.pid) aim(pick(e)); });
      const up = e => { if (e.pointerId === s.pid) { s.pid = null; aim(-1); } };
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => padEl.addEventListener(t, up));
      // Arrow keys press their arm for as long as they are held.
      // Space or Enter presses the focused arm.
      const keyDir = (e, j) => { const i = DIRS.findIndex(d => d[4] === e.key); return i >= 0 ? i : KEYS.includes(e.key) ? j : -1; };
      hits.forEach((btn, j) => {
        btn.addEventListener('keydown', e => {
          const i = keyDir(e, j);
          if (i < 0) return;
          e.preventDefault();
          if (e.repeat || s.pid != null) return;
          s.kb = e.key; aim(i);
        });
        btn.addEventListener('keyup', e => {
          if (e.key !== s.kb) return;
          e.preventDefault();
          s.kb = null; aim(-1);
        });
        btn.addEventListener('blur', () => { if (s.kb != null) { s.kb = null; aim(-1); } });
        // Assistive tech clicks without key events; they get a short tap.
        btn.addEventListener('click', e => { if (e.detail === 0 && s.kb == null && s.pid == null) tap(j); });
      });
      function tap(j) {
        aim(j);
        setTimeout(() => { if (s.pid == null && s.kb == null && s.dir === j) aim(-1); }, 140);
      }
      // Shuffle taps a random arm.
      moves.push({ el: padEl, shuffle() { if (s.pid == null && s.kb == null) tap((Math.random() * 4) | 0); } });
      return body;
    })());
    return { bodies, moves, destroy() {} };
  },
};
