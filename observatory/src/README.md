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
| `core/dome.ts` | Pure dome maths: aim clamp, azimuth delta, axis stepper |
| `setup.ts` | The page shell call, the renderer, the scene, the camera, the stage |
| `main.ts` | The first draw and resize |

## Types

- Strict TypeScript. `npm run check` runs tsc on `observatory/tsconfig.json`; it shows 0 errors.
- `core/` holds pure logic with node tests and no three.js.
