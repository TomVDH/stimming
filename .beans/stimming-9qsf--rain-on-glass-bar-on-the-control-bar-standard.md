---
# stimming-9qsf
title: 'Rain on glass: bar on the control bar standard'
status: completed
type: task
priority: normal
created_at: 2026-11-03T20:33:42Z
updated_at: 2026-11-03T20:35:17Z
parent: stimming-848s
---

Tom: bring the Rain on glass bar to the Control bar standard in AGENTS.md (a8a95fd).

- [x] The lone Heavier chip becomes a choice group: Drizzle / Rain / Storm, one pressed
- [x] Space steps through the three; the how line and stage label say so
- [x] Chips read well over the drops on the shell scrim
- [x] QA at 1280 and 375 with a clean console
- [x] Commit through a private index and push

## Summary of Changes

- The bar holds one choice group, Weather: Drizzle / Rain / Storm, with Rain pressed at start. It uses the shared choices() helper; arrow keys move inside the group.
- A WEATHER table replaces the heavy flag. Rain keeps the old default rates and sound; Storm keeps the old Heavier rates and sound.
- Drizzle is new: 6 drops and 90 mist specks per second, gain 0.4, bed filter 1100 Hz, patter 0.3.
- Space steps to the next weather and wraps round. The how line and the stage label say so.
- Over the drops, the shell scrim and chip backing keep all three chips legible at 1280 and 375.
