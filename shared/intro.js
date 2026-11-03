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
  flash: 7,     // frames the box holds after the pop
  unfurl: 333,  // ms each line takes to open
  nlLag: 2,     // frames between the name and the Dutch line
  subLag: 4,    // frames before the subtitle opens
  hold: 2300,   // ms from the start before the intro may clear
  tickPop: 2,   // frames the tick pops large
  tickHold: 8,  // frames the tick flash holds
  wipe: 333,    // ms the column wipes off
  fade: 500,    // ms the glass fades away
};

// ready is a promise; the intro holds at least T.hold ms before it clears.
// id and done let the intro lab play any toy; pages leave them out.
export async function intro({ ready = Promise.resolve(), min, timing = {}, id, done } = {}) {
  const root = document.querySelector('.intro');
  if (!root) return;
  const T = { ...TIMING, ...timing };
  root.classList.add('is-live');
  const text = root.querySelector('.intro-text');
  const held = Promise.all([ready, wait(frames(min ?? T.hold))]);
  const info = await entry(id), nameEl = text.querySelector('.intro-name');
  let nl = null;
  if (info && nameEl) {
    nameEl.textContent = info.name;
    const subEl = text.querySelector('.intro-sub');
    if (subEl && info.sub) subEl.textContent = info.sub;
    let emb = text.querySelector('.intro-emblem');
    if (info.emblem && !emb) {
      emb = document.createElement('span');
      emb.className = 'intro-emblem';
      nameEl.before(emb);
    }
    if (info.emblem) emb.style.setProperty('--emblem', `url(${new URL(info.emblem, TOYS).href})`);
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
  }
  // The name and subtitle start closed at their centre line.
  const closed = 'inset(0 50% 0 50%)';
  const unfurl = el => play(el, p => ({ clipPath: `inset(0 ${(50 * (1 - p)).toFixed(2)}% 0 ${(50 * (1 - p)).toFixed(2)}%)` }), T.unfurl, settle);
  if (badge) name.style.clipPath = closed;
  if (nl) nl.style.clipPath = closed;
  if (sub) sub.style.clipPath = closed;

  // The box flashes on in one frame and holds.
  await wait(T.lead);
  if (badge) { badge.classList.add('is-flash'); badge.style.setProperty('--box', 1); } else name.classList.add('is-flash');
  // For two frames the flash fills the eye, then it snaps to its place.
  const big = badge || name;
  big.style.transform = 'scale(2.6)';
  text.style.opacity = 1;
  await wait(T.pop);
  big.style.transform = '';
  await wait(T.flash);
  // The box cuts out; the emblem stays, white, and the words unfurl beneath it.
  if (badge) { badge.classList.remove('is-flash'); badge.style.setProperty('--box', 0); } else name.classList.remove('is-flash');
  if (badge) unfurl(name);
  if (nl) { await wait(T.nlLag); unfurl(nl); }
  if (sub) { await wait(T.subLag); await unfurl(sub); }

  await held;

  // A toy Tom signs off carries data-done; its last flash shows a tick.
  if (done ?? 'done' in root.dataset) await tickOff(big, badge, name, T);

  // The column wipes off, then the glass fades away whole.
  await play(text, p => ({ clipPath: `inset(0 0 0 ${(p * 100).toFixed(2)}%)` }), T.wipe, accel);
  await play(root, p => ({ opacity: 1 - p }), T.fade, settle);
  root.remove();
}

// The last flash ticks the toy off beside its mark.
async function tickOff(big, badge, name, T) {
  const tick = document.createElement('span');
  tick.className = 'intro-tick';
  tick.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 12.5l5.5 5.5L20.5 6" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="square"/></svg>';
  big.append(tick);
  if (badge) { badge.classList.add('is-flash'); badge.style.setProperty('--box', 1); } else name.classList.add('is-flash');
  tick.style.opacity = 1;
  tick.style.transform = 'scale(1.5)';
  await wait(T.tickPop);
  tick.style.transform = '';
  await wait(T.tickHold);
  if (badge) { badge.classList.remove('is-flash'); badge.style.setProperty('--box', 0); } else name.classList.remove('is-flash');
}
