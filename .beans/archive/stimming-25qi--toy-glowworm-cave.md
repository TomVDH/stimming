---
# stimming-25qi
title: 'Toy: Glowworm cave'
status: completed
type: feature
priority: normal
created_at: 2026-11-23T11:34:17Z
updated_at: 2026-11-27T07:19:52Z
parent: stimming-oh7b
---

Build Glowworm cave (idea 351, group F, quiet to use and rich to look at) as a Lab toy: an MVP at high fidelity, Bar v3. A limestone grotto seen from a small boat drifting on a still underground river: blue-green glowworm points on the roof, each with silk threads beaded with droplets, doubled in black water. A drip, a dipped hand or a voice dims the nearest points; they return slowly. Plan: docs/plans/glowworm.md.

- [x] Reference photos of real glowworm caves
- [x] Plan at docs/plans/glowworm.md
- [x] Blockout on the stage, screenshot at 1280 x 800
- [x] Hero: the boat drifts, points shift with parallax and double in the water; a drip or a dipped hand ripples the water and the doubled lights shiver; a sound dims the nearest points, which return slowly
- [x] Sound: finished, muted by default
- [x] Bar v3 spec and copy
- [x] Icon round spike-glowworm-1 (Current, A, D), emblems, sheet row
- [x] Intro emblem, toys.json entry, Lab tile with GSAP hook
- [x] QA Q1 to Q10, docs/toys/glowworm.md
- [x] Commit and push (add2dc01, 875d882c)
- [ ] Tom's sign-off
- [ ] Tom sets the Dutch name
- [ ] Record the session cost

## Notes

- Defaults (chosen in this chat, stated for Tom): 3D, first person from the boat, eye 0.85 m over the water, looking forward and a little up. Raw WebGL2 on shared/gl.js, five small programs. Why 3D: parallax between near and far worms and the mirror double need depth; a flat view loses both.
- Place: one grotto (an ellipsoid's inside, 22 x 38 m, 4 m high) with seven flowstone curtains and a passage out at the far end. The boat loops an ellipse in it. Opening shot: the passage arch ahead, doubled by the water into a ring of light.
- Light: only the worms. No lamp and no fog volume, so the Fire smoke rule does not apply.
- Worms: 11,000, dense in bands and on curtain fringes; 4 to 10 threads each, 4 to 42 cm, beads that glint as the boat moves. Colour near 487 nm.
- Dims: any sound dims the worms near it in a wave at 6 m/s; each comes back with its own time constant, 3.5 to 9 s. The voice reaches about 16 m.
- The cave drips by itself every 14 to 30 s while the boat drifts (a visible drop each time); auto drips stop 25 s after input.
- References: Wikimedia Commons, Glowworm Grotto (Waitomo), Green Glow Caves in New Zealand, Glowworms inside the Ruakuri Cave.
- Blockout: docs/qa/glowworm/01-blockout-1280.jpg. Hero captures 02 to 10; menu tile 11; icon round 12.
- Q10: 7.8 ms mean frame (p95 8.1) through taps, drips and the voice, headless Edge, D3D11, RTX 3070. Drifting: 31.75 rAF per s. Asleep: 0 frames at 68 s idle. Hidden: 0 frames. Audio context suspended at rest.
- Sound render for Tom: glowworm-sounds.wav in the session notes folder.
- Icons: no pick in icons/picks.json, so A of spike glowworm-1 is on the menu. The intro emblem is A's emblem. The favicon shared/favicons/glowworm.png comes from the menu tile.
- Open for Tom: 3D (default), the Dutch name (draft Glimwormgrot), the icon pick.
