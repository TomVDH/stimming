---
# stimming-gkku
title: 'Toy: Pressure washer'
status: completed
type: feature
priority: normal
created_at: 2026-11-15T08:51:09Z
updated_at: 2026-11-27T07:19:52Z
---

Lab toy `washer/`, idea 292 (group E, satisfying physics loops): clean a filthy patio in crisp stripes.

Hold and drag to spray. The jet cuts a crisp, bright stripe through years of grime: a hard core and a soft fringe. Dirt runs off as muddy water; mist hangs in the light. Clean stone shows wet, then dries. A picture hides under the dirt. Three or four surfaces are the one choice group; Reset makes it filthy again.

Tier: raw WebGL2 (a dirt mask and a water field on ping-pong textures, one shade pass, bloom). Sound: jet hiss and roar, synthesized through audioKit().

## Checklist
- [x] Bean, plan, page skeleton on Bar v2 (copy of stone/ skeleton)
- [x] Dirt mask and jet stamp: hard core, soft fringe
- [x] Surfaces with real character and a hidden picture each
- [x] Muddy run-off water, wet darkening and drying, mist in the light
- [x] Synthesized jet sound: hiss and roar with speed
- [x] Idle when the hand stops and the water has gone; whenVisible; quality and slow-frame step; reduced motion
- [x] Vignette: heading, two paragraphs, small figure
- [x] QA in the browser pane: console, gesture, controls, sound, 1280, 375x812, 812x375
- [x] docs/toys/washer.md from the template
- [x] Handoff files: toys-entry.json, menu-li.html, menu-icon.js

## Summary of Changes

- `washer/index.html`: a new Lab toy on Bar v2, raw WebGL2. A floor bakes once per surface and size; a grime map (film, crust, tint, kind) grows over it; the fan jet erases it with a hard core and a soft fringe, integrated over the frame in up to 40 substeps, so fast strokes leave faint stripes and slow ones cut clean.
- Water map: muddy water, foam and wetness; a mass-keeping blur; muddy rivulets run downhill from the jet; the ground darkens wet, then dries. Mist glows against a low sun; spray drops; bloom; film curve.
- Four surfaces, each hiding a Canvas 2D picture: herringbone patio over a brass-lettered compass rose, grooved deck over a burnt treasure map, pool tiles over an octopus, a Roman doorstep over a CAVE CANEM dog. One teaser stripe shows a slice on load.
- Sound through `audioKit()`: motor spin-up and wind-down, hiss, roar that brightens with speed and drops on grime, grit crackle, run-off trickle, regrow swell, a chime when the floor is clean.
- `docs/toys/washer.md`: the toy doc. Handoff files for `toys.json` and the menu are in the batch scratchpad.
- QA: probe page in a hidden pane (synthetic strokes, PNG captures), all four surfaces cleaned fully, 1280x800, 375x812, 812x375, controls by DOM clicks, audio graph checked; no console errors from the page.
