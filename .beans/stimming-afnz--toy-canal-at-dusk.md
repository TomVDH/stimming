---
# stimming-afnz
title: 'Toy: Canal at dusk'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-09T07:18:19Z
updated_at: 2026-11-09T09:24:41Z
---

Build Canal at dusk from docs/plans/canal.md. It starts in the Lab. A Flemish canal at blue hour in the rain: tap the quay lamps to light them; their reflections stretch across the water; a paper boat drifts through the light.

- [x] Task 1: K2 lift from Fireworks; facades, quay, bridge, belfry, sky, haze, mirror water
- [x] Task 1: Q1, Q2, stills at three Dusk values in Dry at 1280 and 375 px; checkpoint with Tom
- [x] Task 2: lamp picking, sodium warm-up, pools on wet cobbles, windows and TV flicker
- [x] Task 3: rain lit only by light, ripple rings, chip easing, paper boat
- [x] Task 4: sound: rain bed, lamp relay and buzz, carillon, wind; Q9
- [x] Task 5: bar, Settings, persistence; Q1 to Q10
- [x] toys.json entry and menu Lab entry with an icon and a GSAP hook
- [ ] Tom sets the Dutch name (draft: Vaart bij valavond)
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
