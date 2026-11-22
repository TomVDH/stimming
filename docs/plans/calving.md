# Calving (`calving`) implementation plan

Status: MVP built (Stages 1 to 3, part of 4, QA of 5), 2026-11-22. The rest of Stage 4 and all polish are later. Bean: `stimming-2ddv`

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Many sessions build this toy, one stage at a time. Steps use checkbox (`- [ ]`) syntax.

**Goal:** A cinematic fjord. A glacier wall towers over dark water. Tap the ice: a crack runs, a tower of ice leans and falls, the splash goes up, and a slow surge rolls across the fjord toward the camera.

**Architecture (as built):** a three.js 0.170 scene, as Railgun is: small ShaderMaterials, each its own short program. The ice face is one grid of columns and rows from height functions; a calving carves the grid back and builds the tower's blocks from the same points, so the seam does not show. The water is a fan of rings round the camera with a planar mirror; the surge is one sum of travelling packets, run in the vertex shader and again on the CPU so ice floats on the same water. Spray, mist and dust are sorted soft sprites.

**Why not the environment runner:** `shared/environment.js` draws one full-screen scene function. The fall needs geometry that moves: rigid blocks, chips, floes. Ray-marching them in one big fragment shader is slow, and Windows D3D11 links big shaders slowly or not at all. The plan's earlier text named the runner; the MVP uses three.js instead and edits nothing in `shared/`.

**Spec:** idea 57 in [toy-ideas.md](../toy-ideas.md) (tool-approved); batch rules in [README.md](README.md); Bar v3 in [bar-v3.md](bar-v3.md). Bean `stimming-2ddv`. Toy doc: [calving.md](../toys/calving.md).

| | |
|---|---|
| Size, estimate | XXXL · $150 and up, many sessions |
| Kits | the shared environment library; Railgun's smoke and debris shading |
| Before the build | Tom picks which XXXL comes first: Calving or Tornado alley. The second lifts the first's parts. Calving's MVP came first (batch 4). |

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

## Bar (Bar v3)

The `bar` spec in `initPage()`; the shell draws Bar v3.

| Part | Content |
|---|---|
| Play | Action: Calve (Space; a tap calves a small tower in view, a hold grows a big one) |
| Main slider | Lens: wide fjord (0) to long lens on the face (1), stored as `stimming.calving.lens` |
| Settings | Quality (shared), Reset |
| How to play | Click: break a tower · Hold: a bigger one · Drag: pan · Space: calve |

Later, with the rest of Stage 4: a Time choice (Dawn, Noon, Dusk, Night with aurora) and a Weather slider. They are not built; the MVP holds one time of day.

## Sound

The late boom, the rumble of the fall, the splash, the long wash of the surge on the brash ice, gulls far off. Distance delays every sound. Muted by default.

## Stages

Each stage is one or more sessions and ends with a checkpoint with Tom. The MVP session (batch 4) built Stages 1 to 3, the part of Stage 4 that the shot needs, and the QA of Stage 5.

### Stage 1: The shot (blockout)
- [x] Fjord, mountains, ice face, water, sky. Stills at 1280 and 375 px (`docs/qa/calving/`).
- [x] `toys.json` entry and menu Lab entry with the icon from A of spike `calving-1` (Tom's pick).
- [ ] Checkpoint with Tom.

### Stage 2: The fall
- [x] Columns on the face; the crack runs along their grooves from the press; a hold widens it and lowers its base.
- [x] The tower settles, leans out on its hinge and breaks into rigid blocks; dust and chips fall from the seam.
- [x] The splash: a white column with jets, drops that fall back, a base roll over the water, then mist that drifts.

### Stage 3: The surge
- [x] A travelling wave from each impact (speed of a long wave in 110 m of water), foam where the blocks hit.
- [x] Brash ice and the new bergs ride it; the camera boat lifts and rocks when it arrives.

### Stage 4: Sky and light
- [x] One time of day: a low sun behind the glacier, haze, thin high cloud, translucent crests.
- [ ] Later: Time choice (Dawn, Noon, Dusk, Night), aurora at night, weather (clear to snow squall), subsurface glow through the ice, shadows from the walls, a lens flare when the sun is in frame.

### Stage 5: Finish and QA
- [x] Sound: crack, groan, the roar of the fall, the boom of the impact and the echoes, all late by distance; the surge wash and floe knocks near the camera. Muted by default.
- [x] QA Q1 to Q10 (`docs/toys/calving.md`).
- [ ] Later: Dev rows for the look knobs; gulls far off; the berg that rolls over (hero moment 5) as its own beat.
- [ ] Later: finer far range and the left wall; more face detail at the longest lens.
- [ ] Record the cost.
