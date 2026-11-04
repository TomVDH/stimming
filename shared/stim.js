// Stimming shared page module.
// Toys import it as '../shared/stim.js'.
// Colour comes from culori; Tone.js loads only when a toy asks for it.
// Full URLs match the shared importmap, so each library loads once.
import { converter, toGamut, formatRgb } from 'https://cdn.jsdelivr.net/npm/culori@4.0.1/+esm';
const TONE_URL = 'https://cdn.jsdelivr.net/npm/tone@15.0.4/+esm';

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
// Sound starts muted; a toy speaks only once its sound is switched on.
let soundKey = null, soundOn = false, soundBtn = null;
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

/* ---------- header ---------- */
// Each letter: glyph, hue, weight, tilt in degrees, lift in em.
const MARK = [
  ['S', '0.8 0.15 62', 800, -8, 0.02], ['t', '0.72 0.2 318', 500, 6, -0.04], ['i', '0.8 0.12 195', 900, -3, 0.03],
  ['m', '0.7 0.19 32', 600, 4, -0.02], ['m', '0.72 0.14 255', 700, -5, 0.04], ['i', '0.82 0.11 345', 400, 7, -0.05],
  ['n', '0.86 0.15 100', 800, -4, 0.01], ['g', '0.78 0.16 150', 600, 3, -0.03],
];
const SOUND_SVG = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 8h2.6l3.9-3.2v10.4L5.6 12H3z"/><path class="on" d="M12.8 8.1a3 3 0 0 1 0 3.8M15.1 6.1a6 6 0 0 1 0 7.8"/><path class="off" d="M13.2 8l4 4M17.2 8l-4 4"/></svg>';
function headerHTML(home) {
  const letters = MARK.map(([ch, c, w, r, y], i) => `<span style="--i: ${i}; --c: oklch(${c}); --w: ${w}; --r: ${r}deg; --y: ${y}em">${ch}</span>`).join('');
  return `<a class="brand" href="${home}" aria-label="Back to Stimming">`
    + '<svg class="back" viewBox="0 0 20 20" aria-hidden="true"><path d="M12 4l-6 6 6 6"/></svg>'
    + `<span class="mark" aria-hidden="true">${letters}</span></a>`
    + `<div class="tools"><button class="snd" id="snd" type="button" aria-label="Sound" aria-pressed="true">${SOUND_SVG}</button></div>`;
}

/* ---------- legacy: the pre-port page, one tap away ---------- */
// A toy that moved to the library set keeps its old page as legacy.html.
// toys.json flags it with legacy: true.
// The header then offers Classic; the classic page offers Fresh.
function legacyLink() {
  const tools = document.querySelector('header[data-shell] .tools');
  if (!tools) return;
  const onLegacy = /\/legacy\.html$/.test(location.pathname);
  const add = (href, label, title) => {
    const a = document.createElement('a');
    a.className = 'ver ver--build';
    a.href = href;
    a.textContent = label;
    a.title = title;
    tools.prepend(a);
  };
  if (onLegacy) { add('index.html', 'Fresh', 'Back to the fresh version'); document.documentElement.dataset.legacy = ''; return; }
  // toys.json marks which toys keep a legacy page, so no page probes for one.
  const id = location.pathname.split('/').filter(Boolean).filter(p => !p.endsWith('.html')).pop();
  fetch(new URL('../toys.json', import.meta.url))
    .then(r => r.json())
    .then(toys => { if (toys[id]?.legacy) add('legacy.html', 'Classic', 'The classic build of this toy'); })
    .catch(() => {});
}

// Call once per page, before the toy wires its audio.
// A page with an empty <header data-shell> gets the shared header.
/* ---------- mouse keys: gesture words become mouse keycaps ---------- */
// The body is the mouse; the left button fills; a mark shows the gesture.
const MOUSE = '<rect x="4" y="1.5" width="8" height="13" rx="4"/><path d="M8 1.5v4.5"/><path class="hit" d="M8 2a3.5 3.5 0 0 0-3.5 3.5V6H8Z"/>';
const GESTURE = {
  click: '',
  drag: '<path d="M13.5 9.5h2m-1-1 1 1-1 1"/>',
  hold: '<circle cx="14.5" cy="12.5" r="1.2" class="hit"/>',
};
function mouseKeys() {
  document.querySelectorAll('.how dt').forEach(dt => {
    const walk = document.createTreeWalker(dt, NodeFilter.SHOW_TEXT);
    const hits = [];
    while (walk.nextNode()) if (!walk.currentNode.parentElement.closest('.touch, kbd')) hits.push(walk.currentNode);
    hits.forEach(node => {
      const m = node.data.match(/\b(click|drag|hold)\b/i);
      // "Hold still" asks for no movement, so it stays a word.
      if (!m || /^\s*still\b/i.test(node.data.slice(m.index + m[0].length))) return;
      const word = m[1].toLowerCase();
      const key = document.createElement('kbd');
      key.className = 'mouse';
      key.setAttribute('aria-label', word);
      key.innerHTML = `<svg viewBox="0 0 17 16" aria-hidden="true">${MOUSE}${GESTURE[word]}</svg>`;
      const rest = node.splitText(m.index);
      rest.data = rest.data.slice(m[0].length);
      rest.before(key);
    });
  });
}

/* ---------- how-to tip: the keys hide behind an (i) ---------- */
// The (i) sits at the far right of the bar.
// Hover or focus opens the keys; a tap toggles them.
function howTip() {
  const how = document.querySelector('.bar .how');
  if (!how || how.closest('.how-tip')) return;
  const tip = document.createElement('div'), btn = document.createElement('button');
  tip.className = 'how-tip';
  btn.className = 'how-btn';
  btn.type = 'button';
  btn.textContent = 'i';
  btn.setAttribute('aria-label', 'How to play');
  btn.setAttribute('aria-expanded', 'false');
  how.id ||= 'how';
  btn.setAttribute('aria-controls', how.id);
  how.before(tip);
  tip.append(btn, how);
  const set = on => { tip.classList.toggle('is-open', on); btn.setAttribute('aria-expanded', String(on)); };
  btn.addEventListener('click', () => set(!tip.classList.contains('is-open')));
  tip.addEventListener('mouseenter', () => btn.setAttribute('aria-expanded', 'true'));
  tip.addEventListener('mouseleave', () => { if (!tip.classList.contains('is-open')) btn.setAttribute('aria-expanded', 'false'); });
  document.addEventListener('pointerdown', e => { if (!tip.contains(e.target)) set(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') set(false); });
}

/* ---------- fit: the stage fills the first screen above the bar ---------- */
// --chrome is everything above the stage plus the bar under it.
function fitStage() {
  const stage = document.querySelector('.stage'), bar = document.querySelector('.bar');
  if (!stage) return;
  const fit = () => {
    if (bar) {
      // The how-to line stacks when it wraps under the controls.
      bar.classList.remove('is-stacked');
      const how = bar.querySelector('.how'), first = bar.firstElementChild;
      const tipped = how?.closest('.how-tip');
      if (how && !tipped && first && how !== first && how.offsetTop >= first.offsetTop + first.offsetHeight) bar.classList.add('is-stacked');
    }
    const s = stage.getBoundingClientRect();
    const below = bar ? bar.getBoundingClientRect().bottom - s.bottom : 0;
    document.documentElement.style.setProperty('--chrome', `${Math.ceil(s.top + scrollY + below + 20)}px`);
  };
  const ro = new ResizeObserver(fit);
  [document.querySelector('header'), bar].forEach(el => el && ro.observe(el));
  addEventListener('resize', fit);
  fit();
}

export function initPage({ id, silent = false, home = '../index.html' } = {}) {
  const shell = document.querySelector('header[data-shell]');
  if (shell && !shell.children.length) shell.innerHTML = headerHTML(home);
  soundKey = `stimming.${id}.sound`;
  soundOn = store.get(soundKey) === '1';
  soundBtn = document.getElementById('snd');
  if (soundBtn) {
    soundBtn.hidden = silent;
    soundBtn.setAttribute('aria-pressed', String(soundOn));
    soundBtn.addEventListener('click', () => sound.toggle());
  }
  document.documentElement.dataset.toy = id;
  legacyLink();
  mouseKeys();
  howTip();
  fitStage();
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
    wake, live, rest, tone,
  };
  // Tone.js runs on this kit's context, so mute, gesture start and sleep still hold.
  // Connect Tone nodes to kit.out; it returns null before the first gesture.
  async function tone() {
    if (!ac) return null;
    toneMod ||= import(TONE_URL).then(T => {
      T.setContext(new T.Context({ context: ac, lookAhead: 0, latencyHint: 'interactive' }));
      return T;
    });
    return toneMod;
  }
}
let toneMod = null;

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

/* ---------- graphics quality ---------- */
// One site-wide choice: 'standard' keeps the caps, 'high' renders at full resolution.
const QUALITY_KEY = 'stimming.quality', QUALITY_EVENT = 'stim:quality';
export const quality = () => (store.get(QUALITY_KEY) === 'high' ? 'high' : 'standard');
export function setQuality(q) {
  q = q === 'high' ? 'high' : 'standard';
  if (q === quality()) return;
  store.set(QUALITY_KEY, q);
  dispatchEvent(new CustomEvent(QUALITY_EVENT, { detail: q }));
}
// The callback hears each change, from this page or from another tab.
export function onQuality(fn) {
  const local = e => fn(e.detail);
  const other = e => { if (e.key === QUALITY_KEY) fn(quality()); };
  addEventListener(QUALITY_EVENT, local);
  addEventListener('storage', other);
  return () => { removeEventListener(QUALITY_EVENT, local); removeEventListener('storage', other); };
}
// The pixel ratio for a w x h surface.
// High gives the screen's own ratio, up to 3, with no budget.
// Standard caps the ratio at maxDpr and keeps the pixel count under the budget.
export function pixelRatio(w, h, { maxDpr = 2, budget = 1.4e6, low = false } = {}) {
  const dev = window.devicePixelRatio || 1;
  if (quality() === 'high') return Math.min(dev, 3);
  return Math.min(dev, low ? 1 : maxDpr, Math.sqrt(budget / Math.max(1, w * h)));
}

/* ---------- settings tray ---------- */
const SLIDERS = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 4.5h7M12 4.5h2M2 11.5h2M7 11.5h7"/><circle cx="10.5" cy="4.5" r="1.5"/><circle cx="5.5" cy="11.5" r="1.5"/></svg>';
// A toy without Settings gets the shared tray at the bar's right edge.
// Hover or a tap opens it; a press elsewhere or Escape closes it.
function settingsTray() {
  const bar = document.querySelector('.bar');
  if (!bar) return null;
  const box = document.createElement('div'), btn = document.createElement('button'), tray = document.createElement('div');
  box.className = 'stim-set';
  btn.className = 'chip icon stim-set-btn';
  btn.type = 'button';
  btn.innerHTML = SLIDERS;
  btn.setAttribute('aria-label', 'Settings');
  btn.title = 'Settings';
  btn.setAttribute('aria-expanded', 'false');
  tray.className = 'stim-sets';
  tray.id = 'stim-sets';
  tray.setAttribute('role', 'group');
  tray.setAttribute('aria-label', 'Settings');
  btn.setAttribute('aria-controls', tray.id);
  box.append(btn, tray);
  // Settings sits just before the (i), or at the end of the bar.
  const edge = bar.querySelector(':scope > .how-tip, :scope > .how');
  if (edge) edge.before(box); else bar.append(box);
  const open = on => { box.classList.toggle('is-open', on); btn.setAttribute('aria-expanded', String(on)); };
  btn.addEventListener('click', () => open(!box.classList.contains('is-open')));
  document.addEventListener('pointerdown', e => { if (!box.contains(e.target)) open(false); });
  addEventListener('keydown', e => { if (e.key === 'Escape') open(false); });
  return tray;
}
// Adds the Quality group to a Settings tray.
// Without a tray, the shared tray is made first.
// Buttons that sit loose in the tray, such as Reset, stay last.
export function qualitySetting(tray = null) {
  tray ||= settingsTray();
  if (!tray) return null;
  const group = document.createElement('div');
  group.className = 'group';
  group.innerHTML = '<span>Quality</span><div class="choices" role="group" aria-label="Quality">'
    + '<button class="chip" type="button" data-value="standard" aria-pressed="false">Standard</button>'
    + '<button class="chip" type="button" data-value="high" aria-pressed="false">High</button></div>';
  const loose = [...tray.children].find(el => !el.classList.contains('group'));
  if (loose) loose.before(group); else tray.append(group);
  const chips = choices(group.querySelector('.choices'), v => setQuality(v));
  chips.set(quality());
  onQuality(q => chips.set(q));
  return group;
}

/* ---------- canvas sizing ---------- */
// The quality setting picks the pixel ratio; see pixelRatio.
export function fitCanvas(canvas, { maxDpr = 2, budget = 1.4e6, low = false } = {}) {
  const r = canvas.getBoundingClientRect();
  const w = Math.max(1, r.width), h = Math.max(1, r.height);
  const dpr = pixelRatio(w, h, { maxDpr, budget, low });
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
// Colours are OKLCH, given as (L, C, h) or as one [L, C, h] array.
// culori maps any colour into sRGB by reducing chroma, as CSS Color 4 does.
const toLin = converter('lrgb'), toRgb = converter('rgb'), fit = toGamut('rgb', 'oklch');
const ok = (L, C, h) => (Array.isArray(L) ? { mode: 'oklch', l: L[0], c: L[1], h: L[2] } : { mode: 'oklch', l: L, c: C, h });
// OKLCH in, linear sRGB out, not clamped.
export function oklchLinear(L, C, h) {
  const c = toLin(ok(L, C, h));
  return [c.r, c.g, c.b];
}
// OKLCH in, gamma-encoded sRGB out, 0 to 1, fitted into gamut.
export function oklchRgb(L, C, h) {
  const c = toRgb(fit(ok(L, C, h)));
  return [c.r, c.g, c.b].map(v => Math.min(1, Math.max(0, v)));
}
// OKLCH in, linear sRGB out, fitted into gamut: ready for shaders.
export function linFit(L, C, h) {
  const c = toLin(fit(ok(L, C, h)));
  return [c.r, c.g, c.b].map(v => Math.min(1, Math.max(0, v)));
}
// A CSS colour string for canvas and DOM, with optional alpha.
export function css(lch, alpha = 1) {
  return formatRgb({ ...fit(ok(lch)), alpha });
}
