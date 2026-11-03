import {
  reduce, D2R, R2D, clamp, f2, f3, angDiff, KEYS, css, C, TICK, BUTTER, el, set, svgIn, mat, skin, well, wake, S, spring, rest, snd,
} from '../kit.js';

const MARKUP = `<div class="grp"><div class="ctl chick" id="selector" tabindex="0" role="slider" aria-label="Selector" aria-valuemin="1" aria-valuemax="4" aria-valuenow="1"></div></div>`;

// The head is drawn pointing up, around the shaft at the origin.
const HEAD = [[0, -70], [10, -64], [30, -30], [30, 2], [30, 30], [16, 46], [0, 46], [-16, 46], [-30, 30], [-30, 2], [-30, -30], [-10, -64], [0, -70]];

export default {
  id: 'selector', slot: 'small',
  css: `.p-selector .chick { --ar: 1; border-radius: 26px; cursor: grab; }`,
  mount(cell) {
    cell.insertAdjacentHTML('beforeend', MARKUP);
    const bodies = [], moves = [];
    // A cream chicken-head knob turns over a printed navy plate.
    const selEl = document.getElementById('selector');
    bodies.push((() => {
      const svg = svgIn(selEl, '0 0 200 200'), defs = svg.k.defs;
      const CX = 100, CY = 112, STEP = 40 * D2R, POS = [-60, -20, 20, 60].map(a => a * D2R), N = (2 * Math.PI) / STEP;
      const LO = POS[0] - 0.14, HI = POS[3] + 0.14;
      const pt = (r, a) => [f2(CX + r * Math.sin(a)), f2(CY - r * Math.cos(a))];
      skin(svg, svg, 'rect', { x: 4, y: 4, width: 192, height: 192, rx: 26 }, mat(C.navy, 0), { rim: 2.5, shadow: { b: 5, y: 7, o: 0.55 } });
      // A printed arc joins the four position ticks.
      const [ax, ay] = pt(80, POS[0]), [bx, by] = pt(80, POS[3]);
      el('path', { d: `M${ax} ${ay}A80 80 0 0 1 ${bx} ${by}`, fill: 'none', stroke: TICK, 'stroke-width': 2, opacity: 0.7 }, svg);
      const tg = el('g', { stroke: TICK, 'stroke-width': 6, 'stroke-linecap': 'round' }, svg);
      const lg = el('g', { stroke: BUTTER, 'stroke-width': 6, 'stroke-linecap': 'round' }, svg);
      const lit = POS.map(a => {
        const [x1, y1] = pt(73, a), [x2, y2] = pt(89, a), c = { x1, y1, x2, y2 };
        el('line', c, tg);
        return el('line', { ...c, opacity: 0 }, lg);
      });
      well(svg, svg, 'circle', { cx: CX, cy: CY, r: 50 }, { rim: 4 });
      const kg = el('g', {}, svg);
      const collar = skin(svg, kg, 'circle', { cx: CX, cy: CY, r: 40 }, mat([0.86, 0.03, 80], 0.1), { rim: 2, shadow: { b: 4, y: 5, o: 0.55 } });
      // The head path turns point by point, so its light stays put.
      const head = skin(svg, kg, 'path', { d: '' }, mat(C.cream, 0.12), { rim: 2.5, shadow: { b: 4, y: 7, o: 0.6 } });
      // A cut groove runs down the beak to show the setting.
      const gv = el('g', { 'stroke-linecap': 'round' }, kg);
      el('line', { x1: CX, y1: CY - 60, x2: CX, y2: CY - 22, stroke: '#fff', 'stroke-opacity': 0.45, 'stroke-width': 3, transform: 'translate(0.8 1)' }, gv);
      el('line', { x1: CX, y1: CY - 60, x2: CX, y2: CY - 22, stroke: css([0.55, 0.03, 70]), 'stroke-width': 3 }, gv);
      const shape = a => {
        const c = Math.cos(a), sn = Math.sin(a), q = HEAD.map(([x, y]) => `${f2(CX + x * c - y * sn)} ${f2(CY + x * sn + y * c)}`);
        let d = `M${q[0]}`;
        for (let i = 1; i < q.length; i += 3) d += `C${q[i]} ${q[i + 1]} ${q[i + 2]}`;
        return d + 'Z';
      };

      const s = { th: POS[0], w: 0, a: 0, T: POS[0], n: 0, near: 0, mode: 'rest', pr: S(), pid: null, pu: 0, prev: 0, off: 0, rect: null };
      // Finger follow and detent pull; a loose settle spring overshoots.
      const KD = 1400, CD = 55, AD = 300, KS = 900, CS = 22;
      // A heavy clunk: a contact snap, a body knock and a low thud.
      const clunk = v => snd.play('clunk', 0.03, 0.12, (t, P, G) => {
        G *= 0.5 + 0.5 * v;
        snd.hiss(t, 'highpass', 3000 * P, 0.8, 0.004, 0.25 * G);
        snd.hiss(t + 0.004, 'bandpass', 1100 * P, 1.1, 0.025, 0.5 * G);
        snd.ring(t + 0.004, 105 * P, 70 * P, 0.09, 0.45 * G);
        snd.ring(t + 0.004, 610 * P, 560 * P, 0.03, 0.06 * G);
      });
      const idx = th => clamp(Math.round((th - POS[0]) / STEP), 0, 3);
      const body = {
        step(h) {
          if (reduce) { if (s.mode !== 'rest') { s.th = s.T; s.w = 0; s.a = 0; } }
          else {
            let a = 0;
            if (s.mode === 'drag') a = KD * (s.T - s.th) - CD * s.w - AD * Math.sin(N * (s.th - POS[0]));
            else if (s.mode === 'settle') a = KS * (s.T - s.th) - CS * s.w;
            s.a = a;
            s.w += a * h;
            s.th += s.w * h;
            // The end stops knock the knob back.
            if (s.th < LO) { s.th = LO; if (s.w < 0) s.w *= -0.3; }
            else if (s.th > HI) { s.th = HI; if (s.w > 0) s.w *= -0.3; }
          }
          const i = idx(s.th);
          if (i !== s.near) { s.near = i; clunk(clamp(Math.abs(s.w) / 8)); }
          spring(s.pr, 700, 0.5, h);
        },
        busy() {
          let moving = false;
          if (s.mode === 'drag') moving = Math.abs(s.w) > 1e-3 || Math.abs(s.a) > 1e-2;
          else if (s.mode === 'settle') {
            if (Math.abs(s.T - s.th) < 2e-4 && Math.abs(s.w) < 2e-3) { s.th = s.T; s.w = 0; s.mode = 'rest'; }
            else moving = true;
          }
          return moving || !rest(s.pr);
        },
        draw() {
          set(head.shape, 'd', shape(s.th));
          set(gv, 'transform', `rotate(${f2(s.th * R2D)} ${CX} ${CY})`);
          const p = s.pr.x;
          set(kg, 'transform', `translate(${CX} ${CY}) scale(${f3(1 - 0.03 * p)}) translate(${-CX} ${-CY})`);
          head.paint(p * 0.8); collar.paint(p * 0.5);
          // Each tick lights as the beak nears it.
          lit.forEach((m, i) => { const o = clamp(1 - Math.abs(s.th - POS[i]) / (STEP / 2)); set(m, 'opacity', f3(o * o * (3 - 2 * o))); });
        },
      };
      function go(n) {
        s.n = n; s.mode = 'settle'; s.T = POS[n];
        selEl.setAttribute('aria-valuenow', String(n + 1));
        wake(body);
      }
      function polar(e) {
        const r = s.rect, dx = e.clientX - (r.left + (r.width * CX) / 200), dy = e.clientY - (r.top + (r.height * CY) / 200);
        return [Math.atan2(dx, -dy), Math.hypot(dx, dy) / (r.width / 2)];
      }
      selEl.addEventListener('pointerdown', e => {
        if (s.pid != null || e.button > 0) return;
        s.pid = e.pointerId;
        try { selEl.setPointerCapture(e.pointerId); } catch {}
        s.rect = selEl.getBoundingClientRect();
        const [a] = polar(e);
        // The grab point stays under the finger as the knob turns.
        s.prev = s.pu = a; s.off = s.th - a; s.T = s.th;
        s.mode = 'drag'; s.pr.t = 1; selEl.classList.add('held');
        wake(body);
      });
      selEl.addEventListener('pointermove', e => {
        if (e.pointerId !== s.pid) return;
        const [a, d] = polar(e);
        if (d < 0.08) return;
        s.pu += angDiff(a, s.prev); s.prev = a;
        s.T = clamp(s.pu + s.off, LO - 0.3, HI + 0.3);
        wake(body);
      });
      function end(e) {
        if (e.pointerId !== s.pid) return;
        s.pid = null; s.pr.t = 0; selEl.classList.remove('held');
        // The knob lands on the position it is heading for.
        go(idx(reduce ? s.T : s.th + s.w * 0.05));
      }
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => selEl.addEventListener(t, end));
      selEl.addEventListener('keydown', e => {
        if (s.pid != null) return;
        const d = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
        let n;
        if (d) n = clamp(s.n + d, 0, 3);
        else if (e.key === 'Home') n = 0;
        else if (e.key === 'End') n = 3;
        // Space and Enter step round the four positions.
        else if (KEYS.includes(e.key)) n = (s.n + 1) % 4;
        else return;
        e.preventDefault();
        if (n !== s.n) go(n);
      });
      moves.push({
        el: selEl,
        shuffle() { if (s.pid == null) go((s.n + 1 + Math.floor(Math.random() * 3)) % 4); },
        reset() { if (s.pid == null && s.n !== 0) go(0); },
      });
      return body;
    })());
    return { bodies, moves, destroy() {} };
  },
};
