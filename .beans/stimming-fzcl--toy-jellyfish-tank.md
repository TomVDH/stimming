---
# stimming-fzcl
title: 'Toy: Jellyfish tank'
status: in-progress
type: feature
created_at: 2026-11-22T22:47:13Z
updated_at: 2026-11-22T22:47:13Z
parent: stimming-oh7b
---

Build Jellyfish tank (idea 80, group F) as a Lab toy: an MVP at high fidelity, Bar v3. Moon jellies pulse in a deep-blue round-flow tank; tap the glass and they drift away. Tom: "Build it, keep apart" (2026-11-22): no fish, no plants, no gravel, apart from Aquarium. Plan: docs/plans/jellyfish.md.

- [x] Plan at docs/plans/jellyfish.md
- [x] Reference photos of moon jellies in a kreisel tank
- [x] Blockout on the stage, screenshot at 1280 x 800
- [x] Hero moment: bells pulse and glow at the rim, tentacles and oral arms trail on the circular flow
- [x] Tap the glass: a thump through the water; near jellies contract and drift away, then settle back
- [x] Sound: finished, muted by default
- [x] Bar v3 spec and copy
- [x] Icon round spike-jellyfish-1 (Current, A, D), emblems, sheet row
- [x] Intro emblem, toys.json entry, Lab tile with GSAP hook
- [x] QA Q1 to Q10, docs/toys/jellyfish.md
- [x] Commit and push
- [x] Tom, 2026-11-23: other kinds of jelly, colours, a starfield of small ones (Vancouver Aquarium)
- [ ] Tom's sign-off
- [ ] Tom sets the Dutch name
- [ ] Record the session cost

## Notes

- Defaults (chosen in this chat, stated for Tom): 3D, three.js 0.170 (Scene type), a fixed front view. The presentation is one round window in a near-black gallery wall: a round-flow (kreisel) drum seen from the front, its back wall and curved side visible behind the glass. Deep blue light from above, light shafts, blue spill on the wall. Seven moon jellies (six on a narrow stage). Why: a translucent bell needs a view angle (the rim glows where the eye grazes it, and the gonad rings show from above), tentacles trail in depth, and a round drum window says "jelly gallery" without a prop and keeps it apart from Aquarium's rectangle.
- Gesture: a press on the glass knocks at once; rings run out over the glass, the marine snow shoves aside, near jellies flinch (new fast deep strokes, bell turned away) and swim off, then the current takes them back. Space taps beside a jelly. Slider: Flow.
- Reference photos: Wikimedia Commons, search "Aurelia aurita aquarium": moon jellies in deep blue tanks, rim-lit bells, four gonad rings, short fine margin fringe, frilled oral arms.
- Blockout: docs/qa/jellyfish/01-blockout-1280.jpg. Hero captures: 02 to 09 in the same folder.
- Q10: 16.7 ms mean and p95 through three taps (headless Chromium, ANGLE GL, RTX 3070; vsync bound). Tom checks on a real screen.
- Icons: no pick in icons/picks.json, so A of spike jellyfish-1 is on the menu. The intro emblem is A's emblem at 128, scaled to fill: a white bell with the four rings cut, white arms and fringe. The favicon shared/favicons/jellyfish.png comes from the menu tile.
- Open for Tom: 3D or flat and the presentation (round window by default), the Dutch name (draft Kwallentank), the icon pick.
- 2026-11-23 pass: four kinds (two sea nettles, two moon jellies, a purple-striped and an egg-yolk jelly) and a starfield of 700 small jellies (420 narrow) in soft mixed colours; darker water so the colours read. No photo of the aquarium's small-jelly tank was found; the starfield is a reading of Tom's words. The icons still show a moon jelly.
