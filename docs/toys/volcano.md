# Volcano (`volcano/`)

| | |
|---|---|
| Dutch | Vulkaan /vʏlˈkaːn/ (draft) |
| Motto | The mountain has something to get off its chest. |
| Shelf | Lab, tag "Stimming Lab" |
| Stage | None |
| Series | None |
| Accent | `oklch(0.72 0.17 45)` |
| Sound | Yes |
| Legacy build | No |
| Signed off | No |

## Idea

Idea 365, group C: a volcano erupts. Bean `stimming-4wnw`. Plan: [volcano.md](../plans/volcano.md). Tom sized the full toy XXXXXL; this is the MVP cut: one shot, one eruption. Stage 2 (2026-11-23) moved it to a Java range seen from a village.

## Rules

- One fixed shot, one eruption kind, scaled by the hold. No modes.
- The sim is in metres and seconds. Sound travels at 343 m/s; nothing heard comes before its light.
- The loop runs at full rate only while something flies, rolls hot, flashes or builds. The cloud drifts at 30 fps until the toy sleeps.

## Direction

- 3D, three.js 0.170, at true scale. Blue hour, from a village 8.5 km out, facing the afterglow in the west.
- A Java range: a 2.2 km active cone, a twin cone with a cap cloud, a caldera wall, far cones in the haze.
- Raymarched clouds: a broken collar round the summit and a broken deck overhead, for scale.
- One key light: the vent. The flash, the fountain, the bolts and the hot bombs light the clouds, the column, the cone and the village.
- A Vulcanian blast that opens into a short fountain: bombs on trails, an ash column, lightning, a pressure ring.
- The ash column is a GPU fluid with Fire's smoke and flame shading.
- Wide stage: the vent sits right of centre. Tall stage: the lens widens.

## Controls

Bar v3, from the `bar` spec in `initPage()`.

| Slot | Holds |
|---|---|
| Actions | Erupt (Space, hold): builds pressure; the release erupts |
| Slider | Wind: how far the column leans and the cloud drifts; stored as `stimming.volcano.wind` |
| Settings | Quality (shared), Reset (clears the eruption, wind back to its default) |

| Input | Does |
|---|---|
| Hold on the stage | Builds pressure: tremor, glow, steam |
| Release | Erupts; a longer hold (up to 2.5 s) makes a bigger blast |
| Click | A small burst |
| Space (hold) | The same as a hold |

## Sound

Web Audio on the shared kit, muted by default. The tremor plays at once. The boom (with two echoes), the roar and crackle, the thunder and the bomb landings play late by distance, scheduled on the audio clock. Mute and a hidden tab stop every pending sound; the context sleeps after the last one.

## Files

| File | Holds |
|---|---|
| `index.html` | Page skeleton |
| `main.js` | Bar, camera, frame loop, gestures, drawing upload |
| `terrain.js` | The height function and its noise |
| `erupt.js` | The sim |
| `scene.js` | three.js objects and shaders: sky, range, halo, streaks |
| `clouds.js` | The raymarched cloud pass and its depth composite; it also marches the plume |
| `plume.js` | The ash column: a 3D GPU fluid (K3 from Jet hover), Fire's smoke and flame |
| `village.js` | The village houses, one instanced mesh |
| `sound.js` | Web Audio |

## QA

Captures: `docs/qa/volcano/`. Headless Chromium with `--use-angle=gl` on the dev PC (RTX 3070): 60 fps through a full eruption at 1280 x 800, stage 2 included. Idle: no frames 62 s after the last input; none when hidden; none at rest under reduced motion. The audio context runs after a gesture and suspends at the end.

## Open

- Tom's look at the blockout and the hero moment.
- The icon round `volcano-1` has no pick yet; A is on the menu.
- Later stages are in the plan; none is built.
