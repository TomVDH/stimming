---
# stimming-465y
title: 'Toy annex: the page under the stage'
status: todo
type: feature
priority: normal
created_at: 2026-11-09T09:37:22Z
updated_at: 2026-11-09T09:48:50Z
---

Wireframe the annex a visitor scrolls into under a toy's stage, and the transition into it. Successor to the parked section.about.

Lab: annexlab/index.html (noindex, stand-in stage, three directions). Data: docs/plans/annex.md.

## Checklist
- [x] Lab page with three directions
- [x] Data proposal
- [x] Stills at 1280 and 375 x 812 to Tom
- [x] Tom's pick recorded here

## Directions

- A · Recede: the fixed stage scales and dims; the annex rises as a sheet with a 12 px lip. Main column plus side rail.
- B · Dock: the stage scrolls away; logo and name dock as a header with Back. Sticky gallery label plus reading column.
- C · Cut: proximity snap; the title wipes in as a flash box. Spec sheet, version log, numbered credits.

All: corners fade in the first quarter; one exit progress drives everything (view timeline, JS fallback); whenVisible on the scene; reduced motion is a plain scroll. Detail and data: docs/plans/annex.md.

## Pick

Tom picked A · Recede (2026-11-09). The 12 px lip is the stage cue.

Bar v2 rule 4 amended (Tom, 2026-11-09): the page scrolls past the stage only into the annex.

Notes carry change and version only; sign-offs stay off the page (Tom, 2026-11-09).

## Round 2 (2026-11-16)

Tom: "another stab", "a couple more iterations", an Awwwards-inspired transition; the zone holds the making-of, the idea, notes and attribution; Claude drafts, Tom edits.

Lab: annexlab/round2.html, in the shell's own look, on the live Glass toy. Detail: docs/plans/annex.md.

- [x] A · Recede as the baseline, restyled
- [x] D · Drum: the stage and the zone as two faces of a drum
- [x] E · Placard: the accent label rides up and docks as the header
- [x] F · Tide: the series Wave floods up over the stage
- [x] One content kit: title block, idea, making of, notes, credits, also try
- [x] Checked at 1280 x 720 and 375 x 812; no sideways scroll; clean console
- [ ] Tom's pick, or a new deal (Lead figure, Flash cut, Mini-player, Tab stack)
- [ ] Real stills for the picture blocks

## Build (next)
- [ ] Annex shell in shared/ (fixed stage, sheet, exit timeline, JS fallback, reduced motion)
- [ ] annex.json loader and shared/credits.json
- [ ] Bar v2 bottom corners lift by the lip
- [ ] tests/bar-v2.html: the no-scroll check allows the annex, still fails on sideways scroll
- [ ] One toy first; Tom picks which
