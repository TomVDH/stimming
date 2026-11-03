import {
  reduce, TAU, clamp, lerp, f2, f3, rnd, KEYS, css, C, el, set, svgIn, mat, skin, wake, S, spring, rest, snd,
} from '../kit.js';

const MARKUP = `<div class="ctl ruler wide" id="ruler" tabindex="0" role="slider" aria-label="Desk ruler. Arrows pick where to press, Space twangs." aria-valuemin="1" aria-valuemax="10" aria-valuenow="8"></div>`;

// The desk twang: a slap, then a buzzy low tone that flutters fast.
const twang = (f, v) => snd.play('ruler', 0.08, 1.7, (t, P, G) => {
  G *= 0.3 + 0.7 * v;
  const ac = snd.kit.ac, d = 0.7 + 0.9 * v;
  snd.hiss(t, 'bandpass', 1900 * P, 1, 0.018, 0.45 * G);
  snd.hiss(t, 'lowpass', 500 * P, 0.9, 0.05, 0.4 * G);
  const o = ac.createOscillator(), flt = ac.createBiquadFilter(), am = ac.createGain(), env = ac.createGain();
  const lfo = ac.createOscillator(), dep = ac.createGain();
  // The pitch climbs a little as the swing dies.
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(f * 0.82 * P, t);
  o.frequency.exponentialRampToValueAtTime(f * P, t + 0.25);
  flt.type = 'lowpass'; flt.Q.value = 2;
  flt.frequency.setValueAtTime(f * 14, t);
  flt.frequency.exponentialRampToValueAtTime(f * 3, t + d);
  // The ruler slaps the desk edge: a fast square flutter on the level.
  lfo.type = 'square';
  lfo.frequency.setValueAtTime(26 * P, t);
  lfo.frequency.linearRampToValueAtTime(40 * P, t + d);
  am.gain.value = 0.55;
  dep.gain.setValueAtTime(0.45, t);
  dep.gain.exponentialRampToValueAtTime(0.05, t + d);
  env.gain.setValueAtTime(1e-4, t);
  env.gain.exponentialRampToValueAtTime(Math.max(0.17 * G, 2e-4), t + 0.004);
  env.gain.exponentialRampToValueAtTime(1e-4, t + d);
  lfo.connect(dep); dep.connect(am.gain);
  o.connect(flt); flt.connect(am); am.connect(env); env.connect(snd.kit.out);
  o.start(t); lfo.start(t);
  o.stop(t + d + 0.02); lfo.stop(t + d + 0.02);
  snd.ring(t, f * 0.82 * P, f * P, d * 0.8, 0.1 * G, 'triangle');
});
// A palm on a ringing ruler: a dull thud.
const mute = v => snd.play('ruler-mute', 0.05, 0.06, (t, P, G) => {
  snd.hiss(t, 'lowpass', 800 * P, 0.8, 0.04, 0.3 * G * v);
  snd.ring(t, 110 * P, 85 * P, 0.05, 0.16 * G * v);
});

export default {
  id: 'ruler', slot: 'band',
  css: `.p-ruler .ruler { border-radius: 10px; cursor: grab; }`,
  mount(cell) {
    cell.insertAdjacentHTML('beforeend', MARKUP);
    const bodies = [], moves = [];
    let watch = null;
    // A coral clamp holds a cream ruler on a navy desk at the left.
    // The free end overhangs the desk edge and runs to the right.
    const rEl = cell.querySelector('.ruler');
    bodies.push((() => {
      const VH = 110, svg = svgIn(rEl, `0 0 600 ${VH}`);
      // Ruler top, ruler height, its left end, and one centimetre.
      const YT = 34, RHT = 36, RL = 14, CM = 44, MM = CM / 10, AMAX = 30, NS = 36;
      const desk = skin(svg, svg, 'rect', { x: 4, y: YT + RHT, width: 160, height: 36, rx: 6 }, mat(C.navy, 0), { rim: 2.5, shadow: { b: 6, y: 7, o: 0.55 } });
      const rul = skin(svg, svg, 'path', {}, mat(C.cream, 0), { rim: 2, shadow: { b: 4, y: 7, o: 0.5 } });
      // A blur lens shows a swing too fast for the eye.
      const lens = el('path', { fill: css(C.cream), opacity: 0 }, svg);
      const INK = css([0.3, 0.04, 265]);
      const marks = el('path', { fill: 'none', stroke: INK, 'stroke-width': 1.3 }, svg);
      const labels = el('g', { fill: INK, 'font-family': 'Gabarito, system-ui, sans-serif', 'font-weight': 700, 'font-size': 17, 'text-anchor': 'middle' }, svg);
      const texts = [];
      const clampG = el('g', {}, svg);
      const jaw = skin(svg, clampG, 'rect', { x: 10, y: 20, width: 120, height: 60, rx: 12 }, mat(C.coral, 0), { rim: 2.5, shadow: { b: 5, y: 7, o: 0.55 } });
      // Two slotted bolts hold the jaw down.
      const bolts = [32, 108].map(x => {
        const g = el('g', { transform: `translate(${x} 50)` }, clampG);
        skin(svg, g, 'circle', { cx: 0, cy: 0, r: 9 }, mat(C.steel, 0), { rim: 1.5, shadow: { b: 2, y: 2, o: 0.45 } });
        el('rect', { x: -6, y: -1.2, width: 12, height: 2.4, rx: 1.2, fill: INK, opacity: 0.6, transform: 'rotate(-30)' }, g);
        return g;
      });
      let VW = 600, DX = 140, RX = 586;
      // tip is the free end's swing; pr is the finger's press.
      const s = { tip: S(), u: 0.8, om: TAU * 8, held: false, damp: false, pid: null, rect: null, y0: 0 };
      // The bent shape of a cantilever under a load at its end.
      const shape = n => (n <= 0 ? 0 : (n * n * (3 - n)) / 2);
      const dy = x => (x <= DX ? 0 : (s.tip.x + 2) * shape((x - DX) / (RX - DX)));
      function fit() {
        const r = rEl.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) VW = Math.max(320, Math.round((VH * r.width) / r.height));
        svg.setAttribute('viewBox', `0 0 ${VW} ${VH}`);
        DX = clamp(Math.round(0.17 * VW), 120, 210); RX = VW - 12;
        set(desk.shape, 'width', DX - 4);
        set(jaw.shape, 'width', DX - 24);
        set(bolts[1], 'transform', `translate(${DX - 36} 50)`);
        // Each label marks one centimetre; the pool grows with the plate.
        const need = Math.max(0, Math.floor((RX - 10 - RL) / CM));
        while (texts.length < need) { const t = el('text', { x: f2(RL + 8 + (texts.length + 1) * CM) }, labels); t.textContent = String(texts.length + 1); texts.push(t); }
        texts.forEach((t, i) => set(t, 'opacity', i < need ? 1 : 0));
        body.draw();
      }
      const body = {
        step(h) {
          if (s.held) spring(s.tip, 2400, 0.8, h);
          else {
            // The swing is a lightly damped spring at its own rate.
            const k = s.om * s.om, z = s.damp ? 0.6 : 0.05;
            if (reduce) { s.tip.x = 0; s.tip.v = 0; }
            else { s.tip.v += (-k * s.tip.x - 2 * z * s.om * s.tip.v) * h; s.tip.x += s.tip.v * h; }
          }
        },
        busy() {
          if (s.held) return !rest(s.tip, 0.05);
          const quiet = Math.abs(s.tip.x) < 0.08 && Math.abs(s.tip.v) < 0.08 * s.om;
          if (quiet) { s.tip.x = s.tip.v = 0; s.damp = false; }
          return !quiet;
        },
        draw() {
          // The outline runs right along the top edge, then back along the bottom.
          let top = `M${RL} ${YT}L${f2(DX)} ${YT}`, bot = '', up = '', dn = '';
          const env = s.held ? 0 : Math.hypot(s.tip.x, s.tip.v / s.om);
          for (let k = 1; k <= NS; k++) {
            const x = DX + ((RX - DX) * k) / NS, n = k / NS, y = dy(x);
            top += `L${f2(x)} ${f2(YT + y)}`;
            bot = `L${f2(x)} ${f2(YT + RHT + y)}` + bot;
            const e = env * shape(n);
            up += `L${f2(x)} ${f2(YT + 2 * shape(n) - e)}`;
            dn = `L${f2(x)} ${f2(YT + RHT + 2 * shape(n) + e)}` + dn;
          }
          set(rul.shape, 'd', `${top}${bot}L${f2(DX)} ${YT + RHT}L${RL} ${YT + RHT}Z`);
          set(lens, 'd', env > 1 ? `M${f2(DX)} ${YT}${up}${dn}L${f2(DX)} ${YT + RHT}Z` : '');
          set(lens, 'opacity', f3(0.25 * clamp(env / 12)));
          // Ticks hang from the top edge: cm long, half cm mid, mm short.
          let d = '';
          for (let i = 0; ; i++) {
            const x = RL + 8 + i * MM;
            if (x > RX - 4) break;
            const len = i % 10 === 0 ? 15 : i % 5 === 0 ? 11 : 7, y = YT + dy(x);
            d += `M${f2(x)} ${f2(y)}V${f2(y + len)}`;
          }
          set(marks, 'd', d);
          texts.forEach((t, i) => set(t, 'y', f2(YT + 31 + dy(RL + 8 + (i + 1) * CM))));
        },
      };
      // The press point sets the pitch: near the desk is high.
      const pitch = u => lerp(150, 58, u);
      function release() {
        s.held = false; rEl.classList.remove('held');
        const a = Math.abs(s.tip.x);
        rEl.setAttribute('aria-valuenow', String(Math.round(1 + 9 * s.u)));
        if (a < 1.5) { s.tip.x = 0; wake(body); return; }
        s.om = TAU * lerp(14, 7, s.u);
        twang(pitch(s.u), clamp(a / AMAX));
        wake(body);
      }
      // A flick: the free end leaves its rest with a kick.
      function flick(u, a) {
        s.u = u; s.damp = false;
        if (reduce) { twang(pitch(u), a / AMAX); return; }
        s.om = TAU * lerp(14, 7, u);
        s.tip.v += a * s.om;
        twang(pitch(u), clamp(a / AMAX));
        rEl.setAttribute('aria-valuenow', String(Math.round(1 + 9 * u)));
        wake(body);
      }
      const local = e => [((e.clientX - s.rect.left) / s.rect.width) * VW, ((e.clientY - s.rect.top) / s.rect.height) * VH];
      const aim = y => clamp((10 + y - s.y0) / Math.max(shape(s.u), 0.35), -AMAX, AMAX);
      rEl.addEventListener('pointerdown', e => {
        if (s.pid != null || e.button > 0) return;
        s.pid = e.pointerId;
        try { rEl.setPointerCapture(e.pointerId); } catch {}
        s.rect = rEl.getBoundingClientRect();
        const [x, y] = local(e);
        // A palm on a ringing ruler stops it first.
        const env = Math.hypot(s.tip.x, s.tip.v / s.om);
        if (env > 3) mute(clamp(env / AMAX));
        s.u = clamp((x - DX) / (RX - DX), 0.12, 1);
        s.y0 = y; s.held = true; s.damp = false;
        s.tip.t = aim(y);
        rEl.classList.add('held');
        wake(body);
      });
      rEl.addEventListener('pointermove', e => {
        if (e.pointerId !== s.pid) return;
        s.tip.t = aim(local(e)[1]);
        wake(body);
      });
      const up = e => { if (e.pointerId === s.pid) { s.pid = null; release(); } };
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => rEl.addEventListener(t, up));
      rEl.addEventListener('keydown', e => {
        if (s.pid != null) return;
        const d = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
        let n = Math.round(1 + 9 * s.u);
        if (d) n = clamp(n + d, 1, 10);
        else if (e.key === 'Home') n = 1;
        else if (e.key === 'End') n = 10;
        else if (!KEYS.includes(e.key)) return;
        e.preventDefault();
        if (e.repeat && !d) return;
        // Arrows twang softly at the new spot; Space twangs hard.
        flick((n - 1) / 9, d ? 12 : 26);
      });
      moves.push({
        el: rEl,
        shuffle() { if (s.pid == null) flick(rnd(0.35, 1), rnd(16, AMAX)); },
        reset() {
          if (s.pid != null) return;
          const env = Math.hypot(s.tip.x, s.tip.v / s.om);
          if (env > 2) { mute(clamp(env / AMAX)); s.damp = true; wake(body); }
        },
      });
      fit();
      watch = new ResizeObserver(fit);
      watch.observe(rEl);
      return body;
    })());
    return { bodies, moves, destroy() { watch.disconnect(); } };
  },
};
