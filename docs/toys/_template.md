<!--
Toy doc template. Copy to docs/toys/<id>.md and fill every section.
Rules: docs/plans/toy-docs.md. Prose: ASD-STE100, double density. No em dashes.
A section marked (gen) comes from toys.json, series.json or the page source.
A generator can rewrite the text between its gen markers. Write by hand only outside them.
A section with nothing to say keeps its heading and says "None."
-->

# <Name> (`<id>/`)

<!-- gen:identity -->
| | |
|---|---|
| Dutch | <nl> /<ipa>/ |
| Motto | <tag> / <tagNl> |
| Shelf | Main, number <number> \| Lab, tag "<sub>" |
| Stage | <stage or "None"> |
| Series | <series name> \| None |
| Accent | `<accent>` |
| Sound | Yes \| No |
| Legacy build | Yes (`legacy.html`) \| No |
| Signed off | Yes (`data-done`) \| No |
<!-- /gen:identity -->

## Idea

Two or three sentences: what the toy is and what a hand does with it.
Say what makes it this toy, not what every toy does.

## Controls

<!-- gen:bar -->
Bar: v2 \| v1 \| own shell.

| Slot | Holds |
|---|---|
| Top left (choice) | Kind (segments, stepper, tray) and the options |
| Bottom left (actions) | Verbs |
| Bottom right (slider) | Label and what it moves |
| Key strip | `[KEY] verb` entries |
| Settings | Rows |
| Dev (`?dev`) | Rows |
<!-- /gen:bar -->

| Gesture | Does |
|---|---|
| Click or tap | |
| Drag | |
| Keys | |
| Wheel, pinch, tilt | |

## Renderer and libraries

<!-- gen:stack -->
| | |
|---|---|
| Tier | DOM/SVG \| Canvas 2D \| Raw WebGL2 \| three.js \| three.js WebGPU (TSL) |
| Libraries | Names from the importmap that the page imports, three.js addons by name |
| Importmap | Word for word \| Differs: say how |
<!-- /gen:stack -->

One sentence on why this tier, from `docs/stack.md`.

## Shared modules

<!-- gen:shared -->
| Module | Imports |
|---|---|
| `shared/stim.js` | `initPage`, ... |
<!-- /gen:shared -->

Local copies of shared code (drift), with the module that could replace each. Link `docs/plans/modularize.md`.

## Files

<!-- gen:files -->
| File | Lines | Role |
|---|---|---|
| `index.html` | | The page |
<!-- /gen:files -->

## Render pipeline

Passes in frame order. One row per pass.

| Pass | Target | Shader or material | Does |
|---|---|---|---|

### Uniforms

One table per shader that a person tunes. Leave out the frame-size and time uniforms that every pass has.

| Uniform | Type | Meaning | Range or default |
|---|---|---|---|

## Sound

| | |
|---|---|
| Graph | `audioKit()` \| Own context (drift) |
| Engine | Raw Web Audio \| Tone.js through `kit.tone()` \| Samples |
| Voices | Name: what triggers it, how it is made |
| Sleep | When the context suspends |

## Quality and performance

| | |
|---|---|
| Pixel ratio | `fitCanvas` / `pixelRatio` / `detail()` / own; cap and pixel budget |
| Slow-frame step | `detail()` \| own watch (rule) \| None |
| Idle | The loop stops when: ... \| Never (say why) |
| Reduced motion | What changes |
| Start-up | What builds behind the intro, and the steps the load line counts (`buildSteps(n)`) \| Shell default |
| Measured | First frame, steady fps at 1280 px and on a phone, with the date |

## State and storage

| Key | Holds |
|---|---|
| `stimming.<id>.sound` | Sound on or off |

## Tests and QA

Files in `tests/`, the QA notes in `docs/qa/`, and the checks a change to this toy must pass.

## Known issues

One line each. Link the bean.

## Legacy build

What `legacy.html` is, its renderer, and why it stays. "None." if there is no legacy build.

## History

| | |
|---|---|
| Epic | `stimming-xxxx` |
| Plans | `docs/plans/<id>.md` |
| Version | `v0.N` codename, if this toy set one |
