---
# stimming-fibc
title: 'Intro: the new intro in the shell, on every toy'
status: completed
type: feature
priority: normal
created_at: 2026-11-25T19:59:22Z
updated_at: 2026-11-25T20:43:05Z
parent: stimming-0cau
---

Tom, 2026-11-25: "lets get this new intro made DEFAULT across ALL toys on main / non-lab now" and "ensure all toys have accessibility info". From the bench (accesslab Intro tab, stimming-9kze): the access row (Line), tech tags in the corner, the loader at the bottom centre on the tech tags row, the block placed as one piece (Centre), Signal title in caps and tighter, icon colour in every effect. Punch 1 in 10: stimming-z69r.

- [x] toys.json: access for every toy (audit from code), tech for every toy (tools/techtags.mjs --write); docs/standards/code.md field order
- [x] shared/access.js: glyph sprite, flags, tech tags (accesslab moving onto it: later)
- [x] shared/intro.js and intro.css: the Line row and its sound flash, tech corner, loader on the rail, block placement, reduced motion shows the row
- [x] Punch 1 in 10 in Signal look (stimming-z69r)
- [x] Verify: toys with and without access flags, a slow load, reduced motion, 375 px; console clean
- [x] Docs: shared/AGENTS.md, docs/plans/access.md
- [x] PR with /code-review (#108, no findings)
- [x] Follow-up bean: strobe gate and Calm (stimming-emro)

Notes: accesslab still reads its own access-data.js; moving it to shared/access.js is open. The audit is code reading; flash rates marked check in the agents' notes need the flash meter. Postcard has no folder: access and tech null.
