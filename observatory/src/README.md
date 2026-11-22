# Observatory source

TypeScript. `tools/build.mjs` bundles `main.ts` to `../dist/main.js`; `index.html` loads that bundle.
Run `npm run dev` from the repo root, then open <http://localhost:8000/observatory/>.

## Load order

Each module builds its part of the scene when it loads, so the order is fixed.
The chain starts at `setup.ts`. `main.ts` imports the last module.
A new module goes into the chain at the place it loads; never import a later module for its side effects.
`world/woods.ts` waits for the pine model with a top-level await, so every later module waits with it.
It waits 5 s at most, inside the shell's 6 s intro cap.
A failed or slow model leaves the woods out, with one console warning; the page starts without them.
`setup.ts` starts the star catalog first, so it loads beside the model.

## Failures and leaving

- A WebGL failure shows the stage's `.fail` line with its own WebGL 2 text.
- Any other boot failure sets the line to "Observatory could not start.": an uncaught error or rejection, or a catalog that does not load. The boot ends when the stars are in.
- A lost WebGL context shows the line too.
- On a real leave (`pagehide` without `persisted`), each module frees the GPU objects it registered with `onLeave`; then the renderer goes. A page in the back-forward cache keeps everything and carries on when it comes back.
- `world/observatory.ts`, `world/hero.ts`, `world/hero-scope.ts` and `view/cuts.ts` register nothing yet.

## Modules

| File | Holds |
|---|---|
| `core/sky.ts` | Pure sky maths: sidereal time, alt/az; the star shell's sky matrix, `skyRows` |
| `core/catalog.ts` | The star catalog decoder: `loadStars`, `Star` |
| `core/clock.ts` | The sky clock: speed, trail threshold, the 1 s wake ease; injected time |
| `core/dome.ts` | Pure dome maths: aim clamp, azimuth delta; the heavy axis, a drive on a trapezoid with its load on a damped spring that settles at each stop (`stepAxis`, `brakeAxis`, `atRest`, `moveTime`, `paceFor`); the heavy shutter, 10 s on an S-curve with a bounce at each end stop (`stepShutter`, `SHUTTER_S`) |
| `core/machine.ts` | The telescope machine: shutter, main dome, tube, each a heavy part from `core/dome.ts`; the cupola turns to the star while the shutter opens; `makeMachine`, `Phase`, the limits `CUPOLA` and `TUBE`; `shut` for the `?cuts` review |
| `core/pick.ts` | A tap picks the brightest star near it: `pickStar` |
| `core/gesture.ts` | Tap or drag, from the move and the time: `classify` |
| `core/opening.ts` | The opening, 10 s from the golden hour into night: sun, star limit, sky lag and speed, the star streak (`streakForDusk` reads it from the dusk alone), lamps, play lock, skip; `sunsetAz` |
| `core/mount.ts` | The slit's offset for the hero's German mount: where the off-axis tube's line of sight leaves the dome; it fades out above 60° and stays within 12°; `slitAzFor`, `slitOffset` |
| `core/sequence.ts` | The pick sequence's five shots; their timing from the shutter and the tube's lift, `startSeq`, `stepSeq`; the camera locks, `makeLocks`; the complex lights' level per phase, `lightLevel` |
| `setup.ts` | The page shell call, the renderer, the scene, the camera, the stage; the fail line, `fail` and `bootFail`; the star catalog's early start, `starFile`; `onLeave` and `disposeTree` |
| `sky/haze.ts` | The night air: the sky shell with its faint horizon glow and the sunset glow, which the golden hour spreads wider and higher; the height haze in every fog chunk, which holds a faint cool moonlight at night so the valley mist shows; `SKY_GLSL`, the sky colour the far ridges share |
| `post/bloom.ts` | Bloom with lens dirt and halation, copied from Railgun |
| `post/grade.ts` | The grade: split tone, contrast, vignette, grain, copied from Railgun |
| `post/chain.ts` | The post chain: render, bloom, grade, ACES output; `resizePost`, `renderPost` |
| `world/far.ts` | The far mountains: three ridgelines on rings round the wide eye, 1 to 5° high, the back range snow-capped; each range takes more of the sky's colour with distance; they fade into the sky behind them and melt into the haze at the foot; in the golden hour the late sun lights their west faces; `far` |
| `world/hill.ts` | The land, after the Pic du Midi: a broad rock massif with arêtes (about 220 m high, a 520 m foot, flanks near 34°) and a wide rounded top with room for the complex, level pads cut for each building at their own heights (`PADS`), a buttress on the north face, a moat on three sides, a deep valley behind the summit where the height haze gathers, two ridges receding behind it at about 1.3 and 2.3 km, a wide forested valley, and the camera's ridge 550 m north, its height set from the summit's, so the summit stands on the horizon; no snow round the complex; the switchback road (`ROAD`, `roadDist`) cut as a bench into the slope; ground colours by slope and height (forest floor, rock, snow in north gullies, concrete pads, road banks); starlight; `hillHeight`, `SITE`, `EYE_H`, `TREELINE` |
| `world/observatory.ts` | One dome: render drum, lit door, white cupola with its slit and shutter, the steel tube on its fork; on the main dome, a plain cylinder on the tube stands in for the laser (`laserMouth`); `buildDome(size, laser, big)`, where `big` builds the Keck-style enclosure (low base, turning skirt with vents, wide opening, raised shutter rails); `stoneMap`; the dome sizes; `Dome.pose` and `Dome.show` for the hero model |
| `world/complex.ts` | The main dome (the big enclosure, 25 m across), two small modern enclosures, the clad two-storey operations building with strip windows and rooftop plant, the 10 m tracking dish, a lattice mast with a steady red aviation light, the road's ribbon and its low downhill wall (the road itself is in world/hill) |
| `world/woods.ts` | Boreal spruce over the slopes from Tom's model, `../models/pine.glb`: near trees as the instanced mesh, the rest as impostor cards; slim crowns on a 6 m grid, up to a ragged treeline, none on cliffs; a clearing and a gap for the road; trees the eye never sees are left out; `woods` |
| `world/impostor.ts` | The impostor bake, once at load: three crossed cards, a colour atlas and a normal atlas, premultiplied, with clear gutters between the cells; the bake targets go after a texel copy; `bakeImpostor` |
| `world/laser.ts` | The green aiming beam, lit by the haze; it fades in after the opening. Before a pick it starts at the slit top; after a pick, at the laser's mouth on the tube that shows; `foot`, `altAzDir` |
| `world/lamp.ts` | The tracking lamp on the main dome's wall, beside the door |
| `world/lights.ts` | The complex lights: lit window panes, door lamps with their light, door glow, road lamps; one level for all, or one per lamp at dusk |
| `world/dusk.ts` | The golden hour and the dusk: sky, haze and starlight toward the night; the late sun, low and gold from the west, then the last light on high ground, added to every lit material; `setDusk`, which also sets the star limit and the streak; `patch`, which world/hero adds to its own materials |
| `world/hero.ts` | The hero model: the main dome in full detail, for the cuts only. Render drum with plinth and coping (classic dome); for the `big` main dome, `buildBigHero` builds a panelled base with plinth, reveals and cornice, a steel door with canopy, a roll-up loading door, louvres and wall packs, the track and bogies, a turning skirt with a vent ring, the plated cap, two shutter rails with stiffeners and ladders, the upper shutter and the lower windscreen, inside ribs, a floor and the work lamp; the classic hero also has the door, its fanlight and lamp cage; the catwalk; gore plates with seams and rivets; slit girders with a wind lip; the leaf and the roll shutter; the ring gear, track and three drive units; the inside: floor, ladder, ribs, a dim red work lamp; the telescope from world/hero-scope.ts, which takes the hero's inside light and the dusk patch. It builds after the first frame in steps, then warms the GPU; `hero.ready`, `show`, `follow`, `glass`, `stats` |
| `world/hero-scope.ts` | The hero telescope: a long refractor on a German equatorial mount that never changes sides; its own pier 0.42 south of the dome's axis, through the floor; the axes cross over the dome's centre; a night sky map for the metal and the coated glass; a plain cylinder opposite the finder stands in for the laser; `buildHeroScope(size)`, `HeroScope` with `root`, `glass`, `setTube(alt, az)` in degrees, `laserMouth` |
| `sky/stars.ts` | The catalog stars on a far shell, one `Points` draw; one matrix turns the sky by LST at 51 N; a magnitude limit for the dusk; in the opening, one instanced draw instead: each star as a streak along its turn round the pole (the idea of Railgun's Time drag), which settles into the Points at speed 1; `skyAt`, `starAltAz`, `setStarDpr`, `setStarLimit`, `setStreak` |
| `view/camera.ts` | The locked-off shot from the rise: eye, pitch, yaw, fov for wide and tall frames; `setView`; `applyShot` for a close shot |
| `view/cuts.ts` | The pick sequence: locked cuts of the main dome and its telescope, one inside on the observing floor; each cut's camera locks at its first frame; the final shot on the objective glass, locked on its place of rest, with tonight's stars in it; the letterbox, sized for a 2.39:1 film frame, with each shot framed for that band (a lens is the band's vertical fov); the dip to black back to the wide shot, the reduced-motion still of the settled glass; the swap to the hero model in the close shots |
| `input.ts` | Pointer: aim with a move or a drag, a tap; Esc; alt and az from the camera ray |
| `loop.ts` | The frame loop and sleep; the opening, the machine, the small domes, the lights, the cuts; the `?cuts` review switch; `window.__qa` |
| `main.ts` | Resize (pixel budget, post chain, star size), the first draw, the end of the boot |

## Review switch

`?cuts` is a review switch for Tom, so he can see the pick sequence on the live site.
The page opens at night, with motion on.
About 1 s after the first frame, it picks the brightest star on screen, as a tap would.
After the cuts, a tap anywhere shuts the dome.
Once the shutter is shut, the cuts play again on the same star.
Esc and a tap still skip the cuts.
Without `?cuts`, nothing changes.

With `?dev`, a Pause button stands in the middle of the stage while the cuts show.
It freezes the machine and the cuts; the loop does no work while paused.
A tap on the stage or Esc still skips, and ends the pause.
The Dev sheet's Cut camera rows edit the shot that shows: eye, look, lens, blur.
Eye and look are in the slit's frame, in cupola radii; the glass shot takes only its lens.
The eye still moves round a building that blocks it.
Copy puts the shot's PLANS and CUTS lines on the clipboard and in the console.
Edits last until a reload.
The Shot row (1 to 5) replays the cuts from that shot's start: a fresh machine picks the same star and runs unseen to the shot. The small domes and the sky do not take part. A pause holds on the shot's first frame.

## Axes

+Y is up, -Z is north, +X is east. Azimuth runs from north through east, as in `core/sky.ts`.
The camera faces south (+Z).

## Types

- Strict TypeScript. `npm run check` runs tsc on `observatory/tsconfig.json`; it shows 0 errors.
- `core/` holds pure logic with node tests and no three.js.
