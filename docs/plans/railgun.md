# Railgun (`railgun`) implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. One session builds this toy, task by task, in its feature worktree. Steps use checkbox (`- [ ]`) syntax.

**Goal:** A colossal old railgun emplacement of pale concrete stands on a dusty plain under a low sun, seen from 2.6 km in one locked-off shot. Far beyond its muzzle a burning asteroid hangs in the sky and slowly closes in. Hold to charge: lightning crackles over the barrel, dust lifts, the ground shakes, and it all grows the longer you hold. Release: the slug runs the rails, a bolt crosses the sky for seconds, the rock shatters, a fresh one approaches.

**Architecture:** three.js 0.170 on the K2 noise and haze and the K6 burst particles lifted from `launch/index.html`; the night sky is replaced by a sunlit dusk sky. The gun is one merged mesh of straight boxes, wedges and drums with flat facets from screen derivatives; the barrel turns about its trunnion in the vertex shader. The shot is a hand-rolled state keyed to the sim clock. The composer renders into a multisampled half-float target, then bloom, grade and output.

**Tech stack:** three.js 0.170 (EffectComposer, RenderPass, UnrealBloomPass, ShaderPass, OutputPass, BufferGeometryUtils), simplex-noise, raw Web Audio through `audioKit()`.

**Spec:** Tom, 2026-11-09, in chat. Decisions: hold to charge and release to fire; one massive gun, not a ring; a far, static, Villeneuve-like shot; a day or dusk scene; the gun is one massive artillery piece, not a ramp: straight hard-surface architecture, old and fixed, with nothing glowing; the barrel elevates on the fixed mount; the rock far out so the bolt takes seconds; the charge-up chaos grows with the hold; no fail state yet (the rock holds at its largest size).

| | |
|---|---|
| Size, estimate | M to L |
| Kits | Uses K2 (noise, haze) and K6 from `launch/index.html` |
| Bean | `stimming-f793`, worktree `.worktrees/stimming-f793` |

## The shot

One unit is one metre. The trunnion sits 215 m over the origin. The barrel climbs at 26° toward negative z, 900 m long: two stepped rail slabs over a graphite spine, collars at each step, cooling fins, a breech block and two recuperators.
The mount is fixed: three terraces with a recoil well, two cheek walls that carry the trunnion, a rest wall under the barrel and one ramp.
A flat dusty plain. The sun sits low on the right, three to sixteen degrees up; it lights the near flank and rakes shadows to the left.
The eye stands 30 m up, 1.7 km right of the axis and 2 km behind the trunnion, with a 38° lens aimed 24.5° left of the barrel. The horizon sits low. The gun sits lower left; the rock hangs upper right.
Portrait: the eye stands 3 km back and 0.8 km right with a 56° lens.
The rock sits 40 km out along the axis. Its plume streams up and to the right across the sky.

## Hero moments

1. **The looming.** First frame: a monument in dusty light, and a rock already too big over its muzzle, trailing dark smoke.
2. **The chaos.** Under the hold, lightning bows over the gap and crawls along the rails, dust lifts off the plain round the breech, the ground shakes, and a hum climbs. Hold longer and the storm thickens.
3. **The slug.** On release a white streak leaves the breech, runs the rails in 0.3 s, flashes at the muzzle and climbs away as a dwindling spark for six to nine seconds.
4. **Light now, sound later.** The flash is silent. The Mach ring rolls out over the plain for ten seconds before the crack lands. The rock breaks in silence; its rumble arrives fifteen seconds after.
5. **The shatter.** A flash, then shards tumble outward with hot fresh faces that cool, and embers drift down the sky.

## Loop

| Time | Event |
|---|---|
| press | Charge starts. Power `c = 0.12 + 0.88·(1 − e^(−held/2.5))`; chaos `1 − e^(−held/4)` keeps growing after the power saturates |
| hold | Arcs from one to twenty-four a second with chaos, six alive; dust puffs `70·chaos²` a second; shake `1.2·chaos²`; the hum rises with power and tremors with the chase |
| release | `fire(c)`: muzzle flash, breech dust burst, shake, recoil kick, the slug chirp |
| 0 → 0.3 s | The slug runs the rails |
| 0.3 s | Muzzle flash; the bolt leaves along the axis |
| 0.3 + eye / 343 | The Mach ring reaches the eye: a jolt, and the crack |
| T = 9 → 6 s | Hit: shards, K6 embers, flash, the sky warms |
| 1.5 → 8.5 s | The barrel lowers 14° onto its rest wall |
| hit + 3.5 → 9.5 s | The barrel climbs back to 26° for the next rock |
| hit + 14.6 s | Rumble: 40 km compressed eight times |
| hit + 10 s | Shards gone; a fresh rock at s = 0, a little to one side |

One shot at a time; a release during a live shot fades out. Changing Asteroid mid-approach retunes the size and keeps the progress.

| Asteroid | Diameter | Approach | Shards | Rumble |
|---|---|---|---|---|
| Boulder | 0.8° → 8° | 60 s | 24 | 0.7 |
| Mountain | 1.4° → 14° | 90 s | 40 | 1.0 |
| Moon | 2.2° → 22° | 120 s | 56 | 1.3 |

## Bar

| Control | Content |
|---|---|
| Chips | Boulder, Mountain, Moon |
| Slider | Sun |
| Actions | none: the hold is the toy |
| Settings | Letterbox · Grain · Quality (shared) |
| How | Hold: charge · Release: fire · Drag: look around · Space: charge |

## Tech

- **Gun.** Straight boxes, wedges and drums merged into one mesh. `aPart` holds the station, a barrel flag, a seed and a tone. Facets from `dFdx`/`dFdy`. The shader adds pour lines, plate seams, port rows, streaks and dust at the foot. Nothing on it emits light.
- **Elevation.** `aim(p, f)` applies the recoil and then turns barrel vertices about the trunnion by `uDrop`. `aimAt(d)` keeps `barrelPt` and the shadow map in step.
- **Sky.** `k2skyS(dir, sunK)`: zenith to horizon, a dust band, the sun's glow and disc. The haze samples it at the horizon without the disc. Uniforms `uSun, uSunC, uZenC, uHorC` come from `sun(deg)`.
- **Light.** One sun depth map, 2048 × 1024, four-tap PCF; it redraws only when the barrel or the sun moves. A sky hemisphere, the sun, a rim from behind, the rock's glow faintly.
- **Rock.** `IcosahedronGeometry(1, 5)` with merged vertices, displaced once per shape; three shapes baked at load. The hot face looks at the planet. Ember cracks from a 3D noise band.
- **Plume.** 48 instanced billboards fixed behind the rock, angled across the sky; fire that cools to smoke lit by the sun.
- **Arcs.** Six camera-facing ribbons of thirteen segments, rewritten each frame with two octaves of jitter; gap arcs, crown arcs, flank arcs and strikes down to the plain past the terraces.
- **Dust.** 400 alpha-blended billboards in a ring buffer, lit by sun and sky, swelling as they rise.
- **Shot.** State keyed to the sim clock; bolt as one screen-space ribbon with three brightness pulses; flares as billboards; Mach ring in the ground shader.
- **Shards.** One `InstancedMesh`, pose in closed form from birth time; no transparency sorting.
- **Post.** Multisampled half-float composer target, K2 bloom (threshold 1.2), K2 grade with letterbox, OutputPass.

## Sound

Wind bed with a whistle past the cheek walls, dipping under a charge. A hum of two saws and a sub that climbs with power and tremors with the chase. Arc clicks panned to their place on screen. A slug chirp left to right. The crack when the Mach ring reaches the eye. A rumble fifteen seconds after the hit, scheduled on the audio clock. Everything through `track()`; mute and a hidden tab stop it all.

## Finesse

- The first frame is a picture: the rock already burns over the muzzle; the plume streams.
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

## Kit handoff

The straight-block builder with flat facets, the `aim` turn about a pin, the sun depth map, the day sky `k2skyS`, and the dust ring buffer, marked. Any daylight diorama can copy them.
