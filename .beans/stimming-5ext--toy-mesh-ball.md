---
# stimming-5ext
title: 'Toy: Mesh ball'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-15T08:51:06Z
updated_at: 2026-11-15T09:26:05Z
---

Lab toy `meshball/` (group D, stimming and fidget; idea 250: "Squeeze; coloured bubbles bulge through the net.").

A squishy goo ball inside a soft net. Press and hold to squeeze: where the pressure goes, translucent goo bubbles bulge out through the mesh holes, swell, wobble and suck back in on release. Harder or longer presses push more bubbles further; dragging moves the squeeze round the ball. Fat, wet, subsurface-lit bubbles with strong colour; the net bites into the ball.

Tier: raw WebGL2 (one ray-marched SDF fragment shader on a full-screen triangle, bloom and grade). Sound: synthesized wet squish and pops through audioKit(). One choice group: goo colours.

## Checklist
- [x] Bean and blockout page on Bar v2 (initPage, intro fallback, stage)
- [x] Shader: ball, net, bulging bubbles, subsurface goo look
- [x] Squeeze physics: press, hold, drag, release, wobble
- [ ] Goo colour choice, actions, settings, dev rows
- [ ] Sound: wet squish and pops, muted by default
- [ ] Quality: pixel ratio, slow-frame step, idle sleep, whenVisible, reduced motion
- [ ] Vignette: heading, two paragraphs, small figure
- [ ] QA in the browser pane: console, gesture, controls, 1280, 375x812, 812x375
- [ ] docs/toys/meshball.md
- [ ] Handoff files: toys-entry.json, menu-li.html, menu-icon.js
