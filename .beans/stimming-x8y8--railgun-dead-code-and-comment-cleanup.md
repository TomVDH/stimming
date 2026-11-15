---
# stimming-x8y8
title: 'Railgun: dead code and comment cleanup'
status: todo
type: task
created_at: 2026-11-15T06:02:30Z
updated_at: 2026-11-15T06:02:30Z
parent: stimming-f793
---

QA, 2026-11-14. Static pass over railgun/index.html.

Never called or never read:
- makeRing: the shock-ring builder and its shader, about 30 lines
- audition: plays a shot take from the retired Shot row
- rimPt, SOOT_D, eyeP, sceneReady
- __qa.blastState and __qa.muzzle report rings: false

Comments:
- 416 comment lines run past twelve words.
- 18 carry history: old, for now, Tom's dates in code.
- The __qa comment at "Salvo: the rounds in flight" sits above slide(), far from rounds() and salvo().
- The muzzle comment sits above screenOf, not muzzleScreen.

The sound and effects sessions edit this file. Clean up after their branches merge.

## Checklist

- [ ] Remove the dead code after the sound and fx branches merge
- [ ] Move the two misplaced __qa comments
- [ ] Trim comments to twelve words where a pass touches them
