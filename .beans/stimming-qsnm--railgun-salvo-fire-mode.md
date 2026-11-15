---
# stimming-qsnm
title: 'Railgun: Salvo fire mode'
status: completed
type: feature
priority: normal
created_at: 2026-11-12T09:32:09Z
updated_at: 2026-11-12T16:44:07Z
---

Build the Salvo fire mode. Spec: docs/plans/railgun-salvo.md. Plan: docs/plans/railgun-salvo-plan.md (7 tasks, inline execution). Brainstorm and short list: stimming-e39e.

## Checklist

- [x] Task 1: Salvo core (railgun/salvo.js) and node tests
- [x] Task 2: fire mode and banking
- [x] Task 3: rounds in flight
- [x] Task 4: the gun through the ripple; Tom confirms the recoil cap (240 m, 2026-11-12)
- [x] Task 5: crater, break, hunt; Tom checks the stills (hunts land 2.5 s apart, after the fireball, Tom 2026-11-12)
- [x] Task 6: sound
- [x] Task 7: reduced motion, full QA, review, PR (PR 53; Tom checks fps and sound on a device)

## Notes

- Recoil cap 240 m (Tom, from the breech contact sheet; the breech overhangs the mount from about 280 m).
- Hunts land 2.5 s apart after the break, clear of the fireball (Tom's pick over the plan's 0.5 s).
- QA: in-page probes `tests/railgun-salvo-qa.js` (run inside /railgun/ after the intro: `(await import('/tests/railgun-salvo-qa.js')).run('final','task7','task6','task5','task4','task3','task2')`), 51/51; node tests 11/11.
- Deferred minors from the review: tracer and ring slot reuse past five live rounds; hunt legs draw no tracer and spare rounds stop at the fireball; comment polish.

## Summary of Changes

Salvo shipped in PR 53 (merged 59e00f9). Fire choice Rail | Salvo in Settings. The hold banks up to five rounds; the release ripples them 0.5 s apart with recoil rising to 240 m. Rounds crater the rock, the round past the kill line breaks it, later rounds hunt the three chunks 2.5 s apart. Each round has its own tracer, Mach ring, blast and report. Core logic in railgun/salvo.js (node tests 11/11); in-page probes tests/railgun-salvo-qa.js (51/51).
