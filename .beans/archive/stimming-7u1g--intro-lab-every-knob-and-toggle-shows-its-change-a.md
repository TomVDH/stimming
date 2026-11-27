---
# stimming-7u1g
title: 'Intro lab: every knob and toggle shows its change at once'
status: completed
type: task
created_at: 2026-11-03T18:41:47Z
updated_at: 2026-11-03T18:41:47Z
parent: stimming-jdik
---

Tom: the lab did not update in real time when moving the Y values; make the configurators clean and easy to test.

## Summary of Changes
- Size and place knobs (popScale, flashScale, iconY, restScale, restY) hold the intro at their beat and follow the slider live.
- Timing knobs replay on release, and a new play replaces the running one at once; it no longer queues behind it.
- Toy, variety, signed-off, name in flash and sound notice changes replay at once. Reset and a label double-click show the reset value.
- The status line says Playing, Holding or Held at <beat>; Space plays from the start.
- Loop and Name in flash persist with the rest of the lab state.
