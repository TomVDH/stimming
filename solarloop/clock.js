// Star catalog: the time clock (Tom, 2026-11-24).
// It counts the star's own time from the moment it shows, so the turn's speed-up reads as days and weeks.
// It shows on a rate change and when the star card plays, and leaves after SHOW ms.

const RM = matchMedia('(prefers-reduced-motion: reduce)');
const SHOW = 20000;
const h = (tag, cls) => {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  return el;
};
const MIN = 60, HOUR = 3600, DAY = 86400, WEEK = 7 * DAY, MONTH = 30.44 * DAY, YEAR = 365.25 * DAY;
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
// Two units; a zero second unit is left out.
const two = (s, u1, w1, u2, w2) => {
  const a = Math.floor(s / u1), b = Math.floor(s % u1 / u2);
  return b ? `${plural(a, w1)} ${plural(b, w2)}` : plural(a, w1);
};

/**
 * Elapsed time in words: the two largest units that matter.
 * @param {number} s Seconds of the star's time.
 */
export function elapsed(s) {
  if (s < MIN) return plural(Math.floor(s), 'second');
  if (s < HOUR) return plural(Math.floor(s / MIN), 'minute');
  if (s < DAY) return two(s, HOUR, 'hour', MIN, 'minute');
  if (s < 2 * WEEK) return two(s, DAY, 'day', HOUR, 'hour');
  if (s < 3 * MONTH) return two(s, WEEK, 'week', DAY, 'day');
  if (s < 2 * YEAR) return two(s, MONTH, 'month', WEEK, 'week');
  return two(s, YEAR, 'year', MONTH, 'month');
}
// One second here in the star's time, in words.
const perSecond = r => r < 1.5 ? 'real time' : `a second here is ${r < 3600 ? `${Math.round(r / 60)} minutes` : `${+(r / 3600).toFixed(1)} hours`}`;

/**
 * Builds the clock on the stage's frame.
 * @param {{ frame: HTMLElement, cover: () => { top: number, bottom: number } }} o
 */
export function makeClock(o) {
  const link = h('link');
  link.rel = 'stylesheet';
  link.href = new URL('clock.css', import.meta.url).href;
  document.head.append(link);

  const el = h('div', 'sl-clock');
  el.hidden = true;
  el.setAttribute('aria-hidden', 'true');
  const big = h('p', 'sl-clock-t'), small = h('p', 'sl-clock-k');
  el.append(big, small);
  o.frame.append(el);

  let t0 = 0, until = 0, timer = 0, lastText = '';
  function hide() {
    if (el.hidden) return;
    el.classList.add('is-leaving');
    clearTimeout(timer);
    timer = setTimeout(() => { el.hidden = true; el.classList.remove('is-leaving'); }, RM.matches ? 0 : 1200);
  }
  return {
    /** Starts the count from the star's time now. @param {number} turn @param {number} rate */
    show(turn, rate) {
      t0 = turn;
      until = performance.now() + SHOW;
      clearTimeout(timer);
      el.style.setProperty('--foot', `${o.cover().bottom}px`);
      el.classList.remove('is-leaving');
      el.hidden = false;
      this.tick(turn, rate);
    },
    /** Shows the time passed since show; true while the clock stands. */
    tick(turn, rate) {
      if (el.hidden || el.classList.contains('is-leaving')) return false;
      if (performance.now() > until) { hide(); return false; }
      const t = `+ ${elapsed(Math.max(0, turn - t0))}`, k = perSecond(rate);
      if (t !== lastText) { big.textContent = t; lastText = t; }
      if (small.textContent !== k) small.textContent = k;
      return true;
    },
    hide,
  };
}
