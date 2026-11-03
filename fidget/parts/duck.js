import {
  reduce, clamp, f2, f3, rnd, KEYS, css, C, el, set, nid, grad, DOWN, svgIn, mat, skin, wake, S, spring, rest, snd,
} from '../kit.js';

const MARKUP = `<div class="grp"><button class="ctl rduck" id="duck" type="button" aria-label="Rubber duck" aria-pressed="false"></button></div>`;

// The squeak: a reedy buzz whose pitch bends up, then sags.
const squeak = (f, d, g) => snd.play('duck', 0.05, d + 0.05, (t, P, G) => {
  const ac = snd.kit.ac, o = ac.createOscillator(), flt = ac.createBiquadFilter(), amp = ac.createGain();
  const lfo = ac.createOscillator(), dep = ac.createGain();
  f *= P;
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(f * 0.7, t);
  o.frequency.exponentialRampToValueAtTime(f * 1.12, t + d * 0.3);
  o.frequency.exponentialRampToValueAtTime(f * 0.86, t + d);
  // The reed flutters, so the pitch trembles.
  lfo.frequency.value = 34 * P; dep.gain.value = f * 0.03;
  lfo.connect(dep); dep.connect(o.frequency);
  flt.type = 'bandpass'; flt.frequency.value = f * 1.6; flt.Q.value = 1.4;
  amp.gain.setValueAtTime(1e-4, t);
  amp.gain.exponentialRampToValueAtTime(Math.max(g * G, 2e-4), t + 0.012);
  amp.gain.exponentialRampToValueAtTime(Math.max(g * G * 0.6, 2e-4), t + d * 0.7);
  amp.gain.exponentialRampToValueAtTime(1e-4, t + d);
  o.connect(flt); flt.connect(amp); amp.connect(snd.kit.out);
  o.start(t); lfo.start(t);
  o.stop(t + d + 0.02); lfo.stop(t + d + 0.02);
  snd.hiss(t, 'bandpass', 3000 * P, 2, d * 0.8, 0.03 * G);
});
// The duck drops back onto the water: a soft plip.
const plip = v => snd.play('duck-plip', 0.2, 0.12, (t, P, G) => {
  snd.ring(t, 520 * P, 1100 * P, 0.07, 0.05 * G * v);
  snd.hiss(t, 'bandpass', 1400 * P, 1.2, 0.05, 0.06 * G * v);
});

export default {
  id: 'duck', slot: 'small',
  css: `.p-duck .grp { --sr: 1; } .p-duck .rduck { --ar: 1; border-radius: 30%; }`,
  mount(cell) {
    cell.insertAdjacentHTML('beforeend', MARKUP);
    const bodies = [], moves = [], timers = new Set();
    const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); };
    // A butter duck with a coral beak floats in a ring of sky water.
    const btn = cell.querySelector('.rduck');
    bodies.push((() => {
      const svg = svgIn(btn, '0 0 200 200'), defs = svg.k.defs;
      // The duck squashes about its base on the waterline.
      const XC = 100, YW = 152;
      skin(svg, svg, 'ellipse', { cx: XC, cy: 154, rx: 97, ry: 38 }, mat(C.cream, 0), { rim: 2.5, shadow: { b: 6, y: 7, o: 0.6 } });
      const sky = C.sky, tone = dl => css([sky[0] + dl, sky[1], sky[2]]);
      el('ellipse', { cx: XC, cy: 153, rx: 84, ry: 28, fill: grad(defs, 'linearGradient', DOWN, [[0, tone(-0.2)], [0.45, tone(-0.06)], [1, tone(0.06)]]).url }, svg);
      // Ripples spread on the water and fade; the rim clips them.
      const clip = el('clipPath', { id: nid('c') }, defs);
      el('ellipse', { cx: XC, cy: 153, rx: 84, ry: 28 }, clip);
      const rg = el('g', { 'clip-path': `url(#${clip.id})`, fill: 'none', stroke: '#fff', 'stroke-width': 2.2 }, svg);
      const rings = [0, 1, 2].map(() => ({ e: el('ellipse', { cx: XC, cy: YW + 1, opacity: 0 }, rg), a: 1 }));
      const dg = el('g', {}, svg);
      const BODY = 'M46 140C34 130 30 106 38 86C48 98 58 100 68 99C88 92 128 92 150 112C163 124 162 146 141 155C112 164 66 162 46 140Z';
      const bodySk = skin(svg, dg, 'path', { d: BODY }, mat(C.butter, 0.1), { rim: 2.5, shadow: { b: 4, y: 4, o: 0.35 } });
      el('path', { d: 'M72 120C86 106 114 106 124 122C112 136 86 138 72 120Z', fill: css([0.82, 0.13, 88]), opacity: 0.8 }, dg);
      el('path', { d: 'M80 116C92 110 108 110 116 118', fill: 'none', stroke: '#fff', 'stroke-width': 2.5, 'stroke-linecap': 'round', opacity: 0.5 }, dg);
      const head = skin(svg, dg, 'circle', { cx: 128, cy: 70, r: 31 }, mat(C.butter, 0.1), { rim: 2.5, shadow: { b: 4, y: 5, o: 0.35 } });
      const beak = skin(svg, dg, 'path', { d: 'M150 66C164 58 184 62 186 74C184 84 166 88 150 82C146 77 146 71 150 66Z' }, mat(C.coral, 0.1), { rim: 1.8 });
      el('path', { d: 'M152 75C162 77 174 77 184 75', fill: 'none', stroke: css([0.55, 0.15, 30]), 'stroke-width': 2, 'stroke-linecap': 'round' }, dg);
      // The eye squeezes shut while the duck is pressed.
      const eye = el('ellipse', { cx: 138, cy: 62, rx: 5.5, ry: 6, fill: css([0.25, 0.04, 265]) }, dg);
      const glint = el('circle', { cx: 136.2, cy: 60, r: 1.8, fill: '#fff' }, dg);
      // The front water hides the duck's bottom.
      const front = el('path', { fill: tone(0.02), opacity: 0.7 }, svg);
      const shine = el('path', { fill: 'none', stroke: '#fff', 'stroke-width': 1.6, 'stroke-linecap': 'round', opacity: 0.55 }, svg);

      // q is the squash; b bobs the duck; wb rocks it in degrees.
      const s = { q: S(), b: S(), wb: S(), held: false, last: -1e9, pid: null, kb: false, keyAt: 0, ring: 0 };
      function ripple(k = 1) {
        if (reduce) return;
        const r = rings[s.ring]; s.ring = (s.ring + 1) % 3;
        r.a = 0; r.k = k;
      }
      const body = {
        step(h) {
          spring(s.q, s.held ? 900 : 520, s.held ? 0.6 : 0.16, h);
          spring(s.b, 70, 0.16, h);
          spring(s.wb, 90, 0.14, h);
          for (const r of rings) if (r.a < 1) r.a = Math.min(1, r.a + h / 1.3);
        },
        busy() {
          const a = rest(s.q), b = rest(s.b, 0.02), c = rest(s.wb, 0.02);
          return !(a && b && c) || rings.some(r => r.a < 1);
        },
        draw() {
          const q = s.q.x, sx = 1 + 0.15 * q, sy = 1 - 0.26 * q;
          set(dg, 'transform', `translate(${XC} ${f2(YW + s.b.x)}) rotate(${f2(s.wb.x)}) scale(${f3(sx)} ${f3(sy)}) translate(${-XC} ${-YW})`);
          const p = clamp(q);
          bodySk.paint(p * 0.6); head.paint(p * 0.6); beak.paint(p * 0.4);
          set(eye, 'ry', f2(6 - 4.8 * p)); set(glint, 'opacity', f3(1 - p));
          // The waterline widens as the duck squashes.
          const hw = 60 * sx;
          set(front, 'd', `M${f2(XC - hw)} ${YW}A${f2(hw)} 10 0 0 0 ${f2(XC + hw)} ${YW}Z`);
          set(shine, 'd', `M${f2(XC - hw + 6)} ${YW}H${f2(XC + hw - 6)}`);
          for (const r of rings) {
            set(r.e, 'rx', f2(58 + 36 * r.a)); set(r.e, 'ry', f2(13 + 13 * r.a));
            set(r.e, 'opacity', f3(0.6 * (r.k ?? 1) * (1 - r.a) ** 2));
          }
        },
      };
      function press() {
        if (s.held) return;
        s.held = true; s.q.t = 1; s.b.t = 4;
        // Fast repeats squeak higher.
        const now = performance.now(), fast = clamp(1 - (now - s.last - 150) / 600);
        s.last = now;
        squeak(1050 * (1 + 0.45 * fast), 0.24, 0.13);
        btn.setAttribute('aria-pressed', 'true');
        ripple(0.6);
        wake(body);
      }
      function release() {
        if (!s.held) return;
        s.held = false; s.q.t = 0; s.b.t = 0;
        // Air rushes back in with a lower, softer squeak.
        squeak(800, 0.15, 0.06);
        if (!reduce) { s.b.v -= 70; s.wb.v += (Math.random() < 0.5 ? -1 : 1) * rnd(60, 110); }
        later(() => plip(0.8), 230);
        btn.setAttribute('aria-pressed', 'false');
        ripple(1);
        wake(body);
      }
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
      // Assistive clicks and shuffle get a quick squeeze.
      const tap = () => {
        if (s.held || s.kb || s.pid != null) return;
        press();
        later(() => { if (s.pid == null && !s.kb) release(); }, 140);
      };
      btn.addEventListener('click', e => { if (e.detail === 0 && performance.now() - s.keyAt > 300) tap(); });
      moves.push({ el: btn, shuffle: tap });
      return body;
    })());
    return { bodies, moves, destroy() { timers.forEach(clearTimeout); } };
  },
};
