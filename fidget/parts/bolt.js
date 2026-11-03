import {
  reduce, clamp, f2, f3, KEYS, css, C, el, set, nid, grad, svgIn, mat, skin, well, wake, S, spring, rest, snd,
} from '../kit.js';

const MARKUP = `<div class="grp"><div class="ctl bolt" id="bolt-latch" tabindex="0" role="switch" aria-label="Barrel bolt" aria-checked="false"></div></div>`;

// The knob lifts out of its notch: a fine click.
const unseat = () => snd.play('blift', 0.04, 0.04, (t, P, G) => {
  snd.hiss(t, 'highpass', 5200 * P, 0.8, 0.003, 0.22 * G);
  snd.ring(t, 2900 * P, 2850 * P, 0.03, 0.03 * G);
});
// The knob clears the run and can slide: a lighter click.
const clear = () => snd.play('btop', 0.04, 0.03, (t, P, G) => {
  snd.hiss(t, 'bandpass', 3800 * P, 1.4, 0.004, 0.14 * G);
  snd.ring(t, 2200 * P, 2180 * P, 0.02, 0.025 * G);
});
// The knob drops home: a metal clack.
const clack = v => snd.play('bclack', 0.05, 0.08, (t, P, G) => {
  G *= 0.35 + 0.65 * v;
  snd.hiss(t, 'bandpass', 2600 * P, 1.2, 0.012, 0.5 * G);
  snd.ring(t, 1250 * P, 1180 * P, 0.06, 0.06 * G);
  snd.ring(t, 170 * P, 110 * P, 0.05, 0.3 * G);
});
// The bolt reaches the end of its travel.
const clink = v => snd.play('bend', 0.05, 0.05, (t, P, G) => {
  snd.hiss(t, 'bandpass', 3200 * P, 1.5, 0.006, 0.2 * G * v);
  snd.ring(t, 1900 * P, 1860 * P, 0.04, 0.04 * G * v);
});

export default {
  id: 'bolt', slot: 'small',
  css: `.p-bolt .grp { --sr: 1.5; }
.p-bolt .bolt { --ar: 240 / 160; border-radius: 14px; cursor: grab; }`,
  mount(cell) {
    cell.insertAdjacentHTML('beforeend', MARKUP);
    const bodies = [], moves = [];
    // A steel plate, a sliding barrel, a coral knob in a slot with two notches.
    const boltEl = cell.querySelector('.bolt');
    const scrape = snd.drone(1.6);
    bodies.push((() => {
      const svg = svgIn(boltEl, '0 0 240 160'), defs = svg.k.defs;
      // The knob slides 40 units and drops 37 into either notch.
      const XK = 66, TX = 40, YD = 119, TY = 37;
      const DARK = mat([0.66, 0.014, 255], 0), BRIGHT = mat(C.steel, 0), sh = { b: 3, y: 4, o: 0.5 };
      skin(svg, svg, 'rect', { x: 182, y: 22, width: 48, height: 52, rx: 8 }, DARK, { rim: 2, shadow: sh });
      well(svg, svg, 'rect', { x: 188, y: 37, width: 30, height: 22, rx: 4 }, { rim: 2.5 });
      skin(svg, svg, 'rect', { x: 8, y: 16, width: 166, height: 128, rx: 12 }, mat([0.72, 0.012, 255], 0), { rim: 2.5, shadow: { b: 5, y: 6, o: 0.55 } });
      // The slot: a run along the top, a notch down at each end.
      well(svg, svg, 'path', { d: 'M59 119V82A7 7 0 0 1 66 75H106A7 7 0 0 1 113 82V119A7 7 0 0 1 99 119V89H73V119A7 7 0 0 1 59 119Z' }, { rim: 3 });
      const SCREW = css([0.5, 0.012, 255]);
      for (const [x, y] of [[22, 30], [160, 30], [22, 130], [160, 130], [206, 30], [206, 66]]) {
        el('circle', { cx: x, cy: y, r: 4.5, fill: SCREW }, svg);
        el('path', { d: `M${x - 3} ${y + 1.2}L${x + 3} ${y - 1.2}`, stroke: css([0.32, 0.015, 260]), 'stroke-width': 1.6, 'stroke-linecap': 'round' }, svg);
      }
      // The barrel slides; a groove on it turns as the knob lifts.
      const bg = el('g', {}, svg);
      const barrel = skin(svg, bg, 'rect', { x: 16, y: 36, width: 150, height: 24, rx: 6 }, BRIGHT, { rim: 2, shadow: sh });
      const clip = el('clipPath', { id: nid('c') }, defs);
      el('use', { href: '#' + barrel.shape.id }, clip);
      const groove = el('g', { 'clip-path': `url(#${clip.id})` }, bg);
      const gl = [el('rect', { x: 16, width: 150, height: 1.6, fill: '#000', opacity: 0.3 }, groove), el('rect', { x: 16, width: 150, height: 1.2, fill: '#fff', opacity: 0.5 }, groove)];
      // Straps hold the barrel to the plate; the keeper's strap takes its tip.
      for (const x of [20, 132, 190]) skin(svg, svg, 'rect', { x, y: 30, width: 26, height: 36, rx: 5 }, x > 180 ? DARK : BRIGHT, { rim: 2, shadow: sh });
      // The stem is a rod, lit across.
      const stem = el('rect', { width: 8, rx: 4, fill: grad(defs, 'linearGradient', { x1: 0, y1: 0, x2: 1, y2: 0 }, [[0, css([0.86, 0.01, 255])], [0.35, css([0.97, 0.006, 255])], [1, css([0.5, 0.015, 260])]]).url }, svg);
      const kg = el('g', {}, svg);
      const knob = skin(svg, kg, 'circle', { r: 11 }, mat(C.coral, 0.12), { rim: 2, shadow: { b: 3, y: 4, o: 0.6 } });

      // u lifts the knob out of a notch; p slides the bolt across.
      const s = { u: S(), p: S(), pid: null, x0: 0, y0: 0, u0: 0, p0: 0, sx: 1, sy: 1, moved: false, phase: '', goal: 0, seated: true, top: false, locked: false };
      const body = {
        step(h) {
          const { u, p } = s;
          if (s.pid != null) { spring(u, 900, 0.75, h); spring(p, 420, 0.9, h); }
          else {
            if (s.phase === 'lift') { u.t = 1; if (u.x > 0.94) s.phase = 'slide'; }
            if (s.phase === 'slide') { u.t = 1; p.t = s.goal; if (Math.abs(p.x - s.goal) < 0.02 && Math.abs(p.v) < 0.4) s.phase = 'drop'; }
            if (s.phase === 'drop') {
              // The knob falls into the notch and bounces once or twice.
              u.t = 0;
              if (reduce) { u.x = 0; u.v = 0; } else { u.v -= 40 * h; u.x += u.v * h; }
            } else spring(u, 380, 0.7, h);
            // The bolt is heavy: a slow, damped slide.
            spring(p, 140, 1, h);
          }
          // Ends of the slide stop the bolt.
          if (p.x < 0 || p.x > 1) {
            const e = p.x < 0 ? 0 : 1;
            if (Math.abs(p.v) > 1.2) clink(clamp(Math.abs(p.v) / 4));
            p.x = e; if ((p.v > 0) === (e === 1)) p.v *= -0.2;
          }
          // Off the ends, the run holds the knob up.
          const e = p.x < 0.5 ? 0 : 1;
          if (Math.abs(p.x - e) > 0.03 && u.x < 0.9) { u.x = 0.9; if (u.v < 0) u.v = 0; }
          // Down in a notch, the bolt cannot slide.
          if (u.x < 0.86) { p.x = e + clamp(p.x - e, -0.03, 0.03); p.v = 0; }
          // The notch floor stops the knob.
          if (u.x <= 0) {
            if (!s.seated) { s.seated = true; clack(clamp(-u.v / 4)); latch(e === 1); }
            u.x = 0; u.v = u.v < -0.6 ? -0.32 * u.v : 0;
          }
          if (s.seated && u.x > 0.25) { s.seated = false; unseat(); }
          if (!s.top && u.x > 0.9) { s.top = true; clear(); }
          else if (s.top && u.x < 0.8) s.top = false;
          if (s.phase === 'drop' && s.seated && u.x === 0 && u.v === 0) s.phase = '';
        },
        busy() { const a = rest(s.u), b = rest(s.p); return !(a && b) || s.phase !== ''; },
        draw() {
          const u = s.u.x, p = s.p.x, xk = XK + TX * p, ky = YD - TY * u;
          set(bg, 'transform', `translate(${f2(TX * p)} 0)`);
          // The groove rides up the barrel as it turns.
          const gy = 55 - 13 * clamp(u);
          set(gl[0], 'y', f2(gy)); set(gl[1], 'y', f2(gy + 1.6));
          set(stem, 'x', f2(xk - 4)); set(stem, 'y', 48); set(stem, 'height', f2(Math.max(0, ky - 48)));
          // Turned toward you, the knob looms larger.
          set(kg, 'transform', `translate(${f2(xk)} ${f2(ky)}) scale(${f3(1 + 0.16 * clamp(u))})`);
          knob.paint(s.pid != null ? 0.5 : 0);
          scrape.set(0.05 * clamp(Math.abs(s.p.v) / 2.5), 2400 + 600 * clamp(Math.abs(s.p.v) / 2.5));
        },
      };
      function latch(v) {
        s.locked = v;
        boltEl.setAttribute('aria-checked', String(v));
      }
      // Lift, slide, drop: the bolt runs to one end and seats.
      function go(goal) {
        s.goal = goal;
        if (s.seated && Math.abs(s.p.x - goal) < 0.05) return;
        s.phase = s.u.x > 0.9 ? 'slide' : 'lift';
        wake(body);
      }
      const toggle = () => go(s.seated ? (s.locked ? 0 : 1) : s.p.x < 0.5 ? 1 : 0);
      boltEl.addEventListener('pointerdown', e => {
        if (s.pid != null || e.button > 0) return;
        s.pid = e.pointerId;
        try { boltEl.setPointerCapture(e.pointerId); } catch {}
        const r = boltEl.getBoundingClientRect();
        // The knob moves with the finger in both steps.
        s.sx = (r.width * TX) / 240; s.sy = (r.height * TY) / 160;
        s.x0 = e.clientX; s.y0 = e.clientY; s.u0 = s.u.x; s.p0 = s.p.x;
        s.u.t = s.u.x; s.p.t = s.p.x; s.phase = ''; s.moved = false;
        boltEl.classList.add('held');
        wake(body);
      });
      boltEl.addEventListener('pointermove', e => {
        if (e.pointerId !== s.pid) return;
        const dx = e.clientX - s.x0, dy = e.clientY - s.y0;
        if (Math.hypot(dx, dy) > 4) s.moved = true;
        s.u.t = clamp(s.u0 - dy / s.sy);
        s.p.t = clamp(s.p0 + dx / s.sx);
        wake(body);
      });
      const up = e => {
        if (e.pointerId !== s.pid) return;
        s.pid = null; boltEl.classList.remove('held');
        if (!s.moved) { if (e.type === 'pointerup') toggle(); else wake(body); return; }
        // Near an end, the knob slides over and drops; mid-run, it stays.
        const e2 = s.p.x < 0.5 ? 0 : 1;
        if (Math.abs(s.p.x - e2) < 0.14) { s.goal = e2; s.phase = s.u.x > 0.86 ? 'slide' : 'drop'; }
        else { s.u.t = 1; s.p.t = s.p.x; }
        wake(body);
      };
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => boltEl.addEventListener(t, up));
      boltEl.addEventListener('keydown', e => {
        if (s.pid != null) return;
        if (e.key === 'ArrowRight') go(1);
        else if (e.key === 'ArrowLeft') go(0);
        else if (KEYS.includes(e.key)) toggle();
        else return;
        e.preventDefault();
      });
      moves.push({
        el: boltEl,
        shuffle() { if (s.pid == null) toggle(); },
        reset() { if (s.pid == null) go(0); },
      });
      return body;
    })());
    return { bodies, moves, destroy() { scrape.stop(); } };
  },
};
