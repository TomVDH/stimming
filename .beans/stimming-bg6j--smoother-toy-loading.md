---
# stimming-bg6j
title: Smoother toy loading
status: in-progress
type: task
priority: low
created_at: 2026-11-04T12:00:00Z
updated_at: 2026-11-10T17:04:15Z
---

Make toys open faster from the menu. Shelved by Tom on 2026-11-04 in favour of the toy builds.

## What the baseline showed

Headless Chromium, cold and warm opens, measured on 2026-11-04.

| Toy | CDN on cold open | Page `load`, cold / warm | Intro clears at |
|---|---|---|---|
| Pop field | 12 files, 234 KB | 0.8 / 0.4 s | 7.5 s |
| Snow globe | 13 files, 210 KB | 0.4 / 0.06 s | 7.7 to 8.6 s |
| Galaxy | 8 files, 283 KB | 0.6 / 0.08 s | 5.6 to 6.2 s |
| Prism | 2 files, 157 KB | 0.7 / 0.2 s | 6.1 to 6.5 s |
| Glass | 14 files, 178 KB | 0.4 / 0.07 s | 10.6 to 11.9 s |

- Most of the wait is the intro, not library loading.
- After the intro, the largest frame gap was 17 to 50 ms, with no long tasks. Headless runs on SwiftShader, so a real-GPU stutter does not show; a trace from a real machine is needed.
- jsdelivr URLs are versioned and served `immutable` for a year, so a fixed warm list stays valid.

## Plan (2026-11-09)

Tom asked for staged, chunked loading with caching, toy by toy, heaviest first. The contract, recipe and numbers are in `docs/plans/loading.md`.

- [x] Baseline: menu and 36 toys, fast and throttled
- [x] Menu: GSAP preload; warm the shell in idle time; warm a toy on hover, focus or touch
- [x] Shell: `stage()`, `idle()`, `pageReady()`, `later()`; one `toys.json` request per page
- [x] TV tree: preloads, stage marks, first-frame `ready`, tree mesh in a worker
- [x] PR 35 merged; all 36 pass the harness on Pages
- [x] All 35 other main-shelf toys: preloads, stage marks, first-frame `ready`; results in `docs/plans/loading.md`
- [ ] Tom checks sound and a direct cold link on Pages
- [x] Trails, Wind map: parallel shader compile
- [x] Launch and Frietkot use the stage contract
- [ ] Railgun, Train ride, Foghorn: not converted
- [ ] Slow-load cue: candidates in `introlab/` for Tom to pick
- [ ] Elective offline cache: service worker behind a "Keep offline" switch

## Options (2026-11-04)

- [ ] Intro length: a shorter hold, or tap to skip. This is Tom's design call.
- [ ] A1. The menu warms the browser cache in idle time: fetch only, never run. The list is in the notes below.
- [ ] A2. Speculation Rules prerender on hover (Chrome and Edge), plus a `document.prerendering` guard in `shared/intro.js`.
- [ ] A3. Fold shader compile and the first frame into `ready`. Try it on Pop field first, after a real-device trace.

## Notes

- **Warm list:**
  - `three@0.170.0/build/three.module.min.js`
  - the `+esm` bundles for culori 4.0.1, gsap 3.13.0 and simplex-noise 4.0.3
  - `tone@15.0.4/+esm`, plus `standardized-audio-context@25.3.72`, `tslib@2.6.2` and `automation-events@7.0.5` (`+esm`)
  - the postprocessing set: EffectComposer, RenderPass, UnrealBloomPass, OutputPass, ShaderPass, MaskPass, Pass, CopyShader, LuminosityHighPassShader and OutputShader
  - RoomEnvironment, RoundedBoxGeometry and BufferGeometryUtils
  - Galaxy's `three@0.186.1`: webgpu, tsl and core builds, plus its addons
- **Measurement method:** a Playwright script logs CDN responses through CDP `Network.responseReceived`. It times the intro end by watching for the `.intro` element's removal, and it watches long tasks and rAF gaps for 2 s after the intro.
