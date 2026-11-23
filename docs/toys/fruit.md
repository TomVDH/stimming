# Fruit slice (`fruit`)

Lab toy. Bean `stimming-7pgt`. Plan: `docs/plans/fruit.md`. Started as Kiwi (2026-11-23); renamed when the fruits became ten.

One big fruit on a dark ground, under a warm key from the front left, a hot rim light from behind and a soft top light. Far lamps open into soft discs behind it.

## Fruits

| Key | Fruit | Inside |
|---|---|---|
| 1 | Kiwi | Flesh drawn at two depths, wandering pale rays; 38 spokes of jelly cells, each a juice bead round a black seed; a raised fibrous core. Fuzz with rubbed short patches |
| 2 | Pomegranate | 380 arils as real geometry: long teardrops pressed flat against their neighbours, juice lit through to a seed inside; some sliced flat at the cut. Open chambers between spongy pith walls; a crown with dry stamens |
| 3 | Blood orange | Ten segments of juice sacs drawn per pixel, the red flush in patches |
| 4 | Peach | Gold flesh, red at the stone; a ridged stone in one half, its hollow in the other |
| 5 | Dragon fruit | White flesh speckled with black seeds in clear gel; curled bracts on the skin |
| 6 | Rambutan | Glassy white flesh round a brown seed; long hooked spines (the fuzz ribbons) |
| 7 | Mangosteen | A thick crimson rind round white segments; a green four-lobed cap |
| 8 | Passion fruit | A mound of 300 soft golden jelly sacs as real geometry, each with a dark seed off its middle, over a juice floor; a thick spongy pith with a yellow lining. Skin: deep purple folds and dimples, fine white specks |
| 9 | Starfruit | A star slice: translucent yellow flesh, a pale star core, brown seeds |
| 0 | Fig | A white rind round red fibres and pale seeds, a small dark hollow |

## Play

| Input | Act |
|---|---|
| Press the fruit | A dent where pressed. Release: it springs back with a hop. |
| Hold | Squeeze: the fruit squashes flat and its fuzz ruffles. |
| Swipe across it | Slice: juice in the fruit's colour bursts out; the halves swing their faces to the eye. |
| Tap a half | A wobble runs out from the tap. |
| Tap the gap | Join: the halves meet with a thunk. |
| Pick a fruit | The fruit on stage rolls off to the left; the new one rolls in from the right. |
| Keys | 1 to 0 pick a fruit, Space slices or joins, hold S squeezes |

## Bar v3

Choice Fruit (ten options, a stepper; keys 1 to 0). Actions Slice (Space) and Squeeze (S, hold). Slider Fuzz, kept per fruit: any fruit can grow fuzz. Quality in Settings.

## How it works

three.js 0.170, WebGL2, custom shaders only. The ideas of raspberry.luruke.com are reworked as our own code; no code is copied (that page shows no licence).

| Part | File | Method |
|---|---|---|
| Depth | `half.js` | The cut-face shader passes the view ray's slide per unit depth (`gPar`); a fruit samples its flesh again below the cut. |
| Light | `glsl.js` | Wrap diffuse with a scatter tint; reflections of a procedural studio (key, rim, fill and top softboxes) blurred by roughness; Schlick Fresnel |
| Halves | `half.js` | A lathe skin per half, the cut face at x = 0. Skin colour, specks and pores run in fruit space, so the seam does not show. |
| Cut face | `half.js` | A disc that follows the fruit's outline (a crease, a star), or a ring round a pit. Each fruit gives its colour and a relief; the relief bends a wet film that reflects the studio. |
| Arils | `arils.js` (pomegranate, passion fruit) | Each aril is its own mesh: a teardrop whose radius is capped by a smooth minimum against the plane to each neighbour, and by the cut plane. Shading runs in the aril's own sphere space: the view chord, the seed, Beer-Lambert, a sharp studio reflection. Contact and depth darken it. |
| Juice beads | `half.js` | Instanced ellipsoids. Four steps along the view chord in the bead's own space, a chord to each light from every step, Beer-Lambert per channel. A seed inside ends the view ray: seen through the juice. |
| Fuzz | `fuzz.js` | Instanced ribbons on four control points with fibre wrap light. Per fruit: count, length, width, lift and curl (the rambutan's spines). |
| Fruits | `kiwi.js` to `fig.js`, listed in `fruits.js` | Shape, skin look, tip parts, the cut face |
| Juice | `juice.js` | Up to 120 drops with the bead optics, stretched along their flight |
| Finish | `post.js` | Depth of field (disc gather), bloom, ACES, vignette, grain |

Baked soft light (spherical-harmonic transfer) is skipped: it needs an offline bake.

## Sound

Raw Web Audio on the shared kit, muted by default: a squelch, a boing, a knife swish with juice ticking down, a thunk when the halves meet or a fruit lands.

## Frame loop

Lively at full rate while anything moves; drifting at 30 fps; asleep 60 s after the last input. A swap compiles the new shaders at once and restarts the slow-frame watch. Reduced motion: no drift, a smaller burst, no roll (the fruit swaps in place).
QA on D3D11 (RTX 3070, headless Edge, 1280 x 800): every fruit 7.6 to 7.8 ms median during a slice; no quality step after nine swaps.

## Known

- Tom sets the Dutch name; "Fruitsnee" is a draft.
- The menu icon is still the kiwi of round kiwi-1.
- Next: a raspberry-grade procedural pass, one fruit at a time (Tom, 2026-11-23).
