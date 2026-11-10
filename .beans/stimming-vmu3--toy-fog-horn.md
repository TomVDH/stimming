---
# stimming-vmu3
title: 'Toy: Fog horn'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-10T11:00:13Z
updated_at: 2026-11-10T11:13:58Z
---

Lab toy `foghorn/`. Idea 100 in `docs/toy-ideas.md`: a harbour mouth in thick fog. Tap the horn; a container ship slides out of the grey, lights first.

The first toy on the environment runner (`shared/environment.js`, bean `stimming-ssrh`). Tom, 2026-11-10: "Yes, a new toy".

## Checklist

- [x] Page on the runner: fog, water, two breakwater lights
- [x] The horn: tap, key, action; the lights hold while it sounds
- [x] The ship: lights first, then the hull; it passes and leaves
- [x] Sound: harbour horn, ship's answer, sea wash (written; not heard yet)
- [x] Bar v2: Time, Fog, Horn; Rain in Settings; quality
- [x] `toys.json` entry and Lab menu tile with a hover hook
- [x] Desktop seen in the browser pane; 375 x 812 and 812 x 375 checked by layout measurement only (the pane was hidden)
- [ ] See the picture at phone sizes; hear the sound; check frame time on a phone
- [ ] Tom reviews; Dutch name and icon are drafts

## Notes

- 2026-11-10: first build. The ship follows waypoints: bow-on through the mouth, a turn to port, then a broadside crossing at 260 m. `?ship=3.5` starts it at that waypoint, for QA.
- The lens widens on a narrow frame, so both harbour lights stay in view on a phone.
- Dutch name Misthoorn and the menu icon are drafts for Tom.
- Not done: vignette, emblem, bell buoy or other sounds, hull reflection in the water.
