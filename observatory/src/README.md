# Observatory source

TypeScript. `tools/build.mjs` bundles `main.ts` to `../dist/main.js`; `index.html` loads that bundle.
Run `npm run dev` from the repo root, then open <http://localhost:8000/observatory/>.

## Load order

Each module builds its part of the scene when it loads, so the order is fixed.
The chain starts at `setup.ts`. `main.ts` imports the last module.
A new module goes into the chain at the place it loads; never import a later module for its side effects.

## Modules

| File | Holds |
|---|---|
| `core/sky.ts` | Pure sky maths: sidereal time, alt/az |
| `core/catalog.ts` | The star catalog decoder: `loadStars`, `Star` |
| `core/clock.ts` | The sky clock: speed, trail threshold, the 1 s wake ease; injected time |
| `core/dome.ts` | Pure dome maths: aim clamp, azimuth delta, axis stepper |
| `setup.ts` | The page shell call, the renderer, the scene, the camera, the stage |
| `world/hill.ts` | The land: the observatory hill and its clearing, the camera's rise, far ridges; the key light; `hillHeight`, `SITE` |
| `world/observatory.ts` | One dome: drum, door, cupola with its slit and shutter, the tube on its fork; `buildDome(size)` |
| `world/complex.ts` | The main dome, two small domes, the stone hall, the roll-off shed, the road |
| `world/woods.ts` | The conifers over the hill, one instanced draw; a clearing and a gap for the road |
| `world/laser.ts` | The green aiming beam; `altAzDir` |
| `sky/stars.ts` | The catalog stars on a far shell, one `Points` draw; one matrix turns the sky by LST at 51 N; `skyAt`, `starAltAz` |
| `view/camera.ts` | The locked-off shot from the rise: eye, pitch, yaw, fov for wide and tall frames; `setView` |
| `input.ts` | Pointer: aim with a move or a drag, a tap; alt and az from the camera ray |
| `loop.ts` | The frame loop and sleep; the three domes turn after the beam; `window.__qa` |
| `main.ts` | Resize and the first draw |

## Axes

+Y is up, -Z is north, +X is east. Azimuth runs from north through east, as in `core/sky.ts`.
The camera faces south (+Z).

## Types

- Strict TypeScript. `npm run check` runs tsc on `observatory/tsconfig.json`; it shows 0 errors.
- `core/` holds pure logic with node tests and no three.js.
