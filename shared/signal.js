// @ts-check
// Bar v3, the Signal bar: one bar at the foot of the stage, no boxes, in the intro's beats.
// Spec: docs/plans/bar-v3.md.
// A toy opts in with initPage({ signal: true }). Bar v2 still builds, hidden.
// Bar v2 comes out when Tom has signed off Bar v3 on every toy (Tom, 2026-11-17).
// Signal draws from the same bar spec and acts through the Bar v2 handles.
// So the spec, the keys, the stored values and the toy's code stay as they are.
// Tom's rulings, 2026-11-16 and 2026-11-17: DESIGN.md (Rulings), barlab/AGENTS.md.
import { sound, quality, setQuality, keyWord, onTouch } from './stim.js';

const RM = matchMedia('(prefers-reduced-motion: reduce)');
const COARSE = matchMedia('(pointer: coarse)');
// The bar moves in film frames at 30 fps, as the intro does.
const FRAME = 1000 / 30;
const fr = (n = 1) => new Promise(r => setTimeout(r, n * FRAME));
const CARET = '<i class="sg-caret" aria-hidden="true"></i>';
const DEV_SVG = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5.5 4.5 2 8l3.5 3.5M10.5 4.5 14 8l-3.5 3.5M9 3 7 13"/></svg>';
const INFO_SVG = '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.25"/><path d="M8 7.4v4"/><circle class="solid" cx="8" cy="4.8" r="0.7"/></svg>';

// An accent is one colour or a gradient; a fill needs an image, line work one colour.
// Text on a held pick must reach 4.5:1 (measured on all 112 accents, 2026-11-17).
// A gradient with a stop too dark for dark text gives way to its lightest stop.
const LIGHT = c => Number(c.match(/oklch\(([\d.]+)/)?.[1] ?? 0.94);
const onDark = L => (L ** 3 + 0.05) / 0.0541;
/**
 * @param {HTMLElement} el
 * @param {string | null | undefined} acc
 */
function setAcc(el, acc) {
  const a = acc || 'var(--fg)';
  const stops = acc?.match(/oklch\([^)]*\)/g) || [];
  const img = a.includes('gradient(') ? a : `linear-gradient(${a}, ${a})`;
  let fill = img, on = 'var(--bg)';
  if (stops.length && Math.min(...stops.map(c => onDark(LIGHT(c)))) < 4.5) {
    const best = stops.reduce((p, c) => (LIGHT(c) > LIGHT(p) ? c : p));
    fill = `linear-gradient(${best}, ${best})`;
    if (onDark(LIGHT(best)) < 4.5) on = 'var(--fg)';
  }
  el.style.setProperty('--acc-ink', stops[0] && a.includes('gradient(') ? stops[0] : a);
  el.style.setProperty('--acc-img', img);
  el.style.setProperty('--acc-fill', fill);
  el.style.setProperty('--acc-on', on);
}

// How to play draws each gesture as a small line icon: a mouse, or touch points on a touch screen.
// One icon per kind of input, so the same gesture looks the same on every toy.
const MOUSE = 'M3 6.5a3.5 3.5 0 0 1 7 0v3a3.5 3.5 0 0 1-7 0z';
const LEFT = `<path d="${MOUSE}M3 7h7M6.5 3v4"/><path class="solid" d="M6.5 3A3.5 3.5 0 0 0 3 6.5V7h3.5z"/>`;
const RIGHT = `<path d="${MOUSE}M3 7h7M6.5 3v4"/><path class="solid" d="M6.5 3a3.5 3.5 0 0 1 3.5 3.5V7H6.5z"/>`;
const POINT = '<circle class="solid" cx="6.5" cy="8" r="2"/><circle cx="6.5" cy="8" r="4.5"/>';
const MOVE = '<path d="M13 8h8M15 6l-2 2 2 2M19 6l2 2-2 2"/>';
const STAY = '<path d="M13.5 5.5v5M13.5 8h7M20.5 5.5v5"/>';
const STAY_MOVE = '<path d="M13.5 5.5v5M13.5 8h7.5M19 6l2 2-2 2"/>';
// A circle: the pointer goes round, as the arrow shows.
const ROUND = '<path d="M18.2 4.5a3.5 3.5 0 1 1-3.03 1.75M13.1 7l2.07-.75.38 2.17"/>';
const GESTURE = {
  click: LEFT, 'right-click': RIGHT, 'double-click': LEFT,
  drag: LEFT + MOVE, 'right-drag': RIGHT + MOVE, hold: LEFT + STAY, 'hold + drag': LEFT + STAY_MOVE,
  circle: LEFT + ROUND, 'touch-circle': POINT + ROUND,
  // A release: no button is down, and an arrow leaves the mouse.
  release: `<path d="${MOUSE}M3 7h7M6.5 3v4"/><path d="M17 11V5M14.5 7.5 17 5l2.5 2.5"/>`,
  'touch-release': '<circle cx="6.5" cy="8" r="4.5"/><path d="M17 11V5M14.5 7.5 17 5l2.5 2.5"/>',
  scroll: `<path d="${MOUSE}"/><rect class="solid" x="5.75" y="4.5" width="1.5" height="3.2" rx="0.75"/><path d="M15 6.5l2-2 2 2M15 9.5l2 2 2-2"/>`,
  tap: POINT, 'double-tap': POINT, 'long-press': POINT + STAY, 'touch-drag': POINT + MOVE, 'touch-hold-drag': POINT + STAY_MOVE,
  'two-finger drag': '<circle class="solid" cx="4.5" cy="6" r="1.8"/><circle class="solid" cx="8.5" cy="10" r="1.8"/>' + MOVE,
  pinch: '<circle class="solid" cx="4" cy="8" r="1.8"/><circle class="solid" cx="20" cy="8" r="1.8"/><path d="M7 8h3.5M9 6.5 10.5 8 9 9.5M17 8h-3.5M15 6.5 13.5 8 15 9.5"/>',
};
// On a touch screen each mouse gesture has one touch gesture, as in keyWord.
const TOUCH = { release: 'touch-release', click: 'tap', 'double-click': 'double-tap', 'right-click': 'long-press', drag: 'touch-drag', 'right-drag': 'two-finger drag', hold: 'long-press', 'hold + drag': 'touch-hold-drag', scroll: 'pinch', circle: 'touch-circle' };
const KINDS = ['release', 'hold + drag', 'right-drag', 'right-click', 'double-click', 'two-finger drag', 'long-press', 'double-tap', 'click', 'tap', 'drag', 'hold', 'scroll', 'pinch', 'circle'];
/**
 * The icon for one How to play entry: a gesture drawing, or keycaps for a key.
 * @param {string} word The spec's word, such as 'drag', 'drag a thing' or 'T'.
 * @param {boolean} touch
 */
function inputHTML(word, touch) {
  const w = word.toLowerCase().trim();
  let kind = KINDS.find(k => w.startsWith(k));
  // A lone + or / is a key; inside a longer word it parts two keys.
  if (!kind) return w.split(/\s+/).flatMap(k => (k.length > 1 ? k.split(/[/+]+/) : [k])).filter(Boolean).map(k => `<kbd>${k}</kbd>`).join('');
  // A word after the gesture says what you do it on.
  const rest = w.slice(kind.length).trim();
  const twice = kind.startsWith('double') ? '<small>2×</small>' : '';
  if (touch && TOUCH[kind]) kind = TOUCH[kind];
  return `<svg viewBox="0 0 24 16" aria-hidden="true">${GESTURE[kind]}</svg>${twice}${rest ? `<small>${rest}</small>` : ''}`;
}

/** @returns {any} */
const h = (tag, cls = '', html = null) => {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (html != null) el.innerHTML = html;
  return el;
};
const text = (tag, cls, str) => { const el = h(tag, cls); el.textContent = str; return el; };
const btn = (cls, html, label = '') => {
  const b = h('button', `sg-btn ${cls}`.trim(), html);
  b.type = 'button';
  if (label) b.setAttribute('aria-label', label);
  return b;
};
const box = (cls, ...kids) => { const el = h('div', cls); el.append(...kids.flat().filter(Boolean)); return el; };
// An icon with its own fills is art: it keeps its colours (Tom, 2026-11-17).
// Bar v2 holds the same icon in its hidden layer, and a hidden gradient paints nothing.
// So each copy here gets its own ids.
const isArt = icon => /url\(#|Gradient|fill="(?!none)/.test(icon);
let artSeq = 0;
const ownIds = icon => {
  const n = ++artSeq;
  return icon.replace(/\bid="([^"]+)"/g, (m, id) => `id="sg${n}-${id}"`).replace(/url\(#([^)]+)\)/g, (m, id) => `url(#sg${n}-${id})`);
};
// An option may carry a colour dot; the dot keeps its colour.
const optHTML = o => `${o.dot ? `<i class="sg-dot" style="background: ${o.dot}"></i>` : ''}${o.icon ? (isArt(o.icon) ? ownIds(o.icon).replace('<svg', '<svg class="sg-art"') : o.icon) : ''}<span>${o.label}</span>`;
const actLabel = a => a.label || (a.verb === 'add' ? `+ ${a.noun ?? 'One'}` : a.verb.charAt(0).toUpperCase() + a.verb.slice(1));

/**
 * Draws the Signal bar over a stage that Bar v2 has built.
 * @param {string} id The toy's id in toys.json.
 * @param {any} spec The toy's bar spec, as passed to initPage.
 * @param {any} ui The Bar v2 handles that initPage returns.
 */
export function mountSignal(id, spec, ui) {
  const frame = /** @type {HTMLElement | null} */ (document.querySelector('.stim-frame'));
  const shell = /** @type {HTMLElement | null} */ (frame?.querySelector('.stim-ui'));
  const stage = /** @type {HTMLElement | null} */ (frame?.querySelector('.stage'));
  if (!frame || !shell || !stage) return;
  const css = h('link');
  css.rel = 'stylesheet';
  css.href = new URL('signal.css', import.meta.url).href;
  document.head.append(css);
  // The class hides the Bar v2 layer; its keys and its handles keep working.
  document.documentElement.classList.add('stim-signal');
  const layer = h('div', 'sg-ui');
  frame.append(layer);

  /** @type {any} */
  let toy = { name: id };
  /** @type {(() => void)[]} */
  let syncers = [];
  /** @type {any} */
  let open = null;
  let run = 0;
  const sync = () => syncers.forEach(fn => fn());
  const touch = () => COARSE.matches;
  const options = spec.choice?.options?.length ? spec.choice.options : [];
  const cur = () => options.find(o => o.value === ui.choice.value) || options[0];

  /* ---------- parts ---------- */
  // One row of options; the pick wears the toy's ink.
  const segPart = (opts, get, set, cls = '') => {
    const el = h('div', `sg-seg ${cls}`.trim());
    el.setAttribute('role', 'group');
    const all = opts.map(o => {
      const b = btn('', optHTML(o));
      b.addEventListener('click', () => { set(o.value); sync(); });
      el.append(b);
      return [b, o];
    });
    syncers.push(() => all.forEach(([b, o]) => b.setAttribute('aria-pressed', String(o.value === get()))));
    return el;
  };
  // A long choice steps one name at a time, so its row never overflows.
  const stepPart = (opts, get, set) => {
    const at = () => Math.max(0, opts.findIndex(o => String(o.value) === String(get())));
    const name = text('span', 'sg-step-now', '');
    const arrow = (d, glyph, label) => {
      const b = btn('sg-ico', glyph, label);
      b.addEventListener('click', () => { set(opts[(at() + d + opts.length) % opts.length].value); sync(); });
      return b;
    };
    syncers.push(() => { name.textContent = opts[at()].label; });
    return box('sg-step', arrow(-1, '‹', 'Previous'), name, arrow(1, '›', 'Next'));
  };
  const choiceRow = (opts, get, set) => (opts.length <= 4 && opts.reduce((n, o) => n + String(o.label).length, 0) <= 24
    ? segPart(opts, get, set) : stepPart(opts, get, set));
  // Every option as a tile; a new group name puts a heading across the grid.
  const gridPart = done => {
    const el = h('div', 'sg-grid');
    let group;
    const all = options.map(o => {
      if (o.group && o.group !== group) el.append(text('div', 'sg-group', o.group));
      group = o.group;
      const b = btn('sg-opt', optHTML(o));
      // The picked row holds two frames in the toy's ink, then its list leaves.
      b.addEventListener('click', async () => { ui.choice.set(o.value, true); sync(); if (!RM.matches) await fr(2); done(); });
      el.append(b);
      return [b, o];
    });
    syncers.push(() => all.forEach(([b, o]) => b.setAttribute('aria-pressed', String(o.value === ui.choice.value))));
    return el;
  };
  const rangePart = (label, { min = 0, max = 1, step = 0.01 }, handle, cls = '') => {
    const el = h('label', `sg-slider ${cls}`.trim());
    const input = h('input');
    Object.assign(input, { type: 'range', min, max, step });
    el.append(text('span', '', label), input);
    input.addEventListener('input', () => { handle.set(Number(input.value), true); sync(); });
    syncers.push(() => {
      input.value = String(handle.value);
      input.disabled = !!handle.disabled;
      el.toggleAttribute('data-disabled', !!handle.disabled);
      el.style.setProperty('--v', `${((Number(input.value) - min) / (max - min || 1)) * 100}%`);
    });
    return el;
  };
  const actionParts = sheetPart => (spec.actions || []).map(a => {
    const b = btn('sg-act', `<span>${actLabel(a)}</span>`);
    const handle = ui.action(a.verb);
    if (a.tray) {
      // A tray action opens its options in a sheet; a pick goes to the toy.
      const sheet = sheetPart('sg-sheet--pick sg-tray', a.tray.title || actLabel(a), b);
      const hint = touch() ? a.tray.touchHint || a.tray.hint : a.tray.hint;
      if (hint) sheet.el.querySelector('.sg-sheet-hd').append(text('em', '', hint));
      const grid = h('div', 'sg-grid');
      for (const o of a.tray.options) {
        const t = btn('sg-opt', optHTML(o));
        // The value lets the toy start a drag from the option.
        t.dataset.value = o.value;
        t.addEventListener('click', async () => { a.tray.onPick(o.value); if (!RM.matches) await fr(2); sheet.open(false); });
        grid.append(t);
      }
      sheet.el.append(grid);
      // The toy opens and closes the sheet through the action's handle; no value toggles it.
      if (handle) handle.tray = {
        open(on = sheet.el.hidden) { if (on !== !sheet.el.hidden) sheet.open(on); },
        get isOpen() { return !sheet.el.hidden; },
      };
    } else if (a.hold) {
      // A held action runs from press to release.
      const up = () => { if (b.classList.contains('is-on')) { b.classList.remove('is-on'); a.onUp?.(); } };
      b.addEventListener('pointerdown', e => {
        if (e.button !== 0 || handle?.disabled) return;
        try { b.setPointerCapture(e.pointerId); } catch {}
        b.classList.add('is-on');
        a.onDown?.();
      });
      ['pointerup', 'pointercancel', 'lostpointercapture', 'blur'].forEach(t => b.addEventListener(t, up));
      b.addEventListener('contextmenu', e => e.preventDefault());
    } else b.addEventListener('click', () => { handle?.set(null, true); sync(); });
    // A toy may hide its Bar v2 chip until the action has a use.
    // Railgun shows Reset only after a kill.
    /** @type {any} */
    const chip = [...shell.querySelectorAll('.s2-chip')].find(c => c.querySelector('.s2-label')?.textContent === actLabel(a));
    syncers.push(() => {
      b.toggleAttribute('data-disabled', !!handle?.disabled);
      const gone = !!chip && (chip.hidden || chip.style.display === 'none');
      if (gone === b.hidden) return;
      b.hidden = gone;
      relayout();
    });
    return b;
  });
  const rowPart = row => {
    const handle = ui.setting(row.id);
    if (!handle) return null;
    if (row.type === 'slider') return rangePart(row.label, row, handle, 'sg-row');
    const el = box('sg-row', text('span', '', row.label));
    if (row.type === 'toggle') el.append(segPart([{ value: false, label: 'Off' }, { value: true, label: 'On' }], () => handle.value, v => handle.set(v, true)));
    else if (row.type === 'choice') el.append(choiceRow(row.options, () => handle.value, v => handle.set(v, true)));
    else if (row.type === 'button') {
      const b = btn('sg-word', row.text ?? 'Go');
      b.addEventListener('click', () => row.onClick?.());
      el.append(b);
    } else if (row.type === 'link') {
      const a = text('a', 'sg-btn sg-word', row.text ?? 'Open');
      a.href = row.href;
      el.append(a);
    }
    return el;
  };
  // A new row group opens a labelled section, as in Bar v2.
  const addRows = (el, rows) => {
    let group;
    (rows || []).forEach(row => {
      const r = rowPart(row);
      if (!r) return;
      if (row.group && row.group !== group) el.append(text('div', 'sg-group', row.group));
      group = row.group;
      el.append(r);
    });
  };

  /* ---------- one draw: the monogram, the bar, its sheets ---------- */
  const draw = () => {
    syncers = [];
    open = null;
    run++;
    layer.replaceChildren();
    setAcc(layer, toy.accent);

    // A sheet opens from its button; only one is open at a time.
    const sheets = [];
    const sheetPart = (cls, title, anchor) => {
      const el = h('div', `sg-sheet ${cls}`);
      el.hidden = true;
      const flash = h('i', 'sg-box sg-box--sheet');
      el.append(text('div', 'sg-sheet-hd', title), flash);
      const api = {
        el, anchor, flash,
        open(on) {
          if (on && open && open !== api) open.open(false);
          el.hidden = !on;
          anchor.setAttribute('aria-expanded', String(on));
          if (on) open = api; else if (open === api) open = null;
          land(api, on);
        },
      };
      anchor.setAttribute('aria-expanded', 'false');
      anchor.addEventListener('click', () => api.open(el.hidden));
      sheets.push(api);
      return api;
    };

    /* the bar's three groups: play, the main slider, the system */
    const play = [];
    if (options.length) {
      // Four options or fewer show in a row; a narrow stage folds them into the list.
      const seg = options.length <= 4 ? segPart(options, () => ui.choice.value, v => ui.choice.set(v, true), 'sg-wide') : null;
      const pick = btn(seg ? 'sg-pick sg-narrow' : 'sg-pick', '', spec.choice.label);
      const sheet = sheetPart('sg-sheet--pick', spec.choice.label || 'Pick', pick);
      sheet.el.append(gridPart(() => sheet.open(false)));
      let last;
      syncers.push(() => {
        const o = cur();
        if (o !== last) { last = o; pick.innerHTML = optHTML(o) + CARET; }
        pick.toggleAttribute('data-disabled', !!ui.choice.disabled);
        seg?.toggleAttribute('data-disabled', !!ui.choice.disabled);
      });
      play.push(seg, pick);
    }
    play.push(...actionParts(sheetPart));
    const slider = spec.slider ? rangePart(spec.slider.label, spec.slider, ui.slider) : null;

    const sys = [];
    if (!ui.soundButton.hidden) {
      const snd = btn('sg-ico sg-snd', shell.querySelector('.snd')?.innerHTML || '', 'Sound');
      snd.addEventListener('click', () => sound.toggle());
      syncers.push(() => snd.setAttribute('aria-pressed', String(sound.on)));
      sys.push(snd);
    }
    // Settings: the main slider on a narrow stage, the toy's rows, Quality, the build link, Reset.
    const onLegacy = /\/legacy\.html$/.test(location.pathname);
    const build = onLegacy || toy.legacy;
    const hasRows = !!(spec.settings?.length || spec.quality || spec.reset || build);
    if (hasRows || slider) {
      const set = btn(hasRows ? 'sg-ico' : 'sg-ico sg-narrow', shell.querySelector('.s2-set')?.innerHTML || '', 'Settings');
      const sheet = sheetPart('sg-sheet--rows', 'Settings', set);
      const rows = h('div', 'sg-rows');
      if (slider) rows.append(rangePart(spec.slider.label, spec.slider, ui.slider, 'sg-row sg-row--main'));
      addRows(rows, spec.settings);
      if (spec.quality) rows.append(box('sg-row', text('span', '', 'Quality'),
        segPart([{ value: 'standard', label: 'Standard' }, { value: 'high', label: 'High' }], quality, setQuality)));
      if (build) {
        const a = text('a', 'sg-btn sg-word', onLegacy ? 'Fresh' : 'Classic');
        a.href = onLegacy ? 'index.html' : 'legacy.html';
        rows.append(box('sg-row', text('span', '', 'Version'), a));
      }
      if (spec.reset) {
        const reset = btn('sg-word', 'Reset');
        reset.addEventListener('click', () => { spec.reset(); sync(); sheet.open(false); });
        rows.append(box('sg-row', reset));
      }
      sheet.el.append(rows);
      sys.push(set);
    }
    // Dev rows show only with ?dev, as in Bar v2.
    if (spec.dev?.length && new URLSearchParams(location.search).has('dev')) {
      const dev = btn('sg-ico', DEV_SVG, 'Dev');
      const sheet = sheetPart('sg-sheet--rows', 'Dev', dev);
      const rows = h('div', 'sg-rows');
      addRows(rows, spec.dev);
      sheet.el.append(rows);
      sys.push(dev);
    }
    // (i) opens How to play: every gesture and every key. Keycaps show nowhere else.
    if (spec.help?.length || spec.keys?.length) {
      const info = btn('sg-ico', INFO_SVG, 'How to play');
      const sheet = sheetPart('sg-sheet--rows', 'How to play', info);
      const how = h('div', 'sg-how');
      // One row: the drawing of the input, then what it does. The words name it for a screen reader.
      const row = (word, verb) => {
        const input = h('span', 'sg-input', inputHTML(word, touch()));
        input.setAttribute('role', 'img');
        input.setAttribute('aria-label', keyWord(word, touch()).toLowerCase());
        how.append(box('sg-how-row', input, text('span', '', verb)));
      };
      // A toy may give help rows: one instruction per row, as many as it needs.
      // Without them the key strip's entries and the action keys make the list.
      // A key row leaves on a touch screen; a touch-only gesture shows there alone.
      const fits = word => (touch() ? onTouch(word) : !/^(pinch|tap|double-tap|long-press|two-finger|swipe)\b/i.test(word));
      (spec.help || spec.keys).forEach(([word, verb]) => { if (fits(word)) row(word, verb); });
      if (!touch() && !spec.help) {
        (spec.actions || []).forEach(a => { if (a.key) row(String(a.key), actLabel(a).toLowerCase()); });
        options.forEach(o => { if (o.key) row(String(o.key), String(o.label).toLowerCase()); });
      }
      sheet.el.append(how);
      sys.push(info);
    }

    const grp = (cls, kids) => { const k = kids.filter(Boolean); return k.length ? box(`sg-grp ${cls}`.trim(), k) : null; };
    const flash = h('i', 'sg-box');
    const bar = box('sg-bar', grp('', play), grp('sg-main', [slider]), grp('', sys), flash);
    const glass = h('div', 'sg-glass');

    // The top left: the toy's icon as a monogram, the intro's flash box at rest.
    // Pointing parts the square; then the Stimming logo plays behind the return chevron.
    // It is the shell's own back link, so the letters, their hues and the wave stay true.
    const mono = /** @type {HTMLElement} */ (shell.querySelector('.s2-back').cloneNode(true));
    mono.classList.add('sg-mono');
    mono.setAttribute('aria-label', `${toy.name}. Back to Stimming`);
    mono.prepend(h('span', 'sg-emblem', toy.emblem ? `<i style="--emblem: url(${new URL('../' + toy.emblem, import.meta.url).href})"></i>` : '<b>S</b>'));

    layer.append(mono, glass, bar, ...sheets.map(s => s.el));

    /* ---------- the bar's beats ---------- */
    let shown = false, idleTimer = 0;
    // One frame of the bar: its box, its size and whether it shows.
    const set = ({ split = 50, sx = 1, sy = 1, off = false }) => {
      flash.style.setProperty('--sg-split', `${split}%`);
      // While the box is on, the ink turns white, so the blend gives clean dark.
      bar.classList.toggle('is-boxed', split < 50);
      bar.style.transform = sx === 1 && sy === 1 ? '' : `scale(${sx}, ${sy})`;
      bar.toggleAttribute('data-off', off);
      bar.inert = off;
    };
    // A newer sequence stops the one in flight.
    const seq = async list => {
      const me = ++run;
      for (const [frame, hold = 1] of list) {
        if (me !== run) return false;
        set(frame);
        await fr(hold);
      }
      return me === run;
    };
    // The first arrival is the intro's beat: the flash fills, snaps to size, holds, then parts.
    const arrive = async first => {
      shown = true;
      if (!RM.matches) {
        const landing = first
          ? [[{ split: 0, sx: 1.3, sy: 1.3 }, 2], [{ split: 0, sx: 0.95, sy: 0.95 }], [{ split: 0, sx: 1.03, sy: 1.03 }], [{ split: 0 }, 3]]
          : [[{ split: 0, sy: 0.08 }], [{ split: 0 }]];
        if (!await seq([...landing, [{ split: 14 }], [{ split: 32 }]])) return;
      }
      set({});
      arm();
    };
    // The exit is the intro's wipe: the box drops to a line, then the line closes.
    const leave = async () => {
      shown = false;
      if (RM.matches || await seq([[{ split: 0, sy: 0.3 }], [{ split: 0, sy: 0.08 }], [{ split: 0, sx: 0.4, sy: 0.08 }]])) set({ off: true });
    };
    // The bar stays while you play. It leaves after 8 s with no input.
    // It never leaves under the pointer, under focus, or with a sheet open.
    const busy = () => !!open || bar.matches(':hover') || layer.contains(document.activeElement);
    const arm = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => { if (busy()) return arm(); if (shown) leave(); }, 8000);
    };
    // Input counts only once the bar has landed: the intro owns the screen before that.
    let landed = false;
    poke = () => { if (!landed) return; if (!shown) arrive(false); else arm(); };
    stop = () => clearTimeout(idleTimer);

    // A sheet is one object: its box lands from the bar up and parts over its rows.
    // It grows from its own button; on the way out it drops to a line.
    const land = async (api, on) => {
      const el = api.el;
      const me = el._run = (el._run || 0) + 1;
      const frame = (split, sy) => {
        api.flash.style.setProperty('--sg-split', `${split}%`);
        el.classList.toggle('is-boxed', split < 50);
        el.style.transform = sy === 1 ? '' : `scaleY(${sy})`;
      };
      el.classList.remove('is-closing');
      glass.toggleAttribute('data-on', on);
      if (on) {
        el.scrollTop = 0;
        glass.style.height = `${el.offsetHeight + bar.offsetHeight + 130}px`;
        const a = api.anchor.getBoundingClientRect(), b = el.getBoundingClientRect();
        el.style.transformOrigin = `${Math.round(a.left + a.width / 2 - b.left)}px 100%`;
        if (!RM.matches) for (const [split, sy] of [[0, 0.06], [0, 1], [0, 1], [16, 1], [34, 1]]) {
          if (me !== el._run) return;
          frame(split, sy);
          await fr();
        }
        if (me === el._run) frame(50, 1);
        return;
      }
      arm();
      if (RM.matches) return;
      el.classList.add('is-closing');
      for (const [split, sy] of [[0, 0.4], [0, 0.06]]) {
        if (me !== el._run) return;
        frame(split, sy);
        await fr();
      }
      if (me === el._run) { el.classList.remove('is-closing'); frame(50, 1); }
    };
    glass.addEventListener('pointerdown', () => open?.open(false));

    // Feedback belongs to the press: the white box lands oversize on pointer down.
    // It holds at size while the pointer is down and parts on release.
    // A key press shows no box: its result is there at once.
    let held = null;
    release = () => { if (!held) return; held.classList.remove('is-cut'); held.style.removeProperty('--sg-k'); held = null; };
    const press = async e => {
      const b = e.target.closest('.sg-btn');
      if (!b || e.button > 0 || b.matches('[aria-pressed="true"]:not(.sg-snd)')) return;
      release();
      held = b;
      b.classList.add('is-cut');
      if (RM.matches) return;
      b.style.setProperty('--sg-k', '1.25');
      await fr();
      if (held === b) b.style.removeProperty('--sg-k');
    };
    [bar, ...sheets.map(s => s.el)].forEach(el => el.addEventListener('pointerdown', press));

    // An icon button names itself: after a pause on the first, at once on its neighbours.
    const tip = text('span', 'sg-tip', '');
    tip.hidden = true;
    layer.append(tip);
    let tipTimer = 0, tipAt = -1e9;
    const showTip = b => {
      tip.textContent = b.getAttribute('aria-label') || '';
      const r = b.getBoundingClientRect(), l = layer.getBoundingClientRect();
      tip.style.left = `${Math.round(r.left + r.width / 2 - l.left)}px`;
      tip.hidden = false;
    };
    const hideTip = () => { clearTimeout(tipTimer); if (!tip.hidden) tipAt = performance.now(); tip.hidden = true; };
    bar.querySelectorAll('.sg-ico').forEach(b => {
      b.addEventListener('pointerenter', e => {
        if (e.pointerType !== 'mouse') return;
        clearTimeout(tipTimer);
        if (performance.now() - tipAt < 400) showTip(b); else tipTimer = setTimeout(() => showTip(b), 450);
      });
      b.addEventListener('pointerleave', hideTip);
      b.addEventListener('pointerdown', hideTip);
      b.addEventListener('focus', () => { if (b.matches(':focus-visible')) showTip(b); });
      b.addEventListener('blur', hideTip);
    });

    // The sheets stand on the bar, however many rows it takes; a bar on two rows drops its slashes.
    relayout = () => {
      bar.classList.remove('is-wrapped');
      // One part gives the row height: a group may wrap by itself.
      bar.classList.toggle('is-wrapped', bar.offsetHeight > 1.5 * (bar.querySelector('.sg-btn')?.offsetHeight || bar.offsetHeight));
      layer.style.setProperty('--barh', `${bar.offsetHeight}px`);
    };
    relayout();
    sync();
    set({ off: true });
    // The bar lands when the intro has gone, on the intro's own beat.
    const first = () => { landed = true; arrive(true); };
    if (!document.querySelector('.intro')) first();
    else {
      const go = () => { mo.disconnect(); clearTimeout(cap); first(); };
      const me = run;
      const mo = new MutationObserver(() => { if (me !== run) mo.disconnect(); else if (!document.querySelector('.intro')) go(); });
      mo.observe(document.body, { childList: true, subtree: true });
      const cap = setTimeout(() => { if (me === run) go(); }, 12000);
    }
  };

  /* ---------- wiring that outlives a draw ---------- */
  let poke = () => {}, stop = () => {}, release = () => {}, relayout = () => {};
  // Any input brings the bar back and starts the 8 s again.
  for (const t of ['pointermove', 'pointerdown', 'touchstart', 'keydown', 'wheel']) addEventListener(t, () => poke(), { passive: true, capture: true });
  for (const t of ['pointerup', 'pointercancel', 'blur']) addEventListener(t, () => release(), true);
  stage.addEventListener('pointerdown', () => open?.open(false));
  addEventListener('keydown', e => { if (e.key === 'Escape') open?.open(false); });
  new ResizeObserver(() => relayout()).observe(frame);
  document.fonts?.ready.then(() => relayout());
  // The hidden Bar v2 layer changes when a key, a stored value or the toy sets a control.
  // Signal follows it, so no timer polls an idle page.
  let queued = false;
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; sync(); layer.toggleAttribute('data-bare', 'bare' in shell.dataset); });
  }).observe(shell, { subtree: true, attributes: true, childList: true, characterData: true });
  sound.onChange(() => sync());
  // toys.json gives the name, the accent, the emblem and the legacy flag.
  Promise.resolve(globalThis.__stimToys).catch(() => null).then(toys => {
    if (toys?.[id]) toy = toys[id];
    stop();
    draw();
  });
}
