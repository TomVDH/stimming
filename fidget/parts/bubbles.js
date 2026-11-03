import {
  reduce, TAU, clamp, f2, f3, rnd, KEYS, css, el, set, grad, blur, svgIn, wake, S, spring, rest, snd,
} from '../kit.js';

// Two rows of six; hit buttons sit over each drawn bubble.
const COLS = 6, ROWS = 2, P = 90, VW = 570, VH = 210, HR = 40;
const at = i => [60 + (i % COLS) * P, 60 + Math.floor(i / COLS) * P];
const pct = (v, n) => f3((v / n) * 100) + '%';
const HITS = Array.from({ length: COLS * ROWS }, (_, i) => {
  const [x, y] = at(i);
  return `<button class="bub" type="button" aria-pressed="false" aria-label="Bubble ${i + 1}" style="left:${pct(x - HR, VW)};top:${pct(y - HR, VH)};width:${pct(2 * HR, VW)};height:${pct(2 * HR, VH)}"></button>`;
}).join('');
const MARKUP = `<div class="grp"><div class="ctl bwrap" id="bubbles" role="group" aria-label="Bubble wrap">${HITS}</div></div>`;

export default {
  id: 'bubbles', slot: 'row',
  css: `.p-bubbles .grp { --sr: ${f3(VW / VH)}; }
.p-bubbles .bwrap { --ar: ${VW} / ${VH}; border-radius: 16px; cursor: default; }
.p-bubbles .bwrap svg { position: absolute; inset: 0; pointer-events: none; }
.p-bubbles .bub { position: absolute; z-index: 1; margin: 0; padding: 0; border: 0; background: none; border-radius: 50%; cursor: pointer; touch-action: none; -webkit-tap-highlight-color: transparent; }
.p-bubbles .bub:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }`,
  mount(cell) {
    cell.insertAdjacentHTML('beforeend', MARKUP);
    const bodies = [], moves = [], timers = new Set();
    const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); };
    // A sheet of tinted film carries glassy domes.
    const wrapEl = document.getElementById('bubbles');
    const svg = svgIn(wrapEl, `0 0 ${VW} ${VH}`), defs = svg.k.defs;
    const soft = blur(defs, 4), FILM = css([0.84, 0.05, 232]);
    el('rect', { x: 4, y: 7, width: VW - 8, height: VH - 8, rx: 16, fill: '#000', opacity: 0.3, filter: blur(defs, 3) }, svg);
    el('rect', { x: 4, y: 4, width: VW - 8, height: VH - 8, rx: 16, fill: FILM, 'fill-opacity': 0.13, stroke: '#fff', 'stroke-opacity': 0.2, 'stroke-width': 1.5 }, svg);
    el('rect', { x: 4, y: 4, width: VW - 8, height: VH - 8, rx: 16, fill: svg.k.sheen, opacity: 0.35 }, svg);
    // The dome is clear at its crown and denser at its edge.
    const dome = grad(defs, 'radialGradient', { cx: 0.4, cy: 0.36, r: 0.66 }, [
      [0, css([0.97, 0.03, 220]), 0.5], [0.55, css([0.82, 0.07, 235]), 0.26], [0.88, css([0.66, 0.1, 245]), 0.55], [1, css([0.56, 0.1, 250]), 0.8],
    ]).url;
    // The pop: a sharp snap, a bright crack and a low thud.
    const pop = k => snd.play('pop', 0.018, 0.08, (t, Pj, G) => {
      snd.hiss(t, 'highpass', 2600 * k * Pj, 0.7, 0.012, 0.5 * G);
      snd.hiss(t, 'bandpass', 1200 * k * Pj, 1.2, 0.028, 0.28 * G);
      snd.ring(t, 760 * k * Pj, 380 * k * Pj, 0.035, 0.1 * G);
      snd.ring(t, 170 * k, 90 * k, 0.05, 0.24 * G);
    });
    // The squeeze: a small rubbery squeak.
    const squeak = k => snd.play('squeak', 0.04, 0.1, (t, Pj, G) => {
      snd.ring(t, 520 * k * Pj, 720 * k * Pj, 0.09, 0.03 * G, 'triangle');
    });
    // A popped bubble crinkles under the finger.
    const crinkle = () => snd.play('crinkle', 0.05, 0.05, (t, Pj, G) => {
      for (let j = 0; j < 3; j++) snd.hiss(t + j * rnd(0.006, 0.014), 'bandpass', rnd(3600, 5600) * Pj, 1.5, 0.008, 0.12 * G);
    });
    // Air fills the dome with a soft rising puff.
    const puff = k => snd.play('puff', 0.025, 0.14, (t, Pj, G) => {
      snd.rise(t, 400 * k * Pj, 1600 * k * Pj, 0.12, 0.07 * G);
      snd.ring(t, 300 * k, 520 * k, 0.12, 0.025 * G);
    });

    wrapEl.querySelectorAll('.bub').forEach((btn, i) => {
      const [cx, cy] = at(i), k = rnd(0.82, 1.24), g = el('g', { transform: `translate(${cx} ${cy})` }, svg);
      const sh = el('ellipse', { cx: 0, cy: 6, rx: 35, ry: 32, fill: '#000', opacity: 0.35, filter: soft }, g);
      // The seal ring marks where the dome bonds to the sheet.
      el('circle', { r: 39, fill: 'none', stroke: '#fff', 'stroke-opacity': 0.12, 'stroke-width': 2 }, g);
      // The crumple is a jagged flat skin with a few creases.
      const cg = el('g', { opacity: 0 }, g);
      let d = '';
      for (let j = 0; j < 14; j++) {
        const a = (j / 14) * TAU + rnd(-0.12, 0.12), r = rnd(28, 37);
        d += `${j ? 'L' : 'M'}${f2(r * Math.cos(a))} ${f2(r * Math.sin(a))}`;
      }
      el('path', { d: d + 'Z', fill: FILM, 'fill-opacity': 0.3, stroke: '#fff', 'stroke-opacity': 0.28, 'stroke-width': 1.5, 'stroke-linejoin': 'round' }, cg);
      for (let j = 0; j < 4; j++) {
        const a = rnd(0, TAU), r0 = rnd(2, 12), r1 = rnd(20, 32), b = a + rnd(-0.5, 0.5);
        const c = { x1: f2(r0 * Math.cos(a)), y1: f2(r0 * Math.sin(a)), x2: f2(r1 * Math.cos(b)), y2: f2(r1 * Math.sin(b)), 'stroke-linecap': 'round' };
        el('line', { ...c, stroke: '#000', 'stroke-opacity': 0.28, 'stroke-width': 2 }, cg);
        el('line', { ...c, stroke: '#fff', 'stroke-opacity': 0.4, 'stroke-width': 1, transform: 'translate(0.8 1)' }, cg);
      }
      const dg = el('g', {}, g);
      el('circle', { r: 36, fill: dome }, dg);
      el('circle', { r: 36, fill: svg.k.sheen, opacity: 0.7 }, dg);
      el('circle', { r: 35, fill: 'none', stroke: svg.k.rim, 'stroke-width': 3 }, dg);
      const hi = el('ellipse', { rx: 10, ry: 6, fill: '#fff', opacity: 0.8, transform: 'translate(-13 -14) rotate(-40)' }, dg);
      el('circle', { cx: 14, cy: 16, r: 2.5, fill: '#fff', opacity: 0.35 }, dg);
      const ring = el('circle', { r: 38, fill: 'none', stroke: '#fff', opacity: 0 }, g);

      // q squashes the dome, f flattens it, w jiggles the crumple.
      const s = { q: S(), f: S(), w: S(), b: 0, held: false, popped: false, pid: null, kb: false, keyAt: 0 };
      const body = {
        step(h) {
          spring(s.q, 260, 0.85, h);
          spring(s.f, 260, 0.38, h);
          spring(s.w, 700, 0.28, h);
          if (s.b) s.b = s.b < 0.01 ? 0 : s.b * Math.exp(-10 * h);
          // Held long enough, the dome gives way.
          if (s.held && !s.popped && s.q.x > 0.92) burst();
        },
        busy() { const a = rest(s.q), b = rest(s.f), c = rest(s.w); return !(a && b && c) || s.b > 0; },
        draw() {
          const q = s.q.x, f = s.f.x, gr = Math.max(0.001, 1 - f);
          set(dg, 'transform', `translate(0 ${f2(4 * q)}) scale(${f3(gr * (1 + 0.09 * q))} ${f3(gr * (1 - 0.12 * q))})`);
          set(dg, 'opacity', f3(clamp(1.6 * (1 - f))));
          set(hi, 'opacity', f3(0.8 - 0.4 * q));
          set(sh, 'opacity', f3(0.35 * clamp(1 - f) * (1 - 0.4 * q)));
          set(cg, 'opacity', f3(clamp(f)));
          set(cg, 'transform', `scale(${f3(1 + 0.22 * s.w.x)})`);
          set(ring, 'opacity', f3(0.6 * s.b));
          set(ring, 'r', f2(38 + 24 * (1 - s.b)));
          set(ring, 'stroke-width', f2(3 * s.b));
        },
      };
      function burst() {
        s.popped = true; s.q.t = 0; s.q.x = 0; s.q.v = 0;
        // The dome vanishes at once; the crumple jumps in and wobbles.
        s.f.x = s.f.t = 1; s.f.v = 0;
        s.w.x = 1; s.w.t = 0; s.w.v = 0;
        s.b = reduce ? 0 : 1;
        pop(k);
        btn.setAttribute('aria-pressed', 'true');
        btn.setAttribute('aria-label', `Bubble ${i + 1}, popped`);
      }
      function inflate() {
        if (!s.popped) return;
        s.popped = false; s.f.t = 0;
        puff(k);
        btn.setAttribute('aria-pressed', 'false');
        btn.setAttribute('aria-label', `Bubble ${i + 1}`);
        wake(body);
      }
      function press() {
        s.held = true;
        if (s.popped) { crinkle(); s.w.v = 6; }
        else { s.q.t = 1; squeak(k); }
        wake(body);
      }
      function release() { s.held = false; if (!s.popped) s.q.t = 0; wake(body); }
      btn.addEventListener('pointerdown', e => {
        if (s.pid != null || s.kb || e.button > 0) return;
        s.pid = e.pointerId;
        try { btn.setPointerCapture(e.pointerId); } catch {}
        press();
      });
      const up = e => { if (e.pointerId === s.pid) { s.pid = null; release(); } };
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => btn.addEventListener(t, up));
      btn.addEventListener('keydown', e => {
        if (!KEYS.includes(e.key)) return;
        e.preventDefault();
        if (!e.repeat && !s.kb && s.pid == null) { s.kb = true; press(); }
      });
      btn.addEventListener('keyup', e => {
        if (!KEYS.includes(e.key) || !s.kb) return;
        e.preventDefault();
        s.kb = false; s.keyAt = performance.now();
        release();
      });
      btn.addEventListener('blur', () => { if (s.kb) { s.kb = false; release(); } });
      // Assistive tech clicks without key events; they get a full press.
      const tap = () => { if (s.held || s.kb || s.pid != null) return; press(); later(release, 260); };
      btn.addEventListener('click', e => {
        if (e.detail !== 0 || performance.now() - s.keyAt < 300) return;
        tap();
      });
      moves.push({
        el: btn,
        // Shuffle pops about a third; now and then a flat one refills.
        shuffle() {
          if (s.held || s.pid != null) return;
          if (!s.popped && Math.random() < 0.3) tap();
          else if (s.popped && Math.random() < 0.15) inflate();
        },
        // The reset wave refills each flat bubble in turn.
        reset() { if (!s.held && s.pid == null) inflate(); },
      });
      bodies.push(body);
    });
    return { bodies, moves, destroy() { timers.forEach(clearTimeout); timers.clear(); } };
  },
};
