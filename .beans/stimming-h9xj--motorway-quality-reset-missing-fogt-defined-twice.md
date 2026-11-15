---
# stimming-h9xj
title: 'motorway: quality reset missing; fogT defined twice'
status: todo
type: bug
created_at: 2026-11-15T07:10:41Z
updated_at: 2026-11-15T07:10:41Z
parent: stimming-3s8z
---

A new quality choice does not reset the slow-frame step (`onQuality` misses it). `fogT` is defined twice: in `COMMON` (:383) and in the sprite shader (:824). Found by the modularization audit. Fix in this toy's own chat.
