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
To write.
<!-- /gen:bar -->

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
