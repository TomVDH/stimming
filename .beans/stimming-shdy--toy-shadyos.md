---
# stimming-shdy
title: 'Toy: ShadyOS'
status: todo
type: feature
priority: normal
created_at: 2026-11-04T20:30:00Z
updated_at: 2026-11-04T21:50:00Z
---

Build ShadyOS from docs/plans/shadyos.md. An original glossy glass desktop OS, a bootleg "ultimate edition" a script kiddie skinned in 2008, aged and quietly possessed. The OS itself is the fidget. It starts in the Lab.

- [x] Concept, names and look studies (scratchpad stills; Tom picked the glass look, the warez layer and the name)
- [x] Playable prototype in the scratchpad: smear, jelly, fold, cascade
- [x] Page: shell, intro, stage and render (desktop bake, smear plate, frost blur, window meshes, aged screen)
- [x] Interaction: pointer state machine, drag, fling, double-click fold, shelf, beads, cascade close
- [x] Bar: Smear and Jelly, Age, + Window, Error, Clear, (i)
- [x] Sound: hum, clicks, dings, glass rub, fold whoosh
- [x] Menu Lab entry with icon and hook; toys.json entry (Dutch name LoucheOS, confirmed by Tom)
- [x] QA: 1280 and 375 px, clean console, idle stop, hidden tab, reduced motion
- [x] Merged to main (PR #18); live in the Lab
- [ ] Polish 1: the haunt beats (stimming-i9t4)
- [ ] Polish 2: shadows follow a wobbling window (stimming-j1lw)
- [ ] Polish 3: Settings for haunt, hum and trail (stimming-yb20)
- [ ] Polish 4: sound pass (stimming-balv)
- [ ] Polish 5: the mascot (stimming-zpoq)
- [ ] Checkpoint: Tom reviews look, feel and sound on a real device
- [ ] Record the session cost

## Notes

- Parked by Tom on 2026-11-04 after the Lab merge. Resume with the polish beans, in order, on a fresh branch from main.

- Tom's rule exception for this toy: OS chrome carries text on the stage (titles, short dialog lines, the clock).
- 7.css was studied as a reference for the era's glass recipe only; nothing from it is loaded or copied.
- Headless SwiftShader is a floor for fps; a real-device check is still needed.
