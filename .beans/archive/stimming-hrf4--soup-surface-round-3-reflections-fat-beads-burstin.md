---
# stimming-hrf4
title: 'Soup surface round 3: reflections, fat beads, bursting boil, boiling down, light patterns'
status: completed
type: task
priority: normal
created_at: 2026-11-17T03:20:39Z
updated_at: 2026-11-27T07:19:52Z
parent: stimming-fskg
---

Tom: yes all, five more for the surface and liquid shader. One at a time, a still each.

- [x] Reflections: the soup mirrors the inner wall, the things and the stirrer handle (Dev toggle Reflections)
- [x] Fat beads that split and merge (stimming-xce4)
- [x] Bursting bubbles, spatter, thick-soup glops
- [x] Boiling down: level drops, tide line, browning
- [ ] Light patterns under thin broth
- [x] Timing check at High, full pot: new features about 3.4 ms of draw at 2496x1704, under 1 ms after the glancing-only thing march; emulated hidden tab, so absolute fps not verified
- [ ] Tom checks fps in a visible pane

## Test matrix (2026-11-16)

Six soup states (broth, stirred, chilli oil, thick cream, set skin, boiled down) at Fire 0, 0.25, 0.5, 0.75 and 1: 30 stills, no NaN pixels, white under 0.07%.
At High (2496x1704), full pot of 16 things: frame 16 to 19 ms at every fire level, calm or stirred. Emulated tab; not a visible-pane fps reading.
Dev fire at its maximum (power 3, size 1, spread 3, height 0.5) whites out the screen; main does the same (91% white), so it predates this branch.

Tamed (Tom): Fire spread soft-caps at 0.8, power times bed area at 1.8. All Dev fire rows at max now keep the pot readable; defaults unchanged.
