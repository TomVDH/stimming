import {
  reduce, clamp, f2, f3, KEYS, css, C, el, set, grad, DOWN, svgIn, mat, skin, wake, S, spring, rest, snd,
} from '../kit.js';

// Seven bars play a major scale from C6.
const NAMES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const FREQ = [1046.5, 1174.66, 1318.51, 1396.91, 1567.98, 1760, 1975.53];
// A rainbow from coral to lilac.
const COLS = [C.coral, [0.79, 0.14, 62], C.butter, [0.83, 0.14, 138], [0.8, 0.11, 195], C.sky, C.lilac];
const VW = 500, VH = 100, CY = 50, BW = 56, GAP = 9, X0 = 27;
const bx = i => X0 + i * (BW + GAP);
const len = i => 90 - 6 * i;
// The nails sit at the bar's nodes, 22.4% in from each end.
const NODE = 0.224;
const pct = (v, n) => `${f3((v / n) * 100)}%`;
const MARKUP = `<div class="grp"><div class="ctl xylo" id="xylo" role="group" aria-label="Toy xylophone">${NAMES.map((n, i) => `<button class="hit" type="button" tabindex="-1" aria-label="${n} bar" style="left:${pct(bx(i), VW)};top:${pct(CY - len(i) / 2, VH)};width:${pct(BW, VW)};height:${pct(len(i), VH)}"></button>`).join('')}</div></div>`;

// A mallet tick, then the bar's inharmonic modes ring out.
function tone(i, v) {
  const f = FREQ[i];
  snd.play('xy' + i, 0.03, 0.9, (t, P, G) => {
    G *= 0.35 + 0.65 * v;
    const k = 1 + (P - 1) * 0.06;
    snd.hiss(t, 'bandpass', 3000 * P, 1.6, 0.006, 0.16 * G);
    snd.hiss(t, 'bandpass', 2 * f * k, 6, 0.02, 0.06 * G);
    snd.ring(t, f * k, f * k, 0.95, 0.12 * G);
    snd.ring(t, 2.76 * f * k, 2.76 * f * k, 0.22, 0.035 * G);
    snd.ring(t, 5.4 * f * k, 5.4 * f * k, 0.09, 0.016 * G);
  });
}

export default {
  id: 'xylo', slot: 'row',
  css: `.p-xylo .grp { --sr: 5; }
.p-xylo .xylo { --ar: 5; border-radius: 14px; cursor: pointer; }
.p-xylo .hit { position: absolute; margin: 0; padding: 0; border: 0; background: none; border-radius: 6px; pointer-events: none; }
.p-xylo .hit:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }`,
  mount(cell) {
    cell.insertAdjacentHTML('beforeend', MARKUP);
    const bodies = [], moves = [], timers = [];
    // Two navy rails, seven rainbow bars, steel nails at the nodes.
    const xyEl = cell.querySelector('.xylo');
    const btns = [...xyEl.querySelectorAll('.hit')];
    bodies.push((() => {
      const svg = svgIn(xyEl, `0 0 ${VW} ${VH}`), defs = svg.k.defs;
      // The rails converge to the right, along the nodes of each bar.
      const railY = (x, top) => {
        const i = (x - X0 - BW / 2) / (BW + GAP), L = 90 - 6 * i;
        return top ? CY - L / 2 + NODE * L : CY + L / 2 - NODE * L;
      };
      const RM = mat(C.navy, 0);
      [true, false].forEach(top => {
        const xa = 10, xb = VW - 10, ya = railY(xa, top), yb = railY(xb, top);
        const ang = (Math.atan2(yb - ya, xb - xa) * 180) / Math.PI, Lr = Math.hypot(xb - xa, yb - ya);
        skin(svg, svg, 'rect', { x: xa, y: f2(ya - 7), width: f2(Lr), height: 14, rx: 7, transform: `rotate(${f3(ang)} ${xa} ${f2(ya)})` }, RM, { rim: 2, shadow: { b: 4, y: 6, o: 0.6 } });
      });
      const bars = COLS.map((c, i) => {
        const x = bx(i), L = len(i), y = CY - L / 2, g = el('g', {}, svg);
        const sk = skin(svg, g, 'rect', { x, y, width: BW, height: L, rx: 9 }, mat(c, 0.1), { rim: 2.5, shadow: { b: 3, y: 5, o: 0.55 } });
        // A soft groove runs down the bar's middle.
        el('rect', { x: x + BW / 2 - 7, y: y + 8, width: 14, height: L - 16, rx: 7, fill: grad(defs, 'linearGradient', DOWN, [[0, '#000', 0.12], [0.5, '#000', 0], [1, '#fff', 0.3]]).url }, g);
        // A flash of light shows the bar still ringing.
        const glint = el('rect', { x: x + 2, y: y + 2, width: BW - 4, height: L - 4, rx: 8, fill: '#fff', opacity: 0 }, g);
        // Nails hold the bar to the rails; it wobbles about them.
        const ng = el('g', {}, svg);
        [y + NODE * L, y + L - NODE * L].forEach(ny => {
          el('circle', { cx: x + BW / 2, cy: f2(ny + 1.2), r: 4.2, fill: '#000', opacity: 0.4 }, ng);
          el('circle', { cx: x + BW / 2, cy: f2(ny), r: 4, fill: css(C.steel) }, ng);
          el('circle', { cx: x + BW / 2 - 1.2, cy: f2(ny - 1.3), r: 1.4, fill: '#fff', opacity: 0.9 }, ng);
        });
        return { g, sk, glint, cx: x + BW / 2, d: S(), wb: S(), sh: S(), e: 0 };
      });
      const body = {
        step(h) {
          for (const b of bars) {
            spring(b.d, 900, 0.3, h);
            spring(b.wb, 520, 0.07, h);
            spring(b.sh, 8000, 0.05, h);
            if (b.e) { b.e *= Math.exp(-3 * h); if (b.e < 0.01) b.e = 0; }
          }
        },
        busy() {
          let m = false;
          for (const b of bars) { const a = rest(b.d), c = rest(b.wb, 0.01), d = rest(b.sh, 1e-4); if (!(a && c && d && b.e === 0)) m = true; }
          return m;
        },
        draw() {
          for (const b of bars) {
            const d = b.d.x, sh = clamp(b.sh.x, -0.04, 0.04);
            // The bar dips, rocks on its nails and shivers as it rings.
            set(b.g, 'transform', `translate(${b.cx} ${CY}) rotate(${f2(b.wb.x)}) translate(0 ${f2(4 * d)}) scale(${f3(1 - 0.6 * sh)} ${f3(1 + sh)}) translate(${-b.cx} ${-CY})`);
            b.sk.paint(clamp(d) * 0.6);
            set(b.glint, 'opacity', f3(0.28 * b.e * b.e));
          }
        },
      };
      // A strike hits harder with speed and leans the way it lands.
      function strike(i, lean = 0, v = 1) {
        const b = bars[i];
        tone(i, v);
        b.e = 1;
        if (!reduce) {
          b.d.v += 9 + 9 * v;
          b.wb.v += clamp(lean, -1, 1) * (40 + 60 * v);
          b.sh.v += 0.5 + 0.6 * v;
        }
        wake(body);
      }
      const s = { pid: null, cur: -1, rect: null, lx: 0, lt: 0 };
      const local = e => [((e.clientX - s.rect.left) / s.rect.width) * VW, ((e.clientY - s.rect.top) / s.rect.height) * VH];
      const pick = x => clamp(Math.floor((x - X0 + GAP / 2) / (BW + GAP)), 0, 6);
      // The wobble follows where the mallet lands along the bar.
      const lean = (i, y) => (y - CY) / (len(i) / 2);
      xyEl.addEventListener('pointerdown', e => {
        if (s.pid != null || e.button > 0) return;
        s.pid = e.pointerId;
        try { xyEl.setPointerCapture(e.pointerId); } catch {}
        s.rect = xyEl.getBoundingClientRect();
        const [x, y] = local(e);
        s.cur = pick(x); s.lx = x; s.lt = e.timeStamp;
        strike(s.cur, lean(s.cur, y), 0.8);
      });
      // Dragging across the bars plays each one it crosses.
      xyEl.addEventListener('pointermove', e => {
        if (e.pointerId !== s.pid) return;
        const [x, y] = local(e), i = pick(x);
        if (i === s.cur) return;
        const v = clamp(Math.abs(x - s.lx) / (Math.max(8, e.timeStamp - s.lt) / 1000) / 2400);
        // A fast sweep can skip bars; each skipped bar still rings.
        const dir = i > s.cur ? 1 : -1;
        for (let k = s.cur + dir; k !== i + dir; k += dir) strike(k, lean(k, y) + dir * 0.3, 0.4 + 0.6 * v);
        s.cur = i; s.lx = x; s.lt = e.timeStamp;
      });
      const up = e => { if (e.pointerId === s.pid) { s.pid = null; s.cur = -1; } };
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => xyEl.addEventListener(t, up));
      // Only the first bar takes Tab; arrows walk the rest.
      btns[0].tabIndex = 0;
      btns.forEach((b, i) => {
        b.addEventListener('keydown', e => {
          const step = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
          if (step) {
            e.preventDefault();
            const n = clamp(i + step, 0, 6);
            b.tabIndex = -1; btns[n].tabIndex = 0; btns[n].focus();
            return;
          }
          if (!KEYS.includes(e.key)) return;
          e.preventDefault();
          if (!e.repeat) strike(i, 0.4, 0.8);
        });
        // Assistive tech clicks without key events.
        b.addEventListener('click', e => { if (e.detail === 0) strike(i, 0.4, 0.8); });
      });
      moves.push({
        el: xyEl,
        // Shuffle plays a quick rising run to the top bar.
        shuffle() {
          if (s.pid != null) return;
          const a = Math.floor(Math.random() * 3);
          for (let k = a; k < 7; k++) timers.push(setTimeout(() => strike(k, 0.5, 0.5 + 0.08 * (k - a)), (k - a) * 85));
        },
        reset() {},
      });
      return body;
    })());
    return { bodies, moves, destroy() { timers.forEach(clearTimeout); } };
  },
};
