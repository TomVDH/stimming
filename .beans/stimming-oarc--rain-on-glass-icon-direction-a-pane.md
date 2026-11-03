---
# stimming-oarc
title: 'Rain on glass icon: direction A (Pane)'
status: completed
type: task
priority: normal
created_at: 2026-11-03T20:06:49Z
updated_at: 2026-11-03T20:10:35Z
parent: stimming-io49
---

Tom's verdict in icons/picks.json: Rain on glass takes direction A from icons/spike-2.html.

- [x] Port A's art and pointer hover into the Rain tile and toys.rain in index.html
- [x] Copy icons/spike/emblems/rain-a.svg to shared/emblems/rain.svg
- [x] Set emblem for rain in toys.json
- [x] Menu loads with a clean console; the hover runs
- [x] Commit own hunks through a private index and push

## Summary of Changes

- The Rain tile shows direction A: a shaded pane over blurred street lights, with ten beaded drops.
- Hover releases each drop the pointer touches. The drop runs to the sill with a trail and beads back. Focus runs the big drop.
- The bokeh paints through a pattern, so the icon frames to the pane (viewBox 0 0 128 128, as Chladni).
- shared/emblems/rain.svg is rain-a.svg. toys.json sets it as the rain emblem.
- Commit 402ca43 (another session) swept in the first port; the follow-up commit holds the frame fix, emblem and bean.
