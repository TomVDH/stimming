# Moire veils (`moire/`)

<!-- gen:identity -->
| | |
|---|---|
| Dutch | Moirésluiers /mʋaːˈreːˌslœyərs/ (draft, for Tom) |
| Motto | None |
| Shelf | Lab, tag "Stimming Lab" |
| Stage | None |
| Series | None |
| Accent | `oklch(0.8 0.13 68)` |
| Sound | Yes |
| Legacy build | No |
| Signed off | No |
<!-- /gen:identity -->

## Idea

Two sheer veils hang one behind the other against low evening light. Drag the front veil and broad moire bands race, bend and bloom across the folds.
The bands move far faster than the cloth: a slide of one thread width moves them one whole band.

## Rules

- The bands come from a model of the weave, never from screen pixels. They hold at every pixel ratio.
- Each veil's openness along a thread direction is a Fourier series (mean, first and second harmonic). The light through both veils is the product of the two series.
- Each cosine term of that product fades by its own phase step per pixel and per frame. The wide difference terms stay; the fine terms fade. Threads show only where the screen resolves them (2x); a fast slide blurs the bands into an even glow, as a camera would.
- The threads glow where they sit behind gaps in the other veil, so the bands change colour as well as brightness. The glow is weak (about a fifth of the direct light): a strong glow cancels the bands.

## Direction

- 3D or flat (Tom's open question): a fixed, straight-on view of two real, folded, lit cloths. Folds in depth, perspective between the layers (the rear veil hangs 3.5 units behind), no orbit camera. Chosen by the build chat for the MVP.
- Look rule: a dark room, a low sun behind both veils with a wide warm halo, a dim cool room light in front for a sheen on the fold crests. Bloom, grade and a filmic curve.
- Reference: photos of watered silk (the moire "eyes") and of overlapping window screens (bands far wider than the threads).
- True details: the hem is a double ply of the same cloth with a wavering seam, so it carries a chain of light beads. The sun through each weave throws a diffraction cross along its threads, smeared into colour. A steep fold packs more thread into a pixel, so it is denser and glows more.
- Icon: A of `icons/spike-moire-1.html` (no pick from Tom yet). Intro emblem: its silhouette, `shared/emblems/moire.svg`.

## Controls

<!-- gen:bar -->
Bar: v3.

| Slot | Holds |
|---|---|
| Top left (choice) | Cloth (segments): Voile, Silk, Mesh (keys 1 to 3) |
| Actions | Gust (held, G) |
| Slider | Twist: the angle between the veils, 0 to 8 degrees |
| Key strip | drag: slide · click: push · arrows: nudge · G: gust |
| Settings | Weave (fine to open), Quality, Reset |
| Dev (`?dev`) | None |
<!-- /gen:bar -->

| Gesture | Does |
|---|---|
| Drag | Slides the front veil on its rail. The cloth near the hand leads; the rest follows on a spring. The pull bends the bands into eyes round the hand; on release it rings back. |
| Click or tap | Pushes the cloth: a ring of push runs outward and the bands ripple in rings |
| Keys | Left and right nudge the veil (Shift for more); up and down change the Twist; 1 to 3 pick the cloth; hold G for a gust |
| Wheel, pinch, tilt | None |

## Cloths

| Cloth | Threads | Look |
|---|---|---|
| Voile | Fine plain weave, a little light through each thread | Warm white glow, soft sheen, deep pleats |
| Silk | Shot organza: gold front, teal rear | Colour bands, a sharp sheen on the crests |
| Mesh | Bronze wire screen, opaque | Crisp bands, metal glints, almost flat, a strong diffraction cross |

## Renderer and libraries

Raw WebGL2 on `shared/gl.js`, `shared/glow.js` (bloom chain) and `shared/grade.js`. No three.js, no Tone.js.
Two passes: `VEIL_FS` (`moire/veil.js`) draws both veils into an RGBA16F target; `FINAL_FS` adds bloom, the grade and the filmic curve.
`moire/main.js` holds the state, the springs, the pointer, the sound and the frame loop.

The state block is eight vec4 for this frame and eight for the frame before: slide, twist, breeze clock, gust; fold depth, sway, billow; three pull blobs; three tap rings. The shader evaluates every phase for both frames to get the per-frame phase step.

## Sound

Raw Web Audio on the shell's `audioKit`, muted by default.

- Rustle: looped noise through a band-pass; its level and centre follow the cloth's speed. Short noise grains at a rate that follows the speed.
- Rail: a two-partial brass tick each time the slide passes one ring spacing, pitch and level jittered.
- Beats: two close sine tones and their octave; the beat rate follows the rate of bands passing the hand. The acoustic twin of moire.
- Gust: low wind noise, swept. Tap: the soft thump of a palm on cloth.
- Everything pans with the hand.

## Frame loop

- Lively (a hand, a spring, a ring or a gust in motion): full rate.
- Drifting (the breeze sways the veils): 30 fps on a 28 ms timer.
- Asleep: 60 s after the last input the breeze eases to a stop over 2 s and the loop stops.
- Hidden: stops at once; the breeze clock stops with it.
- Reduced motion: no breeze; springs damped to no overshoot; tap rings slower and weaker.
- Performance ladder: pixel ratio 1, then three bloom levels, then the veils at three quarters size.

## QA

Captures in `docs/qa/moire/`. Results in the bean `stimming-p32r`.
