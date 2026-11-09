---
# stimming-4wu3
title: 'Toy: Marsh launch'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-09T07:30:16Z
updated_at: 2026-11-09T08:01:06Z
---

Marsh launch (`launch`, shortlist 55, rank 17). Dawn over a reed marsh; tap to launch a rocket from the far shore. Light now, roar later; the roar lifts the birds; the high plume catches the sun first.

Plan: `docs/plans/launch.md`. three.js 0.170 on K2 and K6 lifted from `fireworks/index.html`. Controls on Bar v2.

## Checklist

- [x] Task 1: the marsh at dawn: K2 and K6 lifted and marked; sky, mist, reeds, channels, far shore; dawn(δ), shadowH(δ)
- [x] Task 1: Bar v2 spec, toys.json entry, low-fi Lab menu icon (pointer x sets the pad; the plume turns gold up high)
- [x] Task 1: stills at three Dawn values, 1280 and 375 px; checkpoint with Tom (blockout): signed off 2026-11-09
- [x] Task 2: the launch: flame, steam, trajectory, plume with shadow-line light, reed rim, channel streaks, boosters
- [ ] Task 2: checkpoint with Tom (twilight bell)
- [ ] Task 3: sound front and birds
- [ ] Task 4: sound with delays; Q9 and the mute test
- [ ] Task 5: bar polish, Settings persistence, menu hook; Q1 to Q10
- [ ] Tom sets the Dutch name (proposal: Moeraslancering)
- [ ] Record the session cost

## Blockout notes (2026-11-09)

- Eye on a 4 m dike; pool at 18 to 58 m; channels at 125, 300 and 720 m; flats and a lagoon to the far shore.
- Near reeds: 9,000 instanced stalks (12,000 on High, 5,000 on rung 3) with nodding plumes and two leaves; far beds are feathered ribbons along the banks.
- The sun sits 22 degrees left of the view; the climb will bend right, into the dark sky.
- Launch is aria-disabled until Task 2. The sound button is hidden until Task 4.
- K2 sky becomes a dawn sky in this copy; K2 grade gains a letterbox (uBox). K6 drops the cloud veil.

## Launch notes (2026-11-09)

- launch(kind, padX) returns a paused GSAP timeline; the tick sets its time from the sim clock.
- Real altitude: 0.06 t² km (Small 1.25x, Heavy 0.9x). World height: D · 0.121 · ln(1 + h / 3 km).
- Plume: 3,200 puffs in a ring, written once at birth. Above the shadow line (±2 km soft edge) they take sunlight: gold core, blue spread edges.
- High up each step emits a shell of puffs at one speed: the bell, with rings behind it.
- Tap or Space in flight toggles the follow view; tall stages follow from the start. Launch is aria-disabled until T+80.

## Volumetric pass (2026-11-09, Tom: the bell read as a failed rocket)

- Each puff is now a raymarched sphere: 9 steps of 3D billow noise, Beer-Lambert, a self-shadow toward the sun and the flame.
- No burst: the trail is one continuous column that widens into a glowing fan up high, and sweeps right across the sky (downrange 0.95 D).
- Liftoff ground clouds: forty large billows roll sideways off the pad, lit orange from below.
