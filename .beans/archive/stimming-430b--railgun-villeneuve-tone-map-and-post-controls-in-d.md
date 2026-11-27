---
# stimming-430b
title: 'Railgun: Villeneuve tone map and post controls in Dev'
status: completed
type: task
priority: normal
created_at: 2026-11-15T09:33:22Z
updated_at: 2026-11-15T09:42:06Z
parent: stimming-f793
---

Tom (2026-11-15): a Villeneuve-style tone map for the railgun, and better post on the scene, under the Dev menu.

## Checklist

- [x] Tone map choice gains Villeneuve: soft shoulder, milky blacks, one-hue palette
- [x] Dev rows for the look: Palette (Auto, Sand, Slate), Palette pull, Black lift
- [x] Dev rows for post: mist (diffusion), halation, vignette, grain size
- [x] Sight and reduced motion still hold
- [x] QA at 1280 and 375, clean console

## Summary of Changes

- Tone map (Dev) gains Villeneuve; it is a stepper now, since four segments overflow the sheet. The default stays ACES.
- Villeneuve runs in the grade pass: a soft filmic curve (long shoulder), half per channel and half by luminance, a pull toward one key hue, milky blacks, a cream white. The output pass then maps no tones.
- Palette: Auto takes sand by day and slate at night; Sand and Slate pin it. Palette pull and Black lift tune it.
- New post rows for every tone map: Mist (the bloom threshold falls, as a diffusion filter), Halation (red bleed of the two widest bloom levels), Vignette, Grain size (soft clumps past 1 px).
- Every new row at its default gives the old frame.
- Fix: a stored Brightness now applies at load.
- Checked at 800 px and 375 x 812: noon, dusk, night, a shot, Sight; console clean.
