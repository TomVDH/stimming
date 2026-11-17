---
# stimming-6ayf
title: 'Fonts: the other pages drop the Google Fonts link'
status: completed
type: chore
priority: normal
created_at: 2026-11-17T03:10:53Z
updated_at: 2026-11-17T03:12:39Z
---

Tom, 2026-11-16: "Yes, all pages". About 240 pages still link Google for Gabarito. The link blocks their first paint.

- [x] `shared/fonts/fonts.css` holds the four font rules
- [x] Pages on `stim.css` or `intro.css` lose the link
- [x] Other pages link `shared/fonts/fonts.css` in its place
- [x] Frietkot keeps Google for Tilt Neon and Courgette only
- [x] Check in the browser, commit, push, check the live site

## Summary of Changes

243 pages lose the Google Fonts link. 130 are on the shell and need no link. 113 link `shared/fonts/fonts.css`.
Frietkot and `icons/spike-frietkot-1.html` keep Google for Tilt Neon and Courgette. The intro lab keeps its loader for trial faces.
Checked twelve pages in the browser: Gabarito loads from the repo on each.

## Follow-ups

- Tilt Neon and Courgette in the repo: a download, so it needs Tom's yes.
