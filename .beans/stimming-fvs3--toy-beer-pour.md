---
# stimming-fvs3
title: 'Toy: Beer pour'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-09T09:16:41Z
updated_at: 2026-11-09T11:20:50Z
---

Build Beer pour from docs/plans/beer.md. It starts in the Lab, on Bar v2. Pour a Belgian beer into a backlit glass: bubbles rise in trains, the head climbs, swells and settles, and each sip leaves a lacing ring.

- [x] Plan: docs/plans/beer.md written and committed
- [x] Task 1: blockout built and pushed (3D ray tracer: glass, bottle, refraction, Fresnel, TIR, Beer-Lambert beer, head, bubble trains, caustic, plain pour)
- [ ] Task 1: checkpoint with Tom on the stills at 1280 and 375 px
- [ ] Task 2: pointer state machine, foam model, stream parabola and beads, Pour action per beer ritual, Kwak stand, etched D
- [ ] Task 3: Sip, lacing rings, the ring, glass morph
- [ ] Task 4: sound
- [ ] Task 5: real label art from Tom, glass prints, ladder, Q1 to Q10
- [x] toys.json entry and menu Lab entry with a GSAP hook
- [x] Research: 25 Belgian beers with bottles, glasses, colour, foam and pour rituals (beer/data/research.json)
- [ ] Tom sets the Dutch name (draft: Schuimkraag)
- [ ] Record the session cost

## Notes

- Scope change (Tom, 2026-11-09): real Belgian beers by name, with their own bottles and glasses, at Dandelion-level fidelity. Real beer names are Tom's exception to the brand rule; the toy name stays generic. Labels are generated stand-ins until Tom supplies art (beer/labels/<id>.png, listed in beer/labels/index.json).
- Render cost: about 29 ms per frame at 2496x1504 (High, dpr 2); Standard's budget is about 11 ms.
- Most sizes, EBC values and label looks are estimates; research.md lists the gaps.
- Known blockout gaps: Kwak glass has no stand yet; the bottle tips past the frame when nearly empty; the lifted bottle's shadow is hard.

## Round 2 (2026-11-09)

- Glasses and bottles now follow product photos: silhouettes measured in the page from barshopen.eu (glasses) and belgianbeerfactory.com (bottles), in beer/data/silhouettes.json and beer/data/bottles.json.
- Liquid: a wave-equation surface, damped slosh, a meniscus, and a wall film when the jet strikes a tilted glass.
- Fizz: surge clouds, columns of rising bubbles, big wobbling pour bubbles, and a surface raft that pops. Bubbles shade as lenses with key glints.
- Material: spectral Beer-Lambert colour and Henyey-Greenstein forward haze scattering.
- Glass: condensation after the Train ride fog. The glass is chilled, cold beer fogs the wall below the level, and beads run.
- The glass starts empty; the pointer's height sets a target flow and the bottle tips to meet it.
- Tom: needs a serious overhaul next (direction to agree).

## Overhaul brief (2026-11-09)

Ten questions answered; see docs/plans/beer.md, Overhaul brief. three.js rebuild, macro shot, grab-the-bottle pour, fizz first, warm backlight, Duvel first, luminous painterly style, watch then sip.

- [x] Overhaul 1: three.js scene, macro camera, depth of field, backdrop, Duvel glass and bottle
- [ ] Overhaul 2: GPU fizz (trains, wall bubbles, surge, pops); checkpoint with Tom
- [ ] Overhaul 3: grab-the-bottle pour, stream, liquid (pour and stream done; glass tilt open)
- [ ] Overhaul 4: head, sips, lacing
- [ ] Overhaul 5: the other 24 beers

- Overhaul 2 checkpoint (2026-11-09): sprite fizz (trains, wall bubbles, surge, pops and spray), refracting beer lathe, foam cells, misted glass shell, blurred behind layer for depth of field. The ray tracer stays as beer/tracer.html (noindex). Hold-to-pour is interim until Overhaul 3.

- Lookdev pass (2026-11-09): clean glass (edge band, softbox glints, lip line; mist only via Settings > Cold glass), beer shader fixed (it failed to compile in d6aac3c: projectionMatrix undeclared in the fragment stage), product-shot light panel behind the glass, straight bubble trains, creamy head.

- Lookdev pass 2: beer depth gradient and caustic shimmer, cream line, head volume with mixed bubble sizes and glints, crisp narrow softbox streaks, warmer graded S-curve, higher camera to show the head's top, irregular nucleation trains.

- Lookdev pass 3: tighter, lower lamp so the glass above the head stays clear; gentler bloom; soft table edge; the glass base glows with light piped from the beer; vertical caustic bands in the beer. Checked at 1280 and 375.

- Camera orbit: a slow drift round the glass's axis plus a mouse-hover lean; off under reduced motion. Glass: back-wall highlights, slight chromatic fringe, solid stem and foot that bend the view, rounded lip highlight, soft table horizon under the lamp.

- Pour pass (2026-11-09): the bottle lifts from the table, swings over the glass and tips. A tilted-bottle volume model sets its beer level; flow follows the head over the lower lip (weir law). The jet is a camera-facing ribbon on its parabola: it thins as it falls and beads near the end. Hold pours; a drag down tips further; a full glass tips it back. The Pour action stops with a little left for the yeast. The lifted bottle cross-fades from the blurred layer to a sharp one. About 15 s per Duvel. Checked at 1024 and 375.
- Head pass (2026-11-09): the jet digs a crater in the head and throws up a churning ring, with golden beer between loose bubbles. A stiff head stands as a dome over the rim (height from `rock`) before it spills; the pour stops at 80% of that crown. More foam per pour: the Duvel auto pour now brings the head to the rim.
- Smooth head (2026-11-09, Tom: the head receded in steps): the glass volume now counts the last slice in part, the profile texture filters linearly, and a sip drains at a steady eased rate instead of in one frame. Measured settle: under 0.05 cm per frame.
- Look pass (2026-11-09): softer glass silhouette (thinner line, lighter dark band); the solid foot glows with trapped lamp light and its rim catches a soft line; the head's side keeps one cell size (no streaks), reads brighter cream and blends into the beer through a wet golden foot; less foam per pour, so the beer fills most of the glass. Checked at 761 and 375 in the internal browser.
