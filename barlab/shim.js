// Bar lab shim: stands in for shared/stim.js inside the lab's frame.
// It passes every export through and wraps initPage.
// The wrap reads the toy's own bar spec and draws the picked direction from it.
// Every control acts through the shell's handles, so the toy sees no difference.
export * from '../shared/stim.js';
import * as stim from '../shared/stim.js';

export function initPage(opts) {
  const ui = stim.initPage(opts);
  if (opts.bar && ui.soundButton) mount(opts.id, opts.bar, ui);
  return ui;
}

const COARSE = matchMedia('(pointer: coarse)');
const RM = matchMedia('(prefers-reduced-motion: reduce)');
// The Signal bar moves in film frames at 30 fps, as the intro does.
// The lab's slow factor stretches each frame for a filmstrip.
const FRAME = 1000 / 30;
const slow = () => Number(window.frameElement?.dataset.slow) || 1;
const fr = (n = 1) => new Promise(r => setTimeout(r, n * FRAME * slow()));
const CARET = '<i class="b-caret" aria-hidden="true"></i>';
const DEV_SVG = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5.5 4.5 2 8l3.5 3.5M10.5 4.5 14 8l-3.5 3.5M9 3 7 13"/></svg>';
// The wordmark's eight letter hues, for the lab's Wordmark accent.
const HUES = ['0.8 0.15 62', '0.72 0.2 318', '0.8 0.12 195', '0.7 0.19 32', '0.72 0.14 255', '0.82 0.11 345', '0.86 0.15 100', '0.78 0.16 150'];
// An accent is one colour or a gradient; a fill needs an image, line work one colour.
const setAcc = (el, acc) => {
  const a = acc || 'var(--fg)';
  el.style.setProperty('--acc', a);
  el.style.setProperty('--acc-ink', acc?.includes('gradient(') ? (acc.match(/oklch\([^)]*\)/)?.[0] || 'var(--fg)') : a);
  el.style.setProperty('--acc-img', a.includes('gradient(') ? a : `linear-gradient(${a}, ${a})`);
};
const INFO_SVG = '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.25"/><path d="M8 7.4v4"/><circle class="solid" cx="8" cy="4.8" r="0.7"/></svg>';

const h = (tag, cls = '', html = null) => {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (html != null) el.innerHTML = html;
  return el;
};
const text = (tag, cls, str) => { const el = h(tag, cls); el.textContent = str; return el; };
const btn = (cls, html, label) => {
  const b = h('button', `b-btn ${cls}`.trim(), html);
  b.type = 'button';
  if (label) b.setAttribute('aria-label', label);
  return b;
};
const box = (cls, ...kids) => { const el = h('div', cls); el.append(...kids.flat().filter(Boolean)); return el; };
// An icon with its own fills is art: it keeps its colours.
const isArt = icon => /url\(#|Gradient|fill="(?!none)/.test(icon);
const optHTML = o => `${o.icon ? (isArt(o.icon) ? o.icon.replace('<svg', '<svg class="b-art"') : o.icon) : ''}<span>${o.label}</span>`;
const actLabel = a => a.label || (a.verb === 'add' ? `+ ${a.noun ?? 'One'}` : a.verb.charAt(0).toUpperCase() + a.verb.slice(1));

function mount(id, spec, ui) {
  const frame = document.querySelector('.stim-frame');
  const shell = frame?.querySelector('.stim-ui');
  if (!frame || !shell) return;
  const stage = frame.querySelector('.stage');
  const host = window.frameElement;
  const css = h('link');
  css.rel = 'stylesheet';
  css.href = new URL('concepts.css', import.meta.url).href;
  document.head.append(css);
  const layer = h('div', 'bl-ui');
  frame.append(layer);

  let toy = { name: id, accent: null };
  // Each draw fills these; a redraw empties them.
  let syncers = [], open = null, hints = null, hintTimer = 0, gestures = 0, relayout = null;
  // Signal sets these: a sheet hook and the leave-and-return of its bar.
  let popHook = null, presence = null, run = 0, pickBeat = null, pickDone = null;
  // Signal keeps the key strip with its bar: no timer and no gesture count.
  let stayHints = false, series = null;
  const sync = () => syncers.forEach(fn => fn());
  const touch = () => COARSE.matches || (host?.dataset.size || 'full') !== 'full';
  const hasChoice = !!spec.choice?.options?.length;
  const options = hasChoice ? spec.choice.options : [];
  const cur = () => options.find(o => o.value === ui.choice.value) || options[0];
  const pick = v => { ui.choice.set(v, true); sync(); };

  /* ---------- parts: every direction builds from these ---------- */
  // The wordmark is the shell's own, so the letters and the wave stay true.
  const idPart = () => {
    const back = shell.querySelector('.s2-back').cloneNode(true);
    return box('b-id', back, text('span', 'b-name', toy.name));
  };
  // One joined block of options; the pick is the flash box.
  const segPart = (opts, get, set, cls = '') => {
    const el = h('div', `b-seg ${cls}`.trim());
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
  // Every option as a tile, for a list or a drawer.
  const gridPart = done => {
    const el = h('div', 'b-grid');
    // A new group name puts a heading across the grid.
    let group;
    const all = options.map(o => {
      if (o.group && o.group !== group) el.append(text('div', 'b-group-hd', o.group));
      group = o.group;
      const b = btn('b-opt', `${optHTML(o)}${o.key ? `<kbd>${o.key}</kbd>` : ''}`);
      // A direction may hold the list open for a beat, so the pick shows.
      b.addEventListener('click', async () => { pick(o.value); await pickBeat?.(b); done?.(); pickDone?.(); });
      el.append(b);
      return [b, o];
    });
    syncers.push(() => all.forEach(([b, o]) => b.setAttribute('aria-pressed', String(o.value === ui.choice.value))));
    return el;
  };
  // A sheet that opens from its button; only one is open at a time.
  const popPart = (cls, title, anchor) => {
    const el = h('div', `b-pop ${cls}`);
    el.hidden = true;
    const x = btn('b-ico b-x', '✕', 'Close');
    el.append(box('b-pop-hd', text('span', '', title), x));
    const api = {
      el, anchor,
      get isOpen() { return !el.hidden; },
      open(on) {
        if (on && open && open !== api) open.open(false);
        el.hidden = !on;
        anchor.setAttribute('aria-expanded', String(on));
        if (on) open = api; else if (open === api) open = null;
        // An open sheet takes the strip's place.
        if (on) showHints(false);
        popHook?.(api, on);
      },
    };
    anchor.setAttribute('aria-expanded', 'false');
    anchor.addEventListener('click', () => api.open(el.hidden));
    x.addEventListener('click', () => { api.open(false); anchor.focus(); });
    return api;
  };
  const actionParts = () => (spec.actions || []).map(a => {
    const b = btn('b-act', `<span>${actLabel(a)}</span>${a.key ? `<kbd>${a.key}</kbd>` : ''}`);
    if (a.hold) {
      // A held action runs from press to release.
      const up = () => { if (b.classList.contains('is-on')) { b.classList.remove('is-on'); a.onUp?.(); } };
      b.addEventListener('pointerdown', e => {
        if (e.button !== 0) return;
        try { b.setPointerCapture(e.pointerId); } catch {}
        b.classList.add('is-on');
        a.onDown?.();
      });
      ['pointerup', 'pointercancel', 'lostpointercapture', 'blur'].forEach(t => b.addEventListener(t, up));
      b.addEventListener('contextmenu', e => e.preventDefault());
    } else b.addEventListener('click', () => { ui.action(a.verb)?.set(null, true); sync(); });
    return b;
  });
  const rangePart = (label, { min = 0, max = 1, step = 0.01 }, handle, cls = '') => {
    const el = h('label', `b-slider ${cls}`.trim());
    const input = h('input');
    Object.assign(input, { type: 'range', min, max, step });
    el.append(text('span', '', label), input);
    const fill = () => el.style.setProperty('--v', `${((Number(input.value) - min) / (max - min || 1)) * 100}%`);
    input.addEventListener('input', () => { handle.set(Number(input.value), true); sync(); });
    syncers.push(() => { input.value = String(handle.value); fill(); });
    return el;
  };
  const soundPart = () => {
    if (ui.soundButton.hidden) return null;
    const b = btn('b-ico b-snd', shell.querySelector('.snd')?.innerHTML || 'Snd', 'Sound');
    b.addEventListener('click', () => { stim.sound.toggle(); sync(); });
    syncers.push(() => b.setAttribute('aria-pressed', String(stim.sound.on)));
    return b;
  };
  // A long choice steps one name at a time, so its row never overflows.
  const stepPart = (opts, get, set) => {
    const at = () => Math.max(0, opts.findIndex(o => String(o.value) === String(get())));
    const name = text('span', 'b-step-now', '');
    const arrow = (d, glyph, label) => {
      const b = btn('b-ico', glyph, label);
      b.addEventListener('click', () => { set(opts[(at() + d + opts.length) % opts.length].value); sync(); });
      return b;
    };
    syncers.push(() => { name.textContent = opts[at()].label; });
    return box('b-step', arrow(-1, '\u2039', 'Previous'), name, arrow(1, '\u203A', 'Next'));
  };
  const choiceRow = (opts, get, set) => (opts.length <= 4 && opts.reduce((n, o) => n + String(o.label).length, 0) <= 24
    ? segPart(opts, get, set) : stepPart(opts, get, set));
  const rowPart = row => {
    const handle = ui.setting(row.id);
    if (!handle) return null;
    if (row.type === 'slider') return rangePart(row.label, row, handle, 'b-row');
    const el = box('b-row', text('span', '', row.label));
    if (row.type === 'toggle') el.append(segPart([{ value: false, label: 'Off' }, { value: true, label: 'On' }], () => handle.value, v => handle.set(v, true)));
    else if (row.type === 'choice') el.append(choiceRow(row.options, () => handle.value, v => handle.set(v, true)));
    else if (row.type === 'button') {
      const b = btn('b-edge', row.text ?? 'Go');
      b.addEventListener('click', () => row.onClick?.());
      el.append(b);
    } else if (row.type === 'link') {
      const a = text('a', 'b-btn b-edge', row.text ?? 'Open');
      a.href = row.href;
      el.append(a);
    }
    return el;
  };
  // A new row group opens a labelled section, as in the shell.
  const addRows = (el, rows) => {
    let group;
    (rows || []).forEach(row => {
      const r = rowPart(row);
      if (!r) return;
      if (row.group && row.group !== group) el.append(text('div', 'b-group-hd', row.group));
      group = row.group;
      el.append(r);
    });
  };
  // The rows of Settings: the main slider on a narrow stage, toy rows, then Quality.
  const rowsPart = () => {
    const el = h('div', 'b-rows');
    if (spec.slider) el.append(rangePart(spec.slider.label, spec.slider, ui.slider, 'b-row b-row--main'));
    addRows(el, spec.settings);
    if (spec.quality) el.append(box('b-row', text('span', '', 'Quality'),
      segPart([{ value: 'standard', label: 'Standard' }, { value: 'high', label: 'High' }], stim.quality, stim.setQuality)));
    return el;
  };
  const resetPart = done => {
    if (!spec.reset) return null;
    const b = btn('b-edge', 'Reset');
    b.addEventListener('click', () => { spec.reset(); sync(); done?.(); });
    return box('b-ft', b);
  };
  // Keycap, then verb; keyboard keys leave on a touch screen.
  const hintsPart = (fading = true) => {
    if (!spec.keys?.length) return null;
    const el = h('dl', fading ? 'b-hints' : 'b-hints b-hints--list');
    spec.keys.forEach(([word, verb]) => {
      if (touch() && !stim.onTouch(word)) return;
      el.append(box('', text('kbd', '', stim.keyWord(word, touch())), text('span', '', verb)));
    });
    return el;
  };
  // The strip fades after 8 s or three gestures; the info button brings it back.
  const showHints = on => {
    if (!hints) return;
    hints.classList.toggle('is-faded', !on);
    clearTimeout(hintTimer);
    gestures = 0;
    if (on && !stayHints) hintTimer = setTimeout(() => showHints(false), 8000);
  };

  /* ---------- the shared set of parts for one draw ---------- */
  const build = () => {
    const P = { id: idPart(), snd: soundPart(), acts: actionParts() };
    P.slider = spec.slider ? rangePart(spec.slider.label, spec.slider, ui.slider, 'b-main') : null;
    if (hasChoice) {
      // Four options or fewer show in a row; a narrow stage folds them into the list.
      P.seg = options.length <= 4 ? segPart(options, () => ui.choice.value, pick, 'b-wide') : null;
      P.pick = btn(P.seg ? 'b-pick b-narrow' : 'b-pick', '', spec.choice.label);
      P.pickPop = popPart('b-pop--pick', spec.choice.label || 'Pick', P.pick);
      P.pickPop.el.append(gridPart(() => P.pickPop.open(false)));
      let last;
      syncers.push(() => { const o = cur(); if (o === last) return; last = o; P.pick.innerHTML = optHTML(o) + CARET; });
    }
    const rows = !!(spec.settings?.length || spec.quality || spec.reset);
    if (rows || spec.slider) {
      // With no rows of its own, Settings shows only where it holds the slider.
      P.set = btn(rows ? 'b-ico b-set' : 'b-ico b-set b-narrow', shell.querySelector('.s2-set')?.innerHTML || 'Set', 'Settings');
      P.setPop = popPart('b-pop--set', 'Settings', P.set);
      P.setPop.el.append(rowsPart(), resetPart(() => P.setPop.open(false)) || '');
    }
    // Dev rows show only with the lab's Dev switch, as ?dev does on a toy page.
    if (spec.dev?.length && host?.dataset.dev === '1') {
      P.dev = btn('b-ico b-dev', DEV_SVG, 'Dev');
      P.devPop = popPart('b-pop--set b-pop--dev', 'Dev', P.dev);
      const rows = h('div', 'b-rows');
      addRows(rows, spec.dev);
      P.devPop.el.append(rows);
    }
    hints = hintsPart();
    if (hints) {
      P.info = btn('b-ico b-info', 'i', 'How to play');
      P.info.addEventListener('click', () => showHints(hints.classList.contains('is-faded')));
    }
    return P;
  };

  /* ---------- directions ---------- */
  // Bare: the name on top, play at the bottom, in every size.
  const corners = P => {
    const tr = box('b-tr', P.snd, P.set, P.dev, P.info), bl = box('b-bl', P.seg, P.pick, P.acts), br = box('b-br', P.slider);
    layer.append(...[P.id, tr, bl, br, hints, P.pickPop?.el, P.setPop?.el, P.devPop?.el].filter(Boolean));
  };
  // Signal: one bar with no boxes, in the intro's beats (Tom's ingredients, 2026-11-16).
  // The bar is one object: a white flash box lands, parts down the middle and leaves bare words.
  // White is the flash, a thing that happens now; the toy's ink is a state that holds.
  // The bar stays while you play; it leaves after 8 s with no input and returns on the next one.
  const signal = P => {
    const grp = (cls, ...kids) => { const k = kids.flat().filter(Boolean); return k.length ? box(`sg-grp ${cls}`.trim(), k) : null; };
    const flash = h('i', 'sg-box'), tint = h('i', 'sg-tint');
    if (P.info) P.info.innerHTML = INFO_SVG;
    const bar = box('sg-bar', grp('', P.seg, P.pick, P.acts), grp('b-main', P.slider), grp('', P.snd, P.set, P.dev, P.info), flash, tint);
    const glass = h('div', 'sg-glass');
    const sheets = [P.pickPop, P.setPop, P.devPop].filter(Boolean);
    sheets.forEach(sh => sh.el.append(h('i', 'sg-box sg-box--sheet'), h('i', 'sg-tint sg-tint--sheet')));
    layer.append(...[P.id, glass, hints, bar, ...sheets.map(sh => sh.el)].filter(Boolean));
    // The lab's Wordmark accent gives each control its own letter hue; a sheet takes its button's.
    if (host?.dataset.accent === 'mark') {
      [...bar.querySelectorAll('.b-btn, .b-slider')].forEach((el, i) => setAcc(el, `oklch(${HUES[i % HUES.length]})`));
      sheets.forEach(sh => setAcc(sh.el, sh.anchor.style.getPropertyValue('--acc')));
    }
    // Presence: 'idle' leaves after 8 s with no input, 'stay' never leaves, 'touch' leaves on a press.
    const mode = host?.dataset.presence || 'idle';
    stayHints = mode !== 'touch';
    let shown = false, downs = 0, backTimer = 0, idleTimer = 0, wanted = true;
    // One frame of the bar: its box, its size and whether it shows.
    const set = ({ split = 50, sx = 1, sy = 1, off = false }) => {
      flash.style.setProperty('--sg-split', `${split}%`);
      tint.style.setProperty('--sg-split', `${split}%`);
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
    // The key strip is part of the bar: it comes and goes with it, unless (i) put it away.
    const rest = () => { set({}); if (wanted && !open) showHints(true); return true; };
    // The first arrival is the intro's beat: the flash fills, snaps to size, holds, then parts.
    const arrive = async first => {
      shown = true;
      if (RM.matches) return rest();
      const land = first
        ? [[{ split: 0, sx: 1.3, sy: 1.3 }, 2], [{ split: 0, sx: 0.95, sy: 0.95 }], [{ split: 0, sx: 1.03, sy: 1.03 }], [{ split: 0 }, 3]]
        : [[{ split: 0, sy: 0.08 }], [{ split: 0 }]];
      if (!await seq([...land, [{ split: 14 }], [{ split: 32 }]])) return false;
      return rest();
    };
    // The exit is the intro's wipe: the box drops to a line, then the line closes.
    const leave = async () => {
      shown = false;
      showHints(false);
      if (RM.matches) return set({ off: true });
      if (await seq([[{ split: 0, sy: 0.3 }], [{ split: 0, sy: 0.08 }], [{ split: 0, sx: 0.4, sy: 0.08 }]])) set({ off: true });
    };
    // The bar never leaves under the pointer, under focus, or with a sheet open.
    const busy = () => !!open || downs > 0 || bar.matches(':hover') || bar.contains(document.activeElement);
    const arm = () => {
      clearTimeout(idleTimer);
      if (mode !== 'idle') return;
      idleTimer = setTimeout(() => { if (busy()) return arm(); if (shown) leave(); }, 8000 * slow());
    };
    presence = {
      down() { downs++; if (mode !== 'touch') return presence.poke(); clearTimeout(backTimer); if (shown) leave(); },
      up() { downs = Math.max(0, downs - 1); if (mode !== 'touch') return presence.poke(); if (!downs) presence.back(600); },
      back(ms) { clearTimeout(backTimer); backTimer = setTimeout(() => { if (!downs && !shown) arrive(false); }, ms * slow()); },
      // Any input brings the bar back and starts the 8 s again.
      poke() { if (mode === 'touch') return; if (!shown) arrive(false); arm(); },
      wake() { clearTimeout(backTimer); if (!shown) arrive(false); arm(); },
      stop() { clearTimeout(backTimer); clearTimeout(idleTimer); },
    };
    P.info?.addEventListener('click', () => { wanted = !hints.classList.contains('is-faded'); });
    // A pick cuts in: the word's box lands oversize for one frame, holds at size, then parts.
    const cut = async el => {
      if (RM.matches || !el) return;
      el.classList.add('is-cut');
      el.style.setProperty('--sg-split', '0%');
      el.style.setProperty('--sg-k', '1.3');
      await fr();
      el.style.setProperty('--sg-k', '1');
      await fr(2);
      el.style.removeProperty('--sg-split');
      el.style.removeProperty('--sg-k');
      el.classList.remove('is-cut');
    };
    // Interactions (emil-design-eng, gestures).
    // Feedback belongs to the press: the box lands oversize on pointer down, in the first frame.
    // It holds at size while the pointer is down and parts on release.
    // A key press shows no box: its result is there at once.
    let held = null;
    const release = () => { if (!held) return; held.classList.remove('is-cut'); held.style.removeProperty('--sg-k'); held = null; };
    const press = async e => {
      const b = e.target.closest('.b-btn');
      if (!b || e.button > 0 || b.matches('[aria-pressed="true"]:not(.b-snd)')) return;
      release();
      held = b;
      b.classList.add('is-cut');
      if (RM.matches) return;
      b.style.setProperty('--sg-k', '1.25');
      await fr();
      if (held === b) b.style.removeProperty('--sg-k');
    };
    [bar, ...sheets.map(sh => sh.el)].forEach(el => el.addEventListener('pointerdown', press));
    for (const t of ['pointerup', 'pointercancel', 'blur']) addEventListener(t, release, true);
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
      hints?.classList.add('is-under');
    };
    const hideTip = () => { clearTimeout(tipTimer); if (!tip.hidden) tipAt = performance.now(); tip.hidden = true; hints?.classList.remove('is-under'); };
    bar.querySelectorAll('.b-ico').forEach(b => {
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
    // A picked row holds two frames in the toy's ink, then its list leaves.
    pickBeat = async () => { await fr(2); };
    pickDone = () => cut(P.pick);
    // A sheet is one object too: its box lands from the bar up and parts over its rows.
    // It grows from its own button; on the way out it drops to a line.
    popHook = async (api, on) => {
      const el = api.el, box = el.querySelector('.sg-box--sheet'), tnt = el.querySelector('.sg-tint--sheet');
      const me = el._run = (el._run || 0) + 1;
      const frame = (split, sy) => {
        box.style.setProperty('--sg-split', `${split}%`);
        tnt.style.setProperty('--sg-split', `${split}%`);
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
        if (RM.matches) return frame(50, 1);
        for (const [split, sy] of [[0, 0.06], [0, 1], [0, 1], [16, 1], [34, 1]]) {
          if (me !== el._run) return;
          frame(split, sy);
          await fr();
        }
        if (me === el._run) frame(50, 1);
        return;
      }
      // The strip returns when its sheet has gone.
      if (wanted && shown) showHints(true);
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
    // The strip and the sheets stand on the bar, however many rows it takes.
    relayout = () => {
      bar.classList.remove('is-wrapped');
      bar.classList.toggle('is-wrapped', bar.offsetHeight > 1.5 * bar.firstElementChild.offsetHeight);
      layer.style.setProperty('--barh', `${bar.offsetHeight}px`);
    };
    relayout();
    document.fonts?.ready.then(() => relayout?.());
    set({ off: true });
    arrive(true).then(ok => { if (ok) arm(); });
  };

  // The name shows whole or not at all; the top right corner sets its room.
  const fitName = () => {
    const idEl = layer.querySelector('.b-id'), tr = layer.querySelector('.b-tr');
    if (!idEl) return;
    idEl.classList.remove('is-tight');
    const room = layer.clientWidth - 24 - (tr ? tr.getBoundingClientRect().width + 12 : 0);
    idEl.classList.toggle('is-tight', idEl.scrollWidth > room);
  };
  const draw = () => {
    const c = host?.dataset.concept || 'signal';
    clearTimeout(hintTimer);
    syncers = [];
    open = null;
    hints = null;
    relayout = null;
    popHook = null;
    pickBeat = null;
    pickDone = null;
    presence?.stop();
    presence = null;
    run++;
    layer.replaceChildren();
    layer.removeAttribute('data-open');
    layer.dataset.concept = c;
    document.documentElement.classList.toggle('bl-on', c !== 'today');
    document.documentElement.classList.toggle('bl-touch', touch());
    // The lab picks the accent's source and where the ink goes.
    const src = host?.dataset.accent || 'toy';
    setAcc(layer, src === 'white' || src === 'mark' ? null : src === 'series' ? (series?.[toy.series]?.color || toy.accent) : src[0] === '#' ? src : toy.accent);
    layer.dataset.ink = host?.dataset.ink || 'marks';
    stayHints = false;
    if (c === 'today') return;
    const P = build();
    (c === 'signal' ? signal : corners)(P);
    sync();
    fitName();
    if (c === 'signal') hints?.classList.add('is-faded'); else showHints(true);
  };

  // A press on the stage closes any open sheet and counts as a gesture.
  stage.addEventListener('pointerdown', () => {
    presence?.down();
    open?.open(false);
    if (!stayHints && hints && !hints.classList.contains('is-faded') && ++gestures >= 3) showHints(false);
  });
  addEventListener('keydown', e => { if (e.key === 'Escape') open?.open(false); });
  // The bar returns when every pointer is up, or at once for the keyboard.
  for (const t of ['pointerup', 'pointercancel']) addEventListener(t, () => presence?.up(), true);
  stage.addEventListener('wheel', () => { if (!presence) return; presence.down(); presence.up(); }, { passive: true });
  addEventListener('keydown', () => presence?.wake());
  // Any pointer move counts as input for the 8 s rule.
  for (const t of ['pointermove', 'touchstart']) addEventListener(t, () => presence?.poke(), { passive: true, capture: true });
  // Keys and the toy itself can change a value; the lab layer follows.
  addEventListener('keyup', sync);
  setInterval(sync, 500);
  addEventListener('barlab', draw);
  new ResizeObserver(() => { relayout?.(); fitName(); }).observe(frame);
  document.fonts?.ready.then(fitName);
  globalThis.__stimToys?.then(toys => { if (toys?.[id]) { toy = toys[id]; draw(); } });
  fetch(new URL('../series.json', import.meta.url)).then(r => r.json()).then(j => { series = j; if (host?.dataset.accent === 'series') draw(); }).catch(() => {});
  draw();
}
