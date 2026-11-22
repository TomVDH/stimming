---
# stimming-7qy1
title: 'Toy: Geoboard'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-22T20:09:30Z
updated_at: 2026-11-22T20:40:18Z
parent: stimming-oh7b
---

Build Geoboard (idea 24, group D, a fidget) as a Lab toy: an MVP at high fidelity, Bar v3. Stretch rubber bands across pegs; pluck a straight run to twang. Plan: docs/plans/geoboard.md.

- [x] Plan at docs/plans/geoboard.md
- [x] Reference photos of real classroom geoboards and rubber bands
- [x] Blockout on the stage, screenshot at 1280 x 800
- [x] Hero moment: grab a band, stretch it over pegs; it wraps the pegs and thins as it stretches; drop it and it snaps back
- [x] Pluck a straight run: it vibrates; the twang pitch follows length and tension
- [x] Sound: finished, muted by default
- [x] Bar v3 spec and copy
- [x] Icon round spike-geoboard-1 (Current, A, D), emblems, sheet row
- [x] Intro emblem, toys.json entry, Lab tile with GSAP hook
- [x] QA Q1 to Q10, docs/toys/geoboard.md
- [ ] Commit and push
- [ ] Tom's sign-off
- [ ] Tom sets the Dutch name
- [ ] Record the session cost

## Notes

- Defaults (chosen in this chat, stated for Tom): 3D, three.js 0.170 (Scene type), a high three-quarter view of the whole board. A pale birch plywood block, 5 x 5 steel nails with flat heads, a near-black desk, one warm key from the back left. Four satin bands: red tilted square, amber triangle, blue sliver, green small square, crossing. Why: the toy is a band that wraps nails near its anchors and rises over the heads to the finger. Height carries that; a flat board cannot show it. The sim itself is 2D in the board plane (exact taut paths), so it stays cheap and exact.
- Gesture: drag a band to stretch it (or lift it off a nail); release on a nail hooks it; release in the open snaps it back with a twang. Click plucks a run; a drag from off the bands strums. Space strums every run; R resets. Slider: Tension (slack to tight).
- Pitch: frictionless band, one tension. A run's pitch is C / l * sqrt(lam^2 - 1/lam), neo-Hookean rubber.
- Reference photos: Wikimedia Commons, search "geoboard": a self-made 5 x 5 nail board in pale wood with red, yellow and blue bands (Udjat, CC BY-SA 3.0), a plastic classroom board, a green board with black bands.
- Blockout: docs/qa/geoboard/01-blockout-1280.jpg. Hero captures: 02 to 14 in the same folder.
- Q10: 16.7 ms mean and p95 through a pointer stretch (headless Chromium, ANGLE GL, RTX 3070; vsync bound). Tom checks on a real screen.
- Icons: no pick in icons/picks.json, so A of spike geoboard-1 is on the menu. The intro emblem is A's emblem at 128: a white board top with the bands and nail heads cut in. The favicon shared/favicons/geoboard.png comes from the menu tile.
- Open for Tom: 3D or flat (3D by default), the board and band colours, the Dutch name (draft Spijkerbord), the icon pick.
