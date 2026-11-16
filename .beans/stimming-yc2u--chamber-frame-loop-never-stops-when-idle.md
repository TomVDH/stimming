---
# stimming-yc2u
title: 'chamber: frame loop never stops when idle'
status: todo
type: bug
created_at: 2026-11-15T07:10:42Z
updated_at: 2026-11-15T07:10:42Z
parent: stimming-3s8z
---

The frame loop never stops when the page is idle. Breaks the rule: idle pages do no per-frame work. Found by the modularization audit. Fix in this toy's own chat.
