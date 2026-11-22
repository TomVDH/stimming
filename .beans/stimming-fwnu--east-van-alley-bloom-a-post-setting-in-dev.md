---
# stimming-fwnu
title: 'East Van Alley: bloom, a Post setting in Dev'
status: completed
type: task
priority: normal
created_at: 2026-11-22T09:59:42Z
updated_at: 2026-11-22T10:02:57Z
parent: stimming-guw5
---

Tom (2026-11-22 01:50): add bloom.

- [x] Split the composite: linear frame to a float target, then the grade and the tone map
- [x] Bloom chain after Jimenez 2014: six 13-tap downsamples (Karis average on the first), tent upsamples summed
- [x] Dev, Post: Bloom 0 to 1, default 0.4 (mixes in 4.8 percent)
- [x] Bloom 0 matches the old frame (max 1/255); the chain costs about 0.8 ms at 2 Mpx
- [x] Tom's look (02:02: keep)
- [x] Commit

## Summary of Changes

The composite writes linear light to a float target. A six-level bloom chain (13-tap downsamples, Karis average first, tent upsamples) runs on it. The output pass mixes the bloom in, then grades and tone-maps as before. Dev, Post, Bloom sets the mix.
