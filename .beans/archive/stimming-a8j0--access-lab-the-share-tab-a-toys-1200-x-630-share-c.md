---
# stimming-a8j0
title: 'Access lab: the Share tab, a toy''s 1200 x 630 share card on the bench'
status: completed
type: task
priority: normal
created_at: 2026-11-25T19:14:03Z
updated_at: 2026-11-25T19:19:52Z
parent: stimming-0cau
---

Tom, 2026-11-25: "Yes, build it" (the share-card look from docs/qa/share-cards/preview.html). Spec: stimming-s4zf.

- [ ] The card in one module: accesslab/share-card.js
- [ ] A Share panel: accesslab/panels/share.js, in desk.config.js
- [ ] The sample page reads the module
- [ ] The Galaxy disk: the tile cut keeps the shared defs visible (Icon, Intro, Share)
- [x] Docs: accesslab/TEMPLATE.md, docs/plans/access.md

## Summary of Changes

- accesslab/share-card.js draws the card: the still left, blurred 2.5 px, a sparse dither and a dithered arc edge; the emblem as a luminance mask in white (Tom: not the gradient); the title with the tech badges beside it; the motto in B612; the lab line and the rainbow wordmark on one foot row; a faint accent mesh in the bottom-right corner.
- accesslab/panels/share.js shows it scaled to the tab; desk.config.js lists it.
- docs/qa/share-cards/preview.html draws eight samples from the module.
- The tile cut in the Icon and Intro tabs keeps the menu's shared defs visible, so Galaxy's disk draws.
- access-data.js exports TAG and TAG_NAME for the badges.
- Checked in the browser: eight toys, one-line titles, badges on the title's centre line, nothing past the margins.
- Open in stimming-s4zf: the generator script, og:image tags, and publishing the cards.
