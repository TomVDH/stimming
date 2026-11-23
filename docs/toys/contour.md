# Contour map (`contour/`)

| | |
|---|---|
| Number | 73 |
| Dutch | Hoogtekaart /ˈɦoːxtəˌkaːrt/ (draft) |
| Motto | None |
| Shelf | Main shelf (Tom, 2026-11-23), stage alpha, version 1.5 |
| Series | Science fair (Tom's pick) |
| Accent | `oklch(0.76 0.12 70)` |
| Sound | Yes |
| Legacy build | No |
| Signed off | No |

## Idea

Idea 52, group B: press to raise hills; the contour lines and the height colours update live. Bean `stimming-79us`. Plan: [contour.md](../plans/contour.md), an MVP.
Tom, 2026-11-23: "lets promote this to main", with more interactivity and a better water infill for lakes. He picked Summit marks and the Smooth tool (bean `stimming-0n2b`).

## Rules

- The land is one grid of 512 x 512 heights on the CPU, 40 m a cell, from -420 m to 1,900 m.
- Contours every 20 m. Every fifth is an index line, every 100 m, bolder and labelled.
- The brush is a Gaussian. A press raises 300 m a second at its centre and eases in and out. A drag also lays 6 m for each cell it covers, so a swept ridge rises.
- A fixed rock grain shapes raised land, so a brushed hill is uneven. Digging is even.
- Smooth moves each cell under the brush toward the mean of its neighbours, so ridges soften and pits level out.
- The sea starts at the sheet's edges and floods through every cell below zero that it can reach, about 70 cells a second.
- Lakes: a priority flood from the sheet's edges gives each cell the level where its water spills. Cells under that level form lakes; a lake must be 2.5 m deep and 14 cells wide. It runs in a module worker (`fill.js`), at most ten times a second, about 25 ms a run.
- A new land fills its small pits with a slight fall and keeps its six largest basins as lakes.
- A lake fills from its bottom to its brim in 1.5 s to 6 s, by its size. A hollow born under the brush stays dry until the brush leaves it, then the water pours in.
- A breached lake drains to its new level in about a second, on its old shore.
- Rivers: a full lake spills from its outlet, the lowest cell on its shore. The river takes the steepest fall of the filled surface to the sea, another lake or the edge, and grows at 110 cells a second. On flat ground it meanders.
- Summit marks: a peak at least 120 m high that stands 55 m over a ring of 16 cells gets a triangle and its height. At most ten, 120 px apart, highest first. The number follows the peak as it rises.
- Labels keep their height. When the land moves, a Newton step pulls each label back onto its line. A label stands only where its line runs straight under it, on dry land, clear of summit marks; it fades when it cannot.
- New: a seeded land morphs in from the old one over 1.5 s; its lakes fill as it settles. The first land is seed 77.

## Direction

- Flat, top down: a survey sheet in the Swiss manner. A tilted camera hides the lines on the far slopes.
- Hypsometric tints: pale blue shallows to deep blue, then green lowland, yellow-green, tan, brown and pale peaks.
- Hill shading from the north-west: warm cream on lit slopes, cool blue-grey in shade, more contrast on high ground.
- Brown contours; thin lines fade where they crowd closer than 2 px. Land contours stop at the water.
- Heights stand on the index lines in the contour brown, with a gap cut in the line. Their tops face uphill, unless that turns them past upright.
- Water, sea and lakes alike: tinted by depth, a dark blue shoreline, faint depth lines every 50 m, three water-lines that follow the shore.
- New sea water shows a pale front that clears in about half a second.
- A rising lake shows a pale band at its advancing shore and a lighter skin, both gone once it is full.
- A full lake shows its level in blue italic over its deepest point.
- Rivers are blue lines, wider downstream, hidden where they run under water.
- Summit marks: a dark triangle and the height, with a gap cut in the lines under them.
- The height grid draws as a cubic B-spline, so the lines stay smooth.
- The brush ring shows under a mouse: a solid ring and a cross to raise, a dashed ring and a bar to dig, a dotted ring and a dot to smooth.

## Controls

Bar v3, from the `bar` spec in `initPage()`.

| Slot | Holds |
|---|---|
| Choice | Raise (R), Dig (D), Smooth (S) |
| Action | New (N) |
| Slider | Brush: the hill's width |
| Stage | Hold: raise a hill. Drag: a ridge. Right button or Alt: dig. |

## Sound

Muted by default.

- A soft knock when the press lands.
- Earth: brown noise through a low-pass that opens with the land's rate under the brush. Digging is brighter and grittier.
- Smooth: a soft rasp, like a hand brushing sand.
- A pencil tick for each contour that passes under the brush, pitched by its height on a minor pentatonic; index lines tick an octave lower.
- A splash and bubbles when the land breaks the surface or the sea pours into a cut.
- A wash that follows the length of the sea's flood front.
- A trickle while lakes rise, louder with the climb; a light babble while a river runs out.
- A small high pip when a new summit mark lands, pitched by its height.
- New: paper slides across the desk, then a low settle.

## Frame loop

- Lively while a press is down, the land settles, the flood runs, a lake rises or drains, a river grows, a morph runs, a fill is asked for, or labels and marks ease.
- No ambient motion. The loop stops when all of them stop.
- Hidden: the loop stops at once.
- Reduced motion: the flood and the lakes fill at once, rivers run at once, labels and marks jump, the brush is softer, New swaps at once.

## Files

| File | Holds |
|---|---|
| `contour/index.html` | The page |
| `contour/main.js` | Bar, view, brush, frame loop, pointer, ink layer |
| `contour/terrain.js` | Height grid, generator, brush, smoothing, sea flood |
| `contour/fill.js` | Lakes and rivers: priority flood, also a module worker |
| `contour/water.js` | Lake levels, the fill and the drain, rivers |
| `contour/summits.js` | Summit marks |
| `contour/labels.js` | Height labels on the index lines |
| `contour/render.js` | The sheet shader |
| `contour/sound.js` | Web Audio |
| `shared/stills/contour.webp` | The menu's hover still |
| `docs/qa/contour/` | QA captures |
