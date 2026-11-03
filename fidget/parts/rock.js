import {
  NS, reduce, TAU, PI, D2R, R2D, clamp, lerp, mod, f2, f3, rnd, angDiff, KEYS, css, mixLch, ramp, C, TICK, BUTTER, el, set, nid, grad, DOWN, blur, LIGHT, svgIn, mat, skin, WELL, well, shine, wake, sleep, S, spring, rest, board, snd, BEZEL,
} from '../kit.js';

const MARKUP = `<div class="grp" role="group" aria-label="Rockers"><button class="ctl rocker" type="button" role="switch" aria-checked="true" aria-label="Cream rocker" data-c="cream"></button><button class="ctl rocker" type="button" role="switch" aria-checked="false" aria-label="Coral rocker" data-c="coral"></button></div>`;

export default {
  id: 'rock', slot: 'small',
  mount(cell) {
    cell.insertAdjacentHTML('beforeend', MARKUP);
    const bodies = [], moves = [];
    // Two-part paddles in recessed wells; the pressed half sinks and darkens.
    document.querySelectorAll('.rocker').forEach(btn => {
      const svg = svgIn(btn, '0 0 64 104'), M = mat(C[btn.dataset.c], 0.16);
      // The same raised bezel as the toggles frames the well.
      skin(svg, svg, 'rect', { width: 64, height: 104, rx: 16 }, BEZEL, { rim: 2, shadow: { b: 3, y: 4, o: 0.55 } });
      well(svg, svg, 'rect', { x: 5, y: 5, width: 54, height: 94, rx: 12 }, { rim: 3.5 });
      const tg = el('g', {}, svg), bg = el('g', {}, svg);
      const top = skin(svg, tg, 'path', { d: 'M9 52V19A10 10 0 0 1 19 9H45A10 10 0 0 1 55 19V52Z' }, M, { rim: 2, shadow: { b: 2.5, y: 3, o: 0.45 } });
      const bot = skin(svg, bg, 'path', { d: 'M9 52H55V85A10 10 0 0 1 45 95H19A10 10 0 0 1 9 85Z' }, M, { rim: 2 });
      // I and O are engraved: a dark cut over a lit lower edge.
      const cut = (a, g) => {
        el(a[0], { ...a[1], fill: 'none', stroke: '#fff', 'stroke-opacity': 0.35, 'stroke-width': 2.6, 'stroke-linecap': 'round', transform: 'translate(0 1)' }, g);
        el(a[0], { ...a[1], fill: 'none', stroke: '#000', 'stroke-opacity': 0.4, 'stroke-width': 2.6, 'stroke-linecap': 'round' }, g);
      };
      // The marks ride their halves unscaled, so the O stays round.
      // Both half centres shift by -d / 2.
      const mk = el('g', {}, svg);
      cut(['line', { x1: 32, y1: 22, x2: 32, y2: 34 }], mk);
      cut(['circle', { cx: 32, cy: 74, r: 6 }], mk);
      const seam = el('line', { x1: 9, x2: 55, stroke: '#000', 'stroke-opacity': 0.3, 'stroke-width': 1.2 }, svg);
      const init = btn.getAttribute('aria-checked') === 'true';
      const s = { r: S(init ? 1 : -1), pr: S(), on: init, side: 1, pid: null };
      const body = {
        step(h) {
          spring(s.r, 1500, 0.5, h);
          // End stops catch the paddle as it rocks over.
          if (Math.abs(s.r.x) > 1) { s.r.x = Math.sign(s.r.x); if (s.r.x * s.r.v > 0) s.r.v *= -0.25; }
          spring(s.pr, 900, 0.6, h);
        },
        busy() { const a = rest(s.r), b = rest(s.pr); return !(a && b); },
        draw() {
          const r = s.r.x, d = 6 * r + 1.5 * s.pr.x * s.side;
          // The pressed half sinks and shortens; the other half rises.
          set(tg, 'transform', `translate(0 9) scale(1 ${f3((43 - d) / 43)}) translate(0 -9)`);
          set(bg, 'transform', `translate(0 95) scale(1 ${f3((43 + d) / 43)}) translate(0 -95)`);
          set(seam, 'y1', f2(52 - d)); set(seam, 'y2', f2(52 - d));
          set(mk, 'transform', `translate(0 ${f2(-d / 2)})`);
          top.paint(clamp(0.9 * r));
          bot.paint(clamp(-0.9 * r));
        },
      };
      function rock(v) {
        s.side = v ? 1 : -1;
        if (v === s.on) { snd.dead(); wake(body); return; }
        s.on = v; s.r.t = s.side;
        snd.rock(v);
        btn.setAttribute('aria-checked', String(v));
        wake(body);
      }
      btn.addEventListener('pointerdown', e => {
        if (s.pid != null || e.button > 0) return;
        s.pid = e.pointerId;
        try { btn.setPointerCapture(e.pointerId); } catch {}
        // The half under the finger is the half that goes down.
        const r = btn.getBoundingClientRect();
        s.pr.t = 1;
        rock(e.clientY - r.top < r.height / 2);
      });
      const up = e => { if (e.pointerId === s.pid) { s.pid = null; s.pr.t = 0; wake(body); } };
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => btn.addEventListener(t, up));
      btn.addEventListener('click', e => { if (e.detail === 0) { s.pr.v = 8; rock(!s.on); } });
      btn.addEventListener('keydown', e => {
        const v = e.key === 'ArrowUp' ? true : e.key === 'ArrowDown' ? false : null;
        if (v === null) return;
        e.preventDefault();
        s.pr.v = 8; rock(v);
      });
      const to = v => { if (s.pid == null && v !== s.on) { s.pr.v = 8; rock(v); } };
      moves.push({ el: btn, shuffle: () => to(Math.random() < 0.5), reset: () => to(init) });
      bodies.push(body);
    });
    return { bodies, moves, destroy() {  } };
  },
};
