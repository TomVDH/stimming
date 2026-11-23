# Fjord aurora (`aurora`)

Status: built as a Lab toy, 2026-11-22; waits on Tom's look. Bean: `stimming-fzek`. Idea 18, group C.

Tom's brief: "MVP at high fidelity, with icons for the lab and intro as well, bar v3". Idea: "A slider sets the solar wind; curtains ripple and reflect in still water."

## Defaults (Tom's open question: 3D or flat, and the presentation)

| | Choice | Why |
|---|---|---|
| Space | 3D sky, flat stage. The curtains are true sheets 90 to 300 km up, on a curved Earth. The camera does not move. | Perspective makes the folds and rays fan toward the horizon, as in the photos. A fixed camera keeps it a diorama. |
| Camera | On the shore, 2 m above the water, level, looking north up the fjord. About 80 degrees across. | The horizon stays level, so the water is an exact mirror of the sky above it. |
| Frame | The horizon at 36% from the foot (off-axis shift, no tilt). Mountain walls left and right, a far snowy range in the gap. | The V of the walls frames the curtains; the water below doubles them. |
| Renderer | Raw WebGL2 on `shared/gl.js`; bloom from `shared/glow.js`. | Per-pixel sky maths; no meshes. |
| Look | Long-exposure colour: navy sky, saturated green, pink hem, faint red tops. | Fjord photos of Lofoten and Tromsø show this; the eye sees less colour. |

## The scene

1. **Sky:** navy, lighter toward the horizon; a faint green airglow band about 7 degrees up; stars, slow twinkle. Window seat's airglow is seen from orbit, so this toy draws its own.
2. **Aurora:** two or three curtains, east to west. Each is a thin vertical sheet that folds; rays stripe it. Green 557.7 nm from 100 to 180 km, red 630 nm above 200 km, a pink hem at the foot when the wind is strong. A ray that runs along a fold sees more sheet, so folds glow brightest.
3. **Mountains:** three ridge layers, jagged; snow in gullies and on the upper slopes. Snow takes the colour of the aurora light.
4. **Water:** a still mirror with a faint slow swell. Fresnel: bright near the horizon, dark at the foot of the frame.

## The hero moment

The Solar wind slider sets the activity. A rise starts a substorm: the arc brightens from the east, a surge runs west, the folds deepen, the rays race, the hem turns pink and the curtains climb toward the zenith. Then the storm eases to the level the slider holds. A tap sends a gust: a brightening that runs along the nearest curtain from the tap.

## Bar

| Control | Content |
|---|---|
| Slider | Solar wind |
| Action | Gust (Space) |
| How | Tap the sky: a gust. Drag up or down: the wind. Space: a gust. |

## Sound (muted by default)

A low pad on the wind level, soft air over the water, faint crackles in a strong storm (the reported aurora sound), a shimmer on each gust.

## Tasks

- [x] Bean, plan, reference photos
- [x] Blockout and screenshot (`docs/qa/aurora/01-blockout.jpg`)
- [x] Hero moment, sound, bar
- [x] Icons, emblems, Lab entry
- [x] QA Q1 to Q10, toy doc (`docs/toys/aurora.md`)
