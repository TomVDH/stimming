# Contour map (`contour`)

Status: on the main shelf, 2026-11-23 (number 73, Science fair). Lakes, rivers, summit marks and Smooth added on Tom's ask. Waits on Tom: the Dutch name, sign-off. Bean `stimming-79us`, under `stimming-oh7b`. Idea 52, group B.
Tom's brief: "MVP at high fidelity, with icons for the lab and intro as well, bar v3".

## The toy

A topographic map sheet fills the stage. Press and hold to raise a hill under the pointer. Drag to raise a ridge. The right button, Alt or the Dig pick digs a valley.
The terrain swells. The contour lines flow, split and close into new rings at once. Where the land drops below zero, the sea floods in from the coast. The height labels move to stay on their lines.

## Defaults (Tom's open question: 3D or flat)

- **Flat, top down.** A contour map is a plan view; the hill shading gives the relief. A tilted 3D camera hides the lines on the far slopes.
- **The sheet.** The look of a national survey sheet in the Swiss manner:
  - hypsometric tints, sea blue through greens and tans to pale peaks
  - hill shading from the north-west, warm on lit slopes, cool blue-grey in shade
  - brown contour lines every 20 m, every fifth an index line, 100 m, bolder
  - heights on the index lines, in the line's brown, with a gap cut in the line; tops face uphill
  - blue depth lines in the sea, and three water-lines that follow the coast
- **The sea floods in.** The water spreads from the open sea, cell by cell, with a pale front. A basin dug inland stays dry until a channel joins it to the sea.

## Stack

Shader type: raw WebGL2 on `shared/gl.js`, one program.

| Part | Where |
|---|---|
| Height grid, 512 x 512 floats, brush, flood | CPU, `terrain.js` |
| Grid upload | `texSubImage2D` of the dirty rows |
| The sheet: bicubic height, shade, tints, lines | One fragment shader, `render.js` |
| Labels: marching squares on the index heights, kept from frame to frame | CPU, drawn on a 2D overlay canvas |
| Line gaps under labels | Up to 40 label boxes as uniforms |
| Sound | Web Audio, `sound.js` |

## Bar v3

| Control | Content |
|---|---|
| Choice | Raise, Dig |
| Slider | Brush: the hill's width |
| Action | New (N): a new land |
| Keys | Hold Alt: dig while it is down |

## Sound

- Earth: a low rumble of filtered noise while the land moves, louder with the rate.
- A soft pencil tick each time a contour passes under the pointer; an index line ticks lower.
- Water: a wash when the sea floods in, with the front's length; a small splash when an island breaks the surface.

## Frame loop

Lively while a press is down, the land settles, the flood runs or labels ease. No ambient motion: the loop sleeps when all four stop.
Reduced motion: the flood fills in one step, labels jump, no front.

## The water and the shelf move (2026-11-23)

Tom: "lets promote this to main -- let's ensure we add enough interactivity -- let's refine the water infill effect when creating lakes etc". He picked Summit marks and the Smooth tool, and the series Science fair. Beans `stimming-0n2b` and `stimming-j2fh`.

| Part | How |
|---|---|
| Lakes | A priority flood from the sheet's edges, in a module worker (`fill.js`), at most ten times a second |
| The infill | A hollow under the brush stays dry; on release the level rises from the bottom, a pale band on the advancing shore |
| Drain | A breached lake sinks to its new level in about a second, on its old shore |
| Rivers | From a full lake's outlet down the steepest fall to the sea or the next lake; they meander on flat ground |
| A new land | Small pits filled with a slight fall; the six largest basins stay as lakes |
| Summit marks | Peaks over 120 m with 55 m of rise: a triangle and the live height |
| Smooth | A third pick (S): each cell moves toward the mean of its neighbours |
| Shelf | Number 73, series science, version 1.5, stage alpha; the tile moves from the Lab; a still |

