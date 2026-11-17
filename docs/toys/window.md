# Window seat (`window/`)

<!-- gen:identity -->
| | |
|---|---|
| Dutch | Vensterplaats /ˈvɛnstərˌplaːts/ |
| Motto | None |
| Shelf | Main, number 33 |
| Stage | None |
| Series | Vistas (`vistas`, Vergezichten) |
| Accent | `oklch(0.86 0.13 70)` |
| Sound | Yes |
| Legacy build | Yes (`legacy.html`) |
| Signed off | Yes (`data-done`) |
<!-- /gen:identity -->

## Idea

A window seat on an airliner at cruise height, over a baked map of the Lower Mainland. Drag to lean and peer out, step the time of day, raise the storm, and dim the glass.

## Rules

- The Vancouver world is the default flight. It flies over a baked map of the Lower Mainland.
- `?van=0` flies the invented country. `?ode` wins over both.
- `window/van.js` holds the track, the start, the airports and the map loader.
- `window/van-coast.png` and `window/van-land.png` are the map (641 KB). `tools/vancouver/bake.py` bakes them and names the sources.
- `outsideFS({ van: true })` builds the map code into the outside pass. The usual pass and the Classic build (`legacy.html`) compile none of it.
- `?vy=<km>` moves the track north. `?peer=x,y,z` leans the head. Both are for screenshots.
- The head lean, the track offset, the event and the time become Dev rows (decision `window.3` in `docs/plans/release-ready.md`). The URL flags keep working. The rows are not built yet.

## Direction

To write.

## Controls

<!-- gen:bar -->
Bar: v3, the Signal bar, over Bar v2 (`window/index.html`, `signal: true`). Written by hand on 2026-11-17.

| Slot | Holds |
|---|---|
| Choice | `Time of day`, stepper: Dawn, Morning, Noon, Afternoon, Golden hour, Dusk, Blue hour, Midnight |
| Actions | `Dim` (D): five levels of glass, then clear; `Wing light` (W); `Cozy quiet flight` (Q): the worst weather |
| Slider | `Storm`, 0 to 1 |
| Settings, Outside | `Clouds` (Clear, Broken, Overcast); `Rain` (Off, Light, Heavy); `Towns` (Few, Some, Many); `Aurora` |
| Settings, Cabin | `Seat` (Wing left, Wing right, Aft left, Aft right) |
| Settings, Sights | `Falling` (Meteor, Fireball, Impact); `Flying` (Rocket, Jet). A pick starts the sight; it stores nothing. |
| Settings, foot | Quality; Version: Classic. The toy has no Reset. |
| Key strip (Bar v2) | drag look around; scroll lean to the glass; click flash a storm; arrows fly the plane |
<!-- /gen:bar -->

| Input | Does |
|---|---|
| Click | Flash a storm. A click on the winglet calls a strike on the plane. |
| Drag | Look around. A drag on the shade pulls it. A drag on fogged glass draws in the fog. |
| Scroll, or pinch | Lean to the glass |
| Arrows | Left and right bank the plane. Up dives. Down climbs. |
| Shift and the arrows | Look around |
| + and - | Lean to the glass |
| Hold B, or hold the cue on touch | Breathe on the glass |

## Renderer and libraries

<!-- gen:stack -->
To write.
<!-- /gen:stack -->

## Shared modules

<!-- gen:shared -->
To write.
<!-- /gen:shared -->

## Files

<!-- gen:files -->
To write.
<!-- /gen:files -->

## Render pipeline

To write.

## Sound

To write.

## Quality and performance

To write.

## State and storage

To write.

## Attributions

To write.

## Tests and QA

To write.

## Known issues

To write.

## Legacy build

To write.

## History

To write.
