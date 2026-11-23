# Stir vortex (`stirbar`)

Status: built as an MVP, 2026-11-23; waits on Tom. Bean `stimming-yelr`. Toy doc: `docs/toys/stirbar.md`. Idea 85, group A: "Spin up a magnetic stir bar; a vortex funnels down into the beaker and drags dye with it."

## The hero moment

A glass beaker of water stands on a magnetic stirrer on a dark lab bench. A white stir bar lies on the floor of the beaker.
Turn the knob: the bar spins up, the water follows it, and the free surface dips into a smooth funnel. The funnel deepens toward the bar as the speed rises.
Tap the beaker: a pipette comes down and lets one drop of dye fall. The drop plunges, spirals in, wraps into helical threads and is drawn down the funnel.
Turn the knob down: the bar stops at once, the water spins on, the funnel relaxes and the swirl decays slowly.

## Defaults (Tom's open question: 3D or flat, and the presentation)

| | Choice | Why |
|---|---|---|
| Space | 3D, a fixed camera a little above the water line | The funnel is a shape in depth; from a little above, the eye sees the dip in the surface and the silver funnel through the side of the glass. |
| Renderer | Raw WebGL2 on `shared/gl.js`: a dye splat pass, a bench pass, a scene pass, bloom from `shared/glow.js`, the grade from `shared/grade.js` | Small programs link fast on D3D11. Signed distances draw the stirrer, the beaker, the bar and the pipette. |
| Water | A height field for the free surface (a vortex profile that keeps the volume); the march refracts at the surface and the wall, with total internal reflection | Total internal reflection gives the funnel its silver look from the side, as in the photos. |
| Dye | Tracer particles on the CPU in an analytic stirred flow (a vortex with a core, Ekman pumping: out along the floor, up the wall, in under the surface, down the core). The particles splat into a 3D atlas; the march reads it by Beer-Lambert. A helical pattern that turns with the core shapes the density into strands. | The secondary flow draws the dye in under the surface and down the funnel. The tracers alone blur into a tube at the core; the pattern gives the helical threads, as Fire's grain gives its smoke detail. |
| Light | Dark room; a soft glow on the wall behind the beaker, a cool key from the back left | Dye reads as colour against light behind it, as in lab photos. The rest of the stage stays dark. |
| Stirrer | One rounded body with a white ceramic top and one knob on the front; a small lamp that glows with the speed | One bold object; the knob is the gesture. |
| Dyes | Blue, Violet, Green (fluorescent) | Blue food dye, permanganate and fluorescein: the three dyes of the classic demonstration. |

## Bar v3

Choice Dye (Blue, Violet, Green). Actions: Drop (Space), Rinse (R). Slider Speed (the knob). Keys: arrows change the speed.

## Reference (photos looked at, 2026-11-23)

- A beaker on a stirrer, dark backdrop: the funnel shows as a silver V from the side, its tip near the white bar.
- Blue food dye in a stirred vortex: feathery sheets wrap round the funnel in helices.
- Top view: concentric blue rings of dye in the spinning water.
- Flow Vis, 2014: a close view of the funnel with dye ribbons along its wall.
- Halasz and others, Am. J. Phys. 2007: an ideal vortex outside a core; downwelling with a strong jet at the axis; dye stays visible in the core for minutes.

## Tasks

1. Blockout: stirrer, beaker, water, bar. Screenshot.
2. Funnel and spin-up and spin-down physics.
3. Dye: particles, splat, the march.
4. Pipette and drop.
5. Sound.
6. Bar v3; icons; Lab entry; QA Q1 to Q10.
