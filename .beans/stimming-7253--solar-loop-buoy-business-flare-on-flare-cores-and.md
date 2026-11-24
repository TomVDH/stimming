---
# stimming-7253
title: 'Solar loop: Buoy Business flare on flare cores and the far star'
status: in-progress
type: task
priority: normal
created_at: 2026-11-24T20:57:20Z
updated_at: 2026-11-24T21:11:35Z
parent: stimming-e35i
---

Tom, 2026-11-24: "redo the lens flare and display of the star as we zoom out -- let's go with astroniki anamorphic". Pick: the Buoy Business anamorphic (shared/flare.js) replaces the three Dev styles and the far star's four spikes.

- [x] Flare cores: orb, thin streak and ghosts from shared/flare.js, in the star's own colour
- [x] Far star: small hard core, Buoy orb, streak and ghosts that grow in as the disk shrinks
- [x] Dev: Orb, Streak, Ghosts rows; the Lens flare choice goes
- [x] Check Sun, Rigel, VY CMa at z 2, 3, 4; clean console (frame times not comparable: the pane was hidden)
- [x] Doc lines true
- [ ] Tom looks at it live

## Checks (2026-11-24)

- Full view: flares at the limb throw a thin streak across the frame with the orb at the core.
- Far star: Sun at x4 and x16, a white core, warm orb, long streak; Rigel at x6 keeps a blue streak; VY CMa a dim red disk with a faint red streak.
- Ghosts stay on the star when it sits at the frame centre, as Buoy Business places them.
- Clean console at 1280 x 800.

## Second pass (Tom, 2026-11-24)

"the lens flare doesnt go off the viewport -- it ends before -- so our streaks should cut off somewhat realistically -- we want a globular -- we want some ghosts maybe too -- ensure we have a bit of a starry background too when zoomed out"

- [x] Streak tapers out before the frame's edge
- [x] Round, globular glow round the far star, white heart, star-coloured edge
- [x] Ghosts: rimmed discs, warm and teal, off axis when the light is centred
- [x] Starfield in two layers behind the far star
- [x] Check Betelgeuse at x4 and x16
