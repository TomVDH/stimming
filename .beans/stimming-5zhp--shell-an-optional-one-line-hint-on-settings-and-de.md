---
# stimming-5zhp
title: 'Shell: an optional one-line hint on settings and Dev rows, shown as the row''s tooltip'
status: in-progress
type: task
priority: normal
created_at: 2026-11-24T21:57:23Z
updated_at: 2026-11-24T21:58:06Z
---

Tom, 2026-11-24: "a tooltip as to what they do would be nice" (on Solar loop's Dev post rows). A shared change: an optional `hint` field on any settings or Dev row. Bar v3 (`shared/signal.js`) and the Bar v2 sheet (`shared/stim.js`) set it as the row's tooltip. Rows without a hint keep today's behaviour (Dev rows keep their label as the tooltip). Solar loop is the reference: its post rows already carry hints.

- [x] JSDoc: `hint` on RowBase
- [x] Bar v3: Dev rows and settings rows show the hint as their tooltip
- [x] Bar v2 sheet: the same
- [ ] PR, code review, Tom merges
- [x] Check on Solar loop with ?dev
