// @ts-check
// Time of day: one hour drives the sun, the moon, the light, the stars and the lamps.
// Every value is a plain number or array: raw WebGL2, three.js and Canvas 2D read it alike.
// The sky palette stays in sky.js; dayAt() returns it as `sky`.
// Colours are linear RGB. A Canvas 2D toy converts them with linFit() and css() from stim.js.
//
// Use:
//   const d = dayAt(HOURS.dusk);       // sun, moon, day, stars, lamps, light, level, ambient, sky
//   gl.uniform3fv(u.uSunD, d.sun);     // raw WebGL2
//   sun.position.fromArray(d.sun);     // three.js
// A Bar choice with an eased change:
//   const clock = dayClock({ hour: HOURS.night });
//   clock.to('dawn');                  // a preset name or an hour
//   if (reduced()) clock.snap();       // no ease with reduced motion
//   if (clock.step(dt)) wake();        // true while the hour moves
//   const d = clock.at();
// The local real clock:
//   clock.follow(true);                // step() then reads the hour from the device
// Sources: sky.js (sun, day, stars, palette), Tornado (sun colour), Railgun (moon colour),
// Lanterns (the ease), Train ride (lamps), Canal (photocells).
import { skyAt } from './sky.js';

/**
 * The hour for each named time. Each value comes from a toy's own Bar choice.
 * dawn, dusk and night are Fog horn's; blue is Lanterns'; afternoon and golden are Tornado's; day is Carwash's noon.
 * @type {Readonly<Record<'dawn' | 'day' | 'afternoon' | 'golden' | 'dusk' | 'blue' | 'night', number>>}
 */
export const HOURS = Object.freeze({ dawn: 6.2, day: 12.5, afternoon: 16, golden: 18.3, dusk: 19.3, blue: 20.6, night: 23 });

/** @typedef {keyof typeof HOURS} DayPreset */

/**
 * The time of day at one hour. Every value is ready for a uniform.
 * @typedef {object} Daytime
 * @property {number} hour 0 to 24.
 * @property {number[]} sun Unit direction to the sun; y is up. It rises on the left and sets on the right.
 * @property {number[]} moon Unit direction to the moon. It stands opposite the sun, as a full moon.
 * @property {number} elevation The sun's height above the horizon, in radians.
 * @property {number} sunUp 0 with the sun under the horizon, 1 above it; the change spans 3 degrees.
 * @property {number} moonUp The same for the moon.
 * @property {number} day 0 at night, 1 in full daylight. The same value as skyAt(hour).day.
 * @property {number} stars 0 to 1. The same value as skyAt(hour).stars.
 * @property {number} lamps 0 by day, 1 at night: 1 - day.
 * @property {number[]} light The key light's colour, linear RGB, brightest channel 1. It follows `day`, from the sun to the moon.
 * @property {number} level The key light's level: 1 in full day, 0.16 under a full moon.
 * @property {number[]} ambient The fill from the sky: the zenith colour, linear RGB.
 * @property {import('./sky.js').SkyPalette & { sun: number[] }} sky The sky palette from skyAt(hour).
 */

const clamp = (/** @type {number} */ x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const sstep = (/** @type {number} */ a, /** @type {number} */ b, /** @type {number} */ x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const RAD = Math.PI / 180;
// Railgun's moonlight: cool and dim.
const MOON = [0.09, 0.11, 0.16];

/**
 * An hour wrapped into 0 to 24.
 * @param {number} hour
 * @returns {number}
 */
export const wrapHour = hour => { const r = hour % 24; return r < 0 ? r + 24 : r; };

/**
 * The hour on the device's local clock, with minutes and seconds as a fraction.
 * @param {Date} [date]
 * @returns {number}
 */
export const localHour = (date = new Date()) => date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;

/**
 * The time of day at an hour.
 * @param {number} hour 0 to 24; other values wrap.
 * @returns {Daytime}
 */
export function dayAt(hour) {
  // skyAt gets the raw hour, so every shared value is bit for bit its own.
  const sky = skyAt(hour), sun = sky.sun, day = sky.day;
  // The moon at hour + 12 mirrors the sun's x and y.
  const moon = [-sun[0], -sun[1], sun[2]];
  const elevation = Math.asin(clamp(sun[1], -1, 1));
  const sunUp = sstep(-1.5 * RAD, 1.5 * RAD, elevation), moonUp = sstep(-1.5 * RAD, 1.5 * RAD, -elevation);
  // The key light follows the palette's daylight, not the sun's height.
  // sky.js sets the sun at 18:00 but keeps last light until 18:30.
  // Tornado's sun colour: warm and weak at last light, white in full day.
  const g = 0.5 + 0.5 * day;
  const sunCol = [0.45 + 0.55 * g, 0.2 + 0.7 * g * g, 0.08 + 0.72 * day * day];
  // Under day 0.3 (the palette's last light and dawn), the moon takes over.
  const w = sstep(0, 0.3, day);
  const rgb = sunCol.map((c, i) => c * w + MOON[i] * moonUp * (1 - w));
  const level = Math.max(rgb[0], rgb[1], rgb[2]);
  return {
    hour: wrapHour(hour), sun, moon, elevation, sunUp, moonUp,
    day, stars: sky.stars, lamps: 1 - day,
    light: level > 0 ? rgb.map(c => c / level) : [0, 0, 0], level,
    ambient: sky.zen.slice(),
    sky,
  };
}

/**
 * One lamp's photocell: 0 while off, 1 once on. Give each lamp its own mark for a staggered switch.
 * @param {number} dark How dark it is, 0 to 1; pass 1 - day, or a toy's own dusk value.
 * @param {number} mark The darkness where this lamp starts to come on.
 * @param {number} [width] How far past the mark the lamp reaches full light.
 * @returns {number}
 */
export const photocell = (dark, mark, width = 0.025) => sstep(mark, mark + width, dark);

/**
 * A clock that eases the hour toward a target.
 * @typedef {object} DayClock
 * @property {number} hour The current hour, 0 to 24.
 * @property {number} target The hour the clock eases to, 0 to 24.
 * @property {boolean} moving True while the hour is still on its way.
 * @property {(to: DayPreset | number) => void} to Sets the target: a preset name or an hour. An unknown name changes nothing.
 * @property {() => void} snap Jumps to the target at once.
 * @property {(dt: number) => boolean} step Moves the hour by dt seconds; returns `moving`.
 * @property {(on: boolean) => void} follow True: each step sets the hour from the local clock, with no ease.
 * @property {() => Daytime} at The time of day at the current hour.
 */

/**
 * A clock for one toy's hour.
 * @param {{ hour?: DayPreset | number, tau?: number, wrap?: boolean }} [opts]
 *   hour: the start, a preset name or an hour (HOURS.night by default).
 *   tau: the ease's time constant in seconds (0.6: Lanterns' 2 s change).
 *   wrap: true takes the short way round midnight; false always moves straight along 0 to 24.
 * @returns {DayClock}
 */
export function dayClock({ hour = HOURS.night, tau = 0.6, wrap = true } = {}) {
  const of = (/** @type {DayPreset | number} */ v) => (typeof v === 'number' ? v : HOURS[v]);
  // h and t stay unwrapped, so the ease runs past midnight without a jump.
  let h = of(hour) ?? HOURS.night, t = h, live = false;
  const aim = (/** @type {number} */ x) => {
    t = x;
    // The short way round: move the target by whole days toward the hour.
    if (wrap) while (Math.abs(t - h) > 12) t += t < h ? 24 : -24;
  };
  return {
    get hour() { return wrapHour(h); },
    get target() { return wrapHour(t); },
    // Lanterns' mark: under 0.004 hours the change no longer shows.
    get moving() { return Math.abs(t - h) > 0.004; },
    to(v) { const x = of(v); if (Number.isFinite(x)) aim(x); },
    snap() { h = t; },
    step(dt) {
      if (live) { aim(localHour()); h = t; return false; }
      h += (t - h) * (1 - Math.exp(-dt / tau));
      return this.moving;
    },
    follow(on) { live = on; },
    at() { return dayAt(h); },
  };
}
