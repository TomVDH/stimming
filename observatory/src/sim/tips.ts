// Help text for both telescopes, written for a first-time visitor.
// Each tip says what a thing is, why it matters, and what to try.
// Tips read the state now, so their numbers are tonight's.
import { APERTURE_MM, EYEPIECES, magnification, trueField } from './optics.ts';
import { PIXEL_ARCSEC, type Filter } from './rig.ts';

// try: one thing to do now, shown apart in the tip.
export type Tip = { title: string; text: string; try?: string };

// The 1 m's state, as the program's tips read it.
export type Ctx = {
  alt: number; air: number; ha: number; lst: string; fwhm: number;
  hfr: number; hfrBest: number; focus: number;
  tracking: boolean; slewing: boolean; guiding: boolean; rms: number;
  exposure: number; filter: Filter; subs: number; looping: boolean; max: number;
  temp: number; coolerSet: number; coolerPower: number;
  night: boolean; tipsOn: boolean;
  sel: null | { name: string; galaxy: boolean; snr: number };
};

const f1 = (v: number): string => v.toFixed(1);
const f2 = (v: number): string => v.toFixed(2);
// A full 16-bit pixel reads 65535.
const SATURATED = 65000;
// What each filter lets through, in plain words.
export const FILTER_SAYS: Record<Filter, string> = {
  L: 'L lets all visible light through',
  R: 'R lets only red light through',
  G: 'G lets only green light through',
  B: 'B lets only blue light through',
  'Hα': 'Hα lets through only the deep red glow of hydrogen gas',
};

/* ---------- the 1 m's program ---------- */
const PROGRAM: Record<string, (c: Ctx) => Tip> = {
  title: (c) => ({
    title: 'Two clocks',
    text: `Observatories keep two clocks. UTC is world time, stamped on every picture. LST, star time, says which part of the sky is due south right now: ${c.lst}. A target whose RA matches it is at its highest, the best moment to photograph it.`,
  }),
  roof: () => ({
    title: 'The roof',
    text: 'The roof is open to the sky. At a real observatory a weather station watches for wind, rain and dew, and shuts the roof by itself before anything gets wet.',
  }),
  image: (c) => ({
    title: 'Your picture',
    text: `This is what the camera has collected. One short exposure is grainy, so the software keeps adding new ones on top. The stars stay put while the random grain averages out: that is called stacking. ${c.subs} exposures so far, about ${f1(Math.sqrt(Math.max(1, c.subs)))} times smoother than one.`,
    try: 'Click a star or galaxy to study its light. Double-click to move the telescope there. Scroll to zoom.',
  }),
  imageFlaws: () => ({
    title: 'Flaws in the picture',
    text: 'Every real camera adds its own marks. White dots that never move are hot pixels. A short bright streak in one exposure is a cosmic ray, a particle from space hitting the chip. A bright line up and down from a very bright star is a bleed: the pixels overflowed and the charge spilled along the column. The faint dark rings are shadows of dust on the filter, and the corners are darker because less light reaches them.',
    try: 'Zoom in on a bright star and look for its bleed line.',
  }),
  fit: () => ({
    title: 'Fit',
    text: 'Shows the whole picture the camera takes: a patch of sky almost as wide as the full Moon.',
    try: 'Click, or press F.',
  }),
  one: () => ({
    title: 'True size',
    text: `Shows the picture at its real sharpness: one camera pixel to one screen pixel. Each pixel covers ${f2(PIXEL_ARCSEC)} arcseconds of sky, the size of a coin seen from 20 km away.`,
    try: 'Click, or press Z.',
  }),
  zoom: () => ({
    title: 'Zoom',
    text: 'Makes the picture bigger on the screen. It is a magnifying glass on what the camera already took: it cannot add detail the camera did not catch.',
    try: 'Scroll over the picture, or press + and -.',
  }),
  starsOverlay: () => ({
    title: 'Find the stars',
    text: 'Draws a box round every star the software finds on its own. The computer measures these stars to judge focus and to keep the telescope steady.',
    try: 'Click to switch the boxes on and off.',
  }),
  stats: (c) => ({
    title: 'Picture numbers',
    text: `The camera counts the light in each pixel, from 0 to 65,535. MEAN and MED are a typical patch of dark sky, SD is how grainy it is, MAX is the brightest pixel. ${c.max >= SATURATED ? 'MAX is at the top right now: a star has overflowed and lost its detail.' : 'If MAX reaches the top, a star has overflowed and lost its detail.'} HFR is the size of an average star, in pixels: smaller means sharper.`,
    try: c.max >= SATURATED ? 'Shorten the exposure time with < in the CAMERA box.' : undefined,
  }),
  log: () => ({
    title: 'The log',
    text: 'A diary of everything the telescope does, with the time. Light blue lines that start with TIP are hints: the software noticed something you can improve.',
  }),
  radec: () => ({
    title: 'Sky address',
    text: 'RA and Dec work like longitude and latitude, but drawn on the sky. Every star has a fixed address, so astronomers anywhere in the world can point at the same thing. RA counts in hours, Dec in degrees.',
  }),
  ha: (c) => ({
    title: 'Hour angle',
    text: `How long ago the target was at its highest. ${c.ha < 0 ? `It is still climbing, ${f1(-c.ha)} hours to go.` : `It passed its highest ${f1(c.ha)} hours ago and is sinking.`} The higher a target, the less air its light crosses, and the sharper the picture.`,
  }),
  altaz: (c) => ({
    title: 'Height in the sky',
    text: `ALT is how high the telescope points: 0° at the horizon, 90° straight up. AZ is the compass direction. X, the air mass, counts how much air the light crosses: 1.0 straight up, about 2 at 30°. Now it is ${f2(c.air)}. ${c.air > 2 ? 'That is a lot of air: the target will look blurred and dim.' : ''}`,
    try: c.air > 2 ? 'Pick a higher target in the TARGETS list.' : undefined,
  }),
  track: (c) => (c.slewing
    ? { title: 'Moving', text: 'The telescope is swinging to a new target at full speed. When it gets there it settles, then starts tracking.' }
    : c.tracking
      ? {
        title: 'Tracking',
        text: 'The Earth turns, so the stars drift across the sky, one full turn a day. The mount turns the telescope just as fast the other way, so the stars stay still during long exposures.',
        try: 'Click, or press T, to switch it off and watch the stars smear.',
      }
      : {
        title: 'Tracking is off',
        text: 'The sky is drifting west by 15 arcseconds every second, so each exposure smears the stars into lines.',
        try: 'Click, or press T, to switch tracking back on.',
      }),
  seeing: (c) => ({
    title: 'Seeing',
    text: `The air above the telescope is never still. Warm and cold pockets bend starlight like the shimmer over a hot road, so every star blurs to about ${f1(c.fwhm)} arcseconds. That is why big telescopes sit on high mountains, and why some use a mirror that bends hundreds of times a second to undo the blur.`,
  }),
  guide: (c) => (c.guiding
    ? {
      title: 'Autoguiding',
      text: `Tracking is never perfect: gears wobble and the mount drifts. A second small camera watches one star every second and nudges the telescope back. What is left over is ${f2(c.rms)} arcseconds, ${c.rms < c.fwhm / 2 ? 'well under the blur from the air, so you cannot see it.' : 'big enough to stretch the stars a little.'}`,
      try: 'Click, or press F8, to switch it off and see what happens.',
    }
    : {
      title: 'Guiding is off',
      text: `Nothing corrects the mount now. Its gears wobble and it slowly drifts, so the stars turn into short lines. The error is ${f2(c.rms)} arcseconds and growing.`,
      try: 'Click, or press F8, to switch guiding back on.',
    }),
  state: (c) => ({
    title: 'The camera',
    text: c.looping ? `The camera takes one ${c.exposure}-second exposure after another and adds each one to your picture. The bar shows how far the current one has got.` : 'The camera is resting.',
    try: `Press Space or F3 to ${c.looping ? 'stop' : 'start'}.`,
  }),
  exposure: (c) => ({
    title: 'Exposure time',
    text: `How long the camera collects light for each picture: ${c.exposure} seconds. Longer catches fainter things, but bright stars overflow and any wobble shows. Astronomers usually take many shorter exposures and stack them.${c.filter === 'Hα' && c.exposure < 30 ? ' The Hα filter lets very little light through, so it needs longer ones.' : ''}`,
    try: 'Click < and > to change it.',
  }),
  stack: () => ({
    title: 'Stack',
    text: 'How many exposures have been added together. Rst empties the stack and starts again. Moving the telescope, refocusing or changing the filter starts a new stack too.',
  }),
  filter: (c) => ({
    title: 'Colour filters',
    text: `An astronomy camera sees only brightness, not colour. For a colour picture it shoots through red (R), green (G) and blue (B) filters in turn, and a computer combines them. L lets all light through, for the faintest detail. Hα lets through only the glow of hydrogen gas, what nebulae are made of. Now: ${FILTER_SAYS[c.filter]}.`,
    try: 'Click a filter and watch the picture change.',
  }),
  ccd: (c) => ({
    title: 'Camera temperature',
    text: `The camera chip is cooled far below freezing. Warmth makes the chip invent false light, called dark current, which looks like extra grain, and it doubles every 6 °C. Now ${f1(c.temp)} °C. ${c.temp > c.coolerSet + 0.5 ? 'It is still cooling down.' : 'It is cold enough.'}`,
    try: c.temp > c.coolerSet + 0.5 ? 'Wait a minute before long exposures.' : undefined,
  }),
  cooler: (c) => ({
    title: 'Cooling target',
    text: `The cooler holds the chip at ${c.coolerSet} °C. Colder means cleaner pictures, but the cooler works harder: it runs at ${Math.round(c.coolerPower)}% now. Below about 90% it can hold steady all night.`,
    try: 'Click < and > to change it.',
  }),
  start: (c) => ({
    title: c.looping ? 'Stop' : 'Start',
    text: c.looping ? 'Stops taking pictures. Your stack is kept.' : 'Starts taking pictures, one after another.',
    try: 'Space or F3 does the same.',
  }),
  focus: (c) => ({
    title: 'Focus',
    text: `Like binoculars, the camera must sit exactly where the mirror makes a sharp image. POS is the focuser's position in thousandths of a millimetre. As the telescope cools through the night it shrinks a little, so focus drifts and stars grow. ${c.hfr > c.hfrBest * 1.3 ? `Stars are soft now: ${f2(c.hfr)} pixels, where ${f2(c.hfrBest)} is possible.` : 'Focus is good now.'}`,
    try: c.hfr > c.hfrBest * 1.3 ? 'Click AUTO, or press F6. Or focus by hand with < and >, watching HFR shrink.' : 'Focus by hand with < and >, or the [ and ] keys, and watch HFR.',
  }),
  autofocus: () => ({
    title: 'Autofocus',
    text: 'The software takes 9 pictures, each a little nearer or farther, and measures the stars in each. Plotted, the sizes make a V. The bottom of the V is perfect focus, and the focuser moves there.',
    try: 'Click AUTO, or press F6.',
  }),
  vcurve: () => ({
    title: 'The V',
    text: 'The result of the last autofocus: star size going up, focuser position going across. The green line marks the sharpest point.',
  }),
  targets: () => ({
    title: 'Targets',
    text: 'Things worth a look right now: bright stars, and deep fields, dark patches of sky full of faint galaxies. Only targets higher than 25° are listed; lower ones would be blurred by thick air.',
    try: 'Click one, or press 1 to 6, to point the telescope there.',
  }),
  spectro: (c) => ({
    title: 'Spectrograph',
    text: c.sel
      ? `It spreads ${c.sel.name}'s light into a rainbow, its spectrum. Dark lines in it are fingerprints of chemical elements. ${c.sel.galaxy ? 'A galaxy\'s lines are shifted toward red because the universe is expanding: the shift tells how far away it is.' : 'A star\'s lines tell its temperature.'} S/N, how clean the spectrum is, is ${Math.round(c.sel.snr)} and grows the longer you collect.`
      : 'It spreads a target\'s light into a rainbow, its spectrum. Dark lines in it are fingerprints of chemical elements: they tell a star\'s temperature, and how far away a galaxy is.',
    try: c.sel ? 'Keep the target in view while the spectrum builds.' : 'Click a star or galaxy in the picture.',
  }),
  slew: () => ({
    title: 'Go to target',
    text: 'Moves the telescope so the target you picked sits in the middle of the picture.',
    try: 'F2 does the same.',
  }),
  night: (c) => ({
    title: 'Night mode',
    text: 'Turns the whole screen red. Eyes take about 20 minutes to adjust to the dark, and red light barely spoils that, so observatories use red lights at night.',
    try: `F9 switches it ${c.night ? 'off' : 'on'}.`,
  }),
  tips: (c) => ({
    title: 'Tips',
    text: 'Hints like this one, and the TIP lines in the log. Switch them off when you know your way around.',
    try: `F1 or H switches them ${c.tipsOn ? 'off' : 'on'}.`,
  }),
};

export function programTip(id: string, c: Ctx): Tip | null {
  return PROGRAM[id]?.(c) ?? null;
}

/* ---------- the advisor ---------- */
// One condition gives one TIP line in the log.
// It may speak again only after the condition clears for a while.
// A line fits the log: 71 characters at most.
export type Advice = { id: string; when: (c: Ctx) => boolean; say: (c: Ctx) => string };

export const ADVICE: Advice[] = [
  { id: 'track', when: (c) => !c.tracking, say: () => 'TIP Tracking is off, so the stars drift and smear. Press T.' },
  { id: 'trail', when: (c) => c.tracking && !c.guiding && c.rms > 1, say: () => 'TIP Stars are smearing: guiding is off. Press F8 to switch it on.' },
  { id: 'soft', when: (c) => c.looping && c.hfr > c.hfrBest * 1.3, say: () => 'TIP Stars look blurry: focus has drifted. Press F6 to refocus.' },
  { id: 'cool', when: (c) => c.looping && c.temp > c.coolerSet + 2, say: (c) => `TIP The camera is still cooling to ${c.coolerSet} °C. Keep exposures short.` },
  { id: 'low', when: (c) => !c.slewing && c.alt < 30, say: () => 'TIP This target is low, so thick air blurs it. Pick a higher one.' },
  { id: 'sat', when: (c) => c.looping && c.max >= SATURATED && c.exposure >= 30, say: (c) => `TIP Bright stars overflow at ${c.exposure} s. Try shorter exposures.` },
  { id: 'ha', when: (c) => c.filter === 'Hα' && c.exposure < 30, say: () => 'TIP The Hα filter lets little light through. Use 30 or 60 s.' },
];

/* ---------- the refractor's case ---------- */
export type EyeCtx = { fwhm: number; dec: number; drive: boolean };

export function eyeTip(id: string, c: EyeCtx): Tip | null {
  if (/^[0-3]$/.test(id)) {
    const e = EYEPIECES[Number(id)];
    const m = Math.round(magnification(e)), tf = trueField(e).toFixed(2);
    // Above this power the air's blur grows faster than the detail.
    const useful = Math.round(400 / c.fwhm / 10) * 10;
    return [
      { title: '55 mm eyepiece: low power', text: `Magnifies ${m} times and shows a patch of sky ${tf}° wide, bigger than the full Moon. Wide and bright: the easiest view for finding things.`, try: 'Start here, then try a stronger eyepiece.' },
      { title: '40 mm eyepiece', text: `Magnifies ${m} times and shows ${tf}° of sky. Good for star clusters, and for pairs of stars that sit far apart.` },
      { title: '25 mm eyepiece', text: `Magnifies ${m} times and shows ${tf}° of sky. Good for close pairs of stars and for planets.` },
      { title: '12 mm eyepiece: high power', text: `Magnifies ${m} times. Tonight the air blurs everything beyond about ${useful} times, so this mostly makes the twinkle bigger. On a very still night it shows the finest detail the lens can give.` },
    ][Number(id)];
  }
  if (id === 'grating') {
    return {
      title: 'Rainbow grating',
      text: 'A sheet of glass ruled with thousands of fine lines. It spreads each star\'s light into a little rainbow, its spectrum. Hot stars look blue-white; cool stars look orange-red, with dark bands. Around 1900 astronomers sorted the stars into types this way: O, B, A, F, G, K, M, hottest to coolest.',
      try: 'Look at the rainbows beside the brightest stars.',
    };
  }
  if (id === 'drive') {
    if (c.drive) {
      return {
        title: 'Clock drive',
        text: 'The Earth turns, so the stars slowly slide out of view. The clock drive turns the telescope just as fast the other way. The first ones were real clockwork, driven by a falling weight.',
        try: 'Switch it off and watch the sky drift.',
      };
    }
    const field = trueField(EYEPIECES[0]);
    const s = Math.round((field * 3600) / (15 * Math.max(0.05, Math.cos((c.dec * Math.PI) / 180))));
    return {
      title: 'Clock drive off',
      text: `Now the star drifts across the view: in the 55 mm eyepiece it crosses from edge to edge in about ${s} seconds. Before clock drives, astronomers followed the stars by hand.`,
      try: 'Drag to follow the star yourself.',
    };
  }
  if (id === 'small') {
    return { title: 'Great refractor', text: `A telescope with a big glass lens, ${APERTURE_MM / 10} cm across, at the front of a 4.9 m tube. You look through it with your own eye, the way astronomers worked for three hundred years.` };
  }
  if (id === 'big') {
    return { title: '1 m reflector', text: 'A modern telescope with a curved mirror 1 m across. Nobody looks through it: a camera takes the pictures, and you run everything from a computer, like professional astronomers today.' };
  }
  return null;
}

// Splits text into lines of at most n characters.
export function wrap(text: string, n: number): string[] {
  const out: string[] = [];
  let line = '';
  for (const w of text.split(/\s+/)) {
    if (!w) continue;
    if (line && line.length + 1 + w.length > n) {
      out.push(line);
      line = w;
    } else line = line ? `${line} ${w}` : w;
  }
  if (line) out.push(line);
  return out;
}
