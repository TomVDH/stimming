import {
  reduce, PI, R2D, clamp, mod, f2, f3, rnd, KEYS, css, ramp, C, el, set, nid, grad, DOWN, svgIn, mat, skin, well, wake, S, spring, rest, snd,
} from '../kit.js';

const MARKUP = `<div class="ctl blinds wide" tabindex="0" role="slider" aria-label="Window blinds" aria-valuemin="-75" aria-valuemax="75" aria-valuenow="0" aria-valuetext="Open"></div>`;

// Plastic slats knock each other: two or three quick ticks.
const clatter = v => snd.play('blinds-clatter', 0.03, 0.06, (t, P, G) => {
  G *= 0.25 + 0.75 * v;
  const n = v > 0.5 ? 3 : 2;
  for (let k = 0; k < n; k++) {
    const at = t + k * rnd(0.007, 0.014);
    snd.hiss(at, 'bandpass', rnd(2400, 3600) * P, 2, 0.007, 0.2 * G * (1 - k * 0.25));
    snd.ring(at, rnd(850, 1150) * P, rnd(800, 1050) * P, 0.014, 0.035 * G);
  }
});
// The slats shut against each other: a duller clack.
const shut = v => snd.play('blinds-shut', 0.06, 0.06, (t, P, G) => {
  G *= v;
  snd.hiss(t, 'bandpass', 1700 * P, 1.4, 0.016, 0.34 * G);
  snd.ring(t, 520 * P, 440 * P, 0.03, 0.09 * G);
});

export default {
  id: 'blinds', slot: 'row',
  css: `.p-blinds .blinds { border-radius: 12px; cursor: grab; }`,
  mount(cell) {
    cell.insertAdjacentHTML('beforeend', MARKUP);
    const bodies = [], moves = [];
    let watch = null;
    // A mint frame holds a sky window behind five cream slats.
    const bEl = cell.querySelector('.blinds');
    bodies.push((() => {
      const VH = 100, svg = svgIn(bEl, `0 0 600 ${VH}`), defs = svg.k.defs;
      // Slat count, pivot pitch, slat depth and the tilt limit.
      const N = 5, Y0 = 21, PITCH = 11.6, D = 13.6, MAX = 1.32;
      const frame = skin(svg, svg, 'rect', { x: 3, y: 3, width: 594, height: 94, rx: 12 }, mat(C.mint, 0), { rim: 2.5, shadow: { b: 5, y: 7, o: 0.55 } });
      const hole = well(svg, svg, 'rect', { x: 12, y: 11, width: 576, height: 78, rx: 6 }, { rim: 3 });
      // The sky brightens as the slats open.
      const sky = grad(defs, 'linearGradient', DOWN, [[0, '#fff'], [1, '#fff']]);
      const SKY0 = ramp([0.38, 0.07, 245], [0.8, 0.1, 236]), SKY1 = ramp([0.45, 0.06, 225], [0.92, 0.06, 215]);
      const pane = el('rect', { x: 15, y: 14, width: 570, height: 72, rx: 4, fill: sky.url }, svg);
      const clip = el('clipPath', { id: nid('c') }, defs);
      const clipR = el('rect', { x: 15, y: 14, width: 570, height: 72, rx: 4 }, clip);
      const view = el('g', { 'clip-path': `url(#${clip.id})` }, svg);
      // A sun and two clouds sit behind the glass.
      const sun = el('circle', { r: 17, fill: css(C.butter) }, view);
      const CL = css(C.cream), clouds = [0, 1].map(() => {
        const g = el('g', { fill: CL, opacity: 0.85 }, view);
        el('ellipse', { cx: 0, cy: 0, rx: 26, ry: 8 }, g);
        el('ellipse', { cx: -8, cy: -6, rx: 12, ry: 9 }, g);
        el('ellipse', { cx: 8, cy: -4, rx: 10, ry: 7 }, g);
        return g;
      });
      const dim = el('rect', { x: 15, y: 14, width: 570, height: 72, fill: '#000', opacity: 0 }, view);
      const CORD = css([0.8, 0.03, 80]);
      const back = [0, 1].map(() => el('line', { y1: 17, y2: 84, stroke: CORD, 'stroke-width': 1.4, opacity: 0.7 }, view));
      // Each slat has a shadow, a face, a lit edge and a dark edge.
      const FACE = ramp([0.8, 0.03, 82], [0.97, 0.02, 88]);
      const slats = [];
      for (let i = 0; i < N; i++) {
        const cy = Y0 + PITCH * (i + 0.5);
        const sh = el('rect', { x: 15, height: 3, fill: '#000', opacity: 0.18 }, view);
        const face = el('rect', { x: 15, rx: 1.5 }, view);
        const lit = el('rect', { x: 15, height: 1, fill: '#fff' }, view);
        const dk = el('rect', { x: 15, height: 1, fill: '#000', opacity: 0.25 }, view);
        slats.push({ cy, sh, face, lit, dk, a: S() });
      }
      const front = [0, 1].map(() => el('line', { y1: 17, y2: 84, stroke: CORD, 'stroke-width': 1.4 }, view));
      // The head rail and the bottom rail.
      const RAIL = mat([0.9, 0.02, 85], 0);
      const head = skin(svg, svg, 'rect', { x: 13, y: 11, width: 574, height: 10, rx: 3 }, RAIL, { rim: 1.5, shadow: { b: 2, y: 3, o: 0.45 } });
      const foot = skin(svg, svg, 'rect', { x: 15, y: 80, width: 570, height: 7, rx: 3 }, RAIL, { rim: 1.5, shadow: { b: 2, y: 2.5, o: 0.4 } });
      // The tilt wand hangs at the right.
      // Its stripes twist with the tilt.
      const wand = el('g', {}, svg);
      el('rect', { x: -2.5, y: 21, width: 5, height: 58, rx: 2.5, fill: css([0.86, 0.04, 200]), opacity: 0.8 }, wand);
      const twist = el('g', { stroke: '#fff', 'stroke-width': 1.4, opacity: 0.75 }, wand);
      const bands = [0, 1, 2, 3, 4, 5].map(() => el('line', { x1: -2.5, x2: 2.5 }, twist));
      el('circle', { cx: 0, cy: 81, r: 3.5, fill: css([0.86, 0.04, 200]) }, wand);

      let VW = 600;
      const s = { m: S(), pid: null, y0: 0, a0: 0, span: 1, moved: false, trail: [], step: 0, hit: 0 };
      // The viewBox follows the plate; the slats run its full width.
      function fit() {
        const r = bEl.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) VW = Math.max(320, Math.round((VH * r.width) / r.height));
        svg.setAttribute('viewBox', `0 0 ${VW} ${VH}`);
        set(frame.shape, 'width', VW - 6); set(hole, 'width', VW - 24);
        for (const q of [pane, clipR, dim]) set(q, 'width', VW - 30);
        set(head.shape, 'width', VW - 26); set(foot.shape, 'width', VW - 30);
        slats.forEach(q => { for (const k of [q.sh, q.face, q.lit, q.dk]) set(k, 'width', VW - 30); });
        [0.18, 0.82].forEach((k, i) => {
          for (const c of [back[i], front[i]]) { set(c, 'x1', f2(VW * k)); set(c, 'x2', f2(VW * k)); }
        });
        set(sun, 'cx', f2(VW * 0.7)); set(sun, 'cy', 40);
        set(clouds[0], 'transform', `translate(${f2(VW * 0.32)} 36)`);
        set(clouds[1], 'transform', `translate(${f2(VW * 0.58)} 64) scale(0.8)`);
        set(wand, 'transform', `translate(${VW - 32} 0)`);
        body.draw();
      }
      const body = {
        step(h) {
          const m = s.m;
          // A finger damps the tilt; free slats flap and settle.
          spring(m, s.pid != null ? 900 : 240, s.pid != null ? 0.9 : 0.14, h);
          // The slats lag the wand a little, top first.
          slats.forEach((q, i) => {
            q.a.t = m.x;
            spring(q.a, 2600 - 280 * i, 0.32, h);
            if (Math.abs(q.a.x) > MAX) { q.a.x = Math.sign(q.a.x) * MAX; if (q.a.x * q.a.v > 0) q.a.v *= -0.3; }
          });
          if (Math.abs(m.x) > MAX) {
            const v = Math.abs(m.v);
            m.x = Math.sign(m.x) * MAX;
            if (m.x * m.v > 0) { m.v *= -0.35; if (v > 1.5) shut(clamp(v / 12)); }
          }
          // Each small step of tilt rattles the slats, louder when fast.
          const k = Math.floor(m.x / 0.13);
          if (k !== s.step) { s.step = k; if (Math.abs(m.v) > 0.6) clatter(clamp(Math.abs(m.v) / 14)); }
        },
        busy() {
          const a = rest(s.m, 2e-3), b = slats.every(q => rest(q.a, 2e-3));
          return !(a && b);
        },
        draw() {
          let shade = 0;
          slats.forEach(q => {
            const a = q.a.x, sn = Math.sin(a), hgt = Math.max(2.6, D * Math.abs(sn)), y = q.cy - hgt / 2;
            // Tilted forward, the slat shows its lit top; back, its shaded underside.
            set(q.face, 'y', f2(y)); set(q.face, 'height', f2(hgt));
            set(q.face, 'fill', FACE(0.5 + 0.5 * sn));
            set(q.lit, 'y', f2(y)); set(q.lit, 'opacity', f3(0.25 + 0.45 * clamp(sn + 0.4)));
            set(q.dk, 'y', f2(y + hgt - 1));
            set(q.sh, 'y', f2(y + hgt)); set(q.sh, 'height', f2(1 + 2.5 * Math.abs(Math.cos(a))));
            shade += clamp((D * Math.abs(sn)) / PITCH);
          });
          // The light through the gaps follows how open the slats are.
          const open = 1 - shade / N;
          set(sky.st[0], 'stop-color', SKY0(open)); set(sky.st[1], 'stop-color', SKY1(open));
          set(dim, 'opacity', f3(0.25 * (1 - open)));
          const tw = s.m.x * 9;
          bands.forEach((b, i) => { const y = 23 + mod(i * 10 + tw, 60); set(b, 'y1', f2(y + 2)); set(b, 'y2', f2(y - 2)); });
          const deg = Math.round(s.m.x * R2D);
          set(bEl, 'aria-valuenow', clamp(deg, -75, 75));
          set(bEl, 'aria-valuetext', open > 0.8 ? 'Open' : open < 0.15 ? 'Closed' : 'Half open');
        },
      };
      // A flap kicks the slats and lets them swing.
      function flap(v) { if (!reduce) s.m.v += v; wake(body); }
      function aim(a, kick = 0) {
        s.m.t = clamp(a, -MAX, MAX);
        // Reduced motion snaps the slats, so one clatter marks the move.
        if (reduce) clatter(0.5);
        flap(kick);
      }
      bEl.addEventListener('pointerdown', e => {
        if (s.pid != null || e.button > 0) return;
        s.pid = e.pointerId;
        try { bEl.setPointerCapture(e.pointerId); } catch {}
        // A drag of the plate's height tilts the slats about 85 degrees.
        s.span = bEl.getBoundingClientRect().height / 1.5;
        s.y0 = e.clientY; s.a0 = s.m.t; s.moved = false; s.trail = [[e.timeStamp, s.m.t]];
        bEl.classList.add('held');
        wake(body);
      });
      bEl.addEventListener('pointermove', e => {
        if (e.pointerId !== s.pid) return;
        const dy = e.clientY - s.y0;
        if (Math.abs(dy) > 3) s.moved = true;
        s.m.t = clamp(s.a0 + dy / s.span, -MAX, MAX);
        s.trail.push([e.timeStamp, s.m.t]);
        while (s.trail.length > 2 && e.timeStamp - s.trail[0][0] > 120) s.trail.shift();
        wake(body);
      });
      const up = e => {
        if (e.pointerId !== s.pid) return;
        s.pid = null; bEl.classList.remove('held');
        // A flick hands its speed to the slats.
        const t = e.timeStamp, q = s.trail.filter(p => t - p[0] < 100);
        if (q.length > 1) {
          const dt = (q[q.length - 1][0] - q[0][0]) / 1000;
          if (dt > 0.008) flap(clamp((q[q.length - 1][1] - q[0][1]) / dt * 0.5, -22, 22));
        }
        // A tap flutters the slats where they are.
        if (!s.moved && e.type === 'pointerup') flap((Math.random() < 0.5 ? -1 : 1) * rnd(6, 9));
        wake(body);
      };
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => bEl.addEventListener(t, up));
      bEl.addEventListener('keydown', e => {
        if (s.pid != null) return;
        const d = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
        if (d) aim(s.m.t + (d * PI) / 12, d * 3);
        else if (e.key === 'Home') aim(0, 3);
        else if (KEYS.includes(e.key)) flap((Math.random() < 0.5 ? -1 : 1) * 8);
        else return;
        e.preventDefault();
      });
      moves.push({
        el: bEl,
        // Shuffle tilts to a fresh random angle with a flap.
        shuffle() {
          if (s.pid != null) return;
          let a = rnd(-MAX, MAX);
          if (Math.abs(a - s.m.t) < 0.4) a = -Math.sign(s.m.t || 1) * rnd(0.5, MAX);
          aim(a, Math.sign(a - s.m.x) * rnd(4, 8));
        },
        // Reset opens the slats flat.
        reset() { if (s.pid == null && s.m.t !== 0) aim(0, -Math.sign(s.m.x) * 4); },
      });
      fit();
      watch = new ResizeObserver(fit);
      watch.observe(bEl);
      return body;
    })());
    return { bodies, moves, destroy() { watch.disconnect(); } };
  },
};
