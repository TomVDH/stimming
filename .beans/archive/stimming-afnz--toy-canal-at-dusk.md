---
# stimming-afnz
title: 'Toy: Canal at dusk'
status: completed
type: feature
priority: normal
created_at: 2026-11-09T07:18:19Z
updated_at: 2026-11-09T11:03:16Z
---

Build Canal at dusk from docs/plans/canal.md. It starts in the Lab. A Flemish canal at blue hour in the rain: tap the quay lamps to light them; their reflections stretch across the water; a paper boat drifts through the light.

- [x] Task 1: K2 lift from Fireworks; facades, quay, bridge, belfry, sky, haze, mirror water
- [x] Task 1: Q1, Q2, stills at three Dusk values in Dry at 1280 and 375 px; checkpoint with Tom
- [x] Task 2: lamp picking, sodium warm-up, pools on wet cobbles, windows and TV flicker
- [x] Task 3: rain lit only by light, ripple rings, chip easing, paper boat
- [x] Task 4: sound: rain bed, lamp relay and buzz, carillon, wind; Q9
- [x] Task 5: bar, Settings, persistence; Q1 to Q10
- [x] toys.json entry and menu Lab entry with an icon and a GSAP hook
- [x] Tom sets the Dutch name (kept: Vaart bij valavond)
- [x] Record the session cost

## Notes

- Bar v2 spec from the start: Weather segments, Dusk slider, Letterbox and Quality in Settings.
- Tom (2026-11-09): not a town canal; a rural Flemish in-between place ("Bevergem", marginal and ordinary). The set is now ribbon sprawl along a wide straight canal: towpaths, poplars on the near bank, terraces, lone houses with blank side walls, farmhouses, bungalows, a metal shed, empty lots, a plain concrete road bridge, the next village's church tower over the fields.
- Lamps are road lamps on steel arms over the towpaths: the sodium warm-up fits them.
- Task 1 stills sent; waiting on Tom before Task 2.

- Tom (2026-11-09): the bridge read awkward; he asked for a frietkot, church, staminee and station, and a sky eye view. The village now centres on a crossroads: a flat road bridge, a floodlit church on its square, a staminee on the corner with a red sign, a frietkot by the bridge, a small station on a railway line with cool platform lights. Six fixed lights (frietkot, staminee, station, church floods) share the lamp array after the ten tappable lamps. Sky eye is the default view; Settings > View keeps the towpath view.

- Tom (2026-11-09): more sprawl. Added side streets off the main road, two estates of fermettes and bungalows, an industrial street of sheds, field roads, five farms with yard lights. One road list feeds the ground shader and the ribbons. Sky eye pulls back; phones look along the main road over the bridge.

- Tom (2026-11-09): far more, from aerial photos. Studied Esri orthophotos of Beernem, Moerbrugge and Balgerhoeke. The plan is now generated: wandering old roads out from the centre, ring lanes, field lanes, 22 estates of cul-de-sacs, an old core of crooked wall-to-wall streets, an industrial zone by the canal, 16 farms, woods, hedgerow trees, a sports ground. A 2 m occupancy grid packs about 1,800 plots without overlap; a 2048 px painted ground map holds parcels, hedges, gardens, driveways and asphalt. About 250k triangles in one merged mesh.

- Tom (2026-11-09): more like Beernem. The canal now bends (x = 0.00012 (z + 160)^2), with water, walls, towpaths, lamps and the canal road on the curve; the ground is one plane with a hole for the canal. The village fills two lobed envelopes with wavy street grids, dense at the core. Added a large wood, a sand-pit lake, market-garden strips, a tree belt on the far towpath; the industry moved to the canal bank south of the village. Only buildings within 170 m of the canal draw in the mirror pass. Load to ready about 3 s on the M-series probe.

- Tom (2026-11-09): better night light. About 1,860 streetlights along every road: orange sodium on the old roads, warm-white LED on about half the estate lights and all industry. Each switches on at its own photocell mark between Dusk 0.28 and 0.43. Pools are painted once on a 2048 px plan texture, stretched along the road; the ground and the lower walls read them. The night haze picks up a warm town glow; the west afterglow warms the walls that face it. Light points blend colour only, so the mirror's sky mask holds.

- Tom (2026-11-09): less bloom, better blending and buildings. Bloom drops to 0.16 at threshold 1.2; streetlight heads are smaller with a faint halo. Pools take a five-stop falloff, stretch 2.4 to 1 along the road, and pass a soft knee in the shader. Lawns under lamps lose their colour. Roads repaint over gardens, which had covered asphalt and lit green. Houses gain chimneys, dormers, rear extensions, doors, bungalow garage doors, a blue-stone plinth, eaves shade, tile courses, felt flat roofs, and soft contact shadows; trees cast soft shadows on the plan.

- Tom (2026-11-09): real per-lamp light, on three.js 0.170 and WebGL 2 (no renderer change). The streetlights are static, so they pack once into a float texture (position, mark, colour, reach) and a 250 x 250 grid of 12 m cells, each listing its eight nearest lamps. Every lit fragment, also in the mirror pass, sums those lamps: windowed inverse-square falloff, a downward cone, Lambert diffuse, and a Blinn gloss on wet asphalt and glass. The painted pool texture is gone. Frame cost on a real device is not measured yet; the hidden-pane timing is not reliable.

- Tom (2026-11-09): AO and TAA. GTAOPass (three 0.170 addon) after the render pass, blend 0.85; reach 7 m from the sky, 1.2 m on the towpath; 8 samples on Standard, 16 on High; off at ladder rung 2. Sky eye moves the near plane to 2 m for depth precision. A small TAA pass: Halton (2,3) sub-pixel jitter via setViewOffset, history blend 0.12 with a 3 x 3 neighbourhood clamp; it resets on a new view, size, Dusk or weather; on sleep one full jitter cycle settles the frame.

- Tom signed off the blockout (2026-11-09, Go to Task 2).
- Task 2: every streetlight (1,871, with the ten canal lamps moved to stand between the towpath camera and the bridge) can be tapped. A third texture row per lamp holds a forced state and the tap time; lampState() in the shaders gives level and colour. Sodium warms from oklch(0.5 0.12 10) to sodium orange over 3 s with an ease-out from 15 %; LED takes 0.3 s; off fades in 0.4 s. The photocell switch-on shares the pink-to-orange shift. pickAt(x, y) takes the nearest head within 28 px; inside the church tower box the church wins unless a head is within 10 px; the church tap lifts uBell, which fades over about 6 s. Canal-lamp head undersides glow with their state. One lit window in fifteen is a television. Window taps and ripples are left for Task 3.

- Task 3: up to 60,000 rain streaks (16,000 on the towpath) wrap through a box that follows the view; each drop sums the lamps in its 12 m cell in the vertex shader, so rain shows only in lamp cones. Raindrop rings on a 0.9 m grid break the canal and the puddles; reduced motion turns rings off. Rain smears lamp reflections into long broken pillars; Dry keeps them crisp. The chips ease wind, smear and rain over 2 to 3 s; haze thickens with rain. A tap on the canal starts a ring. + Boat (Space) floats a paper boat from the bridge to the towpath camera: it rocks harder in rain, trails a V-wake, reflects, and lights up under lit lamps. The GTAO pass hides rain and lamp heads while it draws depth. Window taps are not built.

- Task 4, plain Web Audio on audioKit: a rain hiss and water plinks whose rate follows the eased rain; a breathing low wind bed; a lamp relay click on every toggle and, for sodium, a 100 Hz mains hum that rises through the warm-up and settles; the carillon, an original eight-note minor phrase on five-partial bells (hum 0.5, prime 1, tierce 1.2, quint 1.5, nominal 2), 0.6 s late, low-passed, mostly reverb, panned to the tower; a second tap queues after the phrase. Every hit jitters pitch, time and level. A hidden tab stops all voices. Q9 passed in the pane: the context runs after a real click and suspends once the loop sleeps (checked with ?sleep=3000). A listen-through by Tom is still open.

- Task 5: Weather and Dusk persist under stimming.canal.weather and .dusk (View and Letterbox persist through the shell); a saved weather applies at once on load. The drifting loop now waits out its 31 ms gap before asking for a frame, so rAF requests stay at 30 per second.
- QA in the browser pane (no Playwright): Q1 node --check passes for the page and the menu. Q2 clean console on the toy and the Lab menu, chips, + Boat, taps. Q3 stills at 1280 and 375 throughout. Q4 settled: 0 rAF calls in 2 s. Q5 hidden: 0 rAF calls in 2 s. Q7 three bar controls (Weather, Dusk, + Boat), three key rows. Q8 Space adds a boat. Q9 context runs after a real click and suspends once settled. Not verified: Q4 drifting rate and Q10 frame times (the hidden pane throttles rAF), and Q6 reduced motion in a browser (checked in code only).
- Session cost: no dollar figure is available inside the session. The one build session (blockout through Task 5, with the redesigns to a Beernem-like sprawl, per-lamp light, AO and TAA) used about 780,000 tokens of context.

## Summary of Changes

Canal at dusk (`canal/index.html`) is built and in the Lab, Dutch name Vaart bij valavond (Tom kept the draft).

- A generated Flemish in-between village after Beernem: a bending canal, a crossroads centre (church, staminee, frietkot, station), wavy street grids, estates, farms, woods, a lake, industry; about 1,800 plots on an occupancy grid over a painted ground map.
- Light: about 1,870 streetlights with real per-lamp light through a 12 m lamp grid, photocell switch-on, tap toggles with the sodium warm-up, TV flicker, GTAO and TAA, low bloom.
- Rain lit only by lamps, raindrop rings, broken reflections, weather easing, tap rings, paper boats with a wake.
- Sound: rain and wind beds, lamp clicks and hum, a far carillon; Q9 passed.
- Bar v2: Weather, Dusk, + Boat; View, Letterbox and Quality in Settings; Weather and Dusk persist.

Open for a real device: frame rate (Q4 drifting, Q10), reduced motion in a browser (Q6), and a listen-through.

- Tom (2026-11-09): camera control. A vertical three-way rocker on the right edge (Sky, Tower, Path) replaces the View row; the slab tips toward the end that is down; arrow keys step it. Tower is a new middle view over the canal toward the bridge and the church. The camera flies between views over 1.2 s (1 s cut-off under reduced motion). Scroll or pinch zooms: the high views move in and out, the towpath narrows its lens. AO reach and the rain box follow the view.

- Tom (2026-11-09): four places, modelled out. The rocker now has four stops: Vaart (the towpath), Kerk, Station and Voetbal; scrolling out from a high place climbs to a top-down view of the sprawl (zoom to 9x). Kerkplein: a kermis with a striped carousel that turns, a small wheel with upright gondolas, bumper cars under a lit roof on a glowing floor, five stalls with striped awnings and lit counters, festoons of chasing bulbs; its coloured lamps join the per-lamp light. Station: two 104 m platforms with shelters and lamps, overhead-line portals and wires, a bike shelter, a level crossing whose arms drop and red lights blink while a train is near, and a four-coach double-deck train on a 190 s timetable that brakes into the station, dwells 20 s and pulls out, alternating direction. Voetbal: a mown, lined pitch with goals, four floodlight masts that light it, a kantine and a covered stand. Lamps now carry their own colour, reach and an instant flag.

## Notes: roads and horizon

- Roads carry a detail texture: edge and centre lines, kerbs, a zebra at the square, red cycle paths.
- Wet asphalt shows grain, gutters and a stretched glint under each lamp.
- The horizon holds nine far villages with spires and lights, and four wind turbines with red lights.

## Notes: Beernem from OpenStreetMap

- `canal/beernem.json` is a bake of OpenStreetMap (ODbL) round the Parkstraat bridge, 3 x 3 km. `canal/bake/beernem.py` makes it from API tiles.
- The frame: origin on the canal under the bridge; -z runs down the canal toward Brugge.
- Buildings stand on their own footprints; the front faces the nearest road. Roads, land use, ponds, hedges, tracks and platforms come from the map.
- Sint-Amandus and Maria Moeder Gods stand on their footprints. The kerkplein is a cleared square beside Sint-Amandus; the kermis moves there by one matrix.
- Shops, cafés and frituren on the map light their ground floors.
- The page credits OpenStreetMap at the foot of the stage.

## Notes: lit E40 and the wip

- The bake holds a motorway layer out to 8 km (`mw`), from an Overpass export. The E40 passes about 2 km west of the bridge.
- Masts stand on the central reserve every 42 m, two sodium heads each; they join the streetlight network.
- The carriageways draw as their own strip: asphalt, lane lines, a sodium pool under each mast.
- Traffic: white head lamps show from the front, red tail lamps from behind.
- A staande wip stands on the nearest open lawn to the kerkplein: a 27 m mast, three tiers of feather birds, a red top light, a shelter and a gilde house.
- The sky dome follows the camera; far from the origin it fell past the far plane and showed black.

## Notes: pigeons and chapels

- 28 pigeon lofts stand at the far end of back gardens: stained boards, a landing cage on the roof.
- Forty pigeons wheel over the loft nearest the kerkplein; they go home after Dusk 0.72. A tap on that loft sends them up for 45 s with a wing clatter.
- Two kapelletjes stand at crossroads 450 to 1300 m out: white, a candle that flickers behind the grille, a lime each side.
- The WWI gedenkzuil from the map stands on stepped plinths, lit from its foot.

## Notes: rotondekunst

- The roundabout north of Sint-Amandus carries the toy's paper boat in corten steel, 8 m long, bow to the church, on a grass dome inside a kerb.
- Six ground spots wash it from below once Dusk passes 0.12.
