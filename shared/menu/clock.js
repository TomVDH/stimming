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
  // A phone in portrait shows the dozen as a grid, with no dial, comet or tube (Tom, 2026-11-17).
  const flatQ = matchMedia('(max-width: 640px) and (orientation: portrait)');
  const flat = () => flatQ.matches;
  // No motion with reduced motion, without GSAP, in a hidden tab, or in the grid.
  const calm = () => !gsap || still.matches || document.visibilityState !== 'visible' || flat();

  // The face lies under the toys: the comet and the middle.
  const face = Object.assign(document.createElement('div'), { className: 'clock-face' });
  face.innerHTML = `<canvas class="clock-comet" aria-hidden="true"></canvas>
<div class="clock-mid">
  <div class="clock-plate" aria-hidden="true"></div>
  <p class="clock-name" aria-live="polite"></p>
  <p class="clock-tag"></p>
</div>`;
  shelf.after(face);
  // The Re-roll stands in the clock, low in the middle.
  const button = Object.assign(document.createElement('button'), { type: 'button', className: 'clock-roll', title: 'Re-roll (R)' });
  button.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="1.8" y="1.8" width="12.4" height="12.4" rx="3"/><circle cx="5.4" cy="5.4" r="1.1"/><circle cx="10.6" cy="10.6" r="1.1"/><circle cx="8" cy="8" r="1.1"/></svg>Re-roll';
  face.append(button);
  const title = face.querySelector('.clock-name'), tag = face.querySelector('.clock-tag');

  // The tube shows the toy's still in the middle; the Clock works without it.
  let bg = null;
  // The grid has no tube, so a phone builds no shader for it.
  const tubeReady = flat() ? Promise.resolve() : import('./tube.js').then(m => m.tube(/** @type {HTMLElement} */ (face.querySelector('.clock-plate')), () => face.clientWidth)).then(t => {
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
  // A held toy waits in the menu's own grainy blur; it comes in when the hold ends.
  // The hold is ours: the menu's reveal can mark a toy `is-in` at any time, so it cannot hold it.
  const hold = (li, on, delay = 0) => {
    const toy = /** @type {HTMLElement} */ (li.querySelector('.toy'));
    toy.classList.add('is-in');
    toy.style.setProperty('--d', delay.toFixed(2) + 's');
    li.toggleAttribute('data-hold', on);
  };
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
      // A dealt toy is held from the start, so it never shows before the comet drops it off.
      hold(li, !calm());
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
  // The toys take no hover and no focus while the intro plays (Tom); `shy` holds them.
  let shy = false;
  // A touch has no hover. The first tap on a toy shows it; a second tap opens it.
  // The tap gives the toy focus, so the focus path below shows it and plays its icon.
  let poke = '', before = null;
  addEventListener('pointerdown', e => {
    poke = e.pointerType;
    // Some browsers focus a link on the tap itself; the focus from before the tap counts.
    before = document.activeElement;
    // A tap away from the toys puts the toy in hand down.
    const held = tile(document.activeElement);
    if (poke === 'touch' && held && !tile(e.target)) /** @type {HTMLElement} */ (document.activeElement).blur();
  }, true);
  shelf.addEventListener('click', e => {
    const li = tile(e.target);
    // In the grid a tap opens the toy at once.
    if (!li || poke !== 'touch' || flat()) return;
    const link = /** @type {HTMLElement} */ (li.querySelector('a.toy'));
    if (before === link) return;
    e.preventDefault();
    link.focus({ preventScroll: true });
  });
  shelf.addEventListener('pointerover', e => {
    const li = tile(e.target);
    if (!li || shy || e.pointerType === 'touch') return;
    const fresh = !face.hasAttribute('data-live');
    // The wedge starts at the toy, so it does not sweep in from afar.
    if (fresh) aim(hour(li), true);
    live(true);
    // A pointer that only passes over a toy does not change the picture.
    clearTimeout(dwell);
    if (fresh) show(li); else dwell = setTimeout(() => show(li), 45);
  });
  shelf.addEventListener('pointermove', e => {
    if (!tile(e.target) || shy) return;
    const r = face.getBoundingClientRect();
    aim(Math.atan2(e.clientX - (r.left + r.width / 2), (r.top + r.height / 2) - e.clientY) * 180 / Math.PI);
  });
  shelf.addEventListener('pointerout', e => { if (e.pointerType !== 'touch' && !tile(e.relatedTarget)) rest(); });
  shelf.addEventListener('focusin', e => {
    const li = tile(e.target);
    if (!li || shy) return;
    // The wedge starts at the toy when the middle was empty.
    aim(hour(li), !face.hasAttribute('data-live'));
    live(true);
    show(li);
  });
  shelf.addEventListener('focusout', e => { if (!tile(e.relatedTarget)) rest(); });

  // The intro: a comet runs once round the toys' own track, from twelve o'clock.
  // It drops each toy off at its hour as it passes. Its tail takes the wordmark's hues as it goes.
  const comet = /** @type {HTMLCanvasElement} */ (face.querySelector('.clock-comet')), pen = comet.getContext('2d');
  // The tail covers this share of a lap, in this many shaded steps.
  const TAIL = 0.26, STEPS = 56;
  function drawComet(a, fade) {
    const k = Math.min(devicePixelRatio || 1, 2), W = Math.round(comet.clientWidth * k);
    if (comet.width !== W) { comet.width = W; comet.height = W; }
    pen.clearRect(0, 0, W, W);
    if (fade <= 0) return;
    const at = t => {
      // The path is the toys' track, 40.5% of the face from the middle, from start to end.
      const r = W * 0.405, ang = t * Math.PI * 2;
      return [W / 2 + Math.sin(ang) * r, W / 2 - Math.cos(ang) * r];
    };
    pen.globalCompositeOperation = 'lighter';
    // The tail: dots from the oldest to the newest, wider, brighter and whiter toward the head.
    for (let i = STEPS; i >= 1; i--) {
      const t = a - TAIL * i / STEPS;
      if (t < 0) continue;
      const near = 1 - i / STEPS, [x, y] = at(t);
      const size = W * (0.003 + 0.017 * Math.pow(near, 1.5)), hue = 328 - 300 * t;
      const g = pen.createRadialGradient(x, y, 0, x, y, size * 2.4);
      g.addColorStop(0, `oklch(${(0.78 + 0.18 * near).toFixed(3)} ${(0.2 * (1 - near * 0.6)).toFixed(3)} ${hue.toFixed(1)} / ${(0.32 * near * near * fade).toFixed(3)})`);
      g.addColorStop(1, `oklch(0.7 0.2 ${hue.toFixed(1)} / 0)`);
      pen.fillStyle = g;
      pen.beginPath();
      pen.arc(x, y, size * 2.4, 0, Math.PI * 2);
      pen.fill();
    }
    // The head: a white core in a wide soft halo of the hue it is passing.
    const [x, y] = at(a), hue = 328 - 300 * a, R = W * 0.085;
    const g = pen.createRadialGradient(x, y, 0, x, y, R);
    g.addColorStop(0, `oklch(0.99 0.01 ${hue.toFixed(1)} / ${(0.95 * fade).toFixed(3)})`);
    g.addColorStop(0.08, `oklch(0.95 0.06 ${hue.toFixed(1)} / ${(0.7 * fade).toFixed(3)})`);
    g.addColorStop(0.3, `oklch(0.8 0.17 ${hue.toFixed(1)} / ${(0.22 * fade).toFixed(3)})`);
    g.addColorStop(1, `oklch(0.7 0.2 ${hue.toFixed(1)} / 0)`);
    pen.fillStyle = g;
    pen.beginPath();
    pen.arc(x, y, R, 0, Math.PI * 2);
    pen.fill();
  }
  function arrive(first = false) {
    const lis = dozen();
    // The grid fades its dozen in; with no motion the dozen simply shows.
    if (flat() && !still.matches && first) { root.dataset.clock = 'on'; fadeIn(); return; }
    if (calm()) { root.dataset.clock = 'on'; lis.forEach(li => hold(li, false)); return; }
    lis.forEach(li => hold(li, true));
    shy = true;
    // On a fresh page the set warms up to snow and switches off first; then the comet runs.
    if (first) blink().then(spin); else spin();
    function spin() {
      // The comet fades in where it starts, on the track at twelve o'clock.
      const head = { a: 0, fade: 0 }, paint = () => drawComet(head.a, head.fade);
      let came = 0;
      // The wait ends here: the CSS dot at twelve fades out as the comet fades in.
      // The dot waits through the TV's blink, so the comet's head never leaves.
      root.dataset.clock = 'on';
      // The hold ends when the comet is gone.
      gsap.timeline({ onComplete() { drawComet(0, 0); release(); } })
        .to(head, { a: 1, duration: 1.6, ease: 'sine.inOut', onUpdate() {
          paint();
          // A toy drops off as the comet reaches its hour: hour 0 at once, hour 11 at eleven o'clock.
          const h = Math.min(HOURS, Math.floor(head.a * HOURS + 0.02) + 1);
          while (came < h) hold(lis[came++], false);
        } }, 0)
        .to(head, { fade: 1, duration: 0.25, ease: 'power1.out' }, 0)
        // The comet runs on a little past twelve as it fades, so it does not stop dead.
        .to(head, { a: 1.12, fade: 0, duration: 0.6, ease: 'power1.out', onUpdate: paint }, 1.6);
    }
  }
  // The set warms up to snow, holds a moment, then switches off to a dot. Without the tube it ends at once.
  function blink() {
    if (!bg || face.hasAttribute('data-live')) return Promise.resolve();
    face.setAttribute('data-blink', '');
    return bg.blink(350).then(() => face.removeAttribute('data-blink'));
  }
  // The intro is over: a toy that is already under the pointer or in focus shows at once.
  function release() {
    shy = false;
    const li = shelf.querySelector(':scope > li:hover') || tile(document.activeElement);
    if (!li || li.hasAttribute('data-out')) return;
    aim(hour(li), true);
    live(true);
    show(li);
  }
  // The grid's dozen comes in as the old menu's did: out of a grainy blur, one after another.
  function fadeIn() {
    const lis = dozen();
    lis.forEach(li => hold(li, true));
    // Two frames let the held state paint, so the fade runs.
    requestAnimationFrame(() => requestAnimationFrame(() => lis.forEach((li, i) => hold(li, false, i * 0.05))));
  }
  function roll() {
    if (busy) return;
    if (flat() && !still.matches && document.visibilityState === 'visible') {
      // The old dozen blurs out, the new one blurs in.
      busy = true;
      dozen().forEach((li, i) => hold(li, true, i * 0.02));
      setTimeout(() => { deal(); fadeIn(); busy = false; }, 420);
      return;
    }
    if (calm()) return deal();
    busy = true;
    // The old dozen goes back into its blur in the comet's order, so the face clears round the dial.
    dozen().forEach((li, i) => hold(li, true, i * 0.03));
    setTimeout(() => { deal(); arrive(); busy = false; }, HOURS * 30 + 420);
  }
  button.addEventListener('click', roll);
  // The Re-roll stays away for the first five seconds; under the grid it shows at once.
  setTimeout(() => button.setAttribute('data-on', ''), flat() ? 0 : 5000);
  addEventListener('keydown', e => { if (e.key.toLowerCase() === 'r' && !e.metaKey && !e.ctrlKey && !e.altKey) roll(); });
  // The footer: the chip in the middle, then the warning and the disclaimer in one row (Tom). On hover or focus the name onnøzelaer
  // appears under it, letter by letter. Under that, the quips: the warning and "made with the help of ai".
  // The Clock shows no version.
  const credit = /** @type {HTMLElement | null} */ (document.querySelector('.credit'));
  const words0 = credit?.querySelector('span'), mark = credit?.querySelector('.onno'), version = credit?.querySelector('.ver');
  if (credit && words0 && mark) {
    const [line, ...rest] = words0.textContent.split('\u00b7');
    const note = rest.join('\u00b7').trim();
    const name = /onn[\u00f8o]zelaer/i.exec(line)?.[0] || 'onn\u00f8zelaer';
    const sig = Object.assign(document.createElement('span'), { className: 'clock-sig', tabIndex: 0 });
    // The whole credit stays readable to a screen reader.
    sig.setAttribute('aria-label', line.trim());
    const seal = Object.assign(document.createElement('span'), { className: 'clock-mark' });
    seal.append(mark);
    const reveal = Object.assign(document.createElement('span'), { className: 'clock-label' });
    reveal.setAttribute('aria-hidden', 'true');
    [...name].forEach((ch, i) => {
      const l = Object.assign(document.createElement('span'), { textContent: ch });
      l.style.setProperty('--i', String(i));
      reveal.append(l);
    });
    sig.append(seal, reveal);
    words0.replaceWith(sig);
    version?.remove();
    // Under the chip, one row in lower case: Tom's warning, a faded dash, the disclaimer (2026-11-17).
    const notes = Object.assign(document.createElement('span'), { className: 'clock-notes' });
    const quip = (/** @type {string} */ text) => Object.assign(document.createElement('span'), { className: 'clock-note', textContent: text });
    notes.append(quip('some of these are very wonky and may suffer from *ss performance'));
    if (note) notes.append(Object.assign(document.createElement('span'), { className: 'clock-dash', textContent: '\u2014', ariaHidden: 'true' }), quip(note.toLowerCase()));
    sig.after(notes);
    credit.setAttribute('data-inline', '');
    // The glow is a small shader; without WebGL2 the footer keeps its CSS glow.
    // It starts after the intro, so its shader build does not stall the comet.
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
    if (still.matches || flat() || face.hasAttribute('data-live')) return;
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
  // The dozen stands, out of sight; the wait goes on until the comet starts.
  root.dataset.clock = 'wait';
  // The intro waits for the tube, so its shader build does not stall the sweep. A timer, not a frame:
  // a hidden tab gets no frames. Until then the dozen is out of sight.
  if (!calm()) dozen().forEach(li => hold(li, true));
  const after = ms => new Promise(r => setTimeout(r, ms));
  // The wordmark drops in when its fonts are in; the TV comes in just after it, not with it.
  const lettered = new Promise(r => {
    if (root.dataset.fonts !== 'wait') return r();
    new MutationObserver((_, o) => { if (root.dataset.fonts !== 'wait') { o.disconnect(); r(); } }).observe(root, { attributes: true, attributeFilter: ['data-fonts'] });
  }).then(() => after(300));
  Promise.all([Promise.race([tubeReady, after(900)]), lettered]).then(() => setTimeout(() => arrive(true), 40));
  wake();
}
