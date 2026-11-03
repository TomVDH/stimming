// Stimming intro: flash, masked title, hold until ready, then clear.
// Pages import it as './shared/intro.js' or '../shared/intro.js'. No dependencies.

const RM = matchMedia('(prefers-reduced-motion: reduce)');
const wait = ms => new Promise(r => setTimeout(r, ms));
const play = (el, frames, o) => el.animate(frames, { fill: 'forwards', ...o }).finished;
const snap = 'cubic-bezier(0.2, 0.9, 0.1, 1)';

// ready is a promise; the intro holds at least min ms before it clears.
export async function intro({ ready = Promise.resolve(), min = 1200 } = {}) {
  const root = document.querySelector('.intro');
  if (!root) return;
  root.classList.add('is-live');
  const flash = root.querySelector('.intro-flash'), text = root.querySelector('.intro-text');
  const grain = root.querySelector('.intro-grain');
  const held = Promise.all([ready, wait(min)]);

  if (RM.matches) {
    // Reduced motion: no flash, the title fades in and out.
    await play(text, [{ opacity: 0 }, { opacity: 1 }], { duration: 300 });
    await held;
    await play(root, [{ opacity: 1 }, { opacity: 0 }], { duration: 300 });
    root.remove();
    return;
  }

  // The slab snaps open, holds, then drops away to leave the white title.
  await wait(140);
  await play(flash, [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], { duration: 90, easing: snap });
  await wait(170);
  text.style.opacity = 1;
  const settle = [{ letterSpacing: '0.44em', marginRight: '-0.44em' }, { letterSpacing: '0.32em', marginRight: '-0.32em' }];
  await play(flash, [{ opacity: 1 }, { opacity: 0.2 }, { opacity: 0.9 }, { opacity: 0 }], { duration: 140, easing: 'steps(4, end)' });
  // The title tightens once the slab has gone.
  play(text, settle, { duration: 900, easing: snap });

  await held;

  // The title wipes off and the grain and blur resolve to nothing.
  await play(text, [{ clipPath: 'inset(0 0 0 0)' }, { clipPath: 'inset(0 0 0 100%)' }], { duration: 320, easing: 'cubic-bezier(0.7, 0, 0.84, 0)' });
  await Promise.all([
    play(root, [
      { backdropFilter: 'blur(24px)', backgroundColor: 'oklch(0.16 0.012 275 / 0.78)' },
      { backdropFilter: 'blur(0px)', backgroundColor: 'oklch(0.16 0.012 275 / 0)' },
    ], { duration: 700, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }),
    play(grain, [{ opacity: 0.2 }, { opacity: 0 }], { duration: 700 }),
  ]);
  root.remove();
}
