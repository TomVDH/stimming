---
# stimming-gkku
title: 'Toy: Pressure washer'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-15T08:51:09Z
updated_at: 2026-11-15T09:43:02Z
---

Lab toy `washer/`, idea 292 (group E, satisfying physics loops): clean a filthy patio in crisp stripes.

Hold and drag to spray. The jet cuts a crisp, bright stripe through years of grime: a hard core and a soft fringe. Dirt runs off as muddy water; mist hangs in the light. Clean stone shows wet, then dries. A picture hides under the dirt. Three or four surfaces are the one choice group; Reset makes it filthy again.

Tier: raw WebGL2 (a dirt mask and a water field on ping-pong textures, one shade pass, bloom). Sound: jet hiss and roar, synthesized through audioKit().

## Checklist
- [x] Bean, plan, page skeleton on Bar v2 (copy of stone/ skeleton)
- [x] Dirt mask and jet stamp: hard core, soft fringe
- [x] Surfaces with real character and a hidden picture each
- [ ] Muddy run-off water, wet darkening and drying, mist in the light
- [ ] Synthesized jet sound: hiss and roar with speed
- [ ] Idle when the hand stops and the water has gone; whenVisible; quality and slow-frame step; reduced motion
- [ ] Vignette: heading, two paragraphs, small figure
- [ ] QA in the browser pane: console, gesture, controls, sound, 1280, 375x812, 812x375
- [ ] docs/toys/washer.md from the template
- [ ] Handoff files: toys-entry.json, menu-li.html, menu-icon.js
