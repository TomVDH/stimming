---
# stimming-o5n6
title: 'Observatory: post-cut telescope simulator'
status: in-progress
type: task
priority: normal
created_at: 2026-11-22T11:01:56Z
updated_at: 2026-11-22T11:08:08Z
parent: stimming-wqq9
---

After the pick cuts, a telescope simulator: the player drives the tube and the eyepiece, and sees a simulated view through the optics. Scope: a new module under observatory/src/sim/ with its own workbench page. No edits to view/cuts.ts or loop.ts until the cuts bean (stimming-746h) lands. Tom signs off the look and the Lab entry.

## Checklist

- [ ] observatory/src/sim/ optics maths (tube pose, eyepieces, projection)
- [ ] observatory/src/sim/main.ts: entry, Canvas 2D eyepiece view, controls
- [ ] observatory/sim.html workbench page (noindex)
- [ ] tools/build.mjs: sim/main in the observatory extras (one line)
- [ ] npm run check: 0 errors
- [x] npm run build: dist/sim/main.js written
- [ ] Browser pane: sky renders; tube controls move the view
- [x] Commit on claude/obs-sim-5faa06 with tools/commit.sh --no-push

## Open choices for Tom

- The look of the eyepiece view and the page.
- The Lab entry (none added here).
- Integration with the pick cuts (stimming-746h) and the hand-off from the shot.

## Notes

- The catalog holds about 8,900 naked-eye stars, about 0.2 per square degree.
- A 1.73° field (40 mm) is often empty, so the tube starts on the brightest star from 20° to 80° altitude.
- Polaris check at LST 15h12m: it lands about 0.7° below the centre at alt 51, az 0, as expected near lower culmination.
- Open for Tom: faint procedural field stars to fill the eyepiece, a live sky clock, an inverted (true eyepiece) image.
