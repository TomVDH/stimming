# Lantern lake (`lanterns`) implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. One fresh session builds this toy, task by task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** A still lake at dusk. Tap to set paper lanterns free; they rise, drift on the wind and burn in the water below them. A Festival sends up a river of light.

**Architecture:** One raw WebGL2 scene on `shared/environment.js`. The toy gives `envScene(uv)`: a far shore, the lake and the lanterns. The runner gives the sky, the water, the haze, bloom, grade and output. The lanterns live on the CPU and go to the GPU as one small data texture each frame.

**Tech stack:** raw WebGL2 on `shared/environment.js` and `shared/gl.js`; `shared/sky.js` (`skyAt`), `shared/water.js`, `shared/glow.js`, `shared/detail.js`; simplex-noise for the wind; Tone.js through `kit.tone()`. No three.js.

**Spec:** idea 60 in [toy-ideas.md](../toy-ideas.md) (Tom's pick, 2026-11-16); batch rules in [README.md](README.md); Bar v2 in [bar-v2.md](bar-v2.md). Bean `stimming-h35c`.

| | |
|---|---|
| Size, estimate | M · $20 to $35 |
| Kits | `shared/environment.js` for the frame, the sky, the water and bloom |
| Before the build | D1 to D3 below |

## Decisions for Tom

| | Question | Default in the plan |
|---|---|---|
| D1 | Floating lanterns too? A tap on the water sets a small lantern on it, which drifts and sways. | Yes. Sky lanterns stay the hero. |
| D2 | What is on the far shore? | A low line of hills and pines in silhouette, with a few warm windows. No people. |
| D3 | Series? | `vistas`. |

## The shot

A wide, low view over a still lake, a little above the water. The far shore is a dark line at two fifths of the height.
The sky runs from a deep blue zenith to a last band of rose and amber over the hills. A thin mist lies on the water.
The lake holds the sky like a mirror, broken only by slow ripples. Nothing moves until you touch it.

## Hero moments

1. **The first lantern.** Tap the sky: a lantern lifts off the near shore under that point. Its flame catches with a small flare, the paper glows warm, and it climbs slowly, swaying.
2. **The mirror.** Each lantern burns twice: once in the sky and once in the lake, as a long soft streak that breaks with the ripples.
3. **Festival.** Press Festival: 80 lanterns go up along the shore over 6 s. The wind gathers them into a slow river of light that runs into the far haze.
4. **Burn out.** High up and far away, each lantern dims to an ember and goes out. The sky empties in its own time.

## Loop

- Tap above the shore line: a sky lantern lifts from the near shore under that point.
- Tap the water (D1): a floating lantern sets down there and drifts.
- Hold: one lantern each 0.25 s from under the pointer.
- The Wind slider sets the drift: calm (they rise nearly straight) to breezy (they lean and run sideways).
- Drag: a small pan and tilt, so the eye can follow the river.

## Bar

| Slot | Content |
|---|---|
| Choice (segments) | Dusk, Blue hour, Night |
| Actions | Festival, Clear |
| Slider | Wind |
| Key strip | `[CLICK] release` · `[HOLD] many` · `[DRAG] look` · `[SPACE] festival` |
| Settings | Mist: Off, Light, Thick · Letterbox: Off, On · Quality (shared) |
| Dev (`?dev`) | Paper hue, flicker, rise speed, burn time, lantern cap |

## Tech

**Scene (`envScene`).** One ray per pixel from a fixed eye 3 m above the water.

- Above the shore line: `skSky` with `skyAt(hour)`, stars at Night, then the haze.
- The far shore: a 1D height profile (two octaves of noise) at 1.5 km, a dark fill with a faint rim of sky light. A few warm windows are small orbs on it.
- Below: `wtWaves` at the hit point, `wtNormal`, `wtFresnel`, and the reflected ray into the same sky and shore. Swell 0.006, chop 0.08: a calm lake.
- Mist: `skHaze` with a low height (8 m), so the far water and the shore base fade first.

**Lanterns (CPU).** A pool of at most 160 (the cap follows the detail level: 64, 120, 160).

- State: position (m), velocity, age, heat, phase.
- Lift: heat makes buoyancy; the lantern speeds up to about 1.2 m/s, then holds. Heat falls slowly; with low heat it rises slower.
- Wind: the slider speed plus simplex-noise gusts, stronger with height. The lean follows the wind against the lift.
- Sway: a small pendulum on the lean, with a damped spring.
- Burn out: after 60 to 100 s, the flame dims over 6 s to an ember, then the lantern goes from the pool.
- Floating lanterns (D1): on the water plane, pushed by the wind at 5 %, bobbing on `swellHeight()`.

**Lanterns (GPU).** Each frame, the pool goes into one RGBA32F data texture, two texels per lantern: position and size, then heat, lean and phase.

- In `envScene`, a loop over the pool with an early exit by screen distance. A near lantern is a soft rounded box of paper: a bright flame spot near its base, warm paper above it, darker at the top rim. A far lantern is a `gwOrb`.
- The colour is a warm paper, about 2000 K, with a 3 to 6 Hz flicker of a few percent.
- The reflection: the same loop at the mirrored position. Each lantern is a vertical streak whose length grows with the water's roughness (`sig2`), broken by the ripple normal.
- Bloom from the runner's `bloomChain` carries the glow. The mist scatters a halo round each lantern.

**Palettes.** The choice sets the hour: Dusk 19.8, Blue hour 20.6, Night 22.5, eased over 2 s.

## Sound

- **Lake bed:** soft lapping, a low noise through a bandpass, with a slow swell.
- **Release:** a paper rustle, then a small breathy whoosh as the flame catches.
- **Night:** a few frogs and crickets, far and quiet, only at Night.
- **Festival:** a low warm drone that swells with the number of lanterns in the air, then fades as they burn out.

## Finesse

- No two lanterns share a size, flicker phase or sway. Sizes vary by 15 %.
- Far lanterns turn redder and dimmer through the haze, one value step at a time.
- The flame flares for 0.3 s when it catches; the paper takes 1 s to fill with light.
- A lantern that passes a ripple breaks its own reflection into short pieces.
- The river: in a Festival, the wind field has a slow channel, so the lanterns gather into one band.

## Reduced motion and idle

- **Reduced motion:** lanterns rise at half speed with no sway and no flicker; the water holds still.
- **Idle:** with no lantern alive, the scene draws one frame and sleeps. With lanterns alive it runs at 30 fps or better; it sleeps 60 s after the last input once the sky is empty.

## Review focus

1. **160 lanterns at 1280 px on High:** hold 30 fps. If not, the cap drops first, then bloom levels, then the pixel ratio.
2. **375 px portrait:** the shore line moves up; the near shore and the river still fit.
3. **Hold in one spot for 20 s:** no stack of lanterns in one place; each starts a little apart.
4. **A choice change with 80 lanterns up:** the sky eases, the lanterns keep their glow, nothing pops.
5. **Clear:** lanterns burn out in 1.5 s, in no fixed order, never vanish at once.

## Tasks

### Task 1: The lake at dusk

**Files:** Create `lanterns/index.html`; set the bean to in-progress.

**Produces:** `envScene`, `shore(x)`, `HOURS`.

- [ ] The sky, the far shore, the water and the mist on the environment runner. No lanterns.
- [ ] Stills at Dusk, Blue hour and Night at 1280 and 375 px. Checkpoint with Tom.
- [ ] Commit: `Lantern lake: the lake at dusk`.

### Task 2: Sky lanterns

**Produces:** `pool`, `release(x, y)`, `step(dt)`, `tLan` (the data texture).

- [ ] The CPU pool, lift, wind, sway and burn out. The GPU loop, the paper shading and the far orbs.
- [ ] The reflection streaks in the lake.
- [ ] Screenshots: one lantern near, ten in the air. Checkpoint with Tom.
- [ ] Commit: `Lantern lake: sky lanterns and their reflections`.

### Task 3: Festival and floating lanterns

- [ ] Festival, the wind channel, Clear, hold to release.
- [ ] Floating lanterns, if Tom said yes to D1.
- [ ] A screenshot of the river at Blue hour. Checkpoint with Tom.
- [ ] Commit: `Lantern lake: festival and floating lanterns`.

### Task 4: Sound

- [ ] Every voice in Sound, on `kit.out`.
- [ ] Commit: `Lantern lake: lake bed, release and festival drone`.

### Task 5: Bar, menu and QA

- [ ] The Bar v2 spec, Settings, Dev rows and persistence. `toys.json` (series `vistas`, Lab), and the menu Lab entry with its icon hook.
- [ ] Review focus 1 to 5. QA in headless Playwright at 1280, 375 x 812 and 812 x 375; `tests/bar-v2.html` passes.
- [ ] Tick the bean and record the cost. Commit.

## Kit handoff

The lantern pool and its data texture are a general "many small lights over water" part. Mark it. Canal at dusk or Fireworks may want it.
