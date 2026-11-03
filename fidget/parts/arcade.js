import { reduce, clamp, f2, f3, KEYS, C, BUTTER, el, set, grad, DOWN, svgIn, mat, skin, well, wake, S, spring, rest, snd } from '../kit.js';

const MARKUP = `<div class="grp"><button class="ctl arcbtn" id="arcade-btn" type="button" aria-label="Arcade button"></button></div>`;

// Press: a microswitch click over a hollow plastic thunk.
const thunk = () => snd.play('arcade-down', 0.03, 0.14, (t, P, G) => {
  snd.hiss(t, 'highpass', 4200 * P, 0.8, 0.004, 0.3 * G);
  snd.hiss(t + 0.006, 'lowpass', 900 * P, 0.9, 0.045, 0.55 * G);
  snd.ring(t + 0.006, 112 * P, 72 * P, 0.11, 0.5 * G);
  snd.ring(t + 0.006, 330 * P, 260 * P, 0.04, 0.08 * G, 'triangle');
});
// Release: the switch lets go with a lighter click.
const clack = () => snd.play('arcade-up', 0.03, 0.05, (t, P, G) => {
  snd.hiss(t, 'bandpass', 3000 * P, 1.2, 0.008, 0.2 * G);
  snd.ring(t, 260 * P, 210 * P, 0.03, 0.07 * G);
});

export default {
  id: 'arcade', slot: 'small',
  css: `.p-arcade .grp { --sr: 1; } .p-arcade .arcbtn { --ar: 1; border-radius: 50%; }`,
  mount(cell) {
    cell.insertAdjacentHTML('beforeend', MARKUP);
    const bodies = [], moves = [];
    // A navy bezel ring round a glossy coral mushroom cap.
    const btn = cell.querySelector('.arcbtn');
    bodies.push((() => {
      const svg = svgIn(btn, '0 0 200 200'), defs = svg.k.defs, CX = 100, cr = C.coral;
      skin(svg, svg, 'circle', { cx: CX, cy: CX, r: 96 }, mat(C.navy, 0), { rim: 3, shadow: { b: 6, y: 8, o: 0.6 } });
      well(svg, svg, 'circle', { cx: CX, cy: CX, r: 81 }, { rim: 4 });
      // The lit ring washes the well.
      // A bright band then circles the cap.
      const wash = el('circle', { cx: CX, cy: CX, r: 79, fill: BUTTER, opacity: 0 }, svg);
      const ring = el('circle', { cx: CX, cy: CX, r: 73.5, fill: 'none', stroke: BUTTER, 'stroke-width': 9, opacity: 0 }, svg);
      // The skirt is the cap's side.
      // It shows as a crescent below the dome.
      const skirt = skin(svg, svg, 'circle', { cx: CX, cy: 105, r: 64 }, mat([cr[0] - 0.2, cr[1] * 1.05, cr[2]], 0.05), { rim: 2, sheen: false, shadow: { b: 4, y: 6, o: 0.55 } });
      const tg = el('g', {}, svg);
      const top = skin(svg, tg, 'circle', { cx: CX, cy: 97, r: 62 }, mat(cr, 0.12), { rim: 2.5 });
      // A dark rim rounds the dome.
      // A gloss band and a hot spot make it shine.
      el('circle', { cx: CX, cy: 97, r: 62, fill: grad(defs, 'radialGradient', { cx: 0.42, cy: 0.36, r: 0.7 }, [[0.68, '#000', 0], [1, '#000', 0.3]]).url }, tg);
      el('ellipse', { cx: 84, cy: 70, rx: 34, ry: 19, fill: grad(defs, 'linearGradient', DOWN, [[0, '#fff', 0.6], [1, '#fff', 0]]).url, transform: 'rotate(-26 84 70)' }, tg);
      el('circle', { cx: 72, cy: 64, r: 5.5, fill: '#fff', opacity: 0.75 }, tg);

      const s = { d: S(), fl: 0, held: false, pid: null, kb: false, keyAt: 0 };
      const body = {
        step(h) {
          // A firm downstroke, then a bouncy return.
          if (s.held) spring(s.d, 1800, 0.7, h);
          else spring(s.d, 700, 0.3, h);
          // The flash fades over about a second.
          if (s.fl) { s.fl *= Math.exp(-3.2 * h); if (s.fl < 0.004) s.fl = 0; }
        },
        busy() { return !(rest(s.d) && s.fl === 0); },
        draw() {
          const d = s.d.x, sq = clamp(s.d.v / 14, -1, 1), dc = clamp(d, -0.3, 1);
          // The cap sinks, spreads as it lands and stretches as it rises.
          const sx = (1 + 0.03 * dc) * (1 + 0.07 * sq), sy = (1 - 0.05 * dc) * (1 - 0.09 * sq);
          set(tg, 'transform', `translate(100 ${f2(97 + 7 * d)}) scale(${f3(sx)} ${f3(sy)}) translate(-100 -97)`);
          set(skirt.sh, 'opacity', f3(0.55 - 0.25 * clamp(d)));
          top.paint(clamp(d) * 0.8);
          skirt.paint(clamp(d) * 0.5);
          set(ring, 'opacity', f3(s.fl));
          set(wash, 'opacity', f3(0.3 * s.fl));
        },
      };
      function press() {
        s.held = true; s.d.t = 1; s.fl = 1;
        thunk();
        wake(body);
      }
      function release() {
        s.held = false; s.d.t = 0;
        clack();
        wake(body);
      }
      btn.addEventListener('pointerdown', e => {
        if (s.pid != null || s.kb || e.button > 0) return;
        s.pid = e.pointerId;
        try { btn.setPointerCapture(e.pointerId); } catch {}
        press();
      });
      const up = e => { if (e.pointerId === s.pid) { s.pid = null; release(); } };
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => btn.addEventListener(t, up));
      // The button stays down while Space or Enter is held.
      btn.addEventListener('keydown', e => {
        if (!KEYS.includes(e.key)) return;
        e.preventDefault();
        if (!e.repeat && !s.kb && s.pid == null) { s.kb = true; press(); }
      });
      btn.addEventListener('keyup', e => {
        if (!KEYS.includes(e.key) || !s.kb) return;
        e.preventDefault();
        s.kb = false; s.keyAt = performance.now();
        release();
      });
      btn.addEventListener('blur', () => { if (s.kb) { s.kb = false; release(); } });
      // Assistive tech clicks without key events; they get a short tap.
      const tap = () => { if (s.held || s.kb || s.pid != null) return; press(); setTimeout(release, reduce ? 60 : 120); };
      btn.addEventListener('click', e => {
        if (e.detail !== 0 || performance.now() - s.keyAt < 300) return;
        tap();
      });
      moves.push({ el: btn, shuffle: tap, reset() {} });
      return body;
    })());
    return { bodies, moves, destroy() {} };
  },
};
