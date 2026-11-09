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
// One fetch that always revalidates; a slow or missing file gives null.
// The revalidation keeps a cached copy from hiding new names and icons.
async function entry(id = toyId()) {
  try {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 1500);
    const res = await fetch(TOYS, { signal: ctl.signal, cache: 'no-cache' });
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

// Discrete keyframes, one per film frame; the last one holds.
const keys = (el, list) => {
  const n = list.length - 1;
  return el.animate(list.map((k, i) => ({ ...k, offset: i / n })), { duration: (n * 1000) / FPS, easing: `steps(${n}, jump-end)`, fill: 'forwards' }).finished;
};
const pct = v => `${(100 * v).toFixed(2)}%`;

// The lines, in order: classic notice, main title, translation, subtitle, subtitle translation, audio notice.
// Lab toys also carry a lab tag under the translation.
// The base beats of every intro, in frames at 30 fps or in milliseconds.
// The intro lab at /introlab/ edits a copy of this table live.
export const TIMING = {
  lead: 2,        // frames of glass before the flash
  pop: 2,         // frames the flash fills the eye
  popScale: 3.4,  // how far the blown-up flash fills the eye
  flash: 9,       // frames the box holds at size after the pop
  unfurl: 240,    // ms each line takes to open
  nlLag: 3,       // frames between the name and the Dutch line
  subLag: 3,      // frames before the subtitle opens
  tagLag: 3,      // frames from the subtitle to the motto
  tagNlLag: 3,    // frames from the motto to its Dutch line
  sndLag: 3,      // frames from the line above to the audio notice
  clsLag: 3,      // frames from the classic notice to the main title
  logoK: 1,       // logo size, times its responsive size
  nameK: 1,       // main title size, times its responsive size
  nlK: 1,         // translation size, times the copy size
  tagK: 1,        // subtitle size, times the copy size
  tagNlK: 1,      // subtitle translation size, times the copy size
  sndK: 1,        // audio notice size, times the copy size
  clsK: 1,        // classic notice size, times the copy size
  gapK: 1,        // vertical space between the lines, times its responsive size
  padK: 1,        // flash box padding, times its responsive size
  blur: 36,       // px the glass blurs the page
  dim: 0.45,      // brightness the glass leaves of the page
  clsY: 0,       // vh the classic notice moves down
  nameY: 0,       // vh the main title moves down
  nlY: 0,         // vh the translation moves down
  tagY: -14,      // vh the subtitle moves down
  tagNlY: -14,    // vh the subtitle translation moves down
  sndY: 0,        // vh the audio notice moves down
  hold: 2300,     // ms from the start before a fixed-hold variety clears
  readBase: 350,  // ms of reading time after the last line opens
  readPer: 12,    // ms more reading time per motto character
  readCap: 1300,  // ms of reading time at most
  wipe: 250,      // ms the column takes to leave
  fade: 380,      // ms the glass fades away
};

// The sound notice for toys with sound: a headphones glyph and three words.
// glyph and words make the quiet line at the foot; nudge pulses the speaker.
export const SOUND_NOTE = { glyph: true, words: 'Best with sound', nudge: false };

// Classic ships for now. The others are proposals for the intro lab.
// Each variety may change the timing, the flash, how the box leaves, how lines open and the exit.
// read: true holds for reading time; false holds to T.hold from the start.
export const DEFAULT_VARIETY = 'classic';
// Classic's beats; the restyle looks share this one table.
const CLASSIC = { lead: 4, pop: 9, flash: 16, unfurl: 400, nlLag: 5, subLag: 5, tagLag: 5, tagNlLag: 5, sndLag: 5, readBase: 1000, readPer: 15, readCap: 2200, wipe: 400, fade: 600 };
// A look restyles Classic: look names its CSS block, style holds sizes and places.
// stack keeps the subtitles under the translation; fonts fill the lab's four slots.
const SLAB = 'Iosevka Term Slab Nerd Font';
const look = (key, label, style, more = {}) => ({ label, group: 'Restyle', timing: CLASSIC, look: key, style, exit: 'wipe', read: true, ...more });
export const VARIETIES = {
  brut: look('brut', 'Brut: one stack, slab caps, hard shadow', { tagY: 0, tagNlY: 0, blur: 18, dim: 0.32 },
    { stack: true, fonts: { fd: SLAB, fn: 'B612', fs: 'B612', fsn: 'B612' } }),
  label: look('label', 'Label: lines hang left of the logo box', { nameK: 0.8, padK: 0.6, tagY: 0, tagNlY: 0 },
    { fonts: { fd: 'B612', fn: SLAB, fs: SLAB, fsn: SLAB } }),
  poster: look('poster', 'Poster: the title leads, near-black glass', { nameK: 1.45, logoK: 0.85, padK: 1.35, blur: 48, dim: 0.28 },
    { fonts: { fd: 'Gabarito', fn: SLAB, fs: SLAB, fsn: SLAB } }),
  plate: look('plate', 'Plate: the title sits on a white plate', { nameK: 0.8, blur: 30, dim: 0.38 },
    { fonts: { fd: 'B612', fn: SLAB, fs: SLAB, fsn: SLAB } }),
  signal: look('signal', 'Signal: one stack, the box and title in signal yellow', { tagY: 0, tagNlY: 0, blur: 60, dim: 0.3 },
    { stack: true, fonts: { fd: 'Gabarito', fn: 'B612', fs: 'B612', fsn: 'B612' } }),
  readout: look('readout', 'Readout: the title rides above the logo, all slab caps', { nameK: 0.6, logoK: 0.9, padK: 0.8, blur: 24, dim: 0.4 },
    { fonts: { fd: SLAB, fn: SLAB, fs: SLAB, fsn: SLAB } }),
  // Snap runs 20% longer than the base table, every beat in proportion.
  snap: {
    label: 'Snap', group: 'Earlier', read: true,
    timing: { lead: 3, pop: 3, flash: 11, unfurl: 290, nlLag: 4, subLag: 4, tagLag: 4, tagNlLag: 4, sndLag: 4, clsLag: 4, readBase: 420, readPer: 15, readCap: 1560, wipe: 300, fade: 460 },
  },
  stamp: {
    label: 'Stamp: the box lands hard, lines stamp in', group: 'New',
    timing: { flash: 10 }, land: 'stamp', reveal: 'stamp', exit: 'blow', read: true,
  },
  flap: {
    label: 'Flap: the box splits, lines flip down', group: 'New',
    timing: { unfurl: 270 }, cut: 'split', reveal: 'flap', exit: 'fold', read: true,
  },
  scan: {
    label: 'Scan: a bar draws each line, then sweeps up', group: 'New',
    timing: { unfurl: 260, wipe: 300 }, cut: 'bar', reveal: 'scan', exit: 'scan', read: true,
  },
  glitch: {
    label: 'Glitch: bands slip, then lock', group: 'New',
    timing: { flash: 10 }, flash: 'jitter', reveal: 'glitch', exit: 'glitch', read: true,
  },
  punch: {
    label: 'Punch: rings close in, lines zoom out of blur', group: 'New',
    timing: { unfurl: 260, wipe: 280 }, flash: 'rings', reveal: 'punch', exit: 'punch', read: true,
  },
  squad: {
    label: 'Squad: the emblem stands left, lines type in beside it, a bar sweeps it off', group: 'New',
    timing: { flash: 8, nlLag: 2, subLag: 2, tagLag: 2, tagNlLag: 2, sndLag: 2, wipe: 300 },
    layout: 'side', cut: 'bar', reveal: 'type', exit: 'scan', read: true,
  },
  classic: {
    label: 'Classic', group: 'Default',
    timing: CLASSIC, exit: 'wipe', read: true,
  },
  type: {
    label: 'Type: lines are typed, then erased', group: 'Earlier',
    timing: { lead: 3, flash: 10, nlLag: 2, subLag: 2, tagLag: 2, tagNlLag: 2, sndLag: 2, wipe: 260, fade: 420, readBase: 400 },
    reveal: 'type', exit: 'erase', read: true,
  },
  lift: {
    label: 'Lift: lines rise in, then sink away', group: 'Earlier',
    timing: { lead: 3, flash: 11, unfurl: 300, wipe: 280, fade: 450, readBase: 400 },
    reveal: 'lift', exit: 'drop', read: true,
  },
  strobe: {
    label: 'Strobe: the box blinks, lines cut in hard', group: 'Earlier',
    timing: { flash: 8, nlLag: 4, subLag: 4, tagLag: 4, tagNlLag: 4, sndLag: 4, fade: 300, readBase: 450 },
    flash: 'strobe', reveal: 'cut', exit: 'cut', read: true,
  },
  shutter: {
    label: 'Shutter: slits open, a tube switches off', group: 'Earlier',
    timing: { lead: 3, flash: 11, unfurl: 280, wipe: 300, fade: 380, readBase: 400 },
    reveal: 'slit', exit: 'crt', read: true,
  },
};

// A look's style can never change a beat; these keys are dropped from it.
const BEAT = /^(lead|pop|flash|unfurl|hold|wipe|fade|read\w+|\w+Lag)$/;
// A variety's full table: the base, its timing, then its style.
export function tableOf(variety) {
  const V = VARIETIES[variety] || VARIETIES[DEFAULT_VARIETY];
  const style = Object.fromEntries(Object.entries(V.style || {}).filter(([k]) => !BEAT.test(k)));
  return { ...TIMING, ...(V.timing || {}), ...style };
}

// The phases the intro lab can pause on, in order.
export const PHASES = ['glass', 'pop', 'flash', 'lines', 'hold', 'wipe'];

// A white bar rides the open edge of a scan.
const scanBar = el => {
  el.style.position = 'relative';
  const bar = document.createElement('i');
  bar.className = 'intro-scan';
  el.append(bar);
  return bar;
};

// How each line starts hidden, and how it opens.
const REVEAL = {
  unfurl: {
    // The clip opens sideways only; its overhang keeps every glyph whole.
    shut: { clipPath: 'inset(-0.4em 50% -0.4em 50%)' },
    open: (el, T) => play(el, p => ({ clipPath: `inset(-0.4em calc(${pct((1 - p) / 2)} - 0.2em) -0.4em calc(${pct((1 - p) / 2)} - 0.2em))` }), T.unfurl, settle),
  },
  type: {
    shut: { clipPath: 'inset(0 100% 0 0)' },
    // Typing steps one frame per character, up to two thirds of a second.
    open: el => play(el, p => ({ clipPath: `inset(0 ${pct(1 - p)} 0 0)` }), (Math.min(20, Math.max(4, el.textContent.length)) * 1000) / FPS),
  },
  lift: {
    shut: { clipPath: 'inset(0 0 100% 0)', transform: 'translateY(0.6em)' },
    open: (el, T) => play(el, p => ({ clipPath: `inset(0 0 ${pct(1 - p)} 0)`, transform: `translateY(${(0.6 * (1 - p)).toFixed(3)}em)` }), T.unfurl, settle),
  },
  slit: {
    shut: { clipPath: 'inset(50% 0 50% 0)' },
    open: (el, T) => play(el, p => ({ clipPath: `inset(${pct((1 - p) / 2)} 0 ${pct((1 - p) / 2)} 0)` }), T.unfurl, settle),
  },
  cut: {
    shut: { clipPath: 'inset(0 0 100% 0)' },
    // A hard cut: the line shows inverted for one frame, then settles.
    open: el => {
      Object.assign(el.style, { clipPath: 'none', background: '#fff', color: 'var(--intro-bg)' });
      return wait(1).then(() => { el.style.background = ''; el.style.color = ''; });
    },
  },
  stamp: {
    shut: { clipPath: 'inset(0 0 100% 0)' },
    open: el => {
      el.style.clipPath = 'none';
      return keys(el, [{ transform: 'scale(1.4) rotate(-3deg)' }, { transform: 'scale(0.93) rotate(1deg)' }, { transform: 'scale(1.03)' }, { transform: 'none' }]);
    },
  },
  flap: {
    shut: { clipPath: 'inset(0 0 100% 0)' },
    // The line hangs from its top edge and flips down into place.
    open: (el, T) => {
      el.style.clipPath = 'none';
      return play(el, p => ({ transformOrigin: '50% 0', transform: `perspective(30em) rotateX(${(-90 * (1 - p)).toFixed(2)}deg)` }), T.unfurl, settle);
    },
  },
  scan: {
    shut: { clipPath: 'inset(0 0 100% 0)' },
    open: async (el, T) => {
      const bar = scanBar(el);
      await Promise.all([
        play(el, p => ({ clipPath: `inset(0 0 ${pct(1 - p)} 0)` }), T.unfurl),
        play(bar, p => ({ top: `calc(${pct(p)} - 0.14em)` }), T.unfurl),
      ]);
      bar.remove();
    },
  },
  glitch: {
    shut: { clipPath: 'inset(0 0 100% 0)' },
    // Three bands of the line show out of place, then the line locks.
    open: el => keys(el, [
      { clipPath: 'inset(0 0 62% 0)', transform: 'translateX(-0.3em)' },
      { clipPath: 'inset(36% 0 22% 0)', transform: 'translateX(0.22em)' },
      { clipPath: 'inset(68% 0 0 0)', transform: 'translateX(-0.12em)' },
      { clipPath: 'inset(0 0 0 0)', transform: 'translateX(0.05em)' },
      { clipPath: 'none', transform: 'none' },
    ]),
  },
  punch: {
    shut: { clipPath: 'inset(0 0 100% 0)' },
    open: (el, T) => {
      el.style.clipPath = 'none';
      return play(el, p => ({ transform: `scale(${(1.6 - 0.6 * p).toFixed(3)})`, filter: `blur(${(0.3 * (1 - p)).toFixed(3)}em)` }), T.unfurl, settle);
    },
  },
};

// The largest flash scale that leaves a margin around the box.
export function popFit(root, box, want) {
  const r = root.getBoundingClientRect(), b = box.getBoundingClientRect(), w = box.offsetWidth, h = box.offsetHeight;
  const cy = b.top + b.height / 2 - r.top, margin = 0.06 * r.height;
  return Math.min(want, (2 * (cy - margin)) / h, (r.width - 2 * margin) / w).toFixed(3);
}

// The size knobs, as the CSS variables they set.
const SIZES = { logoK: '--logo-k', nameK: '--name-k', nlK: '--nl-k', tagK: '--tag-k', tagNlK: '--tagnl-k', sndK: '--snd-k', clsK: '--cls-k', gapK: '--gap-k', padK: '--pad-k', blur: '--blur', dim: '--dim' };

// Sets the sizes, then shrinks the copy until every line fits on screen.
export function fitIntro(root, T) {
  const text = root.querySelector('.intro-text');
  if (!text) return;
  for (const [k, name] of Object.entries(SIZES)) root.style.setProperty(name, T[k] ?? 1);
  text.style.removeProperty('--copy-k');
  const badge = root.dataset.layout ? null : text.querySelector('.intro-badge');
  const foot = text.querySelector('.intro-foot');
  let k = 1;
  for (let i = 0; i < 4; i++) {
    const r = root.getBoundingClientRect(), t = text.getBoundingClientRect();
    const top = badge ? badge.getBoundingClientRect().bottom : t.top;
    const last = foot ? foot.previousElementSibling : text.lastElementChild;
    // The subtitle's Y knob can lift it above the foot, so it sets the limit.
    const lifted = foot?.querySelector('.intro-tag') || foot;
    const limit = foot ? Math.min(foot.getBoundingClientRect().top, lifted.getBoundingClientRect().top) - 16 : r.bottom - 24;
    const tall = Math.max(0.1, limit - top) / Math.max(1, last.getBoundingClientRect().bottom - top);
    // A word wider than its box overflows; the title then shrinks too.
    const wide = Math.min(1, ...[...text.children, ...(foot?.children || [])].map(el => el.clientWidth && el.scrollWidth > el.clientWidth ? el.clientWidth / el.scrollWidth : 1));
    if (tall >= 1 && wide >= 1) break;
    k = Math.max(0.4, k * Math.min(tall, wide));
    text.style.setProperty('--copy-k', k.toFixed(3));
  }
}

// ready is a promise; a fixed-hold variety holds at least T.hold ms before it clears.
// id, done and gate let the intro lab play any toy; pages leave them out.
// gate(phase) is awaited as each phase shows, so the lab can pause there.
export async function intro({ ready = Promise.resolve(), min, timing = {}, id, gate = () => {}, soundNote = SOUND_NOTE, variety = DEFAULT_VARIETY, nameFlash = false, textFlash = false, classic = false, fill = null } = {}) {
  const root = document.querySelector('.intro');
  if (!root) return;
  const V = VARIETIES[variety] || VARIETIES[DEFAULT_VARIETY];
  const T = { ...tableOf(variety), ...timing };
  root.classList.add('is-live');
  if (V.look) root.dataset.look = V.look;
  if (V.layout) root.dataset.layout = V.layout;
  const text = root.querySelector('.intro-text');
  const held = Promise.all([ready, wait(frames(min ?? T.hold))]);
  const info = await entry(id), nameEl = text.querySelector('.intro-name');
  // The lab's Static mode fills lines a toy lacks, so every line shows.
  if (fill && info) for (const k of Object.keys(fill)) info[k] ||= fill[k];
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

  // The classic notice sits under the main title; it stays off for now.
  let cls = null;
  if (classic && nameEl) {
    cls = Object.assign(document.createElement('span'), { className: 'intro-classic', textContent: '< CLASSIC >' });
    nameEl.after(cls);
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
  // The number stays off unless a page asks for it: box, subtitles or foot.
  const numAt = root.dataset.numAt || 'none';
  let num = null;
  if (info?.number && (numAt === 'subs' || numAt === 'bottom')) {
    num = Object.assign(document.createElement('span'), { className: 'intro-num', textContent: `#${info.number}` });
    if (numAt === 'bottom') root.append(num); else (nl || name).after(num);
  }
  // The emblem sits in a badge whose white box is the flash.
  let badge = null;
  if (emblem) {
    badge = document.createElement('span');
    badge.className = 'intro-badge';
    emblem.before(badge);
    badge.append(emblem);
    if (info?.number && numAt === 'box') badge.dataset.num = `#${info.number}`;
  }
  // A toy with sound ends its titles with a quiet headphones line.
  let snd = null;
  if (info?.sound && (soundNote.glyph || soundNote.words)) {
    snd = document.createElement('span');
    snd.className = 'intro-snd';
    const icon = soundNote.glyph ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 15v-3a8 8 0 0 1 16 0v3" fill="none" stroke="currentColor" stroke-width="2.6"/><rect x="2.5" y="13.5" width="5" height="8" rx="1.2" fill="currentColor"/><rect x="16.5" y="13.5" width="5" height="8" rx="1.2" fill="currentColor"/></svg>' : '';
    snd.innerHTML = icon + (soundNote.words ? `<span>${soundNote.words}</span>` : '');
    text.append(snd);
  }
  const big = badge || name;
  // The subtitles and the notes sit at the foot, away from the logo.
  if (!V.layout) {
    const make = (tag, className) => Object.assign(document.createElement(tag), { className });
    const foot = make('div', 'intro-foot'), notes = make('div', 'intro-notes'), left = make('span', 'intro-notes-l');
    // A stacked look keeps the subtitles in the column.
    if (!V.stack) foot.append(...text.querySelectorAll('.intro-tag'));
    if (num) left.append(num);
    notes.append(left, ...(snd ? [snd] : []));
    foot.append(notes);
    text.append(foot);
  }
  // Each line starts closed in the variety's own way, then opens on its beat.
  const lines = [badge ? name : null, cls, nl, numAt === 'subs' ? num : null, sub,
    text.querySelector('.intro-tag:not(.intro-tag--nl)'), text.querySelector('.intro-tag--nl'), snd, numAt === 'bottom' ? num : null];
  const lags = [0, T.clsLag, T.nlLag, T.nlLag, T.subLag, T.tagLag, T.tagNlLag, T.sndLag, T.sndLag];
  const R = REVEAL[V.reveal] || REVEAL.unfurl;
  lines.forEach(el => { if (el) Object.assign(el.style, R.shut); });
  // Each line can sit higher or lower than its place in the column.
  [[cls, T.clsY], [name, T.nameY], [nl, T.nlY], [text.querySelector('.intro-tag:not(.intro-tag--nl)'), T.tagY], [text.querySelector('.intro-tag--nl'), T.tagNlY], [snd, T.sndY]]
    .forEach(([el, y]) => { if (el && y) el.style.translate = `0 ${y}cqh`; });
  // The logo never moves: CSS pins it to one point on the screen.
  fitIntro(root, T);
  document.fonts?.ready.then(() => fitIntro(root, T));
  // A try-out: the name can share the flash, boxed and blown up with the mark.
  const both = nameFlash && badge;
  const box = on => {
    if (badge) { badge.classList.toggle('is-flash', on); badge.style.setProperty('--box', on ? 1 : 0); } else name.classList.toggle('is-flash', on);
    if (both) { name.classList.toggle('is-flash', on); name.style.clipPath = on ? 'none' : R.shut.clipPath; }
  };
  const blow = both ? text : big;

  // The box flashes on and holds.
  await wait(T.lead);
  await gate('glass');
  if (V.flash === 'strobe') {
    // Strobe: two short blinks before the box lands.
    for (let k = 0; k < 2; k++) { box(true); text.style.opacity = 1; await wait(1); box(false); await wait(1); }
  }
  box(true);
  text.style.opacity = 1;
  if (V.flash === 'rings' && badge) {
    // Rings: three outlines close in on the box; the box shows at size.
    for (const s of [1.5, 2.2, 3]) {
      const ring = document.createElement('i');
      ring.className = 'intro-ring';
      badge.append(ring);
      play(ring, p => ({ transform: `scale(${(s - (s - 1) * p).toFixed(3)})`, opacity: p < 1 ? 1 : 0 }), ((T.pop + 3) * 1000) / FPS, accel).then(() => ring.remove());
    }
  } else {
    // For a few frames the flash fills the eye, then it snaps to its place.
    // The cap keeps a clear margin on every side; the logo's point stays put.
    blow.style.transform = `scale(${popFit(root, big, T.popScale)})`;
  }
  await wait(T.pop);
  await gate('pop');
  if (V.land === 'stamp') {
    // Stamp: the box overshoots, bounces once and casts a hard shadow.
    badge?.classList.add('is-stamp');
    for (const s of [0.86, 1.07, 0.98]) { blow.style.transform = `scale(${s})`; await wait(1); }
  }
  blow.style.transform = '';
  if (V.flash === 'jitter') {
    // Jitter: the box slips sideways for a few frames, then holds still.
    const steps = [7, -5, 3, -2, 0];
    for (const x of steps) { blow.style.transform = x ? `translateX(${x}px)` : ''; await wait(1); }
    await wait(Math.max(0, T.flash - steps.length));
  } else {
    // The text flash wipes only the title in as a box while the logo's box holds.
    const flashLines = textFlash && badge ? [name] : [];
    const wipe = { ...T, unfurl: Math.min(T.unfurl, (T.flash * 1000) / FPS) };
    flashLines.forEach(el => { el.classList.add('is-wipe'); R.open(el, wipe); });
    await wait(T.flash);
  }
  await gate('flash');
  // The box leaves; the emblem stays, white, and the lines open beneath it.
  if (V.cut === 'split' && badge) {
    // Split: the box parts down the middle and its halves slide out.
    badge.classList.remove('is-flash');
    play(badge, p => ({ '--split': pct(0.5 * p) }), 200, accel).then(() => { badge.style.setProperty('--box', 0); badge.style.setProperty('--split', '0%'); });
  } else if (V.cut === 'bar' && badge) {
    // Bar: the box drops to a thin bar along its foot, then goes.
    badge.classList.remove('is-flash');
    play(badge, p => ({ '--box-y': (1 - 0.95 * p).toFixed(3) }), 160, accel).then(() => wait(2)).then(() => { badge.style.setProperty('--box', 0); badge.style.setProperty('--box-y', 1); });
  } else box(false);
  if (both) box(false);
  // After a text flash the title drops its box as the logo drops its box.
  lines.forEach(el => el?.classList.remove('is-wipe'));
  // Each line opens a beat after the one above; the last one is awaited.
  let last = null, first = true;
  for (let k = 0; k < lines.length; k++) {
    if (!lines[k] || (textFlash && V.flash !== 'jitter' && lines[k] === name)) continue;
    if (!first) await wait(lags[k]);
    first = false;
    last = R.open(lines[k], T);
  }
  await last;
  await gate('lines');

  // Most varieties hold for reading time; a fixed-hold variety holds to T.hold.
  if (V.read) {
    const chars = [info?.tag, info?.tagNl].join('').length;
    await Promise.all([ready, wait(frames(Math.min(T.readCap, T.readBase + T.readPer * chars)))]);
  } else await held;
  await gate('hold');

  // Each variety leaves its own way, then the glass fades away whole.
  const shown = lines.filter(Boolean).reverse();
  const each = async step => {
    let end = null;
    for (const el of [...shown, badge].filter(Boolean)) { end = step(el); await wait(1); }
    await end;
  };
  const exit = V.exit || 'wipe';
  if (exit === 'wipe') await play(text, p => ({ clipPath: `inset(0 0 0 ${pct(p)})` }), T.wipe, accel);
  // Lines erase right to left, bottom first, a frame apart.
  if (exit === 'erase') await each(el => play(el, p => ({ clipPath: `inset(0 ${pct(p)} 0 0)` }), T.wipe, accel));
  if (exit === 'drop') await each(el => play(el, p => ({ clipPath: `inset(${pct(p)} 0 0 0)`, transform: `translateY(${(0.6 * p).toFixed(3)}em)` }), T.wipe, accel));
  if (exit === 'fold') await each(el => play(el, p => ({ transformOrigin: '50% 0', transform: `perspective(30em) rotateX(${(90 * p).toFixed(2)}deg)` }), T.wipe, accel));
  if (exit === 'cut') { box(true); await wait(1); text.style.opacity = 0; }
  if (exit === 'crt') {
    // The column collapses to a line, then the line shrinks to a dot.
    text.style.transformOrigin = '50% 50%';
    await play(text, p => ({ transform: `scaleY(${Math.max(0.01, 1 - p).toFixed(3)})` }), T.wipe * 0.6, accel);
    await play(text, p => ({ transform: `scale(${(1 - p).toFixed(3)}, 0.01)` }), T.wipe * 0.4, accel);
  }
  if (exit === 'blow') await keys(text, [{ transform: 'none' }, { transform: 'scale(1.06)' }, { transform: 'scale(1.14)', opacity: 0.5 }, { transform: 'scale(1.2)', opacity: 0 }]);
  if (exit === 'scan') {
    // The bar sweeps back up and takes the column with it.
    const bar = scanBar(text);
    await Promise.all([
      play(text, p => ({ clipPath: `inset(0 0 ${pct(p)} 0)` }), T.wipe, accel),
      play(bar, p => ({ top: `calc(${pct(1 - p)} - 0.14em)` }), T.wipe, accel),
    ]);
  }
  if (exit === 'glitch') {
    await keys(text, [
      { transform: 'none' },
      { clipPath: 'inset(0 0 55% 0)', transform: 'translateX(8px)' },
      { clipPath: 'inset(40% 0 18% 0)', transform: 'translateX(-12px)' },
      { clipPath: 'inset(78% 0 0 0)', transform: 'translateX(16px)' },
      { clipPath: 'inset(100% 0 0 0)', transform: 'none' },
    ]);
  }
  if (exit === 'punch') await play(text, p => ({ transform: `scale(${(1 + 1.2 * p).toFixed(3)})`, filter: `blur(${(10 * p).toFixed(2)}px)`, opacity: 1 - p }), T.wipe, accel);
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
