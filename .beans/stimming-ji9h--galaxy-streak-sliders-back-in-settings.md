---
# stimming-ji9h
title: 'Galaxy: streak sliders back in Settings'
status: completed
type: task
priority: normal
created_at: 2026-11-03T23:17:29Z
updated_at: 2026-11-03T23:19:08Z
parent: stimming-ocok
---

Tom wants the streak settings back. 9e13505 fixed both streaks at 0.18 and removed them; 55a998c then rebuilt Settings with Reset alone.

- [x] Star streaks and Effect streaks sliders in the Settings tray, above Reset
- [x] Both start at 0.18, today's look; the choice persists per browser
- [x] Check 1280 and 375 px with a clean console
- [x] Commit through a private index and push

## Summary of Changes

- The Settings tray holds Star streaks, Effect streaks and Reset.
- Both sliders start at 0.18; zero turns a streak off.
- Values persist under stimming.galaxy.streakStars and stimming.galaxy.streakFx, so values from before 9e13505 stay unused.
- Sound sweeps, also removed by 9e13505, stay out.
