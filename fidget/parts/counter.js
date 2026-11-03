import {
  reduce, clamp, mod, f2, KEYS, css, C, el, set, nid, grad, DOWN, svgIn, mat, skin, well, wake, S, spring, rest, snd,
} from '../kit.js';

const MARKUP = `<div class="grp"><div class="ctl counter" id="counter" role="group" aria-label="Tally counter"><button class="hit" type="button" aria-label="Count, 0000"></button><button class="hit knob" type="button" aria-label="Zero the counter"></button></div></div>`;

export default {
  id: 'counter', slot: 'small',
  css: `.p-counter .grp { --sr: 0.7927; }
.p-counter .counter { --ar: 130 / 164; border-radius: 40%; }
.p-counter .hit { position: absolute; inset: 0; margin: 0; padding: 0; border: 0; background: none; border-radius: inherit; pointer-events: none; }
.p-counter .hit.knob { inset: 37% 0 50% 83%; border-radius: 50%; }
.p-counter .hit:focus-visible { outline: 2px solid var(--focus); outline-offset: 4px; }`,
  mount(cell) {
    cell.insertAdjacentHTML('beforeend', MARKUP);
    const bodies = [], moves = [], timers = [];
    // A chrome body, four digit drums, a plunger and a side knob.
    const ctEl = cell.querySelector('#counter');
    const [countBtn, knobBtn] = ctEl.querySelectorAll('button');
    bodies.push((() => {
      const svg = svgIn(ctEl, '0 0 130 164'), defs = svg.k.defs;
      const STEEL = mat(C.steel, 0.1), DARK = css([0.42, 0.015, 258]);
      // The finger ring hangs below the body.
      el('circle', { cx: 65, cy: 151, r: 9, fill: 'none', stroke: css([0.62, 0.012, 255]), 'stroke-width': 3.6 }, svg);
      // The plunger: a stem under a dished cap; both sink together.
      const pg = el('g', {}, svg);
      el('rect', { x: 57, y: 18, width: 16, height: 34, rx: 3, fill: grad(defs, 'linearGradient', { x1: 0, y1: 0, x2: 1, y2: 0 }, [[0, css([0.5, 0.012, 258])], [0.35, css([0.92, 0.008, 255])], [1, css([0.45, 0.015, 258])]]).url }, pg);
      const capSk = skin(svg, pg, 'rect', { x: 37, y: 4, width: 56, height: 18, rx: 9 }, STEEL, { rim: 2, shadow: { b: 2.5, y: 3, o: 0.55 } });
      el('rect', { x: 45, y: 7, width: 40, height: 6, rx: 3, fill: '#fff', opacity: 0.4 }, pg);
      // The side knob: a short stem and a knurled steel button.
      el('rect', { x: 108, y: 67, width: 10, height: 8, fill: DARK }, svg);
      const kg = el('g', {}, svg);
      skin(svg, kg, 'circle', { cx: 0, cy: 0, r: 9 }, STEEL, { rim: 2, shadow: { b: 2, y: 2.5, o: 0.5 } });
      const knurl = el('g', { stroke: DARK, 'stroke-width': 1.2, 'stroke-linecap': 'round', opacity: 0.7 }, kg);
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        el('line', { x1: f2(5 * Math.cos(a)), y1: f2(5 * Math.sin(a)), x2: f2(8 * Math.cos(a)), y2: f2(8 * Math.sin(a)) }, knurl);
      }
      set(kg, 'transform', 'translate(119 71)');
      // The body is round chrome with bright and dark reflection bands.
      skin(svg, svg, 'circle', { cx: 65, cy: 96, r: 54 }, mat(C.steel, 0), { rim: 3, shadow: { b: 6, y: 8, o: 0.6 } });
      el('circle', { cx: 65, cy: 96, r: 51, fill: grad(defs, 'linearGradient', DOWN, [[0, '#fff', 0.35], [0.38, '#fff', 0.05], [0.46, '#000', 0.22], [0.6, '#fff', 0.2], [1, '#000', 0.1]]).url }, svg);
      el('circle', { cx: 65, cy: 96, r: 44, fill: 'none', stroke: '#000', 'stroke-opacity': 0.12, 'stroke-width': 1.5 }, svg);
      // The window holds four drums behind one recess.
      well(svg, svg, 'rect', { x: 23, y: 81, width: 84, height: 32, rx: 6 }, { rim: 3 });
      const DH = 22, DY = 97, cols = [], ink = css([0.3, 0.03, 265]);
      for (let k = 0; k < 4; k++) {
        // Drum 0 holds the units; it sits rightmost.
        const x = 27 + (3 - k) * 19.5, id = nid('d');
        const clip = el('clipPath', { id }, defs);
        el('rect', { x, y: 84, width: 17, height: 26, rx: 3 }, clip);
        const g = el('g', { 'clip-path': `url(#${id})` }, svg);
        el('rect', { x, y: 84, width: 17, height: 26, fill: css(C.cream) }, g);
        const col = el('g', { fill: ink, 'font-family': 'Gabarito, system-ui, sans-serif', 'font-weight': 700, 'font-size': 17, 'text-anchor': 'middle' }, g);
        // Extra digits at both ends let the rolls wrap.
        for (let n = -1; n <= 11; n++) el('text', { x: f2(x + 8.5), y: f2(DY + 6 + n * DH) }, col).textContent = String(mod(n, 10));
        // The drum curves away at top and bottom.
        el('rect', { x, y: 84, width: 17, height: 26, fill: grad(defs, 'linearGradient', DOWN, [[0, '#000', 0.55], [0.3, '#000', 0], [0.7, '#000', 0], [1, '#000', 0.6]]).url }, g);
        cols.push({ col, d: S(), wait: -1, next: 0 });
      }
      el('rect', { x: 25, y: 96.5, width: 80, height: 1, fill: '#fff', opacity: 0.25 }, svg);
      const s = { p: S(), kn: S(), pid: null, kb: false, keyAt: 0, whirr: false };
      const body = {
        step(h) {
          // A firm plunge and a springy return with a small overshoot.
          spring(s.p, s.p.t ? 2200 : 900, s.p.t ? 0.75 : 0.4, h);
          spring(s.kn, 300, 0.7, h);
          for (const c of cols) {
            // A waiting carry starts its roll once its delay runs out.
            if (c.wait >= 0) { c.wait -= h; if (c.wait < 0) c.d.t = c.next; }
            if (s.whirr) spring(c.d, 260, 0.85, h);
            else spring(c.d, 800, 0.5, h);
          }
        },
        busy() {
          const a = rest(s.p), k = rest(s.kn);
          let b = !(a && k);
          for (const c of cols) if (c.wait >= 0 || !rest(c.d, 2e-3)) b = true;
          if (!b) s.whirr = false;
          return b;
        },
        draw() {
          set(pg, 'transform', `translate(0 ${f2(9 * s.p.x)})`);
          capSk.paint(clamp(s.p.x) * 0.6);
          set(kg, 'transform', `translate(119 71) rotate(${f2(s.kn.x * 360)})`);
          for (const c of cols) set(c.col, 'transform', `translate(0 ${f2(-mod(c.d.x, 10) * DH)})`);
        },
      };
      const value = () => cols.reduce((a, c, k) => a + mod(Math.round(c.wait >= 0 ? c.next : c.d.t), 10) * 10 ** k, 0);
      const label = () => countBtn.setAttribute('aria-label', `Count, ${String(value()).padStart(4, '0')}`);
      // A crisp clack: a bright snap over a small low knock.
      const clack = () => snd.play('tally', 0.02, 0.08, (t, P, G) => {
        snd.hiss(t, 'bandpass', 3800 * P, 1.6, 0.006, 0.45 * G);
        snd.hiss(t + 0.004, 'highpass', 6500 * P, 0.7, 0.003, 0.2 * G);
        snd.ring(t, 1900 * P, 1850 * P, 0.03, 0.05 * G);
        snd.ring(t, 170 * P, 120 * P, 0.045, 0.25 * G);
      });
      const lift = () => snd.play('tallyup', 0.02, 0.04, (t, P, G) => {
        snd.hiss(t, 'bandpass', 2600 * P, 1.3, 0.008, 0.14 * G);
        snd.ring(t, 900 * P, 820 * P, 0.02, 0.04 * G);
      });
      // The zero whirr: a ratchet that slows, over a falling sweep.
      const whirr = () => snd.play('tallyzero', 0.25, 0.5, (t, P, G) => {
        snd.rise(t, 2600 * P, 700 * P, 0.38, 0.08 * G);
        let at = t;
        for (let k = 0; k < 14; k++) {
          snd.hiss(at, 'bandpass', (k % 2 ? 3100 : 2500) * P, 1.8, 0.005, 0.2 * G * (1 - k / 20));
          at += 0.018 + k * 0.0016;
        }
        snd.ring(at, 1400 * P, 1350 * P, 0.04, 0.05 * G);
      });
      // One count: the units roll; each wrap carries to the next drum.
      function count() {
        s.whirr = false;
        let k = 0;
        for (;;) {
          const c = cols[k], base = c.wait >= 0 ? c.next : c.d.t;
          c.next = base + 1;
          c.wait = reduce ? 0 : k * 0.045;
          if (!reduce && !k) { c.d.t = c.next; c.wait = -1; }
          if (mod(Math.round(c.next), 10) !== 0 || k === 3) break;
          k++;
        }
        if (reduce) for (const c of cols) if (c.wait >= 0) { c.d.t = c.next; c.wait = -1; }
        clack();
        label();
        wake(body);
      }
      function press() { s.p.t = 1; count(); }
      function release() { if (s.p.t) { s.p.t = 0; lift(); wake(body); } }
      // Zero turns each drum forward to its next zero.
      function zero() {
        const any = value() > 0;
        s.kn.t += 1;
        cols.forEach((c, k) => {
          const base = c.wait >= 0 ? c.next : c.d.t;
          c.next = Math.ceil(Math.round(base) / 10) * 10;
          c.wait = reduce ? 0 : 0.03 * k;
        });
        if (reduce) for (const c of cols) { c.d.t = c.next; c.wait = -1; }
        if (any) { s.whirr = true; whirr(); } else lift();
        label();
        wake(body);
      }
      ctEl.addEventListener('pointerdown', e => {
        if (s.pid != null || s.kb || e.button > 0) return;
        const r = ctEl.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width) * 130, y = ((e.clientY - r.top) / r.height) * 164;
        // The knob takes taps near it; anywhere else pushes the plunger.
        if (Math.hypot(x - 119, y - 71) < 15) { zero(); return; }
        s.pid = e.pointerId;
        try { ctEl.setPointerCapture(e.pointerId); } catch {}
        press();
      });
      const up = e => { if (e.pointerId === s.pid) { s.pid = null; release(); } };
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => ctEl.addEventListener(t, up));
      // The plunger holds down while Space or Enter is held.
      countBtn.addEventListener('keydown', e => {
        if (!KEYS.includes(e.key)) return;
        e.preventDefault();
        if (!e.repeat && !s.kb && s.pid == null) { s.kb = true; press(); }
      });
      countBtn.addEventListener('keyup', e => {
        if (!KEYS.includes(e.key) || !s.kb) return;
        e.preventDefault();
        s.kb = false; s.keyAt = performance.now();
        release();
      });
      countBtn.addEventListener('blur', () => { if (s.kb) { s.kb = false; release(); } });
      // Assistive tech clicks without key events; they get a short tap.
      const tap = () => { if (s.pid != null || s.kb) return; press(); timers.push(setTimeout(release, 110)); };
      countBtn.addEventListener('click', e => { if (e.detail === 0 && performance.now() - s.keyAt > 300) tap(); });
      knobBtn.addEventListener('click', e => { if (e.detail === 0) zero(); });
      moves.push({
        el: ctEl,
        // Shuffle thumbs the plunger two to five times.
        shuffle() {
          const n = 2 + Math.floor(Math.random() * 4);
          for (let k = 0; k < n; k++) timers.push(setTimeout(tap, k * 130));
        },
        reset() { if (s.pid == null) zero(); },
      });
      return body;
    })());
    return { bodies, moves, destroy() { timers.forEach(clearTimeout); } };
  },
};
