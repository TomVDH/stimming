import {
  reduce, clamp, f2, f3, KEYS, css, C, TICK, BUTTER, el, set, svgIn, mat, skin, well, wake, S, spring, rest, snd, BEZEL,
} from '../kit.js';

const MARKUP = `<div class="grp"><div class="ctl slide3" id="slide" tabindex="0" role="slider" aria-orientation="vertical" aria-label="Slide switch" aria-valuemin="1" aria-valuemax="3" aria-valuenow="1"></div></div>`;

export default {
  id: 'slide', slot: 'small',
  css: `.p-slide .grp { --sr: 0.5556; } .p-slide .slide3 { --ar: 100 / 180; border-radius: 16px; cursor: grab; }`,
  mount(cell) {
    cell.insertAdjacentHTML('beforeend', MARKUP);
    const bodies = [], moves = [];
    // A mint thumb rides a sunk track; dot groups print 1, 2 and 3.
    const slEl = document.getElementById('slide');
    bodies.push((() => {
      const svg = svgIn(slEl, '0 0 100 180'), m = C.mint;
      // Position 1 sits at the bottom, so up counts up.
      const YS = [135, 90, 45], TONE = [0.9, 1, 1.12];
      skin(svg, svg, 'rect', { x: 2, y: 2, width: 68, height: 176, rx: 18 }, BEZEL, { rim: 2, shadow: { b: 3, y: 4, o: 0.55 } });
      well(svg, svg, 'rect', { x: 22, y: 16, width: 28, height: 148, rx: 10 }, { rim: 3.5 });
      const base = el('g', { fill: TICK }, svg), litg = el('g', { fill: BUTTER }, svg);
      const lit = YS.map((y, i) => {
        const g = el('g', { opacity: 0 }, litg);
        for (let j = 0; j <= i; j++) { el('circle', { cx: 80 + 7 * j, cy: y, r: 2.6 }, base); el('circle', { cx: 80 + 7 * j, cy: y, r: 2.6 }, g); }
        return g;
      });
      const tg = el('g', {}, svg);
      const thumb = skin(svg, tg, 'rect', { x: 12, y: -23, width: 48, height: 46, rx: 11 }, mat(m, 0.12), { rim: 2.5, shadow: { b: 3, y: 4, o: 0.6 } });
      // Grip ridges: a dark cut over a lit lower lip.
      for (const y of [-14, -7, 0, 7, 14]) {
        el('line', { x1: 21, x2: 51, y1: y + 1.3, y2: y + 1.3, stroke: '#fff', 'stroke-opacity': 0.5, 'stroke-width': 1.2, 'stroke-linecap': 'round' }, tg);
        el('line', { x1: 21, x2: 51, y1: y, y2: y, stroke: css([m[0] - 0.3, m[1], m[2]]), 'stroke-width': 2.2, 'stroke-linecap': 'round' }, tg);
      }
      const s = { y: S(YS[0]), pr: S(), n: 0, tk: 0, pid: null, drag: false, y0: 0, p0: 0, k: 1, rect: null };
      // Click: a contact tick, then the detent snap 12 ms later.
      const click = (i, v) => snd.play('slide', 0.02, 0.06, (t, P, G) => {
        const k = TONE[i] * P;
        G *= 0.5 + 0.5 * v;
        snd.hiss(t, 'bandpass', 3800 * k, 1.4, 0.005, 0.28 * G);
        snd.hiss(t + 0.012, 'bandpass', 2400 * k, 1.2, 0.01, 0.42 * G);
        snd.ring(t + 0.012, 900 * k, 820 * k, 0.03, 0.08 * G);
        snd.ring(t + 0.012, 190 * k, 140 * k, 0.04, 0.2 * G);
      });
      const near = y => YS.reduce((b, v, i) => (Math.abs(y - v) < Math.abs(y - YS[b]) ? i : b), 0);
      const body = {
        step(h) {
          if (s.drag) spring(s.y, 1500, 0.85, h);
          else spring(s.y, 900, 0.42, h);
          // The track ends knock the thumb back.
          const p = s.y;
          if (p.x > YS[0] + 6) { p.x = YS[0] + 6; if (p.v > 0) p.v *= -0.35; }
          else if (p.x < YS[2] - 6) { p.x = YS[2] - 6; if (p.v < 0) p.v *= -0.35; }
          // A detent clicks once on arrival, then rearms once left.
          const i = near(p.x);
          if (Math.abs(p.x - YS[i]) < 3) { if (s.tk !== i) { s.tk = i; click(i, clamp(Math.abs(p.v) / 400)); } }
          else if (s.tk >= 0 && Math.abs(p.x - YS[s.tk]) > 14) s.tk = -1;
          spring(s.pr, 900, 0.6, h);
        },
        busy() { const a = rest(s.y, 0.02), b = rest(s.pr); return !(a && b); },
        draw() {
          const y = s.y.x, st = clamp(Math.abs(s.y.v) * 0.0012, 0, 0.1), sc = 1 - 0.05 * s.pr.x;
          // The thumb stretches along its travel while moving fast.
          set(tg, 'transform', `translate(36 ${f2(y)}) scale(${f3(sc * (1 - 0.5 * st))} ${f3(sc * (1 + st))}) translate(-36 0)`);
          thumb.paint(s.pr.x * 0.8);
          lit.forEach((g, i) => { const o = clamp(1 - Math.abs(y - YS[i]) / 22.5); set(g, 'opacity', f3(o * o * (3 - 2 * o))); });
        },
      };
      function go(n) {
        s.n = n; s.y.t = YS[n]; s.drag = false;
        slEl.setAttribute('aria-valuenow', String(n + 1));
        wake(body);
      }
      const local = e => ((e.clientY - s.rect.top) / s.rect.height) * 180;
      // Near a detent the drag target sticks to it.
      function sticky(f) {
        const i = near(f), d = f - YS[i], a = Math.abs(d);
        return a < 18 ? YS[i] + d * (a / 18) ** 2 : f;
      }
      slEl.addEventListener('pointerdown', e => {
        if (s.pid != null || e.button > 0) return;
        s.pid = e.pointerId;
        try { slEl.setPointerCapture(e.pointerId); } catch {}
        s.rect = slEl.getBoundingClientRect();
        s.y0 = local(e); s.p0 = s.y.x; s.drag = false;
        s.pr.t = 1; slEl.classList.add('held');
        wake(body);
      });
      slEl.addEventListener('pointermove', e => {
        if (e.pointerId !== s.pid) return;
        const dy = local(e) - s.y0;
        if (!s.drag && Math.abs(dy) > 4) s.drag = true;
        if (s.drag) { s.y.t = sticky(clamp(s.p0 + dy, YS[2], YS[0])); wake(body); }
      });
      const up = e => {
        if (e.pointerId !== s.pid) return;
        s.pid = null; s.pr.t = 0; slEl.classList.remove('held');
        if (s.drag) { go(near(s.y.x + s.y.v * 0.05)); return; }
        if (e.type !== 'pointerup') { wake(body); return; }
        // A thumb tap steps round; a track tap steps toward it.
        const d = s.y0 - s.y.x;
        if (Math.abs(d) < 23) go((s.n + 1) % 3);
        else go(clamp(s.n + (d < 0 ? 1 : -1), 0, 2));
      };
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => slEl.addEventListener(t, up));
      slEl.addEventListener('keydown', e => {
        if (s.pid != null) return;
        const d = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[e.key];
        let n;
        if (d) n = clamp(s.n + d, 0, 2);
        else if (e.key === 'Home') n = 0;
        else if (e.key === 'End') n = 2;
        else if (KEYS.includes(e.key)) n = (s.n + 1) % 3;
        else return;
        e.preventDefault();
        if (n !== s.n) { s.pr.v = reduce ? 0 : 8; go(n); }
      });
      moves.push({
        el: slEl,
        shuffle() { if (s.pid == null) go((s.n + 1 + Math.floor(Math.random() * 2)) % 3); },
        reset() { if (s.pid == null && s.n !== 0) go(0); },
      });
      return body;
    })());
    return { bodies, moves, destroy() {} };
  },
};
