# Staged loading

Bean: `stimming-bg6j`. Started 2026-11-09.

## The stages

A toy page loads in five stages. `shared/stim.js` names them.

| Stage | What loads | What shows |
|---|---|---|
| `shell` | HTML, `stim.css`, `intro.css`, fonts | Stage colour and the intro |
| `libs` | `stim.js`, `intro.js`, culori and the toy's libraries, in parallel | The intro runs |
| `build` | Scene setup and shader compile, in idle slices or a worker | The intro holds |
| `first-frame` | One real frame | The intro may lift; the canvas fades in |
| `extras` | Samples, spare maps, Tone | Nothing: the toy is live |

Helpers in `shared/stim.js`:

- `stage(name)` sets `performance.mark('stim:<name>')` and `html[data-stage]`.
- `idle()` resolves when the main thread is free.
- `pageReady()` is the intro's `ready`: page load, fonts and the first frame, capped at 6 s.
- `later(fn)` runs `fn` after the first frame, in idle time.

## Recipe for one toy

1. Move the importmap into the head, before any `modulepreload`. Keep its text word for word.
2. Add one `<link rel="modulepreload">` per module the page imports, static or dynamic.
   Add no `preconnect` to jsDelivr: the preloads open that connection themselves.
3. Call `stage('libs')` first in the module, `stage('build')` once the imports resolve, and `stage('first-frame')` after the first draw.
4. Pass `pageReady()` to the intro as `ready`.
5. Import `idle` from `stim.js`; delete the local copy.
6. Find the longest main-thread task with the harness. Slice it with `await idle()`, or move pure maths into a worker.
7. Move anything the first frame does not need into `later()`.

All 36 main-shelf toys follow the recipe.
A page with its own `stage` variable imports the helper under another name (`stage as mark`).

## The menu

- The two GSAP scripts preload from the head.
- After load, in idle time, the menu fetches the shared shell, culori and three.js 0.170.0.
- A hover (90 ms dwell), focus or touch on a tile fetches that toy's page, emblem and every module the page names.
  The menu reads the importmap and the import lines from the page, so no list needs upkeep.
- All of it is fetch only. Nothing runs. `saveData` and 2G links skip it.

The icon script stays as it is. It costs about 50 ms of main-thread time, and other sessions edit it daily.

## Baseline, 2026-11-09

Headless Chrome on Metal, cold cache, local server, 1280 × 800.
Fast is the unthrottled link. Slow is 9 Mbit/s with 60 ms latency.
"Stage shows" is when the canvas gets `.on`; a dash means the toy has no such class.
"Long tasks" is the worse of the two runs, in total main-thread time over 50 ms per task.

| Toy | Requests | KB | Stage shows, fast / slow (s) | Intro lifts, fast / slow (s) | Long tasks (ms) |
|---|---|---|---|---|---|
| window | 29 | 738 | 3.5 / 1.0 | 7.3 / 4.8 | 2357 |
| fireworks | 45 | 1177 | 1.7 / 1.6 | 5.4 / 5.4 | 1439 |
| walker | 22 | 618 | — / — | 6.3 / 5.2 | 1326 |
| domino | 20 | 608 | 1.9 / 1.2 | 6.0 / 5.6 | 933 |
| tvtree | 30 | 812 | 1.3 / 2.2 | 5.3 / 6.2 | 895 |
| prism | 19 | 654 | 1.8 / 0.8 | 7.1 / 6.1 | 697 |
| glass | 30 | 655 | 1.1 / 1.3 | 5.7 / 5.8 | 619 |
| kaleido | 17 | 429 | 0.9 / 0.8 | 5.9 / 6.0 | 580 |
| trails | 16 | 364 | 0.6 / 1.6 | 4.5 / 5.5 | 510 |
| windmap | 17 | 459 | 0.5 / 1.5 | 4.4 / 5.3 | 444 |
| scope | 17 | 429 | — / — | 5.3 / 5.2 | 353 |
| shadyos | 18 | 484 | — / — | 4.7 / 4.4 | 332 |
| pins | 19 | 573 | 1.0 / 0.9 | 5.6 / 5.9 | 294 |
| sonar | 17 | 518 | 0.4 / 0.5 | 4.2 / 4.3 | 290 |
| ferro | 19 | 576 | 1.4 / 1.0 | 5.4 / 5.6 | 287 |
| putty | 17 | 398 | — / — | 5.3 / 5.3 | 243 |
| magnet | 19 | 568 | 0.7 / 0.9 | 5.5 / 5.8 | 217 |
| balloons | 18 | 604 | 1.6 / 1.0 | 6.1 / 5.6 | 197 |
| soap | 19 | 627 | 1.0 / 1.1 | 5.2 / 5.7 | 195 |
| chamber | 16 | 362 | 1.3 / 1.4 | 5.2 / 5.3 | 186 |
| pop | 28 | 642 | — / — | 5.8 / 5.3 | 145 |
| bubbles | 19 | 560 | 0.4 / 0.9 | 5.1 / 5.6 | 114 |
| pendulum | 18 | 557 | 0.5 / 0.9 | 5.5 / 6.0 | 88 |
| pool | 17 | 475 | 1.0 / 1.0 | 5.4 / 5.6 | 86 |
| fire | 28 | 730 | 3.8 / 1.3 | 5.8 / 5.8 | 64 |
| galaxy | 24 | 725 | 3.2 / 1.4 | 5.4 / 5.7 | 53 |
| morpher | 18 | 545 | 1.1 / 1.8 | 5.0 / 6.3 | 0 |
| fidget | 24 | 437 | — / — | 5.1 / 5.5 | 0 |
| neon | 18 | 462 | 0.5 / 0.7 | 5.3 / 5.8 | 0 |
| chladni | 17 | 426 | 0.5 / 1.6 | 5.1 / 6.6 | 0 |
| rain | 17 | 430 | 0.5 / 0.7 | 5.0 / 5.6 | 0 |
| lava | 18 | 471 | 1.3 / 0.8 | 5.9 / 5.4 | 0 |
| eyes | 17 | 421 | 0.4 / 0.8 | 4.7 / 5.1 | 0 |
| ink | 20 | 635 | 3.9 / 3.4 | 4.9 / 5.2 | 0 |
| vortex | 17 | 478 | 0.6 / 0.5 | 4.0 / 4.4 | 0 |
| dijkstra | 19 | 770 | 0.3 / 1.0 | 3.9 / 4.4 | 0 |

The menu: 10 requests, first paint at 0.2 s, about 50 ms of long tasks.

What the table says:

- Every stage shows before its intro lifts, on both links. On these links the gain is smoothness, not time.
- The long tasks stall the intro while it plays. They are the first target.
- Timings vary by a second between runs: a first DNS lookup in a fresh browser sometimes stalls. Compare runs in sets of three.

## Results

### TV tree

Journey: open the menu, rest on the tile, click. Three runs each.

| | Before | After |
|---|---|---|
| First frame, fast link | 1.0 to 1.3 s | 0.9 to 1.1 s |
| First frame, slow 3G (1.6 Mbit/s, 150 ms) | 5.4 to 6.2 s | 3.1 to 3.7 s |
| Intro lifts, slow 3G | 8.6 to 9.2 s | 7.7 to 7.8 s |
| Longest main-thread stall | 370 to 670 ms | 50 to 95 ms |
| Network after the click | 754 KB | 562 KB |

- The stall was `treeSurface()`, about 300 ms of meshing. The first tree now meshes in a worker; a failed worker falls back to the old path.
- The local server sends `no-store`, so same-origin files never come from cache here. On Pages the page and `channels.js` are warm too.

### All main-shelf toys, 2026-11-09

Same harness as the baseline, fast link, one cold run per toy.
Every toy sets `libs`, `build` and `first-frame` in order, with no page errors.

| Toy | Long tasks before (ms) | After (ms) | Longest after (ms) |
|---|---|---|---|
| window | 2357 | 139 | 139 |
| fireworks | 1439 | 161 | 161 |
| walker | 1326 | 102 | 102 |
| domino | 933 | 0 | 0 |
| tvtree | 895 | 0 | 0 |
| prism | 697 | 72 | 72 |
| glass | 619 | 0 | 0 |
| kaleido | 580 | 0 | 0 |
| trails | 510 | 93 | 93 |
| windmap | 444 | 0 | 0 |
| scope | 353 | 74 | 74 |
| shadyos | 332 | 0 | 0 |
| pins | 294 | 0 | 0 |
| sonar | 290 | 0 | 0 |
| ferro | 287 | 0 | 0 |
| putty | 243 | 0 | 0 |
| magnet | 217 | 0 | 0 |
| balloons | 197 | 0 | 0 |
| soap | 195 | 74 | 74 |
| chamber | 186 | 0 | 0 |
| bubbles | 114 | 0 | 0 |
| pop | 100 | 88 | 88 |
| pendulum | 88 | 94 | 94 |
| pool | 86 | 0 | 0 |
| galaxy | 53 | 0 | 0 |
| vortex | 0 | 0 | 0 |
| rain | 0 | 0 | 0 |
| neon | 0 | 0 | 0 |
| morpher | 0 | 0 | 0 |
| lava | 0 | 0 | 0 |
| ink | 0 | 0 | 0 |
| fire | 0 | 53 | 53 |
| fidget | 0 | 0 | 0 |
| eyes | 0 | 0 | 0 |
| dijkstra | 0 | 0 | 0 |
| chladni | 0 | 0 | 0 |

Per-toy work beyond the recipe:

- Window seat: the sky bake and the 64³ noise bake run in a module worker.
- Fireworks: `sfx/*.mp3` load in `later()`; the synth covers a click before they arrive.
- Sonar: `ping.mp3` loads in `later()`.
- Prism: the five programs compile with `compileAsync` before the first render.
- Glass: the backdrop renders after the async compile, not in the first resize.
- Kaleido: the settle loop yields every 12 ms.
- Dijkstra: `maps/index.json` preloads; the city is random, so its file does not.
- Fidget: the part modules still load one at a time.
- Launch and Frietkot: recipe only. First frame stays near 1.3 s and the intro lift near 5.0 s in the harness, before and after.
  The jsDelivr lookup sets both numbers, so the preloads show no gain on a direct cold visit.
- Railgun, Train ride, Foghorn: recipe only. Foghorn already used `pageReady`; it gains the `libs` mark and the full preload list.
- Railgun warm frame (PR 40): every hidden mesh compiles and draws once before `first-frame`.
  It costs one task of about 185 ms behind the intro; the intro lifts at the same time as before.
  Five harness runs of two shots each: no long task at a shot; one 200 ms frame gap in one first charge.

Open:

- Trails and Wind map: the status queries wait for `KHR_parallel_shader_compile`, so the programs compile in parallel.
  Trails keeps one task of 70–80 ms: the pre-exposed plate, which is the first frame.
- Walker, Window seat, Fireworks: the stall that remains is three.js program link.
- Direct cold visit in the harness: the jsDelivr DNS lookup takes about 1 s when it starts with the font lookups.
  Main shows the same stall in about half its runs. A visit from the menu never shows it.
  Check a direct link on Pages in a real browser.
  The cause is the resolver on the test machine: one of three parallel uncached lookups takes 1 to 2 s in a plain `getaddrinfo` test.
  A page that preloads culori starts that lookup with the font lookups, so it meets the stall on every run here.
- The local preview server resets connections under parallel requests, on main and on the branch. A reset module request stops the toy.
- Sound on the first gesture is not exercised by the harness.
