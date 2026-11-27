---
# stimming-8fp7
title: 'Doodle Hunt: a realistic chip-art die (Lab, Shader type)'
status: in-progress
type: feature
created_at: 2026-11-27T07:43:24Z
updated_at: 2026-11-27T07:43:24Z
---

Redo of the parked doodlehunt-kimi after Tom's verdict. Direction from the spike stimming-gj2i (Silicon Zoo, IEEE Spectrum, NPR): the die must read as a real optical die photo (bond-pad ring, seal ring, floorplan blocks, bus channels, per-block thin-film colour), and the doodles must be flat single-metal polygonal line art at true scale, hidden where engineers hid them (pad ring, block gaps, corners), invisible zoomed out, resolving as you zoom. The hunt is zoom-driven, like Davidson's microscope. Die art (stimming-p5o6) is not what Tom wanted; no overlap concern. Reuse the shell (input, loop, tally, persistence) from doodlehunt-kimi/index.html; replace the die and doodle rendering. Fresh id: doodlehunt.

- [x] Die floorplan: pad ring, seal ring, SRAM/logic/analog blocks, bus channels
- [x] Per-block thin-film colour, optical-microscope lighting
- [x] Doodles: flat metal line art, authentic subjects and placements, true scale
- [x] Zoom-driven hunt: speck at 1x, suspicious at mid, clear at high zoom
- [x] Found feedback + tally, persistence, Reset reseeds
- [x] toys.json entry (id: doodlehunt), commits via commit.sh --no-push
- [x] QA: node --check, glslangValidator, importmap diff

## Summary of Changes

- `doodlehunt/index.html`: fresh build (about 850 lines, inline module of 782). The shell carries over from the parked build: Bar v2 (slider now "Light", driving the lamp tilt), gestures, frame loop with 60 s drift, watchdog rungs, tally dots, seed/found persistence, intro, fail line, context loss handling.
- The die is now a real floorplan. A seeded BSP splits the core into up to 20 blocks; blocks step back from their cells so routing channels open between them. The largest arrays become SRAM (dense two-tone crosshatch fabric), one mid block becomes analog (large concentric inductor curves), long thin cells become buses (parallel metal runs), the rest are standard-cell logic (striped rows, per-row shade, fine cell seams) or empty silicon. A seal ring and a bond-pad ring with wire stubs frame the die; pads centre on whole pitches so gap slots stay computable on the CPU. Each block gets a thin-film colour from a restrained metallic oklch palette (SRAM gold-green, logic blue-purple, buses pale, analog copper). Lighting is brightfield: flat per material, a soft pointer lamp tilt, static grain, lamp falloff, vignette, dither. All finest textures fade to their mean before they alias.
- The doodles render as flat metal line art in the wire metal, a whisper off the local tone (x 0.92 or 1.08), under the same lamp term: no groove, no hue shift, no emboss. Subjects: biplane, owl, snake, license plate DH-01, cat, train, smiley. Strokes dissolve when thinner than about a pixel (a 0.05 alpha floor keeps them a subliminal speck), so 1x shows nothing, mid zoom a suspicious irregularity, high zoom (ceiling 48x fit) clear line art. Placement follows the research: one doodle between two pads in the pad ring, one in a seal-ring corner, the rest in block gaps; rotation snaps to 90 degrees with a whisper. Found feedback unchanged: soft ring pulse (skipped under reduced motion), persistent metal glow, tally dots, one slow lamp sweep at 7/7.
- `toys.json`: entry `doodlehunt` between dieart and doubleslit, series "poke", accent a metallic gold-green/purple/gold gradient, tech filled by `tools/techtags.mjs --write` (tier webgl2). Only the doodlehunt entry changed.
- QA without a browser: `node --check` passes; the importmap diffs byte-identical to `docs/standards/code.md`; `glslangValidator` accepts the assembled fragment shader; a 500-seed numeric run shows no doodle outside the die, no doodle touching a pad (min slot margin 0.336), max 20 blocks, all five block types present. Not verified: the look, bar collisions at 1280 / 375x812 / 812x375, pinch on touch hardware, runtime console.
