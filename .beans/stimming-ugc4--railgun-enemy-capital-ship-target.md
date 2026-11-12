---
# stimming-ugc4
title: 'Railgun: enemy capital ship target'
status: todo
type: epic
priority: deferred
created_at: 2026-11-10T21:24:17Z
updated_at: 2026-11-10T21:24:17Z
---

A second target for Railgun, beside the asteroids: a huge enemy capital ship.
A hit breaks the ship up. The pieces fall slowly and crash into the planet.

Tom's idea, 2026-11-10. Not scheduled; no work starts until Tom says so.

## Open questions for Tom
- [x] Does the ship replace the asteroid, alternate with it, or sit behind a setting? A setting: *Target: Asteroid / Ship*, applied at the next Reset.
- [x] One shot to break it, or several hits? Charge power ≥ 0.85 kills in one hit. A lower charge wounds; the next hit kills.
- [x] How long does the fall last, and what does the crash leave on the ground? 60 to 120 s of re-entry streaks; impacts 40 to 80 km out beyond the mesas; the near plain stays clean.
- [x] What does the ship look like, and how does it sound? An original battleship class in orbit, engines dark; silent until the hit.

## Design (2026-11-12)

Spec: `docs/plans/railgun-capital-ship.md`. Tom approved all four sections.
Build: procedural in `railgun/index.html`; five hulks; one `vol`/`trail` streak each.

- [x] Design spec written
- [x] Tom reviews the written spec
- [x] Implementation plan: `docs/plans/railgun-capital-ship-plan.md` (8 tasks)
- [ ] Tom reviews the plan and picks the execution method
- [ ] Tom schedules the build; a feature bean and worktree start then
