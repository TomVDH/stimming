---
# stimming-84n7
title: 'East Van: Toy-town pass 1, lens and house detail'
status: completed
type: task
created_at: 2026-11-10T10:37:17Z
updated_at: 2026-11-10T10:37:17Z
parent: stimming-guw5
---

Tom: Toy-town at full force. First pass on the house lot in eastvan/index.html.

- [x] eastvan/town.js: the 3D scene from lot.js; eastvan/lens.js: the render pipeline
- [x] Lens: ambient occlusion, bloom on lit panes and the lamp, depth blur, ink line, grade
- [x] House detail: clapboards, gable shingles, roof courses, mullions, barge boards, stair rails, chimney cap
- [x] Ground detail: sidewalk slabs, plinth strata
- [x] New poke: the front door
- [x] Check at 1280 and 375; stills to Tom

## Summary of Changes

- `eastvan/index.html` is the toy page (noindex, not in the menu yet). It owns the camera, the pointer and the loop.
- `eastvan/town.js` builds the scene from `eastvan/lot.js`; parts merge by colour; `dyn` parts move on a hinge.
- `eastvan/lens.js`: normals and depth, colour, half-size ambient occlusion, bloom from a glow mask in alpha, ink line, depth blur, grade.
- New detail: clapboards, gable shingles, roof courses, mullions, barge boards, stair rails, chimney cap, sidewalk slabs, plinth strata.
- New poke: the front door opens and lights the porch.
- Measured in the pane: about 125 draw calls, 13.5k triangles, 110 fps at 800 x 600.
- The lab keeps its own data copy: `eastvan/looks-lot.js`.
