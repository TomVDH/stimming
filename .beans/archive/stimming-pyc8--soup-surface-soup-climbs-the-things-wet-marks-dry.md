---
# stimming-pyc8
title: 'Soup surface: soup climbs the things, wet marks dry down'
status: completed
type: task
created_at: 2026-11-16T16:31:59Z
updated_at: 2026-11-16T16:31:59Z
parent: stimming-fskg
---

Tom picked it (2026-11-16, idea 4 of the fidelity list). Branch claude/cauldron-soup-0a7547.

## Summary of Changes

shadeThing: a thin soup film climbs each thing at the waterline (0 to 13 mm), with a lit lip at its top. stepBodies tracks b.dunk, the deepest recent bob, drying down at 2 cm/s; the wet band above the waterline is soup-tinted and glossy. The mark rides in the quaternion's w slot (w kept positive, rebuilt in the shader by qw()), so the uniform array does not grow.
