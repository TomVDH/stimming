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
- `world/observatory.ts`, `world/hero.ts`, `world/hero-scope.ts`, `world/modern-scope.ts`, `view/cuts.ts` and `view/through.ts` register nothing yet.

## Modules

| File | Holds |
|---|---|
| `core/sky.ts` | Pure sky maths: sidereal time, alt/az; the star shell's sky matrix, `skyRows` |
| `core/catalog.ts` | The star catalog decoder: `loadStars`, `Star` |
| `core/clock.ts` | The sky clock: speed, trail threshold, the 1 s wake ease; a named night's eased shift from real time (`shiftTo`, `shifting`, `shiftRate`); injected time |
| `core/dome.ts` | Pure dome maths: aim clamp, azimuth delta; the heavy axis, a drive on a trapezoid with its load on a damped spring that settles at each stop (`stepAxis`, `brakeAxis`, `atRest`, `moveTime`, `paceFor`); the heavy shutter, 10 s on an S-curve with a bounce at each end stop (`stepShutter`, `SHUTTER_S`) |
| `core/machine.ts` | The telescope machine: shutter, main dome, tube, each a heavy part from `core/dome.ts`; the cupola turns to the star while the shutter opens; `makeMachine`, `Phase`, the limits `CUPOLA` and `TUBE`; `shut` for the `?cuts` review |
| `core/pick.ts` | The brightest star near a point, `pickStar`; the star a hover shows and a tap locks, `nearStar`: the nearest visible star within 1.5°, brightness settles near ties |
| `core/selector.ts` | The selector's two beats: hover, lock a star, choose an observatory (`refractor`: Little Observatory, `reflector`: Big Observatory), release; `makeSelector`, `hover`, `tapSel`, `choose`, `release` |
| `core/skyctl.ts` | The sky rows' tables: five named nights by sidereal time, four sites by latitude, Bortle 1 to 9 as a star limit and a glow (`bortleMag`, `bortleGlow`); `nightShiftMs` |
| `core/gesture.ts` | Tap or drag, from the move and the time: `classify` |
| `core/opening.ts` | The opening, 10 s from the golden hour into night: sun, star limit, sky lag and speed, the star streak (`streakForDusk` reads it from the dusk alone), lamps, play lock, skip; `sunsetAz` |
| `core/mount.ts` | The slit's offset for the hero's German mount: where the off-axis tube's line of sight leaves the dome; it takes the RA joint and `D_OFF` from `core/clearance.ts`, so it follows the mount's side; it jumps at the meridian, where the mount flips; it fades out above 60° and stays within 12°; `slitAzFor`, `slitOffset` |
| `core/sequence.ts` | The pick sequence's shots, five, and a sixth for the reflector; their timing from the shutter and the tube's lift, `startSeq`, `stepSeq`; the camera locks, `makeLocks`; the complex lights' level per phase, `lightLevel` |
| `setup.ts` | The page shell call, the renderer, the scene, the camera, the stage; the fail line, `fail` and `bootFail`; the star catalog's early start, `starFile`; `onLeave` and `disposeTree`; the bar: Night (top left), City light (the main slider), Site (Settings), with `skyHooks` that loop.ts fills |
| `sky/haze.ts` | The night air: the sky shell with its faint horizon glow and the sunset glow, which the golden hour spreads wider and higher; the height haze in every fog chunk, which holds a faint cool moonlight at night so the valley mist shows; `SKY_GLSL`, the sky colour the far ridges share; City light's lift and four valley towns' light domes (`uLift`, `uTown`) |
| `post/bloom.ts` | Bloom with lens dirt and halation, copied from Railgun |
| `post/grade.ts` | The grade: split tone, contrast, vignette, grain, copied from Railgun |
| `post/chain.ts` | The post chain: render, depth tap, depth of field, valley mist and clouds, bloom, grade, ACES output; `resizePost`, `renderPost`; `cutFocus`, `cutGrain`, and `cutMist`, which the cuts turn off inside a dome; `postBypass` for the cut lab's clay |
| `post/mist.ts` | The valley mist and the distant clouds: a half-size ray march through a slab of mist over the low land and a cloud band across the slopes, stopped at the scene depth; then, for rays that climb, a cloud deck 400 to 1500 m up and past 3 km out, stretched along the wind and lit by the sunset sun from the sky's uniforms; lit with Fire's smoke kit by way of jethover/fluid.js (Henyey-Greenstein phase, powder, two-lobe multiple scatter, shadow taps, sky light from the haze colour); dithered, blurred both ways, laid over the frame; `makeMist`, `makeDepthTap` |
| `world/far.ts` | The far mountains: three ridgelines on rings round the wide eye, 1 to 5° high, the back range snow-capped; each range takes more of the sky's colour with distance; ridged noise gives every range ribs and gullies, and in the golden hour the faces toward the sun catch the late light; they fade into the sky behind them and melt into the haze at the foot; in the golden hour the late sun lights their west faces; `far` |
| `world/hill.ts` | The land, after the Pic du Midi: a broad rock massif with arêtes (about 220 m high, a 520 m foot, flanks near 34°) and a rounded summit crest that runs east-west, as on La Silla's ridge, with knolls for the domes, a saddle for the ops building and rock outcrops between, level pads cut for each building at their own heights (`PADS`), a buttress on the north face, a moat on three sides, a deep valley behind the summit where the height haze gathers, two ridges with peaks and spurs receding behind it at about 1.3 and 2.3 km, under the summit's skyline, a wide forested valley, and the camera's ridge 550 m north, its height set from the summit's, so the summit stands on the horizon; no snow round the complex; the switchback road (`ROAD`, `roadDist`) cut as a bench into the slope, and gravel spur tracks to the pads (`SPURS`) on narrower benches; ground colours by slope and height (forest floor, rock, snow in north gullies, concrete pads, road banks); starlight; `hillHeight`, `SITE`, `EYE_H`, `TREELINE` |
| `world/observatory.ts` | One dome: render drum, lit door, white cupola with its slit and shutter, the steel tube on its fork; `buildDome(size, big)`, where `big` builds the Keck-style enclosure (low base, turning skirt with vents, wide opening, raised shutter rails); `stoneMap`; the dome sizes; `Dome.pose` and `Dome.show` for the hero model |
| `world/complex.ts` | The main dome: a classic dome about 9.5 m across, on the east knoll, that holds the analog great refractor, which the pick and the cuts follow; the big Keck-style enclosure, 25 m across, with the big reflector, turning on its own; two small modern enclosures, the clad two-storey operations building with strip windows and rooftop plant, the 10 m tracking dish, a lattice mast with a steady red aviation light, the road's ribbon and its low downhill wall, and the spur tracks' ribbons (the road itself is in world/hill) |
| `world/woods.ts` | Boreal spruce over the slopes from Tom's model, `../models/pine.glb`: near trees as the instanced mesh, the rest as impostor cards; slim crowns on a 6 m grid, up to a ragged treeline, none on cliffs; a clearing and a gap for the road; trees the eye never sees are left out; `woods` |
| `world/impostor.ts` | The impostor bake, once at load: three crossed cards, a colour atlas and a normal atlas, premultiplied, with clear gutters between the cells; the bake targets go after a texel copy; `bakeImpostor` |
| `world/lamp.ts` | The tracking lamp on the main dome's wall, beside the door |
| `world/lights.ts` | The complex lights: lit window panes, door lamps with their light, door glow, road lamps; one level for all, or one per lamp at dusk |
| `world/dusk.ts` | The golden hour and the dusk: sky, haze and starlight toward the night; the late sun, low and gold from the west, then the last light on high ground, added to every lit material; `setDusk`, which also sets the star limit and the streak; `patch`, which world/hero adds to its own materials |
| `world/hero.ts` | The hero model: the main dome in full detail, for the cuts only. Render drum with plinth and coping (classic dome); for the big dome, a second model builds after the main one, in that dome's own units: a panelled base with plinth, reveals and cornice, a steel door with canopy, a roll-up loading door, louvres and wall packs, the track and bogies, a turning skirt with a vent ring, the plated cap, two shutter rails with stiffeners and ladders, the upper shutter and the lower windscreen, inside ribs, a floor and the work lamp, and the big reflector from world/modern-scope.ts at a 2 m class size, its covers open, centred under the cupola, so its slit needs no German offset (`heroSlitAz`); a cut adapter gives the reflector's rest pose and sizes (`restGlass`, `CutScope`); the classic hero also has the door, its fanlight and lamp cage; the catwalk; gore plates with seams and rivets; slit girders with a wind lip; the leaf and the roll shutter; the ring gear, track and three drive units; the inside: floor, ladder, ribs, a dim red work lamp; the telescope from world/hero-scope.ts, which takes the hero's inside light and the dusk patch. It builds after the first frame in steps, then warms the GPU; `hero.ready`, `show`, `follow`, `glass`, `stats`; `hero.of(dome)` gives the main or the big dome's model, `HeroOf` |
| `world/hero-scope.ts` | The hero telescope: a long refractor on a German equatorial mount; the pose comes from `targetPose` in `core/clearance.ts`: the counterweight stays down, so an east target rides with the tube west of the pier; a change of side flips the mount in 1.6 s on `flipPose`; RA is unwrapped, so it never jumps; the dec axis is long enough that the saddle clears the RA housing (`DEC_FACE` 0.215); the tube sits `TUBE_SHIFT` forward in its rings and `D_OFF` from the polar axis; its frame puts the turn height at `SCOPE_TURN`, and each close-up dome lifts it to its own; the worm is a single-start helix with the wheel's tooth pitch, so it turns 150 times per RA turn; the RA hand wheel rides the worm's shaft past the motor; the dec hand wheel turns 8 times per dec turn; PBR: a worn-metal roughness map on the metals, the cast grain as a bump; its own pier 0.42 south of the dome's axis, through the floor; the axes cross over the dome's centre; a night sky map for the metal and the coated glass; `buildHeroScope(size)`, `HeroScope` with `root`, `glass`, `setTube(alt, az)` in degrees (true while a flip runs), `step(now)`, `parts` (the joint and drive groups) |
| `world/modern-scope.ts` | The modern telescope: a 1 m f/3 Ritchey-Chretien on a direct-drive alt-az fork, so the tube never changes sides. A white faceted pier and mirror cell, black anodised fork, a carbon Serrurier truss on white nodes under a black cloth shroud, an amber glass-ceramic blank, the Cassegrain stack and cable runs. A cable wrap rolls round the altitude bearing as the tube tilts; petal mirror covers and the cell fans move through `setCovers`, `setFans` and `step(dt)`, which returns true while anything moves. The primary and secondary are planar reflectors. `buildModernScope(size)`, `ModernScope` with `root`, `setTube(alt, az)` in degrees, `setCovers`, `setFans` and `step`. The workbench `scope-modern.html` shows it alone; world/hero.ts mounts it in the big dome |
| `core/clearance.ts` | The mount's one source of truth and the clearance geometry, node-tested in `tests/observatory-clearance.test.mjs`: `targetPose` (counterweight down), `flipPose` (tilt off the pole, turn RA, cross the pole at `FLIP_CROSS`, turn on, settle), `D_OFF`, `TUBE_SHIFT`, `AXES_UP` (the axes over the cupola's turn height); a clash is a triangle pair that crosses by 1 mm or more; a face flat on a face and a touch are contacts; a grid broad phase that returns candidates in index order, so a report repeats exactly |
| `viewer.ts` | The telescope viewer workbench, `../scope.html`: orbit, tube altitude and azimuth, Turn, Sweep azimuth; `?clearance` runs a fixed pose list (the sky every 15° and 30°, four meridian flips at 41 samples each) and prints one report: clashes, the drives read back, mirrored instances, the tube on the pole round RA, both pier sides, and a legend of the meshes |
| `sky/stars.ts` | The catalog stars on a far shell, one `Points` draw; one matrix turns the sky by LST at the site's latitude (51 N at first, `setLat`); a magnitude limit for the dusk; in the opening, one instanced draw instead: each star as a streak along its turn round the pole (the idea of Railgun's Time drag), which settles into the Points at speed 1; `skyAt`, `starAltAz`, `setStarDpr`, `setStarLimit`, `setStreak` |
| `sky/altaz.ts` | `altAzDir`: an altitude and azimuth as a world unit vector, -Z north, +X east |
| `view/camera.ts` | The locked-off shot from the rise: eye, pitch, yaw, fov for wide and tall frames; `setView`; `applyShot` for a close shot; `applySweep`, the opening's move: from the golden hour toward the sunset, a pan and a tilt down onto the dome that lands on the wide shot at night, on the rise and at most 10 m over its eye |
| `view/cuts.ts` | The pick sequence: locked cuts of the chosen dome and its telescope (`cuts.start(phase, view, target, dome)`, the main dome by default; the dome's own close model stands in, from `hero.of`, for the main and the big dome), one inside on the observing floor; each cut's camera locks at its first frame; the inside shots take no mist; the final shot on the objective glass, or down the big dome's reflector at its front ring, locked on its place of rest, with tonight's stars in it; the eyes stay inside the summit's clearing, and a building's box across the frame blocks an eye; with the reflector, a sixth shot: a fast push where the secondary's white disk wipes up over the camera while the focus pulls to the primary, then a hold on the primary with the night sky in it, its stars a little brighter (`MIRROR_PUSH`, `MIRROR_S`); the cuts render 30 frames a second, each beat fading in over the one before, never across a hard cut; the letterbox, sized for a 2.39:1 film frame, with each shot framed for that band (a lens is the band's vertical fov); with the refractor, the push into the glass, which opens into the view through the telescope; the dip to black back to the wide shot, the reduced-motion still of the settled glass; the swap to the hero model in the close shots |
| `view/lab.ts` | The cut lab, `?cuts&dev&lab` (`observatory/cutlab.html` links it): a clay look (grey matcap, see-through parts hidden, no post, `postBypass`), a contact sheet of each dome's shots from replays, and a free camera (orbit, pan, dolly) whose Copy plan sets the shot's plan and copies its lines; it loads OrbitControls only with the lab |
| `view/selector.ts` | The selector's overlay on the wide shot, in the bar v3 look: four corner ticks and the star's name on hover; on a lock the ticks close in and turn white, and two bar v3 words choose `Little Observatory` or `Big Observatory` (keys 1 and 2); pointing at a word draws one faint hairline to its dome; `selectorView` |
| `input.ts` | Pointer: aim with a move or a drag, a tap; Esc; alt and az from the camera ray |
| `view/through.ts` | The view through the telescope after the refractor's cuts: `../sim.html?embed` in a frame over the stage, loaded at the pick, opened as an iris in the glass during the push; Esc or its Back button fades it out and the wide shot fades up from black |
| `loop.ts` | The frame loop and sleep; the opening and its sweep; the selector; the machine on the chosen telescope's dome (the refractor in `complex.main`, the 1 m in `complex.big`), the other domes following, an unbound telescope dome shut; the lights; the cuts on the chosen dome (`cuts.start(..., dome)`); the scene sleeps while the view through the telescope shows; the sky rows' night swing, site ease and City light; the `?cuts` review switch; `window.__qa` |
| `main.ts` | Resize (pixel budget, post chain, star size), the first draw, the end of the boot |

## Review switch

`?cuts` is a review switch for Tom, so he can see the pick sequence on the live site.
The page opens at night, with motion on.
About 1 s after the first frame, it sends the 1 m to the brightest star on screen, as a lock and a choice of the 1 m would.
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
