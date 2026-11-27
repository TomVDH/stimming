---
# stimming-6o16
title: 'Fire: Fuel tray runs off narrow phone screens'
status: completed
type: bug
priority: normal
created_at: 2026-11-03T21:49:19Z
updated_at: 2026-11-03T21:55:52Z
parent: stimming-cyhy
---

At 375px the hidden Fuel tray ends at 390px, past the screen edge. The page gains a sideways scroll and the open tray clips.

- [x] The open tray fits at 320, 375 and 430
- [x] The page has no sideways scroll on phones
- [x] Wider screens keep their columns

## Summary of Changes

The Fuel tray takes two columns at 420px and below, three to 520px, and four above. Both trays hang from the bar up to 720px, which also stops the Settings tray running off screen from 521px to about 690px. A slimmer Settings tray serves 340px and below. Page width matched the viewport at every tested width from 320 to 1280, with Magnesium, the longest fuel name, picked.
