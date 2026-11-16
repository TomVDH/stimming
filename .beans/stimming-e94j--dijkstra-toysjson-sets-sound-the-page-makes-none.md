---
# stimming-e94j
title: 'Dijkstra: toys.json sets sound, the page makes none'
status: todo
type: bug
created_at: 2026-11-16T08:55:16Z
updated_at: 2026-11-16T08:55:16Z
parent: stimming-3s8z
---

Found in the code-health port (stimming-f4rc), 2026-11-16.

toys.json sets sound: true for dijkstra, so the shell shows a Sound button. The page makes no audio context: the button toggles and does nothing. docs/plans/dijkstra.md planned sound through audioKit().

Tom decides: build the sound, or set sound: false. Fix it in Dijkstra's own chat.
