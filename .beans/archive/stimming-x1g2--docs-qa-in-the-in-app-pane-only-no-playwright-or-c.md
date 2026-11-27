---
# stimming-x1g2
title: 'Docs: QA in the in-app pane only, no Playwright or Chrome'
status: completed
type: task
priority: normal
created_at: 2026-11-24T06:38:58Z
updated_at: 2026-11-24T06:39:04Z
---

Tom, 2026-11-23: 'stop spawning Chrome, why are you doing that', then 'yes, update it' to changing the QA standard. Checks run in the in-app browser pane on the one dev server; no Playwright, Chrome or Edge, headless or not.

- [x] Rewrite the QA section of docs/standards/process.md
- [x] Mark the Playwright tools as Tom's-ask only

## Summary of Changes

The QA section of docs/standards/process.md now says: check in the in-app pane on the one dev server; never launch Playwright, Chrome or Edge. The Playwright tools (stills, loops, load times, clouds check) run only when Tom asks. The dev server row says one server only. The interview and audit files stay as history.
