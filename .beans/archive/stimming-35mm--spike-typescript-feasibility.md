---
# stimming-35mm
title: 'Spike: TypeScript feasibility'
status: completed
type: spike
priority: normal
created_at: 2026-11-15T06:21:47Z
updated_at: 2026-11-15T06:31:45Z
parent: stimming-3s8z
---

Write docs/plans/typescript.md: compare JSDoc + tsc checkJs, esbuild or tsc in Pages, and Vite. Recommend one path, a migration order and a one-toy pilot. Convert nothing.

- [x] Measure inline scripts and CDN types
- [x] Compare the three paths
- [x] Write docs/plans/typescript.md

## Summary of Changes

Wrote docs/plans/typescript.md. About 134k lines of toy code sit inline in HTML, which tsc cannot read. Recommends path (a): JSDoc types and tsc --noEmit with checkJs over shared/ first, no build step, importmap and Pages unchanged. Pilot: foghorn. Needs Tom: dev dependencies in the repo count as a new tool.
