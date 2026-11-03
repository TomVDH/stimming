import {
  reduce, R2D, clamp, f2, f3, angDiff, css, ramp, C, el, set, grad, DOWN, svgIn, mat, skin, well, wake, S, spring, rest, snd,
} from '../kit.js';

const MARKUP = `<div class="grp"><button class="ctl ignition" type="button" role="switch" aria-checked="false" aria-label="Key switch"></button></div>`;

// Each tumbler the key rides over: a dry metal tick.
const grind = v => snd.play('key-grind', 0.02, 0.03, (t, P, G) => {
  G *= 0.3 + 0.7 * v;
  snd.hiss(t, 'bandpass', 3800 * P, 3, 0.012, 0.2 * G);
  snd.ring(t, 2300 * P, 2200 * P, 0.012, 0.025 * G);
});
// The end stop: a heavy clunk with a short steel ring.
const clunk = (on, v) => snd.play('key-clunk', 0.08, 0.1, (t, P, G) => {
  const k = (on ? 1.05 : 0.92) * P;
  G *= 0.4 + 0.6 * v;
  snd.hiss(t, 'lowpass', 1100 * k, 1, 0.03, 0.5 * G);
  snd.hiss(t, 'bandpass', 3000 * k, 1.6, 0.006, 0.25 * G);
  snd.ring(t, 120 * k, 80 * k, 0.07, 0.42 * G);
  snd.ring(t, 2650 * k, 2620 * k, 0.06, 0.03 * G);
});

export default {
  id: 'key', slot: 'small',
  css: `.p-key .grp { --sr: 0.85; } .p-key .ignition { --ar: 170 / 200; border-radius: 16%; cursor: grab; }`,
  mount(cell) {
    cell.insertAdjacentHTML('beforeend', MARKUP);
    const bodies = [], moves = [];
    // A navy plate holds a lamp and a steel cylinder.
    // A cream key sits in the cylinder.
    const btn = cell.querySelector('.ignition');
    const scrape = snd.drone(3);
    bodies.push((() => {
      const svg = svgIn(btn, '0 0 170 200'), defs = svg.k.defs;
      // The key turns about (CX, CY) through RANGE degrees.
      const CX = 85, CY = 122, RANGE = 90;
      skin(svg, svg, 'rect', { x: 4, y: 4, width: 162, height: 192, rx: 26 }, mat(C.navy, 0), { rim: 2.5, shadow: { b: 6, y: 8, o: 0.6 } });
      // The lamp lens fills butter when the key is on.
      skin(svg, svg, 'circle', { cx: CX, cy: 34, r: 16 }, mat(C.steel, 0), { rim: 2, shadow: { b: 2, y: 3, o: 0.5 } });
      const lens = el('circle', { cx: CX, cy: 34, r: 11 }, svg);
      el('circle', { cx: CX, cy: 34, r: 11, fill: grad(defs, 'radialGradient', { cx: 0.38, cy: 0.32, r: 0.75 }, [[0, '#fff', 0.5], [0.4, '#fff', 0], [1, '#000', 0.3]]).url }, svg);
      const LENS = ramp([0.34, 0.03, 80], [0.92, 0.13, 95]);
      // A printed arc shows the turn from off to on.
      const ARC = css([0.55, 0.03, 265]), R = 62;
      el('path', { d: `M${CX} ${CY - R}A${R} ${R} 0 0 1 ${CX + R} ${CY}`, fill: 'none', stroke: ARC, 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-dasharray': '1 9' }, svg);
      el('circle', { cx: CX, cy: CY - R, r: 4.5, fill: ARC }, svg);
      const onDot = el('circle', { cx: CX + R, cy: CY, r: 4.5 }, svg);
      // The cylinder: a steel bezel and a recessed face.
      skin(svg, svg, 'circle', { cx: CX, cy: CY, r: 44 }, mat(C.steel, 0), { rim: 2.5, shadow: { b: 4, y: 5, o: 0.55 } });
      well(svg, svg, 'circle', { cx: CX, cy: CY, r: 35 }, { rim: 3 });
      // The key head is drawn upright, then turned.
      const kg = el('g', {}, svg);
      const kk = skin(svg, kg, 'rect', { x: CX - 17, y: CY - 58, width: 34, height: 116, rx: 17 }, mat(C.cream, 0.12), { rim: 2.5, shadow: { b: 4, y: 6, o: 0.6 } });
      // The head has a hole, grip ribs and a steel shoulder.
      well(svg, kg, 'circle', { cx: CX, cy: CY - 40, r: 7 }, { rim: 2 });
      const RIB = css([0.74, 0.03, 80]);
      [26, 34, 42].forEach(dy => el('rect', { x: CX - 10, y: CY + dy - 1.5, width: 20, height: 3, rx: 1.5, fill: RIB }, kg));
      el('rect', { x: CX - 9, y: CY - 9, width: 18, height: 18, rx: 4, fill: grad(defs, 'linearGradient', { x1: 0, y1: 0, x2: 1, y2: 0 }, [[0, css([0.55, 0.01, 255])], [0.4, css([0.93, 0.008, 255])], [1, css([0.5, 0.012, 258])]]).url }, kg);
      el('rect', { x: CX - 11, y: CY - 52, width: 6, height: 26, rx: 3, fill: '#fff', opacity: 0.35 }, kg);

      // The key turns in degrees.
      // A soft spring keeps it at its end.
      // Past the trip point it snaps over to the far end.
      const TRIP = 0.72, KR = 260, ZR = 0.32;
      const s = { a: S(), lit: S(), pr: S(), on: false, pid: null, prev: 0, aim: 0, rect: null, moved: false, tick: 0, auto: false };
      const end = () => (s.on ? RANGE : 0);
      function flip(on) {
        s.on = on;
        s.lit.t = +on;
        btn.setAttribute('aria-checked', String(on));
      }
      const body = {
        step(h) {
          const a = s.a;
          // A held key lags the finger against the return spring.
          a.t = s.pid != null && s.moved ? (s.aim * 0.7 + end() * 0.3) : end();
          spring(a, s.pid != null ? KR * 1.6 : KR, s.pid != null ? 0.8 : ZR, h);
          if (s.pid != null && s.moved) {
            // The trip clicks in with a clunk and a snap.
            if (!s.on && a.x > RANGE * TRIP) { flip(true); clunk(true, 0.8); a.v += 300; }
            else if (s.on && a.x < RANGE * (1 - TRIP)) { flip(false); clunk(false, 0.8); a.v -= 300; }
          }
          // Each end stop knocks the key back.
          if (a.x < -4 || a.x > RANGE + 4) {
            const v = Math.abs(a.v);
            a.x = clamp(a.x, -4, RANGE + 4);
            if ((a.x < 0 && a.v < 0) || (a.x > 0 && a.v > 0)) { a.v *= -0.3; if (v > 60) clunk(a.x > 0, clamp(v / 900)); }
          }
          // Tumblers tick every 12 degrees of turn.
          const k = Math.floor(a.x / 12);
          if (k !== s.tick) { s.tick = k; if (Math.abs(a.v) > 30) grind(clamp(Math.abs(a.v) / 600)); }
          spring(s.lit, 500, 1, h);
          spring(s.pr, 900, 0.6, h);
        },
        busy() { const a = rest(s.a, 0.05), b = rest(s.lit), c = rest(s.pr); return !(a && b && c); },
        draw() {
          const a = s.a.x, sc = 1 - 0.04 * s.pr.x;
          set(kg, 'transform', `rotate(${f2(a)} ${CX} ${CY}) translate(${CX} ${CY}) scale(${f3(sc)}) translate(${-CX} ${-CY})`);
          kk.paint(s.pr.x * 0.7);
          const l = LENS(s.lit.x);
          set(lens, 'fill', l); set(onDot, 'fill', s.lit.x > 0.5 ? l : ARC);
          // The metal grinds softly while the key turns.
          scrape.set(0.025 * clamp(Math.abs(s.a.v) / 500), 1800 + Math.abs(s.a.v));
        },
      };
      // A tap or a key press turns it to the other end.
      function turn(on) {
        if (on === s.on) return;
        flip(on);
        if (reduce) clunk(on, 0.6);
        wake(body);
      }
      const polar = e => {
        const r = s.rect, x = r.left + (CX / 170) * r.width, y = r.top + (CY / 200) * r.height;
        return Math.atan2(e.clientX - x, -(e.clientY - y));
      };
      btn.addEventListener('pointerdown', e => {
        if (s.pid != null || e.button > 0) return;
        s.pid = e.pointerId;
        try { btn.setPointerCapture(e.pointerId); } catch {}
        s.rect = btn.getBoundingClientRect();
        s.prev = polar(e); s.aim = s.a.x; s.moved = false;
        s.pr.t = 1; btn.classList.add('held');
        wake(body);
      });
      btn.addEventListener('pointermove', e => {
        if (e.pointerId !== s.pid) return;
        const a = polar(e), d = angDiff(a, s.prev) * R2D;
        s.prev = a;
        s.aim = clamp(s.aim + d, -40, RANGE + 40);
        if (!s.moved && Math.abs(s.aim - s.a.x) > 6) s.moved = true;
        wake(body);
      });
      const up = e => {
        if (e.pointerId !== s.pid) return;
        s.pid = null; s.pr.t = 0; btn.classList.remove('held');
        if (!s.moved && e.type === 'pointerup') turn(!s.on);
        s.moved = false;
        wake(body);
      };
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => btn.addEventListener(t, up));
      // Keyboard clicks arrive with detail 0; pointer taps are handled above.
      btn.addEventListener('click', e => { if (e.detail === 0) turn(!s.on); });
      btn.addEventListener('keydown', e => {
        const v = e.key === 'ArrowRight' ? true : e.key === 'ArrowLeft' ? false : null;
        if (v === null) return;
        e.preventDefault();
        turn(v);
      });
      moves.push({
        el: btn,
        // Shuffle turns the key the other way.
        shuffle() { if (s.pid == null) turn(!s.on); },
        // Reset turns it off.
        reset() { if (s.pid == null) turn(false); },
      });
      return body;
    })());
    return { bodies, moves, destroy() { scrape.stop(); } };
  },
};
