---
# stimming-xcs8
title: 'Spike: renderer inventory and default stack types'
status: completed
type: spike
priority: normal
created_at: 2026-11-15T06:39:57Z
updated_at: 2026-11-15T06:44:26Z
parent: stimming-3s8z
---

Tom: list which toys run on three.js, raw GLSL, Canvas 2D, WebGPU; record every mismatch; propose four or five default stack types a new toy picks from. Write docs/plans/stack-types.md and update the audit in docs/stack.md. Recommend only; port nothing.

- [x] Inventory every toy (renderer, three version, libraries, importmap, shell, fallback)
- [x] Flag mismatches
- [x] Define the stack types
- [x] Map every toy to a type
- [x] Update docs/stack.md

## Summary of Changes

Wrote docs/plans/stack-types.md: counts per renderer (88 toys: 42 three.js WebGL, 36 raw WebGL2, 6 Canvas 2D, 3 three.js WebGPU, 1 DOM), nine mismatch kinds, five proposed stack types (Sketch, Shader, Environment, Scene, Compute) with importmap, shared modules, budget and a reference toy, and a per-toy inventory with a proposed type. Updated the audit in docs/stack.md and linked it. Ported nothing.
