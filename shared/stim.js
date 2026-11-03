// Stimming shared page module.
// Toys import it as '../shared/stim.js'. It has no dependencies.

/* ---------- storage ---------- */
// Storage is optional; private windows can refuse it.
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (err) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (err) { /* storage is optional */ } },
};

/* ---------- motion ---------- */
const RM = matchMedia('(prefers-reduced-motion: reduce)');
export const reduced = () => RM.matches;
export const onReducedChange = fn => RM.addEventListener?.('change', e => fn(e.matches));

/* ---------- sound toggle ---------- */
// The header button is the one source of truth for sound.
const listeners = new Set();
let soundKey = null, soundOn = true, soundBtn = null;
export const sound = {
  get on() { return soundOn; },
  set(v) {
    soundOn = !!v;
    if (soundKey) store.set(soundKey, soundOn ? '1' : '0');
    soundBtn?.setAttribute('aria-pressed', String(soundOn));
    listeners.forEach(fn => fn(soundOn));
  },
  toggle() { this.set(!soundOn); },
  // The callback gets the new state; the return value unsubscribes.
  onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
};

// Call once per page, before the toy wires its audio.
export function initPage({ id, silent = false } = {}) {
  soundKey = `stimming.${id}.sound`;
  soundOn = store.get(soundKey) !== '0';
  soundBtn = document.getElementById('snd');
  if (soundBtn) {
    soundBtn.hidden = silent;
    soundBtn.setAttribute('aria-pressed', String(soundOn));
    soundBtn.addEventListener('click', () => sound.toggle());
  }
  document.documentElement.dataset.toy = id;
  return { sound };
}

/* ---------- audio kit ---------- */
// One AudioContext per page, built on the first real gesture.
// The master gain feeds a compressor so stacked voices never clip.
export function audioKit({ gain = 0.55, keys = null, noiseSeconds = 1, sleepMs = 1500 } = {}) {
  let ac = null, out = null, noise = null, askedAt = -1e9, restT = 0;
  function wake() {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { ac = new AC(); } catch (err) { return null; }
      const comp = ac.createDynamicsCompressor();
      comp.threshold.value = -12; comp.knee.value = 6; comp.ratio.value = 4;
      comp.attack.value = 0.002; comp.release.value = 0.12;
      out = ac.createGain();
      out.gain.value = gain;
      out.connect(comp);
      comp.connect(ac.destination);
      if (noiseSeconds > 0) {
        noise = ac.createBuffer(1, Math.round(ac.sampleRate * noiseSeconds), ac.sampleRate);
        const d = noise.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
    }
    if (ac.state !== 'running') { askedAt = performance.now(); ac.resume()?.catch(() => {}); }
    return ac;
  }
  // A context still waking accepts sounds for a quarter second.
  function live() {
    if (!soundOn || !ac || ac.state === 'closed') return null;
    return ac.state === 'running' || performance.now() - askedAt < 250 ? ac : null;
  }
  // Once the toy settles, the context sleeps until the next gesture.
  function rest(isIdle = () => true) {
    clearTimeout(restT);
    if (!ac || ac.state !== 'running') return;
    restT = setTimeout(() => { if (isIdle() && ac.state === 'running') ac.suspend()?.catch(() => {}); }, sleepMs);
  }
  function unlock(e) {
    if (!soundOn || (e.type === 'keydown' && keys && !keys.has(e.key))) return;
    // A touch counts as a gesture only once the finger lifts.
    if (!ac && e.type === 'pointerdown' && e.pointerType !== 'mouse') return;
    wake();
  }
  // Touchend is the gesture iOS needs.
  ['pointerdown', 'pointerup', 'keydown', 'touchend'].forEach(t => addEventListener(t, unlock, { capture: true, passive: true }));
  sound.onChange(on => { if (on) wake(); else ac?.suspend()?.catch(() => {}); });
  return {
    get ac() { return ac; },
    get out() { return out; },
    get noise() { return noise; },
    wake, live, rest,
  };
}

/* ---------- chip groups ---------- */
// A choice group keeps exactly one chip pressed.
// Arrow keys move the choice while a chip has focus.
export function choices(group, onPick) {
  const items = [...group.querySelectorAll('.chip')];
  const valueOf = el => el.dataset.value ?? el.textContent.trim();
  const pick = (el, fire = true) => {
    items.forEach(b => b.setAttribute('aria-pressed', String(b === el)));
    if (fire) onPick?.(valueOf(el), el);
  };
  items.forEach(b => b.addEventListener('click', () => pick(b)));
  group.addEventListener('keydown', e => {
    const i = items.indexOf(document.activeElement);
    const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (i < 0 || !d) return;
    e.preventDefault();
    e.stopPropagation();
    const next = items[(i + d + items.length) % items.length];
    next.focus();
    pick(next);
  });
  return {
    get value() { const el = items.find(b => b.getAttribute('aria-pressed') === 'true'); return el ? valueOf(el) : null; },
    set(v, fire = false) { const el = items.find(b => valueOf(b) === v); if (el) pick(el, fire); },
  };
}

/* ---------- canvas sizing ---------- */
// Pixel ratio caps at 2 and the backing store stays under the budget.
export function fitCanvas(canvas, { maxDpr = 2, budget = 1.4e6, low = false } = {}) {
  const r = canvas.getBoundingClientRect();
  const w = Math.max(1, r.width), h = Math.max(1, r.height);
  const dpr = Math.min(window.devicePixelRatio || 1, low ? 1 : maxDpr, Math.sqrt(budget / (w * h)));
  const W = Math.max(1, Math.round(w * dpr)), H = Math.max(1, Math.round(h * dpr));
  if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
  return { w, h, dpr, W, H };
}

/* ---------- visibility ---------- */
// The callback hears true while the element is on screen and the tab shows.
export function whenVisible(el, fn) {
  let inView = true;
  const fire = () => fn(inView && !document.hidden);
  const io = new IntersectionObserver(es => { inView = es[es.length - 1].isIntersecting; fire(); });
  io.observe(el);
  document.addEventListener('visibilitychange', fire);
  return () => { io.disconnect(); document.removeEventListener('visibilitychange', fire); };
}

/* ---------- colour ---------- */
// OKLCH in, linear sRGB out.
export function oklchLinear(L, C, h) {
  const a = C * Math.cos((h * Math.PI) / 180), b = C * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}
// Chroma shrinks until the colour fits sRGB; the result is gamma encoded, 0 to 1.
export function oklchRgb(L, C, h) {
  let c = C, rgb = oklchLinear(L, c, h);
  while (c > 0 && rgb.some(v => v < -1e-4 || v > 1 + 1e-4)) { c -= 0.005; rgb = oklchLinear(L, Math.max(c, 0), h); }
  return rgb.map(v => { v = Math.min(1, Math.max(0, v)); return v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055; });
}
