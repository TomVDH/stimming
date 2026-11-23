---
# stimming-imb3
title: 'Toy: Milk crown'
status: in-progress
type: feature
created_at: 2026-11-23T11:33:21Z
updated_at: 2026-11-23T11:33:21Z
parent: stimming-oh7b
---

Build Milk crown (idea 371, group E, a satisfying physics loop) as a Lab toy: an MVP at high fidelity, Bar v3. Toy id milkcrown. A drop falls into milk in slow motion; the crown rises, beads on every point, the Worthington jet shoots back and pinches off a droplet. Tap to drop; drag to scrub the moment frame by frame; release and it settles to rest. Plan: docs/plans/milkcrown.md. Toy doc: docs/toys/milkcrown.md.

- [x] Plan at docs/plans/milkcrown.md
- [x] Reference photos of the real thing
- [x] Blockout on the stage, screenshot at 1280 x 800 (docs/qa/milkcrown/01-blockout.jpg)
- [x] Hero moment: drop, crown, beads, jet, pinch-off, scrub, settle
- [x] Sound: muted by default
- [x] Bar v3 spec and copy
- [x] Icon round spike-milkcrown-1 (Current, A, D), emblems, sheet row
- [x] Intro emblem, favicon, toys.json entry, Lab tile with GSAP hook
- [x] QA Q1 to Q10, docs/toys/milkcrown.md
- [ ] Tom sets the Dutch name
- [ ] Record the session cost

Stack type: Shader-like, raw WebGL2 (shared/gl.js, bloom from shared/glow.js, grade from shared/grade.js). No shared module changed.

## Defaults chosen (Tom's open questions: 3D or flat, and the presentation)

- 3D, a macro camera 13 degrees over the milk, as in the classic high-speed photographs. The crown, its points and beads stand against a studio backdrop and show in the milk's mirror.
- One signed-distance field: the pool height field, the crown (domain repetition for the points), the jet, the drops, joined by smooth unions for fillets and necks.
- A timeline in event time: every shape is an analytic function of ms after impact, so a scrub is exact both ways. One film frame is 0.25 ms (4000 fps).
- The first frame is the photograph: the crown at its peak, held still, the loop asleep.
- Light: a dark studio, a softbox from the front left, a cool strip light behind on the right, a backdrop sweep with a lit spot. The thin wall glows where the back light passes; the beads carry glints.
- Slow motion about 1/110 of real time through the crown and the jet, then a speed ramp while the droplet flies; one drop plays in about 10.5 s.
- The beads fall at 4.5 g (drag and a stronger pull) so they rain back while the jet rises; true g left a ring of beads hanging round the jet.
- Bar v3: Backdrop choice Blue (default), Red, Black (1 to 3); Drop (Space); Height slider 10 to 60 cm (impact speed and point count). Arrows step one frame. Hold freezes a frame.
- Icon: no pick existed. Round milkcrown-1 (Current, A, D); A is on the menu; the intro emblem is A's emblem.
- Draft Dutch name: Melkkroon /ˈmɛlkroːn/. Accent oklch(0.72 0.12 252).

## Reference

Edgerton, Milk Drop Coronet, 1957 (public domain): a short wide wall, about 24 points, a bead over each, a low camera, the next drop above. McLassus, drop-impact back-jet, 2006 (CC BY-SA): a thick column with a rounded top in concentric ripples. A water splash, 2012 (Flickr, CC BY): the neck thins under a bulb; an earlier droplet flies above.

## QA (headless Edge, D3D11, RTX 3070)

- Q1: node --check passes on the four modules, the menu scripts and the icon page.
- Q2: clean console in play, on the menu with the tile hovered, and on the icon page. The menu shows one 404 that is not this toy's: shared/emblems/cuttle.svg.
- Q4: still first frame 0 rAF in 2 s; at rest after a drop 0 rAF in 2 s.
- Q5: hidden tab during play, 0 frames in 2 s, the playhead holds.
- Q6: reduced motion: clean console; gestures answer; play at 0.75 speed, grain still.
- Q7: Backdrop choice, Drop, Height slider (3 controls); How to play has 4 rows.
- Q8: arrows, 1 to 3 and Space each do their job.
- Q9: the context runs after a gesture and is suspended at rest.
- Q10: frame times through one drop: median 7.6 ms, p95 8.2 ms.
- Shader: the scene program compiles in 0.8 s on D3D11 (tools/fxc); 3.7 s before the march and the probes shared one field call.
- Captures: docs/qa/milkcrown/.
