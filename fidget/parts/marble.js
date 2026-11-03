import {
  reduce, R2D, clamp, mod, f2, f3, rnd, KEYS, css, C, el, set, nid, svgIn, mat, skin, well, wake, S, spring, rest, snd,
} from '../kit.js';

const MARKUP = `<div class="ctl marble wide" id="marble-run" tabindex="0" role="slider" aria-label="Marble channel" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"></div>`;

// The marble clicks over a bump: up the near side, down the far side.
const tick = v => snd.play('mtick', 0.02, 0.05, (t, P, G) => {
  G *= 0.3 + 0.7 * v;
  snd.hiss(t, 'bandpass', 2600 * P, 1.8, 0.006, 0.26 * G);
  snd.ring(t, 1700 * P, 1620 * P, 0.02, 0.04 * G);
  snd.hiss(t + 0.022, 'bandpass', 2200 * P, 1.6, 0.006, 0.18 * G);
});
// Glass meets rubber: a soft, low knock.
const thud = v => snd.play('mthud', 0.04, 0.07, (t, P, G) => {
  G *= 0.25 + 0.75 * v;
  snd.hiss(t, 'lowpass', 900 * P, 1, 0.025, 0.42 * G);
  snd.ring(t, 150 * P, 100 * P, 0.05, 0.26 * G);
});

export default {
  id: 'marble', slot: 'band',
  css: `.p-marble .marble { border-radius: 10px; cursor: grab; }`,
  mount(cell) {
    cell.insertAdjacentHTML('beforeend', MARKUP);
    const bodies = [], moves = [];
    let watch = null;
    // A deep recessed channel, coral rubber stops, three steel bumps, a big glass marble.
    const runEl = cell.querySelector('.marble');
    const roll = snd.drone(1.1);
    bodies.push((() => {
      // The marble is drawn at radius 16, then scaled up to MR.
      const VH = 100, CY = 50, MR = 35, MK = MR / 16, svg = svgIn(runEl, `0 0 600 ${VH}`), defs = svg.k.defs;
      // The whole tray tips about its middle.
      const tg = el('g', {}, svg);
      const chan = well(svg, tg, 'rect', { x: 8, y: 8, width: 584, height: 84, rx: 42 }, { rim: 5 });
      const PAD = mat(C.coral, 0.12), padSh = { b: 3, y: 4, o: 0.5 };
      const pads = [0, 1].map(() => {
        const g = el('g', {}, tg);
        return { g, k: skin(svg, g, 'rect', { y: 16, width: 14, height: 68, rx: 7 }, PAD, { rim: 2, shadow: padSh }), sq: S() };
      });
      const BM = mat([0.72, 0.012, 255], 0);
      const bumps = [0, 1, 2].map(() => skin(svg, tg, 'rect', { y: 13, width: 12, height: 74, rx: 6 }, BM, { rim: 2, shadow: { b: 2, y: 3, o: 0.45 } }));
      // The marble: sky glass, a turning swirl, a fixed glint on top.
      const mg = el('g', {}, tg);
      const ball = skin(svg, mg, 'circle', { r: 16 }, mat(C.sky, 0.06), { rim: 2, shadow: { b: 2.5, y: 3.5, o: 0.6 } });
      const clip = el('clipPath', { id: nid('c') }, defs);
      el('circle', { r: 14.5 }, clip);
      const sw = el('g', { 'clip-path': `url(#${clip.id})` }, mg);
      const spin = el('g', { fill: 'none', 'stroke-linecap': 'round' }, sw);
      el('path', { d: 'M-3-15C10-6-10 6 3 15', stroke: css(C.coral), 'stroke-width': 4.5, opacity: 0.9 }, spin);
      el('path', { d: 'M-15 3C-6-10 6 10 15-3', stroke: css(C.butter), 'stroke-width': 3, opacity: 0.85 }, spin);
      // A small inner gleam turns with the swirl as the marble rolls.
      el('ellipse', { cx: 6, cy: -7, rx: 3.2, ry: 1.8, fill: '#fff', opacity: 0.7, transform: 'rotate(40 6 -7)' }, spin);
      el('ellipse', { cx: -5.5, cy: -7, rx: 6, ry: 3.6, fill: '#fff', opacity: 0.7, transform: 'rotate(-32 -5.5 -7)' }, mg);
      el('circle', { cx: -7.5, cy: -8.5, r: 1.6, fill: '#fff' }, mg);
      void ball;

      let VW = 600, X0 = 67, X1 = 533, BX = [], TD = 2;
      // Tilt pull, bump height and width, the gravity behind the bumps.
      const GT = 1500, HB = 3, WB = 9, GB = 2000;
      const s = { x: X0, v: 0, a: 0, tilt: S(), pid: null, grab: false, T: 0, off: 0, cx0: 0, q0: 0, moved: false, home: false, goal: null, side: [0, 0, 0], rect: null, phi: 0, pin: false };
      // The channel follows the plate; the marble keeps its share of the run.
      function fit() {
        const r = runEl.getBoundingClientRect(), f = X1 > X0 ? (s.x - X0) / (X1 - X0) : 0;
        if (r.width > 0 && r.height > 0) VW = Math.max(320, Math.round((VH * r.width) / r.height));
        svg.setAttribute('viewBox', `0 0 ${VW} ${VH}`);
        set(chan, 'width', VW - 16);
        set(pads[0].k.shape, 'x', 18); set(pads[1].k.shape, 'x', VW - 32);
        X0 = 32 + MR; X1 = VW - 32 - MR;
        BX = [0.3, 0.5, 0.7].map(k => X0 + k * (X1 - X0));
        bumps.forEach((b, i) => set(b.shape, 'x', f2(BX[i] - 6)));
        s.x = X0 + clamp(f) * (X1 - X0); s.T = clamp(s.T, X0, X1);
        s.side = BX.map(b => Math.sign(s.x - b));
        // Long trays tip less, so their ends stay on the plate.
        TD = clamp(R2D * Math.atan(12 / (VW / 2)), 0.6, 2.4);
        body.draw();
      }
      // Bumps are smooth hills; the marble feels their slope.
      function hills(x) {
        let a = 0, lift = 0;
        for (const b of BX) {
          const u = (x - b) / WB, e = Math.exp(-u * u);
          a += (GB * HB * e * 2 * u) / WB; lift += e;
        }
        return [a, lift];
      }
      const body = {
        step(h) {
          spring(s.tilt, 140, 0.8, h);
          pads.forEach(p => spring(p.sq, 700, 0.25, h));
          if (reduce) {
            s.v = 0; s.a = 0;
            if (s.grab) s.x = s.T;
            else if (s.goal != null) { s.x = s.goal; s.goal = null; }
            s.side = BX.map(b => Math.sign(s.x - b));
            return;
          }
          let a;
          if (s.grab) a = 1600 * (s.T - s.x) - 70 * s.v;
          else {
            a = GT * s.tilt.x + hills(s.x)[0];
            // Rolling drag; a slow marble on level ground just stops.
            if (Math.abs(s.v) < 6 && Math.abs(a) < 45) { s.v = 0; a = 0; }
            else a -= 0.5 * s.v + 30 * Math.sign(s.v);
          }
          s.v += a * h;
          s.x += s.v * h;
          s.a = a;
          // Rubber stops throw the marble back and squash.
          s.pin = false;
          for (const [i, lim, dir] of [[0, X0, -1], [1, X1, 1]]) {
            if ((s.x - lim) * dir <= 0) continue;
            const hit = s.v * dir;
            s.x = lim;
            if (hit > 30) { thud(clamp(hit / 800)); pads[i].sq.x = clamp(hit / 900, 0, 0.5); }
            if (hit > 0) s.v *= -0.5;
            s.pin = a * dir > 0 && Math.abs(s.v) < 12;
          }
          // Each bump crest the marble passes ticks.
          BX.forEach((b, i) => {
            const sd = Math.sign(s.x - b);
            if (sd && sd !== s.side[i]) { if (s.side[i] && Math.abs(s.v) > 25) tick(clamp(Math.abs(s.v) / 700)); s.side[i] = sd; }
          });
          // Reset tips the tray left until the marble lies home.
          if (s.home && s.x <= X0 + 0.5 && Math.abs(s.v) < 25) { s.home = false; s.tilt.t = 0; }
        },
        busy() {
          const a = rest(s.tilt), b = pads.every(p => rest(p.sq));
          if (reduce) return !(a && b) || s.goal != null;
          let m = Math.abs(s.v) > 1.5 && !s.pin;
          if (s.grab) m = Math.abs(s.T - s.x) > 0.05 || Math.abs(s.v) > 0.5;
          if (!m) s.v = 0;
          return m || !(a && b) || s.home;
        },
        draw() {
          set(tg, 'transform', `rotate(${f2(TD * s.tilt.x)} ${f2(VW / 2)} ${CY})`);
          // Over a bump the marble rises toward the light.
          const lift = hills(s.x)[1], sc = MK * (1 + 0.05 * lift);
          set(mg, 'transform', `translate(${f2(s.x)} ${f2(CY - 2.5 * lift)}) scale(${f3(sc)})`);
          set(spin, 'transform', `rotate(${f2(mod((s.x / MR) * R2D, 360))})`);
          pads.forEach((p, i) => {
            const q = clamp(p.sq.x, -0.2, 0.5), ox = i ? VW - 18 : 18;
            set(p.g, 'transform', `translate(${f2(ox)} 50) scale(${f3(1 - 0.5 * q)} ${f3(1 + 0.15 * q)}) translate(${f2(-ox)} -50)`);
          });
          // The rolling drone follows speed.
          const sp = Math.abs(s.v);
          roll.set(0.07 * clamp(sp / 600) ** 0.8, 260 + 0.7 * sp);
          const n = Math.round(((s.x - X0) / (X1 - X0 || 1)) * 100);
          set(runEl, 'aria-valuenow', clamp(n, 0, 100));
        },
      };
      // A push rolls the marble; reduced motion places it instead.
      function push(dv) {
        if (reduce) s.goal = clamp(s.x + Math.sign(dv) * 0.18 * (X1 - X0), X0, X1);
        else s.v = clamp(s.v + dv, -1400, 1400);
        s.home = false;
        wake(body);
      }
      const local = e => ((e.clientX - s.rect.left) / s.rect.width) * VW;
      runEl.addEventListener('pointerdown', e => {
        if (s.pid != null || e.button > 0) return;
        s.pid = e.pointerId;
        try { runEl.setPointerCapture(e.pointerId); } catch {}
        s.rect = runEl.getBoundingClientRect();
        const q = local(e);
        // On the marble, the finger holds it; elsewhere, it tips the tray.
        s.grab = Math.abs(q - s.x) < MR + 12;
        s.off = s.x - q; s.T = s.x; s.cx0 = e.clientX; s.q0 = q;
        s.moved = false; s.home = false;
        runEl.classList.add('held');
        wake(body);
      });
      runEl.addEventListener('pointermove', e => {
        if (e.pointerId !== s.pid) return;
        const dx = e.clientX - s.cx0;
        if (Math.abs(dx) > 4) s.moved = true;
        if (s.grab) s.T = clamp(local(e) + s.off, X0, X1);
        else {
          s.tilt.t = clamp(dx / Math.min(160, s.rect.width * 0.2), -1, 1);
          if (reduce && Math.abs(s.tilt.t) > 0.5) s.goal = s.tilt.t < 0 ? X0 : X1;
        }
        wake(body);
      });
      const up = e => {
        if (e.pointerId !== s.pid) return;
        s.pid = null; runEl.classList.remove('held');
        s.tilt.t = 0;
        // A released marble keeps the speed of the finger.
        if (s.grab) { s.grab = false; s.v = clamp(s.v, -1400, 1400); }
        // A tap on the channel nudges the marble toward it.
        else if (!s.moved && e.type === 'pointerup') push(Math.sign(s.q0 - s.x) * 320);
        wake(body);
      };
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => runEl.addEventListener(t, up));
      function goHome() {
        if (reduce) { s.goal = X0; wake(body); return; }
        s.home = true; s.tilt.t = -0.8;
        wake(body);
      }
      runEl.addEventListener('keydown', e => {
        if (s.pid != null) return;
        const d = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
        if (d) push(d * 320);
        else if (e.key === 'Home') goHome();
        else if (KEYS.includes(e.key)) push((Math.random() < 0.5 ? -1 : 1) * rnd(500, 900));
        else return;
        e.preventDefault();
      });
      moves.push({
        el: runEl,
        // Shuffle flicks the marble one way or the other.
        shuffle() {
          if (s.pid != null) return;
          if (reduce) { s.goal = rnd(X0, X1); wake(body); return; }
          push((s.x > (X0 + X1) / 2 ? -1 : 1) * rnd(550, 1000));
        },
        reset() { if (s.pid == null && s.x > X0 + 0.5) goHome(); },
      });
      fit();
      watch = new ResizeObserver(fit);
      watch.observe(runEl);
      return body;
    })());
    return { bodies, moves, destroy() { watch.disconnect(); roll.stop(); } };
  },
};
