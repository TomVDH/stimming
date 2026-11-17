---
# stimming-5mjy
title: 'Menu tube: a better CRT look, one effect at a time'
status: completed
type: task
priority: normal
created_at: 2026-11-16T18:37:31Z
updated_at: 2026-11-16T19:14:20Z
---

Tom, 2026-11-16: "redo the crt effects a bit better too -- introduce a slight fade though".
Tom's picks: scan lines and mask first; the fade is a phosphor afterglow.

## Checklist

- [ ] Scan lines and phosphor mask that read clearly; bright parts bloom across them.
- [x] Tom looks at it; commit and push.
- [ ] Phosphor afterglow: moving parts leave a short fading trail.
- [x] Tom looks at it; commit and push.

## Summary of Changes

- Scan lines snap to whole device pixels, with darker gaps; the RGB aperture grille is stronger at even light; the grain is lighter.
- Phosphor afterglow: a second pass keeps the brighter of this frame and the last, faded per colour (red 0.09 s, green 0.07 s, blue 0.055 s). Frames run 0.35 s after motion stops; a clear drops the trail; reduced motion has none.
- Tom approved both on 2026-11-16.
