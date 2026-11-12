---
# stimming-48f4
title: 'Railgun: a realistic ranging laser'
status: draft
type: task
created_at: 2026-11-12T08:57:48Z
updated_at: 2026-11-12T08:57:48Z
parent: stimming-f793
---

Make the ranging laser read as a real rangefinder. Tom, 2026-11-12: today it is just a red line. A different colour, a different pattern, and a strobe section that ranges the speed.

## Direction (Tom's pick)

- Near-invisible IR, like a military rangefinder. Only a faint violet-white shimmer in the air near the gun.
- No dot on the rock: the rock is too far out (Tom).
- The Sight view shows the beam clearly.

## Proposed pattern (about 2 s; today `RANGE_T` is 1.75 s)

1. Seek: the faint beam lights from the optic and shimmers in the heat haze.
2. Range: three hard single pulses. The HUD range locks in.
3. Strobe: a fast pulse train near 12 Hz for 0.8 s. The closing speed ticks in on the HUD.
4. Lock: one steady pulse, then off. The charge starts.

Reduced motion: one steady line, no strobe. Keep the flash area small.

## Code (from reading `railgun/index.html`)

- `RANGE_AIM`, `RANGE_FLASH`, `rangeFlash`, `rangeOn` and `RANGE_T` set the beats.
- `laserMat` and `laserDot` draw the beam and the dot; the dot goes.

## Checklist

- [ ] Tom approves the pattern and the beats
- [ ] Beam: IR shimmer, fade with range, no rock dot
- [ ] Beats: seek, range, strobe, lock; reduced-motion path
- [ ] HUD range and closing-speed readout (with the sight session)
- [ ] QA at 1280, 375 x 812, 812 x 375; clean console
