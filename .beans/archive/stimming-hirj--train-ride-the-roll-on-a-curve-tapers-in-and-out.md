---
# stimming-hirj
title: 'Train ride: the roll on a curve tapers in and out'
status: completed
type: task
created_at: 2026-11-18T01:46:00Z
updated_at: 2026-11-18T01:46:00Z
---

Tom, 2026-11-17: "can any sloping on the track that gets translated to the FPV be made gentle and tapered right now v sudden".

## Summary of Changes

The cant (the carriage's roll on a curve, which reads as a slope in the side window) and the view's swing followed the curvature at once, with a hard clamp. They now ease toward their target over about 2 s and meet the 0.06 rad limit softly (tanh). A jump (hold, first frame) still snaps. Checked headless: the page loads with a clean console. Not checked: the feel in motion on a real GPU.
