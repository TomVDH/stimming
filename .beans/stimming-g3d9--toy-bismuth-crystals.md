---
# stimming-g3d9
title: 'Toy: Bismuth crystals'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-09T07:47:02Z
updated_at: 2026-11-09T08:50:26Z
---

Build Bismuth crystals from docs/plans/bismuth.md. It starts in the Lab. Drag up from a liquid-metal pool to pull out a hopper crystal; its square terraces step out while you drag, and a thin-film oxide rainbow blooms across each new face. Raw WebGL2, instanced boxes, Bar v2.

- [x] Plan: docs/plans/bismuth.md
- [x] Task 1: pool, mirror, ember; three static crystals with thin film and glints; bloom and grade (blockout)
- [x] Task 1: Bar v2 spec wired to stubs; toys.json entry and Lab menu entry with a GSAP hook
- [x] Task 1: stills at 1280 and 375 px; checkpoint with Tom
- [x] Task 2: pull, hold, seed, lift; film age per terrace; float, bob, turn; cap and remelt
- [x] Task 3: ripples, sag, settle ring, oxide skin; Heat; Habit and Settings live
- [ ] Task 4: sound: ticks, hum, slurp, sizzle, shimmer; Q9
- [ ] Task 5: menu icon; Q1 to Q10 in the pane
- [ ] Tom sets the Dutch name
- [ ] Record the session cost

## Notes

- Commits go to main through tools/commit.sh (shared checkout), not a feature worktree.
- Dutch name draft: Bismutkristallen. Tom sets it.

- Task 1: stills at 1280 and 375 px sent to Tom (canvas captures through a probe page, since the pane is hidden). Waiting on sign-off before Task 2.
- Task 1 rulings: the key light is a low strip over the far pool, so the pool streak and the crystal-top glints share one band. Crystals see a brighter light tent than the pool does (`studio` in `env()`). A narrow stage swings the key toward the centre.

- Tom signed off the blockout on 2026-11-09 ("Go to Task 2").
- Task 2 rulings: a press on the pool seeds a crystal at once, so every gesture answers in one frame. A tap on a crystal spins it. Each 26 px of fresh climb pulls one terrace; a hold on the pool grows 1.6 terraces a second. Released crystals spring back to the melt. Touching crystals drift apart. The melt glow rides in the pose matrix spare slot, so no extra uniform. Cluster sprouts side crystals at terraces 6 and 10. A held crystal shows almost no reflection: its underside reflects the dark pool.

- Task 3 rulings: the plan said the pool sags under a pull; it bumps up instead, since liquid clings to a rising body. The bump lets go at lift 0.42 with a ring. Rings start at the crystal edge, so the crystal never hides them. Ring crests catch a soft fake light, as the dark melt shows slopes poorly. Eight rings at most, as uniforms.

- 2026-11-09: Tom found the loop flat ("low effort, not fidgety, no satisfying loop") and chose Ratchet grow. Rework: one hero crystal, hold to ratchet terraces out, film blooms round the spiral in about 1 s, circle to spin, release to harvest onto a pile, new seed rises. Brighter studio light, saturation lift, a sweeping key. See Loop v2 in the plan.
- Task 4 voices are in with the rework (tick per click on a pentatonic scale, slurp on harvest, plop and shimmer on landing, plop on seed, sizzle on remelt, melt hum by Heat). Not yet heard: the probe tab is hidden, so the audio is unverified.
- [ ] Tom tries Ratchet grow by hand and signs off the loop
- [ ] Sound listen-through with Tom

- 2026-11-09: Tom asked for stacking and much better rendering. Harvests now stack into a floating tower that rocks on each landing and topples at 8 (6 on a phone). Render: soft-box light tent, edge bevels, pit shading, drifting film, cleaner chrome melt, contact shadows; the camera leans toward a tall tower.
