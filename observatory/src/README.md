# Observatory source

TypeScript. `tools/build.mjs` bundles `main.ts` to `../dist/main.js`; `index.html` loads that bundle.
Run `npm run dev` from the repo root, then open <http://localhost:8000/observatory/>.

## Load order

Each module builds its part of the scene when it loads, so the order is fixed.
The chain starts at `setup.ts`. `main.ts` imports the last module.
A new module goes into the chain at the place it loads; never import a later module for its side effects.
`world/woods.ts` waits for the pine model with a top-level await, so every later module waits with it.
A failed model load shows the stage's `.fail` line.

## Modules

| File | Holds |
|---|---|
| `core/sky.ts` | Pure sky maths: sidereal time, alt/az; the star shell's sky matrix, `skyRows` |
| `core/catalog.ts` | The star catalog decoder: `loadStars`, `Star` |
| `core/clock.ts` | The sky clock: speed, trail threshold, the 1 s wake ease; injected time |
| `core/dome.ts` | Pure dome maths: aim clamp, azimuth delta; the heavy axis, a drive on a trapezoid with its load on a damped spring that settles at each stop (`stepAxis`, `brakeAxis`, `atRest`, `moveTime`, `paceFor`); the heavy shutter, 6 s on an S-curve with a bounce at each end stop (`stepShutter`, `SHUTTER_S`) |
| `core/machine.ts` | The telescope machine: shutter, main dome, tube, each a heavy part from `core/dome.ts`; `makeMachine`, `Phase`, the limits `CUPOLA` and `TUBE`; `shut` for the `?cuts` review |
| `core/pick.ts` | A tap picks the brightest star near it: `pickStar` |
| `core/gesture.ts` | Tap or drag, from the move and the time: `classify` |
| `core/opening.ts` | The opening, dusk into night: sun, star limit, sky lag and speed, lamps, play lock, skip; `sunsetAz` |
| `core/sequence.ts` | The pick sequence's cut list, timed from `SHUTTER_S`, `cutAt`; the complex lights' level per phase, `lightLevel` |
| `setup.ts` | The page shell call, the renderer, the scene, the camera, the stage |
| `sky/haze.ts` | The night air: the sky shell with its faint horizon glow and the dusk's sunset glow; the height haze in every fog chunk; `SKY_GLSL`, the sky colour the far ridges share |
| `post/bloom.ts` | Bloom with lens dirt and halation, copied from Railgun |
| `post/grade.ts` | The grade: split tone, contrast, vignette, grain, copied from Railgun |
| `post/chain.ts` | The post chain: render, bloom, grade, ACES output; `resizePost`, `renderPost` |
| `world/far.ts` | The far mountains: three ridgelines on rings round the wide eye, 1 to 3° high; they fade into the sky behind them and melt into the haze at the foot; `far` |
| `world/hill.ts` | The land: the observatory hill and its clearing, the camera's rise, far ridges; starlight; `hillHeight`, `SITE`, `EYE_H` |
| `world/observatory.ts` | One dome: stone drum, lit door, white cupola with its slit and shutter, the steel tube on its fork; `buildDome(size)`, `stoneMap`; the dome sizes; `Dome.pose` and `Dome.show` for the hero model |
| `world/complex.ts` | The main dome, two small domes, the stone hall, the roll-off shed, the road |
| `world/woods.ts` | The pines over the hill from Tom's model, `../models/pine.glb`: near trees as the instanced mesh, the rest as impostor cards; a clearing and a gap for the road; trees the eye never sees are left out; `woods` |
| `world/impostor.ts` | The impostor bake, once at load: three crossed cards, a colour atlas and a normal atlas, premultiplied; `bakeImpostor` |
| `world/laser.ts` | The green aiming beam, lit by the haze; it fades in after the opening; `altAzDir` |
| `world/lamp.ts` | The tracking lamp on the main dome's drum |
| `world/lights.ts` | The complex lights: lit window panes, door lamps with their light, door glow, road lamps; one level for all, or one per lamp at dusk |
| `world/dusk.ts` | The dusk look: sky, haze and starlight toward the night; the last light on high ground, added to every lit material; `setDusk`; `patch`, which world/hero adds to its own materials |
| `world/hero.ts` | The hero model: the main dome in full detail, for the cuts only. Drum with plinth, ashlar courses and string course; the door, its fanlight and lamp cage; the catwalk; gore plates with seams and rivets; slit girders with a wind lip; the leaf and the roll shutter; the ring gear, track and three drive units; the inside: floor, ladder, ribs, a dim red work lamp; the telescope from world/hero-scope.ts, which takes the hero's inside light and the dusk patch. It builds after the first frame in steps, then warms the GPU; `hero.ready`, `show`, `follow`, `glass`, `stats` |
| `world/hero-scope.ts` | The hero telescope: a long refractor on a German equatorial mount that never changes sides; its own pier 0.42 south of the dome's axis, through the floor; the axes cross over the dome's centre; a night sky map for the metal and the coated glass; `buildHeroScope(size)`, `HeroScope` with `root`, `glass`, `setTube(alt, az)` in degrees |
| `sky/stars.ts` | The catalog stars on a far shell, one `Points` draw; one matrix turns the sky by LST at 51 N; a magnitude limit for the dusk; `skyAt`, `starAltAz`, `setStarDpr`, `setStarLimit` |
| `view/camera.ts` | The locked-off shot from the rise: eye, pitch, yaw, fov for wide and tall frames; `setView`; `applyShot` for a close shot |
| `view/cuts.ts` | The pick sequence: locked cuts of the main dome and its telescope, one inside on the observing floor; each cut's camera locks at its first frame; the letterbox, the dip to black back to the wide shot, the reduced-motion crossfade; the swap to the hero model in the close shots |
| `input.ts` | Pointer: aim with a move or a drag, a tap; Esc; alt and az from the camera ray |
| `loop.ts` | The frame loop and sleep; the opening, the machine, the small domes, the lights, the cuts; the `?cuts` review switch; `window.__qa` |
| `main.ts` | Resize (pixel budget, post chain, star size) and the first draw |

## Review switch

`?cuts` is a review switch for Tom, so he can see the pick sequence on the live site.
The page opens at night, with motion on.
About 1 s after the first frame, it picks the brightest star on screen, as a tap would.
After the cuts, a tap anywhere shuts the dome.
Once the shutter is shut, the cuts play again on the same star.
Esc and a tap still skip the cuts.
Without `?cuts`, nothing changes.

## Axes

+Y is up, -Z is north, +X is east. Azimuth runs from north through east, as in `core/sky.ts`.
The camera faces south (+Z).

## Types

- Strict TypeScript. `npm run check` runs tsc on `observatory/tsconfig.json`; it shows 0 errors.
- `core/` holds pure logic with node tests and no three.js.
