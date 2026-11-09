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
- Photo-reference pass (2026-11-09; Wikimedia Commons: "Duvel beer in beer glass, 2024", "Duvelglass.JPG", "Biere Duvel.jpg", "Duvel and glass sunday.jpg"): Duvel reads pale straw gold, so the colour boost (x1.75) is gone. The head fills about half the glass and domes over the rim, as in the photos. The glass is clear: softbox glints are soft-edged, the inner wall shows as a faint second line, the stem carries a centre streak of backlight, and the foot is a clear disc with a thin bright edge ring.
- Swirl and spill (2026-11-09, Tom): once the glass holds beer, a drag on the glass slides it on the table (up to 3.2 cm) and it springs home on release; a drag elsewhere still pours. The beer surface tilts as the first slosh mode (k = 1.84/R), driven by the glass's acceleration; a head damps it. Beer, head and fizz follow the tilted surface. A wave past the rim spills the head first, then the beer. Swirling swells the head a little. The world (camera, table, bottle) shifts opposite the glass, so all glass shaders keep the glass at the origin.
- [ ] Spill visuals: foam and beer running down the outside of the glass (today the spill only lowers the head and level).
- Canted pour (2026-11-09, Tom): the glass tilts to the ritual angle (Duvel 45°) as the pour starts and rights itself by half full. The glass frame keeps every glass shader upright: the room (camera, table, bottle, gravity) turns round it through `uG2W`, so the room's light and backdrop stay put. Beer and head levels come from the tipped volume (circular segments per slice); past the low lip it spills. The jet aims at the low inner wall while canted, then at the surface; a jet down the wall raises less head.
- Stream: a round tube on the parabola that refracts the room behind it, with Beer-Lambert colour, Fresnel glints, a core light line, ripples that run with the flow and beads near the end. Replaces the flat ribbon.
- Subsurface: haze and fine bubbles scatter the lamp through the beer (thick paths glow deeper gold); the beer in the bottle glows where the lamp soaks through.
- Fixes: NaN guards on beer, head, stream and glass (a NaN pixel spread through the bloom as black blocks); the soft-box glint terms no longer overflow at grazing angles.
- Fire's shader (Tom's question): not reused. It is a WebGPU gas-volume sim on three 0.186; this toy is WebGL 2 on 0.170. The stream borrows its idea of a refracting, flowing volume instead.
- Pour staging pass (2026-11-09, Tom: "the entire pour looks weird"): the tilt is capped at 28° and pivots on the low edge of the foot; the bottle rises, slides in level from the right and comes forward only at the end, aiming just behind the glass's axis; the jet reads clear gold (tinted refraction, core line, see-through middle) and is as wide as the neck at the mouth; spray droplets leap from where it lands and stay inside the glass; a young head heaps up where the jet lands, then spreads; the empty glass's back wall is lighter, so the bowl reads clearer.
- Leak fix (2026-11-09, Tom: fizz, sparkles and the jet showed through the glass): the middle layer keeps a stencil; the glass's silhouette writes it and fizz, pops and splash draw only inside it. The jet depth-tests against the head and stops at the beer's surface.
- Smoke (Tom asked to use Fire's smoke shader): Fire's sim runs on WebGPU (three 0.186), so its lighting model is ported to GLSL instead: a ray-marched volume (28 dithered steps) with Henyey-Greenstein forward scatter, a two-tap self-shadow with Beer-Lambert, powder and multi-scatter terms, and an edge fade at the box walls. Density is procedural drifting 3D noise in a sagging cone off the neck. A fresh bottle breathes out cold CO2 fog as it lifts (fades over about 2 s); a faint wisp stays while it pours. Off under reduced motion.
- Head volume: the head is lit as a volume too (Fire's smoke model): a five-step march toward the lamp through bubble-cell density sets how much backlight soaks through; thin crowns and edges glow, deep foam stays creamy. Kept subtle (0.18).
- Pour motion (Tom: "eclipses through glass", "pour from one position", "smoother"): the lifted bottle and the jet draw a second time after the glass, depth-tested, so whatever is in front of the glass shows in front of it. The bottle rests clear of the glass's outline, rises, comes forward beside the glass, slides over the rim and only then tips; a critically damped spring (w = 9) eases every move; lift and return take about a second. While holding, a drag moves the pour: sideways along the rim, up for a longer drop and a bigger head; the jet still lands inside.
- Soft shading (Tom: soft, Pixar-like, close to now): finer grain, gentler S-curve, wider softer bloom, a warm rim light on the bowl, calmer caustic shimmer in the beer, smoother foam with a warm-to-cool gradient.
