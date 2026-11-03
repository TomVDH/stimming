// Stimming intro: emblem in a flash box, the name unfurls, hold until ready, clear.
// Toy pages import it as '../shared/intro.js'. No dependencies.

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

// ready is a promise; the intro holds at least min ms before it clears.
export async function intro({ ready = Promise.resolve(), min = 1800 } = {}) {
  const root = document.querySelector('.intro');
  if (!root) return;
  root.classList.add('is-live');
  const text = root.querySelector('.intro-text');
  const held = Promise.all([ready, wait(frames(min))]);

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
  const unfurl = el => play(el, p => ({ clipPath: `inset(0 ${(50 * (1 - p)).toFixed(2)}% 0 ${(50 * (1 - p)).toFixed(2)}%)` }), 333, settle);
  if (badge) name.style.clipPath = closed;
  if (sub) sub.style.clipPath = closed;

  // The box flashes on in one frame and holds.
  await wait(3);
  if (badge) { badge.classList.add('is-flash'); badge.style.setProperty('--box', 1); } else name.classList.add('is-flash');
  // For two frames the flash fills the eye, then it snaps to its place.
  const big = badge || name;
  big.style.transform = 'scale(2.6)';
  text.style.opacity = 1;
  await wait(2);
  big.style.transform = '';
  await wait(7);
  // The box cuts out; the emblem stays, white, and the words unfurl beneath it.
  if (badge) { badge.classList.remove('is-flash'); badge.style.setProperty('--box', 0); } else name.classList.remove('is-flash');
  if (badge) unfurl(name);
  if (sub) { await wait(4); await unfurl(sub); }

  await held;

  // The column wipes off, then the glass fades away whole.
  await play(text, p => ({ clipPath: `inset(0 0 0 ${(p * 100).toFixed(2)}%)` }), 333, accel);
  await play(root, p => ({ opacity: 1 - p }), 500, settle);
  root.remove();
}
