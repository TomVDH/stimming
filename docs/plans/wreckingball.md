# Wrecking ball

Status: built as a Lab toy, 2026-11-22. Bean `stimming-34u3`. Toy doc: `docs/toys/wreckingball.md`.
Idea 72, group E, a machine: "Swing a ball into a brick wall; bricks tumble, the wall rebuilds."
Tom's brief: an MVP at high fidelity, Lab and intro icons, Bar v3. One hero moment, finished.

## Defaults (chosen in the build chat)

| | Choice | Why |
|---|---|---|
| Type | Scene: three.js 0.170, WebGL | Bricks tumble in depth and pile up; a flat view loses the pile. |
| Shot | A fixed camera at the ball's side, a little above, about 40 degrees off the wall's face; a tall frame turns further along the swing | The swing reads across the screen; the hole and the pile both show; on a phone the pulled ball stays in view. |
| Place | A dusty yard at dusk. Low warm sun from the wall's far end, on the ball's side; warm haze, dark ground | Light carries the scene: the sun rakes along the brick faces, throws the ball's shadow on the wall and lights the dust. |
| Wall | One wythe of real bricks (215 x 102.5 x 65 mm, 10 mm joints) in stretcher bond, 14 bricks long, 16 courses | A free-standing garden wall. 232 pieces keep the sim cheap. |
| Ball | A pear-shaped steel ball, 0.6 m across, about one tonne, with a cast lug and a pin | Reference photos: Wikimedia Commons, category "Wrecking balls". |
| Rig | Wire rope from a pivot 7.5 m up, then a swivel and a lead of seven heavy chain links; the boom stays above the frame | As on a real crane. A boom in frame read as stray beams, so the rope leads up out of the picture, as in the reference crops. |

## Hero

1. Drag the ball back, up to 36 degrees. It follows the pointer on the swing plane; the rope stays taut.
2. Let go. It swings on the rope into the wall.
3. The bricks it meets break loose; bricks that lose their support drop; a hard hit loosens a neighbour.
4. Bricks tumble, bounce on the ground and pile up. Dust rises from the hole and from each hard landing.
5. The ball swings through, comes back and settles.
6. The wall rebuilds itself: each loose brick lifts from the pile and lays back into its course, bottom course first.

## Sim

- The ball is a spherical pendulum (position step with a rope constraint) with light air drag. It is heavy: a brick takes a small share of its momentum.
- Bricks are rigid boxes, as Domino's finale tower: each brick is a set of spheres, contacts trade one normal impulse, corners meet the ground with friction.
- A brick in the wall sleeps until the ball, a fast brick, or a loss of support wakes it. A brick with neither brick under it still in place drops.
- A loose brick that stays still, or one loose for 6 s, sleeps.
- Substeps at 240 Hz; a grid hash finds the pairs.

## Dust

Fire's smoke shading (Tom's ruling, 2026-11-22): a raymarched volume at half resolution, a self-shadow toward the sun, Beer plus multi-scatter, powder, an ambient floor, a Henyey-Greenstein phase. The density is a few puffs, each eroded by 3D noise. A depth prepass stops the march at the bricks.

## Sound

Web Audio, muted by default. A deep impact (a sub thump that falls in pitch, then a crack of mortar that thins out) scaled by the hit; clay clacks brick on brick and dull thuds on the dirt, each pitch and level jittered, at most seven a frame; dry ticks as mortar lets go; chain clinks at the grab, the release and where the swing turns; an air rush that follows the ball's speed; a soft wet tock as each brick beds, a hair higher each course; a short yard echo on all of it.

## Bar v3

Swing (Space): the crane pulls the ball back to the Pull angle and lets go. Rebuild (R): the loose bricks lay back now. Slider: Pull, 10 to 36 degrees. Help rows for drag, release, Space and R.

## Loop

Lively while the ball moves, bricks are loose, dust lives or the rebuild runs. Then the loop stops; there is no ambient drift. Reduced motion: no camera shake, half the dust life, the rebuild lays bricks on straight paths.

The rebuild starts 1.4 s after the pile sleeps and the ball is slow and clear of the wall's line. After a hit the crane brakes the swing, so a full cycle takes about 10 s.
