---
# stimming-zchj
title: 'Loading, round two: fonts in the repo, the Lab out of the menu, a sign at the click, Fire''s load line'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-17T01:26:22Z
updated_at: 2026-11-17T01:48:48Z
---

Tom (2026-11-16): yes to all four follow-ups of stimming-qof2. One branch, one PR. Tom merges.

- [x] Fire: real progress on its load line (buildSteps)
- [x] Fonts in the repo: the menu, the shared shell and Window seat. 240 toy pages still link Google's style sheet for Gabarito; the roll waits for Tom's word.
- [ ] The Lab's markup moves out of index.html: tried and set aside, see Findings; Tom decides
- [x] A loading sign on the menu at the click: the intro's hairline under the clicked icon
- [x] Checks: console clean on the menu (Clock, ?all), Fire and Window seat; the click sign at 1280, 375 x 812 and with reduced motion. Not checked: 812 x 375, no JS (the sign needs JS; without it the menu is as before).
- [x] Docs: AGENTS.md, docs/plans/loading.md
- [x] PR open: https://github.com/TomVDH/stimming/pull/68

## Findings: the Lab split (2026-11-16)

Measured on index.html at 39327ce3, gzip: the page is 148 kB. The head and the main shelf are 41 kB, the Lab's markup is 27 kB (18%), the icon script is 72 kB (48%).
The follow-up in stimming-qof2 said 58 kB for the Lab; that number was wrong for today's page.

- Tried: the Lab's shelf in lab/shelf.html, fetched at ?lab only. The Clock then fails: the icon script draws Lab icons at load and throws when their elements are missing.
- The icon script is 4450 lines with about 80 element lookups; main and Lab code are mixed. A split means a refactor of a block that every toy chat edits.
- The gain: 27 kB is about 0.14 s on a slow 4G link and nothing on a fast one.
- Reverted. Recommendation: do not split the markup alone. The real target is the icon script; that is its own feature.
