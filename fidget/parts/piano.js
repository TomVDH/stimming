import {
  reduce, clamp, f2, f3, KEYS, css, C, el, set, grad, DOWN, svgIn, mat, skin, well, wake, S, spring, rest, snd,
} from '../kit.js';

// White keys play C major pentatonic.
// Black keys play the same run an octave down.
const WN = ['C', 'D', 'E', 'G', 'A', 'C', 'D', 'E'];
const WF = [523.25, 587.33, 659.26, 783.99, 880, 1046.5, 1174.66, 1318.51];
const BN = ['low C', 'low D', 'low E', 'low G', 'low A'];
const BF = [261.63, 293.66, 329.63, 392, 440];
// Each black key sits on the seam after this white key.
const BAT = [0, 1, 3, 4, 5];
const VW = 420, VH = 140, KX = 14, KW = 392, GAP = 2, WW = (KW - 7 * GAP) / 8, KY = 44, KH = 86, BW = 26, BH = 46;
const wx = i => KX + i * (WW + GAP);
const bx = j => wx(BAT[j]) + WW + GAP / 2 - BW / 2;
const pct = (v, n) => `${f3((v / n) * 100)}%`;
const hit = (cls, label, x, y, w, h) => `<button class="hit ${cls}" type="button" tabindex="-1" aria-label="${label}" style="left:${pct(x, VW)};top:${pct(y, VH)};width:${pct(w, VW)};height:${pct(h, VH)}"></button>`;
const MARKUP = `<div class="grp"><div class="ctl piano" id="piano" role="group" aria-label="Toy piano">${
  WN.map((n, i) => hit('w', `${n} key`, wx(i), KY, WW, KH)).join('')}${BN.map((n, j) => hit('b', `${n} key`, bx(j), KY, BW, BH)).join('')}</div></div>`;

export default {
  id: 'piano', slot: 'row',
  css: `.p-piano .grp { --sr: 3; }
.p-piano .piano { --ar: 3; border-radius: 16px; }
.p-piano .hit { position: absolute; margin: 0; padding: 0; border: 0; background: none; border-radius: 6px; pointer-events: none; }
.p-piano .hit:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }`,
  mount(cell) {
    cell.insertAdjacentHTML('beforeend', MARKUP);
    const bodies = [], moves = [], timers = [];
    // A coral case, a speaker grille, cream keys with small navy sharps.
    const pianoEl = cell.querySelector('#piano');
    const btns = [...pianoEl.querySelectorAll('.hit')];
    bodies.push((() => {
      const svg = svgIn(pianoEl, `0 0 ${VW} ${VH}`), defs = svg.k.defs;
      skin(svg, svg, 'rect', { width: VW, height: VH, rx: 18 }, mat(C.coral, 0), { rim: 3, shadow: { b: 6, y: 8, o: 0.55 } });
      // The grille is a row of small round holes in the lid.
      const holes = el('g', { fill: css([0.42, 0.11, 30]) }, svg);
      for (let k = 0; k < 13; k++) el('circle', { cx: f2(VW / 2 + (k - 6) * 12), cy: 23, r: 3.2 }, holes);
      el('rect', { x: 120, y: 12, width: 180, height: 22, rx: 11, fill: 'none', stroke: '#fff', 'stroke-opacity': 0.22, 'stroke-width': 2 }, svg);
      well(svg, svg, 'rect', { x: KX - 4, y: KY - 4, width: KW + 8, height: KH + 6, rx: 8 }, { rim: 3 });
      const keys = [];
      const make = (x, w, h, M, black) => {
        const g = el('g', {}, svg);
        const sk = skin(svg, g, 'rect', { x, y: KY, width: w, height: h, rx: black ? 5 : 7 }, M, { rim: 2, shadow: { b: 2, y: 3, o: black ? 0.6 : 0.4 } });
        // The key face catches a soft band of light near its front.
        if (!black) el('rect', { x: x + 6, y: KY + h - 22, width: w - 12, height: 12, rx: 6, fill: grad(defs, 'linearGradient', DOWN, [[0, '#fff', 0], [1, '#fff', 0.45]]).url }, g);
        keys.push({ g, sk, x: x + w / 2, d: S(), tl: S(), down: false });
      };
      const WM = mat(C.cream, 0.16), BM = mat(C.navy, 0.06);
      for (let i = 0; i < 8; i++) make(wx(i), WW, KH, WM, false);
      for (let j = 0; j < 5; j++) make(bx(j), BW, BH, BM, true);
      const FREQ = [...WF, ...BF];
      const body = {
        step(h) {
          // A firm dip, then a springy return that overshoots a little.
          for (const k of keys) {
            spring(k.d, k.down ? 1600 : 700, k.down ? 0.7 : 0.35, h);
            spring(k.tl, 500, 0.4, h);
          }
        },
        busy() { let b = false; for (const k of keys) { const a = rest(k.d), c = rest(k.tl); if (!(a && c)) b = true; } return b; },
        draw() {
          for (const k of keys) {
            const d = k.d.x;
            // The key hinges at its back edge: it dips, shortens and tilts.
            set(k.g, 'transform', `translate(${f2(k.x)} ${KY}) rotate(${f2(k.tl.x)}) translate(0 ${f2(3 * d)}) scale(1 ${f3(1 - 0.05 * d)}) translate(${f2(-k.x)} ${-KY})`);
            k.sk.paint(clamp(d) * 0.8);
          }
        },
      };
      // A toy piano note: hammer tick, ringing tine, bell partial.
      function tone(i) {
        const f = FREQ[i];
        snd.play('pn' + i, 0.03, 0.5, (t, P, G) => {
          const k = 1 + (P - 1) * 0.08;
          snd.hiss(t, 'bandpass', 4200 * P, 1.8, 0.005, 0.1 * G);
          snd.ring(t, f * k, f * k, 0.9, 0.13 * G);
          snd.ring(t, 2 * f * k, 2 * f * k, 0.3, 0.03 * G, 'triangle');
          snd.ring(t, 4.07 * f * k, 4.07 * f * k, 0.16, 0.025 * G);
        });
      }
      function press(i, lean = 0) {
        const k = keys[i];
        if (k.down) return;
        k.down = true; k.d.t = 1;
        k.tl.t = reduce ? 0 : clamp(lean, -1, 1) * 2.4;
        tone(i);
        wake(body);
      }
      function release(i) {
        const k = keys[i];
        if (!k || !k.down) return;
        k.down = false; k.d.t = 0; k.tl.t = 0;
        wake(body);
      }
      // A black key wins where it overlaps a white one.
      function pick(x, y) {
        if (y >= KY - 4 && y <= KY + BH) for (let j = 0; j < 5; j++) if (x >= bx(j) && x <= bx(j) + BW) return 8 + j;
        return clamp(Math.floor((x - KX + GAP / 2) / (WW + GAP)), 0, 7);
      }
      const s = { pid: null, cur: -1, rect: null };
      const local = e => [((e.clientX - s.rect.left) / s.rect.width) * VW, ((e.clientY - s.rect.top) / s.rect.height) * VH];
      // The tilt follows where the finger lands on the key.
      const lean = (i, x) => (x - keys[i].x) / (i < 8 ? WW / 2 : BW / 2);
      pianoEl.addEventListener('pointerdown', e => {
        if (s.pid != null || e.button > 0) return;
        s.pid = e.pointerId;
        try { pianoEl.setPointerCapture(e.pointerId); } catch {}
        s.rect = pianoEl.getBoundingClientRect();
        const [x, y] = local(e);
        s.cur = pick(x, y);
        press(s.cur, lean(s.cur, x));
      });
      // Dragging across the keys plays each one it crosses.
      pianoEl.addEventListener('pointermove', e => {
        if (e.pointerId !== s.pid) return;
        const [x, y] = local(e), i = pick(x, y);
        if (i === s.cur) return;
        release(s.cur);
        s.cur = i;
        press(i, lean(i, x));
      });
      const up = e => {
        if (e.pointerId !== s.pid) return;
        s.pid = null;
        release(s.cur);
        s.cur = -1;
      };
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => pianoEl.addEventListener(t, up));
      // Only the first key takes Tab; arrows walk the rest.
      btns[0].tabIndex = 0;
      const order = [0, 8, 1, 9, 2, 3, 10, 4, 11, 5, 12, 6, 7];
      btns.forEach((b, i) => {
        b.addEventListener('keydown', e => {
          const step = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
          if (step) {
            e.preventDefault();
            const n = order[clamp(order.indexOf(i) + step, 0, 12)];
            b.tabIndex = -1; btns[n].tabIndex = 0; btns[n].focus();
            return;
          }
          if (!KEYS.includes(e.key)) return;
          e.preventDefault();
          if (!e.repeat) press(i);
        });
        b.addEventListener('keyup', e => { if (KEYS.includes(e.key)) { e.preventDefault(); release(i); } });
        b.addEventListener('blur', () => release(i));
        // Assistive tech clicks without key events; they get a short tap.
        b.addEventListener('click', e => {
          if (e.detail !== 0 || keys[i].down) return;
          press(i);
          timers.push(setTimeout(() => release(i), 120));
        });
      });
      moves.push({
        el: pianoEl,
        // Shuffle plays a short phrase of three white keys.
        shuffle() {
          if (s.pid != null) return;
          let i = Math.floor(Math.random() * 8);
          for (let n = 0; n < 3; n++) {
            const k = i;
            timers.push(setTimeout(() => press(k, Math.random() - 0.5), n * 150));
            timers.push(setTimeout(() => release(k), n * 150 + 110));
            i = clamp(i + (Math.random() < 0.5 ? -1 : 1) * (1 + Math.floor(Math.random() * 2)), 0, 7);
          }
        },
      });
      return body;
    })());
    return { bodies, moves, destroy() { timers.forEach(clearTimeout); } };
  },
};
