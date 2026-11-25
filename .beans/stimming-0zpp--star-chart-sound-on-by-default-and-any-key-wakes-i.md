---
# stimming-0zpp
title: 'Star Chart: sound on by default, and any key wakes it'
status: completed
type: bug
priority: normal
created_at: 2026-11-25T09:10:13Z
updated_at: 2026-11-25T09:11:05Z
parent: stimming-e35i
---

Tom (2026-11-25): sound seems to need a cycle of the mute button; turn it on by default; a boot without sound must mute properly.

Cause: audioKit wakes only on Space or a click, so I, L, S and the zoom keys leave the context asleep. Sound also starts off until a stored on exists.

- [x] Sound on when nothing is stored; a stored mute holds
- [x] Any key wakes the audio
- [x] Check in the pane
- [x] Fix the doc lines; commit and push

## Summary of Changes

- `starchart/main.js`: with no stored choice, sound starts on; a stored mute holds.
- `audioKit` takes no key filter here, so any key wakes the context (it woke only on Space or a click).
- Pane check: fresh boot, sound on, L gives a running context; stored mute, L and Space make no context at all.
- AGENTS.md rule 10, code.md, PRODUCT.md and the toy doc name the Star Chart exception.
