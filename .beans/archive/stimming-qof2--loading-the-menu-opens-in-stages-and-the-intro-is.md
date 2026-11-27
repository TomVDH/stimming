---
# stimming-qof2
title: 'Loading: the menu opens in stages and the intro is the preloader'
status: completed
type: feature
priority: normal
created_at: 2026-11-16T19:02:02Z
updated_at: 2026-11-16T21:53:55Z
---

Tom (2026-11-16): "ensure the main page either loads gracefully, chunked or has a preloader before opening up -- spawn a subsession where we will make the intro flash parts the preloader as well -- we want graceful indicators of loading or chunked/staggered loading (for speed and stability) should an app need to load for longer".

## Checklist

- [x] Measure the menu and three heavy toys, cold and warm
- [x] Menu: pick the approach from the numbers and build it
- [x] Intro: one progress and ready API in shared/intro.js
- [x] Shell: a default for every toy
- [x] Real progress in three heavy toys (Window seat, Galaxy, Railgun)
- [x] Reduced motion, 375 x 812, clean console
- [x] Clips and stills in docs/qa/loading/
- [x] AGENTS.md and the toy-doc guidance
- [x] PR open (Tom merges)

## Measurements, 2026-11-16 (before)

Headless Chrome on Metal, a new profile per cold run, the live site on Pages (gzip, `max-age=600`), 1280 x 800.
Fast is the plain link. Slow is slow 4G (1.6 Mbit/s, 150 ms) with a 4x slower CPU. Times are ms from the navigation.
The harness is `tools/loadtime.mjs`. The local server sends `no-store` and no gzip, so warm and wire numbers come from Pages.

### The menu

| | Cold, fast | Warm, fast | Cold, slow |
|---|---|---|---|
| Requests, wire | 30, 690 kB | 33, 125 kB | 30, 690 kB |
| HTML arrives (167 kB gzip, 682 kB) | 65 to 176 | 3 | 1814 |
| First paint: wordmark and tagline | 204 to 328 | 84 | 572 |
| `clock.js` deals the dozen | 182 to 355 | 64 | 2042 |
| Tube ready | 229 to 651 | 83 | 3054 (the 0.9 s cap ends first) |
| Comet starts: first toy | 290 to 716 | 158 | 3024 |
| Last toy on the dial | 1555 to 2782 | 1426 | 4279 |
| Footer shader | 2820 to 3360 | 2685 | 4840 |
| Long tasks | 71 to 300 | 0 to 52 | 264 |

Order of load: HTML, Google Fonts CSS (blocks the first paint), the two GSAP scripts (preloaded; they run at the end of the body), `clock.css`, fonts, then at the end of the document `clock.js`, `toys.json`, `loops/index.json`, `tube.js`, `gl.js`; after the load event the shell prefetch; at 2.6 s `mesh.js`.

What the numbers say:

- On a fast link the menu is usable 0.3 to 0.7 s after the click. A preloader that holds the page would only add time.
- On a slow link the page shows the wordmark at 0.6 s, then nothing more for 2.4 s. No sign says that it works.
- The Clock needs the main shelf only. The shelf ends 32 kB (gzip) into the page. The Lab (58 kB) and the icon script (66 kB) follow it, and `clock.js` waits for both because a module runs after the whole document.
- The wordmark and the tagline paint in a fallback font first, then change (`display=swap`). The change shows on the slow link.
- A CDN that stalls on `gsap.min.js` blocks `clock.js`; the dial then stays empty with no fallback.

### Four heavy toys

| Toy | Wire, cold | Intro live, fast / slow | First frame, fast / slow | Intro gone, fast / slow | Warm: first frame / intro gone | Long tasks, fast cold |
|---|---|---|---|---|---|---|
| Galaxy (WebGPU, three 0.186) | 445 kB | 282 / 1033 | 2530 / 3502 | 5530 / 6596 | 245 / 5209 | 0 (one 867 ms frame gap after the first frame) |
| Fire (WebGPU compute) | 458 kB | 276 / 1201 | 2807 / 3518 | 5217 / 6538 | 165 / 4942 | 0 (one 650 ms frame gap) |
| Railgun (three 0.170) | 1701 kB | 814 / 3376 | 1848 / 3802 | 5195 / 7479 | 425 / 4080 | 972 (one task of 820) |
| Window seat (raw WebGL2) | 1052 kB | 830 / 2085 | 1288 / 6003 | 4709 / 7053 | 332 / 3863 | 81 |

What the numbers say:

- Order of load: HTML, three style sheets (Google Fonts, `stim.css`, `intro.css` with its own Google import), the module preloads, then `libs`, `build`, `first-frame`.
- The first paint waits for the style sheets and, on Railgun, for 2.6 s of HTML: 0.4 to 1.0 s on the fast link, 1.5 to 3.9 s on the slow one. Until then the menu stays on screen.
- From the first paint to `intro live` the glass is empty: no mark, no word.
- The intro's own length (about 4 s of beats and reading time) covers the first frame on the fast link. On the slow link Window seat's first frame comes at 6.0 s, past the reading time: the intro holds with every line still and no sign of work.
- A cold shader compile on Direct3D, a slow phone or a slow link makes that hold longer. The intro then looks frozen.

## The menu: the approach

A staged start with a quiet sign of work, and no gate. The page never holds for a preloader.

| Stage | When | What shows |
|---|---|---|
| First paint | With the first bytes | The ground colour; the wordmark and the tagline once their fonts are in (1.2 s at most), with one fade and no change of face |
| Wait | From 0.4 s, only while the page still loads | The comet's head at twelve o'clock, CSS only; it breathes |
| Comet | When the whole page and the tube stand (the tube gets 0.9 s) | The dot turns into the comet; it drops the dozen off |
| After | 2.6 s later | The footer shader; after the load event, the shell prefetch |

Why:

- A fast load is usable at 0.3 s. A gate would only slow it. The wait sign has a 0.4 s delay, so a fast load never shows it.
- A slow load had 2.4 s with no sign. The dot fills that gap, and it becomes the comet, so it is not a second thing on the page.
- The Clock's modules preload from the head (`clock.js`, `tube.js`, `gl.js`). On the slow link the first toy comes at 1.7 s, was 2.0 s (local server, same link).
- A script that stalls for 8 s (a dead CDN) now leaves the whole shelf. No JS and a failed `clock.js` leave the whole shelf as before.

Tried and dropped: an early start. The main shelf ends 32 kB into the 162 kB page, so `clock.js` ran there, before the Lab and the icon script. The first toy came at 0.6 s on the slow link. But the icon script draws some icons (Fire, the TV tree, the Frietkot and more), so tiles were empty or changed after the comet. To gain that second, the Lab markup (58 kB gzip, 36% of the page) must leave `index.html`; that is a restructure of a file that other sessions edit daily. Not in this feature.

Checked: no JS, a failed `clock.js`, a failed and a stalled `gsap.min.js`, reduced motion, `?all`, `?lab`.

## The intro is the preloader

- API: `progress(part)` in `shared/intro.js`. The shell's `stage(name, part)` and `buildSteps(n)` call it, so every toy has a default.
- Before the script runs: a CSS hairline with a sheen waits where the foot of the flash box will be (after 0.5 s).
- The load line: the same hairline at the foot of the flash box. It fills in the toy's ink; the emblem stays still (Tom rejected a breathing emblem, 2026-11-16). It shows only when the toy still loads 10 frames after the titles open.
- Reduced motion: a still line and the word Loading at the foot.
- Real progress: Window seat, Galaxy, Railgun.
- Intro length on a fast load, main against the branch (ms): Galaxy 5297 and 5281, Window seat 3930 and 3981. No intro is longer.

## Checks

- Console clean: the menu (`./`, `?all`, `?lab`), Galaxy, Fire, Railgun, Window seat, Pop field, Zipper, Foghorn (no emblem), ShadyOS, TV tree, Glass.
- `tests/bar-v2.html`: 102 of 102.
- Reduced motion: the menu deals at once with a still dot while it waits; the intro shows the still line.
- 375 x 812: the menu's wait dot sits on the track; the intro's line sits under the emblem.
- The app's browser pane: the menu and Window seat load clean.
- Headless runs here compile fast, so the load line shows only on a throttled link, in the lab's Slow load, or on a cold shader cache in a real browser.

## After (ms)

| | Main | Branch |
|---|---|---|
| Menu, fast, cold: first paint, first toy, last toy | 172, 265, 1529 | 164, 247, 1514 |
| Menu, slow link (local server): first toy | 2039 | 1684; the wait dot from 0.5 s |
| Menu, slow link: time with no sign of work | 1.5 s | 0 after the 0.4 s delay |

## Follow-ups (not in this feature)

- Move the Lab's markup out of `index.html` (58 kB of 162 kB gzip): the slow load gets a third shorter.
- Fonts in the repo: Google Fonts' style sheet blocks the first paint of every page. An asset download needs Tom's yes.
- A sign on the menu at the click: on a slow link the menu stays on screen 1.5 to 3.9 s before the toy's first paint.
- Real progress in the other heavy toys (Fire first), each in its own chat.

## Summary of Changes

- Menu: the fonts wait (1.2 s at most), a wait dot at twelve that turns into the comet, preloads for the Clock modules, an 8 s stall guard. Tom kept the dot with its pulse.
- Intro: `progress(part)` in `shared/intro.js`; a load line with a sheen at the foot of the flash box, shown only on a slow load. Tom approved the line and cut the breathing emblem.
- Shell: `stage(name, part)` and `buildSteps(n)` in `shared/stim.js`. Real progress in Window seat, Galaxy and Railgun.
- Tools and docs: `tools/loadtime.mjs`, `docs/plans/loading.md`, clips in `docs/qa/loading/`.
- Merged by PR 67 on 2026-11-16, on Tom's word.
