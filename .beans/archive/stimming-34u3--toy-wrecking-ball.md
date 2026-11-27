---
# stimming-34u3
title: 'Toy: Wrecking ball'
status: completed
type: feature
created_at: 2026-11-22T22:47:31Z
updated_at: 2026-11-27T07:19:52Z
parent: stimming-oh7b
---

Build Wrecking ball (idea 72, group E, a machine) as a Lab toy: an MVP at high fidelity, Bar v3. Swing a ball into a brick wall; bricks tumble, the wall rebuilds. Plan: docs/plans/wreckingball.md.

- [x] Plan at docs/plans/wreckingball.md
- [x] Reference photos of real wrecking balls, cranes and brick walls
- [x] Blockout on the stage, screenshot at 1280 x 800
- [x] Hero: drag the ball back, let go; it swings on its chain into the wall; bricks break loose, tumble, bounce and pile up
- [x] Dust on impact, in Fire's smoke shading
- [x] The wall rebuilds itself brick by brick into its courses
- [x] Sound: finished, muted by default
- [x] Bar v3 spec and copy
- [x] Icon round spike-wreckingball-1 (Current, A, D), emblems, sheet row
- [x] Intro emblem, toys.json entry, Lab tile with GSAP hook
- [x] QA Q1 to Q10, docs/toys/wreckingball.md
- [x] Commit and push
- [ ] Tom's sign-off
- [ ] Tom sets the Dutch name
- [ ] Record the session cost

## Notes

- Defaults (chosen in this chat, stated for Tom): 3D, three.js 0.170 (Scene type). A fixed camera at the ball's side, a little above, about 40 degrees off the wall's face; a tall frame turns further along the swing. A dusty yard at dusk, one low warm sun from the wall's far end. Why 3D: bricks tumble in depth, pile behind the wall and lay back in arcs; a flat view loses the pile and the hole's depth.
- Wall: one wythe of real bricks (215 x 102.5 x 65 mm, 10 mm joints), stretcher bond, 14 x 16 courses, 232 pieces. Ball: a pear of cast steel, 0.6 m, one tonne, on seven chain links, a swivel and a wire rope from a pivot 7.5 m up (5.2 s period). The boom stays above the frame: a boom in the picture read as stray beams.
- Physics: own rigid bodies after Domino's finale tower (sphere sets, impulses with friction, corner contacts on the ground), 240 Hz substeps, a grid hash, a pose-change sleep test. Wall bricks sleep in place until the ball, a fast brick, the impact's shock or a loss of support wakes them. No library added.
- Dust: Fire's smoke shading (K3 lighting copy in wreckingball/dust.js), a half-size raymarch of up to 12 noise-eroded puffs, a depth prepass, a blur; it runs only while dust lives.
- Reference photos: Wikimedia Commons, category "Wrecking balls" (Abrissbirne Glocke, Wrecking ball Nov. 2011, Abrissbirne): pear balls with a cast lug and pin, heavy chain leads, scuffed steel with rust, a lattice boom with wire rope.
- Blockout: docs/qa/wreckingball/01-blockout-1280.jpg. Hero captures: 02 to 11 in the same folder.
- Q10: 7.8 ms mean, 8.1 ms p95 through a hit (headless Edge, D3D11, RTX 3070; vsync bound). Sim step under 1 ms. Tom checks on a real screen.
- Icons: no pick in icons/picks.json, so A of spike wreckingball-1 is on the menu. The intro emblem is A's emblem at 128: the ball, its chain and the wall's face in white with the joints cut in. The favicon shared/favicons/wreckingball.png comes from the menu tile.
- Open for Tom: 3D or flat (3D by default), a boom in frame or not, the Dutch name (draft Sloopkogel), the icon pick.
- MSAA fix (2026-11-23): the passes swap the composer buffers three times a frame, so the scene used the MSAA target only every other frame. renderTarget1 now holds the MSAA and the scene always starts there, as in Superconductor (a8f3237b). Check: the scene render target had 0, 4, 0, 4 samples before and 4 on all 12 frames after, with and without dust.
