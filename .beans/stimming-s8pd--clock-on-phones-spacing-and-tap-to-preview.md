---
# stimming-s8pd
title: 'Clock on phones: spacing and tap to preview'
status: completed
type: bug
priority: normal
created_at: 2026-11-17T01:20:45Z
updated_at: 2026-11-17T01:31:03Z
---

Tom (2026-11-16): the Clock menu needs phone spacing, and on a phone nobody can see the hover effects.

- [x] Phone spacing for the Clock view
- [x] Touch: first tap previews the toy (tube, wedge, icon), second tap opens
- [x] Check at 320 x 568, 390 x 664, 412 x 839, 750 x 342

## Summary of Changes

- clock.css: in portrait up to 640 px the dial keeps 24 px clear of each edge; the pad and the gaps open up.
- clock.css: the tube's plate is never wider than the window. It stuck out 18 px on a phone, so the page panned sideways.
- clock.js: on touch the first tap on a toy focuses it (tube, wedge, icon motion); a second tap opens it; a tap away puts it down. The check reads the focus from before the tap, since Chrome focuses a link on the tap.
- Checked in headless phone emulation: iPhone SE, iPhone 13, iPhone 13 landscape, Pixel 7. No sideways overflow; all four tap steps pass.
