---
# stimming-slah
title: 'Shared: shared/clouds.js, cloud phase and light shafts (Railgun, East Van Alley)'
status: in-progress
type: task
priority: normal
created_at: 2026-11-22T18:43:57Z
updated_at: 2026-11-22T19:12:21Z
parent: stimming-ssrh
---

Tom, 2026-11-22: Railgun's cloud and shadow shafts in East Van Alley; the heavy 3D toys carry too many scattered, non-reusable copies of the same rendering.

shared/clouds.js holds cloud light as GLSL strings and a small JS helper. The shaft look is shared; the occlusion source is per toy. A shared/ change: worktree branch feature/<this id> and a PR.

## Checklist

- [x] Bean and feature branch
- [x] shared/clouds.js: clPhase (two-lobe HG 0.72, -0.2, 0.35)
- [x] shared/clouds.js: shaft look (veil, low-sun gate, cool then dim shade, sunward glow)
- [x] shared/clouds.js: baked 3D density occlusion source
- [ ] Typing and include helper for three.js and TypeScript
- [ ] Railgun adopts it, same frame (tools/clouds-check.mjs)
- [ ] East Van Alley adopts it: shafts from the baked field, Dev slider for strength
- [ ] East Van Alley checked at dawn, late afternoon, dusk; sun as is and Dev Sun bearing 180
- [ ] Before-and-after sheets to Tom
- [x] docs/plans/shared-shaders.md light-shafts row updated
- [ ] PR with /code-review, merged

## Later adopters

- Window seat (window/shader.js:1349 two-lobe phase copy)
- Tornado alley (tornado/main.js:477 two-lobe phase copy)
