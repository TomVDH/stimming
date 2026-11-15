---
# stimming-65l1
title: 'Train Ride: real mist on the lakes and low cloud on the peaks'
status: in-progress
type: task
created_at: 2026-11-15T09:37:14Z
updated_at: 2026-11-15T09:37:14Z
parent: stimming-6z3j
---

Tom picked item 3 of the fidelity shortlist (2026-11-15): mist and fog fogged only the pane; the valley behind it stayed clear.

## Checklist
- [x] Lake mist: a layer that thins with height above the lake, broken into drifting banks
- [x] Low cloud: a band some 550 to 1000 m above the eye that wraps the slopes and hides the peaks
- [x] Every material gets both through hazeAmt and hazeCol; lights dim in them; the sky dome too
- [x] Weathers set mist and cloud; morning keeps a thin lake mist; rain brings low cloud
- [x] Mist and fog fog the pane less, so the outside reads
- [x] Stills: mist and fog by hour; Lake Zurich, Linth plain, Walensee
- [x] QA: 1280, 375 x 812, 812 x 375; clean console; frame time
- [ ] Tom checks

## Notes

- Weathers: drizzle mist 0.15, cloud 0.45; rain 0.1, 0.65; downpour 0.2, 0.85; mist 1, 0.4; fog 1.6, 1. Morning keeps a 0.3 lake mist in any weather.
- Pane fog: mist 0.55 to 0.15, fog 0.85 to 0.35.
- The banks sample two octaves of value noise; the cloud is read where the ray crosses the band's middle.
- Frame time at 1920 x 1200 stays within run-to-run noise of main.
