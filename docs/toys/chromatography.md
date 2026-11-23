# Chromatography (`chromatography/`)

| | |
|---|---|
| Dutch | Chromatografie /ˌxroːmaːtoːɣraːˈfi/ (draft) |
| Motto | None |
| Shelf | Lab, tag "Stimming Lab" |
| Stage | None |
| Series | None |
| Accent | `oklch(0.74 0.15 325)` |
| Sound | Yes |
| Legacy build | No |
| Signed off | No |

## Idea

Idea 38, group F: a drop of ink on wet paper separates into coloured bands. Bean `stimming-8oev`. Plan: [chromatography.md](../plans/chromatography.md), an MVP.

## Rules

- One round filter paper, 150 mm, on a grid of 256 x 256 cells (0.6 mm a cell). The sim runs on the GPU in RGBA32F.
- Water flows down a capillary potential, W cubed, through a fibre permeability map. The front is sharp and slows as it grows.
- Four dyes ride the water at their own share of its speed (Rf): violet 0.16, magenta 0.38, cyan 0.6, yellow 0.83. The flux is upwind, so dye mass holds.
- Flowing water leaves a little dye on the fibres, slow dyes more. The bands trail, and a dark spot stays at the origin.
- Paper impurity rides the water at full speed and gathers as a faint brown tide line at the front.
- A tap puts a dot of ink down at once; its bead of water lands 0.3 s later and holds the paper under it full for 4 to 16 s (Water slider). A hold keeps the bead full while held, up to 40 s.
- The paper dries everywhere, faster where it is thin, so the drying edge draws water and dye outward.
- Inks, each a mix of the four dyes: black, brown, green, violet, navy. Mixed takes the next ink on each tap.
- The first sheet holds a dried black and a dried brown chromatogram, run before the intro clears.

## Direction

- Flat, top down. A circle that wicks from each dot, not a strip in a jar: a tap can land anywhere, every band shows as a full ring, and a jar would be a prop.
- White paper with a cloudy formation and fine fibres, raked by one key light from the upper left. Dark slate around it with a light pool.
- Dyes by Beer-Lambert in linear light; fibres take more dye than the gaps.
- Wet paper turns grey and see-through over the slate, holds a soft reflection of a window, and swells into a faint cockle. It dries to matt.
- The edges of the front and of each band fray along the fibres.
- The bead is a clear dome: it magnifies the paper, crowds the rings at its rim, holds the window and throws a caustic to the lower right.
- On a narrow stage the sheet grows and runs off both sides.

## Bar

| Control | Content |
|---|---|
| Choice | Ink: Mixed, Black, Brown, Green, Violet |
| Slider | Water |
| Actions | Drop (Space), New (N) |

## Sound

A felt nib tick for the dot, a soft plip for the drop, a faint paper fizz and fibre crackle while a front runs, a paper slide for New. Muted by default.

## Frame loop

Lively while a bead feeds; 30 fps while the paper dries; asleep when a once-a-second read finds it dry. After 60 s with no input the drying runs fast. Reduced motion: four times the sim speed, no bead wobble, New swaps at once.
