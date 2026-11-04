---
# stimming-shdy
title: 'Toy: ShadyOS'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-04T20:30:00Z
updated_at: 2026-11-04T20:30:00Z
---

Build ShadyOS from docs/plans/shadyos.md. An original glossy glass desktop OS, a bootleg "ultimate edition" a script kiddie skinned in 2008, aged and quietly possessed. The OS itself is the fidget. It starts in the Lab.

- [x] Concept, names and look studies (scratchpad stills; Tom picked the glass look, the warez layer and the name)
- [x] Playable prototype in the scratchpad: smear, jelly, fold, cascade
- [x] Page: shell, intro, stage and render (desktop bake, smear plate, frost blur, window meshes, aged screen)
- [x] Interaction: pointer state machine, drag, fling, double-click fold, shelf, beads, cascade close
- [x] Bar: Smear and Jelly, Age, + Window, Error, Clear, (i)
- [x] Sound: hum, clicks, dings, glass rub, fold whoosh
- [x] Menu Lab entry with icon and hook; toys.json entry (Dutch name is a draft)
- [x] QA: 1280 and 375 px, clean console, idle stop, hidden tab, reduced motion
- [ ] Settings popover (hum level, haunt on or off, quality)
- [ ] Haunt beats: cursor hesitation, 3:33 clock beat, tidy while you look away, screensaver
- [ ] Shadows that follow a wobbling window
- [ ] Mascot (after the look is settled)
- [ ] Checkpoint: Tom reviews look, feel and sound on a real device
- [ ] Record the session cost

## Notes

- Tom's rule exception for this toy: OS chrome carries text on the stage (titles, short dialog lines, the clock).
- 7.css was studied as a reference for the era's glass recipe only; nothing from it is loaded or copied.
- Headless SwiftShader is a floor for fps; a real-device check is still needed.
