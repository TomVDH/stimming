---
# stimming-jtdi
title: 'East Van Alley: the pole mirrors the sky too much and looks waxy'
status: completed
type: bug
priority: normal
created_at: 2026-11-22T08:53:21Z
updated_at: 2026-11-22T08:54:08Z
parent: stimming-guw5
---

Tom (2026-11-22 00:49): the pbr on the pole is reflecting the sky too much and looks waxy.

Cause: the sky mirror term used full Schlick Fresnel at grazing angles for every roughness. Looking up, most of the pole is at grazing angles, so rough wood mirrored up to 44 percent of the sharp sky.

- [x] Roughness-aware sky reflection: Karis split-sum fit, blurred sky on rough faces
- [x] Tom's look on the before and after (00:53: keep)
- [x] Commit

## Summary of Changes

The sky mirror term in shade() now uses Karis's fitted split-sum term and blurs the sky toward the fill colour on rough faces. Rough wood at grazing angles mirrors about 3.5 percent of the sky, down from 44 percent. Galvanised steel stays a mirror.
