import {
  reduce, TAU, R2D, clamp, mod, f2, f3, rnd, KEYS, css, mixLch, C, el, set, nid, grad, blur, svgIn, mat, skin, wake, S, spring, rest, snd,
} from '../kit.js';

const MARKUP = `<div class="grp"><div class="ctl pinw" id="pinwheel" tabindex="0" role="slider" aria-label="Pinwheel" aria-valuemin="0" aria-valuemax="8" aria-valuenow="0" aria-valuetext="Still"></div></div>`;

// Each vane passing the stick gives a soft paper flap.
const flap = v => snd.play('pw-flap', 0.018, 0.05, (t, P, G) => {
  G *= 0.3 + 0.7 * v;
  snd.hiss(t, 'bandpass', (700 + 1900 * v) * P, 0.9, 0.014 + 0.03 * (1 - v), 0.16 * G);
  snd.hiss(t + 0.004, 'highpass', 3800 * P, 0.7, 0.006, 0.05 * G);
});
// A puff of breath: a short whoosh.
const puff = v => snd.play('pw-puff', 0.12, 0.3, (t, P, G) => {
  snd.rise(t, 500 * P, 1400 * P, 0.22, 0.09 * G * v);
});

export default {
  id: 'pinwheel', slot: 'big',
  css: `.p-pinwheel .grp { --sr: 0.85; } .p-pinwheel .pinw { --ar: 340 / 400; border-radius: 30px; cursor: grab; }`,
  mount(cell) {
    cell.insertAdjacentHTML('beforeend', MARKUP);
    const bodies = [], moves = [];
    // Four curled paper vanes on a cream stick, held by a steel pin.
    const pwEl = cell.querySelector('.pinw');
    const breeze = snd.drone(0.7);
    bodies.push((() => {
      const svg = svgIn(pwEl, '0 0 340 400'), defs = svg.k.defs;
      const CX = 170, CY = 150, R = 148, BX = 170, BY = 396;
      const at = (r, a) => [f2(r * Math.sin(a)), f2(-r * Math.cos(a))];
      const P = (r, deg) => at(r, deg * (TAU / 360)).join(' ');
      // A vane points up: a straight cut, a bulging sail, a curl back to the hub.
      const SAIL = `M0 0L${P(R, 0)}Q${P(R * 0.92, 42)} ${P(R * 0.46, 82)}Q${P(R * 0.2, 86)} 0 0Z`;
      // The curl is a thin lens along the cut that shows the paper's pale back.
      const CURL = `M0 0L${P(R, 0)}Q${P(R * 0.58, 15)} 0 0Z`;
      const COLS = [C.coral, C.butter, C.mint, C.sky];
      // The whole toy leans about the foot of the stick.
      const lg = el('g', {}, svg);
      skin(svg, lg, 'rect', { x: BX - 10, y: CY, width: 20, height: BY - CY, rx: 10 }, mat(C.cream, 0), { rim: 2, cyl: true, shadow: { b: 5, y: 8, o: 0.5 } });
      // The shadow turns with the vanes but stays offset down the screen.
      const shG = el('g', { filter: blur(defs, 7), opacity: 0.5 }, lg);
      const shR = el('g', {}, shG);
      for (let i = 0; i < 4; i++) el('path', { d: SAIL, fill: '#000', transform: `rotate(${i * 90})` }, shR);
      // Ghost copies smear the vanes at speed.
      const ghosts = [];
      const vanes = (parent, full) => {
        const g = el('g', {}, parent);
        COLS.forEach((c, i) => {
          const vg = el('g', { transform: `rotate(${i * 90})` }, g);
          if (!full) { el('path', { d: SAIL, fill: css(c) }, vg); return; }
          // The sail darkens toward the hub, where the paper curls away.
          const fill = grad(defs, 'linearGradient', { gradientUnits: 'userSpaceOnUse', x1: 0, y1: 0, x2: f2(R * 0.5), y2: f2(-R * 0.8) }, [[0, css([c[0] - 0.2, c[1] * 1.1, c[2]])], [0.45, css(c)], [1, css([c[0] + 0.05, c[1] * 0.9, c[2]])]]);
          el('path', { d: SAIL, fill: fill.url }, vg);
          const back = css(mixLch(c, C.cream, 0.7));
          el('path', { d: CURL, fill: grad(defs, 'linearGradient', { gradientUnits: 'userSpaceOnUse', x1: 0, y1: 0, x2: 0, y2: -R }, [[0, back, 0.2], [0.6, back, 0.95], [1, '#fff', 1]]).url }, vg);
          // A crease runs out along the cut.
          el('path', { d: `M0 0L${P(R, 0)}`, stroke: css([c[0] - 0.25, c[1], c[2]]), 'stroke-width': 2, 'stroke-linecap': 'round', opacity: 0.55 }, vg);
        });
        return g;
      };
      for (let k = 0; k < 4; k++) { const g = vanes(lg, false); set(g, 'opacity', 0); ghosts.push(g); }
      const main = vanes(lg, true);
      // The board's sheen lights the sails from the top left, whatever their turn.
      const clip = el('clipPath', { id: nid('c') }, defs);
      const cps = [0, 1, 2, 3].map(() => el('path', { d: SAIL }, clip));
      el('circle', { cx: CX, cy: CY, r: R, fill: svg.k.sheen, opacity: 0.8, 'clip-path': `url(#${clip.id})` }, lg);
      // A cream bead and a steel pin head hold the hub.
      skin(svg, lg, 'circle', { cx: CX, cy: CY, r: 19 }, mat(C.cream, 0), { rim: 2, shadow: { b: 3, y: 4, o: 0.5 } });
      skin(svg, lg, 'circle', { cx: CX, cy: CY, r: 11 }, mat(C.steel, 0), { rim: 2, shadow: { b: 2, y: 3, o: 0.55 } });
      el('circle', { cx: CX - 3.5, cy: CY - 4, r: 3, fill: '#fff', opacity: 0.85 }, lg);

      const s = { th: 0, w: 0, wind: 0, brake: false, lean: S(), pid: null, lx: 0, ly: 0, lt: 0, rect: null, pass: 0, val: '' };
      // Air drag grows with speed; a small bearing drag stops the tail.
      const AL = 0.16, AQ = 0.0045, MU = 0.35, WMAX = 46;
      const body = {
        step(h) {
          spring(s.lean, 160, 0.22, h);
          s.lean.t *= Math.exp(-5 * h);
          if (reduce) { s.w = 0; s.wind = 0; return; }
          let a = -AL * s.w - AQ * s.w * Math.abs(s.w) - MU * Math.sign(s.w);
          // Wind faster than the vanes pushes them on.
          if (s.wind > s.w) a += 5 * (s.wind - s.w);
          if (s.brake) a -= 3 * s.w + 5 * Math.sign(s.w);
          s.wind *= Math.exp(-5 * h);
          if (s.wind < 0.05) s.wind = 0;
          const w0 = s.w;
          s.w += a * h;
          // Drag stops the spin; it never turns it back.
          if (s.w * w0 < 0 || (Math.abs(s.w) < 0.03 && s.wind === 0)) { s.w = 0; s.brake = false; }
          s.th += s.w * h;
          const n = Math.floor(s.th / (TAU / 4));
          if (n !== s.pass) { s.pass = n; flap(clamp(Math.abs(s.w) / 36)); }
        },
        busy() {
          const still = rest(s.lean, 0.01);
          if (s.w === 0 && s.wind === 0) s.th = mod(s.th, TAU);
          return s.w !== 0 || s.wind > 0 || !still;
        },
        draw() {
          const w = Math.abs(s.w), deg = f2(mod(s.th * R2D, 360));
          set(lg, 'transform', `rotate(${f2(s.lean.x)} ${BX} ${BY})`);
          set(main, 'transform', `translate(${CX} ${CY}) rotate(${deg})`);
          set(shR, 'transform', `translate(${CX} ${CY + 12}) rotate(${deg})`);
          cps.forEach((p, i) => set(p, 'transform', `translate(${CX} ${CY}) rotate(${f2(deg + i * 90)})`));
          // The smear spans one frame's turn, up to a full vane gap.
          const q = clamp((w - 7) / 26), span = Math.min(w / 40, TAU / 4) * R2D;
          ghosts.forEach((g, k) => {
            if (q <= 0) { set(g, 'opacity', 0); return; }
            set(g, 'transform', `translate(${CX} ${CY}) rotate(${f2(deg - span * ((k + 1) / 4))})`);
            set(g, 'opacity', f3(0.32 * q * (1 - k * 0.18)));
          });
          // The breeze rises in level and colour with speed.
          const g = clamp(w / 40);
          breeze.set(0.035 * g * Math.sqrt(g), 450 + 1500 * g);
          const rps = Math.round((w / TAU) * 2) / 2;
          const val = rps ? `${rps} turns a second` : 'Still';
          if (val !== s.val) { s.val = val; pwEl.setAttribute('aria-valuenow', String(Math.min(8, rps))); pwEl.setAttribute('aria-valuetext', val); }
        },
      };
      // A gust adds wind; reduced motion turns the vanes a step instead.
      function gust(w) {
        s.brake = false;
        if (reduce) { s.th += TAU / 8; wake(body); return; }
        s.wind = clamp(Math.max(s.wind, s.w + w), 0, WMAX);
        wake(body);
      }
      pwEl.addEventListener('pointerdown', e => {
        if (s.pid != null || e.button > 0) return;
        s.pid = e.pointerId;
        try { pwEl.setPointerCapture(e.pointerId); } catch {}
        s.rect = pwEl.getBoundingClientRect();
        s.lx = e.clientX; s.ly = e.clientY; s.lt = e.timeStamp;
        pwEl.classList.add('held');
        // A tap is a small puff.
        gust(5);
      });
      // Any stroke across the toy blows on it; its speed sets the wind.
      pwEl.addEventListener('pointermove', e => {
        if (e.pointerId !== s.pid) return;
        const dt = Math.max(8, e.timeStamp - s.lt) / 1000, dx = e.clientX - s.lx, dy = e.clientY - s.ly;
        if (Math.abs(dx) + Math.abs(dy) < 2) return;
        const u = Math.hypot(dx, dy) / dt / s.rect.width;
        s.lx = e.clientX; s.ly = e.clientY; s.lt = e.timeStamp;
        if (reduce) { if (u > 1.5) gust(0); return; }
        s.brake = false;
        s.wind = clamp(Math.max(s.wind, 9 * u), 0, WMAX);
        s.lean.t = clamp(s.lean.t + (dx / s.rect.width) * 6, -4, 4);
        if (u > 1.2) puff(clamp(u / 5));
        wake(body);
      });
      const end = e => {
        if (e.pointerId !== s.pid) return;
        s.pid = null; pwEl.classList.remove('held');
      };
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => pwEl.addEventListener(t, end));
      function stop() {
        if (s.w !== 0 || s.wind > 0) { s.wind = 0; s.brake = true; wake(body); }
      }
      pwEl.addEventListener('keydown', e => {
        if (s.pid != null) return;
        const d = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: 1, ArrowDown: 1 }[e.key];
        // Arrows blow softly; Space blows hard; Home stops the vanes.
        if (d) gust(6);
        else if (KEYS.includes(e.key)) { gust(22); puff(0.6); }
        else if (e.key === 'Home' || e.key === 'Escape') stop();
        else return;
        e.preventDefault();
      });
      moves.push({
        el: pwEl,
        // Shuffle sends a gust and a lean.
        shuffle() {
          if (s.pid != null) return;
          gust(rnd(18, 38));
          if (!reduce) s.lean.t = rnd(-3, 3);
        },
        reset() { if (s.pid == null) stop(); },
      });
      return body;
    })());
    return { bodies, moves, destroy() { breeze.stop(); } };
  },
};
