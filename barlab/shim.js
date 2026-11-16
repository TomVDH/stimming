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
// Drawn icons replace text glyphs; one stroke weight for the set.
const X_SVG = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>';
const INFO_SVG = '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.25"/><path d="M8 7.25V11.5"/><circle class="solid" cx="8" cy="4.9" r="0.9"/></svg>';
const DEV_SVG = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5.5 4.5 2 8l3.5 3.5M10.5 4.5 14 8l-3.5 3.5M9 3 7 13"/></svg>';
const CHEV_SVG = '<svg class="b-chev" viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 10 8 6.5l3.5 3.5"/></svg>';
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)');
// A keyboard pick never animates; the last key press marks it.
let keyAt = -1e9;
addEventListener('keydown', () => { keyAt = performance.now(); }, true);
addEventListener('pointerdown', () => { keyAt = -1e9; }, true);
const byKey = () => performance.now() - keyAt < 400;

// The wordmark's eight letter hues ink the controls, in order.
const HUES = ['0.8 0.15 62', '0.72 0.2 318', '0.8 0.12 195', '0.7 0.19 32', '0.72 0.14 255', '0.82 0.11 345', '0.86 0.15 100', '0.78 0.16 150'];

// A pick cuts in as the intro's flash box: oversize, then at size.
// It steps at 30 fps, as the intro does; a key pick does not flash.
const flash = el => {
  if (byKey() || REDUCED.matches || !el.animate) return;
  el.animate([
    { transform: 'scale(1.16)', filter: 'brightness(1.6)' },
    { transform: 'scale(0.98)', filter: 'none' },
    { transform: 'scale(1)' },
  ], { duration: 133, easing: 'steps(4, end)' });
};

// Each letter of a label rolls up; a fresh copy rolls in below it.
// The label keeps its plain text as its accessible name.
const roll = span => {
  const word = span.textContent;
  if (!word || span.dataset.rolled === word) return;
  // A label that holds an icon keeps its markup.
  if (span.children.length) return;
  span.dataset.rolled = word;
  span.setAttribute('aria-label', word);
  span.classList.add('b-roll');
  span.innerHTML = [...word].map((c, i) =>
    `<i aria-hidden="true" style="--i:${i}">${c === ' ' ? '&nbsp;' : c.replace(/[<&]/g, m => m === '<' ? '&lt;' : '&amp;')}</i>`).join('');
};

// GSAP 3.13 from the site's own pinned URL; the bar works without it.
let gsap = null;
import('https://cdn.jsdelivr.net/npm/gsap@3.13.0/+esm').then(m => { gsap = m.gsap || m.default; }).catch(() => {});
// A control leans to the mouse, and springs back on leave.
const magnet = (el, pull = 0.28) => {
  let to = null;
  el.addEventListener('pointermove', e => {
    if (!gsap || e.pointerType !== 'mouse' || REDUCED.matches) return;
    to ??= { x: gsap.quickTo(el, 'x', { duration: 0.35, ease: 'power3.out' }), y: gsap.quickTo(el, 'y', { duration: 0.35, ease: 'power3.out' }) };
    const r = el.getBoundingClientRect();
    to.x((e.clientX - r.left - r.width / 2) * pull);
    to.y((e.clientY - r.top - r.height / 2) * pull);
  });
  el.addEventListener('pointerleave', () => {
    if (gsap) gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.45)', overwrite: true });
    to = null;
  });
};

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
  const concept = () => host?.dataset.concept || 'standard';
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
      b.addEventListener('click', () => { const was = get(); set(o.value); sync(); if (was !== o.value) flash(b); });
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
      b.addEventListener('click', () => { pick(o.value); flash(b); done?.(); });
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
    let leave = 0;
    const x = btn('b-ico b-x', X_SVG, 'Close');
    el.append(box('b-pop-hd', text('span', '', title), x));
    const api = {
      el,
      get isOpen() { return !el.hidden && !el.classList.contains('is-leaving'); },
      open(on) {
        if (on && open && open !== api) open.open(false);
        clearTimeout(leave);
        el.classList.remove('is-leaving');
        if (on) {
          el.hidden = false;
          // The sheet wipes open from the edge next to its button.
          // It steps, as the intro's boxes do.
          if (!REDUCED.matches && el.animate) {
            const up = el.classList.contains('b-pop--pick');
            el.animate([{ clipPath: up ? 'inset(100% 0 0 0)' : 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0 0)' }],
              { duration: 167, easing: 'steps(5, end)' });
            [...el.querySelectorAll('.b-row, .b-opt, .b-ft')].forEach((r, i) =>
              r.animate([{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }],
                { duration: 100, delay: 90 + i * 33, easing: 'steps(3, end)', fill: 'backwards' }));
          }
        } else if (!el.hidden) {
          // Exit runs faster than entry, then the sheet leaves the tree.
          el.classList.add('is-leaving');
          leave = setTimeout(() => { el.hidden = true; el.classList.remove('is-leaving'); }, REDUCED.matches ? 0 : 150);
        }
        anchor.setAttribute('aria-expanded', String(on));
        if (on) open = api; else if (open === api) open = null;
        // An open sheet takes the strip's place.
        if (on) { showHints(false); requestAnimationFrame(sync); }
      },
    };
    anchor.setAttribute('aria-expanded', 'false');
    anchor.addEventListener('click', () => api.open(!api.isOpen));
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
      let shown = null;
      syncers.push(() => {
        // The label changes only with the pick, so its roll survives a sync.
        if (shown === cur()) return;
        shown = cur();
        P.pick.innerHTML = optHTML(shown) + (concept() === 'standard' ? CHEV_SVG : CARET);
        P.pick.querySelectorAll(':scope > span').forEach(roll);
      });
    }
    const rows = !!(spec.settings?.length || spec.quality || spec.reset);
    if (rows || spec.slider) {
      // With no rows of its own, Settings shows only where it holds the slider.
      P.set = btn(rows ? 'b-ico b-set' : 'b-ico b-set b-narrow', shell.querySelector('.s2-set')?.innerHTML || 'Set', 'Settings');
      P.setPop = popPart('b-pop--set', 'Settings', P.set);
      P.setPop.el.append(rowsPart(), resetPart(() => P.setPop.open(false)) || '');
    }
    // The lab shows Dev only with ?dev on its own address, as the shell does.
    if (spec.dev?.length && host?.dataset.dev === '1') {
      P.dev = btn('b-ico b-dev', DEV_SVG, 'Dev');
      P.devPop = popPart('b-pop--set', 'Dev', P.dev);
      const rows = h('div', 'b-rows');
      spec.dev.forEach(row => { const r = rowPart(row); if (r) rows.append(r); });
      P.devPop.el.append(rows);
    }
    hints = hintsPart();
    if (hints) {
      P.info = btn('b-ico b-info', INFO_SVG, 'How to play');
      P.info.addEventListener('click', () => showHints(hints.classList.contains('is-faded')));
    }
    return P;
  };

  /* ---------- directions ---------- */
  // Icon buttons name themselves after a pause.
  // Once one tip shows, its neighbours show at once.
  const tips = barEl => {
    let warm = 0;
    barEl.querySelectorAll('.b-ico').forEach(b => {
      const t = text('span', 'b-tip', b.getAttribute('aria-label') || '');
      t.setAttribute('aria-hidden', 'true');
      b.append(t);
      b.addEventListener('pointerenter', e => {
        if (e.pointerType !== 'mouse') return;
        b.classList.toggle('tip-now', !!barEl.dataset.warm);
        clearTimeout(warm);
        warm = setTimeout(() => { barEl.dataset.warm = '1'; }, 500);
      });
      b.addEventListener('pointerleave', () => {
        clearTimeout(warm);
        warm = setTimeout(() => { delete barEl.dataset.warm; }, 300);
      });
    });
  };

  // Standard: the name top left, system bar top right, play bars below.
  // Every bar is the same part: one surface, one height, one radius.
  const standard = P => {
    const bar = (cls, ...kids) => {
      const el = box(`s-bar ${cls}`, ...kids.flat());
      return el.children.length ? el : null;
    };
    const sys = bar('s-sys', P.snd, P.set, P.dev, P.info);
    if (sys) tips(sys);
    const play = bar('s-play', P.seg, P.pick, P.acts);
    const tune = bar('s-tune', P.slider);
    layer.append(...[P.id, sys, hints, play, tune, P.pickPop?.el, P.setPop?.el, P.devPop?.el].filter(Boolean));
    // Labels roll; each control takes the next wordmark hue.
    layer.querySelectorAll('.b-btn > span:not(.b-tip), .b-slider > span').forEach(roll);
    [...layer.querySelectorAll('.s-bar .b-btn, .s-bar .b-slider')].forEach((el, i) => el.style.setProperty('--hue', `oklch(${HUES[i % HUES.length]})`));
    layer.querySelectorAll('.b-pop .b-btn, .b-pop .b-slider').forEach((el, i) => el.style.setProperty('--hue', `oklch(${HUES[(i + 3) % HUES.length]})`));
    layer.querySelectorAll('.s-sys .b-ico, .s-play .b-act').forEach(el => magnet(el, el.classList.contains('b-ico') ? 0.32 : 0.18));
    // The shell measures: two bars that cannot share the row fold into one.
    relayout = () => {
      layer.classList.remove('is-narrow');
      const room = layer.clientWidth - 36;
      const need = (play?.offsetWidth || 0) + (tune?.offsetWidth || 0) + (play && tune ? 24 : 0);
      layer.classList.toggle('is-narrow', layer.clientWidth < 640 || need > room);
      requestAnimationFrame(sync);
    };
    relayout();
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
    const c = concept();
    clearTimeout(hintTimer);
    syncers = [];
    open = null;
    hints = null;
    relayout = null;
    layer.replaceChildren();
    layer.removeAttribute('data-open');
    layer.classList.remove('is-narrow');
    layer.dataset.concept = c;
    document.documentElement.classList.toggle('bl-on', c !== 'today');
    document.documentElement.classList.toggle('bl-touch', touch());
    if (c === 'today') return;
    const P = build();
    standard(P);
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
