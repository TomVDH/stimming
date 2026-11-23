# Chromatography (`chromatography`)

Status: built, 2026-11-23. Waits on Tom: the look, the Dutch name, sign-off. Bean `stimming-8oev`, under `stimming-oh7b`. Idea 38, group F.
Tom's brief: "MVP at high fidelity, with icons for the lab and intro as well, bar v3".

## The toy

A round sheet of white filter paper lies on a dark slate bench under one soft key light.
Tap the paper: a dot of marker ink lands there, and a drop of water lands on the dot.
The water creeps out through the fibres as a grey, translucent ring with a damp sheen.
The ink lifts and smears, then parts into soft rings of violet, magenta, cyan and yellow, each at its own speed.
The feed stops, the water slows, and the paper dries to matt from the edges in. The rings stay, with a sharp tide line at the outer band.
Tap again: another ink with another mix.

## Defaults (Tom's open question: 3D or flat, and the presentation)

- **Flat, top down.** Chromatography is read from above. The light gives depth: a raking key light on the fibre tooth, a soft reflection of a window in the wet paper, a bead of water with refraction.
- **A circle that wicks from the dot, not a strip in a jar.**
  1. A tap can land anywhere: each dot becomes its own centre.
  2. Radial development shows every band as a full ring at once. It is richer to look at.
  3. A strip needs a jar and a fixed start line. A jar is a prop, and a strip lets a tap choose along one line only.
- **The sheet.** One round filter paper, 150 mm, fills about 90% of the stage height. It sits on dark slate. Two dried chromatograms are on it at the first frame.
- **Inks.** Each ink is a mix of four dyes. Default "Mixed": each tap takes the next ink (black, brown, green, violet, navy).
- **Scale.** One tap at the default Water makes a ring about a third of the sheet's radius. On a narrow stage the sheet grows and runs off both sides.

| Dye | Colour | Mobility (Rf) |
|---|---|---|
| Violet | violet | 0.16 |
| Magenta | magenta | 0.38 |
| Cyan | cyan-blue | 0.60 |
| Yellow | yellow | 0.83 |

## Reference (looked at before the build)

- Wikimedia Commons, "Chromatography of marker ink" strip photos: soft, broad blobs, never hard lines; a dark band at the origin; colours overlap where two dyes meet (cyan over yellow reads green).
- Runge's capillary pictures (1850s, Commons): radial rings with fingered, ray-like outer edges where the front ran along the fibres.
- Radial coffee-filter chromatograms of washable black: violet at the centre, a pink ring, a blue ring, a yellow or teal edge with a dark tide line; wet paper goes grey and see-through.

## Stack

Shader type: raw WebGL2 on `shared/gl.js`. Three small programs: step, splat, view.

| Part | Where |
|---|---|
| Fibre map: formation cloud and fibres, drawn once in Canvas 2D | `paper.js` |
| Wicking sim: water W, four moving dyes and four held dyes on a 256 x 256 grid over the sheet, RGBA32F, 8-neighbour flux | `sim.js`, a step program with three outputs |
| The view: paper, dyes by Beer-Lambert, wet greying, sheen, the bead, the slate | `render.js`, one program |
| Sound | Web Audio, `sound.js` |

The sim:
- Water flows down a capillary potential P(W) = W^3, through a fibre permeability map. The front is sharp and slows as it grows (Washburn-like).
- Each dye flows with the water at its own fraction (Rf), upwind, so mass holds. A small diffusion softens the bands.
- A bead on the dot holds the water at 1 while it lasts. Evaporation is slow and runs everywhere wet.
- Dye in dry paper does not move.
- Flowing water leaves a little dye on the fibres, slow dyes more, so the bands trail and the origin keeps a dark spot.

## Bar v3

| Control | Content |
|---|---|
| Choice | Ink: Mixed, Black, Brown, Green, Violet |
| Slider | Water: how much water each drop gives |
| Actions | Drop (Space): a dot at a free place; New (N): a clean sheet |
| How | Tap: dot and drop. Hold: keep the water coming. Space. N. |

## Sound

- A felt nib tick when the dot lands; a soft "plip" when the drop lands.
- A faint paper fizz while a front runs, with the front's speed.
- A paper slide for New.

## Frame loop

Lively while a front runs or a bead feeds. Drifting at 30 fps while the paper dries. Asleep when the paper is dry, or 60 s after the last input (the drying then finishes in 2 s).
Reduced motion: the development runs four times as fast, with no bead wobble.
