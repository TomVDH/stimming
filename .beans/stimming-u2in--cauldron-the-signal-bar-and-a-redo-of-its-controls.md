---
# stimming-u2in
title: 'Cauldron: the Signal bar and a redo of its controls'
status: todo
type: task
created_at: 2026-11-17T08:54:07Z
updated_at: 2026-11-17T08:54:07Z
parent: stimming-a5rs
blocked_by:
    - stimming-hvtr
---

One of the first ten (Tom, 2026-11-17, epic stimming-a5rs). The toy takes the Signal bar and gets its controls and menus redone in the same pass, clean and neat.

First read of what to redo: + Thing sits beside an Add list: say once what adds. Eleven Dev rows need groups.

Tom, 2026-11-17: retain the colour icons for the ingredients. Done in Bar v3: each ingredient keeps its own colours, also under the white box.

Tom, 2026-11-17, for the Cauldron chat: "add more ingredients -- including forbidden and witchy -- and bizarre ones". No Cauldron chat is on this machine, so the message is not sent; Tom has the text.

## Checklist

- [x] List every control and what it does (from the spec, the toy doc and close-up stills of the real page; not a hands-on play session)
- [x] Check it against the eight points in stimming-a5rs
- [x] Propose the redo to Tom before any change (2026-11-17, below); Tom rules
- [ ] Apply the redo to the toy's `bar` spec
- [x] Switch the toy to the Signal bar: `signal: true` (2026-11-17, with stimming-hvtr)
- [ ] 1280 px, 375 x 812 and 812 x 375; clean console
- [ ] The toy's doc in `docs/toys/` says what is true

## Review of 2026-11-17: controls, labels, help and copy (proposal; nothing is changed)

| # | Today | Finding | Proposal |
|---|---|---|---|
| 1 | Add list: headings Mix, Things, Liquids | The heading Mix stands over one tile that also says Mix. | Mix stands alone at the head of the list with no heading. |
| 2 | `+ Thing` (T) | It adds the pick. With Cream picked it pours, and the label still says Thing. | The label names the pick: `+ Carrot`, `+ Cream`, `+ Mix`. |
| 3 | `Clear` (C) | It drains the pot and fills it with fresh broth. The shared verb fits. | Keep. |
| 4 | `Fire` slider | Clear. | Keep. |
| 5 | Settings: Simmer sound, Quality, Reset | In order, three rows. Reset is in Settings because Clear is on the bar. | Keep. |
| 6 | Dev: 11 rows in one list | No groups; long labels repeat "Fire" and "Camera". | Three groups: Look (Exposure, Bloom, Background blur), Camera (Height, Turn), Fire (X, Z, Height, Size, Power, Spread). |
| 7 | Help: `DRAG stir or pour`, `DRAG A THING pull`, `CLICK add or dunk`, `← → stir` | "or pour" and "or dunk" do not say when. The key rows read `T + thing`, `C clear`. | `DRAG stir; pours a liquid`, `DRAG A THING pull it`, `CLICK throw in; dunks a thing`, `← → stir`, `T throw in the pick`, `C empty the pot`. |
| 8 | Intro copy | No Flemish name, no IPA, no motto. | Tom sets them. |
| 9 | Stage label for screen readers | Says "click or tap adds the next thing" and names ten things; the list now holds 21 and a pick. | Rewrite it from the list. |

Tom, 2026-11-17: review all controls, labels, help and copy per toy before the next toy. This table is that review for Cauldron.
