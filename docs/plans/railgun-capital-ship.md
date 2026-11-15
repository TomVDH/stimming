# Railgun: capital ship target (`stimming-ugc4`) design

> Design spec. Tom approved it section by section, 2026-11-12. The implementation plan comes next, through superpowers:writing-plans.

**Goal:** A second Railgun target beside the asteroid: an enemy battleship in orbit. A full charge breaks it into five hulks. A tap wounds it. The hulks fall over minutes as re-entry streaks and crash far beyond the mesas.

**Architecture:** Procedural, in `railgun/index.html`. The hull is merged hard-surface geometry with the gun's flat-facet shader. It is pre-cut into five hulks at its armour joints. Each falling hulk takes one instance of the existing `vol`/`trail` pair. The ship sequence runs on the sim clock, as the rock's shot does. There is no asset load.

**Bean:** `stimming-ugc4` (epic). The build gets a feature bean and a worktree when Tom schedules it.

## Decisions

| Question | Ruling |
|---|---|
| Ship and rock | A Settings choice, *Target: Asteroid / Ship*. It persists. It takes effect at the next Reset. |
| Hits | Charge power ≥ 0.85 kills in one hit. A lower charge wounds. Any hit on a wounded ship kills it. |
| Look | An original battleship class: a long armoured warship. Not a copy of any game's ship. |
| Fall and crash | 60 to 120 s of fall. Impacts 40 to 80 km out, beyond the mesas. The near plain stays clean. |
| Sound | Silent in orbit. Sound starts with the hit. |
| Build | Procedural in code. No GLB. |
| Engines | Dark. Nothing on the ship glows until it is damaged. |

## 1. The ship in orbit

### Placement and scale

- The hull is about 11 km long, at about 150 km slant range. It subtends about 4°, near the moon rock's 5°.
- A real orbit is 200 km or more up and would make a 3 km hull a speck. The oversize hull is a deliberate cheat.
- It sits high on the right, where the rock sits now, above the cirrus. Clouds never cross it.
- It holds station with a slow drift of about 1° a minute along its orbit. It does not bob.
- The gun tracks it with the existing bearing and elevation tracking.

### Form (side view, prow to stern)

1. **Prow:** a split wedge. An upper and a lower jaw with a dark slot between them.
2. **Fore hull:** a deep block with stepped armour plates on the spine.
3. **Mid hull:** a deeper block with a second plate stack. A swept command tower stands aft of centre, with a dark bridge slit.
4. **Drive section:** the tallest block. Four dark engine bells on the stern face.
5. **Keel fin:** a ventral fin under the fore and mid hull.

Detail: vertical panel joints, four turret hardpoints with twin barrels (three dorsal, one ventral), and a faded rust-red paint band down the flank. The belly is darker than the flanks.

### Light

- Day and dusk: the sun rakes the top edges amber. The belly goes dark. The full air column hazes it.
- Night: the ship stays in sunlight above the planet's shadow. It reads as a pale lit sliver among the stars.
- Noon: it fades toward a faint ghost in the bright sky.

## 2. The hit and the breakup

### Flight

The bolt climbs more steeply than to the rock. The flight time stays at 6 to 9 s plus the 2.5 s tail. The aim point is the mid hull.

### Kill (charge power ≥ 0.85)

1. A hard white point flash. A vapour sphere fades in under 1 s.
2. Molten spray flies out in straight lines. No smoke and no shock shells: the hit is above the air.
3. The joints fail in a chain outward from the hit, over about 2 s. Each joint throws its plates off with a short internal flash.
4. Five hulks separate: prow, fore hull, mid hull, drive section, tower. They drift apart and tumble slowly.

### Wound (charge power < 0.85)

1. The hit takes the nearest joint and blows one plate off.
2. The crack smoulders dull red for about 20 s.
3. The hull bends about 4° at that joint. The ship sinks a few degrees down its orbit.
4. The next hit at any charge kills it.

### De-orbit (60 to 120 s per hulk)

1. The first 15 s: dark tumbling shapes in vacuum. Sparks vent from the cracks.
2. Entry: a plasma glow lights each hulk's leading face. A `vol`/`trail` smoke streak grows behind it.
3. Each hulk sheds a few burning pieces into the existing ejecta and ember systems.

### Impacts

- Each hulk lands 40 to 80 km out, beyond the mesas.
- Each impact gives a horizon flash, a rising dust dome and light on the cloud bases.
- The rumble lands 15 to 25 s after the flash. The true delay is minutes; the cheat matches the rock's.

### The next ship

When the last dust dome settles, a new ship rises over the horizon on its orbit for about 40 s, then holds station. Reset skips the wait. A Target change applies at this point.

## 3. Sound

1. In orbit: no new sound. Wind, charge and shot audio stay as they are.
2. Hit: a far, thin crack about 4 s after the flash, synthesised through `audioKit()`. Thinner than the rock's `impact.mp3`.
3. Breakup: a low muffled thud per joint failure, out of sync with its flash.
4. Re-entry: a long tearing groan as each hulk enters the air, then a roar that builds over about 20 s. The roars layer into one bed.
5. Impacts: the existing rumble, lower and longer. One per hulk, 15 to 25 s after its flash.
6. Existing rules hold (Q9): mute stops all sound, pending sounds drain, the context suspends after the last rumble.

## 4. Cost, quality and QA

1. **Frame budget:** hold 30 fps, shot 30 fps, as now.
2. **Streaks:** the five raymarched streaks are the cost risk. Rungs 0 and 1 draw five. Rungs 2 and 3 draw the three largest (mid hull, drive section, fore hull); the prow and tower get cheap card trails. Each streak takes the rung's existing step counts (`uSteps`, `uLSteps`).
3. **Mesh:** one merged mesh per hulk on the gun's flat-facet shader. Five draw calls intact, about 25 with shed pieces.
4. **Sleep:** the toy sleeps 60 s after the last input unless `busy()` is true. The ship adds one `busy()` term: true while a hulk falls, a crack smoulders, a dust dome rises or a rumble is pending. Sleep resumes after the last rumble.
5. **Reduced motion:** hulks fall without tumble. Flashes halve. Shed pieces do not spin.
6. **QA hooks:** new `__qa.target('ship'|'rock')` and `__qa.ship` (state, wounds, hulks left). Existing `__qa.charge`, `__qa.shoot` and `__qa.jump` drive the sequence.
7. **QA runs:** Q1 to Q10 at 1280 × 800, 375 × 812 and 812 × 375 on rungs 1 to 3. `tests/bar-v2.html` stays at 98/98. Tom checks fps, sound and the look on a real device.

## Out of scope

- The ship firing back, or any fail state.
- Both targets in the sky at once, and aiming between them.
- Engine glow, running lights and windows.
- Craters or wreckage on the near plain.
