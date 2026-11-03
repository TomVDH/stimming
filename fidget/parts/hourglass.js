import {
  reduce, D2R, clamp, lerp, f2, f3, KEYS, css, C, el, set, nid, svgIn, mat, skin, wake, S, spring, rest, snd,
} from '../kit.js';

const MARKUP = `<div class="grp"><button class="ctl hglass" id="hourglass" type="button" aria-label="Hourglass, flip"></button></div>`;

// A wooden clack as the frame turns or lands.
const clack = v => snd.play('hg-clack', 0.06, 0.08, (t, P, G) => {
  G *= 0.4 + 0.6 * v;
  snd.hiss(t, 'bandpass', 1900 * P, 2, 0.012, 0.38 * G);
  snd.ring(t, 760 * P, 700 * P, 0.05, 0.1 * G);
  snd.ring(t, 1530 * P, 1500 * P, 0.025, 0.04 * G);
});

// Glass outline: two bulbs that meet at a narrow neck.
const GLASS = 'M-36-78H36C42-40 8-20 4 0C8 20 42 40 36 78H-36C-42 40-8 20-4 0C-8-20-42-40-36-78Z';
// Sand runs from the far end of a bulb; a full bulb holds this depth.
const FAR = 78, DEEP = 54;
// The upper sand drains in eight seconds.
const RATE = 1 / 8;

export default {
  id: 'hourglass', slot: 'small',
  css: `.p-hourglass .grp { --sr: 0.7; } .p-hourglass .hglass { --ar: 140 / 200; border-radius: 16px; cursor: grab; }`,
  mount(cell) {
    cell.insertAdjacentHTML('beforeend', MARKUP);
    const bodies = [], moves = [];
    // A wooden frame, clear glass bulbs and butter sand.
    const btn = cell.querySelector('.hglass');
    const hush = snd.drone(1.2);
    bodies.push((() => {
      const svg = svgIn(btn, '0 0 140 200'), defs = svg.k.defs;
      const tg = el('g', {}, svg);
      const WOOD = mat([0.6, 0.095, 58], 0), POST = mat([0.68, 0.085, 66], 0);
      // The glass sits behind its posts.
      el('path', { d: GLASS, fill: css(C.sky), opacity: 0.16 }, tg);
      const clip = el('clipPath', { id: nid('c') }, defs);
      el('path', { d: GLASS }, clip);
      const sg = el('g', { 'clip-path': `url(#${clip.id})` }, tg);
      const SAND = css(C.butter), EDGE = css([0.74, 0.12, 80]);
      const piles = [0, 1].map(() => el('path', { fill: SAND, stroke: EDGE, 'stroke-width': 1.5, 'stroke-linejoin': 'round' }, sg));
      const stream = el('line', { x1: 0, y1: 0, x2: 0, y2: 0, stroke: SAND, 'stroke-width': 2.6, 'stroke-dasharray': '4 2.5', 'stroke-linecap': 'round', opacity: 0 }, sg);
      // Glass edges and two long glints.
      el('path', { d: GLASS, fill: 'none', stroke: css([0.92, 0.02, 230]), 'stroke-width': 2, opacity: 0.55 }, tg);
      el('path', { d: 'M-28-70C-32-44-14-26-7-12M-7 12C-14 26-32 44-28 70', fill: 'none', stroke: '#fff', 'stroke-width': 3, 'stroke-linecap': 'round', opacity: 0.5 }, tg);
      el('path', { d: 'M27-64C29-50 22-40 16-32', fill: 'none', stroke: '#fff', 'stroke-width': 2, 'stroke-linecap': 'round', opacity: 0.3 }, tg);
      // Turned posts with three beads each.
      [-51, 51].forEach(x => {
        skin(svg, tg, 'rect', { x: x - 4.5, y: -82, width: 9, height: 164, rx: 4.5 }, POST, { rim: 1.5, cyl: true, shadow: { b: 2, y: 3, o: 0.45 } });
        [-58, 0, 58].forEach(y => skin(svg, tg, 'ellipse', { cx: x, cy: y, rx: 7.5, ry: 5 }, POST, { rim: 1.5, sheen: false }));
      });
      // The plates cap both ends.
      [-96, 80].forEach(y => skin(svg, tg, 'rect', { x: -63, y, width: 126, height: 16, rx: 6 }, WOOD, { rim: 2, shadow: { b: 4, y: 5, o: 0.55 } }));

      // Sand amounts in bulb A (local top) and bulb B (local bottom).
      // Each slide runs from 0, sand at the far end, to 1, sand at the neck.
      const s = { a: 0, b: 1, rot: S(), sq: S(), fa: S(1), fb: S(0), pour: false, fast: false, dash: 0, err: 0, pid: null, x0: 0, y0: 0, moved: false, done: false, label: '' };
      const pile = (yFar, u, amt, f) => {
        if (amt < 0.004) return 'M0 0Z';
        const h = DEEP * amt ** 0.85, s0 = lerp(0, FAR - 4 - h, f);
        // A pile at the bottom heaps up; one on top sinks in a crater.
        const mb = Math.min(10, h * 0.6) * (1 - f), mt = Math.min(9, h * 0.6) * f;
        const y = d => f2(yFar + u * d);
        return `M-46 ${y(s0)}L0 ${y(s0 + mt)}L46 ${y(s0)}L46 ${y(s0 + h - 0.2 * mb)}L0 ${y(s0 + h + mb)}L-46 ${y(s0 + h - 0.2 * mb)}Z`;
      };
      const body = {
        step(h) {
          spring(s.rot, 110, 0.6, h);
          spring(s.sq, 600, 0.3, h);
          // Local down points at bulb B while the turn is under 90 degrees.
          const bDown = Math.cos(s.rot.x * D2R) > 0;
          s.fa.t = bDown ? 1 : 0; s.fb.t = bDown ? 0 : 1;
          spring(s.fa, 160, 0.9, h); spring(s.fb, 160, 0.9, h);
          // The frame lands as it first swings past its goal.
          const err = s.rot.t - s.rot.x;
          if (s.err > 0 && err <= 0 && !s.done) { s.done = true; clack(0.7); s.sq.v += 0.9; }
          s.err = err;
          // Sand pours only once the frame and its sand have settled.
          const settled = Math.abs(err) < 14 && Math.abs(s.fa.x - s.fa.t) < 0.15 && Math.abs(s.fb.x - s.fb.t) < 0.15;
          const top = bDown ? s.a : s.b;
          s.pour = settled && top > 0;
          if (s.pour) {
            const d = Math.min(top, (s.fast ? 2.5 : RATE) * h);
            if (bDown) { s.a -= d; s.b += d; } else { s.b -= d; s.a += d; }
            if (s.a < 1e-4) { s.b += s.a; s.a = 0; }
            if (s.b < 1e-4) { s.a += s.b; s.b = 0; }
            s.dash = (s.dash + 70 * h) % 13;
          } else if (top <= 0) s.fast = false;
        },
        busy() {
          const r = rest(s.rot, 0.05), q = rest(s.sq), a = rest(s.fa), b = rest(s.fb);
          // A finished half turn folds back to zero; the bulbs swap.
          if (r && s.rot.x !== 0) {
            if (Math.round(s.rot.x / 180) % 2) {
              [s.a, s.b] = [s.b, s.a];
              [s.fa.x, s.fb.x] = [s.fb.x, s.fa.x]; [s.fa.t, s.fb.t] = [s.fb.t, s.fa.t];
            }
            s.rot.x = s.rot.t = 0; s.err = 0;
          }
          if (!s.pour) hush.set(0, 5000);
          return !(r && q && a && b) || s.pour;
        },
        draw() {
          const q = clamp(s.sq.x, -0.1, 0.1);
          set(tg, 'transform', `translate(70 100) rotate(${f2(s.rot.x)}) scale(${f3(1 + 0.5 * q)} ${f3(1 - q)})`);
          set(piles[0], 'd', pile(-FAR, 1, s.a, s.fa.x));
          set(piles[1], 'd', pile(FAR, -1, s.b, s.fb.x));
          // The stream falls from the neck onto the lower pile.
          const bDown = Math.cos(s.rot.x * D2R) > 0, low = bDown ? s.b : s.a;
          const reach = FAR - 4 - DEEP * low ** 0.85 * 1.15;
          set(stream, 'y2', f2(bDown ? reach : -reach));
          set(stream, 'stroke-dashoffset', f2(bDown ? -s.dash : s.dash));
          set(stream, 'opacity', s.pour && !reduce ? 1 : 0);
          // The faint hiss runs only while sand pours.
          if (s.pour) hush.set(s.fast ? 0.02 : 0.007, 5200);
          const left = Math.round((bDown ? s.a : s.b) / RATE);
          const label = left > 0 ? `Hourglass, ${left} seconds left, flip` : 'Hourglass, flip';
          if (label !== s.label) { s.label = label; btn.setAttribute('aria-label', label); }
        },
      };
      // Each flip adds half a turn; reduced motion jumps straight there.
      function flip(dir = 1) {
        s.rot.t += 180 * dir; s.err = s.rot.t - s.rot.x; s.done = false; s.fast = false;
        clack(1);
        wake(body);
      }
      btn.addEventListener('pointerdown', e => {
        if (s.pid != null || e.button > 0) return;
        s.pid = e.pointerId;
        try { btn.setPointerCapture(e.pointerId); } catch {}
        s.x0 = e.clientX; s.y0 = e.clientY; s.moved = false;
      });
      // A drag flips the frame the way the finger goes.
      btn.addEventListener('pointermove', e => {
        if (e.pointerId !== s.pid || s.moved) return;
        const dx = e.clientX - s.x0, dy = e.clientY - s.y0;
        if (Math.hypot(dx, dy) < 14) return;
        s.moved = true;
        flip(Math.abs(dx) > Math.abs(dy) ? Math.sign(dx) : Math.sign(dy));
      });
      const up = e => {
        if (e.pointerId !== s.pid) return;
        s.pid = null;
        if (!s.moved && e.type === 'pointerup') flip(1);
      };
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => btn.addEventListener(t, up));
      btn.addEventListener('keydown', e => {
        const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (d) flip(d);
        else if (KEYS.includes(e.key)) { if (!e.repeat) flip(1); }
        else return;
        e.preventDefault();
      });
      // Assistive tech clicks without key events.
      btn.addEventListener('click', e => { if (e.detail === 0) flip(1); });
      moves.push({
        el: btn,
        shuffle() { if (s.pid == null) flip(Math.random() < 0.5 ? -1 : 1); },
        // Reset drains the upper bulb fast, so all sand lies below.
        reset() {
          const bDown = Math.cos(s.rot.t * D2R) > 0;
          if ((bDown ? s.a : s.b) > 0) { s.fast = true; wake(body); }
        },
      });
      return body;
    })());
    return { bodies, moves, destroy() { hush.stop(); } };
  },
};
