---
# stimming-h01g
title: 'Icons: assess 15 newest Lab toys and next 10, icon reworks'
status: in-progress
type: task
priority: normal
created_at: 2026-11-17T05:35:18Z
updated_at: 2026-11-17T06:20:32Z
---

Tom asked for an assessment of the 15 newest Lab toys and the next 10 toys to build, and an icon rework for each of the 15.

Latest 15: lanterns, terrarium, tornado, bowl, honey, kintsugi, hotice, ladder, calaeno, rupert, carwash, cauldron, windtunnel, washer, turing.
Next 10: Spillway (stimming-xv1l), Deep vent (stimming-qlbm), Observatory (stimming-wqq9), Rain stick (stimming-6hb9), Calm jar (stimming-tvg4), BZ reaction (stimming-e75e), Calving (stimming-2ddv), Aquarium, Iodine clock, Electrolysis.

- [x] Capture the 15 toys at 1280 px (headless Playwright), console clean or not
- [x] Look at each current menu icon
- [x] Write the 15 toy assessments (state, gaps, sign-off readiness)
- [x] Write the 10 next-toy assessments (size, kit reuse, risk, questions, icon concept)
- [x] Put the 25-row table in this bean
- [ ] Icon galleries one toy at a time (icons/spike-<toy>-1.html), Tom's verdict after each
- [ ] Record Tom's verdicts in icons/picks.json
- [ ] Commit through tools/commit.sh with own files only

## Assessment, 2026-11-16

Method: headless Chromium (GPU flags) on `localhost:8000`, 1280 x 800 and 375 x 812, one drag and one click per toy. Bean checklists, `toys.json`, `docs/toys/`, `shared/stills/` and `shared/loops/` read. Current icons cloned from the `?lab` menu.

Finding: four of the "latest 15" are on the main shelf already (Soup cauldron 44, Pressure washer 46, Jacob's ladder 49, Wind tunnel 50). Their icons went through a round in `stimming-0mq6`; Tom ruled on them. Eleven are in the Lab and need an icon round.

Sign-off gate (process.md): QA at three sizes, perf budget, complete `docs/toys/<id>.md`, a fresh still, a loop if a good one exists. Only Tom gives `data-done`.

Rows 1 to 15 are built toys. Rows 16 to 25 are not built; there the columns read: size and kit, risk, questions for Tom, icon concept.

| # | Toy | State | Gaps · size and kit | Sign-off · risk | Icon now · questions | Icon proposal · concept |
|---|---|---|---|---|---|---|
| 1 | Lantern lake `lanterns` (Lab) | Dusk lake, tree line, three times of day, Festival, Wind. Bean `h35c`: blockout not signed off. | Lanterns are pin points at 1280; the subject does not read. No `docs/toys` page, no still. March 128 steps a pixel; fps on High unchecked. | No: blockout verdict first. | Framed square scene. Frames are out (no-frame rule). | A: one paper sky lantern, warm glow inside, a short reflection streak under it. The pointer is the wind: it drifts and tilts the lantern; enter lifts it. |
| 2 | Terrarium `terrarium` (Lab) | Glass jar, fern garden, three fills, Mist, Light. Bean `ral1`: Task 4 open; A or B fill build not picked. | Phone: the lamp at the top blows out to a white band. `probe.html` and `probe.js` sit in the toy folder. No doc page, no still. | No: Task 4 and Tom's A/B pick. | Bell jar with a fern. Close to the language, thin lid. | A: a fat glass jar, moss dome and one fern inside, bold lid. The pointer wipes a clear patch in fog on the glass; drops run down. |
| 3 | Tornado alley `tornado` (Lab) | Plains road under a supercell; a drag drops funnels; F-scale picker. Bean `dwwg`: framing blockout only; Tasks 2 to 6 open. | Funnels are thin cones (Task 2 hero tornado not built). `lab.html`, `spike-bake.*`, `flip/` in the toy folder. No doc page. | No: early (Task 2 of 6). | Framed square scene. | A: one bold funnel with a dust skirt, grey to tan gradient, lit and rim. It leans and snakes after the pointer; enter spins the skirt. |
| 4 | Singing bowl `bowl` (Lab) | Brass bowl of water on wood; rim circle and strike make standing rings. All bean items checked. | Sound not judged by Tom. No still. Window reflection reads as a flat grey square. | Close: Tom's ear, a still, a phone fps check. | Brass bowl with ripples and white dots. Dots are sparkle clutter. | A: a deep brass bowl seen from above at an angle. Circling the pointer round the rim builds rings on the water; a click rings one wave. |
| 5 | Honey coil `honey` (Lab) | Honey stream coils on a dark plate; three fluids; Height. All items checked. | Bean says not seen live, not heard, phone fps not measured. After a pour the puddle looks thin. No still. | Close: live look, sound, phone fps. | A coil on a plate with a stream. Near the language. | A: a thick glossy amber coil under a falling ribbon. The pointer steers the ribbon top; the coil grows while the pointer moves. |
| 6 | Kintsugi `kintsugi` (Lab) | Celadon bowl with gold seams; a click breaks it, the pieces mend. Four glazes. All items checked. | Very good look. No still. Phone fps not measured. | Close: still, fps check, Tom's eye. | Celadon bowl with a gold crack. Closest to the language of the 15. | A: the same bowl, bolder gold seams. Enter splits it in three shards that part toward the pointer; leave mends them with a gold flash. |
| 7 | Hot ice `hotice` (Lab) | Glass dish of sodium acetate; a click seeds a crystal front that fills the dish. All items checked. | Repeated WebGL READ-usage perf warnings in console (desktop). No still. | Close: the console warning, a still. | Glass dish with a white crystal star. | A: a round glass dish, liquid dark. The crystal grows out from the point under the pointer and fans across the dish; leave melts it back. |
| 8 | Jacob's ladder `ladder` (#49) | On the shelf. Copper horns, arc climbs and breaks. All items checked. | Sound not heard by Tom; phone fps not measured. Has a still. | Close: sound, phone fps. | Tom's pick in `0mq6`: finer copper horns with a violet arc. | None. Icon settled. |
| 9 | Calaeno `calaeno` (Lab, alpha) | A huge aircraft against the sun, seen from below, contrails, three variants, Sun slider. Bean `31xa`: QA, screenshots, view verdict, sound open. | No Sound or Settings button (`sound: false`). No series, no doc page, no still. | No: view verdict and sound first. | A blue disc with white stripes: an abstract mark, a style the standard bans. | A: the aircraft from below as one bold dark silhouette, lit underside rim, four white contrail bands behind it. The pointer banks it; enter lengthens the trails. |
| 10 | Rupert's drop `rupert` (Lab) | Glass tadpole on a dark mirror; tap the head (safe) or snip the tail (it bursts). Clear and Polarised. All items checked. | Reduced motion code-checked only; phone not measured. No still. | Close: phone check, still. | Thin-line glass drop with a mirror copy. Thin lines and a hairline tail break the standard. | A: a bold glass drop with a thick curved tail, polarised colour bands inside. The pointer near the tail makes it tremble; enter cracks the tail tip. |
| 11 | Car wash `carwash` (Lab) | Desert wash at night; Proceed drives into the tunnel; wipers. 64 items done, one open (camera follow). | One open item: glass, wipers and tunnel follow the camera. No still. | Close after the camera item. | A pole sign, a building, a lamp: a small detailed model with thin lines. | A: the tilted CAR WASH pole sign as one bold object, bulb rim and arrow. Bulbs chase toward the pointer; enter flickers one dead bulb on. |
| 12 | Soup cauldron `cauldron` (#44) | On the shelf. Stir, add things, fire under the pot. Has emblem, still and loop. | Bean notes a perf pass next. | Close: perf pass. | Tom's pick A3 (Flick) in `picks.json`. | None. Icon settled. |
| 13 | Wind tunnel `windtunnel` (#50) | On the shelf. Streamlines, a body in the flow, vortex street. All items checked. | One run logged "WebGL: too many errors"; a clean second run did not repeat it. Watch it. | Close: confirm the WebGL error. | Tom kept the old icon in `0mq6`. | None. Icon settled. |
| 14 | Pressure washer `washer` (#46) | On the shelf. Hold and drag cleans a surface; four surfaces. All items checked. | The cleaned strip shows a mixed band (bricks, then a white and blue ribbon). Check it is meant. | Close: the strip check. | Redrawn in the `0mq6` round. | None. Icon settled. |
| 15 | Turing skin `turing` (Lab) | Reaction-diffusion pelt; drag paints, click seeds, Stripes slider. All items checked. | Bar text has low contrast on the light pelt. Some READ-usage warnings. No still. | Close: bar contrast, still. | A glowing spotted disc with a halo. Halo plus disc is close to a mark. | A: a smooth river pebble wearing the pelt (spots to stripes). Spots drift away from the pointer and close up behind it. |
| 16 | Spillway (`xv1l`) | Draft. Idea 101, group C. | Size L to XL. Kit: `environment.js`, `sky.js`, `water.js`, `precip.js` for mist, `weather.js`, Railgun cloud and haze work. | Risk: falling water as a volume is the hard part; a cheap sheet looks fake. | Q: day or night? Gates open by drag only, or a lever? | A dam face as an isometric block, white water out of three gates. |
| 17 | Deep vent (`qlbm`) | Draft. Idea 19, group C. | Size M to L. Kit: `environment.js`, `glow.js`, `detail.js`, Caustic pool for light shafts, Cloud chamber particles for marine snow. | Risk: low. Black scene with one light; the lure light is a strong gesture. | Q: life at the vent (tube worms, shrimp) or rock and smoke only? | A black smoker chimney with a plume and one blue lure light. |
| 18 | Observatory (`wqq9`) | Draft. Idea 58, group C. | Size L. Kit: `sky.js`, Star trails sky, `environment.js` far terrain, `grade.js`. Dome and scope in three.js or SDF. | Risk: the mechanism (dome turn, slit, slew) needs solid modelling; a toy of moving parts, not a shader. | Q: inside the dome or outside? Real stars (named, a catalogue) or made up? | A white dome with the slit open and the tube poking out. |
| 19 | Rain stick (`6hb9`) | Todo. Plan `rainstick.md` (fidgets rank 2). | Size M, $20 to $30. Kit: `stim.js` helpers, `kit.tone()`, glow chain from K1. | Risk: sound is the toy; hundreds of clicks need a voice cap. | Q: Tom listens at Task 2. The plan is complete; no open question. | A glass tube on a slant, beads mid-fall, pins lit. |
| 20 | Calm jar (`tvg4`) | Draft. Plan `calmjar.md` (rank 5). Waits on F1. | Size M, $18 to $28. Kit: K5 fluid from Oil slick, GPU particles. | Risk: F1: is it far enough from Snow globe? | Q: F1 answer: the plan says no dome, no scene, no snow. Does Tom accept that difference? | A squat jar, glitter layers at the base, holo flakes high. |
| 21 | BZ reaction (`e75e`) | Draft. Plan `bz.md`. | Size S, $10 to $20. Kit: Turing skin ping-pong pattern on `gl.js`, `grade.js`, `output.js`. | Risk: low. Close kin of Turing skin; the look must differ (rings and spirals, a dish). | Q: real BZ colours (orange to blue) or a free palette? | A petri dish with orange and blue target rings. |
| 22 | Calving (`2ddv`) | Draft. Plan `calving.md`. | Size XXXL, $150 and up. Kit: the whole environment library, as Railgun. | Risk: high. Fracture, splash and surge are each a hard sim; many sessions. | Q: build after Spillway, so the water and mist work carries over? | A blue-white ice cliff block with one slab leaning off. |
| 23 | Aquarium (no bean) | Idea 362, Tom's add. | Size M to L (guess). Kit: Caustic pool light, `bokeh.js`, Terrarium glass box. | Risk: fish look and flocking; close to Jellyfish tank (80). | Q: fresh or salt water? Real fish species or stylised? A bean? | A glass tank block, a plant, one bright fish. |
| 24 | Iodine clock (no bean) | Idea 42, shortlist. | Size S (guess). Kit: Hot ice and Singing bowl liquid and glass, `grade.js`. | Risk: low; the snap to black is one moment. Needs a strong pour. | Q: one beaker or two pouring? Show a timer? A bean? | A beaker, half clear, half ink black, a sharp line. |
| 25 | Electrolysis (no bean) | Idea 43, shortlist. | Size S to M (guess). Kit: bubble particles from Bubble wand or Hot ice, dye clouds from Ink, `glow.js`. | Risk: low to medium; bubbles plus dye diffusion. | Q: which indicator (universal, red cabbage)? Battery visible? A bean? | A glass cell, two electrodes, one pink and one blue cloud. |

## Icon rounds

Order: the 11 Lab toys, newest first. The four shelf toys (cauldron, washer, ladder, windtunnel) keep the icons Tom picked in stimming-0mq6.

| Toy | Gallery | Tom's verdict |
|---|---|---|
| Lantern lake | icons/spike-lanterns-1.html | A (2026-11-16). Menu icon unchanged until Tom's yes to the menu edit. |
| Terrarium | icons/spike-terrarium-1.html | parked: Tom asked for Spillway first (2026-11-16) |
| Spillway | icons/spike-spillway-1.html (icon only, toy not built) | A (2026-11-16) |
| Deep vent | icons/spike-vent-1.html (icon only, toy not built) | A (2026-11-16) |
| Observatory | icons/spike-observatory-1.html (icon only, toy not built) | A (2026-11-16) |
| Rain stick | icons/spike-rainstick-1.html (icon only, toy not built) | D (2026-11-16) |
| Calm jar | icons/spike-calmjar-1.html (icon only, toy not built) | A (2026-11-16) |
| BZ reaction | icons/spike-bz-1.html (icon only, toy not built) | A (2026-11-16) |
| Calving | icons/spike-calving-1.html (icon only, toy not built) | A (2026-11-16) |
