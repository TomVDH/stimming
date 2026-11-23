// Help text for both telescopes.
// Each tip reads the state now, so it speaks about tonight.
import { APERTURE_MM, EYEPIECES, magnification, trueField } from './optics.ts';
import { PIXEL_ARCSEC, type Filter } from './rig.ts';

export type Tip = { title: string; text: string };

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
// A full 16-bit pixel reads 65535.
const SATURATED = 65000;

/* ---------- the 1 m's program ---------- */
const PROGRAM: Record<string, (c: Ctx) => Tip> = {
  title: (c) => ({ title: 'Time', text: `UTC is the clock for every frame. LST, sidereal time, is ${c.lst}: a target with that right ascension stands on the meridian now, at its highest.` }),
  roof: () => ({ title: 'Roof', text: 'The roof is open. At a real site the weather station closes it for wind, rain or dew, and the software stops every exposure first.' }),
  image: (c) => ({ title: 'Live stack', text: `Each ${c.exposure} s sub adds to the sum, so the noise falls by the root of the count: ${c.subs} subs, ${f1(Math.sqrt(Math.max(1, c.subs)))} times cleaner than one. Drag to pan, wheel to zoom, click a star or galaxy for its spectrum, double-click to slew there.` }),
  fit: () => ({ title: 'Fit', text: "Shows the whole sensor: 6248 by 4176 pixels, 27' by 18' of sky. F does the same." }),
  one: () => ({ title: '1:1', text: `One sensor pixel to one screen pixel, ${PIXEL_ARCSEC.toFixed(2)}" each. Judge focus and star shapes here. Z does the same.` }),
  zoom: () => ({ title: 'Zoom', text: 'Zoom changes only the view, never the data. The wheel zooms at the pointer; + and - zoom at the centre.' }),
  starsOverlay: () => ({ title: 'Detected stars', text: 'Marks each star the software finds. The same detection measures the HFR and gives the autoguider its star.' }),
  stats: (c) => ({
    title: 'Statistics',
    text: `MEAN and MED are the sky level in ADU, SD its noise, MAX the brightest pixel. ${c.max >= SATURATED ? 'MAX is at the top of the range: a star saturates, so shorten the sub.' : 'A MAX near 65535 means a star saturates.'} HFR, the half-flux radius, is the size of an average star: smaller is sharper.`,
  }),
  log: () => ({ title: 'Log', text: 'Everything the system does, in UTC. Lines that start with TIP are the advisor: it watches the data and says what to fix. F1 turns tips off.' }),
  radec: () => ({ title: 'RA and Dec', text: 'Right ascension and declination: the sky\'s own grid, fixed to the stars. The mount aims in these and turns them into altitude and azimuth.' }),
  ha: (c) => ({ title: 'Hour angle', text: `HA ${c.ha >= 0 ? '+' : ''}${f1(c.ha)} h: the time since the target crossed the meridian. ${c.ha < 0 ? 'It still rises, so the air thins as you wait.' : 'It sinks now, so observe it before it gets low.'} Targets are best near HA 0.` }),
  altaz: (c) => ({ title: 'Altitude and air mass', text: `X ${c.air.toFixed(2)}: the light crosses ${c.air.toFixed(2)} atmospheres. It is 1.0 at the zenith and 2.0 at 30 degrees up. ${c.air > 2 ? 'This target is low: seeing and extinction spoil the data. Pick a higher one.' : 'Above about 2, seeing and extinction spoil the data.'}` }),
  track: (c) => (c.slewing
    ? { title: 'Slewing', text: 'The mount drives at full speed to the new target and then settles. Sidereal tracking takes over when it arrives.' }
    : c.tracking
    ? { title: 'Tracking', text: 'Sidereal: the mount turns once in 23 h 56 min, the sky\'s rate, so the stars hold still in each sub. Click or press T to stop it.' }
    : { title: 'Tracking off', text: 'The sky drifts west by 15" a second and every sub smears into trails. Click or press T to start tracking again.' }),
  seeing: (c) => ({ title: 'Seeing', text: `${f1(c.fwhm)}": the turbulent air blurs every star to this size. It changes from minute to minute. From the ground, only adaptive optics beats it.` }),
  guide: (c) => (c.guiding
    ? { title: 'Autoguiding', text: `A guide camera measures one star each second and sends small corrections to the mount. RMS ${c.rms.toFixed(2)}" is the error left over; keep it under half the seeing, ${f1(c.fwhm / 2)}". F8 stops it.` }
    : { title: 'Open loop', text: `No guiding: the worm gear's periodic error and a slow drift move the stars. RMS ${c.rms.toFixed(2)}" and growing. F8 closes the loop.` }),
  state: (c) => ({ title: 'Camera', text: c.looping ? `The camera takes ${c.exposure} s subs one after another and reads each out into the stack.` : 'The camera is idle. F3 or Space starts the exposure loop.' }),
  exposure: (c) => ({
    title: 'Sub length',
    text: `${c.exposure} s. Longer subs reach fainter stars, but saturate bright ones and risk a trail. Many short subs stack to the same depth with less risk.${c.filter === 'Hα' && c.exposure < 30 ? ' The Hα filter passes so little light that 30 or 60 s works better.' : ''}`,
  }),
  stack: () => ({ title: 'Stack', text: 'The subs in the live stack. Rst clears it. A move, a new filter or a new focus clears it on its own.' }),
  filter: (c) => ({
    title: 'Filter wheel',
    text: `Now ${c.filter}. L passes all visible light, for depth. R, G and B make a colour image. Hα passes 7 nm at 656 nm: it shows glowing hydrogen in nebulae and blocks most moonlight and city light. F4 turns the wheel.`,
  }),
  ccd: (c) => ({
    title: 'Cooled CCD',
    text: `${f1(c.temp)} °C, cooler at ${Math.round(c.coolerPower)}%. Heat frees electrons as dark current, which doubles every 6 °C. ${c.temp > c.coolerSet + 0.5 ? 'Still cooling: wait for the set point before long subs.' : 'At the set point.'}`,
  }),
  cooler: (c) => ({ title: 'Set point', text: `${c.coolerSet} °C. Colder means less dark noise, but the cooler works harder. Keep it a few degrees from 100%, so it holds the temperature all night.` }),
  start: (c) => ({ title: c.looping ? 'Stop' : 'Start', text: `${c.looping ? 'Stops' : 'Starts'} the exposure loop. F3 or Space does the same.` }),
  focus: (c) => ({
    title: 'Focuser',
    text: `Position ${Math.round(c.focus).toLocaleString('en')} in 1 µm steps. As the tube cools through the night, the best focus creeps, and the stars grow. ${c.hfr > c.hfrBest * 1.3 ? `HFR ${c.hfr.toFixed(2)} against ${c.hfrBest.toFixed(2)} at best: run AUTO.` : 'Focus is good now.'}`,
  }),
  autofocus: () => ({ title: 'Autofocus', text: 'Takes 9 frames across focus and fits a V-curve to the star sizes. The bottom of the V is best focus, and the focuser moves there. F6 does the same.' }),
  vcurve: () => ({ title: 'V-curve', text: 'Star size against focuser position from the last autofocus. Each side of the V is a straight line; their meeting point is the focus.' }),
  targets: () => ({ title: 'Targets', text: 'Bright stars and deep fields more than 25 degrees up now, refreshed as the sky turns. Click one or press 1 to 6 to slew.' }),
  spectro: (c) => ({
    title: 'Spectrograph',
    text: c.sel
      ? `${c.sel.name}: S/N ${Math.round(c.sel.snr)}. The signal grows with the root of the time, so keep the target in view. ${c.sel.galaxy ? 'Its lines shift red with the expansion of the universe: the shift gives z and the distance.' : 'Its dark lines give the star\'s temperature and class.'}`
      : 'Splits light by wavelength. A star\'s dark lines give its temperature and class; a galaxy\'s lines shift red with the expansion of the universe. Click a target in the image.',
  }),
  slew: () => ({ title: 'Slew', text: 'Points the telescope at the target you clicked. F2 does the same. A slew clears the stack.' }),
  night: (c) => ({ title: 'Night mode', text: `${c.night ? 'On' : 'Off'}. Red light keeps your eyes dark-adapted and leaves the dome dark for anyone at an eyepiece. F9 turns it ${c.night ? 'off' : 'on'}.` }),
  tips: (c) => ({ title: 'Tips', text: `Hover tips and the advisor's TIP lines are ${c.tipsOn ? 'on' : 'off'}. F1 or H turns them ${c.tipsOn ? 'off' : 'on'}.` }),
};

export function programTip(id: string, c: Ctx): Tip | null {
  return PROGRAM[id]?.(c) ?? null;
}

/* ---------- the advisor ---------- */
// One condition gives one TIP line in the log.
// It may speak again only after the condition clears for a while.
export type Advice = { id: string; when: (c: Ctx) => boolean; say: (c: Ctx) => string };

export const ADVICE: Advice[] = [
  { id: 'track', when: (c) => !c.tracking, say: () => 'TIP Tracking is off: the sky drifts 15" a second. T turns it on.' },
  { id: 'trail', when: (c) => c.tracking && !c.guiding && c.rms > 1, say: (c) => `TIP Stars trail, RMS ${c.rms.toFixed(1)}": the mount runs open loop. F8 guides.` },
  { id: 'soft', when: (c) => c.looping && c.hfr > c.hfrBest * 1.3, say: () => 'TIP Stars are soft: the cooling tube moved the focus. F6 autofocuses.' },
  { id: 'cool', when: (c) => c.looping && c.temp > c.coolerSet + 2, say: (c) => `TIP The CCD still cools. Wait for ${c.coolerSet} °C before long subs.` },
  { id: 'low', when: (c) => !c.slewing && c.alt < 30, say: (c) => `TIP Low target, air mass ${c.air.toFixed(1)}: more blur and less light. Pick a higher one.` },
  { id: 'sat', when: (c) => c.looping && c.max >= SATURATED && c.exposure >= 30, say: (c) => `TIP Bright stars saturate at ${c.exposure} s. Shorter subs keep them measurable.` },
  { id: 'ha', when: (c) => c.filter === 'Hα' && c.exposure < 30, say: () => 'TIP Hα passes only 7 nm of light. Use 30 or 60 s subs.' },
];

/* ---------- the refractor's case ---------- */
export type EyeCtx = { fwhm: number; dec: number; drive: boolean };

// Exit pupil in mm: the aperture over the magnification.
const pupil = (m: number): number => APERTURE_MM / m;

export function eyeTip(id: string, c: EyeCtx): Tip | null {
  if (/^[0-3]$/.test(id)) {
    const e = EYEPIECES[Number(id)];
    const m = Math.round(magnification(e)), tf = trueField(e);
    const head = `${m}× · field ${tf.toFixed(2)}° · exit pupil ${f1(pupil(magnification(e)))} mm. `;
    // Above this power the seeing blur fills more than the eye resolves.
    const useful = Math.round(400 / c.fwhm / 10) * 10;
    const body = [
      'The lowest power: the widest, brightest view. Find the target here, then step up.',
      'A middle power for clusters and wide double stars.',
      'For close double stars and the planets. The grating uses this eyepiece.',
      `Near the limit: in tonight's ${f1(c.fwhm)}" seeing, more than about ${useful}× only magnifies the blur.`,
    ][Number(id)];
    return { title: `${e.mm} mm eyepiece`, text: head + body };
  }
  if (id === 'grating') return { title: 'Diffraction grating', text: 'Spreads each star into its spectrum. Hot stars are blue-white; cool stars are red and crossed by dark bands. Spectra like these sorted the stars into the classes O B A F G K M.' };
  if (id === 'drive') {
    if (c.drive) return { title: 'Clock drive', text: 'Turns the tube west at the sky\'s rate, so the star stays in the field. The first drives were clockwork, run by a falling weight.' };
    const field = trueField(EYEPIECES[0]);
    const s = Math.round((field * 3600) / (15 * Math.max(0.05, Math.cos((c.dec * Math.PI) / 180))));
    return { title: 'Clock drive off', text: `The sky turns past the tube. A star crosses the 55 mm field in about ${s} s. Drag to follow it by hand, as the first observers did.` };
  }
  if (id === 'small') return { title: 'Great refractor', text: `A ${APERTURE_MM / 10} cm lens with a 4.9 m focal length. You look with your own eye, as astronomers did until photography and then cameras took over.` };
  if (id === 'big') return { title: '1 m reflector', text: 'A mirror telescope run from software. A cooled camera replaces the eye: you plan, slew, focus, guide and expose from the control room.' };
  return null;
}

// Splits text into lines of at most n characters.
export function wrap(text: string, n: number): string[] {
  const out: string[] = [];
  let line = '';
  for (const w of text.split(/\s+/)) {
    if (line && line.length + 1 + w.length > n) {
      out.push(line);
      line = w;
    } else line = line ? `${line} ${w}` : w;
  }
  if (line) out.push(line);
  return out;
}
