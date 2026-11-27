---
# stimming-e75e
title: 'Toy: BZ reaction'
status: completed
type: feature
priority: normal
created_at: 2026-11-16T19:44:51Z
updated_at: 2026-11-27T07:19:52Z
parent: stimming-oh7b
---


Build BZ reaction from docs/plans/bz.md (idea 3, tool-approved). Size S. It starts in the Lab, on Bar v3. A petri dish of the Belousov-Zhabotinsky reaction: rings pulse out from seeds; tap to seed, drag across a front to break it into spirals.

Stack type: Shader (raw WebGL2 on shared/gl.js, bloom from shared/glow.js).

## Defaults chosen (Tom's open questions)

- Flat, top down, as a lab photo shows a dish. A Barkley sim reads best flat; a tilt would hide the fronts at the far edge and buy nothing.
- Real ferroin colours from photos of real dishes: a red-orange layer with pale blue-white fronts, lit by Beer-Lambert absorption of a warm lightbox. Real BZ is already striking; a free palette would lose the "this is a real reaction" pleasure.
- Presentation: a warm pool of light just wider than the dish, the room dark around it. Glass wall with bright edges, a meniscus line, CO2 bubbles, a pale blue dot at each seed.
- No Dye choice and no Grid size row: an MVP, one dish.
- Icon: Tom's pick A of spike bz-1 (2026-11-16). Its fronts are dark blue on orange; the toy's are pale blue-white on red-orange. Tom may want the icon recoloured.

- [x] Task 1: blockout: dish, reaction sim on raw WebGL2 ping-pong (Barkley model, 768 grid); no checkpoint, batch 4 ran unattended
- [x] Task 2: look: dye colours by Beer-Lambert, dish glass, meniscus, backlight, bubbles, grain
- [x] Task 3: sound, Settings, QA at 1280, 375 x 812 and 812 x 375 (Q1 to Q10 pass; docs/toys/bz.md)
- [x] toys.json entry and menu Lab entry with an icon and a GSAP hook (A of spike bz-1, sheet row, intro emblem, favicon)
- [ ] Tom sets the Dutch name (draft: BZ-reactie)
- [ ] Record the session cost

## QA (headless Chromium, --use-angle=gl, Tom's PC)

- Clean console in play and on the menu with the tile hovered.
- Empty dish: 0 rAF in 2 s. Drifting: 30 per second. 64 s idle: 0. Hidden: 0. Reduced motion: 0 after 11 s.
- Sound: the context runs after a tap and is suspended after Clear settles.
- Q10 frame times during a drag: median 16.7 ms, p95 16.8 ms.
