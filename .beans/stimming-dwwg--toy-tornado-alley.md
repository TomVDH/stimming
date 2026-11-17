---
# stimming-dwwg
title: 'Toy: Tornado alley'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-16T19:44:51Z
updated_at: 2026-11-17T08:19:05Z
parent: stimming-oh7b
---

Build Tornado alley from docs/plans/tornado.md (idea 364, Tom's add 2026-11-16). Size XXXL. It starts in the Lab. A wide, still, deadpan cinematic vista of the Oklahoma plains under a huge supercell. Several tornadoes at once; each carries an F-scale (F0 to F5) to set and play with.

- [x] Task 1: blockout of the shot: plains, wheat, farmhouse, road, supercell; checkpoint with Tom
- [ ] Task 2: one tornado: funnel volume, rotation, dust skirt, F-scale knob (framing blockout done; next: the hero ray-marched tornado with a continuous F-scale slider, per Tom)
- [ ] Task 3: many tornadoes: place, set F-scale, paths, ropes out
- [ ] Task 4: storm: wall cloud, rain curtain, hail, lightning, light and grade
- [ ] Task 5: debris and damage: wheat flattens, fence and barn debris
- [ ] Task 6: sound, Settings, Dev rows, QA at 1280 and 375 px
- [x] toys.json entry and menu Lab entry with an icon and a GSAP hook
- [ ] Tom sets the Dutch name
- [ ] Record the session cost

## Stage 1 status (2026-11-16)

Blockout built; waits for the checkpoint with Tom.

- [x] `tornado/index.html` + `tornado/main.js` on `shared/environment.js` (sky palette, glow, grade, output); Bar v2 spec wired
- [x] The shot: wheat, two-lane road to the vanishing point, poles and wires, farm (house, barn, windmill, shelterbelt), supercell (tower, overshooting top, anvil, base shelf, wall cloud, rain curtain), low sun behind the camera
- [x] Stubs: click touches down a flat grey funnel at the F level, drag steers it, keys 0 to 5, + Tornado, Clear, Storm slider, Time in Settings, Exposure in Dev
- [x] Headless QA: clean console on the toy, stills at 1280 and 375 x 812
- [x] Checkpoint with Tom (passed 2026-11-16)

Known gaps for later stages: the runner draws at the full frame rate while awake (no 30 fps drift step); the scene sleeps after 60 s with no input. The wheat shows faint row banding mid-distance. No sound yet.

### Stage 1, round 2 (Tom, 2026-11-16: "the road is offset", wheat "responsive to the wind", "the tornado would be in the distance", "golden ratio")

- Golden lines: the horizon sits 0.382 up the frame; the eye turns left so the road vanishes 0.618 across; the road runs 11 m right of the eye; the wall cloud lands near the left golden line.
- Wheat: near shells of ears with awns lean with the wind; gust fronts roll downwind as a pale sheen; the Storm slider drives the wind; the windmill turns faster with it.
- Distance: the storm sits about 30 per cent further out; a click places a funnel 8 to 30 km away.
- Headless 60 fps at 1280 x 720, console clean.

- Round 3 (Tom: the road "a bit more to the right", its golden cut "past the camera FOV"): the road vanishes at 0.764 across and runs 14 m right of the eye. The showcase goal and the composition are in docs/plans/tornado.md.

- Round 4 (Tom: the road moves left, "it will partially go past camera fov"): the road vanishes at 0.618 and runs 7.5 m right of the eye; its near end leaves the frame at the bottom right.

- Round 5 (Tom picked all four: storm base, sky and light, near wheat, storm placement), one commit each: the updraft and wall cloud on the left golden line with open sky above; a striated, ragged base with a lowered wall cloud and a greener core; a dusty sky with a warm horizon band that dims round the storm; the eye drops to 1.25 m and a foreground of 56 soft-focus ears sways with the gusts.

- Round 6 (Tom: "road to the left more, the camera partially hangs over it"): the road centre runs 3.4 m right of the eye, so the eye hangs over its left edge; wheat shells skip the verges, the verge and gravel have texture, the field's sunlit face is brighter.

## Stage 2 status (2026-11-16)

Built; waits for the checkpoint with Tom.

- [x] Funnel volume per tornado, ray-marched only near its curved axis: F-scale width and flare, a sway and a lean, helical striations that spin at 45 to 120 m/s over the radius, a ragged condensation edge, a top that spreads into the base, darker with F (grey at F2, near black at F5)
- [x] Dust skirt: wider than the funnel, spins faster, billowing, height by F
- [x] Life cycle: dust first, then the condensation lowers (touchdown); drift with the storm by F; rope-out bends the axis into an S, narrows to a 35 m rope, breaks up and fades (14 s + 7 s); each tornado ropes out by itself after 55 to 130 s
- [x] Controls: right click or double click ropes out, the wheel or [ ] steps a tornado's F level (eased over seconds), Clear ropes all out, a second Clear removes them
- [x] Tornadoes stay under the base: 17 to 36 km out; the shelf reaches to 15 km
- [x] QA flags ?near, ?age, ?rope, ?qa; headless 60 fps with four tornadoes; console clean
- [ ] Checkpoint with Tom

- Stage 2, round 2 (Tom: "a little less far away from the action, 50 or 85mm lens", "the tornados will be the centre pieces"; then "50mm looks good"): Lens setting 50 mm (default) or 85 mm; the storm moves 17 km closer; tornadoes 5 to 14 km out; funnel tops follow the local base (lower under the wall cloud) and fade before the cut; finer storm edges near the eye; F5 dust narrower and thinner.

- Hero tornado lab, first pass: tornado/lab.html + lab.js (noindex). F slider F0 to F5 morphs rope, cone, stovepipe, wedge; Morph, Pause, knobs (spin, turbulence, debris, distance, lens, sun, steps, resolution). Headless 44 to 60 fps at 0.6 resolution. Waits for Tom.

- Tornado lab, funnel surface pass (Tom picked it): noise lookups were 16 times too fine (the speckle, sandy debris and grainy base); the wall is now lumps that bend helical striation bands, with fibres and curds as shade; cavity shade from the field; the fringe shows only on the silhouette, so the funnel models lit and shaded; the haze under the storm is dim. 60 fps headless at every F level.

- Tornado lab, onion pass (Tom: "layers of swirling noise and raymarched volume like an onion", "production fidelity before we continue anything else"): the funnel is now a volume: a ragged dense core inside five thin sheaths, each spun as one body at its own Rankine rate and climb speed, noise helical, eroded and radial; multiple-scattering light with sun shadow rays and a two-lobe phase. Knobs read from the address (?lens=85&dist=0.5&res=1). Headless 53 to 60 fps at 0.6 resolution.

- Tornado lab, layering, light and smooth F (Tom: "ensure layering and shading light is a bit better", "smooth transition between fujita scales"): each layer's spin angle and climb are integrated per frame in lab.js (uPh), so F or Spin changes only change speed; the F table reads as a clamped Catmull-Rom curve; sheaths sit at 1.0 to 1.8 R with air between; shadow rays see each layer's mean ring, so outer sheaths shade inner ones; warm bounce from the wheat lights the lower funnel. Headless 60 fps at 0.6 resolution.

- Fix (Tom: "you did a regression", "warped in the middle when switching", "fucked at low F levels"): the climb term divided height by the local radius; in the flare that ratio stalls, so the upper funnel smeared into vertical sheets. The bands now use one height scale per funnel (uZs, gentle with size). A slider jump eases over about 3 s.

- Fix (Tom: "the onion layers blend together and smoothen the lower the F scale is", "properly fix all"): detail now follows the screen: sheath gaps stay three pixels or more (gSp) and the noise thins round a funnel that is thin on screen (gAng); the camera moves in on thin funnels; features round the funnel keep the shape of features up it at any size; the helix leans by arc, not angle (wide funnels had sheared flat); the dust spins as one body with integrated phases (the crossfade doubled at F4 and F5); lighter history (0.55), default resolution 0.75. Headless 60 fps at F1, F3, F5.

- Fix (Tom: "bottom of tornado looks weird and cut off with white"): the funnel ended in a flat, dense cap. It now tapers to a point over max(4 R, 80 m) at its lower edge, thins as it narrows, and tears along the wall's noise near the tip; the edge varies less once the condensation reaches the ground, where the tip sinks into its dust.

- Lab storm (Tom: the blockout storm clouds were the better start; then "Lab, wide framing"): two rejected attempts (a Worley cloud slab, then the blockout scaled up close) were reverted unpushed. Now the lab carries the shot's blockout supercell (main.js shapes, plates, scud, light, gloom, rain curtain) at its true scale, seen from the shot's distance (8 km to the wall cloud, 50 mm; Distance knob multiplies). The wall cloud stands over the axis and lowers a little with F; the funnel hides behind the storm's first surface. F0 is storm only (no condensation, no dust); a funnel cloud lowers from F0.5 and reaches the ground near F2. The noise volume gains a Worley channel, used lightly in the scud.

- Lab: storm and funnel merged (Tom: "merge them"), and a time-of-day control (Tom: "allow for a TOD setting in the lab"). The blockout storm hangs from the funnel's top in close framing (scaled from the shot, uKs). Round the tornado (2.8 storm km) the storm is density in the funnel's own march, turning with the outer sheath; the shell backdrop fades out there. The funnel takes the storm's shade (shadow rays to the base's height) and, near its top, its tone. Time 12:00 to 21:00 sets the sun's height, its colour by air mass and the sky light; Sun dir sets its bearing (0 behind, 180 backlit). Headless 20 to 60 fps; a performance pass is next.

- Junction (Tom: "the smooth merge / connection between storm layer and the actual funnel is not quite there yet"): a collar (bell) now flares out of the funnel's top quarter up into the wall cloud, in the funnel's own volume and light, its edge torn by the outer sheath's noise; the funnel's top fades inside it; the wall cloud's underside is an upturned bowl, and clears a wide envelope round the bell so its rough underside no longer cuts across the funnel. ?dbg=3 hides the bell, ?dbg=4 the near storm. Headless 13 to 50 fps on a shared GPU; a performance pass is due.

- Blend and refinement (Tom: "a gap between cloud deck and the funnel exists", "better refinement in the funnel across all F scales", "neatly colour blend from storm deck to top of bell to funnel"): the bell fades into the deck while the deck fades in over it (no void); the deck's edge softens near the bell; the bell's top width grows with F; one colour chain: the funnel turns to the storm's smooth tone up the bell (topKAt), and the deck by the bell takes that same tone before its own textured light (TONE_K matches their means). Funnel: round billows in each layer's own spinning frame (no more hair streaks), softer outer sheaths, rounder dust, less fill light.

- Taper and bands (Tom, 2026-11-16: "ensure smooth and realistic taper of clouds down to funnel", "i see bands of colour"). One horn joins the funnel to the deck: a quarter-ellipse outline (hornR), upright where it leaves the funnel, level where it meets the wall cloud's flat underside at uH. The funnel's own layers widen along it, so funnel and horn share one outline and no lip shows; a solid takes over up high and fades inside the wall cloud. The neck SDF, the bowl under the wall and the F lowering are gone. Bands removed: the far storm's plates stay on its flank (they striped the base's underside), the horn takes the deck's own light (stormLit at the underside just above it; cloudTone ran three times too dark), the sky under the base keeps one hue (the navy strip is gone), the rain shaft reaches the lab's ground as a soft grey veil (it floated as a green box), the funnel's shade takes the warm horizon light (it went navy), and the march's first steps carry a full step of jitter (wood grain). The wall cloud is always wider than the funnel's top, and the near region grows on a wide lens. The camera keeps the horn in frame at low F (frameK floor 0.76). Checked F0 to F5 at 24, 35, 50 and 85 mm, and at noon backlit; console clean.

- Shared lab: <https://claude.ai/artifact/4rQ7D568vJZ2DSwGnwRpFf> (private until Tom shares it). One page built from `tornado/lab.html`, `lab.js`, `shared/gl.js`, GRADE and OUTPUT; phones open with the knobs folded. Republish after a lab change.

- Taper follows F, no puck (Tom, 2026-11-16: "the upper taper seems to stay as wide and doesnt seem to correspond with F scale", "we cant have a puck of taper on the cloud deck and then the funnel come from it"). The lowered wall-cloud block is gone; the deck is one flat base, DECK (0.3 storm km) over the funnel's top. The horn is now part of the storm's own shape (hornDist in stormShape, joined to the base by a smooth minimum), so the deck's lumps and light run down it with no edge. Its flare is a share of the funnel's top radius (1.4 at F0 to 0.8 at F5), so it widens step by step with F; its outline is a 1.6 superellipse, upright at the funnel, level at the deck. Low down it lies inside the funnel's body, so the deck shows only where the horn flares past the funnel. On the horn the base's ragged noise eases (most by the funnel) and the light is the underside's. F0 has no horn. The near storm and the shell overlap at their seam (shellOff). Checked F0 to F5 at 24, 50 and 85 mm and at noon; console clean. Left: faint arcs round the horn's rim at 24 mm, and a tone step where the light funnel enters the dark horn at 85 mm.

- No shroud (Tom, 2026-11-16: "strange secondary shroud around tornado base"). The deck's horn showed as a darker cone round the funnel's middle wherever it flared past the funnel's bright body. Now it stays inside the funnel's body (0.7 of the funnel radius in) up to 55% of its height and reaches its full outline only near the deck, where the funnel has already taken the deck's tone; the funnel widens along the same outline, so they read as one body. Checked F0 to F5 at 24, 50 and 85 mm and at noon.

- Shroud, the real cause (Tom, 2026-11-16: "that shroud over the funnel still appears", "innate blend", "gently undulate the main cloud layer"; he approved the side-by-side clip). The funnel's own flare ran up 45% of its height, darkened to the deck's tone, and hung in front of the far deck (6 km behind the tornado) as a cone round the bright lower funnel. Now the flare is short (collarLen: 0.6 of its width, at most 15% of the funnel's height), the colour turns only inside it, and the onion closes into one body up the flare. The deck swells: broad noise drifts under the base and breathes on a ten-second cycle. `?dbg=5` paints the funnel red and the deck blue. Lesson: judge in motion, at the default view, before showing Tom; stills at t=40 missed this twice.

- 2026-11-16: the lab opens at a lower quality (Tom: step down, go from there): Resolution 0.5, Steps 60. M3 Pro, pane at 762×984: 47 fps (was 26 at 0.75 / 80).

- 2026-11-16: the Claude app stalled while the lab ran (Tom). The lab now draws 30 fps at most, draws nothing in a hidden pane, and rests once paused and settled; any input wakes it.

- 2026-11-16: the lab is now the joined build from spike stimming-az9d (shells for the funnel, the backdrop baked in strips, a log-polar deck whirl, every setting as a knob, Width 1.6 by default). Tom: "spike joined is good". About 1.8–1.9× less GPU time than the old march at the same size.

- 2026-11-16 (Tom: thicker as in opaque, more ground connection at low F, a hard light edge in the base dust, a JSON copy): Opacity knob (default 2.2) on the core and sheaths; the tip's taper keeps its length when Width widens the funnel (it had thinned most of the body); the dust's self-shade uses three nested circles and a sun ray across the whole cloud; condensation reaches 0.65 / 0.92 down at F0 / F1 and the dust whirl stands 120 to 190 m at low F, so they meet; Copy JSON copies every knob, F and the part boxes.

- 2026-11-16: the funnel's self-shade stopped 100 m over the funnel's top, which lit the flare above a hard elliptical ring (Tom: "sigh.."). The shade now runs up through the flare with a soft foot. Next in the scene: the sun and gentle sunlight patterns through gaps in the clouds, ready for god rays later (Tom).

- 2026-11-16, Tom's lab defaults: Opacity 4.55, Sheaths 0.25, Core edge 0.23, Debris 0.58, deck Turn 0.08 (the rest unchanged).
- [ ] Tom: the funnel's twist, reach and bend follow the wind and move over time (dynamic, not fixed knobs).

- 2026-11-16, Tom's lab defaults (second set): Turbulence 0.63, Opacity 0.40, Sheaths 0.05, Core edge 0.80, Debris 0.58. Opacity grows with the log of F: × (1 + 1.5 ln(1 + F)). Opacity's slider goes down to 0.05, Core edge's up to 1.6.

- 2026-11-16: Sheaths 0.35 by default; low F is thinner: opacity × (0.5 + 1.75 ln(1 + F)) (Tom).

- 2026-11-16: Light through knob (0 to 1, default 0): sunlight passes the funnel's own cloud more freely, so its shaded side lightens (Tom).

- 2026-11-16: Rim blend knob (default 0.6): a ray that only grazes the core's edge sees thinner cloud, so the lit rim fades into what lies behind it (Tom: rim too harsh; otherwise "looking impressive"). Tom's defaults from his JSON: Light through 0.4, Time 20.7, Sun dir -106, Steps 63, Resolution 0.6, Bake strips 16.

- 2026-11-16: the scene draws the lab's tornado (tornado/funnel.js): the lab's shells, dust, F table and Tom's defaults, in a half-size pass scissored to the tornadoes' box, laid into envScene; the funnel's top hides behind the scene's cloud by the cover in front of it, so it rises into the base with no seam. Up to four tornadoes, rope-out kept. GPU, M3 Pro, 1828×984: frame 12.7 ms with no tornado, 15.8 ms with one F2.5, 19.5 ms with three F4.5 (minimums). Next: the lab's volumetric deck in the scene (Tom: the scene's deck is "the fake 2d one").

- 2026-11-16: the lab's near deck draws round each tornado in the scene (the horn joined by smooth minimum, the spiral inflow, the deck's light, the fade-in above its floor); it rises with the scene's base away from the wall cloud and fades by where each ray passes the tornado's top, so no ellipse or vertical edges; the nearest tornado owns overlapping deck. About 2–4 ms more per tornado. Open: the rest of the scene's deck is still the old smooth shell, so the lab deck reads as a smooth dark zone round each funnel; three close tornadoes join into a flat dark band.

- 2026-11-16: the scene's storm and funnels are one march (Tom: "merge them"): one half-size pass with history draws the deck (scene shapes, the lab's noise, lumps and light), each horn joined in by smooth minimum, and each funnel's shells and dust; envScene keeps the ground, road, poles and farm sharp and lays the storm on by its cover. Each tornado carries its own whirl in the deck, centred on its top, growing with F (Tom: the deck's swirls are the tornadoes' sources). The deck runs over and behind the eye (no edge in frame at 50 or 85 mm). Dev row Sun dir (default 20°). The crosshatch came from a pixel-locked dither; it is now per-frame noise. GPU, 1828×984, minimum frame: no tornado 9.6 ms, 1 × F1 12.2 ms, 3 × F4.5 18.0 ms. Unchecked: motion, rope-out, phone.

- 2026-11-16, join part 1: the horn's sides take the low sun as the funnel does; the funnel's top turns to the deck's own light at each step; the sky light fails toward the base under the deck, so the light band at the top is gone; the tone turns a flare's length lower. ?time=golden picks Time for one load (QA).

- 2026-11-16: Opacity 1.2 by default in the scene and the lab (was 0.40; Tom: funnel density low). 0.40 was set close up in the lab; at 8 km in the scene, behind haze, with Rim blend and Light through, it read faint.

- 2026-11-16: the lab's Opacity is back to Tom's 0.40 (Tom: "get me my lab settings back"). The scene keeps its own values.

- 2026-11-16, cloud optimization (parked): the deck's finest noise fades out between 25 and 45 km, held at its mean; the light probes skip it; clear air steps by the bare storm shape with no noise. QA: ?time, a sturdier GPU timer, a wall timer, a noise-read counter (uCount). Before/after GPU times not measured: the GPU was shared.

- 2026-11-16, Tom: poppier, opaque to the ground (scene only): density 2.4, the sunlit side weighs 1.0, the table's darkness × 0.55, the deck's tone only up the flare, the tip thins only in its last short stretch once it reaches the ground. ?sunaz for one load (QA).

- 2026-11-16, Tom: a wider view: 28 mm by default (35, 50, 85 in Settings; new key lensWide so an old saved 50 does not hold). Horizon 0.382 and the road's vanishing point at 0.618 kept; no deck edge at 28 mm. Tornadoes 8 km out read small at 28 mm.

- 2026-11-16, Tom: Dev row Cloud base (0.8 to 3.0 km, default 1.35; ?base for one load): the base is a uniform and every part hung from it follows (shelf, front deck, wall cloud 0.55 km lower, funnel tops and horns, whirls, deck bands, gloom, rain, cloudShade). The bottom-left strokes at 28 mm were foreground wheat ears; they now keep their 50 mm size and place at any lens.

- 2026-11-16, sky pass 1, Tom: a sun globe with a lens flare: the globe and its glow sit in the sky, so the deck hides them; the flare is the runner's own (shared/flare.js), full in frame, a veil past the edge, off behind the eye or below the horizon, and dimmed softly when the sun's ray meets the deck (a JS copy of the storm's shape).

- 2026-11-16: the backlit funnel read hollow: the gloom under the base was laid over the frame after the storm, along each ray's whole path, so the dark core took the sky's tone. Each storm sample now takes only the gloom in front of it; the sky behind takes the full gloom first. A backlit core is a dark silhouette with lit rims.

- 2026-11-16, Tom: touchdown as a sequence: no whirl with no tornado; per tornado the whirl forms over about 8 s (reach tightens from 2.2×, arms wind 0.5 to 1.4, speed rises; the turn is summed on the CPU), the horn lowers at 60% formed, then the condensation descends (3 s) and the dust spins up halfway down. Rope-out runs in reverse; the tornado leaves when its whirl is gone. Each whirl has its own texture seed. Reduced motion starts formed.

- 2026-11-16, Tom: (1) no fixed pit: with no tornado the base is plain; each tornado lowers its own pit (to 0.55 km as its whirl forms, radius with F), centred on its top, following it, leaving with it; funnel heights hang from the pits. (2) Dev Time of day 14:00 to 21:00 (?tod); the sun sets after about 19:40 into twilight. (3) Dev Wind and Wind dir (?wind, ?winddir): wheat, gusts, drift and each funnel's lean; the trunk bows downwind (thin up to 350 m, wedges 50 m) with the top anchored under its whirl and a slow gust swell.
- [x] Tom: the funnel's twist, reach and bend follow the wind and move over time (started: Wind drives lean and bow).

- 2026-11-17, Tom: 25 live Dev knobs in the scene (?dev; one table KNOBS in funnel.js; remembered as k_<id>; ?id=value for one load; Copy JSON and Reset): Funnel, Colour (Reflectivity, Sunlit weight, Ambient, Darkness, Haze on funnel, Top darkening, Dust tint), Shape, Dust, Deck whirl. Colour blending: a cool shade side from the sky and deck, the upper funnel darkened by the deck's shadow, dust brown and wheat bounce low down, sheath noise as tone, haze on the funnel by height.

- 2026-11-17, Tom: Dev row Eye height (1 to 40 m, ?eye), default 8 m (was 1.25) for a more expansive view; the view stays level, so the horizon (0.382) and the road's vanishing point (0.618) hold; the near wheat reads from above.

- 2026-11-17, Tom: an old water-pump windmill blockout in the left foreground wheat, about 38 m out: four tapering lattice legs with girts (13 m), an 18-blade wheel facing the wind and turning with Wind, a tail vane; dark weathered steel, hazed for its distance. Clear of the touchdown area and the road at 28 mm; cut at the left edge at 50 mm.

- 2026-11-17: the power line's first pole stands 30 m out, so at 28 mm from 8 m it shows with its wires sagging between real poles; the near wheat shows drill rows, clumps with darker gaps and downwind ripples, fading out by pixel size. The deck now runs 150 km left and right and about 146 km ahead (one vast system, no edge at any lens), with a thin glow at the horizon under its far edge.

- 2026-11-17, Tom: the far field is baked: past 16 km the deck is a half-size picture with no tornadoes; the live march stops at 16 km with a 14–16 km crossover. The bake renews on Time, Sun dir, Cloud base, Storm, Eye height, lens or size changes, in 8 strips on a running page. GPU, 3 × F4.5, 1828×984, 28 mm, minimum frame: 23.0 ms before, 16.2–17.1 ms after.

- 2026-11-17: the far sky: a tight horizon glow, warmer toward the sun, under three thin ragged haze bands just over the horizon; only the strip under the deck's far edge shows, as a lit, layered glow.

- 2026-11-17, Tom (the scene way too bright; the windmill out for now): the foreground windmill is out (its code is in a28e1e65); the sun's light 1.7× its colour curve (was 2.6), the sky fill about 20% lower, the wheat's albedo about 35% lower with softer gust sheen; the storm reads heavy and dark.

- 2026-11-17, Tom (a weird green patch on the left): flat green tints came from the gloom colour, the rain curtain, the low haze bands and the storm core's tint; the gloom is now cool slate, the rain neutral, the bands warm dust, the core dark slate. Green returns only where light passes rain (the palette step).

- 2026-11-17, Tom: cloud shadows on the plain: sunCover() follows the sun's ray to the base (the storm's bulk shades outright; the ragged fringe gives soft patches drifting downwind; a low sun stretches them into long bands); only the sun's share of light is taken. God rays can reuse sunCover.

- 2026-11-17, Tom: Dev always on for now: tornado/index.html adds ?dev to its own address (remove that head script to hide Dev).

- 2026-11-17, Tom: the Cloud tube is the new default funnel (Shells stays as a Dev choice). The taper, colour blend, spawn fixes, range limit and closer bands with distance apply to the tube first.

- 2026-11-17, Tom (an F2 far too fat; no taper, no colour blend): Width 1.0 by default; the bell spans the top fifth of the funnel, at most about 2× its top radius. The pale ring was the horn's sides taking the sun at the base: the bell keeps the deck's slate there and takes the sun only by degrees down the bell; the deck's tone grows up a bell's height. Cool slate shade side, real falloff on the lit side, Ambient 1.1; torn sheath edges take the deck's tone. The far bake's key holds the full projection and bakes again 30 frames on, so the deck reaches the horizon on every load.

- 2026-11-17: the Cloud tube gets the shells' scale, bell and colour (shared code); its core is denser (2.1 to 3.2), so it reads as condensation; its bands' torn edges take the deck's tone.

- 2026-11-17, Tom (the Storm slider did nothing; spawn squiggles; instant spawn): Storm now reaches the whole sky (low: a higher, thinner, broken deck in rafts with sky between, no pits; 0.85 and up: the heavy deck as before); any bake-key change bakes the far field whole that frame, so near and far follow a moving slider together (also fixes the Time lag). The empty first bake was a texture feedback loop on unit 0, now fixed. Spawn: each whirl's reach and twist stay fixed (their ramp slid the log-polar texture fast); touchdown runs about 38 s (whirl 20 s, pit and horn 10 s from 15 s, funnel 12 s from 23 s, dust 4 s before contact); F eases over 5 s; rope-out reverses slowly. ?age=45 shows a full funnel.

- 2026-11-17, Tom (the rain at the right, awful): the core's rain cylinder drew a hard dark block (its cover had no softening). Its sides are now ragged (noise eats up to 2 km), its cover linear and capped at 0.65, thinner near the ground, mixed 30–70% into the far haze; only a faint soft haze remains (in bce8db66).

- 2026-11-17, Tom (grain; tops too dark, not blending): the tube's fine noise and Worley fade to their mean below a pixel (the main grain cause: aliasing); gentler tone gain and band threshold; history 0.35 while running, four jittered sub-draws for a still; the edge rag halved (no comb hairs); the deck's soft edge 2 steps wide. Tops: the turn-to tone is read from the deck beside the bell; the bell takes half the sun at the base; the tube's density fades over the whole bell while the horn takes over through a softer join; Top darkening 0.6. Seen, not yet touched: vertical streaks in the deck near the whirls.

- 2026-11-17: deck streaks near whirls came from blending overlapping whirls' noise points; the two strongest whirls now read their own deck noise and blend values. Layers hug the core with distance (gap 0.2 near to 0.08 by 12 km; sub-pixel layers fade into the core), ending the hoops; the far dust drops sub-pixel octaves and the rain ring is wider and softer (the dotted far funnel). Dev rows Bake from (6–40 km, default 16; the tornado clamp follows) and Deck reach (20–200 km, default 146). GPU, 3 × F4.5 tubes, minimum frame: 17.3 ms at 8 km, 22.5 at 16, 25.6 at 30.

- 2026-11-17, Tom: Storm drives the funnels (default 0.85 unchanged): a young storm gives paler, cleaner funnels with more sky light and less haze and density; a full one gives darker, dirtier funnels the deck's tone runs further down, with more rain wrap.

- 2026-11-17, Tom: towers show at low Storm: the tower's radius, top and overshooting dome read max(Storm, 0.6), so a young cell stands as a towering, sunlit Cb over a thin, broken deck (default unchanged).

- 2026-11-17, Tom: far breaks and sweeping god rays: deckOpen() opens holes in the deck from 10 km to full at 45 km, toward the sun's side, at every Storm (few and narrow at full storm), drifting downwind with the deck; the storm pass marches 12 jittered steps per ray and lights air whose sun ray crosses a break (haze by height, forward scatter); Dev row God rays (default 0.6, ?god). The far bake renews in strips while running so the far breaks move. Cheap cauliflower lumps on the tower top and dome. Shafts read as warm fans under the deck, best with the sun ahead; not yet crisp beams.

- 2026-11-17, Tom (pancake clouds; the tower looks weird; hollow tube with the sun ahead): god rays stop where the ray turns half opaque, so they light only the air in front (the hollow V); below the default storm each raft gets its own height, domed Worley tops at two sizes, a heaving ragged base and slow drift; the tower is stacked, domain-warped Worley turrets growing softer with height, a boiling overshooting dome and a fibrous anvil edge, paid only near the tower. Known: fine stipple on far high cloud edges.

- 2026-11-17, Tom (higher F, darker and more imposing): Darkness default 0.95 (was 0.55): albedo about 0.16× and sun about 0.5× at F5; F0–F1 pale (+15% albedo); F2 up a dirty brown-grey, full by F4; the deck's tone runs further down with F.

- 2026-11-17, Tom: an opening build-up: the storm eases from 0 to its set level (0.85) on an in-out quart over 90 s (Dev row Build-up 20–300 s; ?buildup=0 for full at once); the Storm slider follows; touching it takes over. At 0.67 the first tornado spawns on the left golden line (0.355 across), 6.5 km out at a strong angle, and runs the slow touchdown. Reduced motion starts formed. QA loads with ?tor or ?storm skip it.

- [ ] Later (Tom): volumetric rain haze: a cloud-noise texture of rain pouring down over the scene.

- 2026-11-17, Tom: the build-up takes 15 s by default (range 5–300; key buildUpS, the old saved 90 removed); during it the far field renews in strips, so no frame stalls.

- 2026-11-17, Tom (god rays drew as horizontal bands): at dusk the true shafts run almost level, so each row integrated different breaks into bands. The march now runs only under the deck (30 km, stops at the first opaque body, 24 jittered steps); each step follows the shaft to the base, never flatter than 24°, so beams hang from the openings; bright at the opening, fading with depth. Openings: far breaks and a young deck's raft gaps. Also: the deck's finest lumps fade by pixel size (the cause of the stipple on upper edges); a young tower is a narrow column with no anvil until Storm 0.25–0.65.

- 2026-11-17, Tom (build-up far too quick; the far bake steps): the build-up takes 180 s by default (30–600, key buildUpT) on easeInOutSine; the first tornado drops at Storm 0.67, about 2 min in. A third far target keeps the previous bake and each new bake fades in over it (2.5 s in the build-up, 0.25 s for a drag), so the far field moves without steps. Beams: soft, ragged sides, tapering toward the ground. Thick cloud hides the sun globe fully. A young cell's shelf is small so the tower stands clear; the dome boils at two scales.

- 2026-11-17, Tom (no automatic layer falloff; top blend): Dev knob Layer gap (0.05–0.5, default 0.2, ?gap) sets one gap for every funnel at any distance; the distance logic is gone. The top's speckle came from the tube core's ragged edge under grazing rays in the flare: there the edge noise drops to 0.25×, the edge ramp widens 2.5× and the lump light gain eases to 0.6; the turn-to tone is read at one fixed point per tornado. A faint grain remains on the shade side at the join.

- 2026-11-17, Tom (rhythmic frame lag; build-up in 45 s): the build-up is 45 s by default (10–600, key buildUpU); the first tornado drops about 31 s in. The hitch: the far field renewed one contiguous eighth per frame, and the band across the horizon cost several ms more, every 8th frame. Each slice is now every eighth row, so every frame bakes the same mix. One whole far bake costs about 8 ms. Also in this commit, unfinished: deckOpen as discrete holes and a beam split (safe, not yet tuned).

- 2026-11-17, Tom (god rays must follow the sun, the real breaks and the sun's colour): shafts follow the true sun (no floor), lit only through openings the march draws (deckOpen far holes, raftGap gaps), blocked by the storm's bulk; a few soft ragged holes 3–8 km wide, 15–40 km out, drifting with the deck; each hole splits into two or three beams fading down their sun path; colour uSunCol tinted by the haze. At Tom's default (19.05, Sun dir 100, sun 4.7° up, side-on) no shafts read, which is honest; Time 17–18.5 or Sun dir 140–180 shows them.
