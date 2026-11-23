---
# stimming-tlme
title: 'Toy: Forge'
status: in-progress
type: feature
created_at: 2026-11-23T12:25:39Z
updated_at: 2026-11-23T12:25:39Z
parent: stimming-oh7b
---

Build Forge (idea 372, group E) as a Lab toy: an MVP at high fidelity, Bar v3. Toy id forge. A blacksmith's coal forge in a dim smithy. Pump the bellows and the bar heats through the colours; hammer it on the anvil with sparks and ring; quench it in a roar of steam. Plan: docs/plans/forge.md. Toy doc: docs/toys/forge.md.

- [x] Plan at docs/plans/forge.md
- [x] Reference photos of the real thing
- [x] Blockout on the stage, screenshot at 1280 x 800 (docs/qa/forge/01-blockout.jpg)
- [x] Hero moment: pump, heat colours, drag, hammer with sparks, scale and shape, quench in steam
- [x] Sound: muted by default
- [x] Bar v3 spec and copy
- [x] Icon round spike-forge-1 (Current, A, D), emblems, sheet row
- [x] Intro emblem, favicon, toys.json entry, Lab tile with GSAP hook
- [x] QA Q1 to Q10, docs/toys/forge.md
- [ ] Tom sets the Dutch name
- [ ] Tom hears the sound
- [ ] Record the session cost

Stack type: Scene, three.js 0.170 (standard materials, haze, steam volume, bloom, grade). No shared module changed; the only shared files are the toy's own emblem and favicon.

## Defaults chosen (Tom's open questions: 3D or flat, and the presentation)

- 3D. A fixed eye 3/4 from the front right of a dim smithy. It pans along the line to the bar's station and steps in, most at the anvil.
- The set: a brick hearth with a coal bed under a sheet-iron hood, a lung-shaped leather bellows on a trestle at its back left, a London-pattern anvil on a stump, a wooden water trough. One high barred window gives a cool shaft through the haze. No smith; the hammer rests on the anvil's heel and rises for blows.
- Light: the coal bed is the key light (orange, it flares with the blast), the bar is a second light, a flash at each blow. The haze scatters all three.
- Heat colour: one ramp in degrees C for the steel, the coals, the sparks and the lights (650 dull red, 750 cherry, 900 orange, 1050 yellow-orange, 1200 yellow, 1300 white).
- Steel: square stock, 25 mm, 50 cm, in tongs. 48 samples of heat, scale and shape. A blow flattens the hot end and draws it out (volume holds); cold steel only rings.
- Steam: Fire's smoke shading through Steelworks' WebGL2 K3 port, copied and retuned for a small box over the trough.
- Interaction: click or hold the bellows; drag the bar between fire, anvil and trough; click a station to send the bar there; click or hold at the anvil to hammer. After a quench the bar comes back to the anvil, dark.
- Bar v3: Station choice (Fire, Anvil, Trough; 1 to 3), Hammer slider 0.5 to 2 kg, Strike (Space, hold), Pump (B, hold), New bar (N).
- Icon: no pick existed. Round forge-1 (Current, A, D); A is on the menu; the intro emblem is A's emblem.
- Draft Dutch name: Smidse /ˈsmɪtsə/. Accent oklch(0.74 0.17 55).

## Reference

Anvil, Ironworks Blacksmith Forge, 2020 (Flickr, CC BY): London pattern proportions. Abbaye de Fontenay forge (Commons): raised hearth, glowing bed, huge hood. Soufflet de forge (Commons): a lung-shaped leather bellows, studded rims, nozzle, lever. Blacksmith sparks (Commons, several): sparks fan low and wide at the blow.

## QA (headless Edge, D3D11, RTX 3070)

- Q1: node --check passes on the six modules, the menu scripts and the icon page.
- Q2: clean console in play (keys, pointer drag, clicks, a hold), on the menu with the tile hovered, and on the icon page.
- Q3: captures at 1280 x 800, 375 x 812 and 812 x 375 with touch; one per hero moment.
- Q4: drifting 32 rAF a second while the bar or fire is warm; 0 rAF in 2 s, 62 s after the last input.
- Q5: hidden tab, 0 frames in 2 s.
- Q6: reduced motion: clean console; gestures answer; no flicker, embers or shake; fewer sparks.
- Q7: Station choice, Hammer slider, Strike, Pump, New bar (5 controls); How to play has 4 rows.
- Q8: 1 to 3, Space, B and N each do their job.
- Q9: the context runs after a gesture and is suspended at rest.
- Q10: frame times while hammering: median 7.5 ms, p95 8.1 ms.
- Bug found and fixed in QA: the eye panned during a drag and ran the bar off to the trough; the eye now holds still while you drag.
- Captures: docs/qa/forge/ (01 blockout to 13 menu tile).
