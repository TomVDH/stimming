# Calving (`calving`) implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Many sessions build this toy, one stage at a time. Steps use checkbox (`- [ ]`) syntax.

**Goal:** A cinematic fjord. A glacier wall towers over dark water. Tap the ice: a crack runs, a tower of ice leans and falls, the splash goes up, and a slow surge rolls across the fjord toward the camera.

**Architecture:** One raw WebGL2 scene on the shared environment library, as Railgun is: `envScene` for sky and far terrain, a ray-marched ice face with fracture cells, a water surface with a travelling surge, and particle or volume passes for splash, spray and ice dust.

**Tech stack:** raw WebGL2 on `shared/gl.js` and `shared/environment.js`; `shared/sky.js`, `shared/water.js`, `shared/weather.js`, `shared/precip.js`, `shared/glow.js`, `shared/grade.js`, `shared/output.js`. Volume smoke follows the Railgun rock's shading. three.js only if a stage proves it needs it.

**Spec:** idea 57 in [toy-ideas.md](../toy-ideas.md) (tool-approved); batch rules in [README.md](README.md); Bar v2 in [bar-v2.md](bar-v2.md). Bean `stimming-2ddv`.

| | |
|---|---|
| Size, estimate | XXXL · $150 and up, many sessions |
| Kits | the shared environment library; Railgun's smoke and debris shading |
| Before the build | Tom picks which XXXL comes first: Calving or Tornado alley. The second lifts the first's parts. |

## The shot

Low on the water, a long lens. The glacier face fills the right two thirds: blue-white seracs, dark crevasses, a band of dirty ice at the waterline.
Steep dark mountains close the fjord on the left; a low sun cuts in from far behind, so the ice glows at its edges.
Brash ice and small bergs float in the foreground. The water is calm, black-green, with the face reflected in it.

## Hero moments

1. **The crack.** A tap on the face starts a crack with a boom that arrives late (distance). Dust and small ice falls from the seam.
2. **The fall.** A tower leans out, breaks into blocks and drops. Slow and heavy: it reads as huge.
3. **The splash.** A white column climbs, hangs, and falls back as spray and mist.
4. **The surge.** A long wave rolls out; the brash ice and bergs lift and rock; it reaches the camera last.
5. **The berg.** A new berg rolls over and settles.

## Loop

- **Tap the face:** pick where it breaks. A bigger hold gives a bigger fall.
- **Drag:** pan the long lens along the face.
- **Untouched:** small ice falls now and then; the water settles; the scene sleeps.

## Bar (Bar v2)

| Slot | Content |
|---|---|
| Top left | Choice: Time, `segments`: Dawn, Noon, Dusk, Night (aurora) |
| Bottom left | Action: Calve (a random fall) |
| Bottom right | Slider: Weather (clear to snow squall) |
| Bottom centre | Keys: `[CLICK] break` · `[HOLD] bigger` · `[DRAG] pan` |
| Settings | Quality (shared); Dev rows for every look knob |

## Sound

The late boom, the rumble of the fall, the splash, the long wash of the surge on the brash ice, gulls far off. Distance delays every sound. Muted by default.

## Stages

Each stage is one or more sessions and ends with a checkpoint with Tom.

### Stage 1: The shot (blockout)
- [ ] Fjord, mountains, ice face, water, sky. Stills at 1280 and 375 px. Checkpoint with Tom.
- [ ] `toys.json` entry and menu Lab entry with a low-fi icon.

### Stage 2: The fall
- [ ] Fracture cells on the face, the crack, the tower fall as rigid blocks, the splash column.

### Stage 3: The surge
- [ ] A travelling wave on `shared/water.js`, floating brash ice and bergs that ride it, spray and mist.

### Stage 4: Sky and light
- [ ] Time of day, low sun through the ice (subsurface glow), haze, weather, aurora at night.

### Stage 5: Finish and QA
- [ ] Sound, Settings, Dev rows, the performance ladder. QA in the browser pane. Tick the bean, record the cost.
