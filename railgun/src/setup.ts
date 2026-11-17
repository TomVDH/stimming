import * as THREE from 'three';
import { STORM_SOFT } from '../storms.js';
import { stage as mark, initPage, pageReady } from '../../shared/stim.js';
import { intro as playIntro } from '../../shared/intro.js';
import { state } from './state.ts';
import { U } from './world/uniforms.ts';
import { aimSky, setSun } from './sky/sun.ts';
import { FAR_U, GRID_U, farBake, setFarMode, setRockCol } from './world/farcountry.ts';
import { CLOUD_U, giants } from './clouds/clouds.ts';
import { setStormProbe } from './clouds/probe.ts';
import { setCloudPass } from './clouds/pass.ts';
import { setDeck, stormBurst, stormFl } from './clouds/lightning.ts';
import { gunMat } from './gun/gun.ts';
import { retune } from './rock/asteroid.ts';
import { toggleSight } from './view/camera.ts';
import { draw, resize } from './view/render.ts';
import { ambStart } from './play/ambient.ts';
import { setAimMode } from './ship/hit.ts';
import { resetToy } from './play/reset.ts';
import { shipShot } from './ship/shipshot.ts';
import { strikeSoon } from './rock/strike.ts';
import { wake } from './loop.ts';
import { setBloom, setBox, setGrain, setLens, setTone } from './post/settings.ts';
import type { PressFn, ReleaseFn } from './play/charge.ts';

mark('libs');

/* ---------- settings ---------- */
const store = {
  get(k: string) { try { return localStorage.getItem(`stimming.railgun.${k}`); } catch { return null; } },
  set(k: string, v: unknown) { try { localStorage.setItem(`stimming.railgun.${k}`, String(v)); } catch { /* storage off */ } },
};
// Per size: radius in metres, fall seconds, shard count, rumble gain.
export const SIZES = {
  boulder: { R: 600, T: 220, shards: 24, rumble: 0.7 },
  mountain: { R: 1000, T: 300, shards: 40, rumble: 1.0 },
  moon: { R: 1700, T: 380, shards: 56, rumble: 1.3 },
  // Aerosmith: a dark, cracked world-killer, barely clear of the horizon at its hold.
  aerosmith: { R: 4200, T: 520, shards: 84, rumble: 2.0 },
};
export type RockSize = keyof typeof SIZES;
export const opts = {
  // The first rock rolls its size too.
  size: 'mountain' as RockSize,
  // Time of day, 0 for night to 1 for noon.
  // It has its own key: the old Sun key had a narrower range.
  sun: Number.isFinite(+store.get('time')!) && store.get('time') !== null ? Math.min(1, Math.max(0, +store.get('time')!)) : 0.5,
};

/* ---------- bar ---------- */
// 'random' turns to the next size at each Reset; a dev pick pins it.
export let devSize: RockSize | 'random' = 'random';
// roarK scales the rock's soft roar.
export let roarK = 1;
// The charge sound's mix: one of the MIX keys; the surges are listed in SURGE.
// Expanse is the default (Tom, 2026-11-12); every stored pick moves to it once.
export let chargeMix = (() => {
  try {
    const K = 'stimming.railgun.chargemix';
    if (!localStorage.getItem(K + '.v3')) { localStorage.setItem(K, 'vast'); localStorage.setItem(K + '.v3', '1'); }
    return localStorage.getItem(K) || 'vast';
  } catch { return 'vast'; }
})();
// The shot's sound: Tom's report sample. Mesa, Coil and Thump stay in code.
export const shotMix = 'report';
// The game-over sound is Requiem (Tom, 2026-11-16).
// The other takes stay in code; GO_TAKES and MIX name them.
export const goMix = 'requiem';
// Requiem: each layer enters muffled and clears as the next blends in.
export let goOpen = false;
// The sun rays' gain; the Dev sheet's Sun rays row sets it.
state.shaftGain = 1.6;
// The frame budget in ms; the Dev sheet's FPS row sets it.
export let FRAME = 1000 / 30;
// The hold is the toy: no action chips.
// play/charge sets the real hooks; they take an owner.
export const act: { press: PressFn; release: ReleaseFn } = { press() {}, release() {} };
// The far ranges' pass: the bake, or the live march with ?far=live.
export const FAR_MODE = new URLSearchParams(location.search).get('far') === 'live' ? 'live' : 'bake';
export const ui = initPage({ id: 'railgun', bar: {
  // Time runs from a starry night to a high noon sun.
  slider: { label: 'Time', min: 0, max: 1, step: 0.002, value: opts.sun, onInput: v => { opts.sun = v; store.set('time', v); setSun(); } },
  // Settings: what anyone playing with the toy may want.
  settings: [
    // The gun tracks the rock, or the arrow keys lay it.
    { type: 'choice', id: 'aim', group: 'Play', label: 'Aim', value: 'track', persist: true, options: [{ value: 'track', label: 'Track' }, { value: 'free', label: 'Free' }], onPick: v => setAimMode(v) },
    // One rail shot, or a salvo of banked rounds.
    // This choice stands in until the HUD selector lands.
    { type: 'choice', id: 'firemode', group: 'Play', label: 'Fire', display: 'segments', value: 'rail', persist: true, options: [{ value: 'rail', label: 'Rail' }, { value: 'salvo', label: 'Salvo' }] },
    { type: 'toggle', id: 'letterbox', group: 'View', label: 'Letterbox', value: false, persist: true, onToggle: on => setBox(on) },
    // Graphics: fine tuning on top of Quality and the automatic ladder.
    { type: 'slider', id: 'res', group: 'Graphics', label: 'Resolution', min: 0.5, max: 1, step: 0.05, value: 1, persist: true, onInput: v => { gfx.res = v; resize(); } },
    { type: 'choice', id: 'detail', group: 'Graphics', label: 'Smoke detail', value: 'mid', persist: true, options: [{ value: 'low', label: 'Low' }, { value: 'mid', label: 'Mid' }, { value: 'high', label: 'High' }], onPick: v => { gfx.detail = DETAIL[v as keyof typeof DETAIL]; resize(); } },
  ],
  // Dev: tuning for the people who build the toy; it shows only with ?dev.
  dev: [
    { type: 'choice', id: 'chargemix', group: 'Sound', label: 'Charge sound', display: 'stepper', value: 'vast', persist: true, options: [{ value: 'hum', label: 'Hum' }, { value: 'blend', label: 'Blend' }, { value: 'choir', label: 'Choir' }, { value: 'vast', label: 'Expanse' }, { value: 'titan', label: 'Titan' }, { value: 'penta', label: 'Surge' }, { value: 'syl', label: 'Surge Syl' }, { value: 'hijaz', label: 'Surge Hijaz' }, { value: 'colossus', label: 'Colossus' }, { value: 'dirge', label: 'Dirge' }, { value: 'leviathan', label: 'Leviathan' }, { value: 'eclipse', label: 'Eclipse' }, { value: 'monolith', label: 'Monolith' }, { value: 'monohum', label: 'Monolith Hum' }], onPick: v => { chargeMix = v; } },
    // The soft crackle while a rock burns in the sky.
    { type: 'slider', id: 'roar', group: 'Sound', label: 'Rock roar', min: 0, max: 3, step: 0.1, value: 1, persist: true, onInput: v => { roarK = v; } },
    // Random rolls a new size per rock.
    { type: 'choice', id: 'devsize', group: 'Tests', label: 'Rock', display: 'stepper', value: 'random', options: [{ value: 'random', label: 'Random' }, { value: 'boulder', label: 'Boulder' }, { value: 'mountain', label: 'Mountain' }, { value: 'moon', label: 'Moon' }, { value: 'aerosmith', label: 'Aerosmith' }], onPick: v => { devSize = v as RockSize | 'random'; if (v !== 'random') { opts.size = v as RockSize; retune(); } } },
    // The choice waits for Reset.
    { type: 'choice', id: 'target', group: 'Tests', label: 'Target', display: 'segments', value: 'rock', persist: true, options: [{ value: 'rock', label: 'Asteroid' }, { value: 'ship', label: 'Ship' }] },
    // The button waits for a ship at station.
    { type: 'button', id: 'shipfire', group: 'Tests', label: 'Ship fires', text: 'Fire', onClick: () => shipShot() },
    // The rock falls ten times faster.
    { type: 'toggle', id: 'fastrock', group: 'Tests', label: 'Fast rock', value: false, onToggle: on => { state.fastRock = on; wake(); } },
    // Each rock starts at its hold and strikes after a grace.
    { type: 'toggle', id: 'striketest', group: 'Tests', label: 'Strike test', value: false, onToggle: on => { state.strikeTest = on; if (on) strikeSoon(); } },
    // Ambient: small events nobody fires, for a watcher.
    { type: 'toggle', id: 'ambient', group: 'Ambient', label: 'Ambient', value: true, persist: true },
    { type: 'slider', id: 'ambrate', group: 'Ambient', label: 'Ambient rate', min: 0, max: 3, step: 0.1, value: 1, persist: true },
    { type: 'choice', id: 'ambkind', group: 'Ambient', label: 'Ambient test', display: 'stepper', value: 'war', options: [{ value: 'war', label: 'War' }, { value: 'star', label: 'Star' }, { value: 'sat', label: 'Satellite' }, { value: 'land', label: 'Landing' }, { value: 'bolt', label: 'Far bolt' }, { value: 'flak', label: 'Flak' }, { value: 'embers', label: 'Embers' }, { value: 'shed', label: 'Shed' }] },
    { type: 'button', id: 'ambfire', group: 'Ambient', label: 'Ambient now', text: 'Play', onClick: () => { ambStart(ui.setting('ambkind').value); wake(); } },
    // The dusk sun's angle right of the look, in degrees.
    { type: 'slider', id: 'sunaz', group: 'Sky', label: 'Sun bearing', min: 0, max: 70, step: 1, value: 36, persist: true, onInput: v => { state.sunSwing = v; aimSky(); setSun(); } },
    // The strength of the cloud shadows in the low air.
    { type: 'slider', id: 'shafts', group: 'Sky', label: 'Sun rays', min: 0, max: 3, step: 0.05, value: 1.6, persist: true, onInput: v => { state.shaftGain = v; draw(); } },
    // Far haze sinks far clouds into the air.
    // The air, as every far thing sees it.
    // Air blue fade: Rayleigh scattering, how fast far things turn blue and pale.
    { type: 'slider', id: 'airray', group: 'Sky', label: 'Air blue fade', min: 0, max: 3, step: 0.05, value: 1, persist: true, onInput: v => { U.uAirK.value.x = v; U.uAir.value = 0.7 * v; draw(); } },
    // Air dust: the dusty haze (Mie), how thick the far air is.
    { type: 'slider', id: 'airdust', group: 'Sky', label: 'Air dust', min: 0, max: 3, step: 0.05, value: 1, persist: true, onInput: v => { U.uAirK.value.y = v; draw(); } },
    // Air dust height: how deep the dust stands, in metres; low dust leaves tall things clear.
    { type: 'slider', id: 'airdusth', group: 'Sky', label: 'Air dust height', min: 500, max: 10000, step: 100, value: 3000, persist: true, onInput: v => { U.uAirK.value.z = v; draw(); } },
    // Air sun glow: the dust's warm glow toward the sun.
    { type: 'slider', id: 'airglow', group: 'Sky', label: 'Air sun glow', min: 0, max: 3, step: 0.05, value: 1, persist: true, onInput: v => { U.uAirK.value.w = v; draw(); } },
    // Near dust: the plain's own low dust, thick near the ground.
    { type: 'slider', id: 'neardust', group: 'Sky', label: 'Near dust', min: 0, max: 3, step: 0.05, value: 1, persist: true, onInput: v => { U.uHaze.value = 0.00013 * v; draw(); } },
    { type: 'slider', id: 'neardusth', group: 'Sky', label: 'Near dust height', min: 100, max: 3000, step: 50, value: 700, persist: true, onInput: v => { U.uHazeH.value = v; draw(); } },
    // Cloud far fade: far clouds sink further into the air, foot first.
    { type: 'slider', id: 'farhaze', group: 'Sky', label: 'Cloud far fade', min: 0, max: 1.5, step: 0.05, value: 1, persist: true, onInput: v => { U.uLayer.value.x = v; draw(); } },
    // Valley fog pools in the far ranges.
    { type: 'slider', id: 'valfog', group: 'Sky', label: 'Valley fog', min: 0, max: 1.5, step: 0.05, value: 0.5, persist: true, onInput: v => { U.uLayer.value.y = v; draw(); } },
    // The broken layer of cells five kilometres up.
    { type: 'slider', id: 'deck', group: 'Sky', label: 'Cloud deck', min: 0, max: 1.5, step: 0.05, value: 0, persist: true, onInput: v => { setDeck(v); draw(); } },
    // The colossal storms far beyond the ranges.
    // Storm lightning: how often flashes light the storms from inside.
    { type: 'slider', id: 'stormfl', group: 'Sky', label: 'Storm lightning', min: 0, max: 3, step: 0.1, value: 1, persist: true, onInput: v => { stormFl.rate = v; } },
    // Flash now fires one lightning burst in a storm, for a test.
    { type: 'button', id: 'stormnow', group: 'Sky', label: 'Storm flash', text: 'Flash', onClick: () => { stormBurst(); wake(); } },
    // Storm volumes: the towers and the giant as Window seat's marched volumes; off shows the flat cards.
    // Storm softness: how fuzzy the storm volumes are, crisp at 1.
    { type: 'slider', id: 'stormsoft', group: 'Sky', label: 'Storm softness', min: 1, max: 4, step: 0.05, value: STORM_SOFT, persist: true, onInput: v => { CLOUD_U.uStormSoft.value = v; draw(); } },
    { type: 'toggle', id: 'stormprobe', group: 'Sky', label: 'Storm volumes', value: false, persist: true, onToggle: on => { setStormProbe(on); draw(); } },
    { type: 'toggle', id: 'cloudpass', group: 'Sky', label: 'Cloud volumes', value: false, persist: true, onToggle: on => { setCloudPass(on); draw(); } },
    { type: 'toggle', id: 'giants', group: 'Sky', label: 'Giants', value: true, persist: true, onToggle: on => { giants.visible = on; draw(); } },
    // The gullies and strata in the light, as on the card clouds.
    { type: 'slider', id: 'facebump', group: 'Land', label: 'Face bump', min: 0, max: 2, step: 0.05, value: 1, onInput: v => { FAR_U.uBump.value = v; draw(); } },
    // The ranges' light: the sun and key, the sky, and the effects (blast, rock light).
    { type: 'slider', id: 'rangesun', group: 'Land', label: 'Range sun', min: 0, max: 1.5, step: 0.05, value: 0.6, onInput: v => { FAR_U.uRangeL.value.x = v; draw(); } },
    { type: 'slider', id: 'rangesky', group: 'Land', label: 'Range sky', min: 0, max: 1.5, step: 0.05, value: 0.85, onInput: v => { FAR_U.uRangeL.value.y = v; draw(); } },
    { type: 'slider', id: 'rangefx', group: 'Land', label: 'Range effects', min: 0, max: 3, step: 0.05, value: 1, onInput: v => { FAR_U.uRangeL.value.z = v; draw(); } },
    // The ranges' rock colour; none matches the sand plain.
    { type: 'choice', id: 'rockcol', group: 'Land', label: 'Range rock', display: 'segments', value: 'umber', options: [{ value: 'umber', label: 'Umber' }, { value: 'slate', label: 'Slate' }, { value: 'rust', label: 'Rust' }], onPick: v => { setRockCol(v); draw(); } },
    // Carves gullies and crags; 0 is the smooth shape.
    { type: 'slider', id: 'erosion', group: 'Land', label: 'Erosion', min: 0, max: 2, step: 0.05, value: 1, onInput: v => { FAR_U.uEro.value = v; farBake.dirty = true; draw(); } },
    // Forms: every range a crescent, or with a mesa line, a lone cone and a knife ridge.
    { type: 'choice', id: 'forms', group: 'Land', label: 'Forms', display: 'segments', value: 'mixed', options: [{ value: 'crescents', label: 'Crescents' }, { value: 'mixed', label: 'Mixed' }], onPick: v => { FAR_U.uForms.value = v === 'mixed' ? 1 : 0; farBake.dirty = true; draw(); } },
    // Bake marches once and relights; Live marches every frame.
    // Bake is the default (Tom, 2026-11-16); ?far=live opens on Live.
    // Far skip: the march leaps empty air over a coarse height grid.
    { type: 'toggle', id: 'farskip', group: 'Land', label: 'Far skip', value: true, onToggle: on => { GRID_U.uGridOn.value = on ? 1 : 0; farBake.dirty = true; draw(); } },
    { type: 'choice', id: 'farmode', group: 'Land', label: 'Far ranges', display: 'segments', value: FAR_MODE, options: [{ value: 'bake', label: 'Bake' }, { value: 'live', label: 'Live' }], onPick: v => { setFarMode(v === 'bake'); draw(); } },
    // The graphite parts' reflectance and roughness.
    { type: 'slider', id: 'gunmetal', group: 'Gun', label: 'Gun steel', min: 0.04, max: 0.6, step: 0.02, value: 0.12, persist: true, onInput: v => { gunMat.uniforms.uMetalF0.value = v; draw(); } },
    { type: 'slider', id: 'gunrough', group: 'Gun', label: 'Gun steel rough', min: 0.15, max: 0.9, step: 0.05, value: 0.45, persist: true, onInput: v => { gunMat.uniforms.uMetalR.value = v; draw(); } },
    // The stains, cracks and grease on the base.
    { type: 'slider', id: 'basewear', group: 'Gun', label: 'Base wear', min: 0, max: 1.6, step: 0.05, value: 1, persist: true, onInput: v => { gunMat.uniforms.uWear.value = v; draw(); } },
    { type: 'slider', id: 'bloom', group: 'Lens', label: 'Bloom', min: 0, max: 2, step: 0.05, value: 1, persist: true, onInput: v => { gfx.bloom = v; setBloom(); } },
    // A diffusion filter; mid tones glow and the contrast falls.
    { type: 'slider', id: 'mist', group: 'Lens', label: 'Mist', min: 0, max: 1, step: 0.02, value: 0, persist: true, onInput: v => { gfx.mist = v; setBloom(); } },
    // The red bleed round bright light, as on film.
    { type: 'slider', id: 'halation', group: 'Lens', label: 'Halation', min: 0, max: 2, step: 0.05, value: 1, persist: true, onInput: v => { gfx.hal = v; setBloom(); } },
    { type: 'slider', id: 'vignette', group: 'Lens', label: 'Vignette', min: 0, max: 1.6, step: 0.05, value: 1, persist: true, onInput: v => { gfx.vig = v; setLens(); } },
    { type: 'slider', id: 'grain', group: 'Lens', label: 'Grain', min: 0, max: 2, step: 0.05, value: 1, persist: true, onInput: () => setGrain() },
    { type: 'slider', id: 'grainsize', group: 'Lens', label: 'Grain size', min: 1, max: 4, step: 0.25, value: 1, persist: true, onInput: v => { gfx.gsize = v; setLens(); } },
    // Grade: the curve, then exposure, contrast and colour on top.
    // Four curves are too wide for segments.
    { type: 'choice', id: 'tone', group: 'Grade', label: 'Tone map', display: 'stepper', value: 'aces', persist: true, options: [{ value: 'agx', label: 'AgX' }, { value: 'aces', label: 'ACES' }, { value: 'neutral', label: 'Neutral' }, { value: 'villeneuve', label: 'Villeneuve' }], onPick: v => { gfx.tone = v; setTone(); } },
    // Villeneuve only: the key hue, its pull, the black floor.
    // Auto takes sand by day and slate at night.
    { type: 'choice', id: 'palette', group: 'Grade', label: 'Palette', value: 'auto', persist: true, options: [{ value: 'auto', label: 'Auto' }, { value: 'sand', label: 'Sand' }, { value: 'slate', label: 'Slate' }], onPick: v => { gfx.pal = v; draw(); } },
    { type: 'slider', id: 'pull', group: 'Grade', label: 'Palette pull', min: 0, max: 1, step: 0.02, value: 0.55, persist: true, onInput: v => { gfx.pull = v; setTone(); } },
    { type: 'slider', id: 'lift', group: 'Grade', label: 'Black lift', min: 0, max: 1, step: 0.02, value: 0.5, persist: true, onInput: v => { gfx.lift = v; setTone(); } },
    { type: 'slider', id: 'exposure', group: 'Grade', label: 'Exposure', min: 0.5, max: 2, step: 0.05, value: 0.55, persist: true, onInput: v => { gfx.exp = v; draw(); } },
    { type: 'slider', id: 'brightness', group: 'Grade', label: 'Brightness', min: 0.6, max: 1.5, step: 0.02, value: 0.78, persist: true, onInput: v => { gfx.bri = v; setTone(); } },
    { type: 'slider', id: 'contrast', group: 'Grade', label: 'Contrast', min: 0, max: 0.5, step: 0.01, value: 0.24, persist: true, onInput: v => { gfx.con = v; setTone(); } },
    { type: 'slider', id: 'saturation', group: 'Grade', label: 'Saturation', min: 0.4, max: 1.4, step: 0.02, value: 1.06, persist: true, onInput: v => { gfx.sat = v; setTone(); } },
    // Film, the toy's own 30, or a fast screen.
    { type: 'choice', id: 'fps', group: 'Performance', label: 'FPS', display: 'segments', value: '30', persist: true, options: [{ value: '24', label: '24' }, { value: '30', label: '30' }, { value: '75', label: '75' }], onPick: v => { FRAME = 1000 / +v; } },
    { type: 'choice', id: 'fxaa', group: 'Performance', label: 'FXAA', value: 'auto', persist: true, options: [{ value: 'auto', label: 'Auto' }, { value: 'on', label: 'On' }, { value: 'off', label: 'Off' }], onPick: v => { gfx.fxaa = v; resize(); } },
  ],
  // Reset runs the days faster and faster, then cuts back to the start.
  // Reset waits right of Sight; it shows and glows after a kill.
  actions: [{ verb: 'sight', key: 'V', onPress: () => toggleSight() }, { verb: 'reset', key: 'R', onPress: () => resetToy() }],
  quality: true,
  keys: [['hold', 'charge'], ['release', 'fire'], ['arrows', 'traverse'], ['v', 'sight']],
} });

export const stage = document.getElementById('stage')!;
mark('build');
export let markReady!: () => void;
const sceneReady = new Promise<void>(r => { markReady = () => { mark('first-frame'); r(); }; });
// A slow phone compiles for many seconds; the intro holds for it.
playIntro({ ready: pageReady(15000) });

// Seeded random keeps the gun the same on every load.
state.seed = 7331;
export const rnd = () => (state.seed = (state.seed * 16807) % 2147483647) / 2147483647;
export const rad = THREE.MathUtils.degToRad;
// fitShadow calls it with no arguments for a zero vector.
export const v3 = (x?: number, y?: number, z?: number) => new THREE.Vector3(x, y, z);
export const clamp = THREE.MathUtils.clamp;

export let renderer: THREE.WebGLRenderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
} catch (err) {
  stage.querySelector<HTMLElement>('.fail')!.hidden = false; ui.hideControls(); markReady();
  throw err;
}
// AgX rolls bright fire and sky off softly, without the yellow skew of ACES.
renderer.toneMapping = THREE.AgXToneMapping;
renderer.toneMappingExposure = 1.0;
// The time of day's exposure; the eye's adaptation scales it each frame.
state.baseExp = 1.0;
// The Villeneuve palette's day share: 0 at night, 1 with the sun up.
state.keyDay = 1;
// The last sun drift step, on the sim clock.
state.sunT = -99;
renderer.setClearColor(0x000000, 1);
export const canvas = renderer.domElement;
stage.prepend(canvas);

export const scene = new THREE.Scene();
// A 20 m near plane keeps depth precision on rocks 40 km out.
export const camera = new THREE.PerspectiveCamera(44, 1, 20, 800000);
camera.rotation.order = 'YXZ';
// The performance ladder's rung; slow frames raise it, never lower it.
state.rung = +new URLSearchParams(location.search).get('rung')! || 0;
// A QA still pins the rung, so slow frames never change its size.
state.rungPin = false;
// Graphics settings: resolution share, smoke step factor, bloom gain, FXAA mode.
export const DETAIL = { low: 0.6, mid: 1, high: 1.4 };
export const gfx = { res: 1, detail: 1, bloom: 1, fxaa: 'auto', tone: 'aces', exp: 0.55, bri: 0.78, con: 0.24, sat: 1.06, pal: 'auto', pull: 0.55, lift: 0.5, mist: 0, hal: 1, vig: 1, gsize: 1 };
// The share of the quality's resolution per rung.
export const RES_STEP = [1, 0.82, 0.68, 0.55];
