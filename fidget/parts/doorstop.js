import {
  reduce, clamp, f2, f3, R2D, css, C, el, set, grad, DOWN, svgIn, mat, skin, wake, S, spring, rest, snd,
} from '../kit.js';

const MARKUP = `<div class="grp"><button class="ctl doorstop" id="doorstop" type="button" aria-label="Doorstop spring"></button></div>`;

export default {
  id: 'doorstop', slot: 'small',
  css: `.p-doorstop .grp { --sr: 0.8235; } .p-doorstop .doorstop { --ar: 140 / 170; border-radius: 14px; cursor: grab; }`,
  mount(cell) {
    cell.insertAdjacentHTML('beforeend', MARKUP);
    const bodies = [], moves = [];
    // A steel spring on a navy plate, with a coral rubber tip.
    const dsEl = cell.querySelector('#doorstop');
    bodies.push((() => {
      const svg = svgIn(dsEl, '0 0 140 170'), defs = svg.k.defs;
      // Base point, length, turns and the widest tip swing.
      const BX = 70, BY = 146, LEN = 112, TURNS = 22, UMAX = 52;
      skin(svg, svg, 'rect', { x: 38, y: 150, width: 64, height: 16, rx: 8 }, mat(C.navy, 0), { rim: 2, shadow: { b: 3, y: 4, o: 0.55 } });
      for (const cx of [46, 94]) el('circle', { cx, cy: 158, r: 2.4, fill: css([0.24, 0.03, 265]) }, svg);
      // Back halves of each turn sit in shade; front halves catch light.
      const back = el('path', { fill: 'none', stroke: css([0.5, 0.012, 258]), 'stroke-width': 2.4, 'stroke-linecap': 'round' }, svg);
      const front = el('path', { fill: 'none', stroke: css([0.86, 0.01, 255]), 'stroke-width': 2.6, 'stroke-linecap': 'round' }, svg);
      const shine = el('path', { fill: 'none', stroke: '#fff', 'stroke-width': 0.9, 'stroke-linecap': 'round', opacity: 0.7, transform: 'translate(-0.6 -0.6)' }, svg);
      // The collar hides the spring's root.
      skin(svg, svg, 'rect', { x: 56, y: 136, width: 28, height: 20, rx: 6 }, mat(C.steel, 0), { rim: 2, cyl: true, shadow: { b: 2, y: 3, o: 0.5 } });
      const tg = el('g', {}, svg);
      const tip = skin(svg, tg, 'rect', { x: -12, y: -26, width: 24, height: 30, rx: 12 }, mat(C.coral, 0.1), { rim: 2.5, shadow: { b: 3, y: 4, o: 0.5 } });
      el('rect', { x: -8, y: -2, width: 16, height: 5, rx: 2.5, fill: grad(defs, 'linearGradient', DOWN, [[0, '#000', 0.25], [1, '#000', 0]]).url }, tg);
      const s = { u: S(), pid: null, x0: 0, u0: 0, k: 1, moved: false, damp: false };
      // The axis bends like a cantilever under a load at its tip.
      function axis(xi, u, wv) {
        const sh = (3 * xi * xi - xi ** 3) / 2, ds = (6 * xi - 3 * xi * xi) / 2;
        // A fast swing whips the middle behind the tip.
        const wh = 4 * xi * xi * (1 - xi), dw = 4 * (2 * xi - 3 * xi * xi);
        const L = LEN * (1 - 0.16 * (u / LEN) ** 2);
        return [BX + u * sh + wv * wh, BY - xi * L, u * ds + wv * dw, -L];
      }
      const body = {
        step(h) {
          // Held, the tip tracks the finger; let go, it rings for seconds.
          if (s.pid != null) spring(s.u, 1600, 0.9, h);
          else spring(s.u, 900, s.damp ? 0.9 : 0.035, h);
        },
        busy() {
          if (rest(s.u, 0.04)) { s.damp = false; return false; }
          return true;
        },
        draw() {
          const u = s.u.x, wv = clamp(-0.012 * s.u.v, -10, 10);
          let fd = '', bd = '', sd = '';
          const n = TURNS * 2;
          // Each half turn is one cubic around the bent axis.
          for (let j = 0; j < n; j++) {
            const xa = j / n, xb = (j + 1) / n;
            const [ax, ay, atx, aty] = axis(xa, u, wv), [bx, by, btx, bty] = axis(xb, u, wv);
            const ma = Math.hypot(atx, aty), mb = Math.hypot(btx, bty);
            // Normal points right; the coil narrows toward the tip.
            const nax = -aty / ma, nay = atx / ma, nbx = -bty / mb, nby = btx / mb;
            const ra = 8 - 2.2 * xa, rb = 8 - 2.2 * xb, e = 1.6;
            const sg = j % 2 ? -1 : 1;
            // Front halves bow toward the base, back halves toward the tip.
            const ex = ((atx / ma) * e * sg), ey = ((aty / ma) * e * sg);
            const p0 = [ax - sg * nax * ra, ay - sg * nay * ra], p3 = [bx + sg * nbx * rb, by + sg * nby * rb];
            const seg = `M${f2(p0[0])} ${f2(p0[1])}C${f2(p0[0] - ex)} ${f2(p0[1] - ey)} ${f2(p3[0] - ex)} ${f2(p3[1] - ey)} ${f2(p3[0])} ${f2(p3[1])}`;
            if (sg > 0) { fd += seg; sd += seg; } else bd += seg;
          }
          set(front, 'd', fd); set(back, 'd', bd); set(shine, 'd', sd);
          const [tx, ty, ttx, tty] = axis(1, u, wv);
          set(tg, 'transform', `translate(${f2(tx)} ${f2(ty)}) rotate(${f2(Math.atan2(ttx, -tty) * R2D)})`);
          tip.paint(s.pid != null ? 0.5 : 0);
        },
      };
      // The doorstop boing: a twang with a wide, fast vibrato.
      function boing(m) {
        if (m < 0.04) return;
        snd.play('doorstop', 0.1, 0.9, (t, P, G) => {
          const ac = snd.kit.ac, g = G * clamp(m, 0.15, 1), d = 0.4 + 0.7 * m;
          snd.hiss(t, 'bandpass', 2400 * P, 1.4, 0.008, 0.18 * g);
          const o1 = snd.ring(t, 290 * P, 255 * P, d, 0.13 * g, 'triangle');
          const o2 = snd.ring(t, 610 * P, 540 * P, d * 0.6, 0.04 * g);
          const lfo = ac.createOscillator(), depth = ac.createGain();
          lfo.frequency.setValueAtTime(19 * P, t);
          lfo.frequency.exponentialRampToValueAtTime(13 * P, t + d);
          depth.gain.setValueAtTime(70 * P, t);
          depth.gain.exponentialRampToValueAtTime(3, t + d);
          lfo.connect(depth); depth.connect(o1.frequency); depth.connect(o2.frequency);
          lfo.start(t); lfo.stop(t + d + 0.02);
        });
      }
      // A flick throws the tip; reduced motion only plays the sound.
      function flick(dir, m) {
        boing(m);
        if (reduce) return;
        s.damp = false;
        s.u.v += dir * m * 900;
        wake(body);
      }
      dsEl.addEventListener('pointerdown', e => {
        if (s.pid != null || e.button > 0) return;
        s.pid = e.pointerId;
        try { dsEl.setPointerCapture(e.pointerId); } catch {}
        const r = dsEl.getBoundingClientRect();
        s.k = 140 / r.width; s.x0 = e.clientX; s.u0 = s.u.x; s.moved = false; s.damp = false;
        s.u.t = s.u.x;
        dsEl.classList.add('held');
        wake(body);
      });
      dsEl.addEventListener('pointermove', e => {
        if (e.pointerId !== s.pid) return;
        const dx = e.clientX - s.x0;
        if (!s.moved && Math.abs(dx) > 4) s.moved = true;
        s.u.t = clamp(s.u0 + dx * s.k, -UMAX, UMAX);
        wake(body);
      });
      function end(e) {
        if (e.pointerId !== s.pid) return;
        s.pid = null; dsEl.classList.remove('held');
        s.u.t = 0;
        if (!s.moved) {
          // A tap knocks the tip away from the side it lands on.
          if (e.type === 'pointerup') {
            const r = dsEl.getBoundingClientRect();
            flick(e.clientX < r.left + r.width / 2 ? 1 : -1, 0.6);
          }
        } else {
          boing(clamp(Math.abs(s.u.x) / UMAX + Math.abs(s.u.v) / 1500));
          if (reduce) s.u.x = 0;
        }
        wake(body);
      }
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => dsEl.addEventListener(t, end));
      // Keyboard clicks arrive with detail 0; pointer taps are handled above.
      dsEl.addEventListener('click', e => { if (e.detail === 0) flick(Math.random() < 0.5 ? -1 : 1, 0.6); });
      dsEl.addEventListener('keydown', e => {
        const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
        if (!d) return;
        e.preventDefault();
        flick(d, 0.6);
      });
      moves.push({
        el: dsEl,
        shuffle() { if (s.pid == null) flick(Math.random() < 0.5 ? -1 : 1, 0.45 + Math.random() * 0.55); },
        reset() { if (s.pid == null) { s.damp = true; wake(body); } },
      });
      return body;
    })());
    return { bodies, moves, destroy() {} };
  },
};
