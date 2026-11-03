import {
  reduce, clamp, f2, rnd, KEYS, css, C, el, set, blur, svgIn, mat, skin, wake, snd,
} from '../kit.js';

const MARKUP = `<div class="ctl slinky wide" id="slinky" tabindex="0" role="slider" aria-label="Slinky" aria-valuemin="20" aria-valuemax="200" aria-valuenow="100" aria-valuetext="At rest"></div>`;

export default {
  id: 'slinky', slot: 'band',
  css: `.p-slinky .slinky { border-radius: 10px; cursor: grab; }`,
  mount(cell) {
    cell.insertAdjacentHTML('beforeend', MARKUP);
    const bodies = [], moves = [];
    let watch = null;
    // A lilac coil clips to a steel post; its right end is free.
    const skEl = cell.querySelector('#slinky');
    bodies.push((() => {
      const VH = 100, svg = svgIn(skEl, `0 0 600 ${VH}`), defs = svg.k.defs;
      // Twenty turns between twenty-one nodes; node 0 holds the post.
      const N = 20, CY = 47, RY = 35, RX = 8, K4 = 4 / 3, PMIN = 4.2, X0 = 24;
      const shadow = el('rect', { y: 80, height: 9, rx: 4.5, fill: '#000', opacity: 0.5, filter: blur(defs, 3.5) }, svg);
      skin(svg, svg, 'rect', { x: 6, y: 6, width: 13, height: 86, rx: 6.5 }, mat(C.steel, 0), { rim: 2, shadow: { o: 0.5, b: 3, y: 4 } });
      // Back halves sit in shade; front halves catch the light.
      const L = C.lilac;
      const back = el('path', { fill: 'none', stroke: css([L[0] - 0.3, L[1] * 0.8, L[2]]), 'stroke-width': 3.4, 'stroke-linecap': 'round' }, svg);
      const front = el('path', { fill: 'none', stroke: css(L), 'stroke-width': 3.6, 'stroke-linecap': 'round' }, svg);
      const shine = el('path', { fill: 'none', stroke: '#fff', 'stroke-width': 1.2, 'stroke-linecap': 'round', opacity: 0.55, transform: 'translate(-0.8 -0.9)' }, svg);
      const x = new Float64Array(N + 1), v = new Float64Array(N + 1), home = new Float64Array(N + 1);
      let VW = 600, R = 580, L0 = 14;
      // Spring and damping per unit mass; the coil lies on the board.
      const KS = 2200, CR = 2.2, MU = 1.6;
      const s = { di: -1, T: 0, off: 0, pid: null, rect: null, mode: 'free', mv: 0, ma: 0, val: 100, laid: false };
      function setHome() { for (let i = 0; i <= N; i++) home[i] = X0 + i * L0; }
      // Reduced motion poses the coil at once, evenly up to the hand.
      function pose() {
        if (s.di < 0) { x.set(home); v.fill(0); return; }
        for (let i = 1; i <= N; i++) x[i] = i <= s.di ? X0 + ((s.T - X0) * i) / s.di : s.T + (i - s.di) * L0;
        v.fill(0);
      }
      // At rest the coil spans 45% of the band; the rest is stretch room.
      function fit() {
        const r = skEl.getBoundingClientRect();
        const span = L0 * N, f = Array.from(x, xi => (xi - X0) / span);
        if (r.width > 0 && r.height > 0) VW = Math.max(320, Math.round((VH * r.width) / r.height));
        svg.setAttribute('viewBox', `0 0 ${VW} ${VH}`);
        R = VW - 20; L0 = (0.45 * VW - X0) / N;
        setHome();
        // The first fit lays the coil at rest.
        if (!s.laid) { s.laid = true; x.set(home); }
        else for (let i = 0; i <= N; i++) { x[i] = X0 + f[i] * L0 * N; if (i !== s.di) v[i] = 0; }
        if (s.di >= 0) s.T = clamp(s.T, X0 + s.di * PMIN, R);
        body.draw();
      }
      // Touching turns clash and trade speed.
      // A held turn acts as a wall.
      function contact() {
        for (let i = 0; i < N; i++) {
          const j = i + 1, p = x[i] + PMIN - x[j];
          if (p <= 0) continue;
          const wall = i === 0 || i === s.di;
          if (wall) x[j] += p;
          else if (j === s.di) x[i] -= p;
          else { x[i] -= p / 2; x[j] += p / 2; }
          const rv = v[i] - v[j];
          if (rv <= 0) continue;
          if (rv > 30) tick(clamp(rv / 700));
          if (wall) v[j] = v[i] + 0.3 * rv;
          else if (j === s.di) v[i] = v[j] - 0.3 * rv;
          else { const m = (v[i] + v[j]) / 2, d = 0.15 * rv; v[i] = m - d; v[j] = m + d; }
        }
      }
      const body = {
        step(h) {
          if (reduce) { pose(); s.mv = s.ma = 0; return; }
          if (s.mode === 'home') {
            // Going home, the coil eases back without waves.
            const k = 1 - Math.exp(-9 * h);
            let ma = 0;
            for (let i = 1; i <= N; i++) { x[i] += (home[i] - x[i]) * k; v[i] = 0; ma = Math.max(ma, Math.abs(home[i] - x[i])); }
            s.mv = 0; s.ma = ma;
            return;
          }
          let mv = 0, ma = 0;
          for (let i = 1; i <= N; i++) {
            let a;
            if (i === s.di) a = 1100 * (s.T - x[i]) - 60 * v[i];
            else {
              // Each turn pulls toward its rest length on both sides.
              const dl = x[i] - x[i - 1] - L0, dr = i < N ? x[i + 1] - x[i] - L0 : 0;
              const vr = i < N ? v[i + 1] - v[i] : 0;
              a = KS * (dr - dl) + CR * (vr - (v[i] - v[i - 1])) - MU * v[i];
            }
            v[i] += a * h;
            ma = Math.max(ma, Math.abs(a));
          }
          for (let i = 1; i <= N; i++) { x[i] += v[i] * h; mv = Math.max(mv, Math.abs(v[i])); }
          for (let k = 0; k < 3; k++) contact();
          if (x[N] > R + 30) { x[N] = R + 30; if (v[N] > 0) v[N] *= -0.3; }
          s.mv = mv; s.ma = ma;
        },
        busy() {
          if (reduce) return false;
          if (s.mode === 'home') {
            if (s.ma > 0.05) return true;
            x.set(home); s.mode = 'free';
            return false;
          }
          if (s.mv > 0.4 || s.ma > 4) return true;
          // Let go and nearly still, the coil snaps to rest.
          if (s.di < 0) { x.set(home); v.fill(0); }
          else v.fill(0);
          return false;
        },
        draw() {
          // Each turn is a leaning loop: front half down, back half up.
          let fd = '', bd = '';
          const T = CY - RY, B = CY + RY, kx = K4 * RX;
          for (let i = 0; i < N; i++) {
            const a = x[i], m = (x[i] + x[i + 1]) / 2, b = x[i + 1];
            fd += `M${f2(a)} ${T}C${f2(a + kx)} ${T} ${f2(m + kx)} ${B} ${f2(m)} ${B}`;
            bd += `M${f2(m)} ${B}C${f2(m - kx)} ${B} ${f2(b - kx)} ${T} ${f2(b)} ${T}`;
          }
          set(front, 'd', fd); set(shine, 'd', fd); set(back, 'd', bd);
          set(shadow, 'x', f2(x[0] - 4)); set(shadow, 'width', f2(x[N] - x[0] + 14));
          const val = Math.round(((x[N] - X0) / (L0 * N)) * 100);
          if (val !== s.val) {
            s.val = val;
            skEl.setAttribute('aria-valuenow', String(clamp(val, 20, 200)));
            skEl.setAttribute('aria-valuetext', val > 104 ? `Stretched to ${val}%` : val < 96 ? `Squashed to ${val}%` : 'At rest');
          }
        },
      };
      // Clashing turns shimmer: a bright tick and two thin metal rings.
      function tick(g) {
        snd.play('slinky', 0.025, 0.06, (t, P, G) => {
          G *= g;
          snd.hiss(t, 'highpass', 6800 * P, 0.7, 0.004, 0.14 * G);
          snd.ring(t, rnd(3000, 3800) * P, 3000 * P, 0.05, 0.03 * G);
          snd.ring(t, rnd(5000, 5800) * P, 5000 * P, 0.035, 0.02 * G);
        });
      }
      const local = e => ((e.clientX - s.rect.left) / s.rect.width) * VW;
      skEl.addEventListener('pointerdown', e => {
        if (s.pid != null || e.button > 0) return;
        s.rect = skEl.getBoundingClientRect();
        const q = local(e);
        // The free end grabs first; otherwise the nearest turn does.
        let i = N;
        if (q < x[N] - 3 * L0) {
          let best = Infinity;
          for (let k = 1; k <= N; k++) { const d = Math.abs(x[k] - q); if (d < best) { best = d; i = k; } }
        }
        s.pid = e.pointerId;
        try { skEl.setPointerCapture(e.pointerId); } catch {}
        // A press past the end pulls the end to the finger.
        s.di = i; s.mode = 'free'; s.off = q > x[N] + 10 ? 0 : x[i] - q; s.T = clamp(q + s.off, X0 + i * PMIN, R);
        skEl.classList.add('held');
        wake(body);
      });
      skEl.addEventListener('pointermove', e => {
        if (e.pointerId !== s.pid) return;
        s.T = clamp(local(e) + s.off, X0 + s.di * PMIN, R);
        wake(body);
      });
      const up = e => {
        if (e.pointerId !== s.pid) return;
        s.pid = null; skEl.classList.remove('held');
        // Let go, the turn keeps its speed and the waves run free.
        const i = s.di;
        s.di = -1;
        v[i] = reduce ? 0 : clamp(v[i], -2400, 2400);
        if (reduce) s.mode = 'home';
        wake(body);
      };
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => skEl.addEventListener(t, up));
      // A yank throws the free end; speed scales with the turn length.
      function yank(dir, k = rnd(0.8, 1.4)) {
        if (s.pid != null) return;
        if (reduce) { tick(0.5); return; }
        s.mode = 'free';
        v[N] += dir * k * 60 * L0;
        wake(body);
      }
      function settle() {
        if (s.pid != null) return;
        s.mode = 'home';
        wake(body);
      }
      skEl.addEventListener('keydown', e => {
        const d = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
        if (d) yank(d, 0.7);
        else if (KEYS.includes(e.key)) yank(e.shiftKey ? -1 : 1);
        else if (e.key === 'Home') settle();
        else return;
        e.preventDefault();
      });
      moves.push({
        el: skEl,
        shuffle() { yank(Math.random() < 0.6 ? 1 : -1); },
        reset() { settle(); },
      });
      fit();
      watch = new ResizeObserver(fit);
      watch.observe(skEl);
      return body;
    })());
    return { bodies, moves, destroy() { watch.disconnect(); } };
  },
};
