import {
  reduce, TAU, clamp, mod, f2, f3, KEYS, css, C, BUTTER, el, set, grad, DOWN, blur, svgIn, mat, skin, well, wake, S, spring, rest, snd,
} from '../kit.js';

// The case centre and the hit boxes, in the 400 by 440 view box.
const VW = 400, VH = 440, CX = 200, CY = 252, RC = 166, SIDE = 0.84;
const pc = (v, n) => f3((v / n) * 100) + '%';
const box = (x, y, w, h) => `left:${pc(x, VW)};top:${pc(y, VH)};width:${pc(w, VW)};height:${pc(h, VH)}`;
const SX = CX + (RC + 26) * Math.sin(SIDE), SY = CY - (RC + 26) * Math.cos(SIDE);
const MARKUP = `<div class="grp"><div class="ctl watch" id="stopwatch" role="group" aria-label="Stopwatch"><button class="sw-btn" type="button" id="stopwatch-crown" aria-label="Start and stop" aria-pressed="false" style="${box(156, 0, 88, 92)}"></button><button class="sw-btn" type="button" id="stopwatch-reset" aria-label="Reset to zero" style="${box(SX - 34, SY - 34, 68, 68)}"></button></div></div>`;

// The crown: a crisp click, then the lever catches.
const crown = on => snd.play('sw-crown', 0.03, 0.06, (t, P, G) => {
  const k = (on ? 1.06 : 0.94) * P;
  snd.hiss(t, 'highpass', 5200 * k, 0.8, 0.003, 0.3 * G);
  snd.ring(t, 2900 * k, 2850 * k, 0.03, 0.045 * G);
  snd.hiss(t + 0.018, 'bandpass', 3400 * k, 1.4, 0.005, 0.2 * G);
  snd.ring(t + 0.018, 900 * k, 760 * k, 0.025, 0.06 * G);
});
// A soft escapement tick marks each second.
const second = () => snd.play('sw-sec', 0.3, 0.02, (t, P, G) => {
  snd.hiss(t, 'bandpass', 4200 * P, 1.6, 0.003, 0.08 * G);
  snd.ring(t, 3100 * P, 3080 * P, 0.012, 0.012 * G);
});
// The flyback: a falling whirr over a fast gear rattle, then a stop.
const whirr = v => snd.play('sw-whirr', 0.2, 0.42, (t, P, G) => {
  G *= v;
  snd.rise(t, 2600 * P, 900 * P, 0.3, 0.09 * G);
  for (let i = 0; i < 12; i++) snd.hiss(t + i * 0.022 * (1 + i * 0.04), 'highpass', 5000 * P, 0.9, 0.003, 0.12 * G * (1 - i / 14));
  snd.hiss(t + 0.34, 'bandpass', 3000 * P, 1.2, 0.006, 0.2 * G);
  snd.ring(t + 0.34, 1800 * P, 1760 * P, 0.03, 0.03 * G);
});

export default {
  id: 'stopwatch', slot: 'big',
  css: `.p-stopwatch .grp { --sr: ${f3(VW / VH)}; }
.p-stopwatch .watch { --ar: ${VW} / ${VH}; border-radius: 40%; cursor: pointer; }
.p-stopwatch .sw-btn { position: absolute; z-index: 1; margin: 0; padding: 0; border: 0; background: none; border-radius: 50%; cursor: pointer; touch-action: none; -webkit-tap-highlight-color: transparent; }
.p-stopwatch .sw-btn:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }`,
  mount(cell) {
    cell.insertAdjacentHTML('beforeend', MARKUP);
    const bodies = [], moves = [], timers = new Set();
    const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); };
    // A chrome case holds a cream face; a coral hand sweeps the seconds.
    const wEl = cell.querySelector('.watch'), crBtn = cell.querySelector('#stopwatch-crown'), rsBtn = cell.querySelector('#stopwatch-reset');
    bodies.push((() => {
      const svg = svgIn(wEl, `0 0 ${VW} ${VH}`), defs = svg.k.defs;
      const at = (r, a, cy = CY, cx = CX) => [f2(cx + r * Math.sin(a)), f2(cy - r * Math.cos(a))];
      const STEEL = mat(C.steel, 0.1), INK = css([0.3, 0.04, 265]);
      // The bow loops over the crown.
      el('circle', { cx: CX, cy: 40, r: 30, fill: 'none', stroke: css([0.5, 0.012, 255]), 'stroke-width': 11 }, svg);
      el('circle', { cx: CX, cy: 39, r: 30, fill: 'none', stroke: css([0.86, 0.01, 255]), 'stroke-width': 5 }, svg);
      // The crown rides on its stem; it sinks when pressed.
      const cg = el('g', {}, svg);
      skin(svg, cg, 'rect', { x: CX - 13, y: 52, width: 26, height: 44, rx: 5 }, STEEL, { rim: 1.5, shadow: { b: 3, y: 4, o: 0.5 } });
      const cap = skin(svg, cg, 'rect', { x: CX - 32, y: 30, width: 64, height: 32, rx: 10 }, STEEL, { rim: 2, shadow: { b: 4, y: 5, o: 0.5 } });
      const knurl = el('g', { stroke: css([0.55, 0.012, 255]), 'stroke-width': 2.4, 'stroke-linecap': 'round', opacity: 0.8 }, cg);
      for (let i = 0; i < 9; i++) el('line', { x1: CX - 24 + i * 6, y1: 37, x2: CX - 24 + i * 6, y2: 55 }, knurl);
      // The side pusher points out along its own axis.
      const sg = el('g', { transform: `rotate(${f2(SIDE * 57.2958)} ${CX} ${CY})` }, svg), sp = el('g', {}, sg);
      skin(svg, sp, 'rect', { x: CX - 9, y: CY - RC - 18, width: 18, height: 26, rx: 4 }, STEEL, { rim: 1.5, shadow: { b: 3, y: 4, o: 0.5 } });
      const pusher = skin(svg, sp, 'rect', { x: CX - 17, y: CY - RC - 32, width: 34, height: 18, rx: 7 }, STEEL, { rim: 2, shadow: { b: 3, y: 4, o: 0.5 } });
      // The case is polished chrome with vertical streaks.
      const caseSk = skin(svg, svg, 'circle', { cx: CX, cy: CY, r: RC }, STEEL, { rim: 3, shadow: { b: 9, y: 11, o: 0.6 } });
      const chrome = grad(defs, 'linearGradient', { x1: 0, y1: 0, x2: 1, y2: 0 }, [[0, '#000', 0.25], [0.2, '#fff', 0], [0.3, '#fff', 0.35], [0.42, '#fff', 0], [0.75, '#000', 0.1], [1, '#000', 0.3]]);
      el('use', { href: '#' + caseSk.shape.getAttribute('id'), fill: chrome.url }, svg);
      well(svg, svg, 'circle', { cx: CX, cy: CY, r: 150 }, { rim: 4 });
      el('circle', { cx: CX, cy: CY, r: 145, fill: grad(defs, 'linearGradient', DOWN, [[0, css([0.97, 0.014, 85])], [1, css([0.88, 0.022, 80])]]).url }, svg);
      // Sixty ticks; every fifth is long and carries a number.
      const ticks = el('g', { stroke: INK, 'stroke-linecap': 'round' }, svg);
      for (let k = 0; k < 60; k++) {
        const a = (k / 60) * TAU, big = k % 5 === 0, [x1, y1] = at(big ? 122 : 131, a), [x2, y2] = at(139, a);
        el('line', { x1, y1, x2, y2, 'stroke-width': big ? 4.5 : 2 }, ticks);
      }
      const nums = el('g', { fill: INK, 'font-family': 'Gabarito, system-ui, sans-serif', 'font-weight': 700, 'font-size': 23, 'text-anchor': 'middle' }, svg);
      for (let k = 1; k <= 12; k++) {
        const [x, y] = at(103, (k / 12) * TAU);
        el('text', { x, y, dy: '0.36em' }, nums).textContent = String(k * 5);
      }
      // The minute counter is a small sunk dial below the centre.
      const MY = CY + 56;
      well(svg, svg, 'circle', { cx: CX, cy: MY, r: 31 }, { rim: 3 });
      const mt = el('g', { stroke: css(C.cream), 'stroke-linecap': 'round', opacity: 0.85 }, svg);
      for (let k = 0; k < 30; k++) {
        const a = (k / 30) * TAU, big = k % 5 === 0, [x1, y1] = at(big ? 19 : 23, a, MY), [x2, y2] = at(27, a, MY);
        el('line', { x1, y1, x2, y2, 'stroke-width': big ? 2.6 : 1.2 }, mt);
      }
      const mh = el('g', {}, svg);
      el('path', { d: `M${CX - 2.5} ${MY + 6}L${CX} ${MY - 24}L${CX + 2.5} ${MY + 6}Z`, fill: BUTTER }, mh);
      el('circle', { cx: CX, cy: MY, r: 4.5, fill: BUTTER }, svg);
      // The sweep hand casts a soft shadow onto the face.
      const HAND = `M${CX - 4.2} ${CY + 30}L${CX - 2} ${CY - 100}L${CX} ${CY - 138}L${CX + 2} ${CY - 100}L${CX + 4.2} ${CY + 30}Z`;
      const hs = el('g', { transform: 'translate(3 6)', opacity: 0.35, filter: blur(defs, 2.5) }, svg), hsr = el('g', {}, hs);
      el('path', { d: HAND, fill: '#000' }, hsr);
      el('circle', { cx: CX, cy: CY + 26, r: 8, fill: '#000' }, hsr);
      const hg = el('g', {}, svg), CORAL = css(C.coral);
      el('path', { d: HAND, fill: CORAL }, hg);
      el('circle', { cx: CX, cy: CY + 26, r: 8, fill: CORAL }, hg);
      el('circle', { cx: CX, cy: CY + 26, r: 3.5, fill: css([0.6, 0.15, 32]) }, hg);
      skin(svg, svg, 'circle', { cx: CX, cy: CY, r: 10 }, mat(C.navy, 0), { rim: 1.5, shadow: { b: 2, y: 2, o: 0.4 } });
      el('circle', { cx: CX, cy: CY, r: 3, fill: css(C.steel) }, svg);
      // The crystal catches a soft gleam at the top left.
      el('circle', { cx: CX, cy: CY, r: 145, fill: svg.k.sheen, opacity: 0.45 }, svg);
      el('path', { d: `M${at(132, -1.25).join(' ')}A132 132 0 0 1 ${at(132, -0.35).join(' ')}`, fill: 'none', stroke: '#fff', 'stroke-width': 6, 'stroke-linecap': 'round', opacity: 0.35 }, svg);

      // acc holds stopped time; t0 marks the last start.
      // off and moff carry the hands home after a reset; wb flexes the hand.
      const s = { run: false, acc: 0, t0: 0, sec: 0, off: S(), moff: S(), wb: S(), cr: S(), sb: S() };
      const now = () => performance.now() / 1000;
      const elapsed = () => s.acc + (s.run ? now() - s.t0 : 0);
      const body = {
        step(h) {
          // A stiff spring flies the hands back with a small overshoot.
          spring(s.off, 170, 0.6, h);
          spring(s.moff, 170, 0.6, h);
          spring(s.wb, 1100, 0.12, h);
          spring(s.cr, 1400, 0.55, h);
          spring(s.sb, 1400, 0.55, h);
        },
        busy() {
          const a = rest(s.off), b = rest(s.moff), c = rest(s.wb), d = rest(s.cr), e = rest(s.sb);
          return s.run || !(a && b && c && d && e);
        },
        draw() {
          const el2 = elapsed(), sec = Math.floor(el2);
          if (s.run && sec !== s.sec) { s.sec = sec; second(); }
          // Reduced motion steps the hand once a second.
          const sw = reduce ? sec : el2;
          const ha = mod((sw / 60) * TAU, TAU) + s.off.x + s.wb.x, ma = mod((el2 / 1800) * TAU, TAU) + s.moff.x;
          const r = `rotate(${f2(ha * 57.2958)} ${CX} ${CY})`;
          set(hg, 'transform', r);
          set(hsr, 'transform', r);
          set(mh, 'transform', `rotate(${f2(ma * 57.2958)} ${CX} ${MY})`);
          set(cg, 'transform', `translate(0 ${f2(9 * s.cr.x)})`);
          set(sp, 'transform', `translate(0 ${f2(8 * s.sb.x)})`);
          cap.paint(clamp(s.cr.x) * 0.7);
          pusher.paint(clamp(s.sb.x) * 0.7);
        },
      };
      function toggle() {
        if (s.run) {
          s.acc = elapsed(); s.run = false;
          // The stopped hand overshoots and quivers.
          if (!reduce) s.wb.v += 1.4;
        } else { s.t0 = now(); s.run = true; s.sec = Math.floor(s.acc); }
        crown(s.run);
        crBtn.setAttribute('aria-pressed', String(s.run));
        wake(body);
      }
      // A running watch flies back and runs on from zero.
      function zero() {
        const el2 = elapsed(), far = el2 > 0.05 || Math.abs(s.off.x) > 0.05;
        crown(false);
        if (far) {
          whirr(clamp(0.4 + mod(el2, 60) / 60));
          s.off.x += mod(((reduce ? Math.floor(el2) : el2) / 60) * TAU, TAU); s.off.v = 0;
          s.moff.x += mod((el2 / 1800) * TAU, TAU); s.moff.v = 0;
        }
        s.acc = 0; s.t0 = now(); s.sec = 0;
        wake(body);
      }
      const press = which => { (which === 'crown' ? s.cr : s.sb).t = 1; if (which === 'crown') toggle(); else zero(); };
      const lift = which => { (which === 'crown' ? s.cr : s.sb).t = 0; wake(body); };
      // The reset button zeroes; anywhere else works the crown.
      let pid = null, held = null, kb = null, keyAt = 0;
      wEl.addEventListener('pointerdown', e => {
        if (pid != null || kb || e.button > 0) return;
        pid = e.pointerId;
        try { wEl.setPointerCapture(e.pointerId); } catch {}
        held = e.target === rsBtn ? 'reset' : 'crown';
        press(held);
      });
      const up = e => { if (e.pointerId === pid) { pid = null; lift(held); held = null; } };
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => wEl.addEventListener(t, up));
      [[crBtn, 'crown'], [rsBtn, 'reset']].forEach(([btn, which]) => {
        btn.addEventListener('keydown', e => {
          if (!KEYS.includes(e.key)) return;
          e.preventDefault();
          if (!e.repeat && !kb && pid == null) { kb = which; press(which); }
        });
        btn.addEventListener('keyup', e => {
          if (!KEYS.includes(e.key) || kb !== which) return;
          e.preventDefault();
          kb = null; keyAt = performance.now();
          lift(which);
        });
        btn.addEventListener('blur', () => { if (kb === which) { kb = null; lift(which); } });
        // Assistive tech clicks without key events; they get a short tap.
        btn.addEventListener('click', e => {
          if (e.detail !== 0 || performance.now() - keyAt < 300 || kb || pid != null) return;
          press(which);
          later(() => lift(which), 110);
        });
      });
      moves.push({
        el: wEl,
        shuffle() {
          if (pid != null || kb) return;
          press('crown');
          later(() => lift('crown'), 110);
        },
        reset() {
          if (pid != null || kb) return;
          if (s.run) toggle();
          if (elapsed() > 0.05) { press('reset'); later(() => lift('reset'), 110); }
        },
      });
      return body;
    })());
    return { bodies, moves, destroy() { timers.forEach(clearTimeout); } };
  },
};
