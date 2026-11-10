# Railgun (`railgun`) implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. One session builds this toy, task by task, in its feature worktree. Steps use checkbox (`- [ ]`) syntax.

**Goal:** A colossal old railgun stands on a pylon over a dusty plain under a low sun, seen from 2.6 km in one locked-off shot. The flats run open to the horizon with a few far mesas; long cirrus hangs over them. Far beyond the muzzle a burning asteroid falls head-on along its own smoke train, minutes out. Hold to charge: lightning crackles over the barrel, dust lifts, the ground shakes, and it all grows the longer you hold. Release: a muzzle blast with shock rings, a bolt that foreshortens to a spark as it crosses the sky for seconds, a fireball with shock shells that lights the plain, a fresh rock.

**Architecture:** three.js 0.170 on the K2 noise and haze and the K6 burst particles lifted from `launch/index.html`; the night sky is replaced by a sunlit dusk sky. The gun is one merged mesh of straight boxes, beams, tubes and drums with flat facets from screen derivatives; the barrel turns about its trunnion in the vertex shader. The shot is a hand-rolled state keyed to the sim clock. The composer renders into a multisampled half-float target, then bloom, grade and output.

**Tech stack:** three.js 0.170 (EffectComposer, RenderPass, UnrealBloomPass, ShaderPass, OutputPass, BufferGeometryUtils), simplex-noise, raw Web Audio through `audioKit()`.

**Spec:** Tom, 2026-11-09, in chat. Decisions: hold to charge and release to fire; one massive gun, not a ring; a far, static, Villeneuve-like shot; a day or dusk scene; the gun is one massive artillery piece, not a ramp: straight hard-surface architecture, old and fixed, with nothing glowing; the barrel elevates on the fixed mount; the gun follows Tom's reference still (a slender banded barrel on a braced pylon); ONE gun only, richly modelled; the rock high in the sky, falling along its trail, very slowly; a layered harmonic synth under the charge; violent effects at a full hold; a massive muzzle flash and shockwave; an anisotropic bolt; a huge impact shockwave whose light shows the scale; wide open flats with only a few faraway mesas; long wispy clouds; the rock far out so the bolt takes seconds; the charge-up chaos grows with the hold; no fail state yet (the rock holds at its largest size).

| | |
|---|---|
| Size, estimate | M to L |
| Kits | Uses K2 (noise, haze) and K6 from `launch/index.html` |
| Bean | `stimming-f793`, worktree `.worktrees/stimming-f793` |

## The shot

One unit is one metre. The trunnion sits 215 m over the origin. The barrel climbs at 6° toward negative z, 900 m long: a ribbed breech housing, a boxy cradle with three collars, a round barrel in two diameters with four painted yellow bands, a thin second tube under it, and three booms off the back.
The gun stands on a deck that turns on a fixed plinth: one thick pylon with a yoke, braced struts and a forward leg.
There is one gun. It tracks the rock in bearing and elevation.
A flat dusty plain, open to the horizon. Three mesas and one pair of buttes stand 14 to 31 km out, far apart. Long cirrus streaks cross the sky on one wind line.
The sun sits low on the right, three to sixteen degrees up; it lights the near flank and rakes shadows to the left.
The eye stands 30 m up, 1.7 km right of the axis and 2 km behind the trunnion, with a 38° lens aimed 24.5° left of the barrel. The horizon sits low. The gun sits lower left; the rock hangs low on the right, 6° over the horizon.
Portrait: the eye stands 3 km back and 0.8 km right with a 56° lens.
The rock starts high and far and falls head-on along its smoke train. The train streams back up the path, 160 km long.

## Hero moments

1. **The looming.** First frame: a monument in dusty light, and a rock already too big over the mesas, trailing dark smoke.
2. **The chaos.** Under the hold, lightning bows over the gap and crawls along the rails, dust lifts off the plain round the breech, the ground shakes, and a hum climbs. Hold longer and the storm thickens. Past chaos 0.6 the rage starts: strikes to the plain, a lens fringe, a harsher synth.
3. **The slug.** On release a white streak leaves the breech, runs the rails in 0.3 s, leaves in a blast with two shock rings and a dust wall, and climbs away. The streak has a width in metres, so it foreshortens to a spark.
4. **Light now, sound later.** The flash is silent. The Mach ring rolls out over the plain for ten seconds before the crack lands. The rock breaks in silence; its rumble arrives fifteen seconds after.
5. **The shatter.** A white fireball overexposes the frame, two shock shells grow for seconds, the smoke train and the plain light up. Then shards tumble outward with hot fresh faces that cool, and embers drift down the sky.

## Loop

| Time | Event |
|---|---|
| press | Charge starts. Power `c = 0.12 + 0.88·(1 − e^(−held/2.5))`; chaos `1 − e^(−held/4)` keeps growing after the power saturates |
| hold | `rage = smoothstep(chaos, 0.6, 0.9)`. Arcs from one to twenty-four a second with chaos, sixteen ribbons; dust puffs `70·chaos²` a second; shake `1.2·chaos²`; the hum rises with power and tremors with the chase |
| release | `fire(c)`: muzzle flash, breech dust burst, shake, recoil kick, the slug chirp |
| 0 → 0.3 s | The slug runs the rails |
| 0.3 s | Muzzle flash, muzzle light on the gun and plain, two shock rings, a dust front; the bolt leaves along the axis |
| 0.3 + eye / 343 | The Mach ring reaches the eye: a jolt, and the crack |
| T = 9 → 6 s | Hit: shards, K6 embers, a fireball (0.28 s flash, 2.4 s glow), two shock shells, a frame exposure pulse, a jolt |
| hit + 2.5 s | The gun slews at 3.2° a second to the next rock's track |
| hit + 14.6 s | Rumble: 40 km compressed eight times |
| hit + 12 s | Shards gone; a fresh rock at s = 0, a little to one side |

One shot at a time; a release during a live shot fades out. Changing Asteroid mid-approach retunes the size and keeps the progress.

| Asteroid | Radius | Fall | Shards | Rumble |
|---|---|---|---|---|
| Boulder | 600 m | 220 s | 24 | 0.7 |
| Mountain | 1000 m | 300 s | 40 | 1.0 |
| Moon | 1700 m | 380 s | 56 | 1.3 |

## Bar

| Control | Content |
|---|---|
| Chips | Boulder, Mountain, Moon |
| Slider | Sun |
| Actions | none: the hold is the toy |
| Settings | Letterbox · Grain · Quality (shared) |
| How | Hold: charge · Release: fire · Drag: look around · Space: charge |

## Tech

- **Gun.** Straight boxes, beams, tubes and drums merged into one mesh. `aPart` holds the station, a barrel flag, a seed and a tone (shell, graphite, yellow paint). Facets from `dFdx`/`dFdy`. The shader adds pour lines, plate seams, streaks and dust at the foot. Nothing on it emits light.
- **Elevation.** `aim(p, f, g)` applies the recoil, the elevation about the trunnion and the deck's turn. `setAim` moves `AX`, `AX_UP` and `MUZZLE`; `stepAim` slews toward the rock.
- **Sky.** `k2skyS(dir, sunK)`: zenith to horizon, a dust band, the sun's glow and disc, then `wisps`: cirrus from three noise fields on a flat layer, stretched along one wind line. The haze samples the sky at the horizon without the disc and without the clouds. Uniforms `uSun, uSunC, uZenC, uHorC` come from `sun(deg)`.
- **Far country.** `buildFar()` writes one unindexed mesh from a fixed seed: each mesa is a talus skirt, a cliff and a cap. Positions are polar about the landscape eye. Facet normals, level beds on the cliffs, K2 haze; no shadow map.
- **Light.** One sun depth map, 2048 × 1024, four-tap PCF; it redraws only when the barrel or the sun moves. A sky hemisphere, the sun, a rim from behind, the rock's glow faintly.
- **Rock.** `IcosahedronGeometry(1, 5)` with merged vertices, displaced once per shape; three shapes baked at load. The hot face looks at the planet. Ember cracks from a 3D noise band.
- **Trail.** A raymarched volumetric smoke train (72 steps, 4 light steps) through a baked 3D billow noise: fire at the head, soot to ash, lit by the sun, the sky, the rock and the blast. Far objects take Rayleigh air.
- **Arcs.** Sixteen camera-facing ribbons of thirteen segments, rewritten each frame with two octaves of jitter; gap arcs, crown arcs, flank arcs and strikes down to the plain past the footing.
- **Dust.** 1600 alpha-blended billboards in a ring buffer, lit by sun and sky, swelling as they rise.
- **Shot.** State keyed to the sim clock; the bolt is one ribbon with a width in metres, a tapering tail and shock diamonds; `makeGlint` streaks with world sizes at the head; `makeRing` discs for the muzzle rings and the hit shells; flares as billboards; the muzzle light and the Mach ring in the ground shader; `uFlash` in the grade.
- **Shards.** One `InstancedMesh`, pose in closed form from birth time; no transparency sorting.
- **Post.** Multisampled half-float composer target, K2 bloom (threshold 1.2), K2 grade with letterbox, OutputPass.

## Sound

Wind bed with a whistle past the pylon, dipping under a charge. A charge synth of ten harmonic partials that enter in turn, with drive, tremolo and a noise layer at rage. Arc clicks panned to their place on screen. A slug chirp left to right. The crack when the Mach ring reaches the eye. A rumble fifteen seconds after the hit, scheduled on the audio clock. Everything through `track()`; mute and a hidden tab stop it all.

## Finesse

- The first frame is a picture: the rock already burns over the mesas; the plume streams.
- The first frame of a press shakes the eye and starts the hum.
- The Mach ring shows on the plain before the crack lands.
- Shards shrink away; the embers fall below the muzzle before the new rock shows.
- Every hit jitters in pitch, time and level.

## Reduced motion and idle

- Reduced: no shake, no arcs, softer flashes, shards drift without spin.
- Idle: 30 fps; the loop sleeps 60 s after the last input; a live shot or shards keep it awake; hidden stops the loop and cancels pending sounds.

## Review focus

1. A tap fires a dim slug that still hits; no NaN in the shard pose.
2. Hidden tab mid-shot: pending sounds cancel; the shot resumes on return.
3. Mute mid-charge: the hum stops at once; the rock still shatters.
4. 375 × 812 and 812 × 375: barrel and rock both stay in frame.
5. A second press during a live shot charges but does not fire twice.

## Tasks

### Task 1: The gun at dusk

- [x] Skeleton and kits from launch; gun, cradles, ground, sky, rock, plume; camera; post chain; loop; pointer.
- [x] Bar spec, `toys.json`, this plan, menu tile and hook. Stills at three sizes. Checkpoint with Tom: the cadrage.
- [x] Commit: `Railgun: the gun at dusk`.

### Task 2: Approach and charge

- [x] Approach curve and hold; charge state, arcs, dust, shake; `__qa.charge(c)`, `__qa.jump(t)`.
- [x] Commit: `Railgun: the draw`.

### Task 3: Shot and shatter

- [x] Shot state, slug, muzzle flash, bolt, Mach ring, recoil, hit, shards, embers, flash, respawn; `__qa.shoot(c)`.
- [x] Commit: `Railgun: one slug, one asteroid`.

### Task 4: Sound

- [x] Wind, hum, clicks, slug, crack at arrival, rumble. Q9. Commit: `Railgun: a crack, then a far rumble`.

### Task 5: Settings, QA, PR

- [x] Persistence, reduced motion, Q1 to Q10 at three sizes, fps in the bean, `tests/bar-v2.html`. Push the branch, open the PR.

### Task 6: The artillery piece (Tom's TLC pass)

- [x] One artillery piece on a fixed terraced mount; straight hard-surface blocks; no standing stones.
- [x] Aged concrete shading, a sun depth map, a raking sun.
- [x] The barrel lowers after the shot and climbs for the next rock.
- [x] Dust and strikes land on the plain outside the terraces; the portrait eye moves back.
- [x] Q1 to Q10 again at three sizes. Commit: `Railgun: an old gun on a fixed mount`.

### Task 7: The reference gun and the far country

- [x] The gun follows Tom's reference still: a banded round barrel, a breech housing, booms, a pylon with braced struts; two sibling guns far off.
- [x] The aim drops to 6°; the rock sits low over the horizon; the barrel lowers 4° after the shot.
- [x] Open flats with a few faraway mesas; no ranges (Tom: the ranges enclosed the scene).
- [x] Long cirrus streaks.
- [x] Q1 to Q10 again at three sizes. Commit: `Railgun: the reference gun, mesas and cirrus`.

### Task 8: The meteorite

- [x] A displaced rock with a hot face, a raymarched volumetric smoke train, Rayleigh air.

### Task 9: One gun, the blast and the shock

- [x] The rock starts high and falls head-on along its trail in 220 to 380 s.
- [x] One gun on a turning deck; a richer model; it tracks the rock.
- [x] A ten-partial harmonic charge synth; rage at a full hold.
- [x] Muzzle blast, shock rings, dust front; an anisotropic bolt.
- [x] Impact fireball, shock shells, blast light on the plain, the gun and the smoke.
- [x] Q1 to Q10 again at three sizes, rungs 2 and 3. Commit: `Railgun: one gun, a slow fall, blast and shock`.

### Task 10: The gun, the shot and the shatter (design)

Bean `stimming-z9w9`, branch `claude/railgun-shot-99c65f`. Tom, 2026-11-10: "the gun, the muzzle effects and projectile, the incoming threats and the explosion thereof upon destruction".
Decisions: the Volumetric direction for the shot; the barrel glows after a shot and cools; a main rock with two to four fragments.
Tom, 02:32, added: "the harmonic wind up should culminate in a thx like chorus right before firing -- we can hold the gun a little longer -- it will really start acting out if we hold it for too long". Then: a hold past the acting-out vents the charge (a soft fail).

**Fixed.** The smoke train keeps its look: no edit to `trail()`, the march or the `PU.*` uniforms. A change there needs a before/after still for Tom first.
The sky, the cirrus, the sun and the time of day belong to another session: no edit to `k2skyB`, `wisps`, `sun`, `sunDeg`, `setSun` or the Sun slider.
`hitFlash`, `hitGlow` (the GLSL sky term) and `uAst.w` keep their names and meaning.

**Before.** Stills at 1280 × 800, full charge: the muzzle flash and the fireball are flat white discs; the shock shells are clean circles square to the lens; the bolt is a short spark and a level lens streak; the gun reads as stacked boxes; the rock is a smooth ball.

#### The gun

- A boxy muzzle brake, about 70 m long, with three pairs of side ports. It replaces the three plates at stations 872 to 896.
- Cable bundles sag along the barrel from the breech housing to the cradle: tubes on a catenary, tone 2.
- Recoil: the barrel runs back as now. The cradle pitches up 0.5° and settles as a damped spring over two seconds. The deck sways 0.1°. Dust falls off the ledges.
- Tracking: a spring and damper on yaw and elevation. The slew speeds up, overshoots a little and settles. The top rate stays 3.2° a second.
- Heat: one uniform `uHeat`, 1 on the shot, gone in about ten seconds. The rails and the brake take a blackbody ramp, white-yellow to dull red, hottest at the muzzle. White steam wisps rise off the barrel through the dust buffer.
- At rest the gun stays cold stone; nothing on it glows.

#### The hold

| Held | Stage | What happens |
|---|---|---|
| 0 to 10 s | Build | Power climbs on an ease that reaches 1 at 10 s. Chaos and arcs grow as now, slower. |
| 10 s | Full | The chord locks. One hard shudder. |
| 10 to 14 s | Ready | Power holds at 1. The chord rings; the gun shivers. The clean shot. |
| 14 to 24 s | Over-hold | The gun acts out, past today's rage: arcs strike the plain far out; the rails glow red while charging; tone-2 plates rattle; sparks spit from the brake; heavy shake; lens fringe. A release fires an overcharged shot, power up to 1.25, with a bigger blast. |
| 24 s | Vent | The gun dumps the charge into the plain: one huge strike under the barrel, a dust burst, a shock ring on the ground. No shot; the rock keeps coming. |

- Today's constants move: `levelOf`, `chaosOf`, the rage band, `CHASE_T`, and the 2.5 s constant in `__qa.charge`.
- `__qa.charge(c)` takes 0.12 to 1.25; above 1 it sets the over-hold.
- This replaces "no fail state yet": the vent is a soft fail.

#### The chorus

An original swell. It uses no recording, notes, sweep or score of the THX Deep Note.
- A choir of formant voices (sawtooth through two vowel bandpasses) grows out of the hum. The voices start on the hum's own harmonics.
- Through the build they climb on their own curves and spread into a beating cluster. Their vowel opens from "oo" to "ah".
- At full charge they lock into one wide chord of the gun's own: a suspended minor voicing on the hum's root, over five octaves. The ten partials stay as the body under it.
- In the over-hold the chord sours: the voices drift sharp and flat, beat hard, distort and split into a screaming cluster.
- The vent cuts the choir to a crash and a falling groan.
- All of it runs through `kit.out`; mute and a hidden tab stop it at once.

#### Muzzle

- The flat flare disc goes.
- A plasma plume: a raymarched volume on a short capsule along the bore, 600 m long at full charge. It reads `volRT`. It burns white-blue for 0.2 s, then cools to grey smoke that drifts with the wind and thins out over twelve seconds.
- Two side jets from the brake ports: glints square to the barrel, 0.15 s.
- A spiked flare: four soft rays and a short anamorphic streak, 0.1 s.
- A condensation shell replaces `muzRingA` and `muzRingB`: a thin noisy spherical shell ahead of the muzzle, lit by the sun, gone in under a second.
- The Mach ring on the ground (`uShock`) stays.
- The dust front becomes a rolling ring: bigger, darker puffs that roll out and climb from the muzzle's foot.

#### The bolt

- The head: a white-hot slug in a blue sheath; the streak behind it is longer.
- The ion line: the path from the muzzle to the target stays in the sky. It glows blue-white for half a second after the head passes, then cools to a thin white contrail. The contrail widens, bends in the wind and fades over about 25 seconds. One ribbon with its width in metres, its edges cut by noise.
- The blast lights the far end of the line.

#### The threats

- One shape per size: Boulder long and thin, Mountain lumpy, Moon wide with craters. The bake adds ridged noise and a few flat cuts, so the outline is craggy.
- Ablation: glowing bits break off the hot face, fall back into the smoke and burn out. K6 stars, spawned at the head while the rock falls.
- Fragments: two to four small rocks fall on their own tracks a few kilometres off the main track. One instanced mesh with a hot face. Each has a thin smoke trail: a cheap noise ribbon, not the raymarched train.
- A shot hits only the main rock. Each fragment breaks into embers when the blast's shock reaches it.

#### The explosion

- A raymarched fireball on a sphere proxy at the hit: radius R to about 6R in four seconds. It runs white core, orange billows, then a dark cloud of soot and debris. The cloud drifts, is lit by the sun from outside and stays about 30 seconds.
- A condensation shell (a Wilson cloud) flashes round the fireball and burns off. It replaces `hitRingA` and `hitRingB`.
- More shards, craggier; each trails burning smoke through K6 stars.
- The embers fall in longer arcs through the cloud.
- A new uniform `uBlast` (vec4: world position, strength) carries the blast light. The gun, the ground and the trail read it; the other session's clouds may read it too.

#### Cost

- The plume, the fireball and the shells draw only while a shot is live.
- Rungs 2 and 3 cut their march steps, as they do for the train.
- The target holds: 30 fps at 1280 × 800 on High through charge, shot and hit.

### Task 10: steps

All code stays in `railgun/index.html`. A test here is a probe in the browser pane through `__qa`, plus a still to the local sink. No Playwright.
`__qa.freeze()` holds the clock; `__qa.run(t)` steps it in frames. Stills go through `snap(name)` at 1280 × 800.

**Global constraints.** three.js 0.170 and the importmap as is; no new library. 30 fps at 1280 × 800 on High. Code comments in ASD-STE100, twelve words or fewer. Commit only through `tools/commit.sh`. Every step ends with a clean console.

**Review focus.**
1. A release in the same frame as the vent: one outcome only, no shot after the vent.
2. Mute or a hidden tab mid-chorus or mid-over-hold: the choir stops at once; a hidden tab never vents.
3. A size change with fragments in the sky: fragments retune and keep off the main track.
4. Reduced motion: no rattle, no shake; the vent and the volumes still show, at half strength.
5. A press during a vent or a live shot: it charges, but never fires twice.

**Shared names.** `HOLD = { full: 10, ready: 14, vent: 24 }`. `stageOf(held)` returns `'build' | 'full' | 'ready' | 'over' | 'vent'`. Uniforms in `U`: `uHeat` (float), `uBlast` (vec4, world xyz and strength), `uOver` (float, 0 to 1 through the over-hold). One GLSL chunk `VOLFX` holds the sphere and capsule march that the plume and the fireball share; it reads `volRT`.

#### 10.1 The hold

- [ ] Probe first: `__qa.hold(t)` sets the held time; `__qa.level()`, `__qa.stage()`. Expect `hold(5)` → build, level < 0.9; `hold(10)` → level 1; `hold(12)` → ready; `hold(18)` → over, level about 1.1; `hold(24.1)` → vent, no shot, `charge` null.
- [ ] `levelOf(held)`: an ease to 1 at `HOLD.full`, then 1 to 1.25 through the over-hold. `chaosOf` and the rage band stretch to the new times. `uOver` tracks the over-hold.
- [ ] Over-hold acting out: far strikes, red rails while charging (through `uHeat`), tone-2 rattle in `aim()` by `uOver`, brake sparks, heavier shake, lens fringe.
- [ ] `vent()`: a strike under the barrel, a dust burst, a ground shock ring through `uShock`; the rock keeps coming. Review focus 1 and 5 pass.
- [ ] `__qa.charge(c)` takes 0.12 to 1.25. Commit: `Railgun: a longer hold, an over-hold, a vent`.

#### 10.2 The chorus

- [ ] Probe first: `__qa.audio()` adds `voices` and `locked`. Expect voices > 0 under a hold with sound on, `locked` true at level 1, voices 0 one second after release, mute or hide.
- [ ] Formant voices from the hum's harmonics; climb and spread; vowel "oo" to "ah"; lock into a suspended minor chord on the root at full; sour in the over-hold; crash and groan on the vent.
- [ ] Review focus 2 passes. Tom listens. Commit: `Railgun: a choir that locks at full charge`.

#### 10.3 The gun

- [ ] The muzzle brake with three port pairs; cable bundles. Still at rest: the barrel reads past the boxes.
- [ ] Spring tracking on yaw and elevation, 3.2° a second top rate. Probe: `aimNow.err` settles to under 0.004 after a respawn, with one small overshoot.
- [ ] Recoil: cradle pitch 0.5° on a damped spring; deck sway; ledge dust.
- [ ] `uHeat`: blackbody ramp on rails and brake, hottest at the muzzle, gone in ten seconds; steam wisps. Stills at hit + 0, + 5 s, + 12 s. Commit: `Railgun: a braked muzzle, a hot barrel, a hydraulic slew`.

#### 10.4 The muzzle

- [ ] `VOLFX` and the plume on a capsule along the bore: white-blue 0.2 s, grey smoke for twelve seconds. It draws only while a shot is live; `resize()` cuts its steps on rungs 2 and 3.
- [ ] Side jets, the spiked flare, the condensation shell in place of `muzRingA` and `muzRingB`; the rolling dust ring.
- [ ] Stills at 0.36, 0.7, 1.5 and 6 s against the before set. fps through the shot. Commit: `Railgun: a plume, side jets and a shell at the muzzle`.

#### 10.5 The bolt

- [ ] The head and its longer streak.
- [ ] The ion line: one ribbon from the muzzle to the target, blue-white, then contrail, 25 s, wind bend, lit at its far end by `uBlast`.
- [ ] Stills at 1.5, 3, hit + 2 and hit + 15 s. Commit: `Railgun: an ion line across the sky`.

#### 10.6 The threats

- [ ] `bakeRock` takes a shape kind: long, lumpy, cratered; ridged noise and flat cuts. Stills of all three sizes at s = 0.5.
- [ ] Ablation sparks from the hot face while the rock falls.
- [ ] Fragments: two to four, one instanced mesh, own tracks, ribbon trails; they break into embers when the blast shock reaches them. Review focus 3 passes. Commit: `Railgun: a craggy rock and its fragments`.

#### 10.7 The explosion

- [ ] The fireball on `VOLFX`: R to 6R in four seconds; white, orange, then a soot cloud for 30 s.
- [ ] The Wilson shell in place of `hitRingA` and `hitRingB`; more, craggier shards with smoke trails; longer ember arcs.
- [ ] `uBlast` lights the gun, the ground and the trail. `hitFlash`, `hitGlow` and `uAst.w` unchanged. Stills at hit + 0.08, 0.6, 2, 5 and 20 s. Commit: `Railgun: a fireball, a shell and a debris cloud`.

#### 10.8 QA and the PR

- [ ] Clean console; 30 fps through charge, over-hold, shot and hit at 1280 × 800, 375 × 812 and 812 × 375; rungs 2 and 3. Review focus 4 passes.
- [ ] The before and after sheet to Tom; Tom signs off. Bean checklist current; PR to `main`.

## Kit handoff

The straight-block builder with flat facets, the `aim` turn about a pin, the sun depth map, the day sky `k2skyS` with its cirrus, the far-country builder, the dust ring buffer, `makeRing` and `makeGlint`, marked. Any daylight diorama can copy them.
The `vol` and `trail` blocks are liftable as a pair; Tom may take the trail shading to another toy ("ten seconds").
