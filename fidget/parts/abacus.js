import {
  NS, reduce, TAU, PI, D2R, R2D, clamp, lerp, mod, f2, f3, rnd, angDiff, KEYS, css, mixLch, ramp, C, TICK, BUTTER, el, set, nid, grad, DOWN, blur, LIGHT, svgIn, mat, skin, WELL, well, shine, wake, sleep, S, spring, rest, board, snd, BEZEL,
} from '../kit.js';

const MARKUP = `<div class="ctl abacus wide" id="abacus" tabindex="0" role="slider" aria-label="Abacus" aria-valuemin="0" aria-valuemax="5" aria-valuenow="0"></div>`;

export default {
  id: 'abacus', slot: 'band',
  mount(cell) {
    cell.insertAdjacentHTML('beforeend', MARKUP);
    const bodies = [], moves = [];
    let watch = null;
    // Five glossy beads on a steel rod between two steel posts.
    const abEl = document.getElementById('abacus');
    bodies.push((() => {
      const VH = 100, svg = svgIn(abEl, `0 0 600 ${VH}`), defs = svg.k.defs;
      const HW = 25, MU = 1500, E = 0.42;
      // The rod is a thin cylinder: lit along its top, dark beneath.
      const rod = el('rect', { y: 46.5, height: 7, rx: 3.5, fill: grad(defs, 'linearGradient', DOWN, [[0, css([0.62, 0.012, 255])], [0.35, css([0.96, 0.008, 255])], [1, css([0.42, 0.015, 260])]]).url }, svg);
      const posts = { o: 0.5, b: 3, y: 4 }, PM = mat(C.steel, 0);
      const postL = skin(svg, svg, 'rect', { x: 2, y: 8, width: 12, height: 84, rx: 6 }, PM, { rim: 2, shadow: posts });
      const postR = skin(svg, svg, 'rect', { y: 8, width: 12, height: 84, rx: 6 }, PM, { rim: 2, shadow: posts });
      void postL;
      // Beads are bicones seen side on: pointed rims, flat bores.
      const BEAD = 'M-25-5C-25-13-9-38 0-38S25-13 25-5V5C25 13 9 38 0 38S-25 13-25 5Z';
      const beads = ['coral', 'butter', 'mint', 'sky', 'lilac'].map(k => {
        const g = el('g', {}, svg);
        return { g, sk: skin(svg, g, 'path', { d: BEAD }, mat(C[k], 0.1), { rim: 2.5, shadow: { b: 3.5, y: 5, o: 0.55 } }) };
      });
      let VW = 600, L = 16, R = 584, MID = 300;
      const x = new Float64Array(5), v = new Float64Array(5);
      const lo = i => L + HW + i * 2 * HW, hi = i => R - HW - (4 - i) * 2 * HW;
      for (let i = 0; i < 5; i++) x[i] = lo(i);
      const s = { di: -1, T: 0, off: 0, pid: null, rect: null, pr: S(), n: 0 };
      // The rod follows the plate; each bead keeps its share of the travel.
      function fit() {
        const r = abEl.getBoundingClientRect();
        const span = hi(0) - lo(0), f = Array.from(x, (xi, i) => (span > 0 ? (xi - lo(i)) / span : 0));
        if (r.width > 0 && r.height > 0) VW = Math.max(340, Math.round((VH * r.width) / r.height));
        svg.setAttribute('viewBox', `0 0 ${VW} ${VH}`);
        L = 16; R = VW - 16; MID = VW / 2;
        set(rod, 'x', 8); set(rod, 'width', VW - 16);
        set(postR.shape, 'x', VW - 14);
        const ns = hi(0) - lo(0);
        for (let i = 0; i < 5; i++) { x[i] = lo(i) + clamp(f[i]) * ns; if (i !== s.di) v[i] = 0; }
        if (s.di >= 0) s.T = clamp(s.T, lo(s.di), hi(s.di));
        body.draw();
      }
      function contact() {
        // The frame posts stop the end beads with a duller knock.
        if (x[0] < L + HW) { if (v[0] < -40) snd.knock(clamp(-v[0] / 1400)); x[0] = L + HW; if (v[0] < 0) v[0] *= -0.3; }
        if (x[4] > R - HW) { if (v[4] > 40) snd.knock(clamp(v[4] / 1400)); x[4] = R - HW; if (v[4] > 0) v[4] *= -0.3; }
        for (let i = 0; i < 4; i++) {
          const j = i + 1, p = x[i] + 2 * HW - x[j];
          if (p <= 0) continue;
          if (i === s.di) x[j] += p;
          else if (j === s.di) x[i] -= p;
          else { x[i] -= p / 2; x[j] += p / 2; }
          const rv = v[i] - v[j];
          if (rv <= 0) continue;
          if (rv > 40) snd.clack(clamp(rv / 1400));
          // Equal beads trade speed; a held bead acts as a wall.
          if (i === s.di) v[j] = v[i] + E * rv;
          else if (j === s.di) v[i] = v[j] - E * rv;
          else { const m = (v[i] + v[j]) / 2, d = (E * rv) / 2; v[i] = m - d; v[j] = m + d; }
        }
      }
      const body = {
        step(h) {
          for (let i = 0; i < 5; i++) {
            if (i === s.di) {
              if (reduce) { x[i] = s.T; v[i] = 0; }
              else { v[i] += (1100 * (s.T - x[i]) - 60 * v[i]) * h; x[i] += v[i] * h; }
            } else if (v[i]) {
              // Rod friction is constant: beads glide, then stop dead.
              const dv = MU * h;
              v[i] = Math.abs(v[i]) <= dv ? 0 : v[i] - Math.sign(v[i]) * dv;
              x[i] += v[i] * h;
            }
          }
          for (let k = 0; k < 4; k++) contact();
          spring(s.pr, 900, 0.6, h);
        },
        busy() {
          let m = false;
          for (let i = 0; i < 5; i++) if (i !== s.di && v[i]) m = true;
          if (s.di >= 0) {
            if (Math.abs(x[s.di] - s.T) > 0.05 || Math.abs(v[s.di]) > 0.5) m = true;
            else v[s.di] = 0;
          }
          return m || !rest(s.pr);
        },
        draw() {
          let n = 0;
          beads.forEach((b, i) => {
            const sc = i === s.di ? 1 - 0.04 * s.pr.x : 1;
            set(b.g, 'transform', `translate(${f2(x[i])} 50) scale(${f3(sc)})`);
            b.sk.paint(i === s.di ? s.pr.x * 0.7 : 0);
            if (x[i] > MID) n++;
          });
          if (n !== s.n) { s.n = n; abEl.setAttribute('aria-valuenow', String(n)); }
        },
      };
      const local = e => ((e.clientX - s.rect.left) / s.rect.width) * VW;
      abEl.addEventListener('pointerdown', e => {
        if (s.pid != null || e.button > 0) return;
        s.rect = abEl.getBoundingClientRect();
        const q = local(e);
        let i = -1, best = HW + 14;
        for (let k = 0; k < 5; k++) { const d = Math.abs(x[k] - q); if (d < best) { best = d; i = k; } }
        if (i < 0) return;
        s.pid = e.pointerId;
        try { abEl.setPointerCapture(e.pointerId); } catch {}
        // The grabbed bead keeps its offset and its neighbours' room.
        s.di = i; s.off = x[i] - q; s.T = clamp(q + s.off, lo(i), hi(i));
        s.pr.t = 1; abEl.classList.add('held');
        wake(body);
      });
      abEl.addEventListener('pointermove', e => {
        if (e.pointerId !== s.pid) return;
        s.T = clamp(local(e) + s.off, lo(s.di), hi(s.di));
        wake(body);
      });
      const up = e => {
        if (e.pointerId !== s.pid) return;
        s.pid = null; s.pr.t = 0; abEl.classList.remove('held');
        // Let go mid-swipe, the bead keeps gliding.
        const i = s.di;
        s.di = -1;
        v[i] = reduce ? 0 : clamp(v[i], -2600, 2600);
        wake(body);
      };
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => abEl.addEventListener(t, up));
      // A flick just hard enough to reach the slot, then knock.
      function send(i, to) {
        const d = to - x[i];
        if (Math.abs(d) < 1) return;
        if (reduce) {
          x[i] = to; v[i] = 0;
          for (let k = 0; k < 4; k++) contact();
          snd.clack(0.5);
        } else v[i] = Math.sign(d) * Math.sqrt(2 * MU * Math.abs(d)) * 1.1;
      }
      const count = () => { let n = 0; for (let i = 0; i < 5; i++) if (x[i] > MID) n++; return n; };
      // The right-hand beads are always the last n.
      function settleTo(n) {
        for (let i = 0; i < 5; i++) {
          const right = i >= 5 - n;
          if (right && x[i] <= MID) send(i, hi(i));
          else if (!right && x[i] > MID) send(i, lo(i));
        }
        wake(body);
      }
      abEl.addEventListener('keydown', e => {
        if (s.pid != null) return;
        const n = count(), k = e.key;
        if ((k === 'ArrowRight' || k === 'ArrowUp' || k === 'PageUp') && n < 5) send(4 - n, hi(4 - n));
        else if ((k === 'ArrowLeft' || k === 'ArrowDown' || k === 'PageDown') && n > 0) send(5 - n, lo(5 - n));
        else if (k === 'Home') { for (let i = 0; i < 5; i++) if (x[i] > MID) send(i, lo(i)); }
        else if (k === 'End') { for (let i = 0; i < 5; i++) if (x[i] <= MID) send(i, hi(i)); }
        else if (!/^Arrow|^Page/.test(k)) return;
        e.preventDefault();
        wake(body);
      });
      moves.push({
        el: abEl,
        shuffle() { if (s.pid == null) settleTo(mod(count() + 1 + Math.floor(Math.random() * 5), 6)); },
        reset() { if (s.pid == null) settleTo(0); },
      });
      fit();
      watch = new ResizeObserver(fit);
      watch.observe(abEl);
      return body;
    })());
    return { bodies, moves, destroy() { watch.disconnect(); } };
  },
};
