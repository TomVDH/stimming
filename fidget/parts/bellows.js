import {
  reduce, clamp, f2, KEYS, css, ramp, C, el, set, grad, DOWN, blur, svgIn, mat, skin, wake, S, spring, rest, snd,
} from '../kit.js';

const MARKUP = `<div class="ctl bellows wide" tabindex="0" role="slider" aria-label="Bellows" aria-valuemin="30" aria-valuemax="110" aria-valuenow="100" aria-valuetext="At rest"></div>`;

// Squeezing sounds one chord and stretching another, like a button box.
const PUSH = [261.63, 329.63, 392], PULL = [246.94, 293.66, 392], GMAX = 0.03;
// Three sawtooth reeds and one sharp twin run through a soft lowpass.
function reeds() {
  let os = null, lp = null, amp = null;
  const r = {
    set(g, push) {
      const ac = g > 0.0015 ? snd.kit.live() : null;
      if (!ac) { if (os) r.stop(); return; }
      const t = ac.currentTime, f = push ? PUSH : PULL, fs = [...f, f[0] * 1.004];
      if (!os) {
        lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.7; lp.frequency.value = 700;
        amp = ac.createGain(); amp.gain.value = 0;
        lp.connect(amp); amp.connect(snd.kit.out);
        os = fs.map(fr => { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr; o.connect(lp); o.start(t); return o; });
      }
      os.forEach((o, i) => o.frequency.setTargetAtTime(fs[i], t, 0.03));
      amp.gain.setTargetAtTime(g, t, 0.05);
      lp.frequency.setTargetAtTime(600 + (2400 * g) / GMAX, t, 0.05);
    },
    stop() {
      if (!os) return;
      const t = snd.kit.ac.currentTime;
      amp.gain.setTargetAtTime(0, t, 0.04);
      os.forEach(o => o.stop(t + 0.3));
      os = null;
    },
  };
  return r;
}

export default {
  id: 'bellows', slot: 'band',
  css: `.p-bellows .bellows { border-radius: 10px; cursor: grab; }`,
  mount(cell) {
    cell.insertAdjacentHTML('beforeend', MARKUP);
    const bodies = [], moves = [];
    let watch = null;
    // Lilac pleats run between two navy end boards with coral straps.
    // Both boards move together about the centre.
    const bwEl = cell.querySelector('.bellows');
    const reed = reeds(), air = snd.drone(1.2);
    bodies.push((() => {
      const VH = 100, CY = 50, svg = svgIn(bwEl, `0 0 600 ${VH}`), defs = svg.k.defs;
      // BW is board width, M the outer margin, HT the bellows half height.
      // E is the deepest fold.
      const BW = 22, M = 6, HT = 35, E = 6;
      const MID = [0.7, 0.1, 302];
      const LIT = ramp(MID, [0.87, 0.07, 302]), SHADE = ramp(MID, [0.5, 0.1, 302]);
      const shadow = el('rect', { y: CY + HT - 4, height: 12, rx: 6, fill: '#000', opacity: 0.5, filter: blur(defs, 4) }, svg);
      const pleats = el('g', {}, svg);
      const panels = [];
      // Light falls from above across the whole bellows.
      const veil = el('path', { fill: grad(defs, 'linearGradient', DOWN, [[0, '#fff', 0.22], [0.4, '#fff', 0], [0.7, '#000', 0], [1, '#000', 0.28]]).url }, svg);
      const tape = el('path', { fill: 'none', stroke: css(C.cream), 'stroke-width': 2.4, 'stroke-linejoin': 'round', opacity: 0.9 }, svg);
      const corners = el('path', { fill: css(C.steel), stroke: css([0.5, 0.012, 258]), 'stroke-width': 0.6 }, svg);
      // One end board: navy wood, a coral strap, a steel buckle.
      function board(dir) {
        const g = el('g', {}, svg), x0 = dir > 0 ? 0 : -BW;
        skin(svg, g, 'rect', { x: x0, y: 5, width: BW, height: 90, rx: 6 }, mat(C.navy, 0), { rim: 2.5, shadow: { b: 4, y: 5, o: 0.6 } });
        const sx = x0 + BW / 2 - 4;
        skin(svg, g, 'rect', { x: sx, y: 2, width: 8, height: 96, rx: 3 }, mat(C.coral, 0), { rim: 1.2, sheen: false, shadow: { b: 1.5, y: 2, o: 0.45 } });
        el('rect', { x: sx - 2.5, y: 42, width: 13, height: 16, rx: 2.5, fill: 'none', stroke: css(C.steel), 'stroke-width': 2.2 }, g);
        [14, 86].forEach(y => el('circle', { cx: sx + 4, cy: y, r: 1.8, fill: css(C.steel) }, g));
        return g;
      }
      const lb = board(-1), rb = board(1);
      let VW = 600, HL0 = 200, HMAX = 220, HMIN = 70, N = 16, P = 30;
      const s = { hl: S(200), mode: 'rest', side: 1, off: 0, pid: null, rect: null, q0: 0, moved: false, auto: 0, val: '' };
      // Rest fills the band, leaving a little room to stretch.
      function fit() {
        const r = bwEl.getBoundingClientRect(), f = s.hl.x / HL0, ft = s.hl.t / HL0;
        if (r.width > 0 && r.height > 0) VW = Math.max(320, Math.round((VH * r.width) / r.height));
        svg.setAttribute('viewBox', `0 0 ${VW} ${VH}`);
        HMAX = VW / 2 - M - BW; HL0 = HMAX - 0.04 * VW; HMIN = 0.3 * HL0;
        N = 2 * Math.max(4, Math.round(HL0 / 26));
        P = (2 * HMAX * 1.03) / N;
        while (panels.length < N) panels.push(el('path', {}, pleats));
        panels.forEach((p, i) => set(p, 'd', i < N ? 'M0 0' : ''));
        s.hl.x = f * HL0; s.hl.t = ft * HL0;
        body.draw();
      }
      const body = {
        step(h) {
          const p = s.hl;
          if (s.mode === 'drag') spring(p, 900, 0.85, h);
          else {
            // Air cushions the return, with a small overshoot.
            if (s.mode === 'auto' && (s.auto -= h) <= 0) { s.mode = 'rest'; p.t = HL0; }
            spring(p, s.mode === 'auto' ? 260 : 45, s.mode === 'auto' ? 0.9 : 0.75, h);
          }
          if (p.x < HMIN * 0.9) { p.x = HMIN * 0.9; if (p.v < 0) p.v = 0; }
          if (p.x > HMAX) { p.x = HMAX; if (p.v > 0) p.v = 0; }
        },
        busy() { return s.mode === 'auto' || !rest(s.hl, 0.05); },
        draw() {
          const hl = s.hl.x, xl = VW / 2 - hl, xr = VW / 2 + hl, w = (xr - xl) / N;
          // A folded pleat stands deeper and shows more contrast.
          const c = Math.sqrt(Math.max(0, 1 - (w / P) ** 2)), e = E * c;
          // Squeezed, the bellows bulges a little taller.
          const sy = 1 + clamp(0.08 * (1 - hl / HL0), -0.04, 0.08), T = CY - HT * sy, B = CY + HT * sy;
          const lit = LIT(c), shade = SHADE(c);
          const X = k => f2(xl + k * w), TY = k => f2(k % 2 ? T + e : T - e), BY = k => f2(k % 2 ? B - e : B + e);
          let top = '', bot = '', cn = '';
          for (let k = 0; k <= N; k++) {
            top += `${k ? 'L' : 'M'}${X(k)} ${TY(k)}`;
            bot = `L${X(k)} ${BY(k)}` + bot;
            if (k % 2 === 0 && k > 0 && k < N) cn += `M${f2(xl + k * w - 3)} ${TY(k)}h6l-3 5ZM${f2(xl + k * w - 3)} ${BY(k)}h6l-3 -5Z`;
            if (k < N) {
              const d = `M${X(k)} ${TY(k)}L${X(k + 1)} ${TY(k + 1)}L${X(k + 1)} ${BY(k + 1)}L${X(k)} ${BY(k)}Z`;
              set(panels[k], 'd', d);
              // A pleat that rises to the right faces the light.
              set(panels[k], 'fill', k % 2 ? lit : shade);
            }
          }
          set(veil, 'd', top + bot + 'Z');
          set(tape, 'd', top + bot.replace('L', 'M'));
          set(corners, 'd', cn || 'M0 0');
          set(shadow, 'x', f2(xl - BW)); set(shadow, 'width', f2(2 * (hl + BW)));
          set(lb, 'transform', `translate(${f2(xl)} 0)`);
          set(rb, 'transform', `translate(${f2(xr)} 0)`);
          // Air flows with speed; the reeds join in above a gentle push.
          const sp = Math.abs(s.hl.v) / HL0, g = clamp((sp - 0.05) / 1.6);
          reed.set(GMAX * g ** 0.8, s.hl.v < 0);
          air.set(0.025 * clamp(sp / 1.6), 500 + 900 * clamp(sp / 2));
          const pc = Math.round((hl / HL0) * 100);
          const val = pc < 96 ? `Squeezed to ${pc}%` : pc > 104 ? `Stretched to ${pc}%` : 'At rest';
          if (val !== s.val) { s.val = val; bwEl.setAttribute('aria-valuenow', String(clamp(pc, 30, 110))); bwEl.setAttribute('aria-valuetext', val); }
        },
      };
      const local = e => ((e.clientX - s.rect.left) / s.rect.width) * VW;
      bwEl.addEventListener('pointerdown', e => {
        if (s.pid != null || e.button > 0) return;
        s.pid = e.pointerId;
        try { bwEl.setPointerCapture(e.pointerId); } catch {}
        s.rect = bwEl.getBoundingClientRect();
        const q = local(e);
        // Either board works; the grab point stays under the finger.
        s.side = q >= VW / 2 ? 1 : -1; s.q0 = q; s.moved = false;
        s.off = s.hl.x - s.side * (q - VW / 2);
        s.mode = 'drag'; s.hl.t = s.hl.x;
        bwEl.classList.add('held');
        wake(body);
      });
      bwEl.addEventListener('pointermove', e => {
        if (e.pointerId !== s.pid) return;
        const q = local(e);
        if (Math.abs(q - s.q0) > 5) s.moved = true;
        s.hl.t = clamp(s.side * (q - VW / 2) + s.off, HMIN, HMAX);
        wake(body);
      });
      const up = e => {
        if (e.pointerId !== s.pid) return;
        s.pid = null; bwEl.classList.remove('held');
        s.mode = 'rest'; s.hl.t = HL0;
        // A tap gives a short puff.
        if (!s.moved && e.type === 'pointerup') pump(0.7, 0.18);
        wake(body);
      };
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => bwEl.addEventListener(t, up));
      // A pump drives the boards to a size, holds, then lets go.
      function pump(f, hold = 0.3) {
        if (s.pid != null) return;
        s.mode = 'auto'; s.auto = hold;
        s.hl.t = clamp(f * HL0, HMIN, HMAX);
        if (reduce) { s.mode = 'rest'; s.hl.t = HL0; }
        wake(body);
      }
      function settle() {
        if (s.pid != null) return;
        s.mode = 'rest'; s.hl.t = HL0;
        wake(body);
      }
      bwEl.addEventListener('keydown', e => {
        const d = { ArrowLeft: 0.6, ArrowDown: 0.6, ArrowRight: 1.08, ArrowUp: 1.08 }[e.key];
        if (d) pump(d);
        else if (KEYS.includes(e.key)) pump(0.4, 0.4);
        else if (e.key === 'Home') settle();
        else return;
        e.preventDefault();
      });
      moves.push({
        el: bwEl,
        shuffle() { pump(0.35 + Math.random() * 0.25, 0.25 + Math.random() * 0.2); },
        reset() { settle(); },
      });
      fit();
      watch = new ResizeObserver(fit);
      watch.observe(bwEl);
      return body;
    })());
    return { bodies, moves, destroy() { watch.disconnect(); reed.stop(); air.stop(); } };
  },
};
