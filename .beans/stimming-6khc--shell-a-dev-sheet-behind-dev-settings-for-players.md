---
# stimming-6khc
title: 'Shell: a Dev sheet behind ?dev; Settings for players only'
status: in-progress
type: task
created_at: 2026-11-12T09:23:15Z
updated_at: 2026-11-12T09:23:15Z
---

Tom (2026-11-12): user-facing settings stay in Settings; dev tuning moves to a Dev menu beside Settings that shows only with ?dev. A standard for every toy.

## Checklist

- [x] shared/stim.js: bar spec dev rows; a Dev button and sheet beside Settings, only with ?dev; the rows always exist for ui.setting()
- [x] Railgun: Settings keeps Letterbox, Aim, Resolution, Smoke detail and Quality; Dev holds Charge sound, Rock, Grain, Bloom, Tone map, Exposure, Brightness, Contrast, Saturation, FXAA
- [x] AGENTS.md and docs/plans/bar-v2.md record the standard
- [x] QA: plain and ?dev, clean console; tests/bar-v2.html DONE 102/102
- [ ] Vault: record the standard in stimming/decisions through /adjudant (vault writes go through adjudant only)

## Summary of Changes

Bar v2 gains a Dev sheet. A toy lists tuning rows in dev: [...]; ?dev shows a code-bracket Dev button right of Settings. Without ?dev the rows exist but never show. Railgun is the first toy on it; others move when Tom picks them. The vault note is still to write through adjudant.
