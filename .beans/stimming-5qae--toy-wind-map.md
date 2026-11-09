---
# stimming-5qae
title: 'Toy: Wind map'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-09T07:10:55Z
updated_at: 2026-11-09T09:25:40Z
---

Build Wind map from docs/plans/windmap.md. It starts in the Lab. Particles trace a wind field; circle a finger to spin up a cyclone; two cyclones orbit and merge.

- [x] Task 1: K1 lift, state textures, update pass, base field, texture-fed segments
- [x] Task 1: graticule, composite, one seed cyclone on the first frame
- [x] Task 1: Q1, Q2, stills at 1280 and 375 px
- [x] Task 1: checkpoint: Tom signs off the blockout stills
- [x] Task 2: vortices, inflow, dynamics, merge, spin-up gesture, gust
- [x] Task 2: two same-sign storms 0.2 apart orbit, then merge at 9.5 s (stills at 0, 2, 4, 7, 10 s)
- [x] Task 3: Silk, Heat, Dye; isobars; CPU fallback
- [x] Task 4: sound: bed, howl, gust, merge
- [x] Task 5: bar (Bar v2), Settings, persistence; Q1 to Q10
- [x] toys.json entry and menu Lab entry with an icon and a GSAP hook
- [ ] Tom sets the Dutch name and motto (draft: Windkaart)
- [x] Record the session cost: not metered per session in the app; one session, 2026-11-09 00:10 to about 01:05, 445k context tokens

## Notes

- One world unit spans the short side of the stage, not the height. Portrait recomposes: the cyclone and the graticule keep their size relative to the width.
- Drawn particles scale with stage area (full count at 1250 by 680 CSS px), so line spacing holds on a phone.
- Each particle has a fixed random brightness: a few bright threads over many faint ones. Without it, 13 overlapping trails per pixel read as grey haze.
- A still particle draws nothing, so stagnant air stays dark.
- Heat and Dye render but are not tuned yet (Task 3).

- Task 2 QA ran in the browser pane, not Playwright (Tom's rule). The page loads in memory with a manual frame pump, so sim time is exact while the pane is hidden.
- Storms steer at 0.35 of the base flow, plus beta drift poleward and west. A storm at the centre stays on screen for about 30 s.
- Same-sign pairs within 0.4 pull in at 0.05 of their induced speed; the pair motion runs in 10 ms RK2 steps, since explicit 50 ms steps fling close pairs apart.
- An eye pass fades the plate fast inside each core, so a moving eye stays clear.
- Dipole: opposite storms 0.15 apart sail off in a straight line, gap held. A 13th storm fades the weakest over 0.6 s.

- Task 3: the plate curve works on the brightest channel, so Heat and Dye keep their hue; very bright light bleeds a little toward white. Silk is unchanged.
- Dye particles live 6 to 14 s (others 2 to 6 s); life now sits below 16 in the state texel, spawn hue above it.
- Isobars: contours of the same stream function every 0.008, faded where they crowd. Storms use a Kaufmann core for the stream function.
- CPU fallback (no EXT_color_buffer_float): 4,000 / 6,000 / 8,000 particles over a 128 by 72 base-wind grid rebuilt every 0.5 s; storms and gusts add exactly per particle. Tested by masking the extension: no console errors, 2.8 ms per frame.

- Task 4: pink-noise bed through a 400 to 1,200 Hz band that follows the mean wind and storm strength; three resonant howls at 200 + 600 |Γ| Hz, panned to the three strongest storms; a gust whoosh with a sweeping band; a merge whomp (membrane at about 38 Hz plus low-passed brown noise). Every hit jitters pitch, time and level.
- One-shots wait for a waking context, so Tone never warns about a suspended one.
- Q9 (background tab, real click): context runs after the tap; after the loop sleeps it is suspended within 3 s; hidden tab suspends it too. No console errors or warnings. Levels are set by ear on paper only: Tom checks them on a real device.

- Task 5: the bar moved to Bar v2 (docs/plans/bar-v2.md lists Wind map among the ten v2 Lab toys). Settings rows persist under stimming.windmap.<id>; the look and Wind persist by hand.
- Performance ladder: after 4 s, full-rate frames slower than 1/38 s for 2 s step one rung: pixel ratio first (High falls to Standard), then half the drawn particles. A new quality choice clears it.
- The shell shows keyboard keys on touch; Wind map drops its Space entry on coarse pointers itself.
- QA (browser pane, background tab, in-memory frame pump, no Playwright):
  - Q1 node --check passes (page and menu). Q2 every chip, action, setting, slider and gesture: no errors or warnings.
  - Q4 lively 60 frames/s, drifting 30 frames/s, the loop stops 61 s after the last input, no frames asleep, a tap wakes it. Q5 hidden: no frames.
  - Q6 reduced motion: clean; slower particles, long trails. Q7 four controls, three key rows. Q8 Space adds a cyclone. Q9 see Task 4.
  - Q10 at High (2496 by 1504) with Many particles during two spin-ups: median 6.2 ms, p90 47.5 ms, max 134 ms per frame in a throttled background tab. Tom checks fps on a real device.
  - Stills at 1280 and 375 px on Bar v2.

## Round 2 (Tom, 2026-11-09)

Spec: docs/superpowers/specs/2026-11-09-windmap-round-2-design.md.

- [x] Icon round (five pointer-driven directions): icons/spike-19.html
- [ ] Tom picks an icon direction
- [ ] Emblem; promotion to the main shelf as No. 33 (Beta)
- [x] Chart grid
- [x] Light pass: bloom, eye glow, gust flash, merge ring
- [x] Gestures: high pressure, flick, jet stream
- [x] Chart layer: fronts, tracks, H and L
- [x] Globe projection
- [x] Round 2 QA in both projections

## Round 2 QA (2026-11-09)

Browser pane, background tab, in-memory frame pump; checks live in the git-ignored .superpowers/sdd workspace.

- Grid: line contrast over bright wind 0.022 (major), 0.018 (minor).
- Light: a tap lifts its point from 0.18 to 0.45 within 0.1 s; drifting stays at 30 fps.
- Gestures: 7 of 7 checks pass; a slow circling start became a high 0 of 10 times; Fujiwhara still merges at 7.5 s.
- Chart: tracks and marks land on their storms at 1280 and after a resize to 375 px; fronts grow, then occlude by 40 s.
- Globe: off-disc taps do nothing; the wrap is continuous (max step 0.012 world, Γ steady); a projection switch mid-gesture frees the storm.
- Q2, Q4 to Q6 and Q9 pass in both projections. Q10 with every option on at High, background tab: chart 37 ms median, globe 23 ms.
- Session time: about 01:50 to 03:00.
