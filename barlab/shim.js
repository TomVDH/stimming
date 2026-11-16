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
const CARET = '<i class="b-caret" aria-hidden="true"></i>';
// Askew gives each block its own tilt, as the wordmark does for its letters.
const TILTS = [-2, 1.5, -1, 2.5, -1.5, 1, -2.5, 2];

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
const optHTML = o => `${o.icon || ''}<span>${o.label}</span>`;
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
    const all = options.map(o => {
      const b = btn('b-opt', `${optHTML(o)}${o.key ? `<kbd>${o.key}</kbd>` : ''}`);
      b.addEventListener('click', () => { pick(o.value); done?.(); });
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
      el,
      get isOpen() { return !el.hidden; },
      open(on) {
        if (on && open && open !== api) open.open(false);
        el.hidden = !on;
        anchor.setAttribute('aria-expanded', String(on));
        if (on) open = api; else if (open === api) open = null;
        // An open sheet takes the strip's place.
        if (on) showHints(false);
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
  const rowPart = row => {
    const handle = ui.setting(row.id);
    if (!handle) return null;
    if (row.type === 'slider') return rangePart(row.label, row, handle, 'b-row');
    const el = box('b-row', text('span', '', row.label));
    if (row.type === 'toggle') el.append(segPart([{ value: false, label: 'Off' }, { value: true, label: 'On' }], () => handle.value, v => handle.set(v, true)));
    else if (row.type === 'choice') el.append(segPart(row.options, () => handle.value, v => handle.set(v, true)));
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
  // The rows of Settings: the main slider on a narrow stage, toy rows, then Quality.
  const rowsPart = () => {
    const el = h('div', 'b-rows');
    if (spec.slider) el.append(rangePart(spec.slider.label, spec.slider, ui.slider, 'b-row b-row--main'));
    (spec.settings || []).forEach(row => { const r = rowPart(row); if (r) el.append(r); });
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
    if (on) hintTimer = setTimeout(() => showHints(false), 8000);
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
      syncers.push(() => { P.pick.innerHTML = optHTML(cur()) + CARET; });
    }
    const rows = !!(spec.settings?.length || spec.quality || spec.reset);
    if (rows || spec.slider) {
      // With no rows of its own, Settings shows only where it holds the slider.
      P.set = btn(rows ? 'b-ico b-set' : 'b-ico b-set b-narrow', shell.querySelector('.s2-set')?.innerHTML || 'Set', 'Settings');
      P.setPop = popPart('b-pop--set', 'Settings', P.set);
      P.setPop.el.append(rowsPart(), resetPart(() => P.setPop.open(false)) || '');
    }
    hints = hintsPart();
    if (hints) {
      P.info = btn('b-ico b-info', 'i', 'How to play');
      P.info.addEventListener('click', () => showHints(hints.classList.contains('is-faded')));
    }
    return P;
  };

  /* ---------- directions ---------- */
  // Dock: one bar at the bottom centre holds every control.
  const dock = P => {
    const play = box('b-group b-play', P.seg, P.pick, P.acts, P.slider);
    const sys = box('b-group b-sys', P.snd, P.set, P.info);
    const bar = box('b-dock', play, sys);
    layer.append(...[P.id, hints, bar, P.pickPop?.el, P.setPop?.el].filter(Boolean));
    // On a narrow stage the dock keeps play; sound, Settings and (i) go top right.
    relayout = () => {
      const narrow = layer.clientWidth < 640;
      sys.className = narrow ? 'b-tr b-sys' : 'b-group b-sys';
      (narrow ? layer : bar).append(sys);
    };
    relayout();
  };
  // Bare and Askew: the name on top, play at the bottom, in every size.
  const corners = P => {
    const tr = box('b-tr', P.snd, P.set, P.info), bl = box('b-bl', P.seg, P.pick, P.acts), br = box('b-br', P.slider);
    layer.append(...[P.id, tr, bl, br, hints, P.pickPop?.el, P.setPop?.el].filter(Boolean));
    [...tr.children, ...bl.children, ...br.children].forEach((el, i) => el.style.setProperty('--tilt', `${TILTS[i % TILTS.length]}deg`));
  };
  // Tuck: one tab; the drawer behind it holds every control.
  const tuck = P => {
    const tab = btn('b-tab', '', 'Controls');
    syncers.push(() => { tab.innerHTML = (hasChoice ? optHTML(cur()) : '<span>Controls</span>') + CARET; });
    const body = h('div', 'b-body');
    const api = {
      get isOpen() { return layer.hasAttribute('data-open'); },
      open(on) {
        layer.toggleAttribute('data-open', on);
        tab.setAttribute('aria-expanded', String(on));
        body.inert = !on;
        open = on ? api : null;
        if (on) showHints(false);
      },
    };
    const sec = (title, ...kids) => box('b-sec', text('span', 'b-lab', title), kids);
    if (hasChoice) body.append(sec(spec.choice.label || 'Pick', gridPart(() => api.open(false))));
    if (P.acts.length) body.append(sec('Do', box('b-acts', P.acts)));
    const how = hintsPart(false);
    if (how) body.append(sec('How', how));
    const rows = rowsPart();
    if (rows.children.length) body.append(sec('Settings', rows));
    const ft = resetPart(() => api.open(false));
    if (ft) body.append(ft);
    tab.addEventListener('click', () => api.open(!api.isOpen));
    api.open(false);
    layer.append(...[P.id, box('b-tr', P.snd), hints, box('b-drawer', tab, body)].filter(Boolean));
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
    const c = host?.dataset.concept || 'dock';
    clearTimeout(hintTimer);
    syncers = [];
    open = null;
    hints = null;
    relayout = null;
    layer.replaceChildren();
    layer.removeAttribute('data-open');
    layer.dataset.concept = c;
    document.documentElement.classList.toggle('bl-on', c !== 'today');
    document.documentElement.classList.toggle('bl-touch', touch());
    // The toy's accent inks Askew; a gradient gives its first stop to line work.
    layer.style.setProperty('--acc', toy.accent || 'var(--fg)');
    layer.style.setProperty('--acc-ink', toy.accent?.match(/oklch\([^)]*\)/)?.[0] || 'var(--fg)');
    if (c === 'today') return;
    const P = build();
    (c === 'tuck' ? tuck : c === 'dock' ? dock : corners)(P);
    sync();
    fitName();
    showHints(true);
  };

  // A press on the stage closes any open sheet and counts as a gesture.
  stage.addEventListener('pointerdown', () => {
    open?.open(false);
    if (hints && !hints.classList.contains('is-faded') && ++gestures >= 3) showHints(false);
  });
  addEventListener('keydown', e => { if (e.key === 'Escape') open?.open(false); });
  // Keys and the toy itself can change a value; the lab layer follows.
  addEventListener('keyup', sync);
  setInterval(sync, 500);
  addEventListener('barlab', draw);
  new ResizeObserver(() => { relayout?.(); fitName(); }).observe(frame);
  document.fonts?.ready.then(fitName);
  globalThis.__stimToys?.then(toys => { if (toys?.[id]) { toy = toys[id]; draw(); } });
  draw();
}
