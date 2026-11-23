# Kiwi (`kiwi`)

Status: done as an MVP, 2026-11-23; waits on Tom. Bean `stimming-7pgt`. Toy doc: `docs/toys/kiwi.md`.
Ask (Tom, 2026-11-23): a new toony fruit toy that uses the rendering ideas of raspberry.luruke.com.

## The hero moment

One big toony kiwi on a dark ground, lit from the front left and hard from behind.
Press it: it squishes, springs back and its fuzz ruffles.
Swipe across it: it slices in two. The halves slide apart and swing their cut faces to the eye.
The face is rays of emerald juice beads round a cream core, with a ring of black seeds. The rim light glows through the thin creases between the beads.

## Reference

| Source | What it gives |
|---|---|
| raspberry.luruke.com | The look: turbid drupelets, fine hairs, a lens finish. It shows no licence: no code is copied. Every shader here is our own. |
| Commons, "Backlit Kiwi" (Shantanu Arya, CC BY 3.0) | Bright rays between the cells, a pale core, a dark ring of seeds |
| Commons, sliced and green kiwifruit | Brown fuzzy egg, pale band under the skin, seeds in slots of the locules |

## Techniques, reworked

| Raspberry idea | Kiwi |
|---|---|
| Each drupelet a turbid sphere | Each juice cell is an instanced ellipsoid. The shader marches four steps along the view chord in the bead's unit-sphere space. At each step it runs a second chord to the key and to the rim light. Beer-Lambert over both chords, per colour channel, gives the green. Thin rims let the glowing bed behind show through. |
| Hairs as camera-facing ribbons | Fuzz: instanced ribbons on four control points, rooted on the skin. Wrap light along the fibre (Kajiya-Kay), root colour from the skin, a hot rim from behind. The ribbons lag the body and ruffle on a squeeze. |
| Velvet for fine fuzz | A sheen term on the skin at grazing angles, scaled by the Fuzz slider |
| Baked soft light (SH transfer) | Skipped. No cheap path in the browser without an offline bake. A hemisphere fill stands in. |
| Lens finish | Depth of field with a disc gather, bloom, ACES (AgX lifted the dark ground to grey), vignette, grain. Quality presets set the samples, hair count and pixel ratio. |

## Toon

A three-band ramp on the key light for skin, core and bed. Crisp wet glints on beads and seeds. Squash and stretch on every press, slice and join.

## Interaction

| Input | Act |
|---|---|
| Press the kiwi | A dent where pressed; release springs it back with a hop |
| Hold | Squeeze: it squashes flat, the fuzz ruffles |
| Swipe across | Slice: a juice burst, the halves fall open |
| Tap a half | A wobble runs out from the tap |
| Tap the gap | Join: the halves snap back |
| Keys | Space slices or joins, hold S squeezes |

## Bar v3

Actions Slice (Space) and Squeeze (S, hold). Slider Fuzz. Quality in Settings.

## Stack

Scene type: three.js 0.170, WebGL2, custom shader materials only. Modules: `glsl.js` (light, dent, bead optics), `fruit.js`, `fuzz.js`, `juice.js`, `post.js`, `sound.js`, `main.js`.
