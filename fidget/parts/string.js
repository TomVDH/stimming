import {
  reduce, PI, clamp, f2, f3, rnd, KEYS, css, TICK, BUTTER, el, set, blur, svgIn, mat, skin, well, C, wake, S, spring, rest, snd,
} from '../kit.js';

const MARKUP = `<div class="ctl gstring wide" id="string" tabindex="0" role="slider" aria-label="String. Arrows pick a note, Space plucks." aria-valuemin="1" aria-valuemax="10" aria-valuenow="5"></div>`;

// Ten zones run low to high: two octaves of a minor pentatonic.
const RAT = [1, 6 / 5, 4 / 3, 3 / 2, 9 / 5, 2, 12 / 5, 8 / 3, 3, 18 / 5], F0 = 110, NZ = RAT.length;

export default {
  id: 'string', slot: 'band',
  css: `.p-string .gstring { border-radius: 10px; cursor: grab; }`,
  mount(cell) {
    cell.insertAdjacentHTML('beforeend', MARKUP);
    const bodies = [], moves = [];
    let watch = null;
    // A wound string runs between two steel bridges over a sunk channel.
    const stEl = document.getElementById('string');
    bodies.push((() => {
      const VH = 110, Y = 52, MAX = 24, K = 48, NM = 4, svg = svgIn(stEl, `0 0 600 ${VH}`), defs = svg.k.defs;
      const chan = well(svg, svg, 'rect', { x: 8, y: 22, width: 584, height: 60, rx: 14 }, { rim: 4 });
      const base = el('g', { stroke: TICK, 'stroke-width': 5, 'stroke-linecap': 'round' }, svg);
      const litg = el('g', { stroke: BUTTER, 'stroke-width': 5, 'stroke-linecap': 'round' }, svg);
      const ticks = RAT.map(() => [el('line', { y1: 94, y2: 104 }, base), el('line', { y1: 94, y2: 104, opacity: 0 }, litg)]);
      const STR = css([0.66, 0.05, 78]);
      const shadow = el('path', { fill: 'none', stroke: '#000', 'stroke-width': 5, opacity: 0.5, filter: blur(defs, 2.5), transform: 'translate(0 8)' }, svg);
      const PM = mat(C.steel, 0), posts = { b: 3, y: 4, o: 0.5 };
      const bl = skin(svg, svg, 'rect', { y: 14, width: 14, height: 76, rx: 5 }, PM, { rim: 2, shadow: posts });
      const br = skin(svg, svg, 'rect', { y: 14, width: 14, height: 76, rx: 5 }, PM, { rim: 2, shadow: posts });
      // The blur lens shows the swing too fast for the eye.
      const lens = el('path', { fill: STR, opacity: 0 }, svg);
      const core = el('path', { fill: 'none', stroke: STR, 'stroke-width': 4.2, 'stroke-linejoin': 'round' }, svg);
      const wind = el('path', { fill: 'none', stroke: css([0.9, 0.05, 86]), 'stroke-width': 3.4, 'stroke-dasharray': '1.4 1.2', 'stroke-linejoin': 'round' }, svg);
      const gleam = el('path', { fill: 'none', stroke: '#fff', 'stroke-width': 1, opacity: 0.55, transform: 'translate(0 -1)' }, svg);
      let VW = 600, L = 34, RX = 566;
      // A holds mode amplitudes; ph holds their phases.
      const A = new Float64Array(NM + 1), ph = new Float64Array(NM + 1);
      const s = { g: false, gu: 0.5, d: S(), om: 0, damp: false, lit: new Float64Array(NZ), sel: 4, pid: null, rect: null, ly: 0 };
      const zone = u => clamp(Math.floor(u * NZ), 0, NZ - 1);
      function fit() {
        const r = stEl.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) VW = Math.max(320, Math.round((VH * r.width) / r.height));
        svg.setAttribute('viewBox', `0 0 ${VW} ${VH}`);
        L = 34; RX = VW - 34;
        set(chan, 'width', VW - 16);
        set(bl.shape, 'x', L - 7); set(br.shape, 'x', RX - 7);
        // Each tick marks the middle of its note zone.
        ticks.forEach(([b, l], i) => { const x = f2(L + ((i + 0.5) / NZ) * (RX - L)); for (const m of [b, l]) { set(m, 'x1', x); set(m, 'x2', x); } });
        body.draw();
      }
      // The displacement at one point along the string.
      function at(u) {
        if (s.g) return s.d.x * (u < s.gu ? u / s.gu : (1 - u) / (1 - s.gu));
        let y = 0;
        for (let n = 1; n <= NM; n++) if (A[n]) y += A[n] * Math.sin(n * PI * u) * Math.cos(ph[n]);
        return y;
      }
      // A rounded pluck: harmonics fall by pick position.
      const pluck = (f, v, u) => snd.play('pluck', 0.02, 1.6, (t, P, G) => {
        G *= 0.3 + 0.7 * v;
        snd.hiss(t, 'bandpass', 2800 * P, 1.1, 0.01, 0.22 * G);
        snd.hiss(t, 'lowpass', f * 6, 0.7, 0.05, 0.12 * G);
        for (let n = 1; n <= 5; n++) {
          const w = Math.abs(Math.sin(n * PI * u)) / n + 0.08, fn = f * n * (1 + 0.0015 * n);
          snd.ring(t, fn, fn * 0.997, 1.6 / (0.6 + 0.4 * n), 0.13 * G * w, n === 1 ? 'triangle' : 'sine');
        }
      });
      // A finger on a ringing string: a dull damped thud.
      const mute = v => snd.play('mute', 0.04, 0.05, (t, P, G) => {
        snd.hiss(t, 'lowpass', 900 * P, 0.8, 0.04, 0.22 * G * v);
        snd.ring(t, 95 * P, 80 * P, 0.04, 0.12 * G * v);
      });
      const swing = () => { let m = 0; for (let n = 1; n <= NM; n++) m += Math.abs(A[n]); return m; };
      function grab(u, y) {
        const m = swing();
        if (m > 3) mute(clamp(m / MAX));
        A.fill(0); s.damp = false;
        s.g = true; s.gu = clamp(u, 0.04, 0.96);
        s.d.x = clamp(y, -MAX, MAX); s.d.v = 0; s.d.t = s.d.x;
        stEl.classList.add('held');
        wake(body);
      }
      // A triangle of height h at p splits into sine modes.
      function release(h = s.d.x, u = s.gu) {
        s.g = false; stEl.classList.remove('held');
        const v = Math.abs(h) / MAX, i = zone(u);
        if (v < 0.04) { A.fill(0); wake(body); return; }
        for (let n = 1; n <= NM; n++) {
          A[n] = reduce ? 0 : (2 * h * Math.sin(n * PI * u)) / (n * n * PI * PI * u * (1 - u));
          ph[n] = 0;
        }
        // The eye sees 12 Hz, a little higher for high notes.
        s.om = 2 * PI * 12 * Math.sqrt(RAT[i]);
        s.lit[i] = 1; s.sel = i;
        stEl.setAttribute('aria-valuenow', String(i + 1));
        pluck(F0 * RAT[i], clamp(v), u);
        wake(body);
      }
      const body = {
        step(h) {
          if (s.g) spring(s.d, 1800, 0.8, h);
          // Higher modes die faster; a damping hand kills all fast.
          for (let n = 1; n <= NM; n++) {
            if (!A[n]) continue;
            A[n] *= Math.exp(-h * (s.damp ? 16 : 0.75 * n));
            ph[n] += n * s.om * h;
            if (Math.abs(A[n]) < 0.02) A[n] = 0;
          }
          for (let i = 0; i < NZ; i++) if (s.lit[i]) s.lit[i] = s.lit[i] < 0.01 ? 0 : s.lit[i] * Math.exp(-(s.damp ? 10 : 1.4) * h);
          if (s.damp && !swing()) s.damp = false;
        },
        busy() { return (s.g && !rest(s.d, 0.02)) || swing() > 0 || s.lit.some(v => v > 0); },
        draw() {
          const span = RX - L;
          let d = '', up = '', dn = '', env = 0;
          for (let k = 0; k <= K; k++) {
            const u = k / K, x = f2(L + u * span), y = f2(Y + at(u));
            d += `${k ? 'L' : 'M'}${x} ${y}`;
            if (!s.g) {
              let e = 0;
              for (let n = 1; n <= NM; n++) e += Math.abs(A[n] * Math.sin(n * PI * u));
              env = Math.max(env, e);
              up += `${k ? 'L' : 'M'}${x} ${f2(Y - e)}`;
              dn = `L${x} ${f2(Y + e)}` + dn;
            }
          }
          for (const p of [shadow, core, wind, gleam]) set(p, 'd', d);
          set(lens, 'd', env > 0.2 ? up + dn + 'Z' : '');
          set(lens, 'opacity', f3(0.22 * clamp(env / 8)));
          ticks.forEach(([, m], i) => set(m, 'opacity', f3(s.lit[i])));
        },
      };
      const local = e => [((e.clientX - s.rect.left) / s.rect.width) * VW, ((e.clientY - s.rect.top) / s.rect.height) * VH];
      stEl.addEventListener('pointerdown', e => {
        if (s.pid != null || e.button > 0) return;
        s.pid = e.pointerId;
        try { stEl.setPointerCapture(e.pointerId); } catch {}
        s.rect = stEl.getBoundingClientRect();
        const [x, y] = local(e), u = (x - L) / (RX - L);
        s.ly = y - Y;
        // A press near the string grabs it; elsewhere waits for a strum.
        if (u > 0 && u < 1 && Math.abs(y - Y - at(u)) < 16) grab(u, y - Y);
      });
      stEl.addEventListener('pointermove', e => {
        if (e.pointerId !== s.pid) return;
        const [x, y] = local(e), dy = y - Y, u = (x - L) / (RX - L);
        if (s.g) {
          s.d.t = clamp(dy, -MAX, MAX);
          // Pulled too far, the string slips off the finger.
          if (Math.abs(dy) > MAX + 6) release(Math.sign(dy) * MAX);
          wake(body);
        } else if (u > 0 && u < 1 && (Math.sign(dy) !== Math.sign(s.ly) || Math.abs(dy) < 3)) {
          // A finger that crosses the string catches it.
          grab(u, 0);
          s.d.t = clamp(dy, -MAX, MAX);
        }
        s.ly = dy;
      });
      const up = e => {
        if (e.pointerId !== s.pid) return;
        s.pid = null;
        if (s.g) release();
      };
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => stEl.addEventListener(t, up));
      // Arrows pick a zone with a soft pluck; Space plucks it hard.
      const zoneU = i => (i + 0.5) / NZ;
      stEl.addEventListener('keydown', e => {
        if (s.pid != null) return;
        const d = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
        let i = s.sel, h = 0.4 * MAX;
        if (d) i = clamp(s.sel + d, 0, NZ - 1);
        else if (e.key === 'Home') i = 0;
        else if (e.key === 'End') i = NZ - 1;
        else if (KEYS.includes(e.key)) h = 0.8 * MAX;
        else return;
        e.preventDefault();
        if (e.repeat && !d) return;
        release(h, zoneU(i));
      });
      moves.push({
        el: stEl,
        shuffle() { if (s.pid == null) release((Math.random() < 0.5 ? -1 : 1) * rnd(12, MAX), rnd(0.06, 0.94)); },
        reset() {
          if (s.pid != null) return;
          const m = swing();
          if (m > 1) mute(clamp(m / MAX));
          s.damp = true;
          wake(body);
        },
      });
      fit();
      watch = new ResizeObserver(fit);
      watch.observe(stEl);
      return body;
    })());
    return { bodies, moves, destroy() { watch.disconnect(); } };
  },
};
