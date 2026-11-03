import {
  reduce, TAU, clamp, f2, f3, rnd, KEYS, css, C, el, set, grad, svgIn, mat, skin, well, wake, S, spring, rest, snd,
} from '../kit.js';

const MARKUP = `<div class="grp"><div class="ctl tball" id="trackball" tabindex="0" role="button" aria-roledescription="trackball" aria-label="Trackball. Arrows roll it, Space spins or brakes it."></div></div>`;

export default {
  id: 'trackball', slot: 'big',
  css: `.p-trackball .tball { --ar: 1; border-radius: 50%; cursor: grab; }`,
  mount(cell) {
    cell.insertAdjacentHTML('beforeend', MARKUP);
    const bodies = [], moves = [];
    const rumble = snd.drone(1.1);
    // A glossy sky ball sits in a sunk socket on a navy collar.
    const tbEl = document.getElementById('trackball');
    bodies.push((() => {
      const svg = svgIn(tbEl, '0 0 400 400'), defs = svg.k.defs;
      const CX = 200, CY = 200, BR = 138;
      skin(svg, svg, 'circle', { cx: CX, cy: CY, r: 192 }, mat(C.navy, 0.04), { rim: 3, shadow: { b: 9, y: 11, o: 0.6 } });
      // Four steel screws hold the collar down.
      for (let k = 0; k < 4; k++) {
        const a = TAU / 8 + (k * TAU) / 4;
        skin(svg, svg, 'circle', { cx: f2(CX + 172 * Math.cos(a)), cy: f2(CY + 172 * Math.sin(a)), r: 7 }, mat(C.steel, 0), { rim: 1.5, shadow: { b: 1.5, y: 2, o: 0.5 } });
      }
      well(svg, svg, 'circle', { cx: CX, cy: CY, r: 152 }, { rim: 6 });
      const bg = el('g', {}, svg);
      const ball = skin(svg, bg, 'circle', { cx: CX, cy: CY, r: BR }, mat(C.sky, 0.08), { rim: 3, shadow: { b: 8, y: 10, o: 0.7 } });
      // The surface marks sit between the body and the shared sheen.
      const [, , sheenUse, rimUse] = ball.g.children;
      const feat = el('g', { 'clip-path': `url(#${ball.shape.getAttribute('id')}c)` });
      ball.g.insertBefore(feat, sheenUse);
      // A round shade darkens the limb, so the marks sit on a sphere.
      const shade = grad(defs, 'radialGradient', { cx: 0.4, cy: 0.34, r: 0.72 }, [[0, '#fff', 0.12], [0.55, '#000', 0], [1, '#000', 0.5]]);
      ball.g.insertBefore(el('circle', { cx: CX, cy: CY, r: BR, fill: shade.url }), sheenUse);
      // A crisp highlight gives the gloss.
      const spec = grad(defs, 'radialGradient', {}, [[0, '#fff', 0.85], [0.5, '#fff', 0.35], [1, '#fff', 0]]);
      ball.g.insertBefore(el('ellipse', { cx: 0, cy: 0, rx: 30, ry: 17, fill: spec.url, transform: `translate(${CX - 52} ${CY - 64}) rotate(-38)` }), rimUse);

      // The seam is a great circle: a navy band with cream stitches.
      const M = 56, W = 22, band = el('g', { stroke: css([0.42, 0.06, 262]), 'stroke-linecap': 'round' }, feat);
      const stitch = el('g', { stroke: css(C.cream), 'stroke-linecap': 'round' }, feat);
      const ring = [], bseg = [], sseg = [];
      for (let i = 0; i <= M; i++) { const t = (i / M) * TAU; ring.push([Math.cos(t), 0, Math.sin(t)]); }
      for (let i = 0; i < M; i++) { bseg.push(el('line', {}, band)); sseg.push(i % 2 ? null : el('line', {}, stitch)); }
      // Speckles spread evenly by the golden angle.
      const N = 26, dots = [];
      const DARK = css([0.3, 0.06, 258]), LIGHT = css(C.cream);
      for (let i = 0; i < N; i++) {
        const y = 1 - (2 * (i + 0.5)) / N, r = Math.sqrt(1 - y * y), a = i * 2.39996;
        const p = [r * Math.cos(a), y, r * Math.sin(a)];
        // The band area stays clear of speckles.
        if (Math.abs(p[1]) < 0.12) continue;
        const size = 4 + 6 * ((i * 0.618) % 1);
        dots.push({ p, size, e: el('ellipse', { rx: size, ry: size, fill: i % 4 ? DARK : LIGHT }, feat) });
      }

      // The orientation is a rotation matrix, row major.
      const R = [1, 0, 0, 0, 1, 0, 0, 0, 1];
      const s = { wx: 0, wy: 0, brake: false, drag: false, dsp: 0, pr: S(), pid: null, lx: 0, ly: 0, lt: 0, trail: [], k: 1 };
      // Turn the ball about a screen axis by the vector's length.
      function turn(ax, ay) {
        const a = Math.hypot(ax, ay);
        if (a < 1e-7) return;
        const kx = ax / a, ky = ay / a, c = Math.cos(a), sn = Math.sin(a), t = 1 - c;
        const Q = [c + t * kx * kx, t * kx * ky, sn * ky, t * kx * ky, c + t * ky * ky, -sn * kx, -sn * ky, sn * kx, c];
        const o = R.slice();
        for (let r = 0; r < 3; r++) for (let j = 0; j < 3; j++) R[r * 3 + j] = Q[r * 3] * o[j] + Q[r * 3 + 1] * o[3 + j] + Q[r * 3 + 2] * o[6 + j];
      }
      // Gram-Schmidt keeps the matrix a clean rotation.
      function tidy() {
        let [a, b, c] = [R[0], R[3], R[6]], n = Math.hypot(a, b, c);
        a /= n; b /= n; c /= n;
        let [d, e, f] = [R[1], R[4], R[7]];
        const k = a * d + b * e + c * f;
        d -= k * a; e -= k * b; f -= k * c; n = Math.hypot(d, e, f); d /= n; e /= n; f /= n;
        R[0] = a; R[3] = b; R[6] = c; R[1] = d; R[4] = e; R[7] = f;
        R[2] = b * f - c * e; R[5] = c * d - a * f; R[8] = a * e - b * d;
      }
      const X = p => R[0] * p[0] + R[1] * p[1] + R[2] * p[2];
      const Y = p => R[3] * p[0] + R[4] * p[1] + R[5] * p[2];
      const Z = p => R[6] * p[0] + R[7] * p[1] + R[8] * p[2];
      // The ball starts tilted, so the seam shows as a curve.
      turn(0.75, 0); turn(0, 0.5);

      const body = {
        step(h) {
          spring(s.pr, 700, 0.5, h);
          if (s.drag) { s.dsp *= Math.exp(-9 * h); return; }
          const w = Math.hypot(s.wx, s.wy);
          if (!w) return;
          if (reduce) { s.wx = s.wy = 0; return; }
          // Rolling friction is light; the brake is heavy.
          const cf = s.brake ? 7 : 0.55, mu = s.brake ? 5 : 0.45, nw = w - (cf * w + mu) * h;
          if (nw < 0.03) { s.wx = s.wy = 0; s.brake = false; return; }
          s.wx *= nw / w; s.wy *= nw / w;
          turn(s.wx * h, s.wy * h);
        },
        busy() { const still = rest(s.pr); return !still || (s.drag ? s.dsp > 0.05 : s.wx !== 0 || s.wy !== 0); },
        draw() {
          tidy();
          for (let i = 0; i < M; i++) {
            const p = ring[i], q = ring[i + 1];
            const x1 = X(p), y1 = Y(p), z1 = Z(p), x2 = X(q), y2 = Y(q), z2 = Z(q), z = (z1 + z2) / 2;
            const bl = bseg[i], sl = sseg[i];
            if (z < 0.01) { set(bl, 'opacity', 0); if (sl) set(sl, 'opacity', 0); continue; }
            // The band thins toward the limb by its foreshortening.
            const d3 = Math.hypot(x2 - x1, y2 - y1, z2 - z1), d2 = Math.hypot(x2 - x1, y2 - y1);
            const fs = Math.min(1, (z * d3) / Math.max(d2, 1e-4)), op = f3(clamp(z * 6));
            const a = { x1: f2(CX + BR * x1), y1: f2(CY + BR * y1), x2: f2(CX + BR * x2), y2: f2(CY + BR * y2) };
            for (const k in a) set(bl, k, a[k]);
            set(bl, 'stroke-width', f2(W * fs)); set(bl, 'opacity', op);
            if (sl) { for (const k in a) set(sl, k, a[k]); set(sl, 'stroke-width', f2(3 * fs)); set(sl, 'opacity', op); }
          }
          for (const d of dots) {
            const x = X(d.p), y = Y(d.p), z = Z(d.p);
            if (z < 0.01) { set(d.e, 'opacity', 0); continue; }
            // Each speckle squashes along its radius near the limb.
            const deg = f2((Math.atan2(y, x) * 180) / Math.PI);
            set(d.e, 'transform', `translate(${f2(CX + BR * x)} ${f2(CY + BR * y)}) rotate(${deg})`);
            set(d.e, 'rx', f2(d.size * z)); set(d.e, 'opacity', f3(clamp(z * 5)));
          }
          const p = s.pr.x;
          set(bg, 'transform', `translate(200 200) scale(${f3(1 - 0.015 * p)}) translate(-200 -200)`);
          ball.paint(p * 0.5);
          // The rumble follows the rolling speed.
          const sp = s.drag ? s.dsp : Math.hypot(s.wx, s.wy);
          rumble.set(0.12 * clamp(sp / 9), 70 + 22 * Math.min(sp, 14));
        },
      };

      tbEl.addEventListener('pointerdown', e => {
        if (s.pid != null || e.button > 0) return;
        s.pid = e.pointerId;
        try { tbEl.setPointerCapture(e.pointerId); } catch {}
        // One ball radius in pixels sets the drag scale.
        s.k = 1 / ((tbEl.getBoundingClientRect().width * BR) / 400);
        s.lx = e.clientX; s.ly = e.clientY; s.lt = e.timeStamp;
        s.trail = [[e.timeStamp, e.clientX, e.clientY]];
        // A hand on the ball stops it dead.
        s.wx = s.wy = 0; s.brake = false; s.drag = true; s.dsp = 0;
        s.pr.t = 1; tbEl.classList.add('held');
        wake(body);
      });
      tbEl.addEventListener('pointermove', e => {
        if (e.pointerId !== s.pid) return;
        const dx = e.clientX - s.lx, dy = e.clientY - s.ly, dt = Math.max(e.timeStamp - s.lt, 1) / 1000;
        s.lx = e.clientX; s.ly = e.clientY; s.lt = e.timeStamp;
        // The surface under the finger moves with the finger.
        turn(-dy * s.k, dx * s.k);
        s.dsp = Math.max(s.dsp, Math.min(20, (Math.hypot(dx, dy) * s.k) / dt) * 0.6);
        s.trail.push([e.timeStamp, e.clientX, e.clientY]);
        while (s.trail.length > 2 && e.timeStamp - s.trail[0][0] > 120) s.trail.shift();
        wake(body);
      });
      function end(e) {
        if (e.pointerId !== s.pid) return;
        s.pid = null; s.drag = false; s.pr.t = 0; tbEl.classList.remove('held');
        // Pointer speed over the last 100 ms sets the roll.
        const t = e.timeStamp, q = s.trail.filter(p => t - p[0] < 100);
        if (!reduce && q.length > 1 && t - q[q.length - 1][0] < 50) {
          const a = q[0], b = q[q.length - 1], dt = (b[0] - a[0]) / 1000;
          if (dt > 0.008) {
            let wx = (-(b[2] - a[2]) * s.k) / dt, wy = ((b[1] - a[1]) * s.k) / dt;
            const w = Math.hypot(wx, wy);
            if (w > 30) { wx *= 30 / w; wy *= 30 / w; }
            if (w > 0.4) { s.wx = wx; s.wy = wy; }
          }
        }
        wake(body);
      }
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => tbEl.addEventListener(t, end));
      function spin() {
        const a = rnd(0, TAU), m = rnd(7, 13);
        if (reduce) turn(Math.cos(a) * rnd(1, 2.5), Math.sin(a) * rnd(1, 2.5));
        else { s.wx = Math.cos(a) * m; s.wy = Math.sin(a) * m; s.brake = false; }
        wake(body);
      }
      function brake() { if (reduce) { s.wx = s.wy = 0; } else s.brake = true; wake(body); }
      tbEl.addEventListener('keydown', e => {
        if (s.pid != null) return;
        const d = { ArrowUp: [1, 0], ArrowDown: [-1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[e.key];
        if (d) {
          // Arrows push the roll; reduced motion turns a fixed step.
          if (reduce) turn(d[0] * 0.3, d[1] * 0.3);
          else { s.wx = clamp(s.wx + d[0] * 3, -30, 30); s.wy = clamp(s.wy + d[1] * 3, -30, 30); s.brake = false; }
          wake(body);
        } else if (KEYS.includes(e.key)) {
          if (!e.repeat) { if (s.wx || s.wy) brake(); else spin(); }
        } else return;
        e.preventDefault();
      });
      moves.push({
        el: tbEl,
        shuffle() { if (s.pid == null) spin(); },
        reset() { if (s.pid == null && (s.wx || s.wy)) brake(); },
      });
      return body;
    })());
    return { bodies, moves, destroy() { rumble.stop(); } };
  },
};
