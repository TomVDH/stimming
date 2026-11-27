---
# stimming-kxmu
title: 'Shared: Fire''s smoke lighting in GLSL (smoke.js), Whiteout first'
status: completed
type: feature
created_at: 2026-11-23T21:29:53Z
updated_at: 2026-11-23T21:29:53Z
---


Fire's smoke light (shared/fire.js, volume()) as a GLSL bundle for raw WebGL2 and three.js. Eight toys carry the same five-line copy. Whiteout is the reference. Design: docs/plans/smoke.md.

- [x] Survey the GLSL copies (8 exact, 3 variants, 5 own cloud models)
- [x] Tom approves the design
- [x] shared/smoke.js with JSDoc and @ts-check; tests/smoke.test.mjs
- [x] Whiteout on the module: 0 pixels differ at four frozen states
- [x] three.js 0.170 ShaderMaterial compiles and draws it
- [x] Whiteout QA, npm run check, docs (shared/AGENTS.md, shared-kit, toy doc)
- [x] PR with /code-review (TomVDH/stimming#100; two nits fixed)
- [x] Merged on Tom's word (3d304369, 2026-11-23)
