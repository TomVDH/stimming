import {
  reduce, TAU, clamp, mod, f2, f3, rnd, angDiff, KEYS, css, C, el, set, svgIn, mat, skin, well, wake, S, spring, rest, snd,
} from '../kit.js';

const MARKUP = `<div class="grp"><div class="ctl crank" id="crank" tabindex="0" role="slider" aria-label="Hand crank. Turn it clockwise." aria-valuemin="0" aria-valuemax="10" aria-valuenow="0" aria-valuetext="Still"></div></div>`;

// The pawl drops off a tooth: a bright steel tick.
const tick = v => snd.play('crank-tick', 0.007, 0.03, (t, P, G) => {
  G *= 0.35 + 0.65 * v;
  snd.hiss(t, 'highpass', 4400 * P, 0.9, 0.004, 0.3 * G);
  snd.ring(t, 2250 * P, 2200 * P, 0.02, 0.03 * G);
  snd.ring(t, 520 * P, 420 * P, 0.02, 0.05 * G);
});
// Turned backwards, the pawl jams on a tooth face: a hard clack.
const clack = v => snd.play('crank-clack', 0.08, 0.09, (t, P, G) => {
  G *= 0.4 + 0.6 * v;
  snd.hiss(t, 'bandpass', 2400 * P, 1.1, 0.014, 0.5 * G);
  snd.ring(t, 190 * P, 120 * P, 0.06, 0.32 * G);
  snd.ring(t, 1700 * P, 1660 * P, 0.05, 0.04 * G);
});

export default {
  id: 'crank', slot: 'big',
  css: `.p-crank .crank { --ar: 1; border-radius: 50%; cursor: grab; }`,
  mount(cell) {
    cell.insertAdjacentHTML('beforeend', MARKUP);
    const bodies = [], moves = [];
    // A steel ratchet ring carries a cream flywheel with five spokes.
    // A steel arm runs from the navy hub to a coral handle.
    const crEl = cell.querySelector('#crank');
    const whoosh = snd.drone(1.2);
    bodies.push((() => {
      const svg = svgIn(crEl, '0 0 400 400'), defs = svg.k.defs;
      // Tooth tip, tooth root, rim, well, handle radius and handle size.
      const CX = 200, N = 24, STEP = TAU / N, RT = 172, RR = 160, RF = 150, RW = 118, RH = 128, HR = 27;
      // The arm sits between two spokes.
      const ARM0 = TAU / 10;
      const at = (r, a) => [CX + r * Math.sin(a), CX - r * Math.cos(a)];
      const pt = ([x, y]) => `${f2(x)} ${f2(y)}`;
      // Each tooth starts at its tip and ramps down to the next root.
      function teeth(th) {
        let d = '';
        for (let k = 0; k < N; k++) {
          const a = th + k * STEP;
          d += `${k ? 'L' : 'M'}${pt(at(RR, a))}L${pt(at(RT, a))}`;
          for (let j = 1; j < 3; j++) d += `L${pt(at(RT - ((RT - RR) * j) / 3, a + (STEP * j) / 3))}`;
        }
        return d + 'Z';
      }
      // Spokes taper from the hub to the rim.
      function spokes(th) {
        let d = '';
        for (let i = 0; i < 5; i++) {
          const a = th + (i * TAU) / 5, nx = Math.cos(a), ny = Math.sin(a);
          const [x0, y0] = at(24, a), [x1, y1] = at(RW + 6, a);
          d += `M${f2(x0 + 13 * nx)} ${f2(y0 + 13 * ny)}L${f2(x1 + 8 * nx)} ${f2(y1 + 8 * ny)}L${f2(x1 - 8 * nx)} ${f2(y1 - 8 * ny)}L${f2(x0 - 13 * nx)} ${f2(y0 - 13 * ny)}Z`;
        }
        return d;
      }
      // The arm is a capsule from the hub out to the handle.
      function capsule(a, r0, r1, w) {
        const nx = Math.cos(a), ny = Math.sin(a), [x0, y0] = at(r0, a), [x1, y1] = at(r1, a);
        return `M${f2(x0 + w * nx)} ${f2(y0 + w * ny)}L${f2(x1 + w * nx)} ${f2(y1 + w * ny)}A${w} ${w} 0 0 0 ${f2(x1 - w * nx)} ${f2(y1 - w * ny)}L${f2(x0 - w * nx)} ${f2(y0 - w * ny)}A${w} ${w} 0 0 0 ${f2(x0 + w * nx)} ${f2(y0 + w * ny)}Z`;
      }
      const ratchet = skin(svg, svg, 'path', { d: teeth(0) }, mat([0.62, 0.014, 255], 0), { rim: 2, shadow: { b: 9, y: 11, o: 0.6 } });
      skin(svg, svg, 'circle', { cx: CX, cy: CX, r: RF }, mat(C.cream, 0), { rim: 3, shadow: { b: 4, y: 5, o: 0.45 } });
      well(svg, svg, 'circle', { cx: CX, cy: CX, r: RW }, { rim: 4 });
      const sp = skin(svg, svg, 'path', { d: spokes(0) }, mat(C.cream, 0), { rim: 2, shadow: { b: 4, y: 6, o: 0.5 } });
      // At speed the spokes smear into a cream disc.
      const smear = el('circle', { cx: CX, cy: CX, r: RW - 2, fill: css(C.cream), opacity: 0 }, svg);
      skin(svg, svg, 'circle', { cx: CX, cy: CX, r: 34 }, mat(C.navy, 0), { rim: 2.5, shadow: { b: 3, y: 4, o: 0.5 } });
      const arm = skin(svg, svg, 'path', { d: capsule(ARM0, 0, RH, 12) }, mat(C.steel, 0), { rim: 2, shadow: { b: 4, y: 7, o: 0.5 } });
      el('circle', { cx: CX, cy: CX, r: 9, fill: css([0.34, 0.03, 265]) }, svg);
      el('circle', { cx: CX - 2, cy: CX - 2.5, r: 3, fill: '#fff', opacity: 0.5 }, svg);
      // The pawl pivots on a post above the ring; its tip rides the teeth.
      const PX = 118, PY = 20, PL = Math.hypot(CX - PX, CX - RR - PY);
      const pg = el('g', {}, svg);
      skin(svg, pg, 'path', { d: `M0 -10L${f2(PL - 16)} -6L${f2(PL + 2)} 5L${f2(PL - 14)} 8L0 10A10 10 0 0 1 0 -10Z` }, mat(C.steel, 0), { rim: 1.8, shadow: { b: 3, y: 5, o: 0.5 } });
      skin(svg, svg, 'circle', { cx: PX, cy: PY, r: 12 }, mat(C.navy, 0), { rim: 2, shadow: { b: 2, y: 3, o: 0.5 } });
      el('circle', { cx: PX, cy: PY, r: 4, fill: css(C.steel) }, svg);
      // The handle is a coral end of turned wood; rings show its grain.
      const hg = el('g', {}, svg);
      const handle = skin(svg, hg, 'circle', { cx: 0, cy: 0, r: HR }, mat(C.coral, 0.1), { rim: 2.5, shadow: { b: 6, y: 13, o: 0.55 } });
      const grain = el('g', { fill: 'none', stroke: css([0.55, 0.13, 35]), 'stroke-width': 1.6, opacity: 0.45 }, hg);
      [8, 15, 21].forEach(r => el('circle', { cx: 1, cy: 1, r }, grain));
      el('circle', { cx: -9, cy: -10, r: 7, fill: '#fff', opacity: 0.3 }, hg);

      // th is the wheel angle; f counts the teeth the pawl has passed.
      // pw is the pawl lift; jo is a recoil jolt; pr is the grip.
      const s = { th: STEP * 0.4, w: 0, T: 0, mode: 'rest', f: 0, pin: false, pw: S(0.4), jo: S(), pr: S(), pid: null, pu: 0, prev: 0, off: 0, rect: null, val: '' };
      // Drag follow, flywheel coast, brake grip, top speed.
      const KD = 700, CD = 40, CF = 0.18, MU = 0.7, BF = 3, BM = 10, WMAX = 50;
      // A blocked turn jolts the wheel and kicks the pawl.
      function jam(v) {
        const k = clamp(v / 8, 0.3, 1);
        clack(k);
        if (reduce) return;
        s.jo.v -= 0.9 * k;
        s.pw.v += 6 * k;
      }
      const body = {
        step(h) {
          if (reduce) {
            if (s.mode === 'drag') s.th = s.T;
            else s.mode = 'rest';
            s.w = 0;
          } else {
            let a = 0;
            if (s.mode === 'drag') a = KD * (s.T - s.th) - CD * s.w;
            else if (s.mode === 'spin' || s.mode === 'brake') {
              const cf = s.mode === 'brake' ? BF : CF, mu = s.mode === 'brake' ? BM : MU;
              a = -cf * s.w - mu * Math.sign(s.w);
              // Friction stops the wheel; it never turns it back.
              if (Math.abs(s.w) <= Math.abs(a * h)) { s.w = 0; s.mode = 'rest'; a = 0; }
            }
            s.w = clamp(s.w + a * h, -WMAX, WMAX);
            s.th += s.w * h;
          }
          // The pawl holds the last tooth face; the wheel cannot pass it backwards.
          const lock = s.f * STEP;
          if (s.th < lock) {
            if (!s.pin) jam(-s.w);
            s.th = lock; s.w = Math.max(0, s.w); s.pin = true;
          } else if (s.th > lock + 0.15 * STEP) s.pin = false;
          const f = Math.floor(s.th / STEP);
          if (f > s.f) { s.f = f; tick(1 - 0.5 * clamp(s.w / 40)); }
          // The ramp lifts the pawl; off the tip it falls and bounces.
          const surf = mod(s.th, STEP) / STEP;
          s.pw.t = surf;
          spring(s.pw, 5200, 0.25, h);
          if (s.pw.x < surf) { s.pw.x = surf; if (s.pw.v < 0) s.pw.v *= -0.3; }
          spring(s.jo, 900, 0.2, h);
          spring(s.pr, 700, 0.5, h);
        },
        busy() {
          let moving = s.mode === 'spin' || s.mode === 'brake';
          if (s.mode === 'drag') moving = Math.abs(s.T - s.th) > 1e-3 || Math.abs(s.w) > 1e-2;
          const still = rest(s.pw, 2e-3) && rest(s.jo) && rest(s.pr);
          // At rest the angle folds back into one turn.
          if (!moving && still && s.mode !== 'drag') {
            const k = Math.floor(s.th / TAU) * TAU;
            s.th -= k; s.f -= Math.round(k / STEP); s.w = 0;
          }
          return moving || !still;
        },
        draw() {
          const a = s.th + s.jo.x, w = Math.abs(s.w);
          set(ratchet.shape, 'd', teeth(a));
          set(sp.shape, 'd', spokes(a));
          set(arm.shape, 'd', capsule(a + ARM0, 0, RH, 12));
          const q = clamp((w - 8) / 30);
          set(smear, 'opacity', f3(0.5 * q * q));
          const [hx, hy] = at(RH, a + ARM0), p = s.pr.x;
          set(hg, 'transform', `translate(${f2(hx)} ${f2(hy)}) scale(${f3(1 - 0.07 * p)})`);
          handle.paint(p * 0.7);
          // The pawl turns so its tip meets the tooth under it.
          const ty = CX - (RR + (RT - RR) * clamp(s.pw.x, -0.1, 1.5));
          set(pg, 'transform', `translate(${PX} ${PY}) rotate(${f2((Math.atan2(ty - PY, CX - PX) - Math.atan2(5, PL)) * 57.2958)})`);
          // The whoosh rises in pitch and level with speed.
          const g = clamp(w / 40);
          whoosh.set(0.07 * g * Math.sqrt(g), 110 + 9 * w);
          const rps = Math.round((w / TAU) * 2) / 2;
          const val = rps ? `${rps} turns a second` : 'Still';
          if (val !== s.val) { s.val = val; crEl.setAttribute('aria-valuenow', String(Math.min(10, rps))); crEl.setAttribute('aria-valuetext', val); }
        },
      };

      function polar(e) {
        const r = s.rect, dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        return [Math.atan2(dx, -dy), Math.hypot(dx, dy) / (r.width / 2)];
      }
      crEl.addEventListener('pointerdown', e => {
        if (s.pid != null || e.button > 0) return;
        s.pid = e.pointerId;
        try { crEl.setPointerCapture(e.pointerId); } catch {}
        s.rect = crEl.getBoundingClientRect();
        const [a] = polar(e);
        // The hand catches the handle; the grab point stays under it.
        s.prev = s.pu = a; s.off = s.th - a; s.T = s.th;
        s.mode = 'drag';
        s.pr.t = 1; crEl.classList.add('held');
        wake(body);
      });
      crEl.addEventListener('pointermove', e => {
        if (e.pointerId !== s.pid) return;
        const [a, d] = polar(e);
        if (d < 0.12) return;
        s.pu += angDiff(a, s.prev); s.prev = a;
        s.T = s.pu + s.off;
        // A backward pull slips off the handle at the pawl.
        const lock = s.f * STEP;
        if (s.T < lock) { s.off += lock - s.T; s.T = lock; }
        wake(body);
      });
      function end(e) {
        if (e.pointerId !== s.pid) return;
        s.pid = null; s.pr.t = 0; crEl.classList.remove('held');
        // The flywheel keeps the speed the hand gave it.
        s.mode = reduce ? 'rest' : 'spin';
        wake(body);
      }
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => crEl.addEventListener(t, end));
      // Reduced motion turns the wheel a few teeth instead of a spin.
      function push(w) {
        if (reduce) s.th += Math.max(1, Math.round(w / 6)) * STEP;
        else { s.mode = 'spin'; s.w = clamp(s.w + w, 0, WMAX); }
        wake(body);
      }
      function brake() {
        if (s.mode === 'spin') { s.mode = 'brake'; wake(body); }
      }
      crEl.addEventListener('keydown', e => {
        if (s.pid != null) return;
        const d = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
        // Arrows push forward or jam backward; Space spins; Home brakes.
        if (d > 0) push(6);
        else if (d < 0) { jam(4); wake(body); }
        else if (KEYS.includes(e.key)) push(24);
        else if (e.key === 'Home' || e.key === 'Escape') brake();
        else return;
        e.preventDefault();
      });
      moves.push({
        el: crEl,
        shuffle() { if (s.pid == null) push(rnd(26, 42)); },
        reset() { if (s.pid == null) brake(); },
      });
      return body;
    })());
    return { bodies, moves, destroy() { whoosh.stop(); } };
  },
};
