---
# stimming-swe9
title: 'Toy: Glowing tide'
status: completed
type: feature
created_at: 2026-11-22T19:16:51Z
updated_at: 2026-11-27T07:19:52Z
parent: stimming-oh7b
---

Build Glowing tide (idea 40, group F) as a Lab toy: an MVP at high fidelity, Bar v3. Bioluminescent surf on a dark beach at night: waves run in and break, the white water flashes blue where it is stirred, and the wet sand keeps blue sparks where you touch. Plan: docs/plans/tide.md.

Stack type: Environment-like, on raw WebGL2 (shared/gl.js, bloom from shared/glow.js, K1 decay from trails/ via doubleslit/ for the stir map). No shared module changed.

- [x] Plan at docs/plans/tide.md
- [x] Reference photos of real bioluminescent surf
- [x] Blockout on the stage, screenshot at 1280 x 800 (docs/qa/tide/01-blockout.jpg)
- [x] Hero moment: waves break with a blue lip; the pointer stirs water and sand into sparks
- [x] Sound: surf bed, crash, swash, stir and glints; muted by default
- [x] Bar v3 spec and copy
- [x] Icon round spike-tide-1 (Current, A, D), emblems, sheet row
- [x] Intro emblem, favicon, toys.json entry, Lab tile with GSAP hook
- [x] QA Q1 to Q10, docs/toys/tide.md
- [ ] Tom sets the Dutch name
- [ ] Record the session cost

## Defaults chosen (Tom's open questions: 3D or flat, and the presentation)

- 3D, seen from the beach at eye height (1.5 m), a fixed camera. The glow is a line along the lip; only a low view shows the face and the lip as a line. A flat view from above loses the break.
- Raw WebGL2, no geometry: each wave is an analytic crest line with a leaning face; the ray meets the face or the beach plane. Four small programs (stir, reflection at half size, scene, grade), so D3D11 links fast.
- No moon: a dark grey-blue sky, faint stars, a dim warm band at the horizon. Moonlight hides the glow; the reference photos agree.
- One glow colour, the plankton's cyan-blue (about 475 nm); only the hottest core goes toward white.
- Only stirred water glows: unbroken faces stay dark, the lip lights as it breaks, and the break peels along the crest.
- The wet sand is a dim mirror of the glowing surf; the swash sheet a clean one.
- The hand: tap splashes, drag stirs a trail, hold keeps stirring. On water a swirl of glow with sparks; on sand only point sparks. A stir fades with a 2.4 s time constant.
- Bar v3: Wave (Space) sends a big wave in; Swell slider sets wave height and frequency.
- Icon: no pick existed. Round tide-1 (Current, A, D); A is on the menu; the intro emblem is A's silhouette.
- Draft Dutch name: Lichtend tij /ˈlɪxtənt ˈtɛi/. Accent oklch(0.74 0.15 228).

## Reference

Torrey Pines, San Diego (NPR, 2018-05-09, photo Stephen Bay): only the breaking lip and the white water glow; the unbroken face stays dark; dark grey-blue sky.

## QA (headless Chromium, --use-angle=gl, Tom's PC)

- Q1: node --check passes on the four modules, the menu scripts and the icon page.
- Q2: clean console in play (tap, drag over sea and sand, hold, Space), on the menu with the tile hovered, and on the icon page.
- Q4: drifting 30 rAF per second; 62 s after the last input the surf stops and no frames run.
- Q5: hidden tab, 0 frames in 2 s.
- Q6: reduced motion: the surf holds still; a stir glows and the loop sleeps once it fades.
- Q7: Bar v3 holds Wave and the Swell slider (2 controls); How to play has 3 rows.
- Q8: Space sends a big wave (a new wave at A 1.21 m).
- Q9: the context runs after a gesture and is suspended once the toy sleeps.
- Q10: frame times during a drag: median 16.7 ms, p95 18 ms.
- Captures: docs/qa/tide/.
