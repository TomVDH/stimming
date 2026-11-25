---
# stimming-xath
title: 'Intro: fitIntro measures the badge mid-pop on a cold load'
status: completed
type: bug
created_at: 2026-11-25T05:31:00Z
updated_at: 2026-11-25T05:50:00Z
---

If fonts finish during the pop beat, fitIntro reads the badge at scale ~3.4, finds no room and drives --copy-k to its 0.4 floor. Nothing refits after, so the copy stays small for the whole intro. Seen on a cold load of introlab/access.html.

- [x] Reproduce on a cold load in the intro lab (Signal)
- [x] Tom says yes to the shared/ edit
- [x] fitIntro measures without the pop transform
- [x] Verify cold load keeps the true fit
- [x] Commit through tools/commit.sh

## Summary of Changes

- `shared/intro.js` `fitIntro` lifts the inline transform off the badge and the text while it measures, then restores it in a `finally`. No paint comes between, and intro.css has no transform transition, so nothing shows.
- Repro: headless Edge, fresh context, fonts held 300 ms. The fonts-ready refit lands mid-pop. HEAD reads the badge bottom at 712 px (scale 2.919); the fix reads 500 px (at rest).
- Floor: a refit with the badge at scale(7) gives `--copy-k` 0.400 on HEAD and 1 with the fix; the transform stays as set.
- No `?v=` bump: the standards name no rule for it.
