# Railgun (`railgun`) implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. One session builds this toy, task by task, in its feature worktree. Steps use checkbox (`- [ ]`) syntax.

**Goal:** One colossal planetside railgun fills the foreground. Beyond its muzzle a burning asteroid hangs in the dusk sky and slowly closes in. Hold to charge, release to fire. The slug races down the rails, the bolt crosses the sky, the asteroid shatters, a fresh one approaches.

**Architecture:** three.js 0.170 on the K2 night scene and K6 burst particles lifted from `launch/index.html`. The gun is one merged mesh of chipped boxes with flat facets from screen derivatives. A paused GSAP timeline on the sim clock runs each shot. The composer renders into a multisampled half-float target, then bloom, grade and output.

**Tech stack:** three.js 0.170 (EffectComposer, RenderPass, UnrealBloomPass, ShaderPass, OutputPass, BufferGeometryUtils), GSAP 3.13, simplex-noise, raw Web Audio through `audioKit()`.

**Spec:** Tom, 2026-11-09, in chat. Decisions: hold to charge and release to fire; a single massive gun, not a ring; a sweeping cadrage on the gun from a low eye beside the breech; no fail state yet (the rock holds at its largest size).

| | |
|---|---|
| Size, estimate | M to L |
| Kits | Uses K2 and K6 from `launch/index.html` |
| Bean | `stimming-f793`, worktree `.worktrees/stimming-f793` |

## The shot

One unit is one metre. The breech sits at the origin. The barrel climbs at 24° toward negative z, 1,400 m long: two rails 22 m wide and 34 m tall with a 28 m gap, a breech block, and five trilithon cradles that grow with the barrel.
A flat dark plateau under a dusk sky; the dusk glow sits ahead and to the right, under the rock.
The eye stands 64 m up, 150 m right of the axis and 250 m behind the breech, looking 14° left of the barrel. The breech fills the lower left; the cradles march up to the right; the muzzle points at the rock.
The rock hangs 5 km out along the axis. Its plume streams up and to the right across the sky.

## Hero moments

1. **The looming.** First frame: the barrel climbs toward a rock that is already too big, its plume streaming across the sky. The rails warm in its light as it grows.
2. **The draw.** Under the hold the sky dims and the stars hold. Capacitor cells fill from breech to muzzle; arcs crack across the gap; a blue chase races the rails faster and faster until it is one steady line.
3. **The slug.** On release a white armature crosses 1.4 km in 0.3 s and leaves the rails incandescent. They cool white, orange, dark over four seconds.
4. **Light now, sound later.** The muzzle flash is silent. The Mach ring rolls down the barrel; the crack lands when it reaches the eye. The rock breaks in silence; its rumble arrives 3.6 s later.
5. **The shatter.** A flash, then forty shards tumble outward with hot fresh faces that cool, and a burst of embers drifts down the sky.

## Loop

| Time | Event |
|---|---|
| press | Charge starts. Seams light on frame one. `c = 0.12 + 0.88·(1 − e^(−held/1.6))` |
| hold | Chase period 2.0 → 0.08 s along the rails; a steady line above c 0.8. Cells fill to c. Arcs from c 0.25, up to 18 a second, six alive. Dust round the breech. The sky dims 55 %. |
| release | `fire(c)`. Muzzle flash, chase stops, shake, recoil kick |
| 0 → 0.3 s | The slug runs the rails; they heat behind it and cool with τ 1.5 s |
| 0.3 s | Muzzle ring, the bolt leaves along the axis |
| eye / 343 | The Mach ring reaches the eye: a jolt, and the shot's sound |
| T = 1.9 → 1.2 s | Hit: shards, K6 burst, flash, the sky warms |
| T + 3.6 s | Rumble |
| T + 10 s | Shards gone; a fresh rock at s = 0 |

A press during a live shot starts a new charge. Changing Asteroid mid-approach retunes the size and keeps the progress.

| Asteroid | Diameter | Approach | Shards | Rumble |
|---|---|---|---|---|
| Boulder | 0.8° → 8° | 60 s | 24 | 0.7 |
| Mountain | 1.4° → 14° | 90 s | 40 | 1.0 |
| Moon | 2.2° → 22° | 120 s | 56 | 1.3 |

## Bar

| Control | Content |
|---|---|
| Chips | Boulder, Mountain, Moon |
| Slider | Dusk |
| Actions | none: the hold is the toy |
| Settings | Letterbox · Dolly · Grain · Quality (shared) |
| How | Hold: charge · Release: fire · Drag: look around · Space: charge |

## Tech

- **Gun.** Chipped `BoxGeometry` pieces merged into one mesh. Offsets come from position-only noise, so shared corners stay joined. Facets from `dFdx`/`dFdy`. Per-vertex `aPart`: station, rail flag, inner-face flag, seed.
- **Light.** No shadow maps. A hemisphere fill, the dusk glow on faces that look at it, the rock's amber key, a rim from behind, and the charge's blue point light riding the chase.
- **Rock.** `IcosahedronGeometry(1, 5)` displaced once per shape; three shapes baked at load. The hot face looks at the planet. Ember cracks from a 3D noise band.
- **Plume.** 48 instanced billboards fixed behind the rock, angled across the sky so they read as a tail.
- **Shot.** A paused detached GSAP timeline driven from the sim clock. Slug and bolt share one screen-space ribbon.
- **Shards.** One `InstancedMesh`, pose in closed form from birth time; no transparency sorting.
- **Post.** Multisampled half-float composer target, K2 bloom (threshold 1.2), K2 grade with letterbox, OutputPass.

## Sound

Wind bed; a charge hum that rises with the chase; arc clicks panned to their station; a slug chirp; the shot's crack at the Mach delay; a far rumble at T + 3.6 s. Follow the Delayed sound rules.

## Finesse

- The first frame is a picture: the rock already burns over the muzzle; the beacons blink.
- Seams light on the first frame of a press.
- Rails cool after each shot; an early second shot finds them warm.
- The Mach ring shows on the ground before the crack lands.
- Shards shrink away; the last embers fall below the muzzle before the new rock shows.

## Reduced motion and idle

- Reduced: no dolly, no wobble, no arcs (steady seams), softer flashes, shards drift without spin.
- Idle: the dolly drifts at 30 fps; the loop sleeps 60 s after the last input; hidden stops the loop and cancels pending sounds.

## Review focus

1. A tap fires a dim slug that still hits; no NaN in the shard pose.
2. Hidden tab mid-shot: the pending crack and rumble cancel, then reschedule on return.
3. Mute mid-charge: the hum stops at once; the rock still shatters.
4. 375 × 812 and 812 × 375: barrel and rock both stay in frame.
5. Dolly and a drag look add, never fight.

## Tasks

### Task 1: The gun at dusk

- [x] Skeleton and kits from launch; gun, cradles, ground, sky, rock, plume, scale lights; camera with dolly; post chain; loop; pointer.
- [x] Bar spec, `toys.json`, this plan.
- [ ] Menu tile and hook. Stills at 1280 × 800, 375 × 812, 812 × 375. Checkpoint with Tom: the cadrage.
- [ ] Commit: `Railgun: the gun at dusk`.

### Task 2: Approach and charge

- [ ] Approach curve and hold; charge state, chase, cells, arcs, dust, sky dim, push-in and shake; `__qa.charge(c)`, `__qa.jump(t)`.
- [ ] Stills at c 0.3, 0.7, 1.0. Checkpoint: the draw. Commit: `Railgun: the draw`.

### Task 3: Shot and shatter

- [ ] Shot timeline, slug, rail heat, muzzle ring, bolt, Mach ring, recoil, hit, shards, burst, flash, respawn; `__qa.fire()`.
- [ ] Stills through the shot. Checkpoint: the slug. Commit: `Railgun: one slug, one asteroid`.

### Task 4: Sound

- [ ] Wind, hum, clicks, slug, shot at the Mach delay, rumble. Q9. Commit: `Railgun: a crack, then a far rumble`.

### Task 5: Settings, QA, PR

- [ ] Persistence, reduced motion, Q1 to Q10 at three sizes, fps in the bean, `tests/bar-v2.html`. Push the branch, open the PR.

## Kit handoff

The chipped-box gun builder and the flat-facet rock shader, marked. Any megalithic or industrial diorama can copy them.
