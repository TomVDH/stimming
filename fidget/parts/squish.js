import {
  reduce, clamp, f2, f3, rnd, KEYS, C, el, set, grad, DOWN, svgIn, mat, skin, well, wake, S, spring, rest, snd,
} from '../kit.js';

const MARKUP = `<div class="grp"><button class="ctl squish" id="squish-dome" type="button" aria-label="Stress dome" aria-pressed="false"></button></div>`;

// A wet squelch: a falling band of noise over a soft thud.
const squelch = () => snd.play('squelch', 0.08, 0.25, (t, P, G) => {
  snd.rise(t, 1300 * P, 360 * P, 0.18, 0.22 * G);
  snd.hiss(t, 'lowpass', 650 * P, 1.2, 0.1, 0.3 * G);
  snd.ring(t, 120 * P, 70 * P, 0.09, 0.14 * G);
});
// Air seeps back into the foam: a slow, fading sigh.
const sigh = v => snd.play('sigh', 0.4, 1.6, (t, P, G) => {
  snd.rise(t, 320 * P, 800 * P, 0.35, 0.04 * G * v);
  snd.hiss(t + 0.3, 'bandpass', 800 * P, 0.7, 1.25, 0.05 * G * v);
});
// The dome pops back into shape with a tiny bloop.
const bloop = () => snd.play('bloop', 0.2, 0.14, (t, P, G) => {
  snd.ring(t, 210 * P, 330 * P, 0.12, 0.05 * G);
});

export default {
  id: 'squish', slot: 'small',
  css: `.p-squish .grp { --sr: 1; }
.p-squish .squish { --ar: 1; border-radius: 50%; }`,
  mount(cell) {
    cell.insertAdjacentHTML('beforeend', MARKUP);
    const bodies = [], moves = [];
    // A coral foam dome sits in a cream ring.
    const btn = cell.querySelector('.squish');
    bodies.push((() => {
      const svg = svgIn(btn, '0 0 200 200'), defs = svg.k.defs, XC = 100, YB = 150, W0 = 60, H0 = 100;
      skin(svg, svg, 'ellipse', { cx: XC, cy: 152, rx: 92, ry: 38 }, mat(C.cream, 0.08), { rim: 2.5, shadow: { b: 6, y: 7, o: 0.6 } });
      well(svg, svg, 'ellipse', { cx: XC, cy: 150, rx: 68, ry: 26 }, { rim: 3 });
      const dome = skin(svg, svg, 'path', {}, mat(C.coral, 0.12), { rim: 2.5, shadow: { b: 5, y: 6, o: 0.5 } });
      // The finger leaves a shallow dent at the crown.
      const dent = el('ellipse', { fill: grad(defs, 'linearGradient', DOWN, [[0, '#000', 0.35], [0.6, '#000', 0.05], [1, '#fff', 0.3]]).url, opacity: 0 }, svg);
      const gloss = el('ellipse', { fill: '#fff', opacity: 0.32 }, svg);
      const s = { q: S(), pr: S(), mode: 'idle', held: 0, pid: null, kb: false, keyAt: 0 };
      const body = {
        step(h) {
          spring(s.pr, 500, 0.7, h);
          if (reduce) {
            s.q.x = s.mode === 'hold' ? s.q.t : 0; s.q.v = 0;
            if (s.mode !== 'hold') s.mode = 'idle';
            return;
          }
          if (s.mode === 'hold') {
            // The longer the hold, the flatter the dome.
            s.held += h;
            s.q.t = 0.32 + 0.62 * (1 - Math.exp(-s.held / 1.1));
            spring(s.q, 260, 0.85, h);
          } else if (s.mode === 'foam') {
            // Memory foam creeps back, slower as it nears its shape.
            s.q.v = -1.25 * s.q.x;
            s.q.x += s.q.v * h;
            // Near full height, the dome overshoots and jiggles.
            if (s.q.x < 0.07) { s.mode = 'wobble'; s.q.t = 0; s.q.v = -1.7; bloop(); }
          } else if (s.mode === 'wobble') spring(s.q, 240, 0.16, h);
        },
        busy() {
          const p = rest(s.pr);
          if (s.mode === 'hold') return (!reduce && (s.held < 4 || !rest(s.q, 2e-3))) || !p;
          if (s.mode === 'foam') return true;
          if (s.mode === 'wobble' && rest(s.q)) s.mode = 'idle';
          return s.mode !== 'idle' || !p;
        },
        draw() {
          // Squashed, the dome spreads and its sides bulge; stretched, it narrows.
          const q = s.q.x, qp = clamp(q), H = H0 * (1 - 0.66 * q), w = W0 * (1 + 0.42 * q);
          const k1 = 0.55 + 0.4 * qp, k2 = 0.55 + 0.32 * qp, bw = w * (1 + 0.2 * qp), yT = YB - H, y1 = YB - H * k1;
          const d = `M${f2(XC - w)} ${YB}C${f2(XC - bw)} ${f2(y1)} ${f2(XC - w * k2)} ${f2(yT)} ${XC} ${f2(yT)}C${f2(XC + w * k2)} ${f2(yT)} ${f2(XC + bw)} ${f2(y1)} ${f2(XC + w)} ${YB}A${f2(w)} ${f2(w * 0.36)} 0 0 1 ${f2(XC - w)} ${YB}Z`;
          set(dome.shape, 'd', d);
          dome.paint(0.5 * qp);
          const pr = clamp(s.pr.x);
          set(dent, 'cx', XC); set(dent, 'cy', f2(yT + 9 + 4 * qp));
          set(dent, 'rx', f2(w * (0.3 + 0.2 * qp))); set(dent, 'ry', f2(5 + 4 * qp));
          set(dent, 'opacity', f3(pr));
          set(gloss, 'cx', f2(XC - w * 0.42)); set(gloss, 'cy', f2(yT + H * 0.3));
          set(gloss, 'rx', f2(w * 0.17)); set(gloss, 'ry', f2(Math.max(2, H * 0.11)));
          set(gloss, 'transform', `rotate(-35 ${f2(XC - w * 0.42)} ${f2(yT + H * 0.3)})`);
        },
      };
      function press() {
        if (s.mode === 'hold') return;
        s.mode = 'hold'; s.held = 0; s.pr.t = 1;
        if (reduce) s.q.t = 0.9;
        btn.setAttribute('aria-pressed', 'true');
        squelch();
        wake(body);
      }
      function release() {
        if (s.mode !== 'hold') return;
        s.pr.t = 0;
        if (s.q.x > 0.25) sigh(clamp(s.q.x));
        s.mode = reduce ? 'idle' : 'foam';
        btn.setAttribute('aria-pressed', 'false');
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
      // Space or Enter holds the dome down.
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
      // A brief squeeze for assistive clicks and for shuffle.
      const squeeze = ms => {
        if (s.pid != null || s.kb || s.mode === 'hold') return;
        press();
        setTimeout(() => { if (s.pid == null && !s.kb) release(); }, ms);
      };
      btn.addEventListener('click', e => { if (e.detail === 0 && performance.now() - s.keyAt > 300) squeeze(400); });
      moves.push({ el: btn, shuffle: () => squeeze(rnd(250, 600)) });
      return body;
    })());
    return { bodies, moves, destroy() {} };
  },
};
