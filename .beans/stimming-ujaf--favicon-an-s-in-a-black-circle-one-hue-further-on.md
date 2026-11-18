---
# stimming-ujaf
title: 'Favicon: an S in a black circle, one hue further on each load'
status: completed
type: task
priority: normal
created_at: 2026-11-18T00:55:57Z
updated_at: 2026-11-18T01:00:27Z
parent: stimming-zy58
---

Tom, 2026-11-17: "an S in a black circle that rotates through the colours upon reload as a favicon". Colours: the full hue wheel (Tom's pick), twelve steps.

- [x] shared/favicon.js draws the S in Gabarito on a canvas; the step lives in localStorage
- [x] shared/stim.js imports it, so every shell toy page has it
- [x] The menu (index.html) loads it

## Toy favicons (Tom, 2026-11-17 17:02)

- [x] Tom, 17:07: a toy page shows its full-colour menu icon instead. tools/favicons.mjs renders each menu icon at rest to shared/favicons/<id>.png (64 px). Re-run it after a menu icon changes. The menu keeps the S.
