# Contour map (`contour/`)

| | |
|---|---|
| Dutch | Hoogtekaart /ˈɦoːxtəˌkaːrt/ (draft) |
| Motto | None |
| Shelf | Lab, tag "Stimming Lab" |
| Stage | None |
| Series | None |
| Accent | `oklch(0.76 0.12 70)` |
| Sound | Yes |
| Legacy build | No |
| Signed off | No |

## Idea

Idea 52, group B: press to raise hills; the contour lines and the height colours update live. Bean `stimming-79us`. Plan: [contour.md](../plans/contour.md), an MVP.

## Rules

- The land is one grid of 512 x 512 heights on the CPU, 40 m a cell, from -420 m to 1,900 m.
- Contours every 20 m. Every fifth is an index line, every 100 m, bolder and labelled.
- The brush is a Gaussian. A press raises 300 m a second at its centre and eases in and out. A drag also lays 6 m for each cell it covers, so a swept ridge rises.
- A fixed rock grain shapes raised land, so a brushed hill is uneven. Digging is even.
- The sea starts at the sheet's edges and floods through every cell below zero that it can reach, about 70 cells a second. A basin dug inland stays dry until a channel joins it to the sea.
- Labels keep their height. When the land moves, a Newton step pulls each label back onto its line. A label stands only where its line runs straight under it and the lines are not too dense; it fades when it cannot.
- New: a seeded land morphs in from the old one over 1.5 s. The first land is seed 77.

## Direction

- Flat, top down: a survey sheet in the Swiss manner. A tilted camera hides the lines on the far slopes.
- Hypsometric tints: pale blue shallows to deep blue, then green lowland, yellow-green, tan, brown and pale peaks.
- Hill shading from the north-west: warm cream on lit slopes, cool blue-grey in shade, more contrast on high ground.
- Brown contours; thin lines fade where they crowd closer than 2 px.
- Heights stand on the index lines in the contour brown, with a gap cut in the line. Their tops face uphill, unless that turns them past upright.
- The sea: a dark blue coastline, faint depth lines every 50 m, three water-lines that follow the coast.
- New water shows a pale front that clears in about half a second.
- The height grid draws as a cubic B-spline, so the lines stay smooth.
- The brush ring shows under a mouse: a solid ring and a cross to raise, a dashed ring and a bar to dig.

## Controls

Bar v3, from the `bar` spec in `initPage()`.

| Slot | Holds |
|---|---|
| Choice | Raise (R), Dig (D) |
| Action | New (N) |
| Slider | Brush: the hill's width |
| Stage | Hold: raise a hill. Drag: a ridge. Right button or Alt: dig. |

## Sound

Muted by default.

- A soft knock when the press lands.
- Earth: brown noise through a low-pass that opens with the land's rate under the brush. Digging is brighter and grittier.
- A pencil tick for each contour that passes under the brush, pitched by its height on a minor pentatonic; index lines tick an octave lower.
- A splash and bubbles when the land breaks the surface or the sea pours into a cut.
- A wash that follows the length of the flood front.
- New: paper slides across the desk, then a low settle.

## Frame loop

- Lively while a press is down, the land settles, the flood runs, a morph runs or labels ease.
- No ambient motion. The loop stops when all of them stop.
- Hidden: the loop stops at once.
- Reduced motion: the flood fills at once, labels jump, the brush is softer, New swaps at once.

## Files

| File | Holds |
|---|---|
| `contour/index.html` | The page |
| `contour/main.js` | Bar, view, brush, frame loop, pointer |
| `contour/terrain.js` | Height grid, generator, brush, flood |
| `contour/labels.js` | Height labels on the index lines |
| `contour/render.js` | The sheet shader |
| `contour/sound.js` | Web Audio |
| `docs/qa/contour/` | QA captures |
