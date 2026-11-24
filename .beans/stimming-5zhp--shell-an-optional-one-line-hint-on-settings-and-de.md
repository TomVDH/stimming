---
# stimming-5zhp
title: 'Shell: an optional one-line hint on settings and Dev rows, shown as the row''s tooltip'
status: completed
type: task
priority: normal
created_at: 2026-11-24T21:57:23Z
updated_at: 2026-11-24T23:47:10Z
---

Tom, 2026-11-24: "a tooltip as to what they do would be nice" (on Solar loop's Dev post rows). A shared change: an optional `hint` field on any settings or Dev row. Bar v3 (`shared/signal.js`) and the Bar v2 sheet (`shared/stim.js`) set it as the row's tooltip. Rows without a hint keep today's behaviour (Dev rows keep their label as the tooltip). Solar loop is the reference: its post rows already carry hints.

- [x] JSDoc: `hint` on RowBase
- [x] Bar v3: Dev rows and settings rows show the hint as their tooltip
- [x] Bar v2 sheet: the same
- [x] PR, code review, Tom merges (PR 104, merged 2026-11-24)
- [x] Check on Solar loop with ?dev

## Summary of Changes

An optional hint on any settings or Dev row. Bar v3 (shared/signal.js) shows a Dev row's tooltip as "Label: hint" and a settings row's as the hint; the Bar v2 sheet (shared/stim.js makeRow) sets it too. Rows without a hint keep their label. Star catalog's post rows were the first to use it.
