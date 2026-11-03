import {
  reduce, TAU, R2D, clamp, f2, f3, rnd, angDiff, KEYS, css, C, el, set, svgIn, mat, skin, wake, S, spring, rest, snd,
} from '../kit.js';

const MARKUP = `<div class="grp"><div class="ctl jbox" id="popup" tabindex="0" role="button" aria-label="Jack-in-the-box, turn the crank"></div></div>`;

// C major pentatonic from C6; the tune walks it up and down.
const SCALE = [1046.5, 1174.66, 1318.51, 1567.98, 1760, 2093, 2349.32];
const TUNE = [0, 2, 4, 3, 2, 0, 1, 3, 5, 4, 3, 2];
// The lid bursts open on the last note of the tune.
const POP_AT = TUNE.length;
// One note per sixth of a turn.
const STEP = TAU / 6;

// A music-box tine: a tick, a bright sine and a glassy partial.
const note = f => snd.play('jb-note', 0.05, 0.6, (t, P, G) => {
  const k = 1 + (P - 1) * 0.05;
  snd.hiss(t, 'highpass', 5200 * P, 0.8, 0.003, 0.12 * G);
  snd.ring(t, f * k, f * k, 0.55, 0.085 * G);
  snd.ring(t, 3.01 * f * k, 3.01 * f * k, 0.14, 0.018 * G);
});
// The lid flies open and the spring sproings.
const pop = () => snd.play('jb-pop', 0.3, 0.7, (t, P, G) => {
  snd.hiss(t, 'bandpass', 2400 * P, 1, 0.035, 0.4 * G);
  snd.ring(t, 170 * P, 640 * P, 0.16, 0.12 * G, 'triangle');
  const ac = snd.kit.ac, o = snd.ring(t + 0.05, 430 * P, 250 * P, 0.6, 0.09 * G);
  const lfo = ac.createOscillator(), depth = ac.createGain();
  lfo.frequency.value = 13 * P;
  depth.gain.setValueAtTime(70 * P, t + 0.05);
  depth.gain.exponentialRampToValueAtTime(3, t + 0.6);
  lfo.connect(depth); depth.connect(o.frequency);
  lfo.start(t + 0.05); lfo.stop(t + 0.66);
});
// The lid shuts with a wooden clack.
const shut = () => snd.play('jb-shut', 0.08, 0.08, (t, P, G) => {
  snd.hiss(t, 'bandpass', 1700 * P, 1.6, 0.016, 0.4 * G);
  snd.ring(t, 520 * P, 470 * P, 0.05, 0.12 * G);
});
// The crank's pawl clicks between notes.
const pawl = () => snd.play('jb-pawl', 0.03, 0.02, (t, P, G) => {
  snd.hiss(t, 'highpass', 3800 * P, 1, 0.003, 0.12 * G);
});

export default {
  id: 'popup', slot: 'small',
  css: `.p-popup .grp { --sr: 1; } .p-popup .jbox { --ar: 1; border-radius: 18px; cursor: grab; }`,
  mount(cell) {
    cell.insertAdjacentHTML('beforeend', MARKUP);
    const bodies = [], moves = [];
    // A coral box with a cream panel and a star; a steel crank on its side.
    const boxEl = cell.querySelector('.jbox');
    bodies.push((() => {
      const svg = svgIn(boxEl, '0 0 200 200'), defs = svg.k.defs;
      // Box front, opening line, axle, head home and head out.
      const BX = 22, BW = 128, TOP = 84, BOT = 194, HX = 86, AX = 150, AY = 139, HOME = 146, OUT = 33;
      // The lid hinges on the box's back edge.
      const lid = el('path', {}, svg);
      const LID_TOP = css(C.coral), LID_IN = css([0.8, 0.05, 40]);
      const lidSheen = el('path', { fill: svg.k.sheen, opacity: 0.6 }, svg);
      const lidRim = el('path', { fill: 'none', stroke: '#fff', 'stroke-opacity': 0.35, 'stroke-width': 2, 'stroke-linecap': 'round' }, svg);
      // The neck is a steel coil; the head rides on top.
      // The dark mouth of the box shows once the lid lifts.
      const mouth = el('rect', { x: BX + 5, y: TOP - 12, width: BW - 10, height: 14, rx: 5, fill: css([0.2, 0.03, 30]), opacity: 0 }, svg);
      const hg = el('g', {}, svg);
      const neck = el('path', { fill: 'none', stroke: css(C.steel), 'stroke-width': 4.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, hg);
      const head = el('g', {}, hg);
      skin(svg, head, 'circle', { r: 30 }, mat(C.butter, 0), { rim: 2.5, shadow: { b: 4, y: 5, o: 0.45 } });
      const INK = css([0.25, 0.03, 270]);
      [-11, 11].forEach(x => {
        el('circle', { cx: x, cy: -5, r: 4, fill: INK }, head);
        el('circle', { cx: x - 1.2, cy: -6.4, r: 1.3, fill: '#fff' }, head);
        el('circle', { cx: x * 1.6, cy: 7, r: 5.5, fill: css(C.coral), opacity: 0.55 }, head);
      });
      el('path', { d: 'M-10 9Q0 19 10 9', fill: 'none', stroke: INK, 'stroke-width': 3, 'stroke-linecap': 'round' }, head);
      skin(svg, head, 'circle', { cx: 0, cy: 3, r: 5 }, mat(C.red, 0), { rim: 1.2, sheen: false });
      // The box front hides the head while it is home.
      skin(svg, svg, 'rect', { x: BX, y: TOP, width: BW, height: BOT - TOP, rx: 10 }, mat(C.coral, 0), { rim: 3, shadow: { b: 6, y: 8, o: 0.6 } });
      skin(svg, svg, 'rect', { x: BX + 12, y: TOP + 12, width: BW - 24, height: BOT - TOP - 24, rx: 7 }, mat(C.cream, 0), { rim: 2, sheen: false });
      // A five-point star sits on the panel.
      const star = [];
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 10 : 24, a = (i * TAU) / 10;
        star.push(`${f2(HX + r * Math.sin(a))} ${f2(TOP + 55 - r * Math.cos(a))}`);
      }
      skin(svg, svg, 'path', { d: `M${star.join('L')}Z`, 'stroke-linejoin': 'round' }, mat(C.coral, 0), { rim: 1.5, sheen: false });
      // The crank: a steel hub, an arm and a cream knob.
      skin(svg, svg, 'circle', { cx: AX, cy: AY, r: 13 }, mat(C.steel, 0), { rim: 2, shadow: { b: 3, y: 4, o: 0.5 } });
      const cg = el('g', {}, svg);
      skin(svg, cg, 'rect', { x: AX - 4, y: AY - 34, width: 8, height: 36, rx: 4 }, mat([0.72, 0.012, 255], 0), { rim: 1.5, shadow: { b: 2, y: 3, o: 0.5 } });
      skin(svg, cg, 'circle', { cx: AX, cy: AY - 34, r: 10 }, mat(C.cream, 0.12), { rim: 2, shadow: { b: 2, y: 3, o: 0.5 } });
      el('circle', { cx: AX, cy: AY, r: 4, fill: css([0.45, 0.015, 258]) }, svg);

      const s = {
        ang: 0, auto: 0, k: 0, count: 0, out: false, hy: S(HOME), lid: S(), wob: S(), sq: S(),
        pid: null, rect: null, prev: 0, mode: '', x0: 0, y0: 0, moved: false, shutArmed: false,
      };
      // Each new sixth of a turn plays the next note of the tune.
      function turned() {
        const k = Math.floor(s.ang / STEP + 1e-6);
        while (k > s.k) {
          s.k++;
          note(SCALE[TUNE[s.count % TUNE.length]]);
          s.count++;
          if (s.count >= POP_AT && !s.out) burst();
        }
        if (k < s.k) s.k = k;
      }
      function burst() {
        s.out = true; s.shutArmed = false;
        s.lid.t = 1; s.hy.t = OUT;
        if (!reduce) { s.hy.v -= 700; s.wob.v += (Math.random() < 0.5 ? -1 : 1) * rnd(220, 320); s.lid.v += 9; }
        pop();
        boxEl.setAttribute('aria-label', 'Jack-in-the-box, open: press to push the head back in');
        wake(body);
      }
      function pushIn() {
        if (!s.out) return;
        s.out = false; s.count = 0; s.shutArmed = true;
        s.hy.t = HOME;
        if (!reduce) s.sq.v += 2;
        boxEl.setAttribute('aria-label', 'Jack-in-the-box, turn the crank');
        wake(body);
      }
      const body = {
        step(h) {
          // Keys and shuffle turn the crank at a steady clip.
          if (s.auto > s.ang && s.pid == null) {
            s.ang = reduce ? s.auto : Math.min(s.auto, s.ang + 10 * h);
            turned();
          }
          // The head flies out on a loose spring; it goes home on a firm one.
          if (s.out) spring(s.hy, 170, 0.12, h); else spring(s.hy, 320, 0.8, h);
          spring(s.wob, 140, 0.09, h);
          spring(s.sq, 500, 0.25, h);
          // The lid waits for the head to drop inside, then closes.
          if (!s.out && s.hy.x > TOP + 12) s.lid.t = 0;
          spring(s.lid, s.out ? 260 : 380, s.out ? 0.3 : 0.5, h);
          if (s.shutArmed && s.lid.t === 0 && s.lid.x < 0.02) { s.shutArmed = false; shut(); if (!reduce) s.lid.v += 1.2; }
        },
        busy() {
          const a = rest(s.hy, 0.05), b = rest(s.lid), c = rest(s.wob, 0.02), d = rest(s.sq);
          return !(a && b && c && d) || s.auto > s.ang + 1e-4 || s.shutArmed;
        },
        draw() {
          // The lid swings back: its front edge rises past the hinge.
          const ph = clamp(s.lid.x, -0.05, 1.15) * 1.95, yb = TOP - 16, yf = yb + 16 * Math.cos(ph) - 62 * Math.sin(ph);
          const sp = 6 * Math.cos(ph);
          const ld = `M${BX + 2} ${f2(yb)}H${BX + BW - 2}L${f2(BX + BW + sp)} ${f2(yf)}H${f2(BX - sp)}Z`;
          set(lid, 'd', ld); set(lidSheen, 'd', ld);
          set(lid, 'fill', yf > yb ? LID_TOP : LID_IN);
          set(lidRim, 'd', `M${f2(BX - sp + 4)} ${f2(yf)}H${f2(BX + BW + sp - 4)}`);
          set(lidRim, 'stroke-opacity', yf > yb ? 0.35 : 0.12);
          set(mouth, 'opacity', f3(clamp(s.lid.x * 3)));
          // The coil stretches from the opening to the chin.
          const hy = s.hy.x, base = TOP - 4, chin = hy + 26, L = base - chin;
          if (L > 2) {
            let d = `M${HX} ${f2(base)}`;
            for (let i = 1; i <= 8; i++) d += `L${HX + (i % 2 ? 12 : -12)} ${f2(base - (L * (i - 0.5)) / 8.5)}`;
            set(neck, 'd', d + `L${HX} ${f2(chin)}`);
          } else set(neck, 'd', 'M0 0');
          const q = clamp(s.sq.x, -0.2, 0.2) + clamp(-s.hy.v / 4000, -0.12, 0.12);
          set(hg, 'transform', `rotate(${f2(s.wob.x)} ${HX} ${base})`);
          set(head, 'transform', `translate(${HX} ${f2(hy)}) rotate(${f2(s.wob.x * 0.5)}) scale(${f3(1 - 0.5 * q)} ${f3(1 + q)})`);
          set(cg, 'transform', `rotate(${f2((s.ang * R2D) % 360)} ${AX} ${AY})`);
        },
      };
      const local = e => [((e.clientX - s.rect.left) / s.rect.width) * 200, ((e.clientY - s.rect.top) / s.rect.height) * 200];
      const polar = ([x, y]) => [Math.atan2(x - AX, AY - y), Math.hypot(x - AX, y - AY)];
      boxEl.addEventListener('pointerdown', e => {
        if (s.pid != null || e.button > 0) return;
        s.pid = e.pointerId;
        try { boxEl.setPointerCapture(e.pointerId); } catch {}
        s.rect = boxEl.getBoundingClientRect();
        const p = local(e);
        s.x0 = e.clientX; s.y0 = e.clientY; s.moved = false;
        // A press on the head pushes it home; anywhere else grips the crank.
        if (s.out && Math.hypot(p[0] - HX, p[1] - s.hy.x) < 38) { s.mode = 'head'; pushIn(); return; }
        s.mode = 'crank'; s.prev = polar(p)[0]; s.auto = s.ang;
        boxEl.classList.add('held');
      });
      // The crank follows the finger round its axle; only forward turns play.
      boxEl.addEventListener('pointermove', e => {
        if (e.pointerId !== s.pid || s.mode !== 'crank') return;
        if (Math.hypot(e.clientX - s.x0, e.clientY - s.y0) > 5) s.moved = true;
        const [a, r] = polar(local(e));
        if (r < 6) return;
        const d = angDiff(a, s.prev);
        s.prev = a;
        if (d > 0) { s.ang += d; s.auto = s.ang; turned(); wake(body); }
      });
      const end = e => {
        if (e.pointerId !== s.pid) return;
        s.pid = null; boxEl.classList.remove('held');
        // A tap on the box turns the crank one note.
        if (s.mode === 'crank' && !s.moved && e.type === 'pointerup') step1();
        s.mode = '';
      };
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => boxEl.addEventListener(t, end));
      function step1(n = 1) {
        s.auto = (Math.floor(Math.max(s.auto, s.ang) / STEP + 1e-6) + n) * STEP;
        pawl();
        wake(body);
      }
      boxEl.addEventListener('keydown', e => {
        if (s.pid != null) return;
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') step1();
        else if (KEYS.includes(e.key)) { if (e.repeat) return; if (s.out) pushIn(); else step1(); }
        else return;
        e.preventDefault();
      });
      // Assistive tech clicks without key events.
      boxEl.addEventListener('click', e => { if (e.detail === 0) { if (s.out) pushIn(); else step1(); } });
      moves.push({
        el: boxEl,
        // Shuffle cranks two to four notes.
        shuffle() { if (s.pid == null) step1(2 + Math.floor(Math.random() * 3)); },
        // Reset shuts the head away and restarts the tune.
        reset() { if (s.pid != null) return; if (s.out) pushIn(); else s.count = 0; },
      });
      return body;
    })());
    return { bodies, moves, destroy() {} };
  },
};
