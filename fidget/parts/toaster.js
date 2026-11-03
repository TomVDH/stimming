import {
  reduce, clamp, lerp, f2, f3, KEYS, css, ramp, C, el, set, nid, grad, svgIn, mat, skin, well, wake, S, spring, rest, snd,
} from '../kit.js';

const MARKUP = `<div class="grp"><button class="ctl toaster" type="button" aria-label="Toaster, toast is up"></button></div>`;

// The lever latches: a click over a hollow metal clunk.
const clunk = () => snd.play('toaster-down', 0.08, 0.12, (t, P, G) => {
  snd.hiss(t, 'highpass', 5000 * P, 0.7, 0.003, 0.2 * G);
  snd.hiss(t + 0.01, 'lowpass', 1100 * P, 0.9, 0.04, 0.5 * G);
  snd.ring(t + 0.01, 140 * P, 90 * P, 0.08, 0.4 * G);
  snd.ring(t + 0.01, 620 * P, 560 * P, 0.05, 0.05 * G);
});
// Toasting: a soft clockwork tick.
const tick = () => snd.play('toaster-tick', 0.1, 0.02, (t, P, G) => {
  snd.hiss(t, 'bandpass', 2600 * P, 2, 0.004, 0.08 * G);
  snd.ring(t, 1900 * P, 1880 * P, 0.01, 0.015 * G);
});
// The pop: a spring twang, a knock, then a bright ding.
const pop = () => snd.play('toaster-pop', 0.3, 1, (t, P, G) => {
  snd.hiss(t, 'bandpass', 1800 * P, 1.2, 0.02, 0.45 * G);
  snd.ring(t, 180 * P, 120 * P, 0.05, 0.3 * G);
  snd.ring(t, 520 * P, 980 * P, 0.12, 0.06 * G, 'triangle');
  const f = 2093 * P;
  snd.ring(t + 0.04, f, f * 0.999, 0.9, 0.07 * G);
  snd.ring(t + 0.04, f * 2.76, f * 2.75, 0.45, 0.02 * G);
});
// The toast slides back down its slots.
const drop = () => snd.play('toaster-drop', 0.1, 0.1, (t, P, G) => {
  snd.hiss(t, 'lowpass', 1500 * P, 0.8, 0.07, 0.16 * G);
  snd.ring(t + 0.05, 220 * P, 160 * P, 0.04, 0.1 * G);
});

export default {
  id: 'toaster', slot: 'small',
  css: `.p-toaster .grp { --sr: 0.9; } .p-toaster .toaster { --ar: 180 / 200; border-radius: 22%; }`,
  mount(cell) {
    cell.insertAdjacentHTML('beforeend', MARKUP);
    const bodies = [], moves = [];
    // A chrome toaster: two slots on top, a coral lever on the right end.
    const btn = cell.querySelector('.toaster');
    bodies.push((() => {
      const svg = svgIn(btn, '0 0 180 200'), defs = svg.k.defs;
      // Toast tops sit at UP when out and hide below DN when in.
      // The lever travels LT units down its track.
      const UP = 34, DN = 92, LY = 118, LT = 48, CLIP = 86, X0 = [31, 87];
      const STEEL = mat(C.steel, 0.06), navy = mat(C.navy, 0);
      [24, 118].forEach(x => skin(svg, svg, 'rect', { x, y: 182, width: 20, height: 12, rx: 4 }, navy, { rim: 1.5, sheen: false, shadow: { b: 3, y: 3, o: 0.6 } }));
      skin(svg, svg, 'rect', { x: 12, y: 76, width: 138, height: 30, rx: 14 }, mat([0.88, 0.01, 255], 0), { rim: 2, shadow: { b: 6, y: 8, o: 0.55 } });
      const SLOT = ramp([0.18, 0.014, 275], [0.55, 0.16, 35]), glows = [];
      [28, 84].forEach(x => {
        well(svg, svg, 'rect', { x, y: 80, width: 50, height: 10, rx: 5 }, { rim: 2 });
        glows.push(el('rect', { x: x + 2, y: 83, width: 46, height: 6, rx: 3, opacity: 0 }, svg));
      });
      // Each slice is crust round a lighter crumb with a few holes.
      const CRUMB = [ramp([0.93, 0.035, 88], [0.77, 0.12, 72]), ramp([0.77, 0.12, 72], [0.5, 0.09, 52])];
      const CRUST = [ramp([0.78, 0.08, 75], [0.6, 0.12, 60]), ramp([0.6, 0.12, 60], [0.36, 0.07, 45])];
      const tone = (R, d) => (d < 0.5 ? R[0](2 * d) : R[1](2 * d - 1));
      const id = nid('c');
      el('rect', { x: 0, y: -100, width: 180, height: 100 + CLIP }, el('clipPath', { id }, defs));
      const tray = el('g', { 'clip-path': `url(#${id})` }, svg);
      const sheen = grad(defs, 'linearGradient', { x1: 0, y1: 0, x2: 1, y2: 0 }, [[0, '#fff', 0.3], [0.5, '#fff', 0], [1, '#000', 0.2]]).url;
      const slices = X0.map(x => {
        const g = el('g', {}, tray);
        const crust = el('path', { d: 'M2 80L2 14Q-3 2 10 0Q22 -6 34 0Q47 2 42 14L42 80Z' }, g);
        const crumb = el('path', { d: 'M7 80L7 15Q4 6 12 5Q22 0 32 5Q40 6 37 15L37 80Z' }, g);
        [[15, 18, 2.2], [27, 26, 1.6], [18, 36, 1.4], [30, 14, 1.3], [24, 46, 2]].forEach(([cx, cy, r]) => el('ellipse', { cx, cy, rx: r, ry: r * 0.7, fill: '#000', opacity: 0.13 }, g));
        el('path', { d: 'M2 80L2 14Q-3 2 10 0Q22 -6 34 0Q47 2 42 14L42 80Z', fill: sheen }, g);
        return { x, g, crust, crumb, y: S(UP), rot: S(), wait: -1, kick: 0 };
      });
      // The slot's front lip hides the toast's foot.
      [28, 84].forEach(x => el('rect', { x: x + 3, y: 88.5, width: 44, height: 1.5, rx: 0.75, fill: '#fff', opacity: 0.35 }, svg));
      const front = skin(svg, svg, 'path', { d: 'M12 114Q12 92 34 92L128 92Q150 92 150 114L150 178Q150 190 138 190L24 190Q12 190 12 178Z' }, STEEL, { rim: 2.5 });
      // Vertical streaks read as polished chrome.
      const chrome = grad(defs, 'linearGradient', { x1: 0, y1: 0, x2: 1, y2: 0 }, [[0, '#000', 0.25], [0.12, '#fff', 0], [0.24, '#fff', 0.4], [0.34, '#fff', 0], [0.7, '#000', 0.1], [0.82, '#fff', 0.25], [1, '#000', 0.3]]);
      el('use', { href: '#' + front.shape.getAttribute('id'), fill: chrome.url }, svg);
      // A navy browning knob shows how dark the toast has got.
      skin(svg, svg, 'circle', { cx: 42, cy: 154, r: 12 }, navy, { rim: 1.5, shadow: { b: 2, y: 3, o: 0.5 } });
      const pointer = el('line', { x1: 42, y1: 154, x2: 42, y2: 145, stroke: css(C.cream), 'stroke-width': 2.4, 'stroke-linecap': 'round' }, svg);
      well(svg, svg, 'rect', { x: 142, y: LY - 6, width: 7, height: LT + 12, rx: 3.5 }, { rim: 1.5 });
      const lg = el('g', {}, svg);
      el('rect', { x: 144, y: LY - 3, width: 10, height: 6, fill: css([0.5, 0.012, 258]) }, lg);
      const knob = skin(svg, lg, 'rect', { x: 150, y: LY - 8, width: 26, height: 16, rx: 7 }, mat(C.coral, 0.12), { rim: 2, shadow: { b: 2.5, y: 3.5, o: 0.6 } });
      el('rect', { x: 155, y: LY - 5, width: 15, height: 3, rx: 1.5, fill: '#fff', opacity: 0.4 }, lg);

      // lv is the lever, 0 up and 1 down; gl is the slot heat.
      const s = { st: 'up', soft: false, lv: S(), gl: S(), done: 0, tt: 0, tk: 0, how: '', held: false, pid: null, y0: 0, l0: 0, moved: false, rect: null };
      const home = () => (s.st === 'up' ? UP : DN);
      const body = {
        step(h) {
          if (s.held) spring(s.lv, 1500, 0.9, h);
          else if (s.lv.t) spring(s.lv, 1600, 0.45, h);
          else spring(s.lv, 500, 0.3, h);
          spring(s.gl, 9, 1, h);
          if (s.st === 'toast') {
            // Three seconds of heat browns the toast a step.
            s.tt += h; s.done = Math.min(1, s.done + 0.13 * h);
            if (s.tt >= s.tk * 0.25) { s.tk++; tick(); }
            if (s.tt >= 3) eject(true);
          }
          for (const sl of slices) {
            if (sl.wait >= 0 && (sl.wait -= h) < 0) { sl.y.v -= sl.kick; sl.rot.v += (Math.random() < 0.5 ? -1 : 1) * 40; }
            // A held lever carries the toast down with it.
            if (s.held) sl.y.t = lerp(home(), DN, clamp(s.lv.x));
            // Popped toast bounces; held or sinking toast moves firmly.
            const firm = s.held || s.st !== 'up';
            spring(sl.y, firm ? 800 : 260, firm ? 0.9 : s.soft ? 0.75 : 0.22, h);
            spring(sl.rot, 300, 0.2, h);
          }
        },
        busy() {
          let b = s.st === 'toast';
          const a = rest(s.lv), g = rest(s.gl, 2e-3);
          for (const sl of slices) { const y = rest(sl.y, 0.05), r = rest(sl.rot, 0.02); if (!(y && r) || sl.wait >= 0) b = true; }
          return b || !(a && g);
        },
        draw() {
          set(lg, 'transform', `translate(0 ${f2(LT * s.lv.x)})`);
          knob.paint(s.held ? 0.5 : 0);
          const hot = SLOT(clamp(s.gl.x));
          glows.forEach(g => { set(g, 'fill', hot); set(g, 'opacity', f3(clamp(s.gl.x) * 0.9)); });
          const cr = tone(CRUMB, s.done), cu = tone(CRUST, s.done);
          for (const sl of slices) {
            set(sl.g, 'transform', `translate(${sl.x + 22} ${f2(sl.y.x)}) rotate(${f2(sl.rot.x)} 0 40) translate(-22 0)`);
            set(sl.crumb, 'fill', cr); set(sl.crust, 'fill', cu);
          }
          set(pointer, 'transform', `rotate(${f2(-120 + 240 * s.done)} 42 154)`);
        },
      };
      function label() {
        btn.setAttribute('aria-label', `Toaster, ${s.st === 'toast' ? 'toasting' : s.st === 'up' ? 'toast is up' : 'bread is in'}`);
      }
      // The lever latches, the toast sinks and the slots warm up.
      function press() {
        if (s.st === 'toast') return;
        s.st = 'toast'; s.tt = 0; s.tk = 1;
        s.lv.t = 1; s.gl.t = 1;
        slices.forEach(sl => { sl.y.t = DN; sl.wait = -1; });
        clunk(); label();
        wake(body);
      }
      // A pop flings both slices up, one a beat after the other.
      function eject(loud) {
        s.st = 'up'; s.soft = !loud; s.lv.t = 0; s.gl.t = 0;
        slices.forEach((sl, i) => {
          sl.y.t = UP;
          if (loud && !reduce) { sl.wait = i * 0.045; sl.kick = 560 + Math.random() * 120; }
        });
        if (loud) pop();
        label();
        wake(body);
      }
      function sink() {
        s.st = 'in';
        slices.forEach(sl => { sl.y.t = DN; });
        drop(); label();
        wake(body);
      }
      const local = e => [((e.clientX - s.rect.left) / s.rect.width) * 180, ((e.clientY - s.rect.top) / s.rect.height) * 200];
      btn.addEventListener('pointerdown', e => {
        if (s.pid != null || e.button > 0) return;
        s.pid = e.pointerId;
        try { btn.setPointerCapture(e.pointerId); } catch {}
        s.rect = btn.getBoundingClientRect();
        const [x, y] = local(e);
        s.y0 = e.clientY; s.moved = false;
        // A hand on the lever can drag it down.
        s.how = s.st !== 'toast' && x > 138 && Math.abs(y - (LY + LT * s.lv.x)) < 22 ? 'lever' : y < CLIP && x > 26 && x < 136 ? 'toast' : 'body';
        if (s.how === 'lever') { s.held = true; s.l0 = s.lv.x; wake(body); }
      });
      btn.addEventListener('pointermove', e => {
        if (e.pointerId !== s.pid) return;
        const dy = e.clientY - s.y0;
        if (Math.abs(dy) > 4) s.moved = true;
        if (s.how === 'lever') { s.lv.t = clamp(s.l0 + dy / ((s.rect.height * LT) / 200)); wake(body); }
      });
      const up = e => {
        if (e.pointerId !== s.pid) return;
        s.pid = null;
        const how = s.how, tap = !s.moved && e.type === 'pointerup';
        s.how = '';
        if (how === 'lever') {
          s.held = false;
          // Pulled past the catch, the lever latches.
          if (tap || s.lv.x > 0.6) press();
          else { s.lv.t = 0; slices.forEach(sl => { sl.y.t = home(); }); wake(body); }
          return;
        }
        if (!tap) return;
        if (s.st === 'toast') eject(true);
        else if (how === 'toast' && s.st === 'up') sink();
        else press();
      };
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => btn.addEventListener(t, up));
      // Keyboard clicks arrive with detail 0; pointer taps are handled above.
      btn.addEventListener('click', e => { if (e.detail === 0) (s.st === 'toast' ? eject(true) : press()); });
      btn.addEventListener('keydown', e => { if (KEYS.includes(e.key) && e.repeat) e.preventDefault(); });
      moves.push({
        el: btn,
        shuffle() { if (s.pid == null) press(); },
        // Reset lifts the toast quietly and gives fresh bread.
        reset() { if (s.pid == null) { if (s.st !== 'up') eject(false); s.done = 0; wake(body); } },
      });
      return body;
    })());
    return { bodies, moves, destroy() {} };
  },
};
