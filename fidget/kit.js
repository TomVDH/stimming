// Fidget board kit: helpers, the soft-shaded drawing set, one physics loop and the sound bank.
// Every part module imports from here; nothing here touches the board layout.
import { sound, audioKit } from '../shared/stim.js';

const NS = 'http://www.w3.org/2000/svg';
const RM = matchMedia('(prefers-reduced-motion: reduce)');
let reduce = RM.matches;
RM.addEventListener?.('change', e => { reduce = e.matches; });
const TAU = Math.PI * 2, PI = Math.PI, D2R = PI / 180, R2D = 180 / PI;
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
const mod = (a, n) => ((a % n) + n) % n;
const f2 = v => Math.round(v * 100) / 100;
const f3 = v => Math.round(v * 1000) / 1000;
const rnd = (a, b) => a + Math.random() * (b - a);
const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > PI) d -= TAU; else if (d < -PI) d += TAU; return d; };
const KEYS = [' ', 'Enter'];

/* ---------- colour: OKLCH in, sRGB hex out ---------- */
function lin(L, C, h) {
  const a = C * Math.cos(h * D2R), b = C * Math.sin(h * D2R);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}
const gam = x => (x = clamp(x), x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055);
function rgb([L, C, h]) {
  let c = lin(L, C, h);
  // Chroma shrinks until the colour fits sRGB.
  for (let i = 0; i < 24 && (Math.min(c[0], c[1], c[2]) < -1e-4 || Math.max(c[0], c[1], c[2]) > 1.0001); i++) c = lin(L, (C *= 0.9), h);
  return [gam(c[0]), gam(c[1]), gam(c[2])];
}
const hx = v => ((v * 255 + 0.5) | 0).toString(16).padStart(2, '0');
const css = lch => { const [r, g, b] = rgb(lch); return '#' + hx(r) + hx(g) + hx(b); };
function mixLch(A, B, t) {
  const dh = (((B[2] - A[2]) % 360) + 540) % 360 - 180;
  return [lerp(A[0], B[0], t), lerp(A[1], B[1], t), A[2] + dh * t];
}
// A ramp caches 32 steps between two colours.
function ramp(A, B) {
  const c = [];
  return t => { const q = Math.round(clamp(t) * 32); return c[q] || (c[q] = css(mixLch(A, B, q / 32))); };
}

/* ---------- palette: fresh, mid-chroma, lit for a dark tray ---------- */
const C = {
  cream: [0.95, 0.018, 85], coral: [0.71, 0.155, 33], sky: [0.74, 0.115, 238], mint: [0.85, 0.115, 168],
  butter: [0.9, 0.12, 95], lilac: [0.77, 0.1, 302], navy: [0.36, 0.035, 265], steel: [0.8, 0.012, 255],
  red: [0.63, 0.18, 26], ink: [0.17, 0.014, 275],
};
const TICK = css([0.46, 0.02, 268]), BUTTER = css(C.butter);

/* ---------- svg helpers ---------- */
function el(tag, attrs = {}, parent) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
function set(e, k, v) {
  const c = e.__c || (e.__c = {});
  if (c[k] !== v) { c[k] = v; e.setAttribute(k, v); }
}
let ids = 0;
const nid = p => `fb-${p}${++ids}`;
// A gradient takes stops as [offset, colour, opacity].
function grad(defs, type, attrs, stops) {
  const id = nid('g'), g = el(type, { id, ...attrs }, defs);
  const st = stops.map(([o, c, a = 1]) => el('stop', { offset: o, 'stop-color': c, 'stop-opacity': a }, g));
  return { url: `url(#${id})`, st, g };
}
const DOWN = { x1: 0, y1: 0, x2: 0, y2: 1 };
// A soft blur casts contact shadows under raised parts.
function blur(defs, sd) {
  const id = nid('f'), f = el('filter', { id, x: '-60%', y: '-60%', width: '220%', height: '220%' }, defs);
  el('feGaussianBlur', { stdDeviation: sd }, f);
  return `url(#${id})`;
}
// The board shares one light; these lists hold every part it touches.
const LIGHT = { sheens: [], rims: [], shadows: [] };
// Parts that left the page drop out of the light lists.
function pruneLight() {
  LIGHT.sheens = LIGHT.sheens.filter(g => g.isConnected);
  LIGHT.rims = LIGHT.rims.filter(g => g.isConnected);
  LIGHT.shadows = LIGHT.shadows.filter(([sh]) => sh.isConnected);
}
// Each svg shares one sheen, one rim and one lip gradient.
function svgIn(host, vb) {
  const svg = el('svg', { viewBox: vb, 'aria-hidden': 'true', focusable: 'false' }, host);
  const defs = el('defs', {}, svg);
  const sheen = grad(defs, 'radialGradient', { cx: 0.3, cy: 0.16, r: 0.9 }, [[0, '#fff', 0.55], [0.45, '#fff', 0.1], [1, '#fff', 0]]);
  const rim = grad(defs, 'linearGradient', DOWN, [[0, '#fff', 0.85], [0.28, '#fff', 0], [0.62, '#000', 0], [1, '#000', 0.4]]);
  const lip = grad(defs, 'linearGradient', DOWN, [[0, '#000', 0.75], [0.3, '#000', 0], [0.78, '#fff', 0], [1, '#fff', 0.13]]);
  LIGHT.sheens.push(sheen.g);
  LIGHT.rims.push(rim.g, lip.g);
  svg.k = { defs, sheen: sheen.url, rim: rim.url, lip: lip.url };
  return svg;
}
// A material gives top, middle and bottom tones, darker as it is pressed.
function mat(lch, dk = 0.09) {
  const c = [];
  return t => {
    const q = Math.round(clamp(t) * 24);
    if (!c[q]) {
      const d = (dk * q) / 24;
      c[q] = [[0.07, 0.85], [0, 1], [-0.14, 1.05]].map(([dl, k]) => css([lch[0] + dl - d, lch[1] * k, lch[2]]));
    }
    return c[q];
  };
}
// A raised part: contact shadow, body gradient, sheen and a specular rim.
// A cylinder runs its light across instead of down.
function skin(svg, parent, tag, attrs, M, { rim = 2.5, shadow = null, sheen = true, cyl = false } = {}) {
  const { defs } = svg.k, id = nid('s');
  const shape = el(tag, { id, ...attrs }, defs);
  const clip = el('clipPath', { id: id + 'c' }, defs);
  el('use', { href: '#' + id }, clip);
  const g = el('g', {}, parent);
  const sh = shadow ? el('use', { href: '#' + id, fill: '#000', opacity: shadow.o ?? 0.5, filter: blur(defs, shadow.b), transform: `translate(0 ${shadow.y})` }, g) : null;
  if (sh) LIGHT.shadows.push([sh, shadow.y]);
  const base = cyl
    ? grad(defs, 'linearGradient', { x1: 0, y1: 0, x2: 1, y2: 0 }, [[0, '#fff'], [0.32, '#fff'], [1, '#fff']])
    : grad(defs, 'linearGradient', DOWN, [[0, '#fff'], [0.5, '#fff'], [1, '#fff']]);
  const order = cyl ? [1, 0, 2] : [0, 1, 2];
  el('use', { href: '#' + id, fill: base.url }, g);
  if (sheen) el('use', { href: '#' + id, fill: svg.k.sheen }, g);
  el('use', { href: '#' + id, fill: 'none', stroke: svg.k.rim, 'stroke-width': rim * 2, 'clip-path': `url(#${id}c)` }, g);
  const k = {
    shape, g, sh,
    paint(t) { const c = M(t); for (let i = 0; i < 3; i++) set(base.st[i], 'stop-color', c[order[i]]); },
  };
  k.paint(0);
  return k;
}
// A recess: dark at the top where the edge shades it, a faint lip below.
const WELL = mat([0.16, 0.014, 275]);
function well(svg, parent, tag, attrs, { rim = 3 } = {}) {
  const { defs } = svg.k, id = nid('w');
  const shape = el(tag, { id, ...attrs }, defs);
  const clip = el('clipPath', { id: id + 'c' }, defs);
  el('use', { href: '#' + id }, clip);
  const [, mid, low] = WELL(0);
  const base = grad(defs, 'linearGradient', DOWN, [[0, low], [1, mid]]);
  el('use', { href: '#' + id, fill: base.url }, parent);
  el('use', { href: '#' + id, fill: 'none', stroke: svg.k.lip, 'stroke-width': rim * 2, 'clip-path': `url(#${id}c)` }, parent);
  return shape;
}

// The stick steers the light: highlights follow it, shadows swing away.
// Shadows move by x and y, so part transforms stay their own.
const LIGHT0 = Math.atan2(0.16 - 0.5, 0.3 - 0.5);
function shine(nx, ny) {
  const cx = 0.3 + 0.38 * nx, cy = 0.16 + 0.38 * ny;
  const sx = f3(cx), sy = f3(cy), rot = `rotate(${f2((Math.atan2(cy - 0.5, cx - 0.5) - LIGHT0) * R2D)} 0.5 0.5)`;
  LIGHT.sheens.forEach(g => { set(g, 'cx', sx); set(g, 'cy', sy); });
  LIGHT.rims.forEach(g => set(g, 'gradientTransform', rot));
  LIGHT.shadows.forEach(([sh, y]) => { set(sh, 'x', f2(-1.2 * nx * y)); set(sh, 'y', f2(-1.2 * ny * y)); });
}

/* ---------- physics loop ---------- */
// One rAF loop runs only while some body is still moving.
const live = new Set();
let raf = 0, last = 0;
function wake(b) {
  live.add(b);
  if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
}
function frame(now) {
  const dt = clamp((now - last) / 1000, 0, 0.05);
  last = now;
  // Substeps at 120 Hz keep stiff springs stable.
  const n = Math.max(1, Math.ceil(dt * 120)), h = dt / n;
  for (const b of live) {
    for (let i = 0; i < n; i++) b.step(h);
    b.draw();
    if (!b.busy()) { b.draw(); live.delete(b); }
  }
  raf = live.size ? requestAnimationFrame(frame) : 0;
  // A still board lets the audio context sleep.
  if (!raf) snd.nap();
}
const S = (x = 0) => ({ x, v: 0, t: x });
// Semi-implicit Euler: velocity first, then position.
function spring(s, k, z, h) {
  if (reduce) { s.x = s.t; s.v = 0; return; }
  s.v += (k * (s.t - s.x) - 2 * z * Math.sqrt(k) * s.v) * h;
  s.x += s.v * h;
}
// A spring close enough to its target snaps there and stops.
function rest(s, e = 1e-3) {
  if (Math.abs(s.t - s.x) > e || Math.abs(s.v) > e * 20) return false;
  s.x = s.t; s.v = 0;
  return true;
}
// A body that leaves the board stops ticking.
const sleep = b => live.delete(b);
// An armed safety and a latched key prime the board.
// A plain key then fires the launch.
// Mounted parts register themselves here; unmounted ones clear their slot.
// The page sets shuffle; a press on the stick's nub calls it.
const board = {
  armed: false, latched: false, firing: false, fire: null, shuffle: null,
  dial: null, keys: null, safety: null,
  get primed() { return this.armed && this.latched && !this.firing; },
  set(k, v) { this[k] = v; this.dial?.prime(); },
};

/* ---------- sound: synthesised, started by the first gesture ---------- */
const snd = (() => {
  const MAXV = 12;
  const GO = new Set([' ', 'Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End']);
  // The shell kit owns the context, the compressor and the noise.
  const kit = audioKit({ gain: 0.6, keys: GO, noiseSeconds: 0.5, sleepMs: 2000 });
  const ends = [], last = Object.create(null), drones = new Set();
  // Pitch wanders 4% and gain 10%, so repeats never match.
  const jit = x => 1 + (Math.random() * 2 - 1) * x;
  // Once the board is still, the context sleeps until the next gesture.
  const nap = () => kit.rest(() => !raf && !drones.size);
  // Each voice is rate limited by name, then capped at twelve.
  function claim(key, gap, dur) {
    const a = kit.live();
    if (!a) return -1;
    const now = performance.now();
    if (now - (last[key] || -1e9) < gap * 1000) return -1;
    last[key] = now;
    const t = a.currentTime;
    for (let i = ends.length - 1; i >= 0; i--) if (ends[i] <= t) ends.splice(i, 1);
    if (ends.length >= MAXV) return -1;
    ends.push(t + dur);
    nap();
    return t;
  }
  // Filtered noise with a sharp attack and an exponential tail.
  function hiss(t, type, f, q, d, g) {
    const ac = kit.ac, src = ac.createBufferSource(), flt = ac.createBiquadFilter(), amp = ac.createGain();
    src.buffer = kit.noise;
    flt.type = type; flt.frequency.value = f; flt.Q.value = q;
    amp.gain.setValueAtTime(1e-4, t);
    amp.gain.exponentialRampToValueAtTime(Math.max(g, 2e-4), t + 0.0006);
    amp.gain.exponentialRampToValueAtTime(1e-4, t + d);
    src.connect(flt); flt.connect(amp); amp.connect(kit.out);
    src.start(t, Math.random() * 0.35);
    src.stop(t + d + 0.005);
  }
  // A pitched body that bends as it decays.
  function ring(t, f, f2, d, g, type = 'sine') {
    const ac = kit.ac, o = ac.createOscillator(), amp = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (f2 !== f) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    amp.gain.setValueAtTime(1e-4, t);
    amp.gain.exponentialRampToValueAtTime(Math.max(g, 2e-4), t + 0.002);
    amp.gain.exponentialRampToValueAtTime(1e-4, t + d);
    o.connect(amp); amp.connect(kit.out);
    o.start(t); o.stop(t + d + 0.01);
    return o;
  }
  // Noise through a band that climbs: a short whoosh.
  function rise(t, f, f2, d, g) {
    const ac = kit.ac, src = ac.createBufferSource(), flt = ac.createBiquadFilter(), amp = ac.createGain();
    src.buffer = kit.noise;
    flt.type = 'bandpass'; flt.Q.value = 2.2;
    flt.frequency.setValueAtTime(f, t);
    flt.frequency.exponentialRampToValueAtTime(f2, t + d);
    amp.gain.setValueAtTime(1e-4, t);
    amp.gain.exponentialRampToValueAtTime(Math.max(g, 2e-4), t + d * 0.85);
    amp.gain.exponentialRampToValueAtTime(1e-4, t + d);
    src.connect(flt); flt.connect(amp); amp.connect(kit.out);
    src.start(t, 0);
    src.stop(t + d + 0.01);
  }
  // Busy moments soften each voice; the compressor catches the rest.
  function play(key, gap, dur, fn) {
    const t = claim(key, gap, dur);
    if (t >= 0) fn(t, jit(0.04), jit(0.1) / (1 + 0.06 * ends.length));
  }
  // A looping noise bed whose level and colour follow motion.
  function drone(q) {
    let src = null, flt = null, amp = null;
    const d = {
      set(g, f) {
        const a = g > 0.002 ? kit.live() : null;
        if (!a) { if (src) d.stop(); return; }
        const t = a.currentTime;
        if (!src) {
          src = a.createBufferSource(); src.buffer = kit.noise; src.loop = true;
          flt = a.createBiquadFilter(); flt.type = 'bandpass'; flt.Q.value = q; flt.frequency.value = f;
          amp = a.createGain(); amp.gain.value = 0;
          src.connect(flt); flt.connect(amp); amp.connect(kit.out);
          src.start(t, Math.random() * 0.35);
          drones.add(d);
        }
        amp.gain.setTargetAtTime(g, t, 0.04);
        flt.frequency.setTargetAtTime(f, t, 0.04);
      },
      stop() {
        if (!src) return;
        const t = kit.ac.currentTime;
        amp.gain.setTargetAtTime(0, t, 0.03);
        src.stop(t + 0.2);
        src = null;
        drones.delete(d);
        nap();
      },
    };
    return d;
  }

  const api = {
    nap,
    hush() { drones.forEach(d => d.stop()); },
    // Launch: four rising notes over a climbing whoosh.
    launch: () => play('launch', 0.3, 1, (t, P, G) => {
      rise(t, 300, 4200, 0.4, 0.3 * G);
      [440, 554.4, 659.3, 880].forEach((f, i) => {
        const at = t + i * 0.09, end = i === 3;
        hiss(at, 'bandpass', 3200 * P, 1.2, 0.004, 0.2 * G);
        ring(at, f * P, f * P, end ? 0.6 : 0.16, 0.15 * G, 'triangle');
        ring(at, 2 * f * P, 2 * f * P, end ? 0.4 : 0.1, 0.05 * G);
      });
    }),
    scrape: drone(0.8),
    // Dial detent: a 4 ms highpassed tick and a faint ping.
    dial: v => play('dial', 0.012, 0.04, (t, P, G) => {
      G *= 0.35 + 0.65 * v;
      hiss(t, 'highpass', 3600 * P, 0.8, 0.004, 0.42 * G);
      ring(t, 2400 * P, 2360 * P, 0.03, 0.035 * G);
    }),
    // Thumb wheel rib: drier and lower than the dial.
    rib: v => play('rib', 0.016, 0.03, (t, P, G) => {
      G *= 0.35 + 0.65 * v;
      hiss(t, 'bandpass', 2700 * P, 1.6, 0.005, 0.5 * G);
      ring(t, 1300 * P, 1220 * P, 0.016, 0.03 * G);
    }),
    // Toggle: the lever lifts, then snaps over 25 ms later.
    flip: (up, heavy) => play('flip', 0.015, 0.09, (t, P, G) => {
      const k = (up ? 1.05 : 0.95) * (heavy ? 0.82 : 1) * P;
      hiss(t, 'bandpass', 3300 * k, 1.4, 0.006, 0.14 * G);
      hiss(t + 0.025, 'bandpass', 4100 * k, 1.1, 0.012, 0.5 * G);
      ring(t + 0.025, 150 * k, 100 * k, 0.05, (heavy ? 0.42 : 0.34) * G);
    }),
    // Keycap down: a deep thock.
    down: () => play('down', 0.015, 0.1, (t, P, G) => {
      hiss(t, 'lowpass', 800 * P, 0.9, 0.035, 0.6 * G);
      hiss(t, 'bandpass', 2000 * P, 1.2, 0.003, 0.12 * G);
      ring(t, 90 * P, 70 * P, 0.08, 0.5 * G);
    }),
    // Keycap up: a lighter, higher click.
    up: () => play('up', 0.015, 0.04, (t, P, G) => {
      hiss(t, 'bandpass', 2600 * P, 1.3, 0.01, 0.2 * G);
      ring(t, 240 * P, 190 * P, 0.025, 0.08 * G);
    }),
    // The latch catches with a small metallic tick.
    latch: lock => play('latch', 0.015, 0.07, (t, P, G) => {
      const k = (lock ? 1 : 0.84) * P;
      hiss(t + 0.012, 'highpass', 6000 * k, 0.7, 0.003, 0.22 * G);
      ring(t + 0.012, 3150 * k, 3120 * k, 0.045, 0.05 * G);
      ring(t + 0.012, 4730 * k, 4700 * k, 0.03, 0.03 * G);
    }),
    // Slider notch: a soft tick.
    notch: v => play('notch', 0.03, 0.03, (t, P, G) => {
      G *= 0.5 + 0.5 * v;
      hiss(t, 'bandpass', 1800 * P, 2, 0.006, 0.16 * G);
      ring(t, 700 * P, 640 * P, 0.016, 0.04 * G);
    }),
    // Joystick home: a quiet spring, its pitch wobbling down.
    boing: m => play('boing', 0.12, 0.42, (t, P, G) => {
      const ac = kit.ac, o = ring(t, 320 * P, 150 * P, 0.4, 0.1 * G * m);
      const lfo = ac.createOscillator(), depth = ac.createGain();
      lfo.frequency.value = 17 * P;
      depth.gain.setValueAtTime(45 * P, t);
      depth.gain.exponentialRampToValueAtTime(2, t + 0.38);
      lfo.connect(depth); depth.connect(o.frequency);
      lfo.start(t); lfo.stop(t + 0.41);
    }),
    // The nub knocks the gate rim.
    rim: v => play('rim', 0.05, 0.03, (t, P, G) => {
      hiss(t, 'bandpass', 1500 * P, 1.5, 0.008, 0.18 * G * v);
      ring(t, 400 * P, 320 * P, 0.02, 0.06 * G * v);
    }),
    // Safety cover: an unlatch click and a short spring ring.
    lift: () => play('lift', 0.03, 0.16, (t, P, G) => {
      hiss(t, 'bandpass', 3600 * P, 1.6, 0.005, 0.22 * G);
      ring(t + 0.004, 1250 * P, 1180 * P, 0.14, 0.022 * G);
      ring(t + 0.004, 1873 * P, 1800 * P, 0.09, 0.012 * G);
    }),
    // The cover slams onto its seat.
    shut: v => play('shut', 0.035, 0.08, (t, P, G) => {
      G *= v;
      hiss(t, 'bandpass', 2500 * P, 1, 0.016, 0.6 * G);
      ring(t, 125 * P, 80 * P, 0.06, 0.45 * G);
    }),
    // A closed cover blocks the switch: a dull knock.
    block: () => play('block', 0.05, 0.05, (t, P, G) => {
      hiss(t, 'lowpass', 700 * P, 1, 0.025, 0.35 * G);
      ring(t, 110 * P, 90 * P, 0.04, 0.2 * G);
    }),
    // Rocker: a soft first stage, then the heavier rock over.
    rock: up => play('rock', 0.015, 0.1, (t, P, G) => {
      const k = (up ? 1.04 : 0.96) * P;
      hiss(t, 'bandpass', 2200 * k, 1.3, 0.006, 0.15 * G);
      hiss(t + 0.03, 'bandpass', 1700 * k, 1, 0.014, 0.5 * G);
      ring(t + 0.03, 120 * k, 85 * k, 0.055, 0.4 * G);
    }),
    // Pressing the side already down: a muted tap.
    dead: () => play('dead', 0.03, 0.03, (t, P, G) => {
      hiss(t, 'lowpass', 1200 * P, 0.8, 0.012, 0.16 * G);
    }),
    // Abacus beads: a wooden clack, louder when faster.
    clack: v => play('clack', 0.012, 0.05, (t, P, G) => {
      G *= 0.25 + 0.75 * v;
      hiss(t, 'bandpass', 1900 * P, 2.2, 0.01, 0.42 * G);
      ring(t, 1150 * P, 1130 * P, 0.035, 0.09 * G);
      ring(t, 2620 * P, 2600 * P, 0.02, 0.05 * G);
    }),
    // A bead knocks the frame: lower and duller.
    knock: v => play('knock', 0.03, 0.06, (t, P, G) => {
      G *= 0.25 + 0.75 * v;
      hiss(t, 'lowpass', 1300 * P, 1, 0.018, 0.4 * G);
      ring(t, 420 * P, 380 * P, 0.045, 0.12 * G);
    }),
  };
  // Parts build their own voices from these primitives.
  Object.assign(api, { play, hiss, ring, rise, drone, kit });
  // Sound on answers with a key click; off hushes the scrape.
  sound.onChange(on => { if (on) api.up(); else api.hush(); });
  return api;
})();

// Toggles and rockers share one raised bezel material.
const BEZEL = mat([0.33, 0.03, 268], 0);

export {
  NS, reduce, TAU, PI, D2R, R2D, clamp, lerp, mod, f2, f3, rnd, angDiff, KEYS, css, mixLch, ramp, C, TICK, BUTTER, el, set, nid, grad, DOWN, blur, LIGHT, pruneLight, svgIn, mat, skin, WELL, well, shine, wake, sleep, S, spring, rest, board, snd, BEZEL,
};
