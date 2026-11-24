# Ant farm (`antfarm`) plan

Status: active · Bean: `stimming-nfkn`

Idea 369, group C. Tom, 2026-11-23: "a type of ant farm, gamified multi-step production, simply wireframed, how you'd make that engaging".
A leafcutter colony behind glass is a production line you can watch. The hand feeds it; the colony grows by itself.
It builds the shared production-line kit (K7) that Steel line (`docs/plans/steelline.md`) reuses.

## The idea

A thin glass slab of sand on the desk. Leafcutter ants run a chain of five steps, each in its own chamber:

| Step | Chamber | In | Out |
|---|---|---|---|
| 1 | Surface | Leaves the hand drops | Leaf pieces, cut by cutters |
| 2 | Leaf store | Leaf pieces | A stack the gardeners draw from |
| 3 | Fungus garden | Leaf pieces | Food, and spent leaf to the refuse dump |
| 4 | Nursery | Food | Larvae, then new workers |
| 5 | Queen | Food | Eggs, faster as stores fill |

Every ant is one worker with one job at a time: cut, carry, garden, nurse, dig, haul waste. Jobs go to the step that needs hands most.

## What makes it engaging

1. **The bottleneck moves.** Each chamber shows its stock as a heap. When one step backs up, a queue of ants forms at its door and the heap overflows. Feed too much and the garden chokes; feed too little and carriers stand idle at the entrance.
2. **The colony answers by itself.** A full store sends diggers out: they cut a new tunnel and a new chamber (a second garden, a deeper nursery). The farm's shape is the record of how you fed it.
3. **Milestones are things you see, never text.** The first new worker, the second garden, the refuse dump, the queen's new room. Each lands with a small light and sound beat.
4. **The hand has three verbs.** Hold to drop leaves. Tap a chamber to call workers there for a while. Drag on the sand to mark a tunnel; the diggers follow it.
5. **Time carries it.** A day passes in about five minutes. At night the ants slow and the garden glows faintly. With no input the colony settles and the loop sleeps.

## Defaults (open questions, answered here)

| Question | Default | Why |
|---|---|---|
| View | A flat side slice through glass, as the wireframe of 2026-11-23 | The production line reads at a glance; no camera moves. |
| Renderer | Raw WebGL2 (Shader type): the sand and tunnels as a dig grid, ants as instanced sprites, bloom from `shared/glow.js` | Up to 400 ants and a per-pixel sand field. No three.js needed. |
| Sim | JS: a dig grid (320 x 200 cells), ants as agents on the tunnel graph, stocks per chamber | Cheap; the colony's state is small and exact. |
| Ant count | 24 at the start, up to 400 | Few enough to follow one ant, many enough for a crowd. |
| Look | Warm sand with grain, light through the glass from above, dark tunnels, a lit fungus garden | The Look rule: few shapes, light carries the slice. |
| Persistence | The colony's shape and stocks persist in `stimming.antfarm.state` | A desk toy you come back to. A Reset in Settings starts a new colony. |

## Bar (Bar v3)

| Control | Content |
|---|---|
| Action | Leaves (hold): drop leaves on the surface. Key Space. |
| Slider | Day speed: how fast the day runs |
| Settings | Quality (shared), Reset colony |
| How | Hold: drop leaves · Tap a chamber: call workers · Drag the sand: mark a tunnel · Space: drop leaves |

## Sound (muted by default)

A dry rustle of cutting at the surface, soft ticks of ants in the tunnels, a low bed under the garden, a small chime at each milestone. Every hit jitters. The context sleeps at rest.

## Frame loop

Lively while the hand acts or ants carry. Drifting at 30 fps while the colony works on its own. Asleep 60 s after the last input; the colony's clock pauses. Reduced motion: no drift; ants step at a slow even pace.

## The kit: K7 production line

Built here, copied (never imported) by Steel line. Marked `/* ---------- K7: production line ---------- */`.

- Stocks: a store per step, with a cap and a heap to draw.
- Workers: agents with a job, a route on a graph and a carry.
- The scheduler: jobs go to the step with the longest queue, weighted by the hand's calls.
- Growth: a stock milestone adds a node and its route.

## Tasks

1. Bean, plan approved by Tom.
2. Blockout: the slab, the five chambers, 24 ants on one loop; screenshot early.
3. K7: stocks, jobs, scheduler, growth; dig grid and tunnels.
4. Look: sand, glass light, garden glow, night.
5. Bar v3, sound, persistence, frame loop.
6. Icon round `antfarm-1`, emblems, intro emblem, Lab tile and hook, `toys.json`.
7. QA Q1 to Q10, toy doc.

## Size and cost

M to L: one build session plus a tuning round, about $40 to $70.

## Questions for Tom

1. The species: leafcutters (a fungus garden, the clearest chain), or plain harvester ants (seeds only, simpler)?
2. Persistence: does the colony keep its shape between visits, or start fresh each time?
3. Tom's three verbs: drop leaves, call workers, mark a tunnel. Keep all three, or only the first two?
