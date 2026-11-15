---
# stimming-d3p9
title: 'Toy: Crossing button'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-15T08:58:30Z
updated_at: 2026-11-15T09:41:39Z
---

Lab toy `crossing/`. Idea 277 in `docs/toy-ideas.md`: press the button; the ticker speeds up, then it goes green.

The push-button box on a Belgian pedestrian crossing at night, with its ticker for blind pedestrians (the rateltikker): a slow tick on red, a fast rattle on green. One gesture: press, as often and as hard as the hand likes. Impatient mashing gets a reaction. Tier: Canvas 2D (lightest tier that draws the idea).

Lab batch lab10 (group D, stimming and fidget).

## Checklist

- [x] Page on the shared shell, Bar v2, intro fallback text in the page
- [x] The box: button, countdown ring, LED legend, grille, tactile arrow, on its pole
- [x] Night street behind it: wet zebra, bokeh lamps, the far signal head, reflections, bloom
- [x] The cycle: red, wait (ticker speeds up), green (rattle), flashing green, red
- [x] Mashing: each press knocks a dot out; the legend talks back; the box gives in
- [x] Sound: tick, rattle, press, request beep, grumbles, passing cars (Web Audio through audioKit)
- [x] Quality, slow-frame step, idle sleep, hidden-tab stop, reduced motion
- [x] Vignette: heading, two paragraphs, small figure
- [x] Toy doc `docs/toys/crossing.md`
- [x] Handoff files: toys entry, menu tile, menu icon hover block
- [x] QA: console, gesture, controls, sound start, 1280, 375 x 812, 812 x 375

## Notes

- 2026-11-15: first build. Canvas 2D: the street is prerendered once per size (a canvas blur on a quarter-size layer with an overscan margin); the box is a sprite in box units; lights, ring, legend and cars draw each frame (0.8 ms at 2496 x 1504).
- The legend words are Flemish on purpose: WACHT, WACHT!, JA JA!, GEDULD, then ALLEE! when the box gives in, AU! on a long hard push, GA! on a press during green. Tom may want other words.
- Mashing works: each press knocks a dot out, so a hand that mashes reaches green sooner. A real box ignores extra presses; the vignette says so.
- The locator tick dozes after 30 s without a press, so an idle tab goes quiet and its loop stops.
- QA in the built-in pane with a throwaway probe page (timer frames, canvas stills to a sink on port 8771): the probe is deleted and never committed. Sound checked by level meter only, not heard. Hidden-tab stop checked by reading the code only. Phone frame time not measured.

## Summary of Changes

- `crossing/index.html`: the toy on Bar v2 (Settings: Quality and Reset; Dev: Wait, Glow; key strip: click press, hold push hard, space press), with the intro fallback and the vignette.
- `docs/toys/crossing.md`: the toy doc.
- Handoff files for the orchestrator (toys entry, menu tile, menu icon hover block) in the lab10 scratchpad.
