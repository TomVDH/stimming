// The Clock: the menu's default view. Twelve toys stand on a dial.
// A Re-roll deals twelve more. ?all shows the whole shelf instead.
const HOURS = 12;
// A test (Tom, 2026-11-16): these toys have a moving loop in shared/loops/.
const LOOPS = new Set(['fire']);
// The selection light has three kinds for Tom to pick from. ?dev shows the switch.
const GLOWS = ['ring', 'beam', 'halo'];
const GLOW_KEY = 'stimming.clock.glow';
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
<div class="clock-glow" aria-hidden="true"><i></i><i></i></div>
<div class="clock-mid">
  <div class="clock-plate" aria-hidden="true"></div>
  <p class="clock-name" aria-live="polite"></p>
  <p class="clock-tag"></p>
</div>`;
  shelf.after(face);
  // The Re-roll stands under the clock.
  const button = Object.assign(document.createElement('button'), { type: 'button', className: 'clock-roll', title: 'Re-roll (R)' });
  button.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="1.8" y="1.8" width="12.4" height="12.4" rx="3"/><circle cx="5.4" cy="5.4" r="1.1"/><circle cx="10.6" cy="10.6" r="1.1"/><circle cx="8" cy="8" r="1.1"/></svg>Re-roll';
  face.after(button);
  const ring = face.querySelector('.clock-ring'), rim = ring.querySelector('.rim'), marks = [...ring.querySelectorAll('line')];
  const glow = /** @type {HTMLElement} */ (face.querySelector('.clock-glow'));
  const title = face.querySelector('.clock-name'), tag = face.querySelector('.clock-tag');

  // The tube shows the toy's still in the middle; the Clock works without it.
  let bg = null;
  import('./tube.js').then(m => m.tube(/** @type {HTMLElement} */ (face.querySelector('.clock-plate')))).then(t => {
    bg = t;
    if (shown) bg?.show(picture(shown), film(shown));
    bg?.live(face.hasAttribute('data-live'));
  }).catch(() => {});
  const live = on => { face.toggleAttribute('data-live', on); bg?.live(on); };
  // toys.json holds each toy's motto and accent; the Clock works without it.
  let toys = {};
  fetch('toys.json').then(r => r.json()).then(t => { toys = t; if (shown) write(shown); }).catch(() => {});

  // The pool is every toy, in a shuffled line. Each roll takes the next twelve,
  // so no toy comes back before the rest had a turn.
  let line = [], busy = false;
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const dozen = () => [...shelf.children].slice(0, HOURS);
  const objs = () => dozen().map(li => li.querySelector('.obj'));
  const picture = li => `shared/stills/${li.querySelector('a.toy').id}.webp`;
  const film = li => { const id = li.querySelector('a.toy').id; return LOOPS.has(id) ? `shared/loops/${id}.mp4` : null; };
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
    rest(true);
    // The stills of this dozen load while the browser is idle.
    (window.requestIdleCallback || setTimeout)(() => hand.forEach(li => { new Image().src = picture(li); }));
  }

  // The middle shows the toy in hand. With no toy in hand it shows nothing.
  let shown = null, wipe = 0;
  function write(li) {
    const toy = toys[li.querySelector('a.toy').id] || {}, label = li.querySelector('.name');
    title.textContent = toy.name || [...label.childNodes].filter(c => c.nodeType === 3).map(c => c.textContent).join('').trim();
    tag.textContent = toy.tag || '';
    tint(toy.accent || 'oklch(0.86 0.06 275)');
  }
  function show(li) {
    clearTimeout(wipe);
    shelf.querySelector('[data-held]')?.removeAttribute('data-held');
    li.setAttribute('data-held', '');
    if (li === shown) return;
    shown = li;
    write(li);
    bg?.show(picture(li), film(li));
    // The new words rise into their lines.
    if (!still.matches) [title, tag].forEach((el, i) => el.animate([{ opacity: 0, translate: '0 10px' }, { opacity: 1, translate: '0 0' }], { duration: 420, delay: i * 60, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'backwards' }));
  }
  // The middle empties when the toy leaves the hand.
  function rest(now = false) {
    live(false);
    shelf.querySelector('[data-held]')?.removeAttribute('data-held');
    clearTimeout(wipe);
    const empty = () => { if (face.hasAttribute('data-live')) return; shown = null; bg?.clear(); };
    // The picture goes only after its fade, so no edge shows.
    if (now) empty(); else wipe = setTimeout(empty, 650);
  }

  // Two lamps take turns, so one toy's colour fades into the next.
  const lamps = /** @type {HTMLElement[]} */ ([...glow.children]);
  let lamp = 0;
  function tint(colour) {
    if (lamps[lamp].dataset.c === colour) return;
    lamp ^= 1;
    lamps[lamp].dataset.c = colour;
    lamps[lamp].style.setProperty('--c', colour);
    lamps[lamp].setAttribute('data-in', '');
    lamps[lamp ^ 1].removeAttribute('data-in');
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
  shelf.addEventListener('pointerout', e => { if (!tile(e.relatedTarget)) rest(); });
  shelf.addEventListener('focusin', e => {
    const li = tile(e.target);
    if (!li) return;
    aim(hour(li));
    live(true);
    show(li);
  });
  shelf.addEventListener('focusout', e => { if (!tile(e.relatedTarget)) rest(); });

  // The dozen pops in round the dial. The outline draws in with it, then fades.
  function arrive() {
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
  // The kind of selection light: ?glow names one; ?dev shows a switch (keys 1 to 3).
  const query = new URLSearchParams(location.search);
  let pills = [];
  function light(kind, keep = false) {
    face.dataset.glow = kind;
    pills.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.glow === kind)));
    if (keep) try { localStorage.setItem(GLOW_KEY, kind); } catch (e) { /* no storage */ }
  }
  if (query.has('dev')) {
    const bar = Object.assign(document.createElement('div'), { className: 'clock-dev' });
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', 'Selection light');
    bar.innerHTML = GLOWS.map((g, i) => `<button type="button" data-glow="${g}" title="Key ${i + 1}">${g}</button>`).join('');
    document.body.append(bar);
    pills = /** @type {HTMLElement[]} */ ([...bar.children]);
    bar.addEventListener('click', e => { const b = /** @type {HTMLElement} */ (e.target).closest('button'); if (b) light(b.dataset.glow, true); });
  }
  let kept = null;
  try { kept = localStorage.getItem(GLOW_KEY); } catch (e) { /* no storage */ }
  light(GLOWS.includes(query.get('glow')) ? query.get('glow') : GLOWS.includes(kept) ? kept : GLOWS[0]);
  addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key.toLowerCase() === 'r') roll();
    if (pills.length && GLOWS[+e.key - 1]) light(GLOWS[+e.key - 1], true);
  });
  // The Re-roll stays away for the first five seconds.
  setTimeout(() => button.setAttribute('data-on', ''), 5000);

  // Left alone, the clock runs by itself: each hour puts its toy on the tube in turn.
  // After two laps it stops, so an empty room burns no power.
  const WAIT = 12000, BEAT = 3600, LAPS = 2;
  let idle = 0, beat = 0, at = -1, beats = 0, solo = false;
  function tick() {
    if (document.visibilityState !== 'visible' || busy) return;
    if (beats++ >= HOURS * LAPS) return sleep();
    at = (at + 1) % HOURS;
    aim(at * 30);
    live(true);
    show(dozen()[at]);
  }
  function sleep() {
    clearInterval(beat);
    if (solo) { solo = false; rest(); }
  }
  function alone() {
    if (still.matches || face.hasAttribute('data-live')) return;
    solo = true;
    at = -1;
    beats = 0;
    tick();
    beat = setInterval(tick, BEAT);
  }
  // Any sign of a visitor stops the show and starts the wait again.
  function wake() {
    clearTimeout(idle);
    sleep();
    idle = setTimeout(alone, WAIT);
  }
  ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(type => addEventListener(type, wake, { passive: true }));

  deal();
  root.dataset.clock = 'on';
  arrive();
  wake();
}
