import {
  reduce, R2D, clamp, f2, f3, rnd, KEYS, css, C, TICK, BUTTER, el, set, nid, grad, DOWN, svgIn, mat, skin, well, wake, S, spring, rest, snd,
} from '../kit.js';

const MARKUP = `<div class="ctl slevel wide" tabindex="0" role="slider" aria-label="Spirit level tilt" aria-valuemin="-10" aria-valuemax="10" aria-valuenow="0" aria-valuetext="Level"></div>`;

// The bubble lurches: a low liquid glug that bends up.
const glug = v => snd.play('level-glug', 0.22, 0.14, (t, P, G) => {
  G *= 0.3 + 0.7 * v;
  snd.ring(t, 170 * P, 300 * P, 0.07, 0.16 * G);
  snd.ring(t + 0.05, 230 * P, 380 * P, 0.06, 0.08 * G);
  snd.hiss(t, 'lowpass', 600 * P, 1.2, 0.06, 0.14 * G);
});
// Level found: a faint glassy tink.
const tink = () => snd.play('level-tink', 0.3, 0.2, (t, P, G) => {
  snd.ring(t, 2100 * P, 2090 * P, 0.18, 0.025 * G);
  snd.ring(t, 3150 * P, 3140 * P, 0.1, 0.012 * G);
});

export default {
  id: 'level', slot: 'band',
  css: `.p-level .slevel { border-radius: 10px; cursor: grab; }`,
  mount(cell) {
    cell.insertAdjacentHTML('beforeend', MARKUP);
    const bodies = [], moves = [];
    let watch = null;
    // A long cream body with coral end caps.
    // It holds a centre vial and two end vials.
    const lvEl = cell.querySelector('.slevel');
    bodies.push((() => {
      const VH = 100, CY = 50, svg = svgIn(lvEl, `0 0 600 ${VH}`), defs = svg.k.defs;
      const tg = el('g', {}, svg);
      const bodyK = skin(svg, tg, 'rect', { x: 12, y: 24, width: 576, height: 52, rx: 8 }, mat(C.cream, 0), { rim: 2.5, shadow: { b: 5, y: 7, o: 0.55 } });
      // A milled groove runs along the top face.
      const groove = el('rect', { x: 40, y: 29, width: 520, height: 2, rx: 1, fill: '#000', opacity: 0.1 }, tg);
      const ticks = el('path', { stroke: TICK, 'stroke-width': 1.6, 'stroke-linecap': 'round', fill: 'none' }, tg);
      // Shallow grip grooves fill the long stretches.
      const GROOVE = grad(defs, 'linearGradient', DOWN, [[0, '#000', 0.24], [0.5, '#000', 0.06], [1, '#fff', 0.6]]).url;
      const grips = [0, 1].map(() => el('rect', { y: 41, height: 16, rx: 8, fill: GROOVE }, tg));
      const SKYV = grad(defs, 'linearGradient', DOWN, [[0, css([0.86, 0.07, 228])], [0.5, css([0.76, 0.11, 236])], [1, css([0.66, 0.12, 242])]]).url;
      const MARK = css([0.4, 0.04, 250]);
      // A vial: window, sky liquid, two marks, one bubble.
      function vial(len, bl) {
        const win = well(svg, tg, 'rect', { y: 32, width: len, height: 34, rx: 17 }, { rim: 3 });
        const glass = el('rect', { y: 37, width: len - 10, height: 24, rx: 12, fill: SKYV }, tg);
        const clip = el('clipPath', { id: nid('c') }, defs);
        const cr = el('rect', { y: 37, width: len - 10, height: 24, rx: 12 }, clip);
        const inner = el('g', { 'clip-path': `url(#${clip.id})` }, tg);
        // The bubble: pale air, a dark rim, a bright glint above.
        const bg = el('g', {}, inner);
        el('ellipse', { rx: bl / 2, ry: 8.5, fill: css([0.97, 0.025, 210]), opacity: 0.92 }, bg);
        el('ellipse', { rx: bl / 2, ry: 8.5, fill: 'none', stroke: css([0.55, 0.1, 240]), 'stroke-width': 1.6, opacity: 0.7 }, bg);
        el('ellipse', { cx: -bl * 0.12, cy: -3.5, rx: bl * 0.24, ry: 2, fill: '#fff' }, bg);
        // The marks sit on the glass, over the bubble.
        const marks = [0, 1].map(() => el('line', { y1: 37, y2: 61, stroke: MARK, 'stroke-width': 2.4 }, inner));
        const lit = [0, 1].map(() => el('line', { y1: 37, y2: 61, stroke: BUTTER, 'stroke-width': 2.4 }, inner));
        // A gloss line runs along the glass.
        const gloss = el('rect', { y: 40, height: 3, rx: 1.5, fill: '#fff', opacity: 0.45 }, tg);
        return { len, bl, win, glass, cr, marks, lit, bg, gloss, x: 0, u: S(), lt: S(1), on: true };
      }
      const vials = [vial(200, 46), vial(96, 26), vial(96, 26)];
      // The vials differ in stiffness, so their bubbles slosh apart.
      const KB = [34, 52, 58];
      const caps = [0, 1].map(() => skin(svg, tg, 'rect', { y: 20, width: 30, height: 60, rx: 10 }, mat(C.coral, 0), { rim: 2, shadow: { b: 3, y: 4, o: 0.5 } }));

      let VW = 600, TD = 2;
      const s = { tilt: S(), pid: null, y0: 0, t0: 0, sg: 1, span: 40, pulse: 0, fast: false, rect: null };
      function place(v, cx) {
        v.x = cx;
        const x0 = cx - v.len / 2;
        set(v.win, 'x', f2(x0)); set(v.glass, 'x', f2(x0 + 5)); set(v.cr, 'x', f2(x0 + 5));
        set(v.gloss, 'x', f2(x0 + 14)); set(v.gloss, 'width', f2(v.len - 28));
        const g = v.bl / 2 + 3;
        [v.marks, v.lit].forEach(([a, b]) => { set(a, 'x1', f2(cx - g)); set(a, 'x2', f2(cx - g)); set(b, 'x1', f2(cx + g)); set(b, 'x2', f2(cx + g)); });
      }
      // The body follows the plate; grip slots appear on long plates.
      function fit() {
        const r = lvEl.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) VW = Math.max(320, Math.round((VH * r.width) / r.height));
        svg.setAttribute('viewBox', `0 0 ${VW} ${VH}`);
        const cx = VW / 2;
        set(bodyK.shape, 'width', VW - 24); set(groove, 'width', VW - 80);
        set(caps[0].shape, 'x', 6); set(caps[1].shape, 'x', VW - 36);
        const cw = clamp(VW * 0.24, 150, 230), ew = clamp(VW * 0.13, 64, 104);
        vials[0].len = cw; vials[1].len = vials[2].len = ew;
        [vials[0], vials[1], vials[2]].forEach(v => { set(v.win, 'width', v.len); set(v.glass, 'width', v.len - 10); set(v.cr, 'width', v.len - 10); });
        place(vials[0], cx); place(vials[1], 44 + ew / 2); place(vials[2], VW - 44 - ew / 2);
        // Ticks fill the bottom edge; every fifth is long.
        let d = '';
        for (let i = 0, x = 48; x < VW - 48; i++, x += 10) d += `M${x} ${i % 5 ? 70 : 67}V73`;
        set(ticks, 'd', d);
        const gx = 44 + ew + 16, gw = cx - cw / 2 - 16 - gx;
        // Short plates have no room for the grip slots.
        grips.forEach((g, i) => {
          set(g, 'width', f2(gw < 40 ? 0 : gw));
          set(g, 'x', f2(i ? VW - gx - gw : gx));
        });
        // Long plates tip less, so their ends stay on the plate.
        TD = clamp(R2D * Math.atan(15 / (VW / 2)), 0.9, 3);
        body.draw();
      }
      const body = {
        step(h) {
          // Shuffle tips the level, holds a moment, then levels it.
          if (s.pulse > 0) { s.pulse -= h; if (s.pulse <= 0) s.tilt.t = 0; }
          spring(s.tilt, s.pid != null ? 500 : 180, s.pid != null ? 0.9 : 0.4, h);
          const tau = s.tilt.x;
          let hot = false;
          vials.forEach((v, i) => {
            const u = v.u;
            // The bubble seeks the high side, lags and overshoots.
            u.t = clamp(-1.4 * tau, -1, 1);
            spring(u, KB[i], 0.26, h);
            if (Math.abs(u.x) > 1) { u.x = Math.sign(u.x); if (u.x * u.v > 0) u.v *= -0.25; }
            if (Math.abs(u.v) > 2.4) hot = true;
            // Marks light once the bubble rests between them.
            // They stay lit until the bubble clearly leaves.
            const on = v.on ? Math.abs(u.x) < 0.1 && Math.abs(tau) < 0.04 : Math.abs(u.x) < 0.04 && Math.abs(u.v) < 0.15 && Math.abs(tau) < 0.02;
            if (on && !v.on && i === 0) tink();
            v.on = on; v.lt.t = +on;
            spring(v.lt, 300, 1, h);
          });
          if (hot && !s.fast) glug(clamp(Math.abs(vials[0].u.v) / 6));
          s.fast = hot;
        },
        busy() {
          const a = rest(s.tilt, 5e-4), b = vials.every(v => rest(v.u, 2e-3) && rest(v.lt));
          return !(a && b) || s.pulse > 0;
        },
        draw() {
          set(tg, 'transform', `rotate(${f2(TD * s.tilt.x)} ${f2(VW / 2)} ${CY})`);
          vials.forEach(v => {
            const trav = (v.len - 10) / 2 - v.bl / 2 - 3, u = v.u.x;
            // The bubble stretches with speed and squashes at the walls.
            const st = clamp(Math.abs(v.u.v) * 0.05, 0, 0.25), wall = clamp((Math.abs(u) - 0.92) * 3, 0, 0.25);
            set(v.bg, 'transform', `translate(${f2(v.x + u * trav)} ${CY}) scale(${f3(1 + st - wall)} ${f3(1 - 0.5 * st + 0.5 * wall)})`);
            const o = f3(clamp(v.lt.x));
            set(v.lit[0], 'opacity', o); set(v.lit[1], 'opacity', o);
          });
          const n = Math.round(s.tilt.x * 10);
          set(lvEl, 'aria-valuenow', clamp(n, -10, 10));
          set(lvEl, 'aria-valuetext', vials[0].on ? 'Level' : n === 0 ? 'Settling' : n > 0 ? 'Right side low' : 'Left side low');
        },
      };
      function tip(t) { s.pulse = 0; s.tilt.t = clamp(t, -1, 1); wake(body); }
      lvEl.addEventListener('pointerdown', e => {
        if (s.pid != null || e.button > 0) return;
        s.pid = e.pointerId;
        try { lvEl.setPointerCapture(e.pointerId); } catch {}
        s.rect = lvEl.getBoundingClientRect();
        // The side under the finger goes down as the finger goes down.
        s.sg = e.clientX >= s.rect.left + s.rect.width / 2 ? 1 : -1;
        s.span = Math.max(30, s.rect.height * 0.9);
        s.y0 = e.clientY; s.t0 = s.tilt.t; s.pulse = 0;
        lvEl.classList.add('held');
        wake(body);
      });
      lvEl.addEventListener('pointermove', e => {
        if (e.pointerId !== s.pid) return;
        s.tilt.t = clamp(s.t0 + (s.sg * (e.clientY - s.y0)) / s.span, -1, 1);
        wake(body);
      });
      const up = e => {
        if (e.pointerId !== s.pid) return;
        s.pid = null; lvEl.classList.remove('held');
        // Close to level, the body drops flat.
        if (Math.abs(s.tilt.t) < 0.05) s.tilt.t = 0;
        wake(body);
      };
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => lvEl.addEventListener(t, up));
      lvEl.addEventListener('keydown', e => {
        if (s.pid != null) return;
        const d = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
        if (d) tip(Math.round(s.tilt.t * 10 + d) / 10);
        else if (e.key === 'Home') tip(0);
        else if (KEYS.includes(e.key)) { tip((Math.random() < 0.5 ? -1 : 1) * rnd(0.4, 0.8)); s.pulse = 0.4; }
        else return;
        e.preventDefault();
      });
      moves.push({
        el: lvEl,
        // Shuffle tips the level, then lets it settle back.
        shuffle() {
          if (s.pid != null) return;
          tip((Math.random() < 0.5 ? -1 : 1) * rnd(0.4, 0.85));
          s.pulse = reduce ? 0.001 : rnd(0.3, 0.5);
        },
        // Reset levels it.
        reset() { if (s.pid == null) tip(0); },
      });
      fit();
      watch = new ResizeObserver(fit);
      watch.observe(lvEl);
      return body;
    })());
    return { bodies, moves, destroy() { watch.disconnect(); } };
  },
};
