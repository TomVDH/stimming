---
# stimming-lcp9
title: 'Design foundations: product record, design record and design tools'
status: in-progress
type: task
priority: normal
created_at: 2026-11-16T08:34:26Z
updated_at: 2026-11-16T09:42:47Z
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
- [x] Sort the 23 drift rows into three piles: fix now (6), keep (9), needs Tom's ruling (8 rows in 5 questions)
- [x] Measure row 20: sheet section labels are about 3.8:1 and action keycaps about 2.8:1; both are under 4.5:1
- [x] Offer three North Star lines from Tom's recorded rulings
- [x] Propose the type, spacing and radius scales as tokens (`--text-*`, `--space-*`, `--radius-*`)
- [ ] Tom rules on the five questions
- [ ] Tom approves the token proposal
- [ ] Add the tokens to `shared/stim.css` with no change to any page; update `DESIGN.md` and `.impeccable/design.json`
- [ ] Record each ruling in `DESIGN.md` with its date
- [ ] Verify (Bar v2 test, screenshots before and after), then open the PR against `main`
