import {
  reduce, PI, R2D, clamp, f2, f3, KEYS, css, ramp, C, el, set, grad, svgIn, mat, skin, well, wake, S, spring, rest, snd,
} from '../kit.js';

const MARKUP = `<div class="grp"><div class="ctl metro" tabindex="0" role="slider" aria-label="Metronome" aria-valuemin="40" aria-valuemax="208" aria-valuenow="100" aria-valuetext="100 beats a minute, stopped"></div></div>`;

// The classic tempo marks, slow to fast.
const MARKS = [40, 42, 44, 46, 48, 50, 52, 54, 56, 58, 60, 63, 66, 69, 72, 76, 80, 84, 88, 92, 96, 100, 104, 108, 112, 116, 120, 126, 132, 138, 144, 152, 160, 168, 176, 184, 192, 200, 208];
const LABELS = [40, 50, 60, 72, 84, 100, 120, 144, 176, 208];
const HOME = MARKS.indexOf(100);

// A woody tock at each swing; the first beat of four rings higher.
const tock = up => snd.play('metro-tock', 0.05, 0.08, (t, P, G) => {
  const k = (up ? 1.26 : 1) * P;
  snd.hiss(t, 'bandpass', 2400 * k, 3, 0.012, 0.42 * G);
  snd.ring(t, 1180 * k, 1120 * k, 0.05, (up ? 0.16 : 0.12) * G);
  snd.ring(t, 2950 * k, 2900 * k, 0.025, 0.04 * G);
  snd.ring(t, 420 * k, 360 * k, 0.04, 0.12 * G);
});

export default {
  id: 'metronome', slot: 'big',
  css: `.p-metronome .grp { --sr: 0.8; } .p-metronome .metro { --ar: 320 / 400; border-radius: 18px; cursor: grab; }`,
  mount(cell) {
    cell.insertAdjacentHTML('beforeend', MARKUP);
    const bodies = [], moves = [];
    // A navy pyramid case with a cream scale plate.
    // A steel rod swings from a low pivot; a coral weight slides on it.
    const mEl = cell.querySelector('.metro');
    bodies.push((() => {
      const VW = 320, VH = 400, svg = svgIn(mEl, `0 0 ${VW} ${VH}`), defs = svg.k.defs;
      // The pivot sits at PX, PY; the swing reaches AMP radians.
      const PX = 160, PY = 332, AMP = 0.38, ROD = 318, WH = 40;
      // The weight's top edge reads the tempo, from RT0 to RT1.
      const RT0 = 106, RT1 = 286, LN = Math.log(208 / 40);
      const rOf = b => RT0 + ((RT1 - RT0) * Math.log(208 / b)) / LN - WH / 2;
      const bpmAt = r => 208 * Math.exp((-LN * (r + WH / 2 - RT0)) / (RT1 - RT0));
      const RMIN = rOf(208), RMAX = rOf(40);
      const ink = css([0.32, 0.04, 262]);
      // The case narrows from the plinth to a rounded crown.
      const half = y => 34 + (86 * (y - 14)) / 346;
      skin(svg, svg, 'path', { d: 'M126 24Q126 12 138 12L182 12Q194 12 194 24L280 360L40 360Z' }, mat(C.navy, 0), { rim: 3, shadow: { b: 8, y: 10, o: 0.6 } });
      // Faint grain lines run down both faces.
      const grain = el('g', { fill: 'none', stroke: '#fff', 'stroke-width': 1.2, opacity: 0.06 }, svg);
      [-0.9, -0.78, 0.8, 0.92].forEach(k => el('path', { d: `M${f2(PX + k * half(30))} 30L${f2(PX + k * half(350))} 350` }, grain));
      // The plate tapers with the case.
      const PT = 34, PB = 252, ht = y => 30 + (12 * (y - PT)) / (PB - PT);
      skin(svg, svg, 'path', { d: `M${PX - 30} ${PT}L${PX + 30} ${PT}L${PX + 42} ${PB}L${PX - 42} ${PB}Z` }, mat(C.cream, 0), { rim: 2, shadow: { b: 2, y: 2, o: 0.45 } });
      // Ticks sit right of the rod; numbers sit left of it.
      let tk = '';
      MARKS.forEach(b => {
        const y = f2(PY - rOf(b) - WH / 2), big = LABELS.includes(b);
        tk += `M${PX + 7} ${y}h${big ? 15 : 8}`;
      });
      el('path', { d: tk, fill: 'none', stroke: ink, 'stroke-width': 1.4, 'stroke-linecap': 'round', opacity: 0.8 }, svg);
      const nums = el('g', { fill: ink, 'font-family': 'Gabarito, sans-serif', 'font-weight': 700, 'font-size': 13, 'text-anchor': 'end' }, svg);
      LABELS.forEach(b => {
        const y = PY - rOf(b) - WH / 2;
        el('text', { x: PX - 8, y: f2(y), dy: '0.36em' }, nums).textContent = String(b);
      });
      // A steel wing key winds the spring on the right flank.
      skin(svg, svg, 'rect', { x: PX + half(300) - 4, y: 295, width: 16, height: 10, rx: 2 }, mat(C.steel, 0), { rim: 1, sheen: false });
      skin(svg, svg, 'ellipse', { cx: PX + half(300) + 20, cy: 300, rx: 9, ry: 19 }, mat(C.steel, 0), { rim: 1.5, shadow: { b: 2, y: 3, o: 0.5 } });
      // The plinth carries four beat pips.
      skin(svg, svg, 'rect', { x: 22, y: 352, width: 276, height: 40, rx: 10 }, mat([0.3, 0.035, 265], 0), { rim: 2.5, shadow: { b: 5, y: 6, o: 0.55 } });
      const OFF = [0.3, 0.03, 268], pips = [0, 1, 2, 3].map(i => {
        const x = PX - 27 + 18 * i;
        well(svg, svg, 'circle', { cx: x, cy: 372, r: 6.5 }, { rim: 1.5 });
        return { c: el('circle', { cx: x, cy: 372, r: 4.5 }, svg), R: ramp(OFF, i ? C.butter : C.coral) };
      });
      // The pendulum turns as one group about the pivot.
      const pg = el('g', {}, svg);
      skin(svg, pg, 'rect', { x: PX - 3, y: PY - ROD, width: 6, height: ROD + 8, rx: 3 }, mat(C.steel, 0), { rim: 1, cyl: true, sheen: false, shadow: { b: 2, y: 4, o: 0.4 } });
      skin(svg, pg, 'circle', { cx: PX, cy: PY - ROD, r: 4.5 }, mat(C.steel, 0), { rim: 1 });
      const wg = el('g', {}, pg);
      const wt = skin(svg, wg, 'path', { d: 'M-18 -20L18 -20Q24 -20 24 -14L22 14Q22 20 16 20L-16 20Q-22 20 -22 14L-24 -14Q-24 -20 -18 -20Z' }, mat(C.coral, 0.12), { rim: 2.5, shadow: { b: 4, y: 6, o: 0.55 } });
      // A cream line marks the reading edge; a steel screw clamps the weight.
      el('rect', { x: -20, y: -18, width: 40, height: 3, rx: 1.5, fill: css(C.cream), opacity: 0.85 }, wg);
      el('rect', { x: -2, y: -14, width: 4, height: 32, rx: 2, fill: grad(defs, 'linearGradient', { x1: 0, y1: 0, x2: 1, y2: 0 }, [[0, css([0.5, 0.01, 255])], [0.4, css([0.92, 0.008, 255])], [1, css([0.45, 0.01, 255])]]).url, opacity: 0.8 }, wg);
      skin(svg, wg, 'circle', { cx: 27, cy: 2, r: 5 }, mat(C.steel, 0), { rim: 1, shadow: { b: 1.5, y: 2, o: 0.5 } });
      skin(svg, svg, 'circle', { cx: PX, cy: PY, r: 13 }, mat(C.steel, 0.05), { rim: 2, shadow: { b: 3, y: 4, o: 0.55 } });
      el('circle', { cx: PX, cy: PY, r: 4, fill: css([0.45, 0.012, 258]) }, svg);

      // ph is the swing phase and a its size; th is the drawn angle.
      const s = {
        mode: 'idle', ph: 0, k: 0, beat: 0, a: S(), th: S(), r: S(rOf(100)), sq: S(), mi: HOME, pl: [0, 0, 0, 0],
        pid: null, how: '', onW: false, x0: 0, y0: 0, off: 0, rect: null, trail: [], ni: -1, val: '',
      };
      s.r.t = s.r.x;
      const body = {
        step(h) {
          // The weight follows the finger closely and bounces into a detent.
          spring(s.r, s.how === 'weight' ? 1400 : 500, s.how === 'weight' ? 0.9 : 0.45, h);
          spring(s.sq, 900, 0.3, h);
          if (s.mode === 'run' || s.mode === 'stop') {
            // One swing takes one beat at the weight's tempo.
            s.ph += (PI * bpmAt(s.r.x) * h) / 60;
            if (s.mode === 'run') spring(s.a, 60, 0.8, h);
            else spring(s.a, 30, 1, h);
            s.th.x = s.th.t = s.a.x * Math.sin(s.ph); s.th.v = 0;
            // The swing passes an extreme at each odd quarter turn.
            const k = Math.floor(s.ph / PI + 0.5);
            if (k !== s.k) { s.k = k; if (s.mode === 'run') beat(); }
            if (s.mode === 'stop' && rest(s.a, 2e-3)) { s.mode = 'idle'; s.th.x = s.th.t = 0; }
          } else if (s.mode === 'push') spring(s.th, 700, 0.8, h);
          // Let go, the pendulum swings home and dies away.
          else spring(s.th, 40, 0.12, h);
          for (let i = 0; i < 4; i++) if (s.pl[i]) { s.pl[i] *= Math.exp(-5 * h); if (s.pl[i] < 0.01) s.pl[i] = 0; }
        },
        busy() {
          const a = rest(s.r, 0.05), b = rest(s.sq, 1e-3);
          const c = s.mode === 'run' || s.mode === 'stop' ? false : rest(s.th, 1e-3);
          return !(a && b && c) || s.pl.some(v => v > 0);
        },
        draw() {
          const th = reduce ? 0 : s.th.x, q = s.sq.x;
          set(pg, 'transform', `rotate(${f2(th * R2D)} ${PX} ${PY})`);
          set(wg, 'transform', `translate(${PX} ${f2(PY - s.r.x)}) scale(${f3(1 + 0.05 * q)} ${f3(1 - 0.05 * q)})`);
          wt.paint(s.how === 'weight' ? 0.6 : 0);
          pips.forEach((p, i) => set(p.c, 'fill', p.R(s.pl[i])));
          const bpm = Math.round(bpmAt(s.r.x)), val = `${bpm} beats a minute, ${s.mode === 'run' ? 'ticking' : 'stopped'}`;
          if (val !== s.val) { s.val = val; mEl.setAttribute('aria-valuenow', String(bpm)); mEl.setAttribute('aria-valuetext', val); }
        },
      };
      function beat() {
        const i = s.beat % 4;
        tock(i === 0);
        s.pl[i] = 1; s.beat++;
        s.sq.v += 6;
      }
      // A start from the centre gives the pendulum a kick.
      function start(th0 = 0, w = 0) {
        if (s.mode === 'run') return;
        snd.latch(true);
        if (s.mode !== 'stop') {
          if (Math.abs(th0) > 0.06) { s.a.x = Math.min(Math.abs(th0), AMP * 1.2); s.a.v = 0; s.ph = (Math.sign(th0) * PI) / 2; }
          else { s.a.x = 0.3 * AMP; s.a.v = 1.5; s.ph = w < 0 ? PI : 0; }
          s.k = Math.floor(s.ph / PI + 0.5);
        }
        s.a.t = AMP; s.beat = 0; s.mode = 'run';
        wake(body);
      }
      function stop() {
        if (s.mode !== 'run') return;
        snd.latch(false);
        s.mode = 'stop'; s.a.t = 0;
        wake(body);
      }
      const toggle = () => (s.mode === 'run' ? stop() : start());
      // The weight lands on a tempo mark.
      function go(i, quiet) {
        s.mi = clamp(i, 0, MARKS.length - 1);
        s.r.t = rOf(MARKS[s.mi]);
        if (!quiet) snd.notch(0.7);
        wake(body);
      }
      const near = r => { const b = bpmAt(r); let j = 0; MARKS.forEach((m, i) => { if (Math.abs(m - b) < Math.abs(MARKS[j] - b)) j = i; }); return j; };
      const local = e => [((e.clientX - s.rect.left) / s.rect.width) * VW, ((e.clientY - s.rect.top) / s.rect.height) * VH];
      const along = ([x, y]) => (x - PX) * Math.sin(s.th.x) - (y - PY) * Math.cos(s.th.x);
      const angle = ([x, y]) => Math.atan2(x - PX, PY - y);
      mEl.addEventListener('pointerdown', e => {
        if (s.pid != null || e.button > 0) return;
        s.pid = e.pointerId;
        try { mEl.setPointerCapture(e.pointerId); } catch {}
        s.rect = mEl.getBoundingClientRect();
        const p = local(e), th = s.th.x;
        [s.x0, s.y0] = p;
        // A press near the weight may slide it.
        s.onW = Math.hypot(p[0] - (PX + s.r.x * Math.sin(th)), p[1] - (PY - s.r.x * Math.cos(th))) < 36;
        s.how = 'tap';
        mEl.classList.add('held');
      });
      mEl.addEventListener('pointermove', e => {
        if (e.pointerId !== s.pid) return;
        const p = local(e), dx = p[0] - s.x0, dy = p[1] - s.y0;
        if (s.how === 'tap' && Math.hypot(dx, dy) > 6) {
          // Up and down slides the weight; sideways pushes the rod.
          if (s.onW && Math.abs(dy) >= Math.abs(dx)) { s.how = 'weight'; s.off = s.r.x - along(p); s.ni = near(s.r.x); }
          else {
            // The hand catches a swinging rod where it is.
            s.how = 'push'; s.mode = 'push';
            s.th.t = s.th.x; s.th.v = 0; s.off = s.th.x - angle(p); s.trail = [];
          }
        }
        if (s.how === 'weight') {
          s.r.t = clamp(along(p) + s.off, RMIN, RMAX);
          const i = near(s.r.t);
          if (i !== s.ni) { s.ni = i; snd.notch(0.5); }
          wake(body);
        } else if (s.how === 'push') {
          s.th.t = clamp(angle(p) + s.off, -1.25 * AMP, 1.25 * AMP);
          s.trail.push([e.timeStamp, s.th.t]);
          while (s.trail.length > 2 && e.timeStamp - s.trail[0][0] > 100) s.trail.shift();
          wake(body);
        }
      });
      const up = e => {
        if (e.pointerId !== s.pid) return;
        s.pid = null; mEl.classList.remove('held');
        const how = s.how;
        s.how = '';
        if (how === 'tap') { if (e.type === 'pointerup') toggle(); }
        else if (how === 'weight') go(near(s.r.t));
        else if (how === 'push') {
          // A push or a flick sets it swinging; a nudge just rocks it.
          const q = s.trail, n = q.length;
          let w = 0;
          if (n > 1 && q[n - 1][0] > q[0][0]) w = (q[n - 1][1] - q[0][1]) / ((q[n - 1][0] - q[0][0]) / 1000);
          s.mode = 'idle';
          if (Math.abs(s.th.x) > 0.06 || Math.abs(w) > 0.8) start(s.th.x, w);
          else { s.th.t = 0; wake(body); }
        }
        wake(body);
      };
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => mEl.addEventListener(t, up));
      mEl.addEventListener('keydown', e => {
        if (s.pid != null) return;
        const d = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: 4, PageDown: -4 }[e.key];
        // Arrows step the tempo mark; Space starts and stops.
        if (d) go(s.mi + d);
        else if (e.key === 'Home') go(0);
        else if (e.key === 'End') go(MARKS.length - 1);
        else if (KEYS.includes(e.key)) { if (!e.repeat) toggle(); }
        else return;
        e.preventDefault();
      });
      moves.push({
        el: mEl,
        shuffle() { if (s.pid == null) { go(6 + Math.floor(Math.random() * 29)); start(); } },
        reset() { if (s.pid == null) { stop(); if (s.mi !== HOME) go(HOME, true); } },
      });
      return body;
    })());
    return { bodies, moves, destroy() {} };
  },
};
