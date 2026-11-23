---
# stimming-8oev
title: 'Toy: Chromatography'
status: in-progress
type: feature
created_at: 2026-11-23T10:25:25Z
updated_at: 2026-11-23T10:25:25Z
parent: stimming-oh7b
---

Build Chromatography (idea 38, group F) as a Lab toy: an MVP at high fidelity, Bar v3. Paper chromatography of marker ink: tap to place an ink dot, the water front creeps through the paper, the ink lifts and separates into soft bands of cyan, magenta, yellow and violet, each at its own speed. Plan: docs/plans/chromatography.md.

Stack type: Shader (raw WebGL2 on shared/gl.js). The wicking sim runs on the GPU in RGBA32F; three small programs.

- [x] Plan at docs/plans/chromatography.md, reference photos looked at
- [x] Blockout on the stage, screenshot at 1280 x 800 (docs/qa/chromatography/01-blockout.jpg)
- [x] Hero moment: dot, bead, the front creeps through the fibres, the ink lifts and parts into violet, magenta, cyan and yellow rings, the paper dries to matt
- [x] Sound, muted by default
- [x] Bar v3 spec and copy
- [x] Icon round spike-chromatography-1 (Current, A, D), emblems, sheet row
- [x] Intro emblem, favicon, toys.json entry, Lab tile with GSAP hook
- [x] QA Q1 to Q10, docs/toys/chromatography.md
- [ ] Tom sets the Dutch name
- [ ] Record the session cost

## Defaults chosen (Tom's open question: 3D or flat, and the presentation)

- Flat, top down. Depth comes from light: a raking key light on the fibre tooth, a window's reflection in the wet paper, a bead of water that refracts.
- A circle that wicks from each dot, not a strip in a jar. A tap can land anywhere and each dot becomes its own centre; every band shows as a full ring; a jar would be a prop.
- One round filter paper, 150 mm, on dark slate; on a narrow stage it grows and runs off both sides. The first sheet holds a dried black and a dried brown chromatogram.
- Inks are mixes of four dyes with Rf violet 0.16, magenta 0.38, cyan 0.6, yellow 0.83. Mixed (default) cycles black, brown, green, violet, navy.
- Flowing water leaves some dye on the fibres (slow dyes more): bands trail and the origin keeps a dark spot. Paper impurity makes a faint brown tide line at the front.
- Tap: a dot at once, its bead 0.3 s later, 4 to 16 s of water by the Water slider. Hold keeps the bead full (up to 40 s). Space: a drop at a clear place. N: a clean sheet slides in.
- Sound: a felt nib tick, a plip for the drop, a faint fizz and fibre crackle while a front runs, a paper slide for New.

## QA (headless Chromium, --use-angle=gl, RTX 3070, Tom's PC)

- Q1: node --check passes on the five modules and the menu script.
- Q2: clean console in play (tap, hold, every ink, slider, Space, N) and on the menu with the tile hovered.
- Q3: captures at 1280 x 800 and at 375 x 812 (docs/qa/chromatography/).
- Q4: asleep 24 s after the last drop, 0 rAF calls in 2 s after.
- Q5: hidden while a front runs: 0 rAF calls in 2 s.
- Q6: reduced motion: clean console, development at 4x, asleep 3.5 s after the bands settle, 0 rAF calls after the bar leaves.
- Q7: one choice (5 options), one slider, two actions; 4 How to play rows.
- Q8: Space adds a drop at a clear place; N clears the sheet.
- Q9: the context runs in play and is suspended at the end. Output RMS up to 0.055, peaks 0.29.
- Q10: frame time median 16.7 ms, p95 16.7 ms through one development (vsync bound); one 50 ms frame at the tap. First frame 1.9 s after navigation start.
