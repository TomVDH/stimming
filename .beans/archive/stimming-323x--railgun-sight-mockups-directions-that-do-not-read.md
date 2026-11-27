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

## Round 2: Fire control in white phosphor

Tom (2026-11-12): round one missed ("lol wtf"). Make it accurate for a would-be astronomical defence turret. Put the picture through a white phosphor filter: take the NVG toy's shader whole.

- [x] Image: `nvg/tube.js` imported as is. The stills go in through its camera path (`uCam`, `tCam`): photocathode noise, MCP halos, ABC with autogating, P45 white phosphor, blemishes and the fibre honeycomb. One tube wider than the frame, so there is no eyepiece rim. Photon count per light: dusk 90, night 45 (`uCamExpo`). The NVG toy's defaults for grain, gain and afterglow.
- [x] Capture probe `fc()`: camera, rock and gun axis in world metres, rock velocity, lay error split AZ and EL, fragment count.
- [x] Direction "Fire control": boresight, track gate sized to the angular diameter, velocity leader to the predicted intercept point (PIP), an angle scale in mrad on the frame edges. Four blocks: track, sensor, solution, gun. One status line.
- [x] Numbers from the toy's geometry: bearing and elevation, range, range rate, speed, altitude, angular rate, angular size, lead, TOF, MV, gravity drop and superelevation, QE, lay error, predicted miss against the target radius, KE at intercept in GJ and t TNT, fragments.
- [x] Design constants (not in the toy): slug 400 kg, bank 14 GJ, efficiency 0.32. Stored energy goes as MV squared.
- [x] Round 1 sits behind a "Round 1" label. The image toggle (White phosphor or Colour) applies to every direction.
- [x] QA: 120 frames. No page errors. The only console lines are ANGLE D3D X4000 warnings from the tube shader; the NVG toy logs the same ones on Windows.

What the toy shows and a real bolide would not: the rock moves at 59 m/s (17.68 km in 300 s); a real one comes in at 11 to 72 km/s. The display reports the toy's true speed.

Stills: `lab/railgun-sight/sheets/desk-fc.jpg`, `phone-fc.jpg` (dusk on top, night below; tracking, charging, full, fired, hit).

## Round 3: Monolith, burnt in

Tom (2026-11-12): Fire control "looks weird"; not military, not faux; something special, Dune-inspired. The crosshair and ranging lines get a negative effect over the tube. No chromatic aberration. All words blend into the shader. No hex in the grain.

- [x] Direction "Monolith" (now the default): a hairline horizon open round the bore; a slender split monolith on the bore whose lower block fills with the charge; two obelisks flank the rock; beads drift from the rock to the intercept ring; in flight the beads climb the bolt's path; struck is a ring broken into six arcs. Words are few, wide and light: range and closing speed by the rock, lay error on the ring, one word or figure under the monolith.
- [x] Negative key pass: the tube's last pass draws into a target. The marks and words rasterise into a key (canvas 2D, page fonts). Green, the soft band: the picture turns negative. Red, the core: it takes the far extreme of its 5 x 5 surroundings, so a mark reads on grey dusk as well as at night.
- [x] Page-only shader patches on the tube's materials (`nvg/tube.js` untouched): lateral colour split zeroed; fibre gain and honeycomb seams removed.
- [x] Fire control stays as "Round 2"; Round 1 as before.
- [x] QA: 140 frames, no page errors; 2 ANGLE X4000 warnings from the tube shader, as on the NVG toy.

Stills: `lab/railgun-sight/sheets/desk-monolith.jpg`, `phone-monolith.jpg`.
