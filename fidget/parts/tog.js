import {
  NS, reduce, TAU, PI, D2R, R2D, clamp, lerp, mod, f2, f3, rnd, angDiff, KEYS, css, mixLch, ramp, C, TICK, BUTTER, el, set, nid, grad, DOWN, blur, LIGHT, svgIn, mat, skin, WELL, well, shine, wake, sleep, S, spring, rest, board, snd, BEZEL,
} from '../kit.js';

const MARKUP = `<div class="grp" role="group" aria-label="Switches"><button class="ctl toggle" type="button" role="switch" aria-checked="true" aria-label="Coral switch" data-c="coral"></button><button class="ctl toggle" type="button" role="switch" aria-checked="false" aria-label="Blue switch" data-c="sky"></button><button class="ctl toggle" type="button" role="switch" aria-checked="true" aria-label="Mint switch" data-c="mint"></button></div>`;

export default {
  id: 'tog', slot: 'small',
  mount(cell) {
    cell.insertAdjacentHTML('beforeend', MARKUP);
    const bodies = [], moves = [];
    // A raised bezel holds a sunk channel.
    // The channel lights in the switch colour below the lever.
    // The lever travels 58 units; its centre sits at 91 when off.
    const TY = 91, TT = 58;
    document.querySelectorAll('.toggle').forEach(btn => {
      const svg = svgIn(btn, '0 0 54 124'), defs = svg.k.defs, id = nid('t'), col = C[btn.dataset.c];
      const tone = (dl, k = 1) => css([col[0] + dl, col[1] * k, col[2]]);
      skin(svg, svg, 'rect', { width: 54, height: 124, rx: 27 }, BEZEL, { rim: 2, shadow: { b: 3, y: 4, o: 0.55 } });
      well(svg, svg, 'rect', { x: 7, y: 7, width: 40, height: 110, rx: 20 }, { rim: 3.5 });
      const clip = el('clipPath', { id }, defs);
      el('rect', { x: 10, y: 10, width: 34, height: 104, rx: 17 }, clip);
      const cp = `url(#${id})`;
      // A dark tint keeps the off channel from reading as a hole.
      el('rect', { x: 10, y: 10, width: 34, height: 104, fill: grad(defs, 'linearGradient', DOWN, [[0, tone(-0.5, 0.35)], [1, tone(-0.42, 0.45)]]).url, 'clip-path': cp }, svg);
      const glow = el('g', { 'clip-path': cp }, svg);
      const lit = el('rect', { x: 10, width: 34, fill: grad(defs, 'linearGradient', DOWN, [[0, tone(0.08, 0.85)], [0.5, tone(0)], [1, tone(-0.14, 1.05)]]).url }, glow);
      // A soft gloss strip runs down the lit channel.
      const gloss = el('rect', { x: 15, width: 6, rx: 3, fill: '#fff', opacity: 0.22 }, glow);
      const lg = el('g', {}, svg);
      const lever = skin(svg, lg, 'rect', { x: 10, width: 34, height: 44, rx: 17 }, mat(C.cream, 0.12), { rim: 2, shadow: { b: 3, y: 4, o: 0.6 } });
      // A dished thumb rest with a pip in the switch colour.
      el('ellipse', { cx: 27, cy: 22, rx: 10, ry: 13, fill: grad(defs, 'linearGradient', DOWN, [[0, '#000', 0.2], [0.55, '#000', 0], [1, '#fff', 0.6]]).url }, lg);
      el('circle', { cx: 27, cy: 22, r: 3.4, fill: tone(-0.04) }, lg);
      el('circle', { cx: 27, cy: 22, r: 3.4, fill: 'none', stroke: '#000', 'stroke-opacity': 0.22, 'stroke-width': 1 }, lg);

      const init = btn.getAttribute('aria-checked') === 'true';
      const s = { p: S(+init), pr: S(), on: init, pid: null, y0: 0, p0: 0, span: 1, drag: false };
      const body = {
        step(h) {
          // Free travel overshoots a little; a dragging finger damps it.
          spring(s.p, s.drag ? 1400 : 600, s.drag ? 0.9 : 0.55, h);
          spring(s.pr, 900, 0.6, h);
        },
        busy() { const a = rest(s.p), b = rest(s.pr); return !(a && b); },
        draw() {
          const p = s.p.x, st = clamp(Math.abs(s.p.v) * 0.012, 0, 0.1), sc = 1 - 0.06 * s.pr.x, cy = TY - TT * p;
          // The lever stretches along its travel while moving fast.
          set(lg, 'transform', `translate(27 ${f2(cy)}) scale(${f3(sc * (1 - 0.5 * st))} ${f3(sc * (1 + st))}) translate(-27 -22)`);
          // The colour fills the channel from the lever down.
          const h = f2(Math.max(0, 114 - cy));
          set(lit, 'y', f2(cy)); set(lit, 'height', h);
          set(gloss, 'y', f2(cy + 22)); set(gloss, 'height', f2(Math.max(0, 114 - cy - 30)));
          set(glow, 'opacity', f3(clamp(p)));
          lever.paint(s.pr.x * 0.8);
        },
      };
      function flip(v) {
        if (v !== s.on) snd.flip(v);
        s.on = v; s.p.t = +v; btn.setAttribute('aria-checked', String(v)); wake(body);
      }
      btn.addEventListener('pointerdown', e => {
        if (s.pid != null || e.button > 0) return;
        s.pid = e.pointerId;
        try { btn.setPointerCapture(e.pointerId); } catch {}
        s.y0 = e.clientY; s.p0 = s.p.x; s.drag = false;
        s.span = (btn.getBoundingClientRect().height * TT) / 124;
        s.pr.t = 1;
        wake(body);
      });
      btn.addEventListener('pointermove', e => {
        if (e.pointerId !== s.pid) return;
        const dy = e.clientY - s.y0;
        if (!s.drag && Math.abs(dy) > 5) s.drag = true;
        if (s.drag) { s.p.t = clamp(s.p0 - dy / s.span); wake(body); }
      });
      const up = e => {
        if (e.pointerId !== s.pid) return;
        s.pid = null; s.pr.t = 0;
        if (s.drag) { s.drag = false; flip(s.p.x + s.p.v * 0.05 > 0.5); }
        else if (e.type === 'pointerup') flip(!s.on);
        else wake(body);
      };
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => btn.addEventListener(t, up));
      // Keyboard clicks arrive with detail 0; pointer taps are handled above.
      btn.addEventListener('click', e => { if (e.detail === 0) { s.pr.v = 10; flip(!s.on); } });
      btn.addEventListener('keydown', e => {
        const v = e.key === 'ArrowUp' ? true : e.key === 'ArrowDown' ? false : null;
        if (v === null) return;
        e.preventDefault();
        if (v !== s.on) { s.pr.v = 10; flip(v); }
      });
      const to = v => { if (s.pid == null && v !== s.on) { s.pr.v = 10; flip(v); } };
      moves.push({ el: btn, shuffle: () => to(Math.random() < 0.5), reset: () => to(init) });
      bodies.push(body);
    });
    return { bodies, moves, destroy() {  } };
  },
};
