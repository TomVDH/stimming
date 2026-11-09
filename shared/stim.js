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

export function initPage({ id, silent = false, home = '../index.html', bar = null } = {}) {
  const stage = bar && document.querySelector('.stage');
  const ui = stage ? buildBar(stage, bar, { id, home }) : null;
  const shell = document.querySelector('header[data-shell]');
  if (!ui && shell && !shell.children.length) shell.innerHTML = headerHTML(home);
  soundKey = `stimming.${id}.sound`;
  soundOn = store.get(soundKey) === '1';
  soundBtn = ui ? ui.soundButton : document.getElementById('snd');
  if (soundBtn) {
    soundBtn.hidden = silent;
    soundBtn.setAttribute('aria-pressed', String(soundOn));
    soundBtn.addEventListener('click', () => sound.toggle());
  }
  document.documentElement.dataset.toy = id;
  if (ui) {
    // toys.json gives the name, the tags and the legacy flag.
    fetch(new URL('../toys.json', import.meta.url))
      .then(r => r.json())
      .then(toys => ui.applyToy(toys[id]))
      .catch(() => ui.applyToy(null));
  } else {
    legacyLink();
    mouseKeys();
    howTip();
  }
  fitStage();
  return ui ? { sound, ...ui } : { sound };
}

/* ---------- bar v2: the Corners shell ---------- */
// The shell lays its controls in the four corners of the stage.
// Spec: docs/plans/bar-v2.md.
const make = (tag, cls = '', html = '') => {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (html) el.innerHTML = html;
  return el;
};
let barCount = 0;
const iconButton = (cls, html, label) => {
  const b = make('button', `${cls} s2-icon`, html);
  b.type = 'button';
  b.setAttribute('aria-label', label);
  b.title = label;
  return b;
};

/* sheets: one open at a time, opened only by a click */
let openSheet = null;
const FOCUSABLE = 'button:not([hidden]):not([disabled]), input:not([disabled]), a[href]';
document.addEventListener('keydown', e => {
  if (!openSheet) return;
  if (e.key === 'Escape') { e.preventDefault(); openSheet.open(false, true); return; }
  if (e.key !== 'Tab') return;
  // Tab stays inside the open sheet.
  const items = [...openSheet.el.querySelectorAll(FOCUSABLE)].filter(el => el.checkVisibility());
  if (!items.length) return;
  const first = items[0], last = items[items.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});
document.addEventListener('pointerdown', e => {
  if (openSheet && !openSheet.el.contains(e.target) && !openSheet.anchor.contains(e.target)) openSheet.open(false);
});
function makeSheet(layer, { title, anchor, align = 'right', focusPressed = false }) {
  const el = make('div', `s2-sheet s2-sheet--${align}`, `<div class="s2-hd"><span>${title}</span><em aria-hidden="true">esc</em></div>`);
  el.hidden = true;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', title);
  layer.append(el);
  anchor.setAttribute('aria-expanded', 'false');
  const sheet = {
    el, anchor,
    get isOpen() { return !el.hidden; },
    // Closing by key or button returns focus to the button.
    open(on, refocus = false) {
      if (on === sheet.isOpen) return;
      if (on && openSheet) openSheet.open(false);
      el.hidden = !on;
      anchor.setAttribute('aria-expanded', String(on));
      openSheet = on ? sheet : null;
      if (on) ((focusPressed && el.querySelector('[aria-pressed="true"]')) || el.querySelector(FOCUSABLE))?.focus({ preventScroll: true });
      else if (refocus || el.contains(document.activeElement)) anchor.focus({ preventScroll: true });
    },
  };
  anchor.addEventListener('click', () => sheet.open(!sheet.isOpen, true));
  return sheet;
}

/* shortcut keys: one listener per bar */
// Keys skip modified presses, text fields and open sheets.
function keyBinder() {
  const map = new Map();
  document.addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.repeat || e.defaultPrevented) return;
    if (e.target.closest?.('input, textarea, select, [contenteditable], .s2-sheet')) return;
    const fn = map.get(e.key.toLowerCase());
    if (!fn) return;
    e.preventDefault();
    fn();
  });
  return (key, fn) => map.set(String(key).toLowerCase(), fn);
}

/* choice: segments, stepper or tray */
const dot = o => (o.dot ? `<span class="s2-dot" style="background: ${o.dot}"></span>` : '');
// An option icon leads its label in segments and the stepper.
const ico = o => (o.icon ? `<span class="s2-ico" aria-hidden="true">${o.icon}</span>` : '');
function makeChoice(spec, display, state, pick, layer) {
  const { options, label } = spec;
  const find = v => options.find(o => o.value === v);
  const step = d => {
    const i = options.findIndex(o => o.value === state.value);
    pick(options[(i + d + options.length) % options.length].value, true, true);
  };
  const arrows = (box, onStep) => box.addEventListener('keydown', e => {
    const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!d) return;
    e.preventDefault();
    e.stopPropagation();
    onStep(d);
  });
  if (display === 'segments') {
    const el = make('div', 's2-seg');
    el.setAttribute('role', 'group');
    el.setAttribute('aria-label', label);
    const chips = options.map(o => {
      const b = make('button', 's2-chip', `${dot(o)}${ico(o)}${o.label}`);
      b.type = 'button';
      b.dataset.value = o.value;
      b.addEventListener('click', () => pick(o.value, true, true));
      return b;
    });
    el.append(...chips);
    arrows(el, d => { step(d); chips.find(b => b.dataset.value === state.value)?.focus(); });
    return { el, sync() {
      chips.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.value === state.value)));
      el.setAttribute('aria-disabled', String(state.disabled));
    } };
  }
  if (display === 'stepper') {
    const el = make('div', 's2-step');
    el.setAttribute('role', 'group');
    el.setAttribute('aria-label', label);
    const prev = iconButton('s2-chip s2-step-prev', '‹', `Previous ${label}`);
    const next = iconButton('s2-chip s2-step-next', '›', `Next ${label}`);
    const now = make('span', 's2-step-now');
    now.setAttribute('aria-live', 'polite');
    prev.addEventListener('click', () => step(-1));
    next.addEventListener('click', () => step(1));
    el.append(prev, now, next);
    arrows(el, step);
    return { el, sync() {
      const o = find(state.value);
      now.innerHTML = o ? `${dot(o)}${ico(o)}${o.label}` : '';
      el.setAttribute('aria-disabled', String(state.disabled));
    } };
  }
  // The tray chip opens a grid sheet below the top-left corner.
  const el = make('button', 's2-chip s2-tray');
  el.type = 'button';
  const sheet = makeSheet(layer, { title: label, anchor: el, align: 'left', focusPressed: true });
  const grid = make('div', 's2-grid');
  grid.setAttribute('role', 'group');
  grid.setAttribute('aria-label', label);
  const cells = options.map(o => {
    const b = iconButton('s2-chip', o.icon || o.label.slice(0, 1), o.label);
    b.dataset.value = o.value;
    // The sheet closes first, so the toy's onPick can take focus.
    b.addEventListener('click', () => { sheet.open(false, true); pick(o.value, true, true); });
    return b;
  });
  grid.append(...cells);
  sheet.el.append(grid);
  return { el, sheet, sync() {
    el.textContent = `+ ${find(state.value)?.label ?? ''}`;
    el.setAttribute('aria-disabled', String(state.disabled));
    cells.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.value === state.value)));
  } };
}

/* slider: a word label, a bar thumb, no number */
function makeSlider({ label, min = 0, max = 1, step = 0.01, value = min, onInput }) {
  const el = make('label', 's2-slider', `<span>${label}</span>`);
  const input = make('input');
  Object.assign(input, { type: 'range', min, max, step });
  input.value = String(value);
  el.append(input);
  const fill = () => el.style.setProperty('--v', `${((Number(input.value) - min) / (max - min || 1)) * 100}%`);
  input.addEventListener('input', () => { fill(); onInput?.(Number(input.value)); });
  fill();
  const handle = {
    get value() { return Number(input.value); },
    set(v, fire = false) { input.value = String(v); fill(); if (fire) onInput?.(Number(input.value)); },
    get disabled() { return input.disabled; },
    set disabled(d) { input.disabled = !!d; el.toggleAttribute('data-disabled', !!d); },
  };
  return { el, input, handle };
}

/* actions: shared verbs keep one label each */
const DIE = '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="2" width="12" height="12" rx="1"/><circle class="solid" cx="5.5" cy="5.5" r="1"/><circle class="solid" cx="10.5" cy="10.5" r="1"/><circle class="solid" cx="8" cy="8" r="1"/></svg>';
const cap = w => w.charAt(0).toUpperCase() + w.slice(1);
function actionLabel(a) {
  if (a.label) return a.label;
  if (a.verb === 'add') return `+ ${a.noun ?? 'One'}`;
  return cap(a.verb);
}
function makeAction(a, bindKey) {
  const b = make('button', 's2-chip', `${a.verb === 'shuffle' ? DIE : ''}<span class="s2-label">${actionLabel(a)}</span>`);
  b.type = 'button';
  let disabled = false;
  const press = () => { if (!disabled) a.onPress?.(); };
  b.addEventListener('click', press);
  if (a.key) {
    b.append(make('kbd', 's2-kbd', a.key));
    b.setAttribute('aria-keyshortcuts', a.key);
    bindKey(a.key, press);
  }
  const handle = {
    get value() { return a.verb; },
    set(v, fire = false) { if (fire) press(); },
    get disabled() { return disabled; },
    set disabled(d) { disabled = !!d; b.setAttribute('aria-disabled', String(disabled)); },
  };
  return { el: b, handle };
}

/* settings rows: slider, choice or toggle */
// A stored value restores only when it is valid for its row.
function restore(row, key) {
  const raw = row.persist ? store.get(key) : null;
  if (raw == null || raw === '') return row.value;
  if (row.type === 'slider') {
    const n = Number(raw), min = row.min ?? 0, max = row.max ?? 1;
    return Number.isFinite(n) && n >= min && n <= max ? n : row.value;
  }
  if (row.type === 'toggle') return raw === '1' ? true : raw === '0' ? false : row.value;
  return row.options.some(o => o.value === raw) ? raw : row.value;
}
function makeRow(row, key, layer) {
  const save = v => { if (row.persist) store.set(key, row.type === 'toggle' ? (v ? '1' : '0') : String(v)); };
  const value = restore(row, key);
  if (row.type === 'slider') {
    const sl = makeSlider({ ...row, value, onInput: v => { save(v); row.onInput?.(v); } });
    sl.el.classList.add('s2-row');
    const set = sl.handle.set;
    sl.handle.set = (v, fire = false) => { set(v, fire); save(v); };
    return { el: sl.el, handle: sl.handle };
  }
  // A toggle is an Off/On pair of segments.
  const toggle = row.type === 'toggle';
  const options = toggle ? [{ value: 'off', label: 'Off' }, { value: 'on', label: 'On' }] : row.options;
  const out = v => (toggle ? v === 'on' : v);
  const state = { value: toggle ? (value ? 'on' : 'off') : value, disabled: false };
  let ctl = null;
  const pick = (v, fire, user = false) => {
    if (user && state.disabled) return;
    if (!options.some(o => o.value === v)) return;
    state.value = v;
    ctl.sync();
    save(out(v));
    if (fire) (toggle ? row.onToggle : row.onPick)?.(out(v));
  };
  ctl = makeChoice({ label: row.label, options }, 'segments', state, pick, layer);
  ctl.sync();
  const el = make('div', 's2-row', `<span>${row.label}</span>`);
  el.append(ctl.el);
  const handle = {
    get value() { return out(state.value); },
    set(v, fire = false) { pick(toggle ? (v ? 'on' : 'off') : v, fire); },
    get disabled() { return state.disabled; },
    set disabled(d) { state.disabled = !!d; ctl.sync(); },
  };
  return { el, handle };
}

/* key strip: printed keycaps, gone after a few gestures */
const TOUCH_WORD = { 'double-click': 'double-tap', click: 'tap', scroll: 'pinch' };
// Mouse words swap to touch words on a touch screen.
export function keyWord(word, touch) {
  const w = touch ? word.replace(/double-click|click|scroll/gi, m => TOUCH_WORD[m.toLowerCase()]) : word;
  return w.toUpperCase();
}
const COARSE = matchMedia('(pointer: coarse)');
// A word that starts with a pointer verb stays on touch.
// Every other word is a keyboard key.
const POINTER_WORD = /^(double-click|double-tap|click|tap|drag|hold|release|scroll|pinch|press|swipe)\b/i;
function makeKeys(entries, stage, info, delay) {
  const el = make('dl', 's2-keys');
  el.setAttribute('aria-label', 'How to play');
  const rows = entries.map(([word, verb]) => {
    const row = make('div'), kbd = make('kbd');
    row.append(make('dt'), make('dd'));
    row.firstChild.append(kbd);
    row.lastChild.textContent = verb;
    return { row, kbd, word };
  });
  el.append(...rows.map(r => r.row));
  // Keyboard keys show on fine pointers only.
  const words = () => rows.forEach(r => {
    r.kbd.textContent = keyWord(r.word, COARSE.matches);
    r.row.style.display = COARSE.matches && !POINTER_WORD.test(r.word) ? 'none' : '';
  });
  words();
  COARSE.addEventListener?.('change', words);
  // The strip fades by opacity only, so screen readers keep it.
  let count = 0, timer = 0, wheelAt = 0;
  const show = on => {
    el.classList.toggle('is-faded', !on);
    info?.setAttribute('aria-expanded', String(on));
    clearTimeout(timer);
    count = 0;
    if (on) arm();
  };
  // The timer starts once the intro has gone.
  const arm = () => {
    if (document.querySelector('.intro')) {
      const mo = new MutationObserver(() => { if (!document.querySelector('.intro')) { mo.disconnect(); arm(); } });
      mo.observe(document.body, { childList: true, subtree: true });
      return;
    }
    timer = setTimeout(() => show(false), delay);
  };
  const gesture = () => { if (!el.classList.contains('is-faded') && ++count >= 3) show(false); };
  stage.addEventListener('pointerdown', gesture);
  // One scroll burst counts as one gesture.
  stage.addEventListener('wheel', () => { const now = performance.now(); if (now - wheelAt > 400) gesture(); wheelAt = now; }, { passive: true });
  info?.addEventListener('click', () => show(el.classList.contains('is-faded')));
  show(true);
  return { el, handle: { show: () => show(true), hide: () => show(false), get shown() { return !el.classList.contains('is-faded'); } } };
}

export function buildBar(stage, spec = {}, { id, home = '../index.html', keyDelay = 8000 } = {}) {
  document.documentElement.classList.add('stim2');
  // The frame holds the stage and the layer, so control events skip the stage.
  const frame = make('div', 'stim-frame'), layer = make('div', 'stim-ui');
  stage.before(frame);
  frame.append(stage, layer);
  const slot = name => layer.appendChild(make('div', `s2-${name}`));
  const tl = slot('tl'), tr = slot('tr'), bl = slot('bl'), br = slot('br');
  // Limits warn the author; the shell still draws every control.
  const acts = spec.actions || [];
  if (acts.length > 3) console.warn(`Bar v2 (${id}): ${acts.length} actions; the limit is three.`);
  if (acts.some(a => a.verb === 'clear') && acts.some(a => a.verb === 'reset')) console.warn(`Bar v2 (${id}): Reset belongs in Settings when Clear shows.`);

  /* top left: back block, then the toy name */
  const letters = MARK.map(([ch, c, w, r, y], i) => `<span style="--i: ${i}; --c: oklch(${c}); --w: ${w}; --r: ${r}deg; --y: ${y}em">${ch}</span>`).join('');
  const back = make('a', 's2-back', `<span class="s2-arrow" aria-hidden="true">‹</span><span class="mark" aria-hidden="true">${letters}</span>`);
  back.href = home;
  back.setAttribute('aria-label', 'Back to Stimming');
  const name = make('span', 's2-name');
  name.append(document.querySelector('.intro-name')?.textContent.trim() || id);
  tl.append(back, name);
  const bindKey = keyBinder();

  /* the choice: one group, after the name */
  let choice = null, choiceCtl = null, choiceShow = null;
  if (spec.choice?.options?.length) {
    const c = spec.choice;
    const state = { value: c.value ?? c.options[0].value, disabled: false };
    // The shell calls onPick only for user input, or for set(v, true).
    const pick = (v, fire, user = false) => {
      if (user && state.disabled) return;
      if (!c.options.some(o => o.value === v)) return;
      state.value = v;
      choiceCtl.sync();
      if (fire) c.onPick?.(v);
    };
    // A rebuild swaps the display and keeps the state.
    let shownAs = null;
    choiceShow = display => {
      if (display === shownAs) return;
      choiceCtl?.el.remove();
      choiceCtl?.sheet?.el.remove();
      choiceCtl = makeChoice(c, display, state, pick, layer);
      choiceCtl.sync();
      shownAs = display;
    };
    choiceShow(c.display || (c.options.length > 5 ? 'stepper' : 'segments'));
    tl.append(choiceCtl.el);
    c.options.forEach(o => { if (o.key) bindKey(o.key, () => pick(o.value, true, true)); });
    choice = {
      get value() { return state.value; },
      set(v, fire = false) { pick(v, fire); },
      get disabled() { return state.disabled; },
      set disabled(d) { state.disabled = !!d; choiceCtl.sync(); },
    };
  }

  /* bottom corners: actions left, the main slider right */
  const actions = new Map();
  acts.forEach(a => { const { el, handle } = makeAction(a, bindKey); bl.append(el); actions.set(a.verb, handle); });
  const slider = spec.slider ? makeSlider(spec.slider) : null;
  if (slider) br.append(slider.el);
  const actionEls = [...bl.children];

  /* top right: legacy link, sound, Settings, (i) */
  const snd = iconButton('snd', SOUND_SVG, 'Sound');
  if (!document.getElementById('snd')) snd.id = 'snd';
  snd.setAttribute('aria-pressed', 'false');
  const set = iconButton('s2-set', SLIDERS, 'Settings');
  set.setAttribute('aria-expanded', 'false');
  const rowsOrSite = !!(spec.settings?.length || spec.quality);
  set.hidden = !rowsOrSite;
  tr.append(snd, set);

  /* the Settings sheet: toy rows, site rows, the build link, then Reset */
  const settings = new Map();
  let toyLab = null, toySec = null, sheet = null, ft = null;
  // The sheet builds on first need, so a late Classic link can join it.
  const ensureSheet = () => {
    if (sheet) return sheet;
    sheet = makeSheet(layer, { title: 'Settings', anchor: set });
    if (spec.reset) {
      ft = make('div', 's2-ft');
      const b = make('button', 's2-chip', 'Reset');
      b.type = 'button';
      b.addEventListener('click', () => { spec.reset(); sheet.open(false, true); });
      ft.append(b);
      sheet.el.append(ft);
    }
    return sheet;
  };
  // Sections sit above the Reset footer.
  const addSec = sec => (ft ? ft.before(sec) : ensureSheet().el.append(sec));
  // A narrow stage moves the slider in here, so a slider also builds the sheet.
  if (rowsOrSite || slider) {
    ensureSheet();
    if (spec.settings?.length || slider) {
      const sec = toySec = make('div', 's2-sec');
      toyLab = make('span', 's2-lab', name.firstChild.textContent);
      sec.append(toyLab);
      (spec.settings || []).forEach(row => {
        const r = makeRow(row, `stimming.${id}.${row.id}`, layer);
        settings.set(row.id, r.handle);
        sec.append(r.el);
      });
      addSec(sec);
    }
    if (spec.quality) {
      const sec = make('div', 's2-sec', '<span class="s2-lab">Site</span>');
      const q = makeRow({ type: 'choice', id: 'quality', label: 'Quality', value: quality(), onPick: v => setQuality(v),
        options: [{ value: 'standard', label: 'Standard' }, { value: 'high', label: 'High' }] }, QUALITY_KEY, layer);
      onQuality(v => q.handle.set(v));
      sec.append(q.el);
      addSec(sec);
    }
  }
  let keys = null;
  if (Array.isArray(spec.keys) && spec.keys.length) {
    if (spec.keys.length > 4) console.warn(`Bar v2 (${id}): ${spec.keys.length} key entries; the limit is four.`);
    const info = iconButton('s2-info', 'i', 'How to play');
    tr.append(info);
    keys = makeKeys(spec.keys, stage, info, keyDelay);
    info.setAttribute('aria-controls', keys.el.id = `s2-keys-${id}-${++barCount}`);
    layer.append(keys.el);
  }

  let legacy = null;
  /* narrow stages: corners stay, controls move down */
  // Below 640 px the choice drops to bottom left as a stepper.
  const place = narrow => {
    frame.toggleAttribute('data-narrow', narrow);
    if (sheet?.isOpen) sheet.open(false);
    if (choiceCtl?.sheet?.isOpen) choiceCtl.sheet.open(false);
    if (choiceShow) {
      const c = spec.choice;
      choiceShow(c.display === 'tray' ? 'tray' : narrow ? 'stepper' : c.display || (c.options.length > 5 ? 'stepper' : 'segments'));
      if (narrow) bl.prepend(choiceCtl.el); else tl.append(choiceCtl.el);
    }
    const down = narrow && !!choiceShow;
    (down ? br : bl).append(...actionEls);
    if (!slider) return;
    // The slider joins Settings only when actions hold the bottom right.
    const inSheet = down && actionEls.length > 0;
    slider.el.classList.toggle('s2-row', inSheet);
    if (inSheet) toyLab.after(slider.el); else br.append(slider.el);
    set.hidden = !(rowsOrSite || inSheet || legacy);
  };
  // Bottom corners that collide on a narrow stage stack in two rows.
  const stack = () => {
    frame.removeAttribute('data-stack');
    if (!narrowNow || !bl.childElementCount || !br.childElementCount) return;
    frame.toggleAttribute('data-stack', bl.getBoundingClientRect().right + 8 > br.getBoundingClientRect().left);
  };
  // The first layout runs at once, so a phone never shows the wide one.
  let narrowNow = frame.getBoundingClientRect().width < 640;
  place(narrowNow);
  stack();
  document.fonts?.ready.then(stack);
  new ResizeObserver(([e]) => {
    const narrow = e.contentRect.width < 640;
    if (narrow !== narrowNow) place(narrowNow = narrow);
    stack();
  }).observe(frame);

  const ui = {
    choice,
    slider: slider?.handle ?? null,
    action: verb => actions.get(verb) ?? null,
    setting: sid => settings.get(sid) ?? null,
    keys: keys?.handle ?? { show() {}, hide() {}, shown: false },
    soundButton: snd,
    // A missing toy keeps the fallback name and shows no tags.
    applyToy(info) {
      if (info?.name) { name.firstChild.textContent = info.name; if (toyLab) toyLab.textContent = info.name; }
      name.querySelectorAll('.s2-tag').forEach(t => t.remove());
      if (info?.sub) name.append(make('span', 's2-tag', 'LAB'));
      if (info?.tier) name.append(make('span', 's2-tag', String(info.tier).toUpperCase()));
      const onLegacy = /\/legacy\.html$/.test(location.pathname);
      if (legacy || !(onLegacy || info?.legacy)) return;
      // The Classic or Fresh link sits in Settings, under its own label.
      legacy = make('a', 's2-chip', onLegacy ? 'Fresh' : 'Classic');
      legacy.href = onLegacy ? 'index.html' : 'legacy.html';
      legacy.title = onLegacy ? 'Back to the fresh version' : 'The classic build of this toy';
      if (onLegacy) document.documentElement.dataset.legacy = '';
      const sec = make('div', 's2-sec', '<span class="s2-lab">Build</span>');
      const row = make('div', 's2-row', '<span>Version</span>');
      row.append(legacy);
      sec.append(row);
      addSec(sec);
      set.hidden = false;
    },
    // Only the back block and the name stay, for a toy that cannot run.
    hideControls() { layer.dataset.bare = ''; },
  };
  return ui;
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
      // Tone makes a spare context on import; true disposes it.
      T.setContext(new T.Context({ context: ac, lookAhead: 0, latencyHint: 'interactive' }), true);
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
// Low is the toy's slow-frame flag: Standard drops to 1, High drops to Standard.
// A toy with its own lower tier passes quality: 'standard' to keep the caps.
export function pixelRatio(w, h, { maxDpr = 2, budget = 1.4e6, low = false, quality: q = quality() } = {}) {
  const dev = window.devicePixelRatio || 1;
  if (q === 'high' && !low) return Math.min(dev, 3);
  if (q === 'high') low = false;
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
  // Settings and the (i) share one right-edge group, so they never split on a wrap.
  const edge = document.createElement('div'), tip = bar.querySelector('.how-tip');
  edge.className = 'stim-edge';
  if (tip) { tip.before(edge); edge.append(box, tip); } else { bar.append(edge); edge.append(box); }
  const open = on => { box.classList.toggle('is-open', on); btn.setAttribute('aria-expanded', String(on)); };
  btn.addEventListener('click', () => open(!box.classList.contains('is-open')));
  document.addEventListener('pointerdown', e => { if (!box.contains(e.target)) open(false); });
  addEventListener('keydown', e => { if (e.key === 'Escape') open(false); });
  return tray;
}
// Adds the Quality group to a Settings tray.
// Without a tray, the shared tray is made first.
// Buttons that sit loose in the tray, such as Reset, stay after it.
export function qualitySetting(tray = null) {
  tray ||= settingsTray();
  if (!tray) return null;
  const group = document.createElement('div');
  group.className = 'group stim-q';
  group.innerHTML = '<span>Quality</span><div class="choices" role="group" aria-label="Quality">'
    + '<button class="chip" type="button" data-value="standard" aria-pressed="false">Standard</button>'
    + '<button class="chip" type="button" data-value="high" aria-pressed="false">High</button></div>';
  const loose = [...tray.children].find(el => el.tagName === 'BUTTON');
  if (loose) loose.before(group); else tray.append(group);
  const chips = choices(group.querySelector('.choices'), v => setQuality(v));
  chips.set(quality());
  onQuality(q => chips.set(q));
  return group;
}

/* ---------- canvas sizing ---------- */
// The quality setting picks the pixel ratio; see pixelRatio.
export function fitCanvas(canvas, { maxDpr = 2, budget = 1.4e6, low = false, quality: q = quality() } = {}) {
  const r = canvas.getBoundingClientRect();
  const w = Math.max(1, r.width), h = Math.max(1, r.height);
  const dpr = pixelRatio(w, h, { maxDpr, budget, low, quality: q });
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
