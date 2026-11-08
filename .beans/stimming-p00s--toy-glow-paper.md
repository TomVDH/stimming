---
# stimming-p00s
title: 'Toy: Glow paper'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-08T10:07:10Z
updated_at: 2026-11-08T10:21:23Z
---

Build Glow paper (idea 44): a UV torch writes on phosphorescent paper; the trace glows green and fades. Folder `glow`. It starts in the Lab. Raw WebGL2, K1 accumulation and decay copied from Star trails. It follows the Look rule: one sheet, no props.

- [x] Blockout: still frames of the sheet, the UV pool and a fading trace
- [x] Checkpoint 1: Tom signs off the blockout
- [x] Plate: K1 charge and decay, two-term afterglow
- [x] Torch: hold and drag paints charge; the violet pool shows its glow at once
- [x] Bar: glow colour chips, Fade slider, Flash, Clear, Settings (torch size)
- [x] Frame loop: lively, 30 fps drift, sleep after 60 s, hidden stop, watchdog
- [ ] Sound: to be set by Tom
- [ ] toys.json entry and menu Lab entry with an icon and a GSAP hook
- [ ] QA: 1280 and 375 px, clean console, idle stop, hidden tab stops the loop
- [ ] Record the session cost
