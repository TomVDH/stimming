---
# stimming-d6wc
title: 'Railgun: one depth-aware cloud pass (cloud layer and redone storms)'
status: in-progress
type: task
priority: normal
created_at: 2026-11-17T06:20:46Z
updated_at: 2026-11-17T06:35:40Z
parent: stimming-626s
---

Tom, 2026-11-16: clouds do not occlude or layer on one another; the storm clouds need a redo (shapes, better graphics, slow drift); the cloud layer must sit flat in true perspective. Start fresh after the TypeScript refactor (Tom: nothing ported from the parked patch; docs/plans/railgun-cloud-layer.patch and docs/plans/railgun-cumulus.js stay as reference).

Plan: docs/plans/railgun-cloud-layer.md

- [ ] Plan approved by Tom
- [x] Step 1: one march, the heap shell only, with per-pixel depth; built (clouds/pass.ts, clouds/layer.glsl, Dev row Cloud volumes), waits for Tom's look
- [x] Step 2: the storms move into the same march; segments join front to back by distance; storm cards hide (Tom: "Yes, commit it")
- [ ] Step 3: storm redo: shapes and look
- [ ] Step 4: drift for layer and storms
- [ ] Step 5: blast, bolt, rock and lightning light
- [ ] Step 6: Tom approves; cards retire
