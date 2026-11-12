---
# stimming-323x
title: 'Railgun: Sight mockups, directions that do not read as a tank sight'
status: completed
type: task
created_at: 2026-11-12T08:20:28Z
updated_at: 2026-11-12T08:20:28Z
parent: stimming-f793
---

Tom (2026-11-12): the Sight looks far too much like a tank sight. Design full-frame mockups of other directions. No wiring into the toy.

Constraint from stimming-oi3i: Tom called green phosphor, seven-segment readouts and tapes gaudy sci-fi. He wants ancient high tech.

- [x] Read Sight today; reference stills of the shipped rangefinder
- [x] Real stills from the toy as backdrops: tracking, charging, full, fired, hit; dusk and night; 1280 x 800 and 375 x 812
- [x] Five directions, each showing the rock, range, closing speed, charge, aim error and the shot
- [x] One noindex page lab/railgun-sight/: flip direction, state, light, phone
- [x] QA: clean console, stills of each direction in this bean
- [x] Commit on branch claude/railgun-sight-mockups-afab8a

## Summary of Changes

- `lab/railgun-sight/index.html` (noindex, unlinked): five directions plus Today (the shipped Sight). Flip direction (1 to 6), state (arrows), light (L) and screen (P). `?d=&s=&l=&v=&still` pins a frame.
- Backdrops: 20 real stills from `railgun/index.html`, Sight camera on, overlay patched off in flight only (`lab/railgun-sight/stills/`). The page embeds each still's rock, bore, range, closing speed, charge and aim error from `__qa`, so the marks sit on the real rock.
- QA: headless Edge, all 100 frames at 1280 x 800 and 375 x 812, dusk and night; clean console; no overflow at 375 px.
- `railgun/index.html` is untouched.

## Directions

| Direction | Idea | Charge reads as | The shot reads as |
|---|---|---|---|
| Cinema | the sight is the film; one hairline, four brackets, subtitles in the bars | the letterbox closes from 2.39:1 to a slit | the bars snap open; "struck at 40.8 km" |
| Astrolabe | brass engraving: graduated limb, alidade, star pointer | limb ticks light clockwise | ticks run down the time of flight; an eight-point star |
| Drum | a strip recorder under the view; a red pen writes the charge | the pen climbs and trembles | FIRE spike off the paper; hit spike; flight time between |
| Pane | light thrown on the cabin glass; beaded rails up the bore | beads light from the gun outward | beads stream away; the pane fogs |
| Numeral | the range in giant outline type | the figure fills from the foot | the figure becomes seconds to strike, then 0.0 |

Stills, dusk on top, night below; tracking, charging, full, fired, hit left to right:

- Cinema: `lab/railgun-sight/sheets/desk-cinema.jpg`, `phone-cinema.jpg`
- Astrolabe: `lab/railgun-sight/sheets/desk-astrolabe.jpg`, `phone-astrolabe.jpg`
- Drum: `lab/railgun-sight/sheets/desk-drum.jpg`, `phone-drum.jpg`
- Pane: `lab/railgun-sight/sheets/desk-pane.jpg`, `phone-pane.jpg`
- Numeral: `lab/railgun-sight/sheets/desk-numeral.jpg`, `phone-numeral.jpg`

## Recommendation

Cinema. It speaks the toy's own film language (the far, locked-off shot), so the Sight reads as a cut, not a gadget. The charge as a closing letterbox is new and needs no gauge. The picture carries only a hairline and four brackets. The words sit on black bars, so they read at dusk, at night and through the hit flash, where the other directions wash out.
Runner-up: Numeral, the most daring. Astrolabe fits "ancient high tech", but its round limb still hints at a scope ring.
