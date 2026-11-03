import { reduce, PI, D2R, R2D, clamp, f2, angDiff, KEYS, css, C, el, set, grad, DOWN, svgIn, mat, skin, wake, snd } from '../kit.js';

const MARKUP = `<div class="grp"><div class="ctl rotary" id="phone-dial" tabindex="0" role="slider" aria-label="Rotary dial" aria-valuemin="0" aria-valuemax="9" aria-valuenow="0" aria-valuetext="Ready"></div></div>`;

// Winding: a soft ratchet tick.
const tick = () => snd.play('phone-tick', 0.025, 0.02, (t, P, G) => {
  snd.hiss(t, 'highpass', 4200 * P, 0.8, 0.003, 0.14 * G);
  snd.ring(t, 2600 * P, 2550 * P, 0.012, 0.02 * G);
});
// Returning: one contact click per digit, with a faint bell tinkle.
const pulse = () => snd.play('phone-pulse', 0.03, 0.05, (t, P, G) => {
  snd.hiss(t, 'bandpass', 2900 * P, 1.8, 0.005, 0.32 * G);
  snd.ring(t, 1100 * P, 1050 * P, 0.018, 0.05 * G);
  snd.ring(t, 1650 * P, 1640 * P, 0.05, 0.008 * G);
});
// The finger meets the steel stop.
const knock = v => snd.play('phone-knock', 0.08, 0.06, (t, P, G) => {
  G *= v;
  snd.hiss(t, 'bandpass', 2000 * P, 1.2, 0.012, 0.35 * G);
  snd.ring(t, 300 * P, 240 * P, 0.04, 0.15 * G);
  snd.ring(t, 2900 * P, 2880 * P, 0.05, 0.03 * G);
});
// The wheel lands home.
const home = () => snd.play('phone-home', 0.08, 0.06, (t, P, G) => {
  snd.hiss(t, 'lowpass', 900 * P, 0.9, 0.02, 0.4 * G);
  snd.ring(t, 140 * P, 100 * P, 0.05, 0.3 * G);
});

export default {
  id: 'phone', slot: 'big',
  css: `.p-phone .grp { --sr: 1; } .p-phone .rotary { --ar: 1; border-radius: 50%; cursor: grab; }`,
  mount(cell) {
    cell.insertAdjacentHTML('beforeend', MARKUP);
    const bodies = [], moves = [];
    // A cream finger wheel turns over a sky number ring.
    const dialEl = cell.querySelector('.rotary');
    const whirr = snd.drone(2.4);
    bodies.push((() => {
      const svg = svgIn(dialEl, '0 0 400 400'), defs = svg.k.defs;
      // Holes sit HR from the centre, one STEP apart.
      // The finger stop sits at angle STOP.
      const CX = 200, HR = 128, HS = 24, STEP = PI / 6, HALF = STEP / 2, STOP = 125 * D2R;
      const at = (r, a) => [CX + r * Math.sin(a), CX - r * Math.cos(a)];
      // Hole i dials digit (i + 1) mod 10.
      // Hole i winds (i + 2) steps to the stop.
      const A = Array.from({ length: 10 }, (_, i) => STOP - (i + 2) * STEP);
      skin(svg, svg, 'circle', { cx: CX, cy: CX, r: 194 }, mat(C.navy, 0), { rim: 3, shadow: { b: 9, y: 11, o: 0.6 } });
      const sky = C.sky, tone = (dl, k = 1) => css([sky[0] + dl, sky[1] * k, sky[2]]);
      el('circle', { cx: CX, cy: CX, r: 170, fill: grad(defs, 'linearGradient', DOWN, [[0, tone(0.06, 0.8)], [1, tone(-0.08)]]).url }, svg);
      const font = { 'font-family': 'Gabarito, sans-serif', 'font-weight': 800, 'text-anchor': 'middle' };
      const nums = el('g', { ...font, fill: css([0.3, 0.05, 262]), 'font-size': 34 }, svg);
      A.forEach((a, i) => {
        const [x, y] = at(HR, a);
        el('text', { x: f2(x), y: f2(y), dy: '0.36em' }, nums).textContent = String((i + 1) % 10);
      });
      // One path: the disc winds clockwise and the holes wind back.
      // Both fill rules then leave the holes open.
      const circ = (x, y, r, cw) => `M${f2(x - r)} ${f2(y)}A${r} ${r} 0 1 ${cw} ${f2(x + r)} ${f2(y)}A${r} ${r} 0 1 ${cw} ${f2(x - r)} ${f2(y)}Z`;
      const d = circ(CX, CX, 172, 1) + A.map(a => { const [x, y] = at(HR, a); return circ(x, y, HS, 0); }).join('');
      const wheel = skin(svg, svg, 'path', { d }, mat(C.cream, 0.1), { rim: 3, shadow: { b: 6, y: 7, o: 0.55 } });
      // Hole walls: dark at the top, lit below; they track the holes.
      const lips = A.map(() => el('circle', { r: HS - 3, fill: 'none', stroke: svg.k.lip, 'stroke-width': 6 }, svg));
      skin(svg, svg, 'circle', { cx: CX, cy: CX, r: 62 }, mat(C.coral, 0.1), { rim: 2.5, shadow: { b: 5, y: 6, o: 0.5 } });
      el('circle', { cx: CX, cy: CX, r: 46, fill: grad(defs, 'linearGradient', DOWN, [[0, '#000', 0.16], [0.55, '#000', 0], [1, '#fff', 0.4]]).url }, svg);
      // The centre card counts the pulses as the wheel returns.
      const shown = el('text', { ...font, x: CX, y: CX, dy: '0.36em', fill: css(C.cream), 'font-size': 64 }, svg);
      // The finger stop is a steel capsule along the STOP radius.
      const n = [Math.cos(STOP), Math.sin(STOP)], w = 9, p1 = at(138, STOP), p2 = at(192, STOP);
      const pt = (p, k) => `${f2(p[0] + n[0] * k)} ${f2(p[1] + n[1] * k)}`;
      skin(svg, svg, 'path', { d: `M${pt(p1, w)}L${pt(p2, w)}A${w} ${w} 0 0 0 ${pt(p2, -w)}L${pt(p1, -w)}A${w} ${w} 0 0 0 ${pt(p1, w)}Z` }, mat(C.steel, 0.05), { rim: 2, shadow: { b: 3, y: 4, o: 0.6 } });
      el('circle', { cx: f2(p2[0] - Math.sin(STOP) * 8), cy: f2(p2[1] + Math.cos(STOP) * 8), r: 3, fill: css([0.5, 0.01, 255]) }, svg);

      const s = { th: 0, w: 0, T: 0, mode: 'rest', max: 0, hole: 0, k: 0, hq: 0, hold: 0, cnt: 0, last: 0, pid: null, pu: 0, prev: 0, off: 0, rect: null };
      // Drag follow, auto wind, governed return, home settle.
      const KD = 1400, CD = 67, KW = 110, CW = 20, GOV = 5.2, ACC = 40, KS = 900, CS = 21;
      function show(c) {
        const t = c ? String(c % 10) : '';
        if (shown.textContent !== t) shown.textContent = t;
      }
      function land() {
        if (!s.cnt) return;
        show(s.cnt);
        s.last = s.cnt % 10;
        dialEl.setAttribute('aria-valuenow', String(s.last));
        dialEl.setAttribute('aria-valuetext', `Dialled ${s.last}`);
      }
      function cross() {
        // Each hole spacing passed on the way home sends one pulse.
        const kq = Math.ceil(s.th / STEP - 1e-4);
        if (kq !== s.k) {
          if (kq < s.k && kq >= 1 && (s.mode === 'return' || s.mode === 'drag')) {
            pulse();
            if (s.mode === 'return') show(++s.cnt);
          }
          s.k = kq;
        }
        // The ratchet ticks twice per spacing while the wheel winds.
        const hq = Math.floor(s.th / HALF + 1e-4);
        if (hq !== s.hq) {
          if (hq > s.hq && (s.mode === 'drag' || s.mode === 'wind')) tick();
          s.hq = hq;
        }
      }
      // A released wheel heads home; the card clears for a new count.
      function release() {
        if (s.th > STEP) { s.cnt = 0; show(0); }
        if (s.th > 0.02) { s.mode = 'return'; s.w = Math.min(s.w, 0); }
        else s.mode = 'settle';
      }
      const body = {
        step(h) {
          if (reduce && s.mode !== 'drag' && s.mode !== 'rest') {
            // Reduced motion skips the travel; the digit lands at once.
            if (s.mode === 'wind') s.cnt = s.hole + 1;
            else if (s.mode === 'return') s.cnt = Math.max(0, Math.ceil(s.th / STEP - 1e-4) - 1);
            if (s.mode !== 'settle' && s.cnt) { pulse(); land(); }
            s.th = s.w = 0; s.k = s.hq = 0; s.mode = 'rest';
            return;
          }
          if (s.mode === 'drag' || s.mode === 'wind') {
            // Both targets reach a little past the stop, so the wheel strikes it.
            const a = s.mode === 'drag' ? KD * (clamp(s.T, 0, s.max + 0.08) - s.th) - CD * s.w : KW * (s.T - s.th) - CW * s.w;
            s.w += a * h;
            s.th += s.w * h;
            // The steel stop catches the finger.
            if (s.th > s.max) {
              s.th = s.max;
              if (s.w > 0.8) knock(clamp(s.w / 6, 0.3, 1));
              if (s.w > 0) s.w = 0;
            }
            if (s.th < 0) { s.th = 0; if (s.w < 0) s.w = 0; }
            if (s.mode === 'wind' && s.th >= s.max - 1e-3 && (s.hold += h) > 0.14) { s.cnt = 0; show(0); s.mode = 'return'; }
          } else if (s.mode === 'return') {
            // A governor holds the return to one steady speed.
            s.w = Math.max(s.w - ACC * h, -GOV);
            s.th += s.w * h;
            if (s.th <= 0) {
              s.th = 0; s.w = -1.2; s.mode = 'settle';
              cross(); home(); land();
              return;
            }
          } else if (s.mode === 'settle') {
            s.w += (-KS * s.th - CS * s.w) * h;
            s.th += s.w * h;
          }
          cross();
        },
        busy() {
          if (s.mode === 'wind' || s.mode === 'return') return true;
          if (s.mode === 'drag') return Math.abs(s.w) > 1e-3 || Math.abs(clamp(s.T, 0, s.max) - s.th) > 1e-3;
          if (s.mode === 'settle') {
            if (Math.abs(s.th) > 2e-4 || Math.abs(s.w) > 2e-3) return true;
            s.th = s.w = 0; s.k = s.hq = 0; s.mode = 'rest';
          }
          return false;
        },
        draw() {
          // Only the shape turns, so the light stays top left.
          set(wheel.shape, 'transform', `rotate(${f2(s.th * R2D)} 200 200)`);
          A.forEach((a, i) => {
            const [x, y] = at(HR, a + s.th);
            set(lips[i], 'cx', f2(x)); set(lips[i], 'cy', f2(y));
          });
          const g = s.mode === 'return' ? clamp(-s.w / GOV) : 0;
          whirr.set(0.045 * g, 700 + 160 * g);
        },
      };

      function polar(e) {
        const r = s.rect, dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        return [Math.atan2(dx, -dy), Math.hypot(dx, dy) / (r.width / 2)];
      }
      dialEl.addEventListener('pointerdown', e => {
        if (s.pid != null || e.button > 0) return;
        s.rect = dialEl.getBoundingClientRect();
        const [a, r] = polar(e);
        // A finger must land in the hole ring, near a hole.
        if (r < 0.44 || r > 0.9) return;
        let best = -1, bd = 0.35;
        A.forEach((h0, i) => { const dd = Math.abs(angDiff(a, h0 + s.th)); if (dd < bd) { bd = dd; best = i; } });
        if (best < 0) return;
        s.pid = e.pointerId;
        try { dialEl.setPointerCapture(e.pointerId); } catch {}
        s.hole = best; s.max = (best + 2) * STEP;
        s.prev = s.pu = a; s.off = s.th - a; s.T = s.th;
        s.mode = 'drag';
        dialEl.classList.add('held');
        wake(body);
      });
      dialEl.addEventListener('pointermove', e => {
        if (e.pointerId !== s.pid) return;
        const [a, d] = polar(e);
        if (d < 0.1) return;
        s.pu += angDiff(a, s.prev); s.prev = a;
        s.T = s.pu + s.off;
        wake(body);
      });
      function end(e) {
        if (e.pointerId !== s.pid) return;
        s.pid = null; dialEl.classList.remove('held');
        release();
        wake(body);
      }
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => dialEl.addEventListener(t, end));
      // The wheel winds itself to digit n's stop, then lets go.
      function dial(n) {
        if (s.pid != null || s.mode === 'wind' || s.mode === 'return') return;
        s.hole = (n + 9) % 10; s.max = (s.hole + 2) * STEP;
        s.T = s.max + 0.35; s.hold = 0; s.mode = 'wind';
        wake(body);
      }
      dialEl.addEventListener('keydown', e => {
        let n;
        if (/^[0-9]$/.test(e.key)) n = +e.key;
        else if (e.key === 'ArrowUp' || e.key === 'ArrowRight') n = (s.last + 1) % 10;
        else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') n = (s.last + 9) % 10;
        else if (KEYS.includes(e.key)) n = (Math.random() * 10) | 0;
        else return;
        e.preventDefault();
        dial(n);
      });
      moves.push({
        el: dialEl,
        shuffle() { dial((Math.random() * 10) | 0); },
        // Reset clears the card and gives the wheel a short wiggle.
        reset() {
          if (s.pid != null || s.mode === 'wind' || s.mode === 'return') return;
          show(0);
          if (!reduce) { s.mode = 'settle'; s.w = 1.6; }
          wake(body);
        },
      });
      return body;
    })());
    return { bodies, moves, destroy() { whirr.stop(); } };
  },
};
