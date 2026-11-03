import {
  NS, reduce, TAU, PI, D2R, R2D, clamp, lerp, mod, f2, f3, rnd, angDiff, KEYS, css, mixLch, ramp, C, TICK, BUTTER, el, set, nid, grad, DOWN, blur, LIGHT, svgIn, mat, skin, WELL, well, shine, wake, sleep, S, spring, rest, board, snd, BEZEL,
} from '../kit.js';

const MARKUP = `<div class="ctl fader wide" id="fader" tabindex="0" role="slider" aria-label="Slider" aria-valuemin="1" aria-valuemax="5" aria-valuenow="3"></div>`;

export default {
  id: 'fader', slot: 'band',
  mount(cell) {
    cell.insertAdjacentHTML('beforeend', MARKUP);
    const bodies = [], moves = [];
    let watch = null;
    // The track runs the panel's length; the cream thumb has five notches.
    const faderEl = document.getElementById('fader');
    bodies.push((() => {
      const VH = 110, svg = svgIn(faderEl, `0 0 600 ${VH}`);
      const track = well(svg, svg, 'rect', { x: 8, y: 37, width: 584, height: 18, rx: 9 }, { rim: 3 });
      const base = el('g', { stroke: TICK, 'stroke-width': 5, 'stroke-linecap': 'round' }, svg);
      const lit = el('g', { stroke: BUTTER, 'stroke-width': 5, 'stroke-linecap': 'round' }, svg);
      const ticks = [0, 1, 2, 3, 4].map(() => [el('line', { y1: 96, y2: 106 }, base), el('line', { y1: 96, y2: 106, opacity: 0 }, lit)]);
      const tg = el('g', {}, svg);
      const thumb = skin(svg, tg, 'rect', { y: 8, width: 50, height: 76, rx: 12 }, mat(C.cream, 0.12), { rim: 2.5, shadow: { b: 4, y: 6, o: 0.6 } });
      // A groove across the cap marks its centre.
      el('rect', { x: 22.5, y: 20, width: 5, height: 52, rx: 2.5, fill: css([0.6, 0.02, 80]) }, tg);
      el('rect', { x: 27.5, y: 20, width: 1.5, height: 52, rx: 0.75, fill: '#fff', opacity: 0.7 }, tg);
      let VW = 600, SP = 132.5, XS = [];
      const s = { x: S(), n: 2, tk: 2, pr: S(), pid: null, off: 0, grab: false, drag: false, rect: null };
      // The viewBox follows the element, so notches spread with the plate.
      function fit() {
        const r = faderEl.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) VW = Math.max(320, Math.round((VH * r.width) / r.height));
        svg.setAttribute('viewBox', `0 0 ${VW} ${VH}`);
        SP = (VW - 70) / 4; XS = [0, 1, 2, 3, 4].map(i => 35 + i * SP);
        set(track, 'x', 8); set(track, 'width', VW - 16);
        ticks.forEach(([b, l], i) => { for (const m of [b, l]) { set(m, 'x1', f2(XS[i])); set(m, 'x2', f2(XS[i])); } });
        s.x.x = s.x.t = XS[s.n]; s.x.v = 0; s.tk = s.n;
        body.draw();
      }
      const body = {
        step(h) {
          // A soft spring under the finger makes the thumb feel heavy.
          if (s.drag) spring(s.x, 170, 0.72, h);
          else spring(s.x, 300, 0.5, h);
          // End stops knock the thumb back.
          const p = s.x;
          if (p.x < XS[0] - 10) { p.x = XS[0] - 10; if (p.v < 0) p.v *= -0.35; }
          else if (p.x > XS[4] + 10) { p.x = XS[4] + 10; if (p.v > 0) p.v *= -0.35; }
          // A notch ticks once on arrival, then rearms once left.
          const i = clamp(Math.round((p.x - XS[0]) / SP), 0, 4);
          if (Math.abs(p.x - XS[i]) < 4) { if (s.tk !== i) { s.tk = i; snd.notch(clamp(Math.abs(p.v) / (13.6 * SP))); } }
          else if (s.tk >= 0 && Math.abs(p.x - XS[s.tk]) > 24) s.tk = -1;
          spring(s.pr, 900, 0.6, h);
        },
        busy() { const a = rest(s.x, 0.04), b = rest(s.pr); return !(a && b); },
        draw() {
          // Speeds count in notch spacings, so feel holds at any length.
          const x = s.x.x, sp = (Math.abs(s.x.v) * 110) / SP;
          const st = clamp(sp / 2400, 0, 0.08), sc = 1 - 0.05 * s.pr.x;
          // Moving, the thumb scrapes faintly along its track.
          snd.scrape.set(0.035 * clamp(sp / 2400), 900 + 0.3 * sp);
          set(tg, 'transform', `translate(${f2(x)} 46) scale(${f3(sc * (1 + st))} ${f3(sc * (1 - 0.5 * st))}) translate(-25 -46)`);
          thumb.paint(s.pr.x * 0.8);
          // Notches light as the thumb nears them.
          ticks.forEach(([, m], i) => {
            const o = clamp(1 - Math.abs(x - XS[i]) / (SP / 2));
            set(m, 'opacity', f3(o * o * (3 - 2 * o)));
          });
        },
      };
      function go(n) {
        s.n = n; s.x.t = XS[n]; s.drag = false;
        faderEl.setAttribute('aria-valuenow', String(n + 1));
        wake(body);
      }
      const local = e => ((e.clientX - s.rect.left) / s.rect.width) * VW;
      faderEl.addEventListener('pointerdown', e => {
        if (s.pid != null || e.button > 0) return;
        s.pid = e.pointerId;
        try { faderEl.setPointerCapture(e.pointerId); } catch {}
        s.rect = faderEl.getBoundingClientRect();
        const q = local(e);
        // Grabbing the thumb keeps its offset; the track pulls it over.
        s.grab = Math.abs(q - s.x.x) < 34;
        s.off = s.grab ? s.x.x - q : 0;
        s.drag = true; s.x.t = clamp(q + s.off, XS[0], XS[4]);
        s.pr.t = 1; faderEl.classList.add('held');
        wake(body);
      });
      faderEl.addEventListener('pointermove', e => {
        if (e.pointerId !== s.pid) return;
        s.x.t = clamp(local(e) + s.off, XS[0], XS[4]);
        wake(body);
      });
      const up = e => {
        if (e.pointerId !== s.pid) return;
        s.pid = null; s.pr.t = 0; faderEl.classList.remove('held');
        // A held thumb lands where it is heading; a track tap, where tapped.
        const aim = s.grab ? s.x.x + s.x.v * 0.12 : s.x.t;
        go(clamp(Math.round((aim - XS[0]) / SP), 0, 4));
      };
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => faderEl.addEventListener(t, up));
      faderEl.addEventListener('keydown', e => {
        const d = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 1, PageDown: -1 }[e.key];
        let n;
        if (d) n = s.n + d;
        else if (e.key === 'Home') n = 0;
        else if (e.key === 'End') n = 4;
        else return;
        e.preventDefault();
        if (s.pid == null) go(clamp(n, 0, 4));
      });
      moves.push({
        el: faderEl,
        shuffle() { if (s.pid == null) go(mod(s.n + 1 + Math.floor(Math.random() * 4), 5)); },
        reset() { if (s.pid == null && s.n !== 2) go(2); },
      });
      fit();
      watch = new ResizeObserver(fit);
      watch.observe(faderEl);
      return body;
    })());
    return { bodies, moves, destroy() { watch.disconnect(); snd.scrape.stop(); } };
  },
};
