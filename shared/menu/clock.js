// The Clock: the menu's default view. Twelve toys stand on a dial.
// A Re-roll deals twelve more. ?all shows the whole shelf instead.
const HOURS = 12;
// The toys that have a moving loop in shared/loops/; index.json there names them.
let loops = new Set(['fire']);
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

  // The face lies under the toys: the outline and the middle.
  const ticks = Array.from({ length: 60 }, (_, i) => `<line x1="100" y1="44.5" x2="100" y2="${i % 5 ? 47.5 : 49.5}" transform="rotate(${i * 6} 100 100)"/>`).join('');
  const face = Object.assign(document.createElement('div'), { className: 'clock-face' });
  face.innerHTML = `<svg class="clock-ring" viewBox="0 0 200 200" aria-hidden="true"><circle class="rim" cx="100" cy="100" r="58" pathLength="1" transform="rotate(-90 100 100)"/><g class="ticks">${ticks}</g></svg>
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
  const ring = face.querySelector('.clock-ring'), rim = /** @type {SVGElement} */ (ring.querySelector('.rim')), marks = /** @type {SVGElement[]} */ ([...ring.querySelectorAll('line')]);
  const title = face.querySelector('.clock-name'), tag = face.querySelector('.clock-tag');

  // The tube shows the toy's still in the middle; the Clock works without it.
  let bg = null;
  const tubeReady = import('./tube.js').then(m => m.tube(/** @type {HTMLElement} */ (face.querySelector('.clock-plate')), () => face.clientWidth)).then(t => {
    bg = t;
    if (!bg) return;
    // The tube draws the words itself; the page's own words stay for screen readers.
    face.setAttribute('data-tube', '');
    if (shown) bg.show(picture(shown), film(shown), words(shown));
    bg.live(face.hasAttribute('data-live'));
  // A tube that fails to build leaves the page's own words; the console says why.
  }).catch(e => console.warn('Clock tube:', e));
  fetch('shared/loops/index.json').then(r => r.json()).then(ids => { if (Array.isArray(ids)) loops = new Set(ids); }).catch(() => {});
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
  const film = li => { const id = li.querySelector('a.toy').id; return loops.has(id) ? `shared/loops/${id}.mp4` : null; };
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
  let shown = null, wipe = 0, dwell = 0;
  function words(li) {
    const toy = toys[li.querySelector('a.toy').id] || {}, label = li.querySelector('.name');
    return { name: toy.name || [...label.childNodes].filter(c => c.nodeType === 3).map(c => c.textContent).join('').trim(), tag: toy.tag || '' };
  }
  function write(li) {
    const said = words(li);
    title.textContent = said.name;
    tag.textContent = said.tag;
    bg?.caption(said);
  }
  function show(li) {
    clearTimeout(wipe);
    shelf.querySelector('[data-held]')?.removeAttribute('data-held');
    li.setAttribute('data-held', '');
    if (li === shown) return;
    shown = li;
    const said = words(li);
    title.textContent = said.name;
    tag.textContent = said.tag;
    bg?.show(picture(li), film(li), said);
    // Without the tube, the page's own words rise into their lines.
    if (!bg && !still.matches) [title, tag].forEach((el, i) => el.animate([{ opacity: 0, translate: '0 10px' }, { opacity: 1, translate: '0 0' }], { duration: 420, delay: i * 60, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'backwards' }));
  }
  // The middle empties when the toy leaves the hand.
  function rest(now = false) {
    clearTimeout(dwell);
    live(false);
    shelf.querySelector('[data-held]')?.removeAttribute('data-held');
    clearTimeout(wipe);
    const empty = () => { if (face.hasAttribute('data-live')) return; shown = null; bg?.clear(); };
    // The picture goes only after its fade, so no edge shows.
    if (now) empty(); else wipe = setTimeout(empty, 650);
  }

  // The tube masks its picture away in a soft wedge toward the pointer's bearing from the middle.
  const aim = (deg, snap = false) => bg?.aim(deg, snap);
  const hour = li => dozen().indexOf(li) * 30;
  // The toy's list item under an event's target, or null.
  const tile = node => /** @type {Element | null} */ (node)?.closest?.('main > .shelf > li') ?? null;
  shelf.addEventListener('pointerover', e => {
    const li = tile(e.target);
    if (!li) return;
    const fresh = !face.hasAttribute('data-live');
    // The wedge starts at the toy, so it does not sweep in from afar.
    if (fresh) aim(hour(li), true);
    live(true);
    // A pointer that only passes over a toy does not change the picture.
    clearTimeout(dwell);
    if (fresh) show(li); else dwell = setTimeout(() => show(li), 45);
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

  // The intro: a bright head runs once round the rim. The minute marks light behind it,
  // and each toy arrives as the head passes its hour. Then the outline fades.
  const sweep = Object.assign(document.createElement('div'), { className: 'clock-sweep' });
  sweep.setAttribute('aria-hidden', 'true');
  ring.after(sweep);
  function arrive(first = false) {
    // With no motion the dozen simply shows.
    if (calm()) { if (gsap) gsap.set(objs(), { clearProps: 'opacity,visibility' }); return; }
    const icons = objs(), head = { a: 0 };
    let lit = 0, came = 0;
    gsap.set(icons, { scale: 0.2, autoAlpha: 0, rotation: -24 });
    gsap.set(marks, { opacity: 0 });
    // The rim starts empty, so no full circle flashes before the head moves.
    rim.style.strokeDashoffset = '1';
    gsap.set([ring, sweep], { opacity: 1 });
    gsap.timeline({ onComplete: () => gsap.set(icons, { clearProps: 'transform,opacity,visibility' }) })
      .to(head, { a: 1, duration: 1.5, ease: 'sine.inOut', onUpdate() {
        rim.style.strokeDashoffset = String(1 - head.a);
        sweep.style.setProperty('--a', (head.a * 360).toFixed(1) + 'deg');
        const m = Math.min(60, Math.round(head.a * 60));
        while (lit < m) marks[lit++].style.opacity = '1';
        // Hour 0 comes at once; hour 11 just before the head ends its lap.
        const h = Math.min(HOURS, Math.round(head.a * HOURS) + 1);
        while (came < h) gsap.to(icons[came++], { scale: 1, autoAlpha: 1, rotation: 0, duration: 0.55, ease: 'back.out(1.8)' });
      } }, 0)
      .to(sweep, { opacity: 0, duration: 0.5, ease: 'power1.out' }, 1.35)
      .to(ring, { opacity: 0, duration: 1.2, ease: 'power2.inOut' }, 1.7)
      // On a fresh page the set warms up to snow once, then switches off.
      .add(() => { if (first) blink(); }, 1.45);
  }
  function blink() {
    if (!bg || face.hasAttribute('data-live')) return;
    face.setAttribute('data-blink', '');
    bg.blink().then(() => face.removeAttribute('data-blink'));
  }
  function roll() {
    if (busy) return;
    if (calm()) return deal();
    busy = true;
    const old = objs();
    // The old dozen leaves in the head's order, so the face clears round the dial.
    gsap.to(old, { scale: 0.3, autoAlpha: 0, rotation: 24, duration: 0.22, ease: 'power2.in', stagger: 0.035, onComplete() {
      gsap.set(old, { clearProps: 'transform,opacity,visibility' });
      deal();
      arrive();
      busy = false;
    } });
  }
  button.addEventListener('click', roll);
  // The Re-roll stays away for the first five seconds.
  setTimeout(() => button.setAttribute('data-on', ''), 5000);
  addEventListener('keydown', e => { if (e.key.toLowerCase() === 'r' && !e.metaKey && !e.ctrlKey && !e.altKey) roll(); });
  // The footer: the mark sits in the credit line, in place of its own name.
  const credit = /** @type {HTMLElement | null} */ (document.querySelector('.credit'));
  const words0 = credit?.querySelector('span'), mark = credit?.querySelector('.onno'), version = credit?.querySelector('.ver');
  if (credit && words0 && mark) {
    const [before, after] = words0.textContent.split(/onn[\u00f8o]zelaer/i);
    if (after !== undefined) {
      const holder = Object.assign(document.createElement('span'), { className: 'clock-mark' });
      holder.append(mark);
      // The version stays the mark's next sibling: the menu's hover rule needs that.
      if (version) holder.append(version);
      words0.textContent = before.trim();
      words0.after(holder, Object.assign(document.createElement('span'), { textContent: after.trim() }));
      credit.setAttribute('data-inline', '');
    }
    // The glow is a small shader; without WebGL2 the footer keeps its CSS glow.
    // It starts after the intro, so its shader build does not stall the sweep.
    setTimeout(() => import('./mesh.js').then(m => m.mesh(credit)).then(ok => { if (ok) credit.setAttribute('data-mesh', ''); }).catch(e => console.warn('Clock mesh:', e)), 2600);
  }

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
  // The intro waits for the tube, so its shader build does not stall the sweep. A timer, not a frame:
  // a hidden tab gets no frames. Until then the dozen is out of sight.
  if (!calm()) gsap.set(objs(), { autoAlpha: 0 });
  Promise.race([tubeReady, new Promise(r => setTimeout(r, 900))]).then(() => setTimeout(() => arrive(true), 40));
  wake();
}
