import {
  NS, reduce, TAU, PI, D2R, R2D, clamp, lerp, mod, f2, f3, rnd, angDiff, KEYS, css, mixLch, ramp, C, TICK, BUTTER, el, set, nid, grad, DOWN, blur, LIGHT, svgIn, mat, skin, WELL, well, shine, wake, sleep, S, spring, rest, board, snd, BEZEL,
} from '../kit.js';

const MARKUP = `<div class="grp" role="group" aria-label="Keys"><button class="ctl key" type="button" aria-label="Key 1"></button><button class="ctl key" type="button" aria-label="Key 2"></button><button class="ctl key" type="button" aria-label="Key 3"></button><button class="ctl key" type="button" aria-label="Latching key" aria-pressed="false"></button></div>`;

export default {
  id: 'keys', slot: 'row',
  mount(cell) {
    cell.insertAdjacentHTML('beforeend', MARKUP);
    const bodies = [], moves = [];
    board.keys = { els: [...document.querySelectorAll('.key')], latch: document.querySelector('.key[aria-pressed]') };
    // Cream caps with a dished top; the latching key is mint with a pip.
    document.querySelectorAll('.key').forEach(btn => {
      const latch = btn.hasAttribute('aria-pressed'), col = latch ? C.mint : C.cream;
      const svg = svgIn(btn, '0 0 100 100'), defs = svg.k.defs;
      // The skirt is the cap's side, a shade down from its top.
      const skirt = skin(svg, svg, 'rect', { x: 2, y: 4, width: 96, height: 94, rx: 20 }, mat([col[0] - 0.2, col[1] * 1.1, col[2]], 0.05), { rim: 2, sheen: false, shadow: { b: 4, y: 6, o: 0.6 } });
      const tg = el('g', {}, svg);
      const top = skin(svg, tg, 'rect', { x: 10, y: 4, width: 80, height: 72, rx: 16 }, mat(col, 0.12), { rim: 2.5 });
      el('rect', { x: 18, y: 11, width: 64, height: 58, rx: 13, fill: grad(defs, 'linearGradient', DOWN, [[0, '#000', 0.09], [0.5, '#000', 0], [1, '#fff', 0.35]]).url }, tg);
      const pip = latch ? el('circle', { cx: 50, cy: 20, r: 5.5 }, tg) : null;
      if (pip) el('circle', { cx: 50, cy: 20, r: 5.5, fill: 'none', stroke: '#000', 'stroke-opacity': 0.25, 'stroke-width': 1.5 }, tg);
      const PIP = ramp([0.52, 0.08, 168], [0.97, 0.06, 140]);
      const s = { d: S(), lk: S(), held: false, locked: false, pid: null, kb: false, keyAt: 0 };
      const body = {
        step(h) {
          // Fast firm downstroke, bouncy return, a softer catch when latched.
          if (s.held) spring(s.d, 1800, 0.7, h);
          else if (s.locked) spring(s.d, 900, 0.45, h);
          else spring(s.d, 650, 0.32, h);
          spring(s.lk, 400, 0.8, h);
        },
        busy() { const a = rest(s.d), b = rest(s.lk); return !(a && b); },
        draw() {
          const d = s.d.x, sq = clamp(s.d.v / 16, -1, 1), sc = 1 - 0.05 * clamp(d, -0.3, 1);
          // The top sinks toward the board and squashes with its speed.
          set(skirt.shape, 'y', f2(4 + 6 * d));
          set(skirt.shape, 'height', f2(94 - 6 * d));
          // Pressed, the cap nears the panel and its shadow tightens.
          set(skirt.sh, 'opacity', f3(0.6 - 0.3 * clamp(d)));
          set(skirt.sh, 'transform', `translate(0 ${f2(6 - 4 * clamp(d))})`);
          set(tg, 'transform', `translate(50 ${f2(40 + 8 * d)}) scale(${f3(sc * (1 + 0.07 * sq))} ${f3(sc * (1 - 0.09 * sq))}) translate(-50 -40)`);
          top.paint(d * 0.9);
          skirt.paint(d * 0.5);
          if (pip) set(pip, 'fill', PIP(s.lk.x));
        },
      };
      // Only a hand on a plain key fires a primed board.
      function press(auto) {
        s.held = true; s.d.t = 1; snd.down();
        if (!auto && !latch && board.primed) board.fire();
        wake(body);
      }
      function release() {
        s.held = false;
        snd.up();
        if (latch) {
          s.locked = !s.locked;
          s.lk.t = +s.locked;
          snd.latch(s.locked);
          btn.setAttribute('aria-pressed', String(s.locked));
          board.set('latched', s.locked);
        }
        s.d.t = s.locked ? 0.6 : 0;
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
      // Keys hold down for as long as Space or Enter is held.
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
      // Assistive tech clicks without key events; they get a short tap.
      const tap = auto => { if (s.held || s.kb || s.pid != null) return; press(auto); setTimeout(release, 120); };
      btn.addEventListener('click', e => {
        if (e.detail !== 0 || performance.now() - s.keyAt < 300) return;
        tap(false);
      });
      moves.push({
        el: btn,
        // Shuffle taps about half the keys.
        shuffle() { if (Math.random() < 0.5) tap(true); },
        // Reset taps a latched key loose.
        reset() { if (s.locked) tap(true); },
      });
      bodies.push(body);
    });
    return { bodies, moves, destroy() { board.keys = null; board.set('latched', false); } };
  },
};
