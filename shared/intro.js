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
export async function intro({ ready = Promise.resolve(), min = 1200 } = {}) {
  const root = document.querySelector('.intro');
  if (!root) return;
  root.classList.add('is-live');
  const flash = root.querySelector('.intro-flash'), text = root.querySelector('.intro-text');
  const grain = root.querySelector('.intro-grain');
  const held = Promise.all([ready, wait(frames(min))]);

  if (RM.matches) {
    // Reduced motion: no flash, the name fades in and out.
    await play(text, p => ({ opacity: p }), 300);
    await held;
    await play(root, p => ({ opacity: 1 - p }), 300);
    root.remove();
    return;
  }

  // The viewport flashes white, holds, then drops away to leave the white name.
  await wait(3);
  flash.style.opacity = 1;
  await wait(5);
  text.style.opacity = 1;
  await play(flash, p => ({ opacity: [1, 0.2, 0.9, 0][Math.min(3, Math.floor(p * 4))] }), 4000 / FPS);

  await held;

  // The name wipes off and the grain and blur resolve to nothing.
  await play(text, p => ({ clipPath: `inset(0 0 0 ${(p * 100).toFixed(2)}%)` }), 333, accel);
  await Promise.all([
    play(root, p => ({
      backdropFilter: `blur(${(24 * (1 - p)).toFixed(2)}px)`,
      backgroundColor: `oklch(0.16 0.012 275 / ${(0.78 * (1 - p)).toFixed(3)})`,
    }), 708, settle),
    play(grain, p => ({ opacity: 0.2 * (1 - p) }), 708),
  ]);
  root.remove();
}
