---
# stimming-jm2w
title: 'Toy: Superconductor track'
status: in-progress
type: feature
created_at: 2026-11-23T00:28:37Z
updated_at: 2026-11-23T00:28:37Z
parent: stimming-oh7b
---

Build Superconductor track (idea 130, group A, a science toy) as a Lab toy: an MVP at high fidelity, Bar v3. A frosty YBCO puck floats and locks over a magnet track; push it. Plan: docs/plans/supercon.md.

- [x] Plan at docs/plans/supercon.md
- [x] Reference photos of quantum-locking demos (YBCO pucks, magnet tracks, nitrogen fog)
- [x] Blockout on the stage, screenshot at 1280 x 800
- [x] Hero: the frosted puck hovers locked over the ring; push it and it glides round at the same height and tilt
- [x] Hold and drag re-pins the puck in small snaps: lift and tip
- [x] Fog off the cold puck in Fire's smoke shading; it sinks and spreads, and trails a gliding puck
- [x] Warming: the frost thins, the lock sags, the puck drops onto the track; a pour of liquid nitrogen cools it again
- [x] Sound: finished, muted by default
- [x] Bar v3 spec and copy
- [x] Icon round spike-supercon-1 (Current, A, D), emblems, sheet row
- [x] Intro emblem, favicon, toys.json entry, Lab tile with GSAP hook
- [x] QA Q1 to Q10, docs/toys/supercon.md
- [x] Commit and push: on origin/main as 83a37613 (toy), a87b0214 (menu), 15b26d52 (bean); the orchestrator pushed on Tom's word
- [ ] Tom's sign-off
- [ ] Tom sets the Dutch name
- [ ] Record the session cost

## Notes

- Defaults (chosen in this chat, stated for Tom): 3D, three.js 0.170 (Scene type). A fixed camera 22 degrees over a dark lab bench, the ring centred; a tall frame looks down at 46 degrees. One cool lamp from the upper left, a faint blue fill. Why 3D: the lock is the gap under the puck, its shadow on the track, its tilt held round the loop and the fog that sinks off it; a flat view loses all four.
- Ring: 0.34 m across, two rows of nickel-plated magnet blocks (56 a row) and a steel strip on a black anodised base. Puck: 66 mm across, 5 mm thick, wrapped in film, frosted.
- Lock: damped springs to the pinned height, tilt and side place (7 Hz); free along the ring (drag tau 40 s). A hold moves the pin in snaps of 1.1 mm or 2 degrees. Warmth runs 0 to 1 in 52 s of loop time: frost thins from 28 %, the lock sags from 74 %, then the puck is down. A pour resets it.
- Cooling: the brief says "a tap re-dips it". The toy pours liquid nitrogen on the puck where it is, as in the real demo on a track: a stream from above the frame, a boil of fog, beads that skate off (Leidenfrost).
- Fog: vapour.js, a half-size raymarch of up to 16 puffs with a depth prepass and a blur; K3 lighting copied from Wrecking ball's dust (Fire's smoke shading).
- Reference photos: Wikimedia Commons searches "superconductor levitation magnet" and "superconductor track levitation": a black YBCO pellet with a white frost crust over nickel magnets, and a wrapped disc steaming over a ring track with fog pouring off its rim.
- Blockout: docs/qa/supercon/01-blockout-1280.jpg. Hero captures: 02 to 11 in the same folder.
- Q10: 7.65 ms mean, 8.1 ms p95 through a glide and a pour (headless Edge, D3D11, RTX 3070; vsync bound). Tom checks on a real screen.
- Icons: no pick in icons/picks.json, so A of spike supercon-1 is on the menu. The intro emblem is A's emblem at 128: the ring's near half white with its joints cut, the far half grey, the puck white over a black shadow and gap.
- Open for Tom: 3D or flat (3D by default), pour or re-dip, the Dutch name (draft Supergeleiderbaan), the icon pick.
- MSAA: the composer swaps its buffers an odd number of times a frame, so MSAA was on only in every other frame. The scene now always starts in renderTarget1, the MSAA target (2026-11-23). Wrecking ball has the same resize code.
