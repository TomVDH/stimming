---
# stimming-ix8b
title: 'Toy: Lava coast'
status: completed
type: feature
created_at: 2026-11-23T00:28:47Z
updated_at: 2026-11-27T07:19:52Z
parent: stimming-oh7b
---

Build Lava coast (idea 99, group C, a cinematic diorama) as a Lab toy: an MVP at high fidelity, Bar v3. A volcanic island coast at night. A tap on the vent sends up a glowing lava fountain; the flow runs down the black slope in braided channels that crust and glow at the cracks, and where it pours into the surf it throws up towers of steam lit orange from below, hissing and crackling; then the vent calms and the flow cools. Apart from Volcano: a quiet coast scene where lava reaches the sea, not an eruption shot. Plan: docs/plans/lavacoast.md.

Stack type: Shader (raw WebGL2 on shared/gl.js, bloom from shared/glow.js), with a lava sim in JS and two land meshes.

- [x] Plan at docs/plans/lavacoast.md
- [x] Reference photos (ocean entries, laze plumes, lava fountains at night)
- [x] Blockout on the stage, screenshot at 1280 x 800 (docs/qa/lavacoast/01-blockout.jpg)
- [x] Hero moment: fountain, braided flow with crust and cracks, ocean entry, lit steam towers, calm and cooling
- [x] Sound: muted by default, finished
- [x] Bar v3 spec and copy
- [x] Icon round spike-lavacoast-1 (Current, A, D), emblems, sheet row
- [x] Intro emblem, favicon, toys.json entry, Lab tile with GSAP hook
- [x] QA Q1 to Q10, docs/toys/lavacoast.md
- [ ] Tom sets the Dutch name
- [ ] Record the session cost

## Defaults chosen (Tom's open questions: 3D or flat, and the presentation)

- 3D island, sea and sky on a flat stage, raw WebGL2, six small programs. The camera floats 35 m over the sea, offshore, and looks in level at the coast; horizon 36% up the frame; about 46 degrees across. Why: the reference photos of ocean entries are taken from the sea: the pour at the waterline, the lit plume over it, the glow in the water. The sea strip in front carries the reflections.
- Night, no moon: the lava is the key light. It lights the slope round it, the steam from below and the sea.
- References (Wikimedia Commons searches "lava ocean entry night", "laze plume kilauea", "lava fountain night", "pahoehoe lava flow night"): a thin bright pour at the shoreline under a white plume that leans off, lit orange from below; crusted flows with a network of glowing cracks; fountains as narrow incandescent jets with spatter.
- Apart from Volcano: no ash column, no blast, no bombs. A small flank vent with a fountain of 70 to 180 m; the event is where the lava meets the sea.
- The lava is a sim (160 x 160, 6.5 m cells, in JS): hot lava runs, cool lava has a yield slope and stops; six old tumuli part it into braids. Its heat lost in the sea is the steam; columns of steam group into up to four towers, each with 64 s of history, so a tower rises, leans and lets go of its base when the lava stops.
- Steam follows Fire's smoke shading (K3 lighting), keyed by the brightest glow near each point.
- Tap anywhere: the vent erupts for about 7 s. Hold or drag: it lasts while held (30 s at most). Space or Erupt: a tap. Slider: Flow (fountain height and lava volume). The fountain is heard 3.8 s late, the shore 1.5 s late.
- At rest a lava tube spills a thin stream into the sea right of centre with a small tower of steam, so the first frame is a picture.

## QA (2026-11-22)

- Q1 node --check: six modules and the six menu scripts pass.
- Q2 console clean on the toy (Space, tap, hold, Flow slider), the phone view, reduced motion, the icon round and the Lab hover. Intro and monogram show the emblem.
- Q3 captures: docs/qa/lavacoast/ (01 blockout to 10 Lab tile hover).
- Q4 drift 31.5 frames a second; 0 frames 62 s after the last input. Q5 hidden: 0 frames in 2 s.
- Q6 reduced motion: 0 drift frames; a tap runs a softer fountain and its flow, then the loop stops (0 frames) once the lava has cooled.
- Q7 one action (Erupt), one slider (Flow); How to play has three rows. Q8 Space wakes the vent.
- Q9 context running after the gesture, suspended at rest.
- Q10 Edge headless on D3D11, RTX 3070, during a held fountain and the flow at 1280 x 800: frame median 7.6 ms, p95 8.5 ms; no rung stepped down.
