---
# stimming-unib
title: 'Toy desk: side rail for wide screens and the annex folded in'
status: completed
type: task
priority: normal
created_at: 2026-11-27T18:59:19Z
updated_at: 2026-11-27T19:07:59Z
---

Tom (2026-11-27): the annex lab needs work and better integration in the toy bench; the desk UI and menu need a clean-up and better wide-screen response. Picks: side rail from 1440 px; annex integrate only, no new title blocks.

- [x] Desk: sticky left rail from 1440 px (title, links, strip, head, tabs); panel fills the rest
- [x] Desk: top links and strip tidy
- [x] Annex tab: one tidy control group; frame fills the panel width and height
- [x] Annex tab: Sheet view from annexlab/sheet.html
- [x] annexlab/: parked note, linked from the tab
- [x] Check at 1920, 1440, 1280, 375

- [x] Tom looks at the desk on the bench, then commit

Note: Sheet frames come from annexlab/round2.html, which shows Glass only.

## Summary of Changes

- accesslab/index.html, desk.css, desk.js: a sticky left rail from 1440 px; the strip wraps and scrolls down there.
- accesslab/panels/annex.js: one control group (View, Transition, Title, Scroll); the frame fills the panel; a Live / Sheet view holds the old annex sheet.
- accesslab/desk.config.js: the Annex sheet link is gone.
- annexlab/: each page carries a parked note to the Annex tab.
