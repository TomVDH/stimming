---
# stimming-952n
title: 'Overview page: every toy and open idea at a glance'
status: completed
type: task
priority: normal
created_at: 2026-11-10T06:09:50Z
updated_at: 2026-11-10T06:17:15Z
---

A standalone dark page at overview/index.html (noindex, not linked from the menu). Built toys table with shelf, stage, series, Bar v2, Classic and status. Outstanding ideas grouped by kind with bean ids. Counts at the top.

- [x] Read sources (toys.json, index.html, series.json, beans, docs/plans, AGENTS open items, stimming-80dc, .remember)
- [x] Write overview/index.html
- [x] Check in the browser pane at 1280 and 375
- [x] Commit overview/ and this bean

## Summary of Changes

`overview/index.html` (noindex, unlinked) reads `toys.json`, `series.json` and the menu live for names, shelves, series, Classic and sign-off. Bar version, status lines and the Outstanding cards are a table in the page; refresh it when they change. Checked at 1280 and 375 px; console clean.
