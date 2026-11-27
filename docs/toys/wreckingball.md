# Wrecking ball (`wreckingball/`)

| | |
|---|---|
| Dutch | Sloopkogel /ˈsloːpˌkoːɣəl/ (draft) |
| Motto | A strong argument against that wall. |
| Shelf | Lab, tag "Stimming Lab" |
| Stage | None |
| Series | None |
| Accent | `oklch(0.68 0.15 38)` |
| Sound | Yes |
| Legacy build | No |
| Signed off | No |

## Idea

Idea 72, group E, a machine: swing a ball into a brick wall; bricks tumble, the wall rebuilds. Bean `stimming-34u3`. Plan: [wreckingball.md](../plans/wreckingball.md).

## Rules

- One wall, one ball, one swing gesture, one slider. No modes.
- Bricks are rigid bodies (sphere sets and impulses, as Domino's finale tower). A brick breaks loose only when the ball meets it, a fast brick hits it, the impact's shock reaches it, or no brick under it is still in place. The hole's stepped, corbelled shape comes from that rule.
- The wall rebuilds itself, bottom course first, once the pile sleeps and the ball is slow and clear of the wall. A brick waits until the bricks under its seat are laid or on their way.
- The loop runs only while the ball moves, a brick flies, dust lives or a brick lays back. A wall at rest does no work.

## Direction

- 3D. A fixed camera at the ball's side, a little above, about 40 degrees off the wall's face. On a tall screen it turns further along the swing and stands back.
- A dusty yard at dusk: a deep blue sky, a warm band low on the sun's side, warm haze, dark packed dirt with red brick dust at the wall's foot.
- A free-standing wall of real bricks (215 x 102.5 x 65 mm, 10 mm joints) in stretcher bond: 14 bricks long, 16 courses, 232 pieces. Each brick has its own clay tone, sand grains, pits and a dark fire kiss.
- A pear-shaped ball of cast steel, 0.6 m across, scuffed bright where it works and rusty in its hollows, on a lead of seven heavy chain links, a swivel and a wire rope that leads up out of the frame.
- One low warm sun from the wall's far end rakes along the brick faces and throws the ball and its chain onto the wall.
- True details: loose bricks keep ragged scraps of their bed mortar; bricks above a hole stay up while one brick under them stays in place; the ball barely slows (one tonne against 2.6 kg bricks); after a hit the crane brakes the swing; dust is lit by the sun with Fire's smoke shading and stops at the bricks; each brick beds with a tock a hair higher than the course below.

## Controls

Bar v3, from the `bar` spec in `initPage()`.

| Slot | Holds |
|---|---|
| Actions | Swing (Space): the crane pulls the ball back to the Pull angle and lets go. Rebuild (R): the loose bricks lay back now. |
| Slider | Pull: 10 to 36 degrees; stored as `stimming.wreckingball.pull` |
| Settings | Quality (shared) |
| How to play | Drag, release, Space, R |

| Gesture | Does |
|---|---|
| Drag the ball | The hand takes it and pulls it back on its rope, up to 36 degrees |
| Release | The ball swings into the wall; a fling adds up to 2 m/s |
| Keys | Space swings; R rebuilds |
| Wheel, pinch, tilt | None |

## Renderer and libraries

| | |
|---|---|
| Stack type | Scene |
| Tier | three.js 0.170, WebGL 2 |
| Post | RenderPass, the dust pass, UnrealBloomPass, OutputPass, a grade pass (vignette, grain) |
| Dust | A half-size raymarch (30 steps) of up to 12 noise-eroded puffs, Fire's smoke lighting (marked K3), a depth prepass, a two-pass blur. It runs only while dust lives. |
| Files | `index.html`, `main.js` (page, input, loop), `sim.js` (ball and bricks), `scene.js` (three.js), `dust.js`, `sound.js` |

## Sound

Raw Web Audio on the shared kit, muted by default. Banks are rendered once: sub thumps, mortar cracks, clay clacks, dirt thuds, bedding tocks, chain clinks, and a short yard echo. Every hit picks a bank entry and jitters pitch, time and level. An air rush follows the ball's speed. The context sleeps 1.5 s after the loop stops.

## Frame loop

| State | Does |
|---|---|
| Lively | Full rate while held, swinging, flying, dusty or rebuilding |
| Drifting | None |
| Asleep | The loop stops when the wall is whole and the ball hangs still |
| Hidden | The loop and the sim clock stop at once |
| Reduced motion | No camera shake; half the dust life; bricks lay back on straight paths |

The slow-frame watchdog steps down: pixel ratio 1, then smaller bloom and dust buffers, no multisampling, a smaller shadow map.

## QA

Captures: `docs/qa/wreckingball/` (01 blockout to 11 How to play). Q1 to Q10 passed on 2026-11-22, headless Edge on the RTX 3070 (D3D11): idle and settled pages draw no frames, a hidden page stops at once, Space and R work, the audio context suspends after the rebuild, 7.8 ms mean frame through a hit (vsync bound; Tom checks on a real screen).

## Open

- 3D or flat: 3D by default.
- The Dutch name: draft Sloopkogel.
- The icon pick: A of spike wreckingball-1 is on the menu until Tom picks.
- The crane boom stays above the frame. A boom in the picture is a later call.
