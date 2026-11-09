---
# stimming-2s6y
title: WebGPU where possible
status: todo
type: epic
created_at: 2026-11-09T19:01:55Z
updated_at: 2026-11-09T19:01:55Z
---

Tom (2026-11-09): offer WebGPU wherever it helps performance. three.js WebGPURenderer falls back to WebGL2 by itself, so a three.js toy can switch with one renderer change. Raw WebGL2 shader toys move only where compute (particles, fluids, cellular sims) pays off. One toy at a time, Tom picks, with first-frame and fps numbers before and after at 1280 px and on a phone. Guide: docs/stack.md.
