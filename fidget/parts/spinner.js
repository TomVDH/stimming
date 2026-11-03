import {
  reduce, TAU, clamp, f2, f3, rnd, angDiff, KEYS, css, C, el, set, grad, DOWN, svgIn, mat, skin, wake, S, spring, rest, snd,
} from '../kit.js';

const MARKUP = `<div class="grp"><div class="ctl spinner" id="spinner" tabindex="0" role="slider" aria-label="Spinner" aria-valuemin="0" aria-valuemax="12" aria-valuenow="0" aria-valuetext="Still"></div></div>`;

export default {
  id: 'spinner', slot: 'big',
  css: `.p-spinner .spinner { --ar: 1; border-radius: 50%; cursor: grab; }`,
  mount(cell) {
    cell.insertAdjacentHTML('beforeend', MARKUP);
    const bodies = [], moves = [];
    // A cream three-lobed body, steel weights in the lobes, a coral cap.
    const spEl = cell.querySelector('#spinner');
    const whir = snd.drone(4.5);
    bodies.push((() => {
      const svg = svgIn(spEl, '0 0 400 400'), defs = svg.k.defs;
      // Lobe centre distance, lobe radius, waist fillet radius.
      const CX = 200, D = 108, RL = 64, RC = 36;
      // The fillet circle touches both neighbouring lobes.
      const DC = (D + Math.sqrt(D * D - 4 * (D * D - (RL + RC) ** 2))) / 2;
      const at = (r, a) => [CX + r * Math.sin(a), CX - r * Math.cos(a)];
      // The outline is three lobe arcs joined by three concave fillets.
      function outline(th) {
        const L = [0, 1, 2].map(i => at(D, th + (i * TAU) / 3));
        const F = [0, 1, 2].map(i => at(DC, th + (i * TAU) / 3 + TAU / 6));
        const tp = (l, f) => { const dx = f[0] - l[0], dy = f[1] - l[1], m = Math.hypot(dx, dy); return [l[0] + (RL * dx) / m, l[1] + (RL * dy) / m]; };
        let d = '';
        for (let i = 0; i < 3; i++) {
          const q = tp(L[i], F[(i + 2) % 3]), p = tp(L[i], F[i]), n = tp(L[(i + 1) % 3], F[i]);
          if (!i) d += `M${f2(q[0])} ${f2(q[1])}`;
          d += `A${RL} ${RL} 0 1 1 ${f2(p[0])} ${f2(p[1])}A${RC} ${RC} 0 0 0 ${f2(n[0])} ${f2(n[1])}`;
        }
        return d + 'Z';
      }
      const bodySk = skin(svg, svg, 'path', { d: outline(0) }, mat(C.cream, 0.1), { rim: 3, shadow: { b: 9, y: 11, o: 0.6 } });
      // Faint trailing copies smear the lobes at speed.
      const CREAM = css(C.cream);
      const ghosts = [0, 1, 2, 3, 4].map(() => el('path', { fill: CREAM, opacity: 0 }, svg));
      // Each weight is a steel slug with a dark race.
      const STEEL = mat(C.steel, 0);
      const weights = [0, 1, 2].map(() => {
        const g = el('g', {}, svg);
        skin(svg, g, 'circle', { r: 40 }, STEEL, { rim: 2.5, shadow: { b: 3, y: 4, o: 0.5 } });
        el('circle', { r: 30, fill: 'none', stroke: css([0.42, 0.015, 258]), 'stroke-width': 3, opacity: 0.7 }, g);
        el('circle', { r: 22, fill: grad(defs, 'linearGradient', DOWN, [[0, '#fff', 0.55], [0.5, '#fff', 0], [1, '#000', 0.25]]).url }, g);
        return g;
      });
      // At speed the weights blur into one steel ring.
      const ring = el('circle', { cx: CX, cy: CX, r: D, fill: 'none', stroke: css(C.steel), 'stroke-width': 80, opacity: 0 }, svg);
      const top = el('g', {}, svg);
      const cap = skin(svg, top, 'circle', { cx: CX, cy: CX, r: 46 }, mat(C.coral, 0.1), { rim: 2.5, shadow: { b: 5, y: 6, o: 0.5 } });
      el('circle', { cx: CX, cy: CX, r: 28, fill: grad(defs, 'linearGradient', DOWN, [[0, '#000', 0.2], [0.6, '#000', 0], [1, '#fff', 0.4]]).url }, top);

      const s = { th: 0, w: 0, mode: 'rest', pr: S(), pid: null, pu: 0, prev: 0, off: 0, T: 0, trail: [], rect: null, val: '' };
      // Drag follow; a light bearing coasts for a long time.
      const KD = 900, CD = 52, CF = 0.1, MU = 0.5, WMAX = 70;
      // The brake grips hard.
      const BF = 3, BM = 9;
      const body = {
        step(h) {
          if (reduce) {
            if (s.mode === 'drag') s.th = s.T;
            else s.mode = 'rest';
            s.w = 0;
          } else {
            let a = 0;
            if (s.mode === 'drag') a = KD * (s.T - s.th) - CD * s.w;
            else if (s.mode === 'spin' || s.mode === 'brake') {
              const cf = s.mode === 'brake' ? BF : CF, mu = s.mode === 'brake' ? BM : MU;
              a = -cf * s.w - mu * Math.sign(s.w);
              // Friction stops the spin; it never turns it back.
              if (Math.abs(s.w) <= Math.abs(a * h)) { s.w = 0; s.mode = 'rest'; a = 0; }
            }
            s.w += a * h;
            s.th += s.w * h;
          }
          spring(s.pr, 700, 0.45, h);
        },
        busy() {
          let moving = s.mode === 'spin' || s.mode === 'brake';
          if (s.mode === 'drag') moving = Math.abs(s.T - s.th) > 1e-3 || Math.abs(s.w) > 1e-2;
          if (!moving && s.mode !== 'drag') {
            // At rest the angle folds back into one turn.
            s.th = ((s.th % TAU) + TAU) % TAU; s.w = 0;
          }
          return moving || !rest(s.pr);
        },
        draw() {
          const w = Math.abs(s.w), dir = Math.sign(s.w);
          set(bodySk.shape, 'd', outline(s.th));
          for (let i = 0; i < 3; i++) {
            const [x, y] = at(D, s.th + (i * TAU) / 3);
            set(weights[i], 'transform', `translate(${f2(x)} ${f2(y)})`);
          }
          // The smear spans one frame's turn, up to a lobe gap.
          const q = clamp((w - 6) / 34), span = Math.min(w / 60, TAU / 3);
          ghosts.forEach((g, k) => {
            if (q <= 0) { set(g, 'opacity', 0); return; }
            set(g, 'd', outline(s.th - dir * span * ((k + 1) / 5)));
            set(g, 'opacity', f3(0.2 * q * (1 - k * 0.15)));
          });
          set(ring, 'opacity', f3(0.4 * q * q));
          const p = s.pr.x;
          set(top, 'transform', `translate(200 200) scale(${f3(1 - 0.04 * p)}) translate(-200 -200)`);
          cap.paint(p * 0.8);
          // The whir rises in pitch and level with speed.
          const g = clamp(w / 45);
          whir.set(0.05 * g * Math.sqrt(g), 160 + 26 * w);
          const rps = Math.round((w / TAU) * 2) / 2;
          const val = rps ? `${rps} turns a second` : 'Still';
          if (val !== s.val) { s.val = val; spEl.setAttribute('aria-valuenow', String(Math.min(12, rps))); spEl.setAttribute('aria-valuetext', val); }
        },
      };

      function polar(e) {
        const r = s.rect, dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        return [Math.atan2(dx, -dy), Math.hypot(dx, dy) / (r.width / 2)];
      }
      spEl.addEventListener('pointerdown', e => {
        if (s.pid != null || e.button > 0) return;
        s.pid = e.pointerId;
        try { spEl.setPointerCapture(e.pointerId); } catch {}
        s.rect = spEl.getBoundingClientRect();
        const [a] = polar(e);
        // The finger catches the body; the grab point stays under it.
        s.prev = s.pu = a; s.off = s.th - a; s.T = s.th;
        s.mode = 'drag'; s.trail = [[e.timeStamp, a]];
        s.pr.t = 1; spEl.classList.add('held');
        wake(body);
      });
      spEl.addEventListener('pointermove', e => {
        if (e.pointerId !== s.pid) return;
        const [a, d] = polar(e);
        if (d < 0.12) return;
        s.pu += angDiff(a, s.prev); s.prev = a;
        s.T = s.pu + s.off;
        s.trail.push([e.timeStamp, s.pu]);
        while (s.trail.length > 2 && e.timeStamp - s.trail[0][0] > 120) s.trail.shift();
        wake(body);
      });
      function end(e) {
        if (e.pointerId !== s.pid) return;
        s.pid = null; s.pr.t = 0; spEl.classList.remove('held');
        // Pointer speed over the last 100 ms sets the flick.
        const t = e.timeStamp, q = s.trail.filter(p => t - p[0] < 100);
        let w = 0;
        if (q.length > 1 && t - q[q.length - 1][0] < 50) {
          const dt = (q[q.length - 1][0] - q[0][0]) / 1000;
          if (dt > 0.008) w = (q[q.length - 1][1] - q[0][1]) / dt;
        }
        if (reduce) { s.th = s.T; s.mode = 'rest'; }
        else { s.mode = 'spin'; s.w = clamp(Math.abs(w) > 1 ? w : s.w, -WMAX, WMAX); }
        wake(body);
      }
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => spEl.addEventListener(t, end));
      // Reduced motion turns the body a step instead of a spin.
      function flick(w) {
        if (reduce) { s.th += Math.sign(w) * rnd(0.6, 1.6); s.mode = 'rest'; }
        else { s.mode = 'spin'; s.w = clamp(s.w + w, -WMAX, WMAX); }
        wake(body);
      }
      function brake() {
        if (s.mode === 'spin') { s.mode = 'brake'; wake(body); }
      }
      spEl.addEventListener('keydown', e => {
        if (s.pid != null) return;
        const d = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
        // Arrows push the spin; Space flicks it; Home brakes.
        if (d) flick(d * 6);
        else if (KEYS.includes(e.key)) flick(e.shiftKey ? -24 : 24);
        else if (e.key === 'Home' || e.key === 'Escape') brake();
        else return;
        e.preventDefault();
      });
      moves.push({
        el: spEl,
        shuffle() { if (s.pid == null) flick((Math.random() < 0.5 ? -1 : 1) * rnd(18, 60)); },
        reset() { if (s.pid == null) brake(); },
      });
      return body;
    })());
    return { bodies, moves, destroy() { whir.stop(); } };
  },
};
