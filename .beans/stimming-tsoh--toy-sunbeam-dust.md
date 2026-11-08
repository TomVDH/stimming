---
# stimming-tsoh
title: 'Toy: Sunbeam dust'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-08T17:45:37Z
updated_at: 2026-11-08T17:57:04Z
---

Build Sunbeam dust (idea 75, rank 8) from docs/plans/sunbeam.md: one shaft of light crosses a dark room; dust motes drift and glint in it; the pointer stirs them. Folder sunbeam. It starts in the Lab. three.js 0.170.

- [x] Task 1: beam pass, panes, penumbra, floor patch, grade; static motes
- [ ] Checkpoint 1: stills of the four rigs at 1280 and 375 px; Tom signs off
- [ ] Task 2: GPU motes, glints, bokeh
- [ ] Task 3: stir, puff, Blow, rig easing; drift at 30 fps, sleep at 60 s
- [ ] Task 4: room tone, pads, swish, breath
- [ ] Task 5: bar, Settings, persistence, toys.json, Lab menu entry; QA
- [ ] Record the session cost

## Notes

- Rendering starts in raw WebGL2, per the Next set rule in toy-plan.md, not three.js as the plan says. Motes will run on a float ping-pong texture, not GPUComputationRenderer.
- Portrait looks back up the shaft from past the floor patch, toward the light. The camera follows the rig. Landscape keeps the side view from the plan.
- Light streaks come from noise in window space: sheets of shade that read as lines.
- Checkpoint stills: four rigs at 1280 and 375 px, sent to Tom 2026-11-08.
