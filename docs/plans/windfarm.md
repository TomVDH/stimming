# Wind farm (`windfarm`) implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. One fresh session builds this toy, task by task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Rows of offshore turbines fade into sea fog. The wind slider brings them to life, and at the right wind each turbine sheds a spiral of fog behind it.

**Architecture:** three.js 0.170 on the K2 scene from Fireworks. Turbines are instanced, with per-turbine rotor angles updated on the CPU. Fog wakes are instanced helical ribbons. One wind model drives rotors, sea, fog, wakes and sound.

**Tech stack:** three.js 0.170 (EffectComposer, UnrealBloomPass, ShaderPass, OutputPass), simplex-noise, Tone.js through `kit.tone()`.

**Spec:** shortlist 59 in [toy-ideas.md](../toy-ideas.md); rank 11 in [toy-plan.md](../toy-plan.md); batch rules in [README.md](README.md).

| | |
|---|---|
| Size, estimate | M · $20 to $30 |
| Kits | Uses K2 from `fireworks/index.html` |
| Before the build | D1, settled by the Fireworks build |

## The shot

A low camera just above a grey-green sea. Five rows of white turbines run away from you in a loose grid of 60.
The nearest stand tall and sharp; the far ones dissolve into fog, one value step at a time.
A sun low behind the fog makes one bright patch in the haze. Nothing else.

## Hero moments

1. **Fog wakes.** At Dawn, in moderate wind, each turbine trails a spiral of condensed fog downwind. A famous real photo shows this; here it moves.
2. **The gust front.** Tap: a dark ripple of wind races across the water. Rotors speed up row by row as it passes them.
3. **Cut-out.** Push the wind past 25 m/s and the turbines feather and stop, one after another. Real turbines shut down in storms, so the farm goes still while the sea goes wild.
4. **Night lights.** At Night, red aviation lights blink across the whole farm in sync, softened by fog.

## Loop

- The Wind slider runs from 0 to 30 m/s.
  - Below 3 m/s (cut-in), rotors idle.
  - Up to 12 m/s (rated), speed rises.
  - Above 25 m/s (cut-out), they feather and stop.
- Fog thins as wind rises; the sea builds whitecaps.
- Tap: a gust front from that side of the frame.
- Drag: look along the rows, with a small pan and tilt.

## Bar

| Control | Content |
|---|---|
| Chips | Dawn, Day, Dusk, Night |
| Slider | Wind |
| Action | Gust |
| Settings | Fog: Light, Thick · Letterbox: Off, On · Quality: Standard, High (shared) |
| How | Click/Tap: a gust · Drag: look along the rows · Space: gust (mouse devices only) |

## Tech

**Wind model (CPU).**

- Base speed `W` from the slider, plus slow gust noise.
- A gust front is a line moving at 12 m/s across the farm. Each turbine sees `W + bump(distance to front)`.
- **Rotor speed** per turbine eases toward the power curve: 0 below cut-in, linear to rated, flat to cut-out, then 0. Spin-up uses inertia τ 4 s; braking uses τ 2 s.
- **Wake deficit:** a turbine directly downwind of another gets 8 % less wind.
- The rotor angle per turbine goes into an `InstancedBufferAttribute`, rewritten each frame: 60 floats.

**Turbines.** Three instanced meshes: tower (tapered cylinder), nacelle (box) and rotor (three blades merged). The rotor's vertex shader turns the blades by the instance angle. Blades are slightly swept, and their tips are dark red (0.5 0.15 25).
White paint takes the sun as a soft rim through the fog.

**Sea.** Gerstner waves whose amplitude and steepness follow wind. Whitecaps show where the crest is steep, plus noise, and only above 8 m/s.
A gust front darkens the water as it passes: a cat's paw.

**Fog.**

- K2 `haze()`, plus fog banks: 2D noise in the haze function, drifting with the wind.
- Density scales with `fog * (1 − smoothstep(4, 18, W))`.
- The sun patch is a soft forward-scatter term toward the sun direction.

**Fog wakes.** One helical ribbon per turbine, instanced, 40 segments. The helix follows the rotor speed.
Opacity is `fog * smoothstep(5, 8, W) * (1 − smoothstep(12, 16, W)) * dawnBoost`. Alpha comes from fbm, so the ribbon breaks up downwind.

**Aviation lights.** One emissive point per nacelle at Night and Dusk. All flash on a shared 1 s on, 1 s off cycle with soft edges. Bloom carries them.

**Palettes.** Sky, sea, fog and sun colours per chip, eased over 2 s on change, as Night viaduct's `applyTime()` mixes them.

## Sound

- **Wind bed:** noise through a bandpass that rises with `W`. Its level follows `W`.
- **Blade swish:** the near turbine's amplitude modulation, at three times its rotor rate. This is the real "whoom" of passing blades.
- **Sea wash:** level and brightness follow wave height.
- **Gust:** a rising whoosh that pans across with the front.
- **Cut-out:** a low mechanical hum winds down as the near rotor brakes.

## Finesse

- Each step back in depth takes one more step of fog, so the far rows dissolve evenly.
- No two rotors share a phase. Speeds drift a few percent apart.
- Feathered blades turn edge-on, and the rotor stops at a slightly different angle on each turbine.
- At Night, the sync blink is exact: a real farm's lights flash together.
- The gust front reads on the water first, then in the rotors, then in the sound.

## Reduced motion and idle

- **Reduced motion:** rotors turn at 30 % speed, there is no camera breathing, the gust is a soft brightening with no ripple, and the wakes hold still.
- **Idle:** this toy drifts. It runs at 30 fps when drifting and sleeps 60 s after the last input. Rotors ease to a stop as the scene sleeps.

## Review focus

1. **Wind at exactly 25 m/s:** no flicker between running and feathered. Use hysteresis: stop at 25, restart below 22.
2. **375 px portrait:** fewer columns show, so the camera moves back and lower, and the near tower still crosses the frame.
3. **Many gusts in a row:** fronts overlap by summing, and the per-turbine wind clamps at 30 m/s.
4. **A chip change at Night with lights blinking:** the lights fade out with the palette, never pop.
5. **A slow GPU:** wakes drop first (ribbons halve), then bloom, then the pixel ratio.

## Tasks

### Task 1: Turbines in fog

**Files:** Create `windfarm/index.html` and the bean.

**Produces:** marked `K2` from Fireworks; `farm` (InstancedMesh trio); `aAngle`; `palette(name)`.

- [ ] Lift K2. Build the turbine grid, sea and fog. Rotors stand still.
- [ ] Q1, Q2 and stills of the four chips at 1280 and 375 px. Checkpoint with Tom.
- [ ] Commit: `Wind farm: turbines receding into sea fog`.

### Task 2: Wind

**Produces:** `wind.at(i)`, `gust(side)`, `powerCurve(w)`.

- [ ] Rotor speeds, power curve, feathering with hysteresis, wake deficit, gust fronts, whitecaps.
- [ ] Screenshots at 2, 10 and 27 m/s.
- [ ] Commit: `Wind farm: power curve, gust fronts, storm cut-out`.

### Task 3: Fog wakes and night lights

- [ ] Wake ribbons, the dawn boost, synced aviation lights.
- [ ] A screenshot at Dawn at 9 m/s, the wake shot. Checkpoint with Tom.
- [ ] Commit: `Wind farm: fog wakes and synced night lights`.

### Task 4: Sound

- [ ] Every voice in Sound. Q9.
- [ ] Commit: `Wind farm: wind bed, blade swish, sea`.

### Task 5: Bar, menu and QA

- [ ] Bar, Settings and persistence. `toys.json`, and the menu Lab entry with its hook.
- [ ] Q1 to Q10. Tick the bean and record the cost. Commit.

## Kit handoff

None new. The power curve and gust-front model are small and marked, in case Wheat storm (21) comes up.
