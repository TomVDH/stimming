---
# stimming-lcp9
title: 'Design foundations: product record, design record and design tools'
status: completed
type: task
priority: normal
created_at: 2026-11-16T08:34:26Z
updated_at: 2026-11-27T07:19:52Z
---


Tom, 2026-11-16: the project lacks design implementation for the Stimming brand. Install adjudant's design partners and record the product and design truth they read.

## Checklist
- [x] Install intent, ui-ux-pro-max, taste-skill and impeccable (user level; impeccable without hooks)
- [x] PRODUCT.md from AGENTS.md and Tom's answers (audience, content zone, authoring)
- [ ] genjutsu: no marketplace source in adjudant; Tom names it
- [x] DESIGN.md: record the incumbent visual system from shared/stim.css, the menu and the intro (with .impeccable/design.json)
- [ ] Tom names the Creative North Star (DESIGN.md, Overview)
- [ ] Tom rules on the 23 drift and gap rows in DESIGN.md: which to fix, which to keep
- [ ] Tom decides on the impeccable design hook for this project

## Companion chat: UI and design system (2026-11-16)

Branch `claude/bold-davinci-7fc18a`. Never push to `main`; Tom merges the PR after the MacBook work lands.

- [x] Baseline before any change: `tests/bar-v2.html` 108/108; screenshots and style digests of the menu and Galaxy at 1280 px and 375 px
- [x] Sort the 23 drift rows: fix now (5), keep (7), wait for the bar redo (7), needs Tom's ruling (4)
- [x] Measure row 20: sheet section labels are about 3.8:1 and action keycaps about 2.8:1; both are under 4.5:1
- [x] Offer three North Star lines from Tom's recorded rulings
- [x] Propose the type, spacing and radius scales as tokens (`--text-*`, `--space-*`, `--radius-*`): page values now, bar values after the redo
- [x] Tom, 2026-11-16: "we're completely redoing the style and ux of the bars". Recorded in `DESIGN.md` (Rulings). Bar rows and bar tokens wait for it
- [ ] Tom says where the bar redo runs (no session, branch or bean holds it today)
- [ ] Tom rules on the North Star, the menu's token block (rows 3 and 11) and the stage hue (row 14)
- [ ] Tom approves the token proposal
- [ ] Add the tokens to `shared/stim.css` with no change to any page; update `DESIGN.md` and `.impeccable/design.json`
- [ ] Record each ruling in `DESIGN.md` with its date
- [ ] Verify (Bar v2 test, screenshots before and after), then open the PR against `main`
