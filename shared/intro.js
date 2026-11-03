// Stimming intro: emblem in a flash box, the name unfurls, hold until ready, clear.
// Toy pages import it as '../shared/intro.js'. No dependencies.
// The root toys.json holds each toy's name, subtitle, emblem and Dutch name.
// The page's own intro text stays when toys.json cannot load.

const TOYS = new URL('../toys.json', import.meta.url);
// The toy's folder name, read from the page address.
function toyId(path = location.pathname) {
  const parts = path.split('/').filter(Boolean);
  if (parts.length && parts[parts.length - 1].endsWith('.html')) parts.pop();
  return parts[parts.length - 1] || '';
}
// One short fetch; a slow or missing file gives null.
async function entry(id = toyId()) {
  try {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 400);
    const res = await fetch(TOYS, { signal: ctl.signal });
    clearTimeout(t);
    return res.ok ? (await res.json())[id] || null : null;
  } catch (err) {
    return null;
  }
}

const RM = matchMedia('(prefers-reduced-motion: reduce)');

/* ---------- 30 fps timing ---------- */
// Every transition steps at 30 fps.
const FPS = 30;
const frames = ms => Math.max(1, Math.round((ms / 1000) * FPS));
const wait = n => new Promise(r => setTimeout(r, (n * 1000) / FPS));

// A CSS cubic-bezier as a function of progress.
const bezier = (x1, y1, x2, y2) => t => {
  const at = (a, b, s) => 3 * a * s * (1 - s) ** 2 + 3 * b * s * s * (1 - s) + s ** 3;
  let lo = 0, hi = 1, s = t;
  for (let i = 0; i < 20; i++) {
    s = (lo + hi) / 2;
    if (at(x1, x2, s) < t) lo = s; else hi = s;
  }
  return at(y1, y2, s);
};
const linear = t => t;
const accel = bezier(0.7, 0, 0.84, 0);
const settle = bezier(0.16, 1, 0.3, 1);

// frame(p) gives the style at eased progress p; one keyframe per film frame.
const play = (el, frame, ms, ease = linear) => {
  const n = frames(ms);
  const keys = Array.from({ length: n + 1 }, (_, k) => ({ ...frame(ease(k / n)), offset: k / n }));
  return el.animate(keys, { duration: (n * 1000) / FPS, easing: `steps(${n}, jump-end)`, fill: 'forwards' }).finished;
};

// Every beat of the intro, in frames at 30 fps or in milliseconds.
// The intro lab at /introlab/ edits a copy of this table live.
export const TIMING = {
  lead: 3,      // frames of glass before the flash
  pop: 2,       // frames the flash fills the eye
  popScale: 3.4, // how far the blown-up flash fills the eye
  flash: 13,    // frames the box holds at size after the pop
  unfurl: 333,  // ms each line takes to open
  nlLag: 2,     // frames between the name and the Dutch line
  subLag: 4,    // frames before the subtitle opens
  tagLag: 4,    // frames from the subtitle to the motto
  tagNlLag: 4,  // frames from the motto to its Dutch line
  sndLag: 4,    // frames from the line above to the sound notice
  hold: 2300,   // ms from the start before the intro may clear
  wipe: 333,    // ms the column wipes off
  fade: 500,    // ms the glass fades away
};

// The sound notice for toys with sound: off until Tom picks a form.
// glyph and words make a quiet last line under the titles; nudge pulses the speaker.
export const SOUND_NOTE = { glyph: false, words: null, nudge: false };

// Intro varieties for the lab. Classic is the shipped intro and stays as it is.
// Each variety may change the timing, how lines open, the flash and the exit.
// read: [base ms, ms per motto character, cap ms] of reading time after the lines.
export const VARIETIES = {
  classic: { label: 'Classic' },
  snap: {
    label: 'Snap: tight and punchy',
    timing: { lead: 2, pop: 2, flash: 9, unfurl: 240, nlLag: 3, subLag: 3, tagLag: 3, tagNlLag: 3, sndLag: 3, wipe: 250, fade: 380 },
    read: [350, 12, 1300],
  },
  type: {
    label: 'Type: lines are typed, then erased',
    timing: { lead: 3, pop: 2, flash: 10, nlLag: 2, subLag: 2, tagLag: 2, tagNlLag: 2, sndLag: 2, wipe: 260, fade: 420 },
    reveal: 'type', exit: 'erase', read: [400, 12, 1300],
  },
  lift: {
    label: 'Lift: lines rise in, then sink away',
    timing: { lead: 3, pop: 2, flash: 11, unfurl: 300, nlLag: 3, subLag: 3, tagLag: 3, tagNlLag: 3, sndLag: 3, wipe: 280, fade: 450 },
    reveal: 'lift', exit: 'drop', read: [400, 12, 1300],
  },
  strobe: {
    label: 'Strobe: the box blinks, lines cut in hard',
    timing: { lead: 2, pop: 2, flash: 8, nlLag: 4, subLag: 4, tagLag: 4, tagNlLag: 4, sndLag: 4, fade: 300 },
    flash: 'strobe', reveal: 'cut', exit: 'cut', read: [450, 12, 1300],
  },
  shutter: {
    label: 'Shutter: slits open, a tube switches off',
    timing: { lead: 3, pop: 2, flash: 11, unfurl: 280, nlLag: 3, subLag: 3, tagLag: 3, tagNlLag: 3, sndLag: 3, wipe: 300, fade: 380 },
    reveal: 'slit', exit: 'crt', read: [400, 12, 1300],
  },
};

// The phases the intro lab can pause on, in order.
export const PHASES = ['glass', 'pop', 'flash', 'lines', 'hold', 'wipe'];

// ready is a promise; the intro holds at least T.hold ms before it clears.
// id, done and gate let the intro lab play any toy; pages leave them out.
// gate(phase) is awaited as each phase shows, so the lab can pause there.
export async function intro({ ready = Promise.resolve(), min, timing = {}, id, done, gate = () => {}, soundNote = SOUND_NOTE, variety = 'classic' } = {}) {
  const root = document.querySelector('.intro');
  if (!root) return;
  const V = VARIETIES[variety] || VARIETIES.classic;
  const T = { ...TIMING, ...(V.timing || {}), ...timing };
  root.classList.add('is-live');
  const text = root.querySelector('.intro-text');
  const held = Promise.all([ready, wait(frames(min ?? T.hold))]);
  const info = await entry(id), nameEl = text.querySelector('.intro-name');
  let nl = null;
  if (info && nameEl) {
    nameEl.textContent = info.name;
    let subEl = text.querySelector('.intro-sub');
    if (subEl && info.sub) subEl.textContent = info.sub;
    // A numbered toy shows its number in the flash box, not in a subtitle.
    if (subEl && !info.sub) { subEl.remove(); subEl = null; }
    let emb = text.querySelector('.intro-emblem');
    if (info.emblem && !emb) {
      emb = document.createElement('span');
      emb.className = 'intro-emblem';
      nameEl.before(emb);
    }
    if (info.emblem) emb.style.setProperty('--emblem', `url(${new URL(info.emblem, TOYS).href})`);
    // The motto and its Dutch line follow the subtitle.
    const after = subEl || nameEl, hasTag = !!text.querySelector('.intro-tag');
    if (info.tagNl && !hasTag) after.after(Object.assign(document.createElement('span'), { className: 'intro-tag intro-tag--nl', lang: 'nl', textContent: info.tagNl }));
    if (info.tag && !hasTag) after.after(Object.assign(document.createElement('span'), { className: 'intro-tag', lang: 'en', textContent: info.tag }));
    // The Dutch name and its IPA sit under the English name.
    if (info.nl) {
      nl = document.createElement('span');
      nl.className = 'intro-nl';
      nl.innerHTML = `${info.nl} <span class="ipa">/${info.ipa}/</span>`;
      nameEl.after(nl);
    }
  }

  if (RM.matches) {
    // Reduced motion: no flash, the name fades in and out.
    await play(text, p => ({ opacity: p }), 300);
    await held;
    await play(root, p => ({ opacity: 1 - p }), 300);
    root.remove();
    return;
  }

  const emblem = text.querySelector('.intro-emblem'), name = text.querySelector('.intro-name');
  const sub = text.querySelector('.intro-sub');
  // The emblem sits in a badge whose white box is the flash.
  let badge = null;
  if (emblem) {
    badge = document.createElement('span');
    badge.className = 'intro-badge';
    emblem.before(badge);
    badge.append(emblem);
    if (info?.number) badge.dataset.num = `#${info.number}`;
  }
  // A toy with sound ends its titles with a quiet headphones line.
  let snd = null;
  if (info?.sound && (soundNote.glyph || soundNote.words)) {
    snd = document.createElement('span');
    snd.className = 'intro-snd';
    const icon = soundNote.glyph ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 15v-3a8 8 0 0 1 16 0v3" fill="none" stroke="currentColor" stroke-width="2.6"/><rect x="2.5" y="13.5" width="5" height="8" rx="1.2" fill="currentColor"/><rect x="16.5" y="13.5" width="5" height="8" rx="1.2" fill="currentColor"/></svg>' : '';
    snd.innerHTML = icon + (soundNote.words ? `<span>${soundNote.words}</span>` : '');
    text.append(snd);
    snd.style.clipPath = 'inset(0 50% 0 50%)';
  }
  // A toy Tom signs off shows a tick cut into the box at size.
  const big = badge || name;
  let tick = null;
  if (done ?? 'done' in root.dataset) {
    tick = document.createElement('span');
    tick.className = 'intro-tick';
    tick.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 12.5l5.5 5.5L20.5 6" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="square"/></svg>';
    big.append(tick);
  }
  // Each line starts closed in the variety's own way, then opens on its beat.
  const lines = [badge ? name : null, nl, sub,
    text.querySelector('.intro-tag:not(.intro-tag--nl)'), text.querySelector('.intro-tag--nl'), snd];
  const lags = [0, T.nlLag, T.subLag, T.tagLag, T.tagNlLag, T.sndLag];
  const shut = { unfurl: 'inset(0 50% 0 50%)', type: 'inset(0 100% 0 0)', lift: 'inset(0 0 100% 0)', cut: 'inset(0 0 100% 0)', slit: 'inset(50% 0 50% 0)' };
  const how = V.reveal || 'unfurl';
  lines.forEach(el => { if (el) el.style.clipPath = shut[how]; });
  if (how === 'lift') lines.forEach(el => { if (el) el.style.transform = 'translateY(0.6em)'; });
  const open = el => {
    if (how === 'type') {
      // Typing steps one frame per character, up to two thirds of a second.
      const n = Math.min(20, Math.max(4, el.textContent.length));
      return play(el, p => ({ clipPath: `inset(0 ${(100 * (1 - p)).toFixed(2)}% 0 0)` }), (n * 1000) / FPS);
    }
    if (how === 'lift') return play(el, p => ({ clipPath: `inset(0 0 ${(100 * (1 - p)).toFixed(2)}% 0)`, transform: `translateY(${(0.6 * (1 - p)).toFixed(3)}em)` }), T.unfurl, settle);
    if (how === 'slit') return play(el, p => ({ clipPath: `inset(${(50 * (1 - p)).toFixed(2)}% 0 ${(50 * (1 - p)).toFixed(2)}% 0)` }), T.unfurl, settle);
    if (how === 'cut') {
      // A hard cut: the line appears inverted for one frame, then settles.
      el.style.clipPath = 'none';
      el.style.background = '#fff';
      el.style.color = 'var(--intro-bg)';
      return wait(1).then(() => { el.style.background = ''; el.style.color = ''; });
    }
    return play(el, p => ({ clipPath: `inset(0 ${(50 * (1 - p)).toFixed(2)}% 0 ${(50 * (1 - p)).toFixed(2)}%)` }), T.unfurl, settle);
  };
  const box = on => {
    if (badge) { badge.classList.toggle('is-flash', on); badge.style.setProperty('--box', on ? 1 : 0); } else name.classList.toggle('is-flash', on);
  };

  // The box flashes on and holds.
  await wait(T.lead);
  await gate('glass');
  if (V.flash === 'strobe') {
    // Strobe: two short blinks before the box lands.
    for (let k = 0; k < 2; k++) { box(true); text.style.opacity = 1; await wait(1); box(false); await wait(1); }
  }
  box(true);
  // For a few frames the flash fills the eye, then it snaps to its place.
  big.style.transform = `scale(${T.popScale})`;
  text.style.opacity = 1;
  await wait(T.pop);
  await gate('pop');
  big.style.transform = '';
  if (tick) tick.style.opacity = 1;
  await wait(T.flash);
  await gate('flash');
  // The box cuts out; the emblem stays, white, and the lines open beneath it.
  if (tick) tick.remove();
  box(false);
  // Each line opens a beat after the one above; the last one is awaited.
  let last = null, first = true;
  for (let k = 0; k < lines.length; k++) {
    if (!lines[k]) continue;
    if (!first) await wait(lags[k]);
    first = false;
    last = open(lines[k]);
  }
  await last;
  await gate('lines');

  // Classic holds to a fixed time; the others hold for reading time.
  if (V.read) {
    const chars = [info?.tag, info?.tagNl].join('').length, [base, per, cap] = V.read;
    await Promise.all([ready, wait(frames(Math.min(cap, base + per * chars)))]);
  } else await held;
  await gate('hold');

  // Each variety leaves its own way, then the glass fades away whole.
  const shown = lines.filter(Boolean).reverse();
  const exit = V.exit || 'wipe';
  if (exit === 'wipe') await play(text, p => ({ clipPath: `inset(0 0 0 ${(p * 100).toFixed(2)}%)` }), T.wipe, accel);
  if (exit === 'erase') {
    // Lines erase right to left, bottom first, a frame apart.
    let end = null;
    for (const el of [...shown, badge].filter(Boolean)) { end = play(el, p => ({ clipPath: `inset(0 ${(100 * p).toFixed(2)}% 0 0)` }), T.wipe, accel); await wait(1); }
    await end;
  }
  if (exit === 'drop') {
    let end = null;
    for (const el of [...shown, badge].filter(Boolean)) {
      end = play(el, p => ({ clipPath: `inset(${(100 * p).toFixed(2)}% 0 0 0)`, transform: `translateY(${(0.6 * p).toFixed(3)}em)` }), T.wipe, accel);
      await wait(1);
    }
    await end;
  }
  if (exit === 'cut') { box(true); await wait(1); text.style.opacity = 0; }
  if (exit === 'crt') {
    // The column collapses to a line, then the line shrinks to a dot.
    text.style.transformOrigin = '50% 50%';
    await play(text, p => ({ transform: `scaleY(${Math.max(0.01, 1 - p).toFixed(3)})` }), T.wipe * 0.6, accel);
    await play(text, p => ({ transform: `scale(${(1 - p).toFixed(3)}, 0.01)` }), T.wipe * 0.4, accel);
  }
  await gate('wipe');
  await play(root, p => ({ opacity: 1 - p }), T.fade, settle);
  // The speaker button pulses once if sound is still off.
  const spk = document.getElementById('snd');
  if (info?.sound && soundNote.nudge && spk && spk.getAttribute('aria-pressed') !== 'true') {
    spk.classList.add('is-nudge');
    setTimeout(() => spk.classList.remove('is-nudge'), 2400);
  }
  root.remove();
}
