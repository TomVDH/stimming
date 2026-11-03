import { reduce, clamp, f2, f3, rnd, KEYS, css, C, el, set, grad, svgIn, mat, skin, wake, S, spring, rest, snd } from '../kit.js';

const MARKUP = `<div class="grp"><button class="ctl dbell" id="bell-desk" type="button" aria-label="Service bell"></button></div>`;

// A strike tick, then bright inharmonic partials with a long decay.
// Two close fundamentals beat slowly, like a real dome.
const ding = v => snd.play('bell', 0.04, 0.8, (t, P, G) => {
  G *= v;
  const f = 1620 * P;
  snd.hiss(t, 'highpass', 5200 * P, 0.7, 0.004, 0.22 * G);
  [[1, 1.7, 0.08], [1.004, 1.5, 0.05], [2.32, 1.0, 0.04], [4.25, 0.55, 0.026], [6.63, 0.3, 0.014]].forEach(([k, d, g]) => {
    snd.ring(t, f * k, f * k * 0.999, d, g * G);
  });
});

export default {
  id: 'bell', slot: 'small',
  css: `.p-bell .grp { --sr: 1; } .p-bell .dbell { --ar: 1; border-radius: 22%; }`,
  mount(cell) {
    cell.insertAdjacentHTML('beforeend', MARKUP);
    const bodies = [], moves = [];
    // A steel dome sits on a dark base.
    // The plunger rises from its crown.
    const btn = cell.querySelector('.dbell');
    bodies.push((() => {
      const svg = svgIn(btn, '0 0 200 200'), defs = svg.k.defs;
      skin(svg, svg, 'rect', { x: 16, y: 144, width: 168, height: 40, rx: 20 }, mat([0.3, 0.035, 265], 0), { rim: 2.5, shadow: { b: 6, y: 8, o: 0.6 } });
      // Sound lines flank the dome and fade as the ring dies.
      const cream = css(C.cream), arcs = [];
      [['M44 64Q32 76 36 94', 'M156 64Q168 76 164 94'], ['M30 50Q12 74 20 102', 'M170 50Q188 74 180 102']].forEach(pair => {
        const g = el('g', { fill: 'none', stroke: cream, 'stroke-width': 5, 'stroke-linecap': 'round', opacity: 0 }, svg);
        pair.forEach(d => el('path', { d }, g));
        arcs.push(g);
      });
      const dg = el('g', {}, svg);
      // The rod goes in first, so the dome hides its foot.
      const pg = el('g', {}, dg);
      el('rect', { x: 95, y: 30, width: 10, height: 34, rx: 3, fill: grad(defs, 'linearGradient', { x1: 0, y1: 0, x2: 1, y2: 0 }, [[0, css([0.5, 0.01, 255])], [0.35, css([0.92, 0.008, 255])], [1, css([0.45, 0.01, 255])]]).url }, pg);
      const knob = skin(svg, pg, 'ellipse', { cx: 100, cy: 30, rx: 16, ry: 9 }, mat(C.steel, 0.1), { rim: 2, shadow: { b: 2, y: 3, o: 0.5 } });
      const dome = skin(svg, dg, 'path', { d: 'M28 150A72 96 0 0 1 172 150Z' }, mat(C.steel, 0.06), { rim: 3, shadow: { b: 5, y: 6, o: 0.5 } });
      // Vertical streaks read as polished chrome.
      const chrome = grad(defs, 'linearGradient', { x1: 0, y1: 0, x2: 1, y2: 0 }, [[0, '#000', 0.28], [0.18, '#fff', 0], [0.3, '#fff', 0.38], [0.42, '#fff', 0], [0.75, '#000', 0.12], [1, '#000', 0.32]]);
      el('use', { href: '#' + dome.shape.getAttribute('id'), fill: chrome.url }, dg);
      el('ellipse', { cx: 70, cy: 96, rx: 6, ry: 17, fill: '#fff', opacity: 0.55, transform: 'rotate(22 70 96)' }, dg);
      // A darker band marks the dome's rolled lip.
      skin(svg, dg, 'rect', { x: 22, y: 144, width: 156, height: 10, rx: 5 }, mat([0.62, 0.012, 255], 0), { rim: 1.5, sheen: false });

      // The dome sways slowly and shimmers fast after each strike.
      const s = { p: S(), wb: S(), sh: S(), e: 0, dir: 1, held: false, pid: null, kb: false, keyAt: 0 };
      const body = {
        step(h) {
          spring(s.p, s.held ? 2000 : 900, s.held ? 0.8 : 0.4, h);
          spring(s.wb, 420, 0.05, h);
          spring(s.sh, 9000, 0.04, h);
          if (s.e) { s.e *= Math.exp(-1.1 * h); if (s.e < 0.004) s.e = 0; }
        },
        busy() {
          const a = rest(s.p), b = rest(s.wb, 0.02), c = rest(s.sh, 1e-4);
          return !(a && b && c && s.e === 0);
        },
        draw() {
          const p = s.p.x, sh = s.sh.x;
          set(pg, 'transform', `translate(0 ${f2(8 * p)})`);
          knob.paint(clamp(p) * 0.6);
          set(dg, 'transform', `rotate(${f2(s.wb.x)} 100 150) translate(100 150) scale(${f3(1 + sh)} ${f3(1 - sh)}) translate(-100 -150)`);
          // The outer lines fade first.
          set(arcs[0], 'opacity', f3(clamp(s.e * 1.6)));
          set(arcs[1], 'opacity', f3(clamp(s.e * 1.6 - 0.5)));
        },
      };
      // Each strike rocks the dome the other way.
      function strike() {
        ding(1);
        if (!reduce) { s.dir = -s.dir; s.wb.v += s.dir * rnd(50, 80); s.sh.v += 1.4; }
        s.e = Math.min(1, s.e + 0.8);
        wake(body);
      }
      function press() { s.held = true; s.p.t = 1; strike(); }
      function release() { s.held = false; s.p.t = 0; wake(body); }
      btn.addEventListener('pointerdown', e => {
        if (s.pid != null || s.kb || e.button > 0) return;
        s.pid = e.pointerId;
        try { btn.setPointerCapture(e.pointerId); } catch {}
        press();
      });
      const up = e => { if (e.pointerId === s.pid) { s.pid = null; release(); } };
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => btn.addEventListener(t, up));
      btn.addEventListener('keydown', e => {
        if (!KEYS.includes(e.key)) return;
        e.preventDefault();
        if (!e.repeat && !s.kb && s.pid == null) { s.kb = true; press(); }
      });
      btn.addEventListener('keyup', e => {
        if (!KEYS.includes(e.key) || !s.kb) return;
        e.preventDefault();
        s.kb = false; s.keyAt = performance.now();
        release();
      });
      btn.addEventListener('blur', () => { if (s.kb) { s.kb = false; release(); } });
      // Assistive tech clicks without key events; they get a short tap.
      const tap = () => { if (s.held || s.kb || s.pid != null) return; press(); setTimeout(release, 110); };
      btn.addEventListener('click', e => {
        if (e.detail !== 0 || performance.now() - s.keyAt < 300) return;
        tap();
      });
      moves.push({ el: btn, shuffle: tap, reset() {} });
      return body;
    })());
    return { bodies, moves, destroy() {} };
  },
};
