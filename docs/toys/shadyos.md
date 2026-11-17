# ShadyOS (`shadyos/`)

<!-- gen:identity -->
| | |
|---|---|
| Dutch | LoucheOS /ˈluʃəˌoːˌɛs/ |
| Motto | None |
| Shelf | Main, number 30 |
| Stage | Alpha |
| Series | Odd one out (`odd`, Raar) |
| Accent | `linear-gradient(100deg, oklch(0.76 0.17 280), oklch(0.87 0.13 180))` |
| Sound | Yes |
| Legacy build | No |
| Signed off | No |
<!-- /gen:identity -->

## Idea

ShadyOS is a sentient bootleg desktop, half glass and half aqua. The OS is the toy: drag, fling and fold its windows, open its apps, and make it crash.

## Rules

- ShadyOS is modules, not one page: `main.js`, `gl.js`, `paint.js`, `sound.js`, `eggs.js`, `savers.js`, `content.js` and `apps/*.js`. Put each change in its module.
- Every word on the screen lives in `shadyos/content.yaml`. Tom fills it in. Write no screen text in the code.
- `shadyos/defaults.js` is the fallback snapshot of `content.yaml`. Run `node tools/shadyos-defaults.mjs` after each content change.
- The eggs are parody nods to the glass-era and aqua-era desktops. They use no real names, logos or sounds.
- `?qa` adds `window.__shadyos`. Its `pump(ms)` drives frames in a hidden pane.
- js-yaml 4.1.0 loads by its full URL (`dist/js-yaml.mjs`), not through the importmap. Only ShadyOS uses it.

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

None.

## History

To write.
