---
# stimming-vebz
title: 'Shell: opt-in async shader compile in environment()'
status: completed
type: task
priority: normal
created_at: 2026-11-18T03:59:03Z
updated_at: 2026-11-18T04:15:52Z
---

environment() compiles five programs at once on the main thread. Tornado alley freezes for seconds on open, and the intro cannot play. Add an opt-in async path that links through KHR_parallel_shader_compile. Other toys keep the sync path.

- [x] Async path in shared/environment.js, opt-in
- [x] Fallback without the extension
- [x] Doc line in shared/AGENTS.md (no line goes false; usage added to the file header)
- [x] Tom's yes (given 2026-11-17, plan approval)

## Notes
2026-11-17: on hold. Tom reports a whole-browser crash on open (Chrome, Safari, Arc, Firefox, the app pane). Not reproduced: headless Chrome and the app pane on the same M3 Pro run 50 s clean, no lost context, longest task about 200 ms. The crash comes first; see stimming-bykd.

## Summary of Changes
environmentReady(canvas, options) links the five programs through KHR_parallel_shader_compile and resolves when ready. environment() keeps the sync path; the two share startPrograms, finishProgram and runner.
