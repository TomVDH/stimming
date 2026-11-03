import { reduce, PI, clamp, f2, rnd, KEYS, css, C, el, set, grad, DOWN, blur, svgIn, mat, skin, well, wake, S, spring, rest, snd } from '../kit.js';

const MARKUP = `<div class="ctl tapem wide" id="tape-measure" tabindex="0" role="button" aria-label="Tape measure: pull the hook out"></div>`;

// The hook slaps the case: snap, knock and steel ring.
const snap = v => snd.play('tape-snap', 0.06, 0.12, (t, P, G) => {
  G *= v;
  snd.hiss(t, 'bandpass', 3200 * P, 1.2, 0.012, 0.55 * G);
  snd.hiss(t, 'lowpass', 900 * P, 0.8, 0.03, 0.35 * G);
  snd.ring(t, 190 * P, 120 * P, 0.07, 0.4 * G);
  snd.ring(t + 0.004, 2300 * P, 2250 * P, 0.09, 0.04 * G);
});

export default {
  id: 'tape', slot: 'band',
  css: `.p-tape .tapem { border-radius: 10px; cursor: grab; }`,
  mount(cell) {
    cell.insertAdjacentHTML('beforeend', MARKUP);
    const bodies = [], moves = [];
    let watch = null;
    // A coral case sits at the left.
    // The butter tape runs out to the right.
    const tapeEl = cell.querySelector('.tapem');
    const zip = snd.drone(1.4);
    bodies.push((() => {
      // The view crops close to the case, so the case fills the band.
      const VY = 5, VH = 100, svg = svgIn(tapeEl, `0 ${VY} 600 ${VH}`), defs = svg.k.defs;
      // The hook rests at X0; the tape's top edge sits at TY.
      const X0 = 118, TY = 64, TW = 24, SP = 9, NP = 18, ACC = 7000, VMAX = 3000;
      const bt = C.butter, tone = (dl, k = 1) => css([bt[0] + dl, bt[1] * k, bt[2]]), ink = css([0.3, 0.04, 262]);
      // The tape goes first, so it slides out from under the case.
      const tsh = el('path', { fill: '#000', opacity: 0.45, filter: blur(defs, 2.5), transform: 'translate(0 4)' }, svg);
      const tape = el('path', { fill: grad(defs, 'linearGradient', DOWN, [[0, tone(0.05, 0.7)], [0.35, tone(0)], [1, tone(-0.16, 1.05)]]).url, stroke: tone(-0.3), 'stroke-width': 1 }, svg);
      const marks = el('path', { fill: 'none', stroke: ink, 'stroke-width': 1.6 }, svg);
      const labels = el('g', { fill: css([0.55, 0.17, 30]), 'font-family': 'Gabarito, sans-serif', 'font-weight': 700, 'font-size': 10, 'text-anchor': 'middle' }, svg);
      const texts = [];
      const cg = el('g', {}, svg);
      skin(svg, cg, 'rect', { x: 6, y: 6, width: 108, height: 98, rx: 30 }, mat(C.coral, 0.06), { rim: 3, shadow: { b: 5, y: 6, o: 0.6 } });
      // A window shows the coiled tape.
      // The hub turns as tape pays out.
      skin(svg, cg, 'circle', { cx: 56, cy: 55, r: 31 }, mat(C.navy, 0), { rim: 2.5, shadow: { b: 3, y: 3, o: 0.5 } });
      well(svg, cg, 'circle', { cx: 56, cy: 55, r: 24 }, { rim: 3 });
      el('circle', { cx: 56, cy: 55, r: 20, fill: tone(-0.06) }, cg);
      const coil = el('g', { fill: 'none', stroke: tone(-0.28), 'stroke-width': 1, opacity: 0.6 }, cg);
      [16, 12.5].forEach(r => el('circle', { cx: 56, cy: 55, r }, coil));
      const hub = el('g', {}, cg);
      el('circle', { cx: 56, cy: 55, r: 8, fill: css(C.steel) }, hub);
      el('rect', { x: 50, y: 53.8, width: 12, height: 2.4, rx: 1.2, fill: ink }, hub);
      // The steel mouth guide stands proud of the case's right edge.
      skin(svg, cg, 'rect', { x: 104, y: 56, width: 14, height: 40, rx: 5 }, mat(C.steel, 0.05), { rim: 1.5, shadow: { b: 2, y: 3, o: 0.5 } });
      const hg = el('g', {}, svg);
      el('rect', { x: -13, y: TY + 3, width: 13, height: TW - 6, rx: 2, fill: css([0.74, 0.012, 255]) }, hg);
      [TY + 7.5, TY + TW - 7.5].forEach(y => el('circle', { cx: -6.5, cy: y, r: 2, fill: css([0.52, 0.01, 255]) }, hg));
      skin(svg, hg, 'rect', { x: 0, y: TY - 7, width: 8, height: TW + 14, rx: 2.5 }, mat(C.steel, 0.05), { rim: 1.5, shadow: { b: 2.5, y: 3, o: 0.6 } });
      // A steel stop with a navy magnet holds the hook at rest.
      // The tape runs under it; the hook's lip catches on its face.
      const sg = el('g', {}, svg);
      skin(svg, sg, 'rect', { x: -12, y: TY - 11, width: 12, height: TW + 22, rx: 3.5 }, mat(C.steel, 0.05), { rim: 1.5, shadow: { b: 2.5, y: 3, o: 0.55 } });
      skin(svg, sg, 'rect', { x: -10, y: TY - 9, width: 8, height: 7, rx: 2 }, mat(C.navy, 0), { rim: 1, sheen: false });
      skin(svg, sg, 'rect', { x: -10, y: TY + TW + 2, width: 8, height: 7, rx: 2 }, mat(C.navy, 0), { rim: 1, sheen: false });

      // REST is the tape out at rest, a third of the reach.
      let VW = 600, MAXL = 460, REST = 150;
      // x is tape out and bw is the bow.
      // hk is hook tilt and jo is stop jolt.
      const s = { x: S(REST), bw: S(), hk: S(), jo: S(), mode: 'rest', pid: null, off: 0, rect: null, hold: 0, x0: 1 };
      // The tape bows up between its two pinned ends.
      const bowAt = (x, L) => (L > 1 ? -s.bw.x * Math.sin(PI * clamp((x - X0) / L)) : 0);
      function fit() {
        const r = tapeEl.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) VW = Math.max(320, Math.round((VH * r.width) / r.height));
        svg.setAttribute('viewBox', `0 ${VY} ${VW} ${VH}`);
        MAXL = VW - X0 - 22;
        REST = Math.round(MAXL / 3);
        // A tape at rest follows its stop to the new length.
        if (s.mode === 'rest') { s.x.x = s.x.t = REST; s.x.v = 0; }
        else { s.x.x = Math.max(REST, s.x.x); s.x.t = Math.max(REST, s.x.t); }
        // Each label marks ten ticks; the pool grows with the plate.
        const need = Math.ceil(MAXL / (10 * SP)) + 1;
        while (texts.length < need) { const t = el('text', { opacity: 0 }, labels); t.textContent = String(texts.length + 1); texts.push(t); }
        if (s.x.x > MAXL) { s.x.x = s.x.t = MAXL; s.x.v = 0; }
        body.draw();
      }
      function slap(v) {
        const k = clamp(v / VMAX);
        snap(0.3 + 0.7 * k);
        if (reduce) return;
        s.hk.v -= 260 * k + 40;
        s.jo.v -= 70 * k;
      }
      const body = {
        step(h) {
          const p = s.x;
          if (s.mode === 'retract') {
            if (reduce) { p.x = REST; p.v = 0; }
            else {
              // The spring motor hauls the tape home ever faster.
              p.v = Math.max(p.v - ACC * h, -VMAX);
              p.x += p.v * h;
              if (p.x > MAXL) { p.x = MAXL; if (p.v > 0) p.v = 0; }
            }
            if (p.x <= REST) { slap(-p.v); p.x = p.t = REST; p.v = 0; s.mode = 'rest'; }
          } else {
            if (s.mode === 'drag') spring(p, 900, 0.85, h);
            else if (s.mode === 'pull') {
              spring(p, 220, 0.7, h);
              if (Math.abs(p.t - p.x) < 4 && (s.hold += h) > 0.25) retract();
            } else spring(p, 400, 1, h);
            if (p.x < REST) { p.x = REST; if (p.v < 0) p.v = 0; }
            if (p.x > MAXL) { p.x = MAXL; if (p.v > 0) p.v = 0; }
          }
          // Speed lifts the tape into a bow; the slap sets it whipping.
          s.bw.t = s.mode === 'retract' ? 9 * clamp(-p.v / VMAX) : 0;
          spring(s.bw, 170, 0.22, h);
          spring(s.hk, 700, 0.12, h);
          spring(s.jo, 700, 0.3, h);
        },
        busy() {
          if (s.mode === 'retract' || s.mode === 'pull') return true;
          const a = rest(s.x, 0.05), b = rest(s.bw, 0.02), c = rest(s.hk, 0.02), d = rest(s.jo, 0.01);
          return !(a && b && c && d);
        },
        draw() {
          const L = s.x.x, hx = X0 + L;
          // The outline runs right along the top, then back along the bottom.
          let top = `M${X0 - 14} ${TY}`, bot = '';
          for (let i = 0; i <= NP; i++) {
            const x = X0 + (L * i) / NP, b = bowAt(x, L);
            top += `L${f2(x)} ${f2(TY + b)}`;
            bot = `L${f2(x)} ${f2(TY + TW + b)}` + bot;
          }
          const d = `${top}${bot}L${X0 - 14} ${TY + TW}Z`;
          set(tape, 'd', d); set(tsh, 'd', d);
          // Ticks count from the hook toward the case.
          let m = '';
          for (let j = 1; ; j++) {
            const x = hx - j * SP;
            if (x < X0 - 12) break;
            m += `M${f2(x)} ${f2(TY + 1 + bowAt(x, L))}v${j % 10 === 0 ? 11 : j % 5 === 0 ? 8 : 5}`;
          }
          set(marks, 'd', m || 'M0 0');
          texts.forEach((t, k) => {
            const x = hx - (k + 1) * 10 * SP;
            if (x < X0 + 2) { set(t, 'opacity', 0); return; }
            set(t, 'opacity', 1); set(t, 'x', f2(x + 6)); set(t, 'y', f2(TY + 21 + bowAt(x, L)));
          });
          set(hg, 'transform', `translate(${f2(hx)} 0) rotate(${f2(s.hk.x)} 0 ${TY + TW / 2})`);
          // The slap jolts the stop, not the case.
          set(sg, 'transform', `translate(${f2(X0 + REST + s.jo.x)} 0)`);
          set(hub, 'transform', `rotate(${f2(L * 1.6)} 56 55)`);
          // Retracting, the whirr climbs as the tape nears home.
          const v = s.x.v;
          if (s.mode === 'retract') zip.set(0.01 + 0.13 * clamp(-v / VMAX), 500 + 2600 * clamp((s.x0 - L) / Math.max(1, s.x0 - REST)));
          else zip.set(s.mode === 'drag' || s.mode === 'pull' ? 0.05 * clamp(Math.abs(v) / 1200) : 0, 700);
        },
      };
      function retract() {
        if (s.x.x <= REST + 0.5) { s.mode = 'rest'; s.x.t = REST; wake(body); return; }
        s.mode = 'retract'; s.x0 = s.x.x; s.x.v = Math.min(s.x.v, 600);
        wake(body);
      }
      // A yank pulls the tape further out; it retracts after a beat.
      function yank() {
        if (s.pid != null) return;
        s.mode = 'pull'; s.hold = 0;
        const run = MAXL - REST;
        s.x.t = clamp(Math.max(s.x.x + 0.2 * run, REST + rnd(0.35, 0.8) * run), REST, MAXL);
        wake(body);
      }
      const local = e => ((e.clientX - s.rect.left) / s.rect.width) * VW;
      tapeEl.addEventListener('pointerdown', e => {
        if (s.pid != null || e.button > 0) return;
        s.pid = e.pointerId;
        try { tapeEl.setPointerCapture(e.pointerId); } catch {}
        s.rect = tapeEl.getBoundingClientRect();
        // The tape moves with the finger, wherever the grab lands.
        s.off = s.x.x - local(e);
        s.mode = 'drag'; s.x.t = s.x.x;
        tapeEl.classList.add('held');
        wake(body);
      });
      tapeEl.addEventListener('pointermove', e => {
        if (e.pointerId !== s.pid) return;
        s.x.t = clamp(local(e) + s.off, REST, MAXL);
        wake(body);
      });
      const up = e => {
        if (e.pointerId !== s.pid) return;
        s.pid = null; tapeEl.classList.remove('held');
        retract();
      };
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => tapeEl.addEventListener(t, up));
      tapeEl.addEventListener('keydown', e => {
        if (KEYS.includes(e.key) || e.key === 'ArrowRight') yank();
        else if (e.key === 'ArrowLeft' || e.key === 'Home' || e.key === 'Escape') { if (s.pid == null) retract(); }
        else return;
        e.preventDefault();
      });
      moves.push({
        el: tapeEl,
        shuffle: yank,
        reset() { if (s.pid == null && (s.mode !== 'rest' || s.x.x > REST + 0.5)) retract(); },
      });
      fit();
      watch = new ResizeObserver(fit);
      watch.observe(tapeEl);
      return body;
    })());
    return { bodies, moves, destroy() { watch.disconnect(); zip.stop(); } };
  },
};
