---
# stimming-5ext
title: 'Toy: Mesh ball'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-15T08:51:06Z
updated_at: 2026-11-15T09:44:50Z
---

Lab toy `meshball/` (group D, stimming and fidget; idea 250: "Squeeze; coloured bubbles bulge through the net.").

A squishy goo ball inside a soft net. Press and hold to squeeze: where the pressure goes, translucent goo bubbles bulge out through the mesh holes, swell, wobble and suck back in on release. Harder or longer presses push more bubbles further; dragging moves the squeeze round the ball. Fat, wet, subsurface-lit bubbles with strong colour; the net bites into the ball.

Tier: raw WebGL2 (one ray-marched SDF fragment shader on a full-screen triangle, bloom and grade). Sound: synthesized wet squish and pops through audioKit(). One choice group: goo colours.

## Checklist
- [x] Bean and blockout page on Bar v2 (initPage, intro fallback, stage)
- [x] Shader: ball, net, bulging bubbles, subsurface goo look
- [x] Squeeze physics: press, hold, drag, release, wobble
- [x] Goo colour choice, actions, settings, dev rows
- [x] Sound: wet squish and pops, muted by default
- [x] Quality: pixel ratio, slow-frame step, idle sleep, whenVisible, reduced motion
- [x] Vignette: heading, two paragraphs, small figure
- [x] QA in the browser pane: console, gesture, controls, 1280, 375x812, 812x375
- [x] docs/toys/meshball.md
- [x] Handoff files: toys-entry.json, menu-li.html, menu-icon.js

## Summary of Changes

- `meshball/index.html`: raw WebGL2 ray march of a cube-sphere net (Mesh 3 to 8 holes a cube edge). Each hole holds one bubble; the CPU springs every bubble and writes it to an RGBA32F texture; the shader reads each hole and its three nearest neighbours, so bubbles merge into one goo mass with the net riding in the creases.
- Press and hold dents the ball; pressure builds over about 2 s and a ring of bubbles swells round the dent. Drag moves the dent. Release sucks the bubbles back with a wobble. Up to three fingers; pen pressure presses harder. Space (held Squeeze action) presses with two palms.
- Jelly shading: deep body, glowing thin walls and creases, wet softbox and rim highlights, a hue-keeping film curve; five goos (Grape, Lime, Mango, Glitter with gold flakes, Rainbow tie-dye).
- Sound through audioKit: squish, pops as bubbles pass a half sphere, sucks, a slurp on release, a squelch while dragging.
- Bar v2: Goo segments, Squeeze, Mesh slider, Wobble in Settings, Quality, Reset; five Dev rows. detail() pixel ratio and slow-frame step; the loop sleeps when settled.
- Vignette (Pascal's principle, the half-sphere peak), `docs/toys/meshball.md`, handoff files for the menu tile and toys.json.
- Not verified: the sound by ear, phone frame times.
