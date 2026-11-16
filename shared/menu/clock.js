// The Clock: the menu's default view. Twelve toys stand on a dial.
// A Re-roll deals twelve more. ?all shows the whole shelf instead.
const HOURS = 12;
const root = document.documentElement;
// On any failure the menu falls back to the whole shelf.
const fail = () => { delete root.dataset.view; delete root.dataset.clock; };

if (root.dataset.view === 'clock') {
  try { start(); } catch (e) { fail(); console.error(e); }
}

function start() {
  const shelf = /** @type {HTMLElement} */ (document.querySelector('main > .shelf'));
  const pool = [...shelf.children];
  if (pool.length < HOURS) return fail();
  // GSAP comes from the menu's own script tag.
  const gsap = /** @type {any} */ (window).gsap;
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  // No motion with reduced motion, without GSAP, or in a hidden tab.
  const calm = () => !gsap || still.matches || document.visibilityState !== 'visible';

  // The face lies under the toys: outline, glow, and the middle.
  const ticks = Array.from({ length: 60 }, (_, i) => `<line x1="100" y1="44.5" x2="100" y2="${i % 5 ? 47.5 : 49.5}" transform="rotate(${i * 6} 100 100)"/>`).join('');
  const face = Object.assign(document.createElement('div'), { className: 'clock-face' });
  face.innerHTML = `<svg class="clock-ring" viewBox="0 0 200 200" aria-hidden="true"><circle class="rim" cx="100" cy="100" r="58" pathLength="1" transform="rotate(-90 100 100)"/><g class="ticks">${ticks}</g></svg>
<div class="clock-glow" aria-hidden="true"><i></i></div>
<div class="clock-mid">
  <div class="clock-plate" aria-hidden="true"></div>
  <p class="clock-count" aria-hidden="true"></p>
  <p class="clock-name" aria-live="polite"></p>
  <p class="clock-tag"></p>
  <button type="button" class="clock-roll" title="Re-roll (R)"><svg viewBox="0 0 16 16" aria-hidden="true"><rect x="1.8" y="1.8" width="12.4" height="12.4" rx="3"/><circle cx="5.4" cy="5.4" r="1.1"/><circle cx="10.6" cy="10.6" r="1.1"/><circle cx="8" cy="8" r="1.1"/></svg><span>Re-roll</span></button>
</div>`;
  shelf.after(face);
  const all = Object.assign(document.createElement('a'), { className: 'clock-all', href: './?all', textContent: 'All toys' });
  face.after(all);
  const ring = face.querySelector('.clock-ring'), rim = ring.querySelector('.rim'), marks = [...ring.querySelectorAll('line')];
  const glow = /** @type {HTMLElement} */ (face.querySelector('.clock-glow'));
  const count = face.querySelector('.clock-count'), title = face.querySelector('.clock-name'), tag = face.querySelector('.clock-tag');
  const button = face.querySelector('.clock-roll');

  // The tube shows the toy's still in the middle; the Clock works without it.
  let bg = null;
  import('./tube.js').then(m => m.tube(/** @type {HTMLElement} */ (face.querySelector('.clock-plate')))).then(t => {
    bg = t;
    if (shown) bg?.show(picture(shown));
    bg?.live(face.hasAttribute('data-live'));
  }).catch(() => {});
  const live = on => { face.toggleAttribute('data-live', on); bg?.live(on); };
  // toys.json holds each toy's motto and accent; the Clock works without it.
  let toys = {};
  fetch('toys.json').then(r => r.json()).then(t => { toys = t; show(null, true); }).catch(() => {});

  // The pool is every toy, in a shuffled line. Each roll takes the next twelve,
  // so no toy comes back before the rest had a turn.
  let line = [], held = null, busy = false;
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const dozen = () => [...shelf.children].slice(0, HOURS);
  const objs = () => dozen().map(li => li.querySelector('.obj'));
  const picture = li => `shared/stills/${li.querySelector('a.toy').id}.webp`;
  function deal() {
    const hand = [];
    while (hand.length < HOURS) {
      if (!line.length) line = shuffle(pool.filter(li => !hand.includes(li)));
      hand.push(line.shift());
    }
    pool.forEach(li => li.setAttribute('data-out', ''));
    hand.forEach((li, i) => {
      li.removeAttribute('data-out');
      li.style.setProperty('--x', Math.sin(i * Math.PI / 6).toFixed(4));
      li.style.setProperty('--y', (-Math.cos(i * Math.PI / 6)).toFixed(4));
      // A dealt toy skips the shelf's own blur reveal.
      li.querySelector('.toy').classList.add('is-in');
    });
    // The hand goes first, so the tab order follows the dial.
    shelf.prepend(...hand);
    held = null;
    show(null);
    // The stills of this dozen load while the browser is idle.
    (window.requestIdleCallback || setTimeout)(() => hand.forEach(li => { new Image().src = picture(li); }));
  }

  // The middle shows the toy in hand; with none, it keeps the last one.
  let shown = null;
  function show(li, again = false) {
    li = held = li || held || shelf.children[0];
    shelf.querySelector('[data-held]')?.removeAttribute('data-held');
    li.setAttribute('data-held', '');
    count.textContent = String(dozen().indexOf(li) + 1).padStart(2, '0') + ' / ' + HOURS;
    if (li === shown && !again) return;
    const first = shown === null, id = li.querySelector('a.toy').id, toy = toys[id] || {}, label = li.querySelector('.name');
    title.textContent = toy.name || [...label.childNodes].filter(c => c.nodeType === 3).map(c => c.textContent).join('').trim();
    tag.textContent = toy.tag || '';
    face.style.setProperty('--glow', toy.accent || 'oklch(0.86 0.06 275)');
    if (li === shown) return;
    shown = li;
    bg?.show(picture(li));
    // The new name rises into its line.
    if (!first && !still.matches) [title, tag].forEach((el, i) => el.animate([{ opacity: 0, translate: '0 10px' }, { opacity: 1, translate: '0 0' }], { duration: 420, delay: i * 60, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'backwards' }));
  }

  // The glow turns the short way to the pointer's bearing from the middle.
  let bearing = 0, turns = 0;
  const turnTo = gsap ? gsap.quickTo(glow, 'rotation', { duration: 0.9, ease: 'power3.out' }) : null;
  function aim(deg) {
    turns += ((deg - bearing + 540) % 360) - 180;
    bearing = deg;
    if (!gsap) glow.style.rotate = turns + 'deg';
    else if (calm()) gsap.set(glow, { rotation: turns });
    else turnTo(turns);
  }
  const hour = li => dozen().indexOf(li) * 30;
  // The toy's list item under an event's target, or null.
  const tile = node => /** @type {Element | null} */ (node)?.closest?.('main > .shelf > li') ?? null;
  shelf.addEventListener('pointerover', e => {
    const li = tile(e.target);
    if (!li) return;
    // The glow starts at the toy, so it does not sweep in from afar.
    if (!face.hasAttribute('data-live')) { aim(hour(li)); if (gsap) gsap.set(glow, { rotation: turns }); }
    live(true);
    show(li);
  });
  shelf.addEventListener('pointermove', e => {
    if (!tile(e.target)) return;
    const r = face.getBoundingClientRect();
    aim(Math.atan2(e.clientX - (r.left + r.width / 2), (r.top + r.height / 2) - e.clientY) * 180 / Math.PI);
  });
  shelf.addEventListener('pointerout', e => { if (!tile(e.relatedTarget)) live(false); });
  shelf.addEventListener('focusin', e => {
    const li = tile(e.target);
    if (!li) return;
    aim(hour(li));
    live(true);
    show(li);
  });
  shelf.addEventListener('focusout', e => { if (!tile(e.relatedTarget)) live(false); });

  // The dozen pops in round the dial. The outline draws in with it, then fades.
  function arrive() {
    face.setAttribute('data-on', '');
    if (calm()) return;
    const icons = objs();
    gsap.timeline({ onComplete: () => gsap.set(icons, { clearProps: 'transform,opacity,visibility' }) })
      .fromTo(icons, { scale: 0.2, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.55, ease: 'back.out(1.7)', stagger: 0.04 }, 0)
      .set(ring, { opacity: 1 }, 0)
      .fromTo(rim, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1, ease: 'expo.out' }, 0)
      .fromTo(marks, { opacity: 0 }, { opacity: 1, duration: 0.3, stagger: 0.009 }, 0.05)
      .to(ring, { opacity: 0, duration: 1.2, ease: 'power2.inOut' }, 1.3);
  }
  function roll() {
    if (busy) return;
    if (calm()) return deal();
    busy = true;
    const old = objs();
    gsap.to(old, { scale: 0.3, autoAlpha: 0, duration: 0.2, ease: 'power2.in', stagger: 0.012, onComplete() {
      gsap.set(old, { clearProps: 'transform,opacity,visibility' });
      deal();
      arrive();
      busy = false;
    } });
  }
  button.addEventListener('click', roll);
  addEventListener('keydown', e => { if (e.key.toLowerCase() === 'r' && !e.metaKey && !e.ctrlKey && !e.altKey) roll(); });
  // The Re-roll stays away for the first five seconds.
  setTimeout(() => face.setAttribute('data-roll', ''), 5000);

  deal();
  root.dataset.clock = 'on';
  arrive();
}
