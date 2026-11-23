---
# stimming-pj5e
title: 'Toy: Dichroic glass'
status: in-progress
type: feature
created_at: 2026-11-23T11:33:12Z
updated_at: 2026-11-23T11:33:12Z
parent: stimming-oh7b
---

Build Dichroic glass (idea 39, group F, quiet to use and rich to look at) as a Lab toy: an MVP at high fidelity, Bar v3. Move the light; the glass shifts colour as you move. Plan: docs/plans/dichroic.md.

- [x] Reference photos of real dichroic glass and its light
- [x] Plan at docs/plans/dichroic.md
- [x] Blockout on the stage, screenshot at 1280 x 800
- [x] Hero: drag the lamp; each pane flips between reflected and transmitted colour; the coloured light on the table slides in the complementary hue
- [x] Sound: finished, muted by default
- [x] Bar v3 spec and copy
- [x] Icon round spike-dichroic-1 (Current, A, D), emblems, sheet row
- [x] Intro emblem, toys.json entry, Lab tile with GSAP hook
- [x] QA Q1 to Q10, docs/toys/dichroic.md
- [ ] Commit and push
- [ ] Tom's sign-off
- [ ] Tom sets the Dutch name
- [ ] Record the session cost

## Notes

- Defaults (chosen in this chat, stated for Tom): 3D, raw WebGL2 (Shader type), three small programs. Object: a small folded screen, three flat dichroic panes fused at their upright seams in a zigzag, 12, 15 and 10 cm tall, on a white table in a dark room. Why: dichroic glass is a coating on flat glass, so flat panes show it truest; three faces at three angles read different colours side by side; the leaves overlap from most lamp places, so the coloured light stacks and mixes (gold passes blue; two leaves pass magenta).
- Light: one small lamp in a 34-degree beam that you hold: it hangs over the table point under your finger. The eye never sees the bulb. Coating Gold by default; Magenta and Cyan are the other chips.
- Physics: 12 spectral samples; reflected band shifts blue with angle (n = 1.75); T = 1 - R. The table's light is traced through and off the panes into a spectral light map, redrawn only when the lamp moves.
- References: Spectra side tables (flat dichroic panes throwing amber and violet light on a white floor), dichroic cubes, filter angle shift (modified Bragg law).
- Blockout: docs/qa/dichroic/01-blockout-1280.jpg. Hero captures 02 to 10; Lab tile 11; icon round 12; sheet row 13.
- Q10: 7.5 ms median frame through a drag (headless Edge, D3D11, RTX 3070). First frame 1.0 s.
- Icons: no pick in icons/picks.json, so A of spike dichroic-1 is on the menu. The intro emblem is A's emblem, centred. The favicon shared/favicons/dichroic.png comes from the menu tile (tools/favicons.mjs).
- Open for Tom: 3D or flat (3D by default), the object (folded screen), the Dutch name (draft Dichroïsch glas), the icon pick.
