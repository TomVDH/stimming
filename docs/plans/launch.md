# Marsh launch (`launch`) implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. One fresh session builds this toy, task by task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Dawn over a reed marsh. Tap to launch a rocket from the far shore. Its light crosses the marsh at once; its roar arrives seconds later and lifts the birds from the reeds. High up, its plume catches the sun before the ground does.

**Architecture:** three.js 0.170 on the K2 scene from Fireworks, with K6 for sparks. A GSAP timeline on the sim clock runs each launch. Plume particles are lit by the flame and, above the Earth's shadow line, by the sun. Reeds are instanced blades.

**Tech stack:** three.js 0.170 (InstancedMesh, EffectComposer, UnrealBloomPass, ShaderPass, OutputPass), GSAP 3.13, simplex-noise, Tone.js through `kit.tone()`.

**Spec:** shortlist 55 in [toy-ideas.md](../toy-ideas.md); rank 17 in [toy-plan.md](../toy-plan.md); batch rules in [README.md](README.md).

| | |
|---|---|
| Size, estimate | M to L · $25 to $50 |
| Kits | Uses K2 and K6 from `fireworks/index.html` |
| Before the build | D1, and Fireworks built first |

## The shot

A flat marsh under a pre-dawn sky: deep blue above, a band of rose and amber at the horizon.
Reed beds in dark silhouette fill the foreground and sway; still channels between them hold the sky.
Low mist lies over the far flats. There is no tower and no pad: the Look rule cuts both. The far shore is one dark line.

## Hero moments

1. **The twilight plume.** Around T+25 s, the plume climbs into sunlight while the marsh is still in shadow. It blooms into a glowing, translucent bell of gold and blue against the dark sky. Real launches at dawn do this.
2. **Light now, sound later.** The ignition flash reaches you in silence. The roar arrives 3.5 to 10 s later, with its crackle.
3. **The birds lift.** When the sound wave arrives, a flock bursts from the reeds and wheels away. Cause, then effect, across the whole marsh.
4. **Flame light on the reeds.** As it climbs, the flame rims every reed head with orange, and the channels mirror a moving streak.
5. **Separation.** On Heavy, two boosters fall away as two small sparks with their own short plumes.

## Loop

- Tap or Launch: ignition on the far shore below the tap's x.
- A tap during a launch toggles the view: it eases up to follow the rocket, or back down to the marsh.
- One launch runs about 45 s, compressed four times from real time:

| Time | Event |
|---|---|
| T−3 s | Ignition flash. Steam billows sideways at the base. |
| T0 | Liftoff: slow for the first second, then faster. |
| T+8 s | Pitch-over: the gravity turn bends the path to the right. |
| T+18 s | Heavy only: booster separation. |
| T+25 s | The plume enters sunlight: the twilight bell. |
| T+40 s | The engine is a moving star. |
| T+60 s | The plume shears in the upper wind and fades. |

- Dawn moves the sun's depression from 9° to 1° below the horizon. That moves the shadow line, and with it the twilight effect.

## Bar

| Control | Content |
|---|---|
| Chips | Small, Medium, Heavy |
| Slider | Dawn |
| Action | Launch |
| Settings | Distance: Near, Mid, Far · Letterbox: Off, On · Quality: Low, High |
| How | Click/Tap: launch · Drag: look around · Space: launch (mouse devices only) |

| Distance | Range | Sound delay |
|---|---|---|
| Near | 1.2 km | 3.5 s |
| Mid (default) | 2 km | 5.8 s |
| Far | 3.4 km | 9.9 s |

## Tech

**Earth's shadow line.** With the sun δ below the horizon, air above `h = R (1 / cos δ − 1)` is sunlit (R = 6371 km). At δ = 6°, h is about 35 km.
The scene maps real altitude to world height on a log scale, so 0 to 120 km fits the frame. Plume particles above h take sunlight.

**Plume.**

- Billboards emitted along the path history, up to 3,000 on High and 1,200 on Low.
- Each has a birth time, a position, an expansion rate that grows with altitude (thin air), and a shear from a wind that turns with height.
- **Lighting:** flame light near the engine (`uFlame`, as Night viaduct's `uArc`). Above the shadow line, sunlight: a gold core (0.85 0.12 75) with blue scattered edges (0.75 0.08 240). Below it, the dawn sky's ambient.
- **Ground steam:** 60 large billboards that billow sideways from the base in the first 8 s.

**Rocket.** A bright flame billboard with flicker, and a white core with bloom. K6 sparks shed from the base for the first 4 s. Boosters on Heavy are two K6-style sparks with short trails.

**Reeds.** Instanced thin blades, 12,000 on High and 5,000 on Low, in clumps. The vertex shader sways them with simplex waves.
Shading: dawn-sky ambient, plus a rim from `uFlame` on the side that faces it, plus a soft back-light from the horizon glow.

**Water channels.** Planes with K2 streak reflections: the sky gradient, the flame streak and a dim plume reflection.

**Birds.** 60 birds as small dark wing flecks with a two-frame flap. A light flocking rule: separation, alignment, and a pull toward a far point. They launch from the reeds when the sound front arrives.

**Sound front.** A ring expanding at 343 m/s from the pad, in compressed scene units. Its arrival at the camera triggers the roar. Its arrival at each reed bed lifts that bed's birds, so birds farther out lift first.

**Timeline.** `launch(kind)` returns a GSAP timeline on the sim clock, as in Coast and meteor. Paused timelines keep GSAP's ticker idle.

## Sound

- **Before:** a quiet marsh: reed rustle (high-passed noise following the sway) and an occasional bird chirp (a short FM chirp every 6 to 12 s).
- **The roar, after the delay:**
  1. It swells over 2 s: a broad noise band with a sub under 40 Hz.
  2. Crackle: random impulsive clicks, the signature of rocket noise.
  3. A low-pass falls from 4 kHz to 600 Hz over 30 s as the rocket climbs away.
- **Birds:** a wing flutter (amplitude-modulated noise) when they lift. Then the chirps stop for 10 s, as real birds go quiet.
- **Booster separation:** a faint double thud, after the delay.
- Follow the Delayed sound rules.

## Finesse

- The first second of liftoff is slow. Real rockets hang before they climb.
- The steam billows sideways before it rises.
- The twilight bell shows only when the sun is low: at Dawn 1° the whole sky is bright and the effect is weaker; at 6° to 9° it is strongest.
- The plume shears into a zigzag in the upper wind.
- Mist lights orange on the flame side while the launch is low.

## Reduced motion and idle

- **Reduced motion:** reeds still, a softer flash, the plume grows without shear, and birds fade up and away instead of flocking.
- **Idle:** reeds drift. It runs at 30 fps when drifting and sleeps 60 s after the last input. A launch in flight keeps it lively.

## Review focus

1. **Tap during a launch:** it toggles the follow view and never starts a second launch. The Launch button carries `aria-disabled` until the plume fades.
2. **Hidden tab mid-launch:** the timeline pauses and the pending roar cancels. On return the roar is rescheduled from the timeline.
3. **Dawn moved mid-launch:** the shadow line moves live, so the plume's lit part changes. That is fine, but it must not flicker.
4. **375 px portrait:** the camera tilts up, so the full climb to T+40 s stays in frame.
5. **Mute during the delay:** the roar never plays, and the birds still lift.

## Tasks

### Task 1: The marsh at dawn

**Files:** Create `launch/index.html` and the bean.

**Produces:** marked `K2` and `K6` from Fireworks; `reeds` (InstancedMesh); `dawn(δ)`, which sets sky, sun and shadow line; `shadowH(δ)`.

- [ ] Lift K2 and K6. Build sky, mist, reeds, channels and the far shore line.
- [ ] Q1, Q2 and stills at three Dawn values, at 1280 and 375 px. Checkpoint with Tom.
- [ ] Commit: `Marsh launch: the reed marsh before dawn`.

### Task 2: The launch

**Produces:** `launch(kind)` returns a timeline; `uFlame`; `plume`.

- [ ] Flame, steam, trajectory, plume particles with the shadow-line lighting, reed rim light, channel streaks and boosters.
- [ ] Screenshots at T0, T+8 s and T+25 s. Checkpoint with Tom: the twilight bell.
- [ ] Commit: `Marsh launch: liftoff and the twilight plume`.

### Task 3: Sound front and birds

- [ ] The sound front ring, the birds, and the quiet after.
- [ ] Commit: `Marsh launch: the sound front lifts the birds`.

### Task 4: Sound

- [ ] Marsh bed, roar, crackle, wings and the booster thud, with delays. Q9, and the mute test from Review focus 5.
- [ ] Commit: `Marsh launch: a roar that arrives late`.

### Task 5: Bar, menu and QA

- [ ] Bar, Settings and persistence. `toys.json`, and the menu Lab entry with its hook.
- [ ] Q1 to Q10. Tick the bean and record the cost. Commit.

## Kit handoff

`shadowH(δ)` and the sunlit-plume shading, marked. Any dawn or dusk toy with high smoke can copy them.
