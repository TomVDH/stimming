---
# stimming-3s8z
title: 'Code health: modules, toy docs, TypeScript'
status: todo
type: epic
priority: normal
created_at: 2026-11-15T06:21:36Z
updated_at: 2026-11-27T07:19:52Z
parent: stimming-ft0e
---

Audit every toy and plan three strands for Tom: shared modules, a per-toy doc standard, TypeScript feasibility. Plan only; no toy code changes here. Each toy adopts a module in its own chat.

## Decisions for Tom

- Modules: order (audio and colour first, or the WebGL2 kit first); which new modules may exist (gl.js, voices.js, noise.js, pointer.js, bloomPass); nvg/tube.js to shared/.
- Toy docs: the section list; build tools/toydoc.py now or later.
- TypeScript: path (a) JSDoc + tsc checkJs; dev dependencies in the repo; Fog horn as pilot.
