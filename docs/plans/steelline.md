# Steel line (`steelline`) plan

Status: active; Lab MVP built 2026-11-23, K7 not yet wired · Bean: `stimming-jkv0` · Toy doc: [steelline.md](../toys/steelline.md)

Idea 370, group C. Tom, 2026-11-23: an "ant farm view of the steelworks", like a production building in a city builder, cut open.
A whole works in one side slice: ore comes in at the left, coils leave at the right, and every step between is open to view.
It is its own toy, apart from Steelworks (`docs/plans/steelworks.md`), which stays the cinematic cast house.
It reuses K7, the production-line kit that Ant farm builds first.

## The line (left to right)

| Step | Building | In | Out |
|---|---|---|---|
| 1 | Ore yard and coke ovens | Ore trains, coal | Sinter and coke on a belt |
| 2 | Blast furnace | Sinter and coke, up the skip incline | Iron, tapped into torpedo cars |
| 3 | Converter | Iron and scrap | Steel, a flame and sparks at each blow |
| 4 | Caster | Steel | Glowing slabs on a roller line |
| 5 | Rolling mill and coil yard | Slabs | Red strip that runs long and fast, then coils onto a train |

Each building is cut open in the same plane, as the ant farm's chambers are. Tiny workers walk the gantries; carts, ladles, cranes and belts carry the goods.

## What makes it engaging

1. **The bottleneck moves and glows.** A step that waits on its input goes dark; a step that backs up stacks its goods outside and its door light turns red. The hand reads the whole line in one look.
2. **The works grows by itself.** A milestone adds a second converter, a longer mill, another track in the coil yard. The skyline changes as you play.
3. **Every step has its own spectacle.** The tap, the converter blow, the strip racing through the mill stands. The line paces them, so something hot is always happening somewhere.
4. **The hand has two verbs.** Tap a building to rush it for a while (more workers, faster, brighter). Hold on the ore yard to bring in a train.
5. **Night and day.** A shift runs about five minutes. At night the works lights up from inside and the glow carries the slice.

## Defaults (open questions, answered here)

| Question | Default | Why |
|---|---|---|
| View | A flat side cross-section, ore left, coils right; the stage pans along a line wider than the screen | Tom's pick, 2026-11-23. A slice reads like the ant farm. |
| Renderer | Raw WebGL2 (Shader type): buildings as lit flat shapes, workers and goods as instanced sprites, bloom from `shared/glow.js` | Many small moving parts and glow. No 3D camera. |
| Sim | K7 copied from Ant farm: stocks, workers, routes, growth | One production engine for both toys. |
| Workers | Tiny figures, 2 to 3 px tall at 1280, on gantries and stairs | The ant-farm read. Steelworks has no people; this toy is the other end of the scale. |
| Look | Night, cut faces in dark steel and brick, hot metal as the key light, haze over the hot steps | The Look rule; the same palette as Steelworks so the two feel related. |
| Names | No real mill or company names, no logos | Hard rule 11. |

## Bar (Bar v3)

| Control | Content |
|---|---|
| Action | Ore train (hold on the yard, or Space) |
| Slider | Shift speed |
| Settings | Quality (shared), Reset works |
| How | Tap a building: rush it · Hold the ore yard: bring a train · Drag: pan along the line · Space: ore train |

## Sound (muted by default)

Each building carries its own sound, panned by place and loudest where the view is: the belt's rattle, the furnace roar, the converter's blow, the mill's whine and thump. A milestone lands with a horn. The context sleeps at rest.

## Frame loop

Lively while the hand acts or a spectacle plays. Drifting at 30 fps while the line runs. Asleep 60 s after the last input. Reduced motion: no pan easing, no flicker; the line runs at an even pace.

## Tasks

1. Bean, plan approved by Tom; Ant farm's K7 built first.
2. Blockout: the five buildings in a slice, one cart per step; screenshot early.
3. K7 copy; routes for belts, cranes, rails and walkways.
4. Look: the cut faces, hot metal glow, haze, night and day.
5. Bar v3, pan, sound, frame loop.
6. Icon round `steelline-1`, emblems, intro emblem, Lab tile and hook, `toys.json`.
7. QA Q1 to Q10, toy doc.

## Size and cost

L: one build session plus tuning, about $50 to $80, less with K7 in hand.

## Tom's answers, 2026-11-23

1. Name: Steel line (`steelline`).
2. Width: the line pans. It is about three screens wide; the view drifts along it and a drag moves it.
3. Workers: tiny figures on the gantries.
