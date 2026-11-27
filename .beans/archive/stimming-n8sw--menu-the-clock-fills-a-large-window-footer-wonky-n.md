---
# stimming-n8sw
title: 'Menu: the Clock fills a large window; footer wonky-note line'
status: completed
type: task
priority: normal
created_at: 2026-11-18T03:57:03Z
updated_at: 2026-11-18T04:07:05Z
---

Tom, 2026-11-17: on a 2560x1440 screen the Clock caps at 660 px and a black band shows under the footer.

- [x] Raise the dial cap so it grows with the window height
- [x] Pin the footer and its glow to the bottom edge
- [x] Footer line above the chip: "Some of these are very wonky and may suffer from *ss performance." Order: note, chip, Made with AI.
- [x] docs/menu.md lines match
- [x] Check at 2560x1440, 1280x800 and 375x812 (headless, the phone with the deploy wrapper)

## Also (Tom, 2026-11-17)

- [x] No flash of the plain shelf: the view script and clock.css load in the head
- [x] All menu motion at 30 fps: the tube and glow loops step at 30 fps (GSAP was already 30)

## Also (Tom, 2026-11-17, later)

- [x] Phone portrait: a grid of three with names, Re-roll under it, blur fade-in on load and Re-roll
- [x] Quips: lower-case mono, a faded dash between; "made with the help of AI"
- [x] Above the phone size, the dial and the footer share the window height; no page scrolls (2560x1440 to 1280x640 checked)

## Summary of Changes

- The Clock fits the window above phone size: dial and footer scale with the height; footer on the bottom edge.
- Phones in portrait: a grid of three with names, Re-roll under it, blur fade-in.
- View script and clock.css load in the head (no flash of the plain shelf).
- Tube and glow loops step at 30 fps.
- Footer quips in lower-case mono with a faded dash; made with the help of AI.
