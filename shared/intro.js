// Stimming intro: flash, toy name, hold until ready, then clear.
// Toy pages import it as '../shared/intro.js'. No dependencies.

const RM = matchMedia('(prefers-reduced-motion: reduce)');

/* ---------- 24 fps timing ---------- */
// Every transition steps at 24 fps, like film.
const FPS = 24;
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

  // The rule and its segment bar join the name before the flash copy.
  const rule = document.createElement('div');
  rule.className = 'intro-rule';
  rule.innerHTML = '<b></b><span>' + '<i></i>'.repeat(12) + '</span>';
  text.append(rule);
  const segs = [...rule.querySelectorAll('i')];
  const frame = document.createElement('div');
  frame.className = 'intro-frame';
  frame.innerHTML = '<i></i>'.repeat(4);
  root.prepend(frame);

  // The flash copy is the name in a white box.
  const flash = text.cloneNode(true);
  flash.className = 'intro-flash';
  text.after(flash);
  const fold = flash.querySelector('.intro-sub');
  if (fold) fold.style.transform = 'rotateX(-90deg)';

  // The box flashes on at full white over the dark glass.
  await wait(3);
  flash.style.opacity = 1;
  frame.style.opacity = 1;
  await wait(1);
  // The subtitle folds down inside the box.
  if (fold) await play(fold, p => ({ transform: `rotateX(${(-90 * (1 - p)).toFixed(2)}deg)` }), 167, settle);
  await wait(2);
  // The box cuts out bright and leaves the name in white.
  text.style.opacity = 1;
  await play(flash, p => ({ opacity: [1, 0.7, 0][Math.min(2, Math.floor(p * 3))] }), 3000 / FPS);
  flash.remove();

  // The hairline draws out, then a segment lights every second frame.
  // The last three wait for the toy to be ready.
  await play(rule.querySelector('b'), p => ({ transform: `scaleX(${p.toFixed(3)})` }), 250, settle);
  let primed = false;
  held.then(() => (primed = true));
  for (let k = 0; k < segs.length; k++) {
    while (k >= segs.length - 3 && !primed) await wait(1);
    segs[k].classList.add('on');
    await wait(2);
  }

  // The name wipes off, then the glass fades away whole.
  play(frame, p => ({ opacity: 1 - p }), 333);
  await play(text, p => ({ clipPath: `inset(0 0 0 ${(p * 100).toFixed(2)}%)` }), 333, accel);
  await play(root, p => ({ opacity: 1 - p }), 500, settle);
  root.remove();
}
