---
# stimming-th6o
title: 'Star catalog: sticky full-star stop on the way in; a glide-in''s card waits 2 s after rest'
status: completed
type: task
priority: normal
created_at: 2026-11-25T00:40:28Z
updated_at: 2026-11-25T00:40:36Z
---

Tom, 2026-11-24: "make the zoom stick to full star -- only when zooming in repeatedly will we zoom in" and "the zoom in on init is SLOW and HEAVY -- ensure that the title card only shows 2s AFTER rest -- just like the switcher".

- [x] An inward gesture from farther out stops at the full star; its momentum is absorbed
- [x] A later, separate inward gesture of at least 0.25 goes on in
- [x] Opening and switch glides: the card plays 2 s after the view rests (measured: rest 12.8 s, card 14.7 s)
- [x] Grain hint made true (even over the frame)
- [x] Doc lines

## Summary of Changes

zoomBy holds an inward gesture at NOTCH (stick state, GAP 220 ms, PUSH 0.25). glideIn() marks the opening and switch glides; arrive() waits for rest (within 0.004 and slow) plus CARD_REST 2000 ms.
