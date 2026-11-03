import {
  reduce, R2D, clamp, f2, f3, rnd, KEYS, css, C, el, set, grad, DOWN, blur, svgIn, mat, skin, well, wake, S, spring, rest, snd,
} from '../kit.js';

const MARKUP = `<div class="ctl pcar wide" id="car-road" tabindex="0" role="slider" aria-label="Pull-back car, wind" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"></div>`;

// The ratchet clicks as the wheels wind the spring.
const tick = v => snd.play('car-tick', 0.022, 0.03, (t, P, G) => {
  G *= 0.4 + 0.6 * v;
  snd.hiss(t, 'highpass', 4400 * P, 0.8, 0.004, 0.26 * G);
  snd.ring(t, 2300 * P, 2200 * P, 0.016, 0.03 * G);
});
// Let go: a rising whoosh and a climbing whine.
const zoom = v => snd.play('car-zoom', 0.2, 0.6, (t, P, G) => {
  G *= 0.4 + 0.6 * v;
  snd.rise(t, 300 * P, 2600 * P, 0.42, 0.12 * G);
  snd.ring(t, 260 * P, 820 * P, 0.5, 0.035 * G, 'triangle');
});
// The nose meets the rubber stop.
const bonk = v => snd.play('car-bonk', 0.06, 0.16, (t, P, G) => {
  G *= 0.3 + 0.7 * v;
  snd.hiss(t, 'lowpass', 900 * P, 1, 0.03, 0.45 * G);
  snd.ring(t, 190 * P, 105 * P, 0.14, 0.3 * G);
  snd.ring(t, 540 * P, 470 * P, 0.05, 0.05 * G, 'triangle');
});
// A tap on the car: two little horn beeps.
const honk = () => snd.play('car-honk', 0.35, 0.35, (t, P, G) => {
  [0, 0.15].forEach(d => {
    snd.ring(t + d, 494 * P, 488 * P, 0.11, 0.035 * G, 'square');
    snd.ring(t + d, 622 * P, 615 * P, 0.11, 0.02 * G, 'square');
  });
});

export default {
  id: 'car', slot: 'band',
  css: `.p-car .pcar { border-radius: 10px; cursor: grab; }`,
  mount(cell) {
    cell.insertAdjacentHTML('beforeend', MARKUP);
    const bodies = [], moves = [];
    let watch = null;
    // A road with a dashed centre line, a coral car, a striped rubber stop.
    const roadEl = cell.querySelector('.pcar');
    const whine = snd.drone(3);
    bodies.push((() => {
      const VH = 100, GY = 86, svg = svgIn(roadEl, `0 0 600 ${VH}`), defs = svg.k.defs;
      const road = well(svg, svg, 'rect', { x: 6, y: 34, width: 588, height: 60, rx: 14 }, { rim: 4 });
      const dashG = el('g', { fill: css(C.cream), opacity: 0.5 }, svg);
      // Speed lines trail the car when it is fast.
      const lines = el('g', { stroke: css(C.cream), 'stroke-width': 3, 'stroke-linecap': 'round', opacity: 0 }, svg);
      const LN = [[-30, 34, -84], [-24, 52, -66], [-34, 70, -96]].map(([a, y, b]) => el('line', { x1: a, y1: y - GY, x2: b, y2: y - GY }, lines));
      // The stop: butter rubber with two ink stripes.
      const stopG = el('g', {}, svg);
      const stopK = skin(svg, stopG, 'rect', { y: 40, width: 20, height: 52, rx: 9 }, mat(C.butter, 0.1), { rim: 2, shadow: { b: 3, y: 4, o: 0.5 } });
      const stripes = el('g', { stroke: css([0.3, 0.03, 265]), 'stroke-width': 5, 'stroke-linecap': 'round', opacity: 0.8 }, stopG);
      const st = [56, 74].map(y => el('line', { y1: y + 6, y2: y - 6 }, stripes));
      // The car's shadow stays on the road.
      const shadow = el('ellipse', { cy: GY + 2, rx: 66, ry: 5, fill: '#000', opacity: 0.55, filter: blur(defs, 3) }, svg);
      // The car's origin is the rear wheel's contact point.
      const cg = el('g', {}, svg);
      const bodyG = el('g', {}, cg);
      const COR = mat(C.coral, 0);
      skin(svg, bodyG, 'path', { d: 'M10-38C14-62 24-67 40-67H60C74-67 82-56 92-38Z' }, COR, { rim: 2.5 });
      skin(svg, bodyG, 'rect', { x: -14, y: -42, width: 128, height: 30, rx: 13 }, COR, { rim: 2.5 });
      const WIN = grad(defs, 'linearGradient', DOWN, [[0, css(C.cream)], [1, css([0.82, 0.03, 240])]]).url;
      el('path', { d: 'M21-41C24-56 30-60 40-60H47V-41Z', fill: WIN }, bodyG);
      el('path', { d: 'M53-60H59C69-60 75-53 82-41H53Z', fill: WIN }, bodyG);
      el('path', { d: 'M29-56L35-58L28-44L23-44Z', fill: '#fff', opacity: 0.6 }, bodyG);
      // Arches shade the wheel wells.
      [10, 84].forEach(x => el('path', { d: `M${x - 19}-12A19 19 0 0 1 ${x + 19}-12Z`, fill: css([0.32, 0.08, 30]) }, bodyG));
      el('circle', { cx: 107, cy: -31, r: 5, fill: css(C.butter) }, bodyG);
      el('circle', { cx: 105.8, cy: -32.4, r: 1.8, fill: '#fff' }, bodyG);
      el('rect', { x: -15, y: -36, width: 5, height: 9, rx: 2, fill: css(C.red) }, bodyG);
      skin(svg, bodyG, 'rect', { x: 100, y: -20, width: 20, height: 8, rx: 4 }, mat(C.steel, 0), { rim: 1.5, sheen: false });
      skin(svg, bodyG, 'rect', { x: -20, y: -20, width: 18, height: 8, rx: 4 }, mat(C.steel, 0), { rim: 1.5, sheen: false });
      const TYRE = mat([0.24, 0.015, 275], 0), STEEL = css(C.steel);
      const wheels = [10, 84].map(x => {
        const g = el('g', {}, cg);
        skin(svg, g, 'circle', { cx: x, cy: -15, r: 15 }, TYRE, { rim: 2 });
        const hub = el('g', {}, g);
        el('circle', { cx: x, cy: -15, r: 7, fill: STEEL }, hub);
        [0, 120, 240].forEach(a => el('rect', { x: x - 1.6, y: -27, width: 3.2, height: 8, rx: 1.6, fill: STEEL, transform: `rotate(${a} ${x} -15)` }, hub));
        el('circle', { cx: x, cy: -15, r: 2.5, fill: css([0.45, 0.02, 260]) }, hub);
        return { hub, x };
      });

      let VW = 600, XL = 22, X0 = 110, XR = 400, SX = 520;
      const MAXW = 160;
      const s = {
        x: 110, v: 0, wind: 0, mode: 'rest', T: 0, off: 0, pid: null, rect: null, cx0: 0, moved: false,
        pitch: S(), sq: S(), pad: S(), clickAt: 0, auto: 0, need: 0, goal: null, vNow: '',
      };
      function fit() {
        const r = roadEl.getBoundingClientRect(), f = XR > XL ? (s.x - XL) / (XR - XL) : 0;
        if (r.width > 0 && r.height > 0) VW = Math.max(420, Math.round((VH * r.width) / r.height));
        svg.setAttribute('viewBox', `0 0 ${VW} ${VH}`);
        set(road, 'width', VW - 12);
        // The dashes run the whole road.
        while (dashG.firstChild) dashG.firstChild.remove();
        for (let x = 22; x < VW - 40; x += 46) el('rect', { x, y: 61, width: 24, height: 4, rx: 2 }, dashG);
        SX = VW - 30;
        set(stopK.shape, 'x', SX);
        st.forEach(l => { set(l, 'x1', SX + 4); set(l, 'x2', SX + 16); });
        XR = SX - 120;
        s.x = s.mode === 'rest' && f < 0.12 ? X0 : XL + clamp(f) * (XR - XL);
        body.draw();
      }
      const body = {
        step(h) {
          spring(s.pitch, 150, 0.28, h);
          spring(s.sq, 700, 0.3, h);
          spring(s.pad, 700, 0.25, h);
          if (reduce) {
            s.v = 0;
            if (s.mode === 'drag') s.x = s.T;
            else if (s.goal != null) { s.x = s.goal; s.goal = null; s.mode = 'rest'; }
            return;
          }
          const x0 = s.x;
          let a = 0;
          if (s.mode === 'drag') a = 1600 * (s.T - s.x) - 70 * s.v;
          else if (s.mode === 'auto') {
            // Shuffle backs the car up, winding as it goes, then lets go.
            s.v = -320;
            // Against the wall the wheels still spin back and wind.
            if (s.x <= s.auto) { s.x = s.auto; s.wind = Math.max(s.wind, s.need); launch(); }
          } else if (s.mode === 'home') {
            a = 70 * (X0 - s.x) - 2 * 0.85 * Math.sqrt(70) * s.v;
            if (Math.abs(X0 - s.x) < 0.5 && Math.abs(s.v) < 3) { s.x = X0; s.v = 0; s.mode = 'rest'; }
          } else if (s.mode === 'run') {
            // The spring drives the wheels until it runs down.
            const drive = s.wind > 0 ? 2600 * clamp(s.wind / 30, 0.25, 1) : 0;
            a = drive - 0.3 * s.v - 110 * Math.sign(s.v);
            s.pitch.t = (7 * drive) / 2600;
            if (Math.abs(s.v) < 8 && drive === 0) { s.v = 0; a = 0; s.mode = 'rest'; s.pitch.t = 0; }
          }
          s.v += a * h;
          s.x += s.v * h;
          const dx = s.x - x0;
          if (s.mode === 'run' && dx > 0) { s.wind = Math.max(0, s.wind - dx / 3); if (!s.wind) s.pitch.t = 0; }
          // Rolling back winds the spring through a 2:1 gear.
          // The ratchet clicks once per notch.
          if ((s.mode === 'drag' || s.mode === 'auto') && dx < 0) {
            s.wind = Math.min(MAXW, s.wind - 2 * dx);
            s.clickAt += dx;
            if (s.clickAt < -8) { s.clickAt = 0; tick(clamp(-s.v / 400)); }
          }
          // The rubber stop throws the car back.
          if (s.x > XR) {
            const hit = s.v;
            s.x = XR;
            if (hit > 0) {
              s.v = -0.36 * hit;
              if (hit > 40) {
                bonk(clamp(hit / 1500));
                s.pad.v -= hit / 160; s.sq.v += hit / 220; s.pitch.v -= hit / 18;
              }
              s.wind = 0; s.pitch.t = 0;
            }
          }
          if (s.x < XL) { s.x = XL; if (s.v < 0) s.v *= -0.3; }
        },
        busy() {
          const a = rest(s.pitch, 0.01), b = rest(s.sq), c = rest(s.pad);
          let m = s.mode === 'run' || s.mode === 'auto' || s.mode === 'home';
          if (s.mode === 'drag') m = Math.abs(s.T - s.x) > 0.05 || Math.abs(s.v) > 0.5;
          if (reduce) m = s.goal != null;
          return m || !(a && b && c);
        },
        draw() {
          const p = Math.max(-4, s.pitch.x), q = clamp(s.sq.x, -0.12, 0.14);
          // Nose up turns about the rear wheel; a bonk squashes the nose.
          set(cg, 'transform', `translate(${f2(s.x)} ${GY}) rotate(${f2(-p)}) scale(${f3(1 - q)} ${f3(1 + 0.6 * q)})`);
          wheels.forEach(w => set(w.hub, 'transform', `rotate(${f2((s.x / 15) * R2D % 360)} ${w.x} -15)`));
          set(shadow, 'cx', f2(s.x + 50));
          set(shadow, 'rx', f2(66 - 1.5 * clamp(p, 0, 8)));
          const pd = clamp(s.pad.x, -0.5, 0.3);
          set(stopG, 'transform', `translate(${f2(SX + 20)} 66) scale(${f3(1 + pd * 0.8)} ${f3(1 - 0.2 * pd)}) translate(${f2(-SX - 20)} -66)`);
          const sp = Math.max(0, s.v);
          set(lines, 'opacity', f3(0.6 * clamp((sp - 300) / 900)));
          set(lines, 'transform', `translate(${f2(s.x)} ${GY})`);
          LN.forEach((l, i) => set(l, 'x2', f2(-30 - clamp(sp / 1600) * (40 + 16 * i))));
          whine.set(0.035 * clamp(Math.abs(s.v) / 1500) * (s.wind > 0 ? 1 : 0.5), 380 + 0.8 * Math.abs(s.v));
          const n = String(Math.round((s.wind / MAXW) * 100));
          if (n !== s.vNow) { s.vNow = n; roadEl.setAttribute('aria-valuenow', n); }
        },
      };
      function launch() {
        if (s.wind < 12) { s.mode = 'run'; s.wind = 0; wake(body); return; }
        zoom(clamp(s.wind / MAXW));
        s.mode = 'run';
        s.v = Math.max(s.v, 0) + 3 * s.wind;
        s.pitch.v += 40 + s.wind * 0.6;
        wake(body);
      }
      // Reduced motion places the car instead of driving it.
      function go(x) { s.goal = x; s.wind = 0; s.mode = 'rest'; wake(body); }
      const local = e => ((e.clientX - s.rect.left) / s.rect.width) * VW;
      roadEl.addEventListener('pointerdown', e => {
        if (s.pid != null || e.button > 0) return;
        s.pid = e.pointerId;
        try { roadEl.setPointerCapture(e.pointerId); } catch {}
        s.rect = roadEl.getBoundingClientRect();
        const q = local(e);
        // The finger catches the car wherever it lands.
        s.off = s.x - q;
        s.T = s.x; s.cx0 = e.clientX; s.moved = false;
        s.mode = 'drag'; s.v = 0; s.clickAt = 0;
        roadEl.classList.add('held');
        wake(body);
      });
      roadEl.addEventListener('pointermove', e => {
        if (e.pointerId !== s.pid) return;
        if (Math.abs(e.clientX - s.cx0) > 4) s.moved = true;
        if (!s.moved) return;
        s.T = clamp(local(e) + s.off, XL, XR);
        wake(body);
      });
      const up = e => {
        if (e.pointerId !== s.pid) return;
        s.pid = null; roadEl.classList.remove('held');
        if (reduce) {
          if (s.wind >= 12) go(XR);
          else s.mode = 'rest';
          return;
        }
        // A tap honks; a pull lets the car go.
        if (!s.moved && e.type === 'pointerup') { honk(); s.mode = 'rest'; s.pitch.v += 50; s.sq.v += 0.6; wake(body); return; }
        launch();
      };
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => roadEl.addEventListener(t, up));
      function windUp(d) {
        if (reduce) { s.x = Math.max(XL, s.x - d / 2); s.wind = Math.min(MAXW, s.wind + d); tick(0.5); wake(body); return; }
        s.auto = Math.max(XL, s.x - d / 2); s.need = d;
        s.mode = 'auto';
        wake(body);
      }
      function home() {
        if (reduce) { go(X0); return; }
        s.wind = 0; s.mode = 'home';
        wake(body);
      }
      roadEl.addEventListener('keydown', e => {
        if (s.pid != null) return;
        // Left winds a notch; Right, Space or Enter lets go; Home parks it.
        if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
          const d = Math.min(20, s.x - XL);
          if (d > 1 && s.wind < MAXW) {
            if (reduce) windUp(d);
            else { s.x -= d; s.wind = Math.min(MAXW, s.wind + 2 * d); tick(0.6); s.mode = 'rest'; wake(body); }
          }
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp' || KEYS.includes(e.key)) {
          if (reduce) { if (s.wind >= 12) go(XR); } else launch();
        } else if (e.key === 'Home') home();
        else return;
        e.preventDefault();
      });
      moves.push({
        el: roadEl,
        // Shuffle backs the car up a random amount and lets it go.
        shuffle() {
          if (s.pid != null) return;
          const d = rnd(70, MAXW);
          if (reduce) { go(XR); return; }
          windUp(d);
        },
        // Reset rolls the car home.
        reset() { if (s.pid == null && (Math.abs(s.x - X0) > 0.5 || s.mode !== 'rest')) home(); },
      });
      fit();
      watch = new ResizeObserver(fit);
      watch.observe(roadEl);
      return body;
    })());
    return { bodies, moves, destroy() { watch.disconnect(); whine.stop(); } };
  },
};
