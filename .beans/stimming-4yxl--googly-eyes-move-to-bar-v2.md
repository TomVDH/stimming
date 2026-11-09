---
# stimming-4yxl
title: 'Googly eyes: move to Bar v2'
status: completed
type: task
priority: normal
created_at: 2026-11-09T09:09:55Z
updated_at: 2026-11-09T09:12:25Z
parent: stimming-80dc
---

Move `eyes/index.html` to Bar v2. Brief: docs/plans/bar-v2-migration.md. Epic: stimming-80dc.

## Control map

| v1 control | v2 slot | Why |
|---|---|---|
| Header (mark, back, sound) | Top left logo and name; top right sound | Shell standard |
| (new) Shuffle | Bottom left, shuffle verb (die icon) | Deals a new cluster without a reload |
| Shake | Bottom left, own verb | One word; Space shakes |
| Blink | Bottom left, own verb, key B on the chip | One word; B blinks all |
| (new) Quality | Settings sheet, Site row | Shell standard; the canvas follows it |
| How-to: move, circle, click, drag, Space | Key strip, four entries: click blink, drag move an eye, drag round dizzy, space shake | Four at most |

Visible controls: 3 of 5. No choice group.

## Checklist

- [x] Map controls (this table)
- [x] Diegetic check: none fits; the scene already owns blink, shake and dizzy
- [x] Port to one bar spec; delete dead markup and wiring
- [x] Fix bugs found on the way
- [x] Check in the pane at 1280 px and 375 px
- [x] Commit and push; tick eyes in stimming-80dc

## Summary of Changes

One bar spec replaces the header, the bar and the how-to. Shuffle deals a new cluster. B binds on the Blink chip. Quality joins Settings; the canvas follows it, and a slow frame steps down one tier. The opening ripple waits for the intro to go, so it is seen. Keys in a Settings sheet no longer blink or dizzy the eyes.

## Open

The key strip has no backing and cannot be read over the white eyes. Sent to the shell owner.
