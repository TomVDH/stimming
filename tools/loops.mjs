#!/usr/bin/env node
// Captures one seamless video loop per main-shelf toy for the menu's hover circle.
// Output: shared/loops/<id>.mp4, 256 x 256, 24 fps, 5 s, H.264, no sound.
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
// Look at each new loop before a commit: LOOPS_STRIP=1 writes a frame strip.
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
import { existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { GPU, POKES, ROOT, SETTLE, VIEW, base, hideCss, open, playwright, poke, shelf, sleep, square } from './capture.mjs';

const OUT = process.env.LOOPS_OUT || join(ROOT, 'shared', 'loops');
const TMP = process.env.LOOPS_TMP || join(tmpdir(), 'stimming-loops');
const JOBS = Number(process.env.LOOPS_JOBS) || 3;
const BASE = base(process.env.LOOPS_BASE);
// The loop length and the cross-fade length, in seconds.
const LEN = 5, FADE = 0.8;
// The recording runs this much longer than the clip needs.
const MARGIN = 0.7;
const SIZE = 256, FPS = 24;
// The quality starts at CRF and steps to fit the size budget.
const CRF = 30, CRF_FINE = [24, 20], CRF_MAX = 36, MIN_BYTES = 60 * 1024, MAX_BYTES = 250 * 1024;
// Opacity hides the shell, so a recipe can still click a button.
const HIDE = hideCss('opacity: 0');

// Recipes: how each toy stays alive for the whole clip, keyed by toy id.
//   pre    steps before the clip starts (default: the toy's POKES entry)
//   live   steps that repeat until the clip ends (default: none)
//   skip   a reason; the toy gets no loop and stays out of index.json
// A toy with no entry shows its own ambient motion after its POKES entry.
// The verbs are the poke verbs in tools/capture.mjs.
// Coordinates are fractions of the stage; the clip is its centre square.
// A live cycle that divides 5 s puts the scene back at its start.
const TURN = 2500;
const LOOPS = {
  // Three sweeps pop three rows.
  // R fills the sheet again.
  pop: { live: [
    ['down', 0.2, 0.3], ['glide', 0.2, 0.3, 0.8, 0.3, 900], ['up'], ['wait', 250],
    ['down', 0.8, 0.5], ['glide', 0.8, 0.5, 0.2, 0.5, 900], ['up'], ['wait', 250],
    ['down', 0.2, 0.7], ['glide', 0.2, 0.7, 0.8, 0.7, 900], ['up'], ['wait', 300],
    ['key', 'r'], ['wait', 1450],
  ] },
  // S shuffles the board; every control moves to a new place.
  fidget: { live: [['key', 's'], ['wait', 1250]] },
  // R stands the tiles up; Space tips the first tile.
  domino: { pre: [], live: [['key', 'r'], ['wait', 400], ['key', 'Space'], ['wait', 2100]] },
  // Shuffle presses a new shape into the pins.
  pins: { live: [['button', 'Shuffle'], ['wait', TURN]] },
  // The pointer holds the prism and carries it round a small ring.
  prism: { pre: [['down', 0.5, 0.4], ['glide', 0.5, 0.4, 0.56, 0.4, 300]], live: [['orbit', 0.5, 0.4, 0.06, 0.08, TURN]] },
  // A slow drag turns the tube: one turn in 20 s.
  kaleido: { pre: [['down', 0.72, 0.5]], live: Array.from({ length: 8 }, (_, i) => ['orbit', 0.5, 0.5, 0.22, 0.26, TURN, 0.125, i / 8]) },
  // Space locks the full field.
  // The pointer carries the magnet round the dish.
  ferro: { pre: [['move', 0.66, 0.68], ['key', 'Space']], live: [['orbit', 0.5, 0.68, 0.16, 0.1, TURN]] },
  // Clicks switch a tube off and on: the N stutters, the O blinks.
  neon: { live: [
    ['click', 0.636, 0.49], ['wait', 120], ['click', 0.636, 0.49], ['wait', 260],
    ['click', 0.636, 0.49], ['wait', 80], ['click', 0.636, 0.49], ['wait', 1100],
    ['click', 0.275, 0.49], ['wait', 500], ['click', 0.275, 0.49], ['wait', 440],
  ] },
  // A held press raises a magnet; the balls follow it round.
  magnet: { pre: [['down', 0.72, 0.5]], live: [['orbit', 0.5, 0.5, 0.22, 0.26, TURN]] },
  // Key 4 picks the Layers bar; Space makes one cut.
  soap: { pre: [['key', '4'], ['wait', 600]], live: [['key', 'Space'], ['wait', 1250]] },
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
  putty: { pre: [['down', 0.72, 0.5]], live: [['orbit', 0.5, 0.5, 0.22, 0.26, 2 * TURN]] },
  // Space blows a stream at each half turn of the wand.
  bubbles: { pre: [['move', 0.72, 0.5]], live: [
    ['key', 'Space'], ['orbit', 0.5, 0.5, 0.22, 0.26, TURN / 2, 0.5, 0],
    ['key', 'Space'], ['orbit', 0.5, 0.5, 0.22, 0.26, TURN / 2, 0.5, 0.5],
  ] },
  // The eyes follow the pointer round a ring.
  eyes: { pre: [['move', 0.72, 0.5]], live: [['orbit', 0.5, 0.5, 0.22, 0.26, TURN]] },
  // The boot text ends first.
  // P sends a ping.
  sonar: { pre: [['wait', 5000]], live: [['key', 'p'], ['wait', TURN]] },
  // A held press keeps the shutter open; the sky turns.
  trails: { pre: [['down', 0.5, 0.5]] },
  // The pointer drags the Notice window round a ring.
  // The window leaves its trail; the OS draws its own pointer.
  shadyos: { pre: [['down', 0.556, 0.585], ['glide', 0.556, 0.585, 0.62, 0.55, 400]], live: [['orbit', 0.5, 0.55, 0.12, 0.14, TURN]] },
  // Space starts a cosmic shower.
  chamber: { live: [['key', 'Space'], ['wait', TURN]] },
  // Space adds two drops.
  ink: { pre: [['key', 'Space'], ['wait', TURN], ['key', 'Space'], ['wait', TURN]], live: [['key', 'Space'], ['wait', TURN]] },
  // Each click fires one smoke ring.
  vortex: { pre: [['click', 0.42, 0.45], ['wait', 1250]], live: [['click', 0.6, 0.5], ['wait', 1250], ['click', 0.42, 0.45], ['wait', 1250]] },
  // A click sets a new source; the search floods out from it.
  dijkstra: { live: [['click', 0.45, 0.45], ['wait', TURN], ['click', 0.58, 0.56], ['wait', TURN]] },
  // Space sends a random shell up; a shell bursts three seconds later.
  fireworks: { pre: Array(5).fill([['key', 'Space'], ['wait', 625]]).flat(), live: [['key', 'Space'], ['wait', 625]] },
  // A held press ranges the rock, then charges the gun.
  // The release fires one shot, early in the clip.
  railgun: { pre: [['down', 0.5, 0.5], ['wait', 5200]], live: [['wait', 1300], ['up'], ['wait', 9000]] },
  // A drag on the grass reels the line out and back in.
  washline: { pre: [['down', 0.59, 0.8]], live: [['orbit', 0.5, 0.8, 0.09, 0, TURN]] },
};

if (process.env.LOOPS_TRY) Object.assign(LOOPS, JSON.parse(process.env.LOOPS_TRY));

// Cuts the clip, crops the stage square and folds the end into the start.
function cut(raw, mp4, start, clip, crf) {
  const chain = [
    `[0:v]trim=start=${start.toFixed(3)}:duration=${LEN + FADE + 0.2},setpts=PTS-STARTPTS`,
    `crop=${clip.width}:${clip.height}:${clip.x}:${clip.y},scale=${SIZE}:${SIZE}:flags=lanczos,fps=${FPS},split=3[a][b][c]`,
  ].join(',');
  const graph = [
    chain,
    `[a]trim=${FADE}:${LEN},setpts=PTS-STARTPTS[mid]`,
    `[b]trim=${LEN}:${LEN + FADE},setpts=PTS-STARTPTS[tail]`,
    `[c]trim=0:${FADE},setpts=PTS-STARTPTS[head]`,
    `[tail][head]xfade=transition=fade:duration=${FADE}:offset=0[fold]`,
    `[fold][mid]concat=n=2:v=1:a=0[out]`,
  ].join(';');
  // One key frame per loop: a key frame each second makes still parts pulse.
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', raw, '-filter_complex', graph, '-map', '[out]',
    '-frames:v', String(LEN * FPS), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', String(crf), '-preset', 'slow',
    '-g', String(LEN * FPS), '-movflags', '+faststart', '-an', mp4]);
  return statSync(mp4).size;
}

// A busy loop steps the quality down until the file fits the budget.
// A dark loop is small; it gets the fine quality against banding.
function encode(raw, mp4, start, clip) {
  let crf = CRF, bytes = cut(raw, mp4, start, clip, crf);
  for (const fine of CRF_FINE) if (bytes < MIN_BYTES) bytes = cut(raw, mp4, start, clip, crf = fine);
  while (bytes > MAX_BYTES && crf + 2 <= CRF_MAX) bytes = cut(raw, mp4, start, clip, crf += 2);
  return crf;
}

// Six frames of the loop in a row, for a look by eye.
function strip(mp4, png) {
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', mp4, '-vf', `fps=6/${LEN},tile=6x1`, '-frames:v', '1', png]);
}

async function record(browser, id) {
  const recipe = LOOPS[id] ?? {};
  const dir = join(TMP, id);
  rmSync(dir, { recursive: true, force: true });
  const context = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 1, colorScheme: 'dark', recordVideo: { dir, size: VIEW } });
  // The recording starts with the page.
  const began = Date.now();
  const page = await context.newPage();
  const notes = [];
  page.on('pageerror', e => notes.push(`error: ${e.message.split('\n')[0]}`));
  let start = 0, clip = null, failure = null, size = '';
  const pre = recipe.pre ?? POKES[id];
  try {
    await open(page, id, BASE, notes);
    await sleep(SETTLE);
    const stage = page.locator('.stage').first();
    await stage.scrollIntoViewIfNeeded();
    const box = await stage.boundingBox();
    size = `${Math.round(box.width)}x${Math.round(box.height)}`;
    if (pre?.length) await poke(page, box, pre);
    await page.addStyleTag({ content: HIDE });
    clip = square(await stage.boundingBox(), id);
    // The shell fades out before the clip starts.
    const lead = 400;
    const from = Date.now() + lead, until = from + (LEN + FADE + MARGIN) * 1000;
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
    const crf = encode(raw, mp4, start, clip);
    if (process.env.LOOPS_STRIP) strip(mp4, join(TMP, `${id}.png`));
    if (!process.env.LOOPS_KEEP) rmSync(dir, { recursive: true, force: true });
    const kb = (statSync(mp4).size / 1024).toFixed(1);
    console.log(`${id.padEnd(10)} ${kb.padStart(6)} KB  crf${crf}  ${clip.width}px of ${size} at ${start.toFixed(1)} s  ${recipe.live ? 'live pokes' : pre?.length ? 'poked first' : 'ambient'}${notes.length ? '  ' + notes.join('; ') : ''}`);
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
writeFileSync(join(OUT, 'index.json'), JSON.stringify(listed) + '\n');
console.log(failed.length ? `Failed: ${failed.join(', ')}` : `Done: ${ids.length} loops in ${relative(process.cwd(), OUT) || OUT}; ${listed.length} listed`);
process.exit(failed.length ? 1 : 0);
