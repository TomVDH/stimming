import {
  NS, reduce, TAU, PI, D2R, R2D, clamp, lerp, mod, f2, f3, rnd, angDiff, KEYS, css, mixLch, ramp, C, TICK, BUTTER, el, set, nid, grad, DOWN, blur, LIGHT, svgIn, mat, skin, WELL, well, shine, wake, sleep, S, spring, rest, board, snd, BEZEL,
} from '../kit.js';

const MARKUP = `<div class="grp"><div class="ctl safety" id="safety" role="group" aria-label="Safety switch"><button class="hit" type="button" aria-label="Safety cover" aria-expanded="false" aria-controls="arm"></button><button class="hit arm" id="arm" type="button" role="switch" aria-label="Armed switch" aria-checked="false" aria-disabled="true"></button></div></div>`;

export default {
  id: 'safe', slot: 'small',
  mount(cell) {
    cell.insertAdjacentHTML('beforeend', MARKUP);
    const bodies = [], moves = [];
    // A striped navy mount, a tinted red cover, a cream lever under it.
    const safeEl = document.getElementById('safety');
    board.safety = { el: safeEl };
    bodies.push((() => {
      const VW = 100, VH = 156, HY = 19, svg = svgIn(safeEl, `0 0 ${VW} ${VH}`), defs = svg.k.defs;
      const [coverBtn, armBtn] = safeEl.querySelectorAll('button');
      const mount = skin(svg, svg, 'rect', { width: VW, height: VH, rx: 16 }, mat(C.navy, 0), { rim: 2.5, shadow: { b: 5, y: 7, o: 0.55 } });
      // Butter hazard stripes run round the mount, under its rim light.
      const frame = el('clipPath', { id: nid('c') }, defs);
      el('rect', { x: 4, y: 4, width: VW - 8, height: VH - 8, rx: 12 }, frame);
      let stripes = '';
      for (let k = 0; k < VW + VH + 16; k += 16) stripes += `M${k} 0h8l-${VH} ${VH}h-8Z`;
      el('path', { d: stripes, fill: BUTTER, opacity: 0.85, 'clip-path': `url(#${frame.id})` }, svg);
      void mount;
      well(svg, svg, 'rect', { x: 32, y: 38, width: 36, height: 102, rx: 18 }, { rim: 3.5 });
      const slot = el('clipPath', { id: nid('c') }, defs);
      el('rect', { x: 36, y: 42, width: 28, height: 94, rx: 14 }, slot);
      el('rect', { x: 36, y: 42, width: 28, height: 94, fill: grad(defs, 'linearGradient', DOWN, [[0, css([0.2, 0.06, 28])], [1, css([0.26, 0.08, 28])]]).url, 'clip-path': `url(#${slot.id})` }, svg);
      const glow = el('rect', { x: 36, width: 28, fill: grad(defs, 'linearGradient', DOWN, [[0, css([0.7, 0.17, 30])], [1, css([0.5, 0.18, 26])]]).url, 'clip-path': `url(#${slot.id})` }, svg);
      const lg = el('g', {}, svg);
      const lever = skin(svg, lg, 'rect', { x: 37, width: 26, height: 34, rx: 13 }, mat(C.cream, 0.12), { rim: 2, shadow: { b: 2.5, y: 3.5, o: 0.55 } });
      // The same dished thumb rest as the toggles, with a red pip.
      el('ellipse', { cx: 50, cy: 17, rx: 7.5, ry: 10, fill: grad(defs, 'linearGradient', DOWN, [[0, '#000', 0.2], [0.55, '#000', 0], [1, '#fff', 0.6]]).url }, lg);
      el('circle', { cx: 50, cy: 17, r: 2.6, fill: css([0.6, 0.17, 28]) }, lg);
      // The cover is tinted plastic, so the lever shows through faintly.
      const cg = el('g', { opacity: 0.88 }, svg);
      const lid = skin(svg, cg, 'rect', { x: 10, y: 20, width: 80, height: 124, rx: 15 }, mat(C.red, 0.16), { rim: 3, shadow: { b: 4, y: 5, o: 0.5 } });
      el('rect', { x: 26, y: 132, width: 48, height: 6, rx: 3, fill: css([0.46, 0.15, 24]) }, cg);
      skin(svg, svg, 'rect', { x: 5, y: 10, width: 90, height: 18, rx: 9 }, mat(C.steel, 0), { rim: 2, shadow: { b: 2.5, y: 3, o: 0.5 } });
      for (const cx of [19, 81]) el('circle', { cx, cy: HY, r: 3.2, fill: css([0.45, 0.012, 255]) }, svg);
      const s = { c: S(), p: S(), pr: S(), open: false, on: false, tm: 0, pid: null };
      const body = {
        step(h) {
          // Open, a loose spring flips the cover up; shut, a firm one.
          spring(s.c, s.open ? 260 : 620, s.open ? 0.3 : 0.5, h);
          // The seat stops a falling cover with a clack.
          if (s.c.x < 0) {
            if (s.c.v < -1) snd.shut(clamp(-s.c.v / 14));
            s.c.x = 0;
            if (s.c.v < 0) s.c.v *= -0.25;
          }
          // The hinge stop catches an overswing.
          if (s.c.x > 1.1) { s.c.x = 1.1; if (s.c.v > 0) s.c.v *= -0.3; }
          spring(s.p, 900, 0.55, h);
          spring(s.pr, 900, 0.6, h);
        },
        busy() { const a = rest(s.c), b = rest(s.p), c = rest(s.pr); return !(a && b && c); },
        draw() {
          // The cover turns about the hinge; past upright, its underside shows.
          const k = Math.cos(s.c.x * 98 * D2R);
          set(cg, 'transform', `translate(0 ${HY}) scale(1 ${f3(k)}) translate(0 ${-HY})`);
          lid.paint(k >= 0 ? 0.5 * (1 - k) : 0.8 - 0.2 * k);
          const p = s.p.x, sc = 1 - 0.06 * s.pr.x, cy = 117 - 56 * p;
          set(lg, 'transform', `translate(50 ${f2(cy)}) scale(${f3(sc)}) translate(-50 -17)`);
          set(glow, 'y', f2(cy));
          set(glow, 'height', f2(Math.max(0, 136 - cy)));
          set(glow, 'opacity', f3(clamp(p)));
          lever.paint(s.pr.x * 0.8);
        },
      };
      function arm(v) {
        s.on = v; s.p.t = +v;
        snd.flip(v, true);
        armBtn.setAttribute('aria-checked', String(v));
        board.set('armed', v);
      }
      function cover(open) {
        clearTimeout(s.tm);
        if (open === s.open) return;
        // Shutting the cover pushes a live switch off.
        if (!open && s.on) arm(false);
        s.open = open; s.c.t = +open;
        if (open) snd.lift();
        else if (reduce) snd.shut(1);
        coverBtn.setAttribute('aria-expanded', String(open));
        armBtn.setAttribute('aria-disabled', String(!open));
        wake(body);
      }
      function toggle(v) {
        if (v === s.on) return;
        arm(v);
        // Switched off, the cover is let go and snaps shut.
        if (!v) s.tm = setTimeout(() => cover(false), reduce ? 0 : 170);
        wake(body);
      }
      function blocked() {
        snd.block();
        // The shut cover rattles on its seat.
        if (!reduce) { s.c.v = 2.4; wake(body); }
      }
      safeEl.addEventListener('pointerdown', e => {
        if (s.pid != null || e.button > 0) return;
        s.pid = e.pointerId;
        try { safeEl.setPointerCapture(e.pointerId); } catch {}
        const r = safeEl.getBoundingClientRect(), y = ((e.clientY - r.top) / r.height) * VH;
        // Shut, a tap lifts the cover; open, the hinge shuts it and the rest flips.
        if (!s.open) cover(true);
        else if (y < 30) cover(false);
        else { s.pr.t = 1; toggle(!s.on); }
      });
      const up = e => { if (e.pointerId === s.pid) { s.pid = null; s.pr.t = 0; wake(body); } };
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => safeEl.addEventListener(t, up));
      coverBtn.addEventListener('click', () => cover(!s.open));
      armBtn.addEventListener('click', () => {
        if (!s.open) blocked();
        else { s.pr.v = 10; toggle(!s.on); }
      });
      armBtn.addEventListener('keydown', e => {
        const v = e.key === 'ArrowUp' ? true : e.key === 'ArrowDown' ? false : null;
        if (v === null) return;
        e.preventDefault();
        if (!s.open) blocked();
        else if (v !== s.on) { s.pr.v = 10; toggle(v); }
      });
      moves.push({
        el: safeEl,
        // Shuffle lifts the cover, and sometimes arms the switch too.
        shuffle() {
          if (s.pid != null) return;
          const r = Math.random();
          if (!s.open) { cover(true); if (r < 0.5) s.tm = setTimeout(() => { s.pr.v = 10; toggle(true); }, reduce ? 0 : 260); }
          else if (s.on || r < 0.5) { if (s.on) toggle(false); else cover(false); }
          else { s.pr.v = 10; toggle(true); }
        },
        reset() {
          if (s.pid != null) return;
          if (s.on) toggle(false);
          else cover(false);
        },
      });
      return body;
    })());
    return { bodies, moves, destroy() { board.safety = null; board.set('armed', false); } };
  },
};
