---
# stimming-14c5
title: 'Caustic pool: bar on the control bar standard'
status: completed
type: task
priority: normal
created_at: 2026-11-03T20:34:04Z
updated_at: 2026-11-03T20:38:29Z
parent: stimming-848s
---

Tom: bring the Caustic pool bar to the Control bar standard in AGENTS.md (a8a95fd).

- [x] The ‹ Ball › tool stepper and Clear stay
- [x] Lane and Day move into Settings (sliders icon, before the (i)) as labelled groups: Pool (Lap, Round, Bean) and Time (Day, Night)
- [x] P and N keys still switch pool and time, and the tray chips follow
- [x] Chips read well over the white tiles on the shell scrim
- [x] QA at 1280 and 375 with a clean console
- [x] Commit through a private index and push

## Summary of Changes

- The bar is now: ‹ Ball › stepper, Clear, then Settings (sliders icon) and the (i) at the right edge.
- Settings opens a tray with two labelled groups: Pool (Lap, Round, Bean) and Time (Day, Night). Hover opens it on mouse devices; a tap toggles it; a press outside or Escape closes it.
- P and N still step pool and time; the tray chips follow. Choices persist as before.
- The unused `name` field leaves `POOLS`.
- QA: headless Chromium with GPU flags at 1280 and 375, console clean. At 375 the bar wraps to two rows: stepper and Clear, then Settings and (i).
- Commit a5e2cb7.

## Follow-up

The shell dims a disabled chip with `opacity: 0.45` on the whole chip, so its dark backing turns see-through. Over the white tiles the idle Clear reads as a pale smudge. The fix belongs in `shared/stim.css` (dim text and border only on stage bars). It touches every toy, so it waits for Tom.
