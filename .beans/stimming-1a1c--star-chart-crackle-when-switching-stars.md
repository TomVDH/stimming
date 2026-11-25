---
# stimming-1a1c
title: 'Star Chart: crackle when switching stars'
status: in-progress
type: bug
created_at: 2026-11-25T08:50:17Z
updated_at: 2026-11-25T08:50:17Z
parent: stimming-e35i
---

Tom, 2026-11-25: "crackle in between switching stars still".

Cause, measured offline in the pane: a stopped choir that stays connected costs as much as a live one (four dead Cygnus X-1 choirs: 83 % of the audio budget; disconnected: 1 %). Each switch left the old choir connected, so the load grew with every switch. One choir alone costs 25 to 82 %.

- [x] The old voice disconnects when its fade ends; mute drops every voice
- [x] The full 5 s crossfade stays (Tom: a fast 0.3 s cut was too abrupt)
- [x] Dead choirs: four cost 83 % of the audio budget connected, 1 % disconnected
- [x] Pushed (Tom: finish up)
- [ ] Tom decides on the 5 s overlap: two heavy choirs together still pass the budget
