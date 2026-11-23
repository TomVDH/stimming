# Leaf shadows (`leafshadows`)

Status: built as a Lab toy, 2026-11-22; waits on Tom's look. Bean: `stimming-3a36`. Idea 76, group F, a calm ambient piece. Toy doc: [leafshadows.md](../toys/leafshadows.md).

Tom's brief: "MVP at high fidelity, with icons for the lab and intro as well, bar v3". Idea: "Dappled light through leaves on a wall. A slider sets the breeze."

## Defaults (Tom's open question: 3D or flat, and the presentation)

| | Choice | Why |
|---|---|---|
| Space | Flat. The stage is the wall, seen square on. The tree is out of view behind the eye; only its shadow shows. | The subject is the light on the wall. A visible tree is a prop. |
| Light | A late-afternoon sun from the upper left, 28 degrees up and 58 degrees off the wall's normal. Warm gold sun, cool grey-blue sky fill in the shadows. | The reference photos: warm cream plaster, grey-olive shadows, never black. The slant stretches each dapple into an ellipse down and to the right. |
| Leaves | Four layers by distance from the wall: far crown at 5.5 m and 3.6 m, in rosettes at the twig tips; a mid branch at 1.3 m; a near sprig at 0.55 m. | The blur of a shadow grows with the distance. Far leaves give round dapples; near leaves give crisp silhouettes. |
| Dapples | Each far layer is a leaf mask, blurred with an ellipse kernel: the sun's disc, with limb darkening, at that distance. | A gap in the leaves is a pinhole. Its spot on the wall is an image of the sun, not the shape of the gap. |
| Through-light | A leaf passes about 10% of the sun, yellow-green. | Single-leaf shadows read a little green and warm; stacks read grey. |
| Wall | Warm off-white lime plaster: a fine grain and broad trowel swirls, baked once per size. The sun rakes it, so grain shows in the light and fades in the shade. | The reference photos. |
| Hand | The pointer's hand stands 0.6 m from the wall: an open-hand shadow, drawn 1.4 times life size, with the forearm off the lower right. | The brief. At that distance the edge is soft by about 6 mm, and the fingers keep their shape. |
| Renderer | Raw WebGL2 on `shared/gl.js`; bloom from `shared/glow.js`. Five small programs. | Masks, blurs and a full-screen wall; no 3D scene needed. |

## The hero moment

Warm light on the plaster. The dapples and leaf shadows sway and shimmer as gusts move the branches.
The layers move apart: the crown sways slowly, twigs bob faster, leaves flutter and flip, so the dapples blink.
Breeze 0: still. Breeze 1: a gusty shiver. Gusts run across the wall from the left, as they would through the crown.
A tap or Space sends one gust through. The pointer casts a soft hand shadow that joins the leaves' shadows.

## Bar

| Control | Content |
|---|---|
| Action | Gust (Space): one gust through the tree |
| Slider | Breeze: still to gusty |
| How | Move: your hand's shadow. Tap: a gust. Space: a gust. |

## Sound (muted by default)

- Leaves rustle: two noise bands, left and right, that follow the gusts in the crown.
- Leaf ticks: short soft clicks, more of them as the leaves flutter; never twice the same.
- A low wind breath under it. A gust swells from left to right.
- The hand is silent. Breeze 0 is nearly silent.

## Frame loop

Drifting at 30 fps while the breeze blows. Lively while a gust or the hand moves. Asleep 60 s after the last input: the breeze eases out over 2 s. Hidden: stopped.
Reduced motion: no ambient sway. A gust or a slider move gives one slow soft sway that settles. The hand still follows.

## Tasks

- [x] Plan, references
- [x] Blockout on the stage, screenshot
- [x] Hero: layers, dapples, sway, flutter, gusts, hand
- [x] Sound
- [x] Bar v3
- [x] Icon round, emblems, intro emblem
- [x] Lab entry
- [x] QA, toy doc
