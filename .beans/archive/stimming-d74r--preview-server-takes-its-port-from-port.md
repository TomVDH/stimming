---
# stimming-d74r
title: Preview server takes its port from PORT
status: completed
type: bug
priority: normal
created_at: 2026-11-03T20:53:06Z
updated_at: 2026-11-03T20:53:38Z
parent: stimming-avdk
---

The preview config hardcodes port 8000. A plain http.server from a shell has held that port since 2026-11-02, so preview_start fails with Address already in use.

- [x] launch.json reads PORT and falls back to 8000
- [x] preview_start opens Glass with the other server still running
- [x] Commit through a private index and push

## Summary of Changes

- The preview server reads PORT and falls back to 8000.
- When 8000 is taken, the app assigns the next free port. Today that is 8001.
- The shell server on 8000 stays up. It serves the parent folder, so Glass is at /stimming/glass/ there.
