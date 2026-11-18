---
# stimming-jxxg
title: 'Shell: load watch, a visible and stored load step for heavy toys'
status: completed
type: task
priority: normal
created_at: 2026-11-18T04:21:33Z
updated_at: 2026-11-18T04:24:28Z
---

Tom, 2026-11-17: a stateful compile process that tells whether a load died; for every toy that needs it. Opt-in per toy.

- [x] shared/loadwatch.js: step note with seconds, stored step, last-run notice, fail text, GPU reset
- [x] CSS in shared/intro.css
- [x] Doc line in shared/AGENTS.md
- [x] Tornado alley first (stimming-kg00)

## Summary of Changes
shared/loadwatch.js: loadWatch(id, canvas) stores each named step at once and each second. A step over 1.5 s shows with its seconds at the top of the page. A stored step on the next open means the last load died: the page says where, and the toy can start lighter. fail() shows the error; a GPU reset shows as a failure. Tested headless: normal, died-last-time, slow compile (simulated), link failure (simulated).
