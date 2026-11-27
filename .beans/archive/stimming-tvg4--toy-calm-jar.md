---
# stimming-tvg4
title: 'Toy: Calm jar'
status: completed
type: feature
priority: normal
created_at: 2026-11-10T06:26:45Z
updated_at: 2026-11-27T07:19:52Z
parent: stimming-oh7b
---

Build Calm jar from docs/plans/calmjar.md (rank 5 in docs/plans/fidgets.md). It starts in the Lab. The stage is the inside of a glitter jar: swirl it, flakes flash as they tumble, then settle in layers by size. K5 from Oil slick. Bar v3.

Batch 1 of the 14-toy run (Tom: "MVP at high fidelity, with icons for the lab and intro as well, bar v3").

## Defaults chosen

- F1: yes. No dome, no scene, no snow. The stage is the liquid, seen from inside the glass.
- 3D or flat: a flat stage with 3D flake optics. The liquid is a 2D fluid; each flake is a small mirror with a 3D tilt, so it flashes only when its tilt meets the light.

## Checklist

- [x] Reference photos of real calm jars
- [x] Blockout: K5 with jar walls, GPU flakes, size-sorted settle; screenshot at 1280 x 800 (`docs/qa/calmjar/calmjar-1280-blockout.jpg`)
- [x] Optics: tumble, thin-film flakes, glints, dust, lights, glass edges, glow chain
- [x] Shake, Flip, bed lift; sound (wash, shimmer, slosh, glug), muted by default
- [x] Bar v3 spec: Glitter, Shake, Flip, Thickness; Settings rows; Reset
- [x] Icons: A of spike calmjar-1 (Tom's pick) on the menu; sheet GALLERY row; intro emblem shared/emblems/calmjar.svg; favicon
- [x] toys.json entry and menu Lab entry with an icon and a GSAP hook
- [x] QA Q1 to Q10; docs/toys/calmjar.md
- [ ] Tom sets the Dutch name (draft: Glitterpot)
- [ ] Tom picks a series (draft: none; Goo fits)
- [ ] Record the session cost

## The bed

The bed is a height per column: resting flakes add their volume, capped at the highest resting flake nearby, so no pile stands without glitter.
Flow dies inside the pile, so a swirl wears the bed from the top. A flake that comes to rest near the surface lies on it.
A slope-slide rule (angle of repose) was tried and cut: on a narrow stage the column noise read as steep and the bed rippled.

## QA (2026-11-22, headless Chromium, ANGLE GL)

| # | Result |
|---|---|
| Q1 | `node --check` passes on `calmjar/main.js` and the six menu scripts |
| Q2 | Clean console at 1280 x 800 through every chip, action, setting, key and gesture |
| Q3 | Captures in `docs/qa/calmjar/` (JPEG): first frame, swirl, settle, shake (Ocean), flip, side light, tap, reduced motion, 375 x 812 |
| Q4 | Drifting on a 30 fps timer; 0 rAF calls in 2 s once asleep |
| Q5 | 0 frames in 2 s with the page hidden |
| Q6 | Reduced motion: clean console; opens settled; flakes glow steadily; Flip fades |
| Q7 | Four controls (Glitter, Shake, Flip, Thickness); four How to play rows |
| Q8 | Keys 1 to 4, S and F each do their job |
| Q9 | The context runs after a drag and is suspended after the settle |
| Q10 | Swirl at 1280 x 800, 26 000 flakes: median frame 16.7 ms, p90 16.7 ms (dev PC GPU). A phone is not measured |
