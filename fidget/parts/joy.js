import {
  NS, reduce, TAU, PI, D2R, R2D, clamp, lerp, mod, f2, f3, rnd, angDiff, KEYS, css, mixLch, ramp, C, TICK, BUTTER, el, set, nid, grad, DOWN, blur, LIGHT, svgIn, mat, skin, WELL, well, shine, wake, sleep, S, spring, rest, board, snd, BEZEL,
} from '../kit.js';

const MARKUP = `<div class="grp"><div class="ctl joy" id="joy" tabindex="0" role="group" aria-roledescription="joystick" aria-label="Joystick"></div></div>`;

export default {
  id: 'joy', slot: 'small',
  mount(cell) {
    cell.insertAdjacentHTML('beforeend', MARKUP);
    const bodies = [], moves = [];
    // A recessed gate, a rubber boot, a coral nub on a dark stem.
    const joyEl = document.getElementById('joy');
    bodies.push((() => {
      const svg = svgIn(joyEl, '0 0 200 200'), defs = svg.k.defs, R = 56;
      well(svg, svg, 'circle', { cx: 100, cy: 100, r: 99 }, { rim: 6 });
      const marks = el('g', { stroke: TICK, 'stroke-width': 3, 'stroke-linecap': 'round' }, svg);
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * TAU, c = Math.cos(a), sn = Math.sin(a);
        el('line', { x1: f2(100 + 84 * sn), y1: f2(100 - 84 * c), x2: f2(100 + 91 * sn), y2: f2(100 - 91 * c) }, marks);
      }
      // The boot is a soft dome; the stem leans out of it.
      el('circle', { cx: 100, cy: 100, r: 30, fill: grad(defs, 'radialGradient', { cx: 0.4, cy: 0.35, r: 0.7 }, [[0, css([0.36, 0.02, 270])], [1, css([0.18, 0.015, 270])]]).url }, svg);
      const stem = el('line', { x1: 100, y1: 100, x2: 100, y2: 100, stroke: css([0.27, 0.015, 270]), 'stroke-width': 20, 'stroke-linecap': 'round' }, svg);
      const ng = el('g', {}, svg);
      const nub = skin(svg, ng, 'circle', { cx: 100, cy: 100, r: 40 }, mat(C.coral, 0.1), { rim: 3, shadow: { b: 6, y: 8, o: 0.6 } });
      // A shallow thumb dish sits in the top of the nub.
      el('circle', { cx: 100, cy: 100, r: 22, fill: grad(defs, 'linearGradient', DOWN, [[0, '#000', 0.22], [0.6, '#000', 0], [1, '#fff', 0.35]]).url }, ng);
      const s = { x: S(), y: S(), pr: S(), pid: null, ox: 0, oy: 0, keys: 0, rect: null };
      const body = {
        step(h) {
          // Held, the nub tracks firmly; let go, it wobbles home.
          const k = s.pid != null ? 1500 : s.keys ? 700 : 240, z = s.pid != null ? 0.85 : s.keys ? 0.7 : 0.16;
          spring(s.x, k, z, h);
          spring(s.y, k, z, h);
          const m = Math.hypot(s.x.x, s.y.x);
          if (m > R) {
            // The gate rim stops the nub and returns part of its speed.
            const nx = s.x.x / m, ny = s.y.x / m, vn = s.x.v * nx + s.y.v * ny;
            s.x.x = nx * R; s.y.x = ny * R;
            if (vn > 160) snd.rim(clamp(vn / 700));
            if (vn > 0) { s.x.v -= 1.5 * vn * nx; s.y.v -= 1.5 * vn * ny; }
          }
          spring(s.pr, 900, 0.55, h);
        },
        busy() { const a = rest(s.x, 0.05), b = rest(s.y, 0.05), c = rest(s.pr); return !(a && b && c); },
        draw() {
          const x = s.x.x, y = s.y.x, sc = 1 - 0.06 * s.pr.x;
          set(stem, 'x2', f2(100 + x));
          set(stem, 'y2', f2(100 + y));
          set(ng, 'transform', `translate(${f2(100 + x)} ${f2(100 + y)}) scale(${f3(sc)}) translate(-100 -100)`);
          nub.paint(s.pr.x * 0.8);
          shine(x / R, y / R);
        },
      };
      function aim(x, y) {
        const m = Math.hypot(x, y), k = m > R ? R / m : 1;
        s.x.t = x * k; s.y.t = y * k;
        wake(body);
      }
      const local = e => {
        const r = s.rect;
        return [((e.clientX - r.left) / r.width) * 200 - 100, ((e.clientY - r.top) / r.height) * 200 - 100];
      };
      joyEl.addEventListener('pointerdown', e => {
        if (s.pid != null || e.button > 0) return;
        s.pid = e.pointerId;
        try { joyEl.setPointerCapture(e.pointerId); } catch {}
        s.rect = joyEl.getBoundingClientRect();
        const [qx, qy] = local(e), onNub = Math.hypot(qx - s.x.x, qy - s.y.x) < 44;
        s.ox = onNub ? s.x.x - qx : 0; s.oy = onNub ? s.y.x - qy : 0;
        s.pr.t = 1; joyEl.classList.add('held');
        aim(qx + s.ox, qy + s.oy);
      });
      joyEl.addEventListener('pointermove', e => {
        if (e.pointerId !== s.pid) return;
        const [qx, qy] = local(e);
        aim(qx + s.ox, qy + s.oy);
      });
      // Let go off centre, the spring sings as the nub swings home.
      const boing = () => { const m = Math.hypot(s.x.x, s.y.x) / R; if (m > 0.2) snd.boing(m); };
      const up = e => {
        if (e.pointerId !== s.pid) return;
        s.pid = null; s.pr.t = 0; joyEl.classList.remove('held');
        if (!held.size) boing();
        steer();
      };
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => joyEl.addEventListener(t, up));
      const dirs = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }, held = new Set();
      function steer() {
        let dx = 0, dy = 0;
        held.forEach(k => { dx += dirs[k][0]; dy += dirs[k][1]; });
        const m = Math.hypot(dx, dy) || 1;
        s.keys = held.size;
        aim((dx / m) * R, (dy / m) * R);
      }
      joyEl.addEventListener('keydown', e => {
        if (dirs[e.key]) {
          e.preventDefault();
          if (!held.has(e.key) && s.pid == null) { held.add(e.key); steer(); }
        } else if (KEYS.includes(e.key)) {
          e.preventDefault();
          s.pr.t = 1; wake(body);
        }
      });
      joyEl.addEventListener('keyup', e => {
        if (held.delete(e.key)) {
          if (s.pid != null) return;
          if (!held.size) boing();
          steer();
        }
        else if (KEYS.includes(e.key)) { s.pr.t = 0; wake(body); }
      });
      joyEl.addEventListener('blur', () => {
        held.clear(); s.pr.t = 0;
        if (s.pid == null) steer();
      });
      moves.push({
        el: joyEl,
        // Shuffle kicks the nub at the rim; it knocks, then swings home.
        shuffle() {
          if (s.pid != null || held.size || reduce) return;
          const a = rnd(0, TAU), v = rnd(900, 1300);
          s.x.v += v * Math.cos(a); s.y.v += v * Math.sin(a);
          snd.boing(0.8);
          wake(body);
        },
      });
      return body;
    })());
    return { bodies, moves, destroy() { shine(0, 0); } };
  },
};
