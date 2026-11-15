---
# stimming-0tf8
title: 'East Van: pokes and life on the house lot'
status: completed
type: task
created_at: 2026-11-10T10:47:18Z
updated_at: 2026-11-10T10:47:18Z
parent: stimming-guw5
---

Tom picked 'More pokes and life' after Toy-town pass 1.

- [x] One draw call for all static paint: vertex colours
- [x] Switches: six windows, porch lamp, string lights, street lamp, van headlights
- [x] Movers: gate, blue box, van on its springs
- [x] Life: cat on the porch roof, lawn flamingo, porch couch, flowers, a camper van
- [x] Particles: cherry petals (tree poke and a slow drift), chimney smoke
- [x] Every poke checked in the browser; stills to Tom

## Summary of Changes

- `eastvan/kit.js`: colour helpers, the one paint material (vertex colours), the glow material, a beam.
- `eastvan/town.js`: all static paint is one mesh. `sw` parts are switches; `dyn` parts are movers. Each poke is `{ id, pos, r, fire }`.
- `eastvan/life.js`: crow, cat, flamingo, cherry petals, chimney smoke. Each adds its own poke.
- `eastvan/lens.js`: a no-ink list keeps petals and flowers out of the depth pass.
- 21 pokes: lamp, door, two lids, six windows, string lights, street lamp, gate, blue box, van, crow, cat, flamingo, tree, chimney.
- Measured in the pane on High (2048 x 1536): 81 draw calls, 24.6k triangles, about 57 frames each second.
- Seen in stills: windows, lids, door, tree petals, smoke, street lamp, flamingo, cat. Gate, van and blue box: the target resolves; no still caught the motion.
