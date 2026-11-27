# Steel line (`steelline/`)

| | |
|---|---|
| Dutch | Staallijn /ˈstaːlˌlɛin/ (draft) |
| Motto | Hot metal with places to be. |
| Shelf | Lab, tag "Stimming Lab" |
| Stage | None |
| Series | None |
| Accent | `oklch(0.74 0.17 48)` |
| Sound | Yes |
| Legacy build | No |
| Signed off | No |

## Idea

Idea 370, group C (Tom, 2026-11-23): an "ant farm view of the steelworks", a production building from a city builder, cut open. Bean `stimming-jkv0`. Plan: [steelline.md](../plans/steelline.md). It is its own toy, apart from [Steelworks](steelworks.md), which stays the cinematic cast house. The two share the iron's colour ramp and the night palette.

## Rules

- One side slice, ore at the left, coils at the right. Every building is cut open in the same plane. The ground is cut open too: pits and tunnels show under grade.
- The line is about four screens wide (690 m). The view pans: a drag moves it; on its own it drifts along at 2.2 m/s.
- Hot metal is the key light. The second light is cool: floodlights on masts, high-bay lamps under each roof.
- Tiny workers walk the floors, stairs and ladders, about 5 px tall at 1280, with white hats. The plan's 2 to 3 px read as dust.
- No real mill, company or plant names, and no markings (hard rule 11).

## The line

| Step | Building | What moves |
|---|---|---|
| 1 | Ore yard and coke ovens | An ore train tips its wagons into a pit; a belt runs in a tunnel under the piles and climbs to the stockhouse. Fourteen oven chambers bake to a glow; the quench car takes each cake to the quench tower, which throws steam. |
| 2 | Blast furnace | Skip cars climb the incline and tip into the top. Inside, the burden sinks in layers, softens in an arch and pools in the hearth under slag; the raceways glow at the tuyeres. A full hearth taps into a torpedo car: the iron runs the runner and pours off the spout. |
| 3 | Converter | The torpedo pours into a ladle in the pit; the crane lifts it, the vessel tilts, the ladle charges it. The lance comes down for a 14 s blow: a white flame stands into the hood and sparks fly. The vessel tips the other way and taps into a steel ladle. |
| 4 | Caster | The steel ladle goes up onto the turret and feeds the tundish. The strand glows down its arc and cools along it; a torch cuts a slab every 9 m. |
| 5 | Rolling mill and coil yard | Slabs walk through the reheat furnace; the bar runs five passes through the roughing stand, then races through six stands as strip over a water-curtained table and onto the coiler. The yard crane stacks the coil. At eight coils a train comes, loads and leaves with a horn. |

## The bottleneck

- Each step runs, waits on its input, or backs up behind a full output (`status()` in `line.js`).
- A lamp over each door: green runs, red blinks while it backs up, dim amber while it waits. A waiting step's high-bay lamps dim.
- A rush (a tap on a building) runs that step at double pace for 20 s, calls the floaters to its posts (`call` in K7), lights its lamps and flashes a rush lamp over its door.
- A step short of hands runs slower, down to 0.7 of its pace.

## Controls

Bar v3, from the `bar` spec in `initPage()`.

| Slot | Holds |
|---|---|
| Actions | Ore train (Space) |
| Slider | Shift speed: the pace of the whole works, 0.25 to 3 |
| Settings | Quality (shared), Reset |

| Input | Does |
|---|---|
| Drag | Pan along the line, with a fling |
| Tap a building | Rush that step for 20 s |
| Hold on the ore yard | Bring an ore train |
| Space | Bring an ore train |
| Arrow keys | Pan a quarter screen |

## The model

- `works.js`: the layout in metres, ground at 0, and the static shapes. Twelve floats a vertex: position, pattern uv, material, normal mode, colour and glow. One buffer.
- `k7.js`: K7, the production-line kit, copied whole from Ant farm (`antfarm/k7.js`); never imported across toys.
- `line.js`: the machines of each step and their timing. The stocks between steps (ore, coke, slabs, coils) are K7 stores with the line's caps. Cranes run a queue of waypoints. Torpedo cars use parallel tracks and pass. The shift: about five minutes of night, dawn, a short day and dusk.
- `crew.js`: the K7 side. Every floor is a road, with stairs and ladders between floors and one ground road along the whole line. Each floor and ground stretch has a post with a tend step (two hands, its step's job). Each step keeps its own workers; eight floaters take any job and answer a rush.
- Growth, by K7 milestones: after the third heat each step hires one more worker; after sixteen coils shipped the coil yard stacks a third row (cap 15).
- `show.js`: per frame, the sprites (goods, workers, sparks), the lights (24 at most, culled to the view, strongest first) and the plumes.

## Passes

1. Sky: night or overcast day, stars, low cloud lit from below, a far works skyline at a slow parallax.
2. The works: one draw of the static shapes. Materials in the shader: cladding, the section cut (hatched), plate steel, refractory brick (glows when hot), concrete, soil strata, lattice girders (cut out), belts, wired glass, piles, rails, pipes, grating. Lit by the point lights and the sky.
3. The goods: one instanced draw. Each kind is a distance shape in the shader: torpedo, ladle and converter cut open on their bath (the bath stays level as they tilt), the furnace's inside, oven chambers, wagons, locos, coils, workers, streams, the flame, sparks, water.
4. Haze at half size: a low haze plus up to ten plumes (fume over the tap and the blow, steam over the quench tower and the runout table, stacks). Lit by the lights through Fire's smoke light (`shared/smoke.js`), with three taps toward the four strongest lights.
5. Bloom (`shared/glow.js`), tone, grade, grain.

## Sound

Web Audio, muted by default. Each building has a noise bed, panned by its place and loudest where the view is: the belt's rattle, the furnace roar (up at a tap), the blow, the caster's hiss, the mill. Beats: the wagon dump, the push, the quench hiss, skip clanks, the tap's thump, the charge, the blow, the steel tap, the torch, the mill's bites, the strip's whine, coil clanks, the train horn. A rush rings two notes. A growth milestone sounds a long horn and a bell from anywhere on the line. The beds stop when the loop sleeps.

## Frame loop

Lively while the hand acts or the view flings; drifting at 30 fps while the line runs; asleep 60 s after the last input, easing the works to a stop over 2 s. Hidden stops the loop and the sound. Reduced motion: no drift and no fling; sparks thin to a third; the line still runs. Slow frames step down: the pixel ratio, then the haze size and the bloom.

## QA

Captures in `docs/qa/steelline/`, Edge headless on D3D11 (RTX 3070).

| Check | Result |
|---|---|
| 1280, 375 x 812, 812 x 375 | Pass: captures 01 to 09 |
| Console | Clean |
| Reduced motion | The view holds still |
| Controls | Space brings a train; a tap rushes the step; a drag pans |
| Sound | Starts after a gesture, no errors; the beds stop at rest |
| Idle | The loop stops 60 s after the last input |
| Frame time | Under 8 ms (rAF at 130 fps) |

## Known

- `k7.js` is a copy of Ant farm's file from the shared checkout, before Ant farm pushed it. Copy it again whole once it is on origin.
- Growth is small so far: a bigger crew and a third coil row. A second converter, a longer mill and another coil-yard track need new static shapes.
- The tunnel belt's lumps are hard to see at night.
