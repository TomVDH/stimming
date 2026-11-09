---
# stimming-fvs3
title: 'Toy: Beer pour'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-09T09:16:41Z
updated_at: 2026-11-09T09:55:19Z
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
