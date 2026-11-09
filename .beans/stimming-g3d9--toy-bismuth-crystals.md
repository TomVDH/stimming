---
# stimming-g3d9
title: 'Toy: Bismuth crystals'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-09T07:47:02Z
updated_at: 2026-11-09T08:06:21Z
---

Build Bismuth crystals from docs/plans/bismuth.md. It starts in the Lab. Drag up from a liquid-metal pool to pull out a hopper crystal; its square terraces step out while you drag, and a thin-film oxide rainbow blooms across each new face. Raw WebGL2, instanced boxes, Bar v2.

- [x] Plan: docs/plans/bismuth.md
- [x] Task 1: pool, mirror, ember; three static crystals with thin film and glints; bloom and grade (blockout)
- [x] Task 1: Bar v2 spec wired to stubs; toys.json entry and Lab menu entry with a GSAP hook
- [x] Task 1: stills at 1280 and 375 px; checkpoint with Tom
- [x] Task 2: pull, hold, seed, lift; film age per terrace; float, bob, turn; cap and remelt
- [ ] Task 3: ripples, sag, settle ring, oxide skin; Heat; Habit and Settings live
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
