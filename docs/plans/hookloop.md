# Hook and loop (`hookloop`) plan

Status: built, Lab (2026-11-22) · Bean: `stimming-hfd6`

Idea 62, group D, a fidget. Sources: the shortlist row in `docs/toy-ideas.md` and row 9 in `docs/plans/fidgets.md` (2D, S to M, overlap with Zipper).
The idea row uses a brand name. Hard rule 11 bans it, so the toy is "Hook and loop" everywhere.
Tom's brief for the batch: an MVP at high fidelity, with icons, the intro emblem and Bar v3. One hero moment, finished. No extra modes.

## The hero moment

1. One strap lies on a dark desk, closed. Its free end has a short tab with no hooks.
2. Grab the tab and pull: the hook tape lifts in a tight curl. The separation line follows the pointer.
3. At the line, loops from the pile pull taut up to the hooks, stretch, and snap one by one. A snapped loop springs back into the pile; a hook shivers.
4. Each snap is one tick of the crackle. Pull slowly and the ticks are few, low and loud. Pull fast and they run into a dense, high rip.
5. Let go: the flap falls back and lies loose, with a little curl.
6. Press it shut: a press or a thumb drag pushes the flap down, and the hooks catch again with a soft crunch.

## Defaults (open questions, answered here)

| Question | Default | Why |
|---|---|---|
| 3D or flat | 3D, three.js 0.170 (Scene type), a macro close-up | The toy is the peel line: a tape that curls up out of a pile, with fibres that stretch across the gap. That needs depth, a soft shadow under the flap and a shallow focus. A flat strip (Zipper's way) shows no lift and no fibres. |
| Strap | Hook tape in a translucent signal red; loop tape in warm off-white | The palette of a real photomicrograph: red monofilament hooks glow when the light comes through them, and white loops catch the light against the dark desk. One black strap would vanish on the dark stage. |
| Setting | A plain near-black desk. One low warm key from the back left, raking across the pile; a cool fill. A shallow depth of field on the peel line. | The Look rule: light carries the scene, no props. Raking light shows the pile and the stretched loops. |
| Gesture | The tab peels. A press anywhere else is a thumb: it pushes the flap down and seals what lies under it. | One rule a hand already knows. A press on a lifted flap pushes it down, as a real thumb does. |
| Slider | Grip: a worn strap that lets go easily, to a new strap that holds hard and cracks loudly | It shapes the hero moment and adds no mode. |

## Tech

- **Strap model** (`strap.js`, no three.js): the hook tape is a chain of nodes along its length, solved by position-based dynamics in the vertical plane: length constraints, bending stiffness, gravity, contact with the pile, and the hand on the tab.
- **Fibres:** about 14 engagement sites per millimetre of length, each with a break length. An engaged site pulls its node down like a spring. When the gap at a site passes its break length, the site snaps: an event for the sound, and a fibre that springs back. So the peel and the crackle come from one cause, and the crackle rate follows the pointer speed by itself.
- **Seal:** the thumb presses nodes onto the pile. A site re-engages when the tape lies on the pile under pressure.
- **Scene** (`scene.js`): desk, loop tape with a pile of shell layers, hook tape as a ribbon rebuilt each frame (woven back, hook field underneath), instanced fibre tubes bent in the vertex shader, a soft shadow, bloom with a threshold, depth of field, grade.
- **Frame loop:** lively while the flap moves or a fibre springs. Nothing drifts, so the loop stops when all is still. Hidden stops at once.

## Sound

Raw Web Audio on `audioKit()`, muted by default, panned with the peel line.

- Snap: one short click per snapped site, taken from a bank of pre-rendered clicks. Pitch and level rise with the peel speed; spacing jitters.
- Rip bed: band-passed noise whose level follows the snap rate, so a fast rip has a body.
- Seal: soft, low crunch grains as hooks catch again.
- Flap: a soft fabric pat when it lands.

## Bar (Bar v3)

| Control | Content |
|---|---|
| Actions | Rip (Space: a fast rip of the whole strap), Seal (Enter: a thumb runs along and presses it shut) |
| Slider | Grip |
| How to play | drag the tab: peel; press or drag on the strap: seal; Space: rip; Enter: seal |

## Reduced motion

Fibres snap without the spring-back wobble; the Rip and Seal actions run at half speed. Gestures still answer.

## Tasks

1. Blockout: desk, two tapes, light, camera. Screenshot at 1280 x 800.
2. Strap model and peel; fibres; seal.
3. Materials, shadow, depth of field, bloom, grade.
4. Sound.
5. Bar v3, icons (round `spike-hookloop-1`), emblems, `toys.json`, Lab tile.
6. QA Q1 to Q10; toy doc `docs/toys/hookloop.md`.
