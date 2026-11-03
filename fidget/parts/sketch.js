import {
  reduce, TAU, R2D, clamp, f2, f3, rnd, angDiff, KEYS, css, C, el, set, nid, grad, DOWN, svgIn, mat, skin, well, wake, S, spring, rest, snd,
} from '../kit.js';

// The frame is 400 by 320.
// The knobs sit in its bottom corners.
const VW = 400, VH = 320, KN = [[58, 276], [342, 276]], KR = 30, HR = 40;
const pct = (v, n) => f3((v / n) * 100) + '%';
const hit = (i, label, o) => {
  const [x, y] = KN[i];
  return `<div class="sknob" tabindex="0" role="slider" aria-label="${label}" aria-orientation="${o}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50" style="left:${pct(x - HR, VW)};top:${pct(y - HR, VH)};width:${pct(2 * HR, VW)};height:${pct(2 * HR, VH)}"></div>`;
};
const MARKUP = `<div class="grp"><div class="ctl sketchpad" role="group" aria-label="Sketch screen">${hit(0, 'Left knob', 'horizontal')}${hit(1, 'Right knob', 'vertical')}</div></div>`;

// The shake: powder rattles behind the glass, the plastic knocks.
const rattle = v => snd.play('sketch-rattle', 0.14, 0.3, (t, P, G) => {
  G *= v;
  for (let k = 0; k < 7; k++) {
    const at = t + k * 0.03 + Math.random() * 0.012;
    snd.hiss(at, 'bandpass', rnd(3200, 6400) * P, 1.2, 0.025, 0.14 * G * (1 - k * 0.1));
  }
  snd.hiss(t, 'highpass', 4200 * P, 0.7, 0.22, 0.05 * G);
  snd.ring(t, 150 * P, 105 * P, 0.06, 0.2 * G);
});

export default {
  id: 'sketch', slot: 'big',
  css: `.p-sketch .grp { --sr: 1.25; }
.p-sketch .sketchpad { --ar: 400 / 320; border-radius: 9% / 11%; cursor: grab; }
.p-sketch .sknob { position: absolute; z-index: 1; border-radius: 50%; pointer-events: none; }
.p-sketch .sknob:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }`,
  mount(cell) {
    cell.insertAdjacentHTML('beforeend', MARKUP);
    const bodies = [], moves = [];
    // A lilac frame holds a pale grey screen and two butter knobs.
    const pad = cell.querySelector('.sketchpad'), knobEls = pad.querySelectorAll('.sknob');
    const scratch = snd.drone(1.4);
    bodies.push((() => {
      const svg = svgIn(pad, `0 0 ${VW} ${VH}`), defs = svg.k.defs;
      // The stylus stays inside these bounds.
      const X0 = 46, X1 = 354, Y0 = 36, Y1 = 226, MX = 200, MY = 131;
      // One knob turn moves the stylus K units per radian.
      const K = 22;
      const fg = el('g', {}, svg);
      skin(svg, fg, 'rect', { x: 4, y: 4, width: 392, height: 312, rx: 34 }, mat(C.lilac, 0), { rim: 3, shadow: { b: 9, y: 11, o: 0.6 } });
      // The screen sits in a dark recess with a thin steel lip.
      well(svg, fg, 'rect', { x: 30, y: 20, width: 340, height: 222, rx: 16 }, { rim: 4 });
      el('rect', { x: 35, y: 25, width: 330, height: 212, rx: 12, fill: css([0.7, 0.01, 255]) }, fg);
      el('rect', { x: 38, y: 28, width: 324, height: 206, rx: 10, fill: grad(defs, 'linearGradient', DOWN, [[0, css([0.84, 0.006, 250])], [1, css([0.89, 0.006, 240])]]).url }, fg);
      const clip = el('clipPath', { id: nid('c') }, defs);
      el('rect', { x: 38, y: 28, width: 324, height: 206, rx: 10 }, clip);
      const ink = el('g', { 'clip-path': `url(#${clip.id})`, fill: 'none', stroke: css([0.3, 0.012, 262]), 'stroke-width': 2.2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, fg);
      const pen = el('circle', { r: 2.4, fill: css([0.26, 0.012, 262]) }, fg);
      // The glass has a shade at the top and one glare band.
      el('rect', { x: 38, y: 28, width: 324, height: 206, rx: 10, fill: grad(defs, 'linearGradient', DOWN, [[0, '#000', 0.2], [0.08, '#000', 0], [1, '#000', 0]]).url }, fg);
      el('path', { d: 'M60 28L150 28L70 234L38 234L38 90Z', fill: '#fff', opacity: 0.12, 'clip-path': `url(#${clip.id})` }, fg);
      // A cream squiggle marks the frame between the knobs.
      el('path', { d: 'M150 280q12.5-16 25 0t25 0t25 0t25 0', fill: 'none', stroke: css(C.cream), 'stroke-width': 4.5, 'stroke-linecap': 'round', opacity: 0.85 }, fg);
      const CREAM = mat(C.butter, 0.12), RIDGE = css([0.72, 0.03, 80]);
      const knobs = KN.map(([cx, cy]) => {
        const g = el('g', {}, fg);
        const k = skin(svg, g, 'circle', { cx, cy, r: KR }, CREAM, { rim: 2.5, shadow: { b: 4, y: 6, o: 0.55 } });
        // The ridges and a coral pip turn with the knob.
        const rg = el('g', { stroke: RIDGE, 'stroke-width': 2.6, 'stroke-linecap': 'round' }, g);
        for (let j = 0; j < 20; j++) {
          const a = (j / 20) * TAU;
          el('line', { x1: f2(cx + 24 * Math.sin(a)), y1: f2(cy - 24 * Math.cos(a)), x2: f2(cx + 28.5 * Math.sin(a)), y2: f2(cy - 28.5 * Math.cos(a)) }, rg);
        }
        el('circle', { cx, cy, r: 18, fill: grad(defs, 'linearGradient', DOWN, [[0, '#000', 0.16], [0.55, '#000', 0], [1, '#fff', 0.5]]).url }, g);
        el('circle', { cx, cy: cy - 12, r: 3.4, fill: css(C.coral) }, rg);
        return { g, rg, k, cx, cy, pr: S() };
      });

      // Point count per stroke chunk, and the cap on all points.
      const CH = 120, CAP = 3600;
      const s = {
        x: S(MX), y: S(MY), shx: S(), shy: S(), rot: S(), chunks: [], live: null, total: 0, lx: MX, ly: MY,
        auto: null, pid: null, mode: null, prev: 0, rect: null, fx: 0, fy: 0, dir: 0, run: 0, moved: false,
      };
      // A chunk is one path; old chunks fade as a whole.
      function chunk(x, y) {
        const c = { p: el('path', {}, ink), d: `M${f2(x)} ${f2(y)}`, n: 1, o: 1, goal: 1, dirty: true };
        s.chunks.push(c);
        return c;
      }
      function dot(x, y) {
        if (!s.live) s.live = chunk(s.lx, s.ly);
        s.live.d += `L${f2(x)} ${f2(y)}`; s.live.n++; s.live.dirty = true; s.total++;
        s.lx = x; s.ly = y;
        if (s.live.n >= CH) s.live = chunk(x, y);
        // Past the cap, the oldest chunk drops out.
        while (s.total > CAP && s.chunks.length > 1) { const c = s.chunks.shift(); s.total -= c.n; c.p.remove(); }
      }
      // A shake thins every line; new lines start fresh.
      function fade(k) {
        s.chunks.forEach(c => { c.goal *= 1 - k; });
        s.live = null;
      }
      function shake(m) {
        const d = Math.random() < 0.5 ? -1 : 1;
        if (!reduce) { s.shx.v += d * 420 * m; s.shy.v -= 200 * m; s.rot.v -= d * 500 * m; }
        rattle(m);
        fade(clamp(m));
        wake(body);
      }
      // The wiggle sums a drift and a sine on each axis.
      function wiggle() {
        const w = { t: 0, dur: rnd(0.7, 1.1), x0: s.x.x, y0: s.y.x, fx: rnd(1.5, 3.5), fy: rnd(1.5, 3.5), px: rnd(0, TAU), py: rnd(0, TAU), ax: rnd(14, 40), ay: rnd(14, 40) };
        w.dx = (MX - w.x0) * 0.5 + rnd(-70, 70); w.dy = (MY - w.y0) * 0.5 + rnd(-40, 40);
        w.at = u => [
          clamp(w.x0 + w.dx * u + w.ax * (Math.sin(TAU * w.fx * u + w.px) - Math.sin(w.px)), X0, X1),
          clamp(w.y0 + w.dy * u + w.ay * (Math.sin(TAU * w.fy * u + w.py) - Math.sin(w.py)), Y0, Y1),
        ];
        return w;
      }
      const body = {
        step(h) {
          if (s.auto) {
            const w = s.auto;
            w.t += h;
            [s.x.t, s.y.t] = w.at(Math.min(1, w.t / w.dur));
            if (w.t >= w.dur) s.auto = null;
          }
          // A stiff, damped follow turns finger jumps into smooth curves.
          spring(s.x, 1500, 1, h);
          spring(s.y, 1500, 1, h);
          s.x.x = clamp(s.x.x, X0, X1); s.y.x = clamp(s.y.x, Y0, Y1);
          if (Math.hypot(s.x.x - s.lx, s.y.x - s.ly) > 1.4) dot(s.x.x, s.y.x);
          // The frame wobbles loosely about its rest.
          const kf = s.mode === 'frame' ? 900 : 420, zf = s.mode === 'frame' ? 0.8 : 0.2;
          spring(s.shx, kf, zf, h); spring(s.shy, kf, zf, h); spring(s.rot, kf, zf, h);
          knobs.forEach(k => spring(k.pr, 900, 0.6, h));
          const e = reduce ? 1 : 1 - Math.exp(-7 * h);
          for (let i = s.chunks.length - 1; i >= 0; i--) {
            const c = s.chunks[i];
            if (c.o === c.goal) continue;
            c.o += (c.goal - c.o) * e;
            if (Math.abs(c.o - c.goal) < 0.004) c.o = c.goal;
            if (c.goal < 0.03 && c.o < 0.03) { s.total -= c.n; c.p.remove(); s.chunks.splice(i, 1); if (c === s.live) s.live = null; }
          }
        },
        busy() {
          const a = rest(s.x, 0.02) && rest(s.y, 0.02), b = rest(s.shx, 0.02) && rest(s.shy, 0.02) && rest(s.rot, 0.01);
          const c = knobs.every(k => rest(k.pr)), d = s.chunks.every(q => q.o === q.goal);
          return !(a && b && c && d) || !!s.auto;
        },
        draw() {
          const x = s.x.x, y = s.y.x;
          set(fg, 'transform', `translate(${f2(s.shx.x)} ${f2(s.shy.x)}) rotate(${f2(s.rot.x * 0.1)} 200 160)`);
          s.chunks.forEach(c => {
            if (c.dirty) { c.dirty = false; set(c.p, 'd', c.d); }
            set(c.p, 'opacity', f3(c.o));
          });
          set(pen, 'cx', f2(x)); set(pen, 'cy', f2(y));
          // The left knob follows x; the right knob turns against y.
          const ang = [(x - MX) / K, -(y - MY) / K];
          knobs.forEach((k, i) => {
            set(k.rg, 'transform', `rotate(${f2(ang[i] * R2D)} ${k.cx} ${k.cy})`);
            const sc = 1 - 0.05 * k.pr.x;
            set(k.g, 'transform', `translate(${k.cx} ${k.cy}) scale(${f3(sc)}) translate(${-k.cx} ${-k.cy})`);
            k.k.paint(k.pr.x * 0.7);
          });
          // The stylus scratches faintly while it draws.
          const sp = Math.hypot(s.x.v, s.y.v);
          scratch.set(0.1 * clamp(sp / 300) ** 0.7, 3000 + 2 * sp);
          set(knobEls[0], 'aria-valuenow', Math.round(((x - X0) / (X1 - X0)) * 100));
          set(knobEls[1], 'aria-valuenow', Math.round(((Y1 - y) / (Y1 - Y0)) * 100));
        },
      };
      const local = e => [((e.clientX - s.rect.left) / s.rect.width) * VW, ((e.clientY - s.rect.top) / s.rect.height) * VH];
      // The knob angle comes from the pointer around the knob centre.
      const polar = (e, i) => {
        const k = KN[i], cx = s.rect.left + (k[0] / VW) * s.rect.width, cy = s.rect.top + (k[1] / VH) * s.rect.height;
        const dx = e.clientX - cx, dy = e.clientY - cy;
        return [Math.atan2(dx, -dy), Math.hypot(dx, dy)];
      };
      pad.addEventListener('pointerdown', e => {
        if (s.pid != null || e.button > 0) return;
        s.pid = e.pointerId;
        try { pad.setPointerCapture(e.pointerId); } catch {}
        s.rect = pad.getBoundingClientRect();
        const [vx, vy] = local(e);
        s.auto = null; s.moved = false;
        // Near a knob, the finger turns it; elsewhere, it grips the frame.
        const i = KN.findIndex(([kx, ky]) => Math.hypot(vx - kx, vy - ky) < HR + 14);
        if (i >= 0) { s.mode = i; s.prev = polar(e, i)[0]; knobs[i].pr.t = 1; }
        else { s.mode = 'frame'; s.fx = e.clientX; s.fy = e.clientY; s.dir = 0; s.run = 0; }
        pad.classList.add('held');
        wake(body);
      });
      pad.addEventListener('pointermove', e => {
        if (e.pointerId !== s.pid) return;
        if (s.mode === 'frame') {
          const k = VW / s.rect.width, dx = (e.clientX - s.fx) * k, dy = (e.clientY - s.fy) * k;
          if (Math.hypot(dx, dy) > 4) s.moved = true;
          const px = s.shx.t;
          s.shx.t = clamp(dx * 0.5, -18, 18); s.shy.t = clamp(dy * 0.5, -12, 12); s.rot.t = clamp(dx * 0.35, -30, 30);
          // Each hard reversal of the shake thins the lines.
          const step = s.shx.t - px, d = Math.sign(step);
          if (d && d !== s.dir) {
            if (s.dir && s.run > 10) { fade(0.3); rattle(clamp(s.run / 30)); }
            s.dir = d; s.run = 0;
          }
          s.run += Math.abs(step);
        } else if (s.mode != null) {
          const [a, r] = polar(e, s.mode), da = angDiff(a, s.prev);
          s.prev = a;
          // Near the centre the angle jumps, so the move is skipped.
          if (r < 5) return;
          if (s.mode === 0) s.x.t = clamp(s.x.t + da * K, X0, X1);
          else s.y.t = clamp(s.y.t - da * K, Y0, Y1);
        }
        wake(body);
      });
      const up = e => {
        if (e.pointerId !== s.pid) return;
        s.pid = null; pad.classList.remove('held');
        if (s.mode === 'frame') {
          s.shx.t = s.shy.t = s.rot.t = 0;
          // A tap on the frame gives a small shake.
          if (!s.moved && e.type === 'pointerup') shake(0.35);
        } else if (s.mode != null) knobs[s.mode].pr.t = 0;
        s.mode = null;
        wake(body);
      };
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => pad.addEventListener(t, up));
      // Arrows turn a knob; Space or Enter shakes the frame.
      knobEls.forEach((kEl, i) => kEl.addEventListener('keydown', e => {
        const d = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 4, PageDown: -4 }[e.key];
        if (d) {
          s.auto = null;
          if (i === 0) s.x.t = clamp(s.x.t + d * 8, X0, X1);
          else s.y.t = clamp(s.y.t - d * 8, Y0, Y1);
          knobs[i].pr.v += 6;
        } else if (KEYS.includes(e.key)) { if (!e.repeat) shake(1); }
        else return;
        e.preventDefault();
        wake(body);
      }));
      moves.push({
        el: pad,
        // Shuffle draws a short random wiggle.
        shuffle() {
          if (s.pid != null) return;
          const w = wiggle();
          if (reduce) {
            for (let u = 0.01; u <= 1; u += 0.01) { const [x, y] = w.at(u); dot(x, y); }
            s.x.x = s.x.t = s.lx; s.y.x = s.y.t = s.ly;
          } else s.auto = w;
          wake(body);
        },
        // Reset shakes the frame, and the line fades away.
        reset() { if (s.pid == null) { s.auto = null; shake(1); } },
      });
      return body;
    })());
    return { bodies, moves, destroy() { scratch.stop(); } };
  },
};
