---
# stimming-6ayf
title: 'Fonts: the other pages drop the Google Fonts link'
status: completed
type: chore
priority: normal
created_at: 2026-11-17T03:10:53Z
updated_at: 2026-11-17T03:18:40Z
---

Tom, 2026-11-16: "Yes, all pages". About 240 pages still link Google for Gabarito. The link blocks their first paint.

- [x] `shared/fonts/fonts.css` holds the four font rules
- [x] Pages on `stim.css` or `intro.css` lose the link
- [x] Other pages link `shared/fonts/fonts.css` in its place
- [x] Frietkot keeps Google for Tilt Neon and Courgette only
- [x] Check in the browser, commit, push, check the live site

## Summary of Changes

242 pages lose the Google Fonts link. 130 are on the shell and need no link. 112 link `shared/fonts/fonts.css`.
Frietkot and `icons/spike-frietkot-1.html` keep Google for Tilt Neon and Courgette. The intro lab keeps its loader for trial faces.
Checked twelve pages in the browser: Gabarito loads from the repo on each.

## Follow-ups

- Tilt Neon and Courgette in the repo: a download, so it needs Tom's yes.

## After the push

Commit `a9218f65` on `main` holds 242 pages. The live site is checked on seven pages.
`railgun/stormlab.html` keeps its Google link: the railgun cloud gate in `tools/commit.sh` holds that file.
`tools/clouds-check.mjs` fails on `main` as it is (the golden stills differ by 22% to 66%), with no cloud change from this bean.
That page needs a pass of the check or Tom's words after `look-approved:`.

## The gated page

Tom, 2026-11-16: "Yes, roll it". `railgun/stormlab.html` now links `shared/fonts/fonts.css`. The roll covers 243 pages.
