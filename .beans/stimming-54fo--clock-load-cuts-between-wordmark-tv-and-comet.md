---
# stimming-54fo
title: 'Clock load: cuts between wordmark, TV and comet'
status: completed
type: bug
priority: normal
created_at: 2026-11-16T23:20:28Z
updated_at: 2026-11-16T23:22:48Z
---

Tom (2026-11-16): glitches and cuts between the logo loading, the TV intro and the clock ring.

A cold load of the live site, frame by frame, shows:
- The wait dot leaves when the TV starts, not when the comet starts (AGENTS.md says it turns into the comet). The comet then pops in at twelve after a dark gap.
- The Re-roll button joins the page late and pushes the footer down: its glow shows, then jumps away.
- The wordmark's letter drop runs while the wordmark still waits for its fonts; the wordmark then pops in, at the same moment the TV starts.
- The TV's power-on opens as a soft box, not a round shape.
- The footer's CSS glow swaps to the shader glow in one frame.

- [x] Wait dot stays until the comet starts
- [x] Reserve the Re-roll's place before the script runs
- [x] Wordmark drop waits for its fonts; the TV follows it
- [x] TV power-on opens round: kept as is. It is the CRT turn-on Tom approved (dot, line, raster), and every edge is soft.
- [x] Footer shader glow fades in
- [x] Record a cold load again and look

## Summary of Changes

- `clock.js`: `data-clock="on"` moves into the comet's start, so the waiting dot stays at twelve through the TV and becomes the comet's head. The intro also waits for the wordmark's fonts plus 0.3 s.
- `index.html`: the letter drop starts when `data-fonts` leaves `wait`.
- `clock.css`: `main::after` keeps the Re-roll's 34 px until the deal; the shader glow and the CSS glow cross-fade over 1.2 s.
- Checked with cold-load recordings at 1280 x 800 and 1440 x 1000.
