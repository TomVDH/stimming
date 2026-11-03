import { reduce, clamp, f2, f3, KEYS, css, ramp, C, el, set, grad, DOWN, svgIn, mat, skin, well, wake, S, spring, rest, snd } from '../kit.js';

const COLS = ['coral', 'butter', 'mint', 'sky', 'lilac'];
const MARKUP = `<div class="grp" role="radiogroup" aria-label="Radio presets">${COLS.map((c, i) => `<button class="ctl preset" type="button" role="radio" aria-checked="${i === 0}" aria-label="Preset ${i + 1}" data-c="${c}"></button>`).join('')}</div>`;

// Latch: a heavy clunk, then the catch bar ticks.
const clunk = () => snd.play('radio-clunk', 0.03, 0.14, (t, P, G) => {
  snd.hiss(t, 'lowpass', 650 * P, 0.9, 0.05, 0.6 * G);
  snd.hiss(t, 'bandpass', 1800 * P, 1.4, 0.006, 0.2 * G);
  snd.ring(t, 85 * P, 62 * P, 0.11, 0.5 * G);
  snd.ring(t + 0.018, 2300 * P, 2260 * P, 0.035, 0.035 * G);
});
// The old preset springs out with a lighter clack.
const clack = () => snd.play('radio-clack', 0.03, 0.08, (t, P, G) => {
  snd.hiss(t, 'bandpass', 2600 * P, 1.3, 0.01, 0.28 * G);
  snd.ring(t, 300 * P, 240 * P, 0.03, 0.1 * G);
  snd.ring(t, 1400 * P, 1350 * P, 0.06, 0.02 * G);
});
// Pressing the preset already down: a muted tap.
const dull = () => snd.play('radio-dull', 0.03, 0.03, (t, P, G) => {
  snd.hiss(t, 'lowpass', 1100 * P, 0.8, 0.014, 0.18 * G);
});

export default {
  id: 'radio', slot: 'row',
  css: `.p-radio .grp { --n: 5; --sr: 5.7692; } .p-radio .preset { --ar: 120 / 104; border-radius: 14px; }`,
  mount(cell) {
    cell.insertAdjacentHTML('beforeend', MARKUP);
    const bodies = [], moves = [];
    // Five cream plungers in sunk slots; a latched one sits LAT deep.
    const LAT = 0.62, grp = cell.querySelector('.grp'), btns = [...cell.querySelectorAll('.preset')];
    const timers = new Set();
    const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); };
    let cur = 0;
    const items = btns.map((btn, i) => {
      const svg = svgIn(btn, '0 0 120 104'), defs = svg.k.defs, col = C[btn.dataset.c], cr = C.cream;
      well(svg, svg, 'rect', { width: 120, height: 104, rx: 16 }, { rim: 4 });
      // The skirt is the plunger's side, a shade down from its face.
      const skirt = skin(svg, svg, 'rect', { x: 8, y: 10, width: 104, height: 88, rx: 12 }, mat([cr[0] - 0.24, cr[1] * 1.6, cr[2]], 0.05), { rim: 2, sheen: false, shadow: { b: 4, y: 5, o: 0.6 } });
      const tg = el('g', {}, svg);
      const top = skin(svg, tg, 'rect', { x: 12, y: 8, width: 96, height: 72, rx: 10 }, mat(cr, 0.12), { rim: 2.5 });
      el('rect', { x: 18, y: 14, width: 84, height: 60, rx: 8, fill: grad(defs, 'linearGradient', DOWN, [[0, '#000', 0.08], [0.5, '#000', 0], [1, '#fff', 0.35]]).url }, tg);
      // The coloured tab brightens while its preset is down.
      const TAB = ramp([col[0] - 0.22, col[1] * 0.55, col[2]], col);
      const tab = el('rect', { x: 34, y: 18, width: 52, height: 11, rx: 5.5 }, tg);
      el('rect', { x: 34, y: 18, width: 52, height: 11, rx: 5.5, fill: 'none', stroke: '#000', 'stroke-opacity': 0.2, 'stroke-width': 1 }, tg);
      // The number is cut in: dark glyph, lit lower edge.
      const num = { x: 60, dy: '0.36em', 'font-family': 'Gabarito, sans-serif', 'font-weight': 800, 'font-size': 30, 'text-anchor': 'middle' };
      el('text', { ...num, y: 56, fill: '#fff', 'fill-opacity': 0.55 }, tg).textContent = String(i + 1);
      el('text', { ...num, y: 54.5, fill: css([0.46, 0.03, 80]) }, tg).textContent = String(i + 1);

      const on = i === cur;
      const s = { d: S(on ? LAT : 0), lk: S(+on), down: on, held: false, pid: null, kb: false, keyAt: 0 };
      const body = {
        step(h) {
          // A firm push and a soft catch when latched.
          // A freed plunger pops out with a springy overshoot.
          if (s.held) spring(s.d, 1800, 0.7, h);
          else if (s.down) spring(s.d, 1100, 0.55, h);
          else spring(s.d, 520, 0.22, h);
          spring(s.lk, 400, 0.8, h);
        },
        busy() { const a = rest(s.d), b = rest(s.lk); return !(a && b); },
        draw() {
          const d = clamp(s.d.x, -0.35, 1.1), sq = clamp(s.d.v / 16, -1, 1), sc = 1 - 0.04 * clamp(d, -0.3, 1);
          // The face sinks into the slot and the side shortens under it.
          set(skirt.shape, 'y', f2(10 + 14 * d));
          set(skirt.shape, 'height', f2(88 - 14 * d));
          set(skirt.sh, 'opacity', f3(0.6 - 0.35 * clamp(d)));
          set(skirt.sh, 'transform', `translate(0 ${f2(5 - 3.5 * clamp(d))})`);
          set(tg, 'transform', `translate(60 ${f2(44 + 14 * d)}) scale(${f3(sc * (1 + 0.06 * sq))} ${f3(sc * (1 - 0.08 * sq))}) translate(-60 -44)`);
          top.paint(clamp(d) * 0.9);
          skirt.paint(clamp(d) * 0.5);
          set(tab, 'fill', TAB(s.lk.x));
        },
      };
      bodies.push(body);
      return { btn, s, body };
    });

    function press(i) {
      const it = items[i];
      it.s.held = true; it.s.d.t = 1;
      wake(it.body);
      if (i === cur) { dull(); return; }
      clunk();
      const old = items[cur];
      cur = i;
      it.s.down = true; it.s.lk.t = 1; it.btn.setAttribute('aria-checked', 'true');
      old.s.down = false; old.s.lk.t = 0; old.btn.setAttribute('aria-checked', 'false');
      // The old preset pops out as the new one catches.
      later(() => {
        if (!old.s.held) { old.s.d.t = 0; if (!reduce) old.s.d.v -= 7; }
        clack();
        wake(old.body);
      }, reduce ? 0 : 40);
    }
    function release(i) {
      const s = items[i].s;
      s.held = false; s.d.t = s.down ? LAT : 0;
      wake(items[i].body);
    }
    // Automatic and assistive presses get a short tap.
    function tap(i) {
      const s = items[i].s;
      if (s.held || s.kb || s.pid != null) return;
      press(i);
      later(() => release(i), 120);
    }
    items.forEach(({ btn, s }, i) => {
      btn.addEventListener('pointerdown', e => {
        if (s.pid != null || s.kb || e.button > 0) return;
        s.pid = e.pointerId;
        try { btn.setPointerCapture(e.pointerId); } catch {}
        press(i);
      });
      const up = e => { if (e.pointerId === s.pid) { s.pid = null; release(i); } };
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => btn.addEventListener(t, up));
      btn.addEventListener('keydown', e => {
        // Arrows move along the bank and press the next preset.
        const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (d) {
          e.preventDefault();
          const j = (i + d + 5) % 5;
          items[j].btn.focus();
          tap(j);
          return;
        }
        if (!KEYS.includes(e.key)) return;
        e.preventDefault();
        if (!e.repeat && !s.kb && s.pid == null) { s.kb = true; press(i); }
      });
      btn.addEventListener('keyup', e => {
        if (!KEYS.includes(e.key) || !s.kb) return;
        e.preventDefault();
        s.kb = false; s.keyAt = performance.now();
        release(i);
      });
      btn.addEventListener('blur', () => { if (s.kb) { s.kb = false; release(i); } });
      btn.addEventListener('click', e => {
        if (e.detail !== 0 || performance.now() - s.keyAt < 300) return;
        tap(i);
      });
    });
    moves.push({
      el: grp,
      // Shuffle presses one of the other presets.
      shuffle() { tap((cur + 1 + Math.floor(Math.random() * 4)) % 5); },
      reset() { if (cur !== 0) tap(0); },
    });
    return { bodies, moves, destroy() { timers.forEach(clearTimeout); timers.clear(); } };
  },
};
