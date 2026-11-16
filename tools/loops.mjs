#!/usr/bin/env node
// Captures one seamless video loop per main-shelf toy for the menu's hover circle.
// Output: shared/loops/<id>.mp4, 256 x 256, 24 or 20 fps, 5 to 9 s, H.264, no sound.
// Output: shared/loops/index.json, the ids that have a loop, in shelf order.
//
// Run from the repo root, with the dev server up (python3 -m http.server 8000):
//
//   npx -y -p playwright@1.63.0 node tools/loops.mjs [id ...]
//
// No ids renews every main-shelf toy. Ids renew only those toys.
// Playwright comes from the npx cache; package.json stays untouched.
// The poke verbs and the page helpers live in tools/capture.mjs.
// tools/stills.mjs shares them.
// ffmpeg must be on PATH (brew install ffmpeg).
// The end of each clip cross-fades into its start, so the loop has no seam.
// The framing of each toy is its SETUP entry in tools/capture.mjs.
// Look at each new loop before a commit: LOOPS_STRIP=1 writes a frame strip.
// Never run this script and tools/stills.mjs at one time.
// Two pages of one WebGPU toy fail together and give a blank picture.
//
// Environment:
//   LOOPS_BASE   page root (default: this checkout under http://localhost:8000)
//   LOOPS_OUT    folder for the loops, for a trial run (default: shared/loops)
//   LOOPS_TMP    folder for the raw recordings (default: the OS temp folder)
//   LOOPS_JOBS   browsers that run at one time (default: 3)
//   LOOPS_KEEP   set to 1 to keep the raw recordings
//   LOOPS_STRIP  set to 1 to write <id>.png, six frames in a row, to LOOPS_TMP
//   LOOPS_TRY    a JSON object of recipes that replace table entries, for a trial run

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { GPU, POKES, ROOT, SETTLE, SETUP, base, context as openContext, hideCss, open, playwright, poke, shelf, sleep, square } from './capture.mjs';

const OUT = process.env.LOOPS_OUT || join(ROOT, 'shared', 'loops');
const TMP = process.env.LOOPS_TMP || join(tmpdir(), 'stimming-loops');
const JOBS = Number(process.env.LOOPS_JOBS) || 3;
const BASE = base(process.env.LOOPS_BASE);
// The usual loop length and the cross-fade length, in seconds.
// A recipe sets its own length, 5 to 9 s, to fit the toy's cycle.
const LEN = 5, FADE = 0.8;
// The recording runs this much longer than the clip needs.
const MARGIN = 0.7;
// A loop that stays too large at CRF_MAX drops to FPS_LOW.
const SIZE = 256, FPS = 24, FPS_LOW = 20;
// The quality starts at CRF and steps to fit the size budget.
// The tube shows the loop dim and grainy, so a coarse quality is enough.
const CRF = 32, CRF_FINE = [28, 24], CRF_MAX = 40, MIN_BYTES = 40 * 1024, MAX_BYTES = 110 * 1024;
// Opacity hides the shell, so a recipe can still click a button.
const HIDE = hideCss('opacity: 0');

// Recipes: how each toy stays alive for the whole clip, keyed by toy id.
//   pre    steps before the clip starts (default: the toy's POKES entry)
//   live   steps that repeat until the clip ends (default: none)
//   len    the loop length in seconds (default: LEN)
//   skip   a reason; the toy gets no loop and stays out of index.json
// A toy with no entry shows its own ambient motion after its POKES entry.
// The verbs are the poke verbs in tools/capture.mjs.
// The toy's SETUP steps in tools/capture.mjs run before `pre`.
// Coordinates are fractions of the stage; the clip is a square inside it.
// A live cycle that divides the loop length puts the scene back at its start.
const TURN = 2500;
const LOOPS = {
  // A hand pops in uneven strokes: each has its own length, place and pause.
  // Two single taps sit between the strokes.
  // R fills the sheet again.
  pop: { len: 8, live: [
    ['stroke', [[0.24, 0.3], [0.4, 0.25], [0.62, 0.33]], 620], ['wait', 340],
    ['stroke', [[0.71, 0.5], [0.67, 0.66]], 260], ['wait', 520],
    ['stroke', [[0.37, 0.72], [0.29, 0.56], [0.41, 0.44], [0.55, 0.5]], 900], ['wait', 180],
    ['click', 0.76, 0.3], ['wait', 150], ['click', 0.71, 0.25], ['wait', 600],
    ['stroke', [[0.55, 0.74], [0.76, 0.62]], 380], ['wait', 420],
    ['stroke', [[0.31, 0.4], [0.23, 0.58]], 300], ['wait', 250],
    ['key', 'r'], ['wait', 2980],
  ] },
  // S shuffles the board; every control moves to a new place.
  fidget: { live: [['key', 's'], ['wait', 1250]] },
  // R stands the tiles up; Space tips the first tile.
  domino: { pre: [], live: [['key', 'r'], ['wait', 400], ['key', 'Space'], ['wait', 2100]] },
  // Shuffle presses a new shape into the pins.
  pins: { live: [['button', 'Shuffle'], ['wait', TURN]] },
  // The pointer holds the prism and carries it round a small ring.
  prism: { pre: [['down', 0.5, 0.46], ['glide', 0.5, 0.46, 0.56, 0.46, 300]], live: [['orbit', 0.5, 0.46, 0.06, 0.06, TURN]] },
  // A slow drag turns the tube: one turn in 20 s.
  kaleido: { pre: [['down', 0.72, 0.5]], live: Array.from({ length: 8 }, (_, i) => ['orbit', 0.5, 0.5, 0.22, 0.22, TURN, 0.125, i / 8]) },
  // Space locks the full field.
  // The pointer carries the magnet round the dish.
  ferro: { pre: [['move', 0.62, 0.5], ['key', 'Space']], live: [['orbit', 0.5, 0.5, 0.12, 0.07, TURN]] },
  // Clicks switch a tube off and on: the N and the E stutter, the O blinks.
  // Two fast clicks on one tube change its gas, so the stutter takes turns.
  neon: { live: [
    ['click', 0.662, 0.464], ['wait', 120], ['click', 0.527, 0.44], ['wait', 140],
    ['click', 0.662, 0.464], ['wait', 100], ['click', 0.527, 0.44], ['wait', 1040],
    ['click', 0.243, 0.464], ['wait', 500], ['click', 0.243, 0.464], ['wait', 600],
  ] },
  // A held press raises a magnet; the balls follow it round.
  magnet: { pre: [['down', 0.72, 0.5]], live: [['orbit', 0.5, 0.5, 0.22, 0.22, TURN]] },
  // Space makes one cut; the Coral bar is in the toy's setup.
  soap: { pre: [], live: [['key', 'Space'], ['wait', 1250]] },
  // Two taps crack the pane and a held press shatters it.
  // R rewinds the pane to whole.
  glass: { pre: [], live: [
    ['click', 0.5, 0.45], ['wait', 500], ['click', 0.38, 0.55], ['wait', 500],
    ['hold', 0.55, 0.5, 1200], ['wait', 800], ['key', 'r'], ['wait', 1900],
  ] },
  // The arrows step to the next pattern and back; the sand follows.
  chladni: { live: [['key', 'ArrowRight'], ['wait', TURN], ['key', 'ArrowLeft'], ['wait', TURN]] },
  // Space releases the row; the wave needs four seconds to spread.
  pendulum: { pre: [['key', 'Space'], ['wait', 4000]] },
  // A held finger smears one slow ring; the heat fades behind it.
  putty: { pre: [['down', 0.72, 0.5]], live: [['orbit', 0.5, 0.5, 0.22, 0.22, 2 * TURN]] },
  // Space blows a stream at each half turn of the wand.
  bubbles: { pre: [['move', 0.7, 0.5]], live: [
    ['key', 'Space'], ['orbit', 0.5, 0.5, 0.2, 0.2, TURN / 2, 0.5, 0],
    ['key', 'Space'], ['orbit', 0.5, 0.5, 0.2, 0.2, TURN / 2, 0.5, 0.5],
  ] },
  // Every set shows one picture about 8 s after the page opens.
  // The clip starts after that show ends.
  tvtree: { pre: [['wait', 12000]] },
  // The eyes follow the pointer round a ring.
  eyes: { pre: [['move', 0.72, 0.5]], live: [['orbit', 0.5, 0.5, 0.22, 0.22, TURN]] },
  // The boot text ends first.
  // P sends a ping.
  sonar: { pre: [['wait', 5000]], live: [['key', 'p'], ['wait', TURN]] },
  // A held press keeps the shutter open; the sky turns.
  trails: { pre: [['down', 0.5, 0.5]] },
  // The pointer drags the Notice window round a ring.
  // The window leaves its trail; the OS draws its own pointer.
  shadyos: { pre: [['down', 0.536, 0.567], ['glide', 0.536, 0.567, 0.62, 0.55, 400]], live: [['orbit', 0.5, 0.55, 0.12, 0.12, TURN]] },
  // Space starts a cosmic shower.
  chamber: { live: [['key', 'Space'], ['wait', TURN]] },
  // Space adds two drops; the ink falls slowly, so the loop is long.
  ink: { len: 8, pre: [['key', 'Space'], ['wait', 4000], ['key', 'Space'], ['wait', 4000]], live: [['key', 'Space'], ['wait', 4000]] },
  // Each click fires one smoke ring.
  vortex: { pre: [['click', 0.42, 0.45], ['wait', 1250]], live: [['click', 0.6, 0.5], ['wait', 1250], ['click', 0.42, 0.45], ['wait', 1250]] },
  // A click sets a new source; the search floods out from it.
  dijkstra: { live: [['click', 0.45, 0.45], ['wait', TURN], ['click', 0.58, 0.56], ['wait', TURN]] },
  // Space sends a random shell up; a shell bursts three seconds later.
  fireworks: { pre: Array(5).fill([['key', 'Space'], ['wait', 625]]).flat(), live: [['key', 'Space'], ['wait', 625]] },
  // A held press ranges the rock, then charges the gun.
  // The release fires one shot, early in the clip.
  railgun: { len: 8, pre: [['down', 0.5, 0.5], ['wait', 5200]], live: [['wait', 1300], ['up'], ['wait', 12000]] },
  // A drag on the grass reels the line out and back in.
  washline: { pre: [['down', 0.59, 0.82]], live: [['orbit', 0.5, 0.82, 0.09, 0, TURN]] },
};

if (process.env.LOOPS_TRY) Object.assign(LOOPS, JSON.parse(process.env.LOOPS_TRY));

// Cuts the clip, crops the stage square and folds the end into the start.
function cut(raw, mp4, start, clip, len, fps, crf) {
  const chain = [
    `[0:v]trim=start=${start.toFixed(3)}:duration=${len + FADE + 0.2},setpts=PTS-STARTPTS`,
    `crop=${clip.width}:${clip.height}:${clip.x}:${clip.y},scale=${SIZE}:${SIZE}:flags=lanczos,fps=${fps},split=3[a][b][c]`,
  ].join(',');
  const graph = [
    chain,
    `[a]trim=${FADE}:${len},setpts=PTS-STARTPTS[mid]`,
    `[b]trim=${len}:${len + FADE},setpts=PTS-STARTPTS[tail]`,
    `[c]trim=0:${FADE},setpts=PTS-STARTPTS[head]`,
    `[tail][head]xfade=transition=fade:duration=${FADE}:offset=0[fold]`,
    `[fold][mid]concat=n=2:v=1:a=0[out]`,
  ].join(';');
  const frames = String(Math.round(len * fps));
  // One key frame per loop: a key frame each second makes still parts pulse.
  // A scene cut must not add a key frame.
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', raw, '-filter_complex', graph, '-map', '[out]',
    '-frames:v', frames, '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-crf', String(crf), '-preset', 'veryslow',
    '-g', frames, '-keyint_min', frames, '-sc_threshold', '0', '-movflags', '+faststart', '-an', mp4]);
  return statSync(mp4).size;
}

// A busy loop steps the quality down until the file fits the budget.
// A loop that is still too large loses frames instead.
// A dark loop is small; it gets the fine quality against banding.
function encode(raw, mp4, start, clip, len) {
  let fps = FPS, crf = CRF;
  const run = () => cut(raw, mp4, start, clip, len, fps, crf);
  let bytes = run();
  for (const fine of CRF_FINE) if (bytes < MIN_BYTES) { crf = fine; bytes = run(); }
  while (bytes > MAX_BYTES && crf + 2 <= CRF_MAX) { crf += 2; bytes = run(); }
  if (bytes > MAX_BYTES) { fps = FPS_LOW; bytes = run(); }
  return { crf, fps };
}

// Six frames of the loop in a row, for a look by eye.
function strip(mp4, png, len) {
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', mp4, '-vf', `fps=6/${len},tile=6x1`, '-frames:v', '1', png]);
}

async function record(browser, id) {
  const recipe = LOOPS[id] ?? {};
  const dir = join(TMP, id);
  rmSync(dir, { recursive: true, force: true });
  const context = await openContext(browser, id, dir);
  // The recording starts with the page.
  const began = Date.now();
  const page = await context.newPage();
  const notes = [];
  page.on('pageerror', e => notes.push(`error: ${e.message.split('\n')[0]}`));
  let start = 0, clip = null, failure = null, size = '';
  const pre = [...(SETUP[id]?.first ?? []), ...(recipe.pre ?? POKES[id] ?? [])];
  const len = recipe.len ?? LEN;
  try {
    await open(page, id, BASE, notes);
    await sleep(SETTLE);
    const stage = page.locator('.stage').first();
    await stage.scrollIntoViewIfNeeded();
    const box = await stage.boundingBox();
    size = `${Math.round(box.width)}x${Math.round(box.height)}`;
    if (pre.length) await poke(page, box, pre);
    await page.addStyleTag({ content: HIDE });
    clip = square(await stage.boundingBox(), id);
    // The shell fades out before the clip starts.
    const lead = 400;
    const from = Date.now() + lead, until = from + (len + FADE + MARGIN) * 1000;
    start = (from - began) / 1000;
    await sleep(lead);
    if (recipe.live) while (Date.now() < until) await poke(page, box, recipe.live, until);
    await sleep(Math.max(0, until - Date.now()));
    await page.mouse.up().catch(() => {});
  } catch (e) {
    failure = String(e.message).split('\n')[0];
  }
  // The video file is complete only after the context closes.
  await context.close();
  try {
    if (failure) throw new Error(failure);
    const raw = join(dir, readdirSync(dir).find(f => f.endsWith('.webm')));
    const mp4 = join(OUT, `${id}.mp4`);
    const { crf, fps } = encode(raw, mp4, start, clip, len);
    if (process.env.LOOPS_STRIP) strip(mp4, join(TMP, `${id}.png`), len);
    if (!process.env.LOOPS_KEEP) rmSync(dir, { recursive: true, force: true });
    const kb = (statSync(mp4).size / 1024).toFixed(1);
    console.log(`${id.padEnd(10)} ${kb.padStart(6)} KB  ${len} s  ${fps} fps  crf${crf}  ${clip.width}px of ${size} at ${start.toFixed(1)} s  ${recipe.live ? 'live pokes' : pre.length ? 'poked first' : 'ambient'}${notes.length ? '  ' + notes.join('; ') : ''}`);
    return true;
  } catch (e) {
    console.log(`${id.padEnd(10)} FAILED  ${String(e.message).split('\n')[0]}${notes.length ? '  ' + notes.join('; ') : ''}`);
    return false;
  }
}

const all = shelf(), asked = process.argv.slice(2);
const unknown = asked.filter(id => !all.includes(id));
if (unknown.length) { console.error(`Not on the main shelf: ${unknown.join(', ')}`); process.exit(1); }
const ids = (asked.length ? asked : all).filter(id => {
  if (LOOPS[id]?.skip) console.log(`${id.padEnd(10)} no loop: ${LOOPS[id].skip}`);
  return !LOOPS[id]?.skip;
});
mkdirSync(OUT, { recursive: true });
mkdirSync(TMP, { recursive: true });

const { chromium } = await playwright('loops.mjs');
const queue = [...ids], failed = [];
// Each worker owns a browser, so its page is always in front.
await Promise.all(Array.from({ length: Math.min(JOBS, queue.length) }, async () => {
  const browser = await chromium.launch({ headless: true, args: GPU });
  for (let id; (id = queue.shift());) if (!(await record(browser, id))) failed.push(id);
  await browser.close();
}));

// The menu reads the list; a skipped toy keeps its still.
const listed = all.filter(id => !LOOPS[id]?.skip && existsSync(join(OUT, `${id}.mp4`)));
// The menu reads the list live; a rename swaps it in one step.
writeFileSync(join(OUT, 'index.json.new'), JSON.stringify(listed) + '\n');
renameSync(join(OUT, 'index.json.new'), join(OUT, 'index.json'));
console.log(failed.length ? `Failed: ${failed.join(', ')}` : `Done: ${ids.length} loops in ${relative(process.cwd(), OUT) || OUT}; ${listed.length} listed`);
process.exit(failed.length ? 1 : 0);
