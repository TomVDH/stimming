---
# stimming-q6zb
title: 'Spark wheel: menu icon and intro emblem'
status: in-progress
type: task
priority: normal
created_at: 2026-11-15T06:58:02Z
updated_at: 2026-11-15T07:00:40Z
---

Tom (2026-11-14): "lets get an icon going too". The menu icon is still the old flat wheel; the toy now has a holed roller on a fork, eight spark types and a rim that heats.

- [x] Icon spike 1: four directions with emblems (icons/spike-spark-1.html)
- [ ] Tom picks a direction
- [ ] Install the pick on the menu (index.html, the toy's enter/move/leave hook)
- [ ] Emblem to shared, toys.json emblem, icons/picks.json note

## Notes

- 2026-11-14, spike 1. A: on its mount (three-quarter view, cold at rest). B: close on the flint. C: face on. D: the hot wheel (glows at rest; each flare changes the spark type). In all four a pointer sweep flicks the wheel, spin throws sparks and heats the rim, a full heat flares. Checked in the pane: no error, sparks and flare seen at 256, 128 and 64, no DOM change once at rest.

- 2026-11-15: Tom could not see the intro logos. The app's file view opens the page as a data: document, so the emblem files did not resolve. The spike page now carries each emblem inside the page; the files stay for the install.
