import {
  reduce, TAU, R2D, clamp, mod, f2, f3, rnd, css, C, TICK, el, set, grad, svgIn, mat, skin, wake, S, spring, rest, snd,
} from '../kit.js';

const MARKUP = `<div class="grp"><button class="ctl yoyo" type="button" aria-label="Yo-yo, throw"></button></div>`;

// The yo-yo lands in the hand: a small, soft slap.
const slap = v => snd.play('yoyo-slap', 0.1, 0.07, (t, P, G) => {
  G *= 0.4 + 0.6 * v;
  snd.hiss(t, 'bandpass', 1500 * P, 1, 0.02, 0.42 * G);
  snd.hiss(t, 'highpass', 3600 * P, 0.7, 0.006, 0.16 * G);
  snd.ring(t, 210 * P, 150 * P, 0.04, 0.22 * G);
});
// The string snaps taut at the bottom: a dull tug.
const tug = v => snd.play('yoyo-tug', 0.1, 0.05, (t, P, G) => {
  snd.hiss(t, 'lowpass', 700 * P, 1, 0.03, 0.3 * G * v);
  snd.ring(t, 95 * P, 75 * P, 0.04, 0.2 * G * v);
});

export default {
  id: 'yoyo', slot: 'small',
  css: `.p-yoyo .grp { --sr: 0.75; } .p-yoyo .yoyo { --ar: 150 / 200; border-radius: 18px; cursor: grab; }`,
  mount(cell) {
    cell.insertAdjacentHTML('beforeend', MARKUP);
    const bodies = [], moves = [];
    // A coral yo-yo hangs from a finger ring on its string.
    const btn = cell.querySelector('.yoyo');
    const whirr = snd.drone(2.2);
    bodies.push((() => {
      const svg = svgIn(btn, '0 0 150 200'), defs = svg.k.defs;
      // The string hangs from (AX, AY).
      // The yo-yo rests at YR and sleeps at YB.
      const AX = 75, AY = 28, R = 25, YR = 62, YB = 166, AXLE = 4;
      // Fall pull in units per second squared.
      const G = 780;
      // A navy plate backs the throw; dots mark the drop.
      skin(svg, svg, 'rect', { x: 3, y: 3, width: 144, height: 194, rx: 22 }, mat(C.navy, 0), { rim: 2.5, shadow: { b: 6, y: 8, o: 0.6 } });
      el('path', { d: `M${AX} 100V184`, stroke: TICK, 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-dasharray': '0.1 9' }, svg);
      const string = el('line', { x1: AX, y1: AY, stroke: css([0.9, 0.02, 85]), 'stroke-width': 1.8, 'stroke-linecap': 'round' }, svg);
      el('circle', { cx: AX, cy: 16, r: 10, fill: 'none', stroke: css([0.45, 0.04, 265]), 'stroke-width': 6, transform: 'translate(0 2)', opacity: 0.5 }, svg);
      el('circle', { cx: AX, cy: 16, r: 10, fill: 'none', stroke: css(C.butter), 'stroke-width': 5 }, svg);
      el('path', { d: 'M68 9A10 10 0 0 1 82 9', fill: 'none', stroke: '#fff', 'stroke-width': 1.6, 'stroke-linecap': 'round', opacity: 0.7 }, svg);
      el('circle', { cx: AX, cy: AY, r: 2.6, fill: css([0.86, 0.03, 85]) }, svg);
      // The yo-yo is drawn at the origin, then moved and turned.
      const yg = el('g', {}, svg);
      const shell = skin(svg, yg, 'circle', { r: R }, mat(C.coral, 0.1), { rim: 2.5, shadow: { b: 4, y: 6, o: 0.55 } });
      el('circle', { r: R - 5, fill: 'none', stroke: '#000', 'stroke-opacity': 0.14, 'stroke-width': 2 }, yg);
      // At speed the spokes blur into a pale ring.
      const blurRing = el('circle', { r: 12.5, fill: 'none', stroke: css(C.cream), 'stroke-width': 9, opacity: 0 }, yg);
      const spokes = el('g', { stroke: css(C.cream), 'stroke-width': 4.5, 'stroke-linecap': 'round' }, yg);
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * TAU;
        el('line', { x1: f2(6 * Math.sin(a)), y1: f2(-6 * Math.cos(a)), x2: f2(18 * Math.sin(a)), y2: f2(-18 * Math.cos(a)) }, spokes);
      }
      el('circle', { r: 6.5, fill: grad(defs, 'radialGradient', { cx: 0.35, cy: 0.3, r: 0.8 }, [[0, '#fff'], [0.4, css(C.steel)], [1, css([0.5, 0.01, 255])]]).url }, yg);
      el('ellipse', { cx: -9, cy: -13, rx: 6, ry: 3, fill: '#fff', opacity: 0.4, transform: 'rotate(-35 -9 -13)' }, yg);

      // Modes: rest, held, fall, sleep, climb.
      const s = { y: YR, v: 0, w: 0, ph: 0, mode: 'rest', bob: S(), sw: S(), sq: S(), sleep: 0, pid: null, y0: 0, x0: 0, yh: YR, yb: YR, k: 1, trail: [], moved: false };
      // The climb starts fast enough to reach the hand.
      const VUP = Math.sqrt(2 * G * (YB - YR));
      const body = {
        step(h) {
          spring(s.bob, 520, 0.22, h);
          spring(s.sq, 900, 0.3, h);
          // The yo-yo swings like a pendulum on its length of string.
          spring(s.sw, s.mode === 'held' ? 900 : clamp(9000 / (s.y - AY), 40, 400), s.mode === 'held' ? 0.9 : 0.08, h);
          if (s.mode === 'held') {
            const pv = s.y;
            s.y += (s.yh - s.y) * (1 - Math.exp(-30 * h));
            s.v = (s.y - pv) / h;
            s.ph += (s.y - pv) / AXLE;
            s.w = 0;
          } else if (s.mode === 'fall') {
            s.v += G * h;
            s.y += s.v * h;
            // The string unwinds, so the spin follows the fall.
            s.w = s.v / AXLE;
            if (s.y >= YB) {
              s.y = YB; s.mode = 'sleep'; s.sleep = rnd(0.9, 1.4);
              tug(clamp(s.v / 600)); s.bob.v += s.v * 0.12; s.sq.v -= 4;
            }
          } else if (s.mode === 'sleep') {
            // Asleep, it spins on the loop and slows a little.
            s.w *= Math.exp(-0.25 * h);
            s.sleep -= h;
            if (s.sleep <= 0) { s.mode = 'climb'; s.v = -VUP; }
          } else if (s.mode === 'climb') {
            s.v += G * h;
            s.y += s.v * h;
            s.w = Math.max(Math.abs(s.v) / AXLE, 6);
            if (s.y <= YR || s.v >= 0) {
              s.y = YR; s.mode = 'rest';
              slap(clamp(Math.abs(s.v) / 300 + 0.5)); s.bob.v -= 90; s.sq.v += 5; s.w = 0;
            }
          }
          if (s.mode !== 'held') s.ph += s.w * h;
        },
        busy() {
          const a = rest(s.bob, 0.02), b = rest(s.sw, 0.02), c = rest(s.sq, 2e-3);
          const m = s.mode === 'held' ? Math.abs(s.yh - s.y) > 0.05 : s.mode !== 'rest';
          return m || !(a && b && c);
        },
        draw() {
          const y = s.y + s.bob.x, x = AX + s.sw.x, q = clamp(s.sq.x, -0.2, 0.2);
          set(string, 'x2', f2(x)); set(string, 'y2', f2(y));
          set(yg, 'transform', `translate(${f2(x)} ${f2(y)}) scale(${f3(1 + q)} ${f3(1 - q)})`);
          set(spokes, 'transform', `rotate(${f2(mod(s.ph * R2D, 360))})`);
          // Fast spin fades the spokes into the blur ring.
          const b = clamp((Math.abs(s.w) - 15) / 40);
          set(spokes, 'opacity', f3(1 - 0.6 * b)); set(blurRing, 'opacity', f3(0.35 * b));
          shell.paint(s.mode === 'held' ? 0.5 : 0);
          whirr.set(0.05 * clamp(Math.abs(s.w) / 60), 280 + 9 * Math.abs(s.w));
        },
      };
      // A throw drops the yo-yo with some speed.
      // Reduced motion skips the trip.
      function toss(v0) {
        if (reduce) { s.mode = 'rest'; s.y = YR; slap(0.6); wake(body); return; }
        s.mode = 'fall'; s.v = Math.max(v0, 60);
        wake(body);
      }
      // Reeling in sends a falling or sleeping yo-yo home.
      function reel() {
        if (s.mode === 'fall' || s.mode === 'sleep') {
          s.mode = 'climb';
          s.v = -Math.sqrt(2 * G * Math.max(0, s.y - YR));
          wake(body);
        }
      }
      btn.addEventListener('pointerdown', e => {
        if (s.pid != null || e.button > 0) return;
        s.pid = e.pointerId;
        try { btn.setPointerCapture(e.pointerId); } catch {}
        s.k = 200 / btn.getBoundingClientRect().height;
        s.x0 = e.clientX; s.y0 = e.clientY; s.moved = false;
        // A hand catches the yo-yo wherever it is.
        if (!reduce) { s.mode = 'held'; s.yh = s.yb = s.y; s.sw.t = s.sw.x; }
        s.trail = [[e.timeStamp, s.y]];
        wake(body);
      });
      btn.addEventListener('pointermove', e => {
        if (e.pointerId !== s.pid) return;
        const dx = (e.clientX - s.x0) * s.k, dy = (e.clientY - s.y0) * s.k;
        if (!s.moved && Math.hypot(dx, dy) > 4) { s.moved = true; btn.classList.add('held'); }
        if (!s.moved || reduce) return;
        s.yh = clamp(s.yb + dy, YR, YB);
        s.sw.t = clamp(dx * 0.4, -24, 24);
        s.trail.push([e.timeStamp, s.yh]);
        while (s.trail.length > 2 && e.timeStamp - s.trail[0][0] > 120) s.trail.shift();
        wake(body);
      });
      const up = e => {
        if (e.pointerId !== s.pid) return;
        s.pid = null; btn.classList.remove('held');
        s.sw.t = 0;
        // A flick hands its speed down the string.
        const t = e.timeStamp, q = s.trail.filter(p => t - p[0] < 100);
        let v = 0;
        if (q.length > 1) { const dt = (q[q.length - 1][0] - q[0][0]) / 1000; if (dt > 0.008) v = (q[q.length - 1][1] - q[0][1]) / dt; }
        if (reduce) { toss(0); return; }
        // Pulled down or flicked, it drops.
        // A tap throws it from the hand.
        if (s.y > YR + 6 || v > 80) toss(Math.max(0, v));
        else if (!s.moved && e.type === 'pointerup') toss(rnd(150, 260));
        else { s.mode = 'rest'; s.y = YR; }
        wake(body);
      };
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => btn.addEventListener(t, up));
      // Keyboard clicks arrive with detail 0; pointer taps are handled above.
      btn.addEventListener('click', e => { if (e.detail === 0 && s.mode === 'rest') toss(rnd(150, 260)); });
      btn.addEventListener('keydown', e => {
        if (e.key === 'ArrowDown' && s.mode === 'rest') toss(rnd(150, 260));
        else if (e.key === 'ArrowUp') reel();
        else return;
        e.preventDefault();
      });
      moves.push({
        el: btn,
        // Shuffle throws it; reset reels it in.
        shuffle() { if (s.pid == null && s.mode === 'rest') toss(rnd(120, 320)); },
        reset() { if (s.pid == null) reel(); },
      });
      return body;
    })());
    return { bodies, moves, destroy() { whirr.stop(); } };
  },
};
