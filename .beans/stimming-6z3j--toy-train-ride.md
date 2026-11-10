---
# stimming-6z3j
title: 'Toy: Train Ride'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-08T11:02:11Z
updated_at: 2026-11-10T11:06:33Z
---

Lab toy grown from viaduct/protos/window.html: a night valley seen through one carriage window on a high viaduct, with rain and breath on the glass.

## Checklist
- [x] trainride/index.html on the shared shell (intro, header, bar standard, Settings, about)
- [x] Sound: rain hiss, drop ticks, bogie rumble, four-beat clack per rail joint, breath puff (Web Audio on kit.out; not heard by ear yet)
- [x] toys.json entry (nl Treinrit, set by Tom 2026-11-08)
- [x] Lab menu li with placeholder icon and toys.trainride hook
- [x] Browser pane check at 1280 and 375 px, clean console
- [ ] Frame rate on a real device (pane was hidden, rAF throttled)
- [ ] Commit and push

## Round 2 (Tom, 2026-11-08)
- [x] No glass interaction: breath, tap and + Breath removed
- [x] Rain follows the train: glass runs sweep back with speed; air rain streaks along the relative wind
- [x] Drag turns the head inside the cabin; the window stays fixed in the wall
- [x] Smaller drops; drops are lenses with a dark rim and a warm room highlight; trails are thin cylinder lenses
- [x] Grime tracks on the pane that passing lamps light
- [x] Lit carriage panes light the near rain, posts and parapet (parapet now follows the train)
- [x] Carriage jolts on each rail joint, in step with the clack; slight roll
- [x] Moving train draws at full rate; compile wait capped at 4 s
- [ ] Real-device frame rate (pane measured 35 to 44 fps at 2464x1736 on High)

## Round 3 (Tom, 2026-11-08)
- [x] Drag leans the head (lean and peer) with a small aim; the frame stays upright
- [x] Scroll or pinch leans toward the glass, down to 0.3 m; drops and blur scale with the distance
- [x] Rain streaks near the eye fade out

## Round 4 (Tom, 2026-11-08)
- [x] Fog patches grow after about 30 s of Rain, from the frame and the low pane; other weather dries them
- [x] Running drops wipe tracks through fog that fog over behind them
- [x] Cabin baked once into a cube map: faint reflection on clear glass (Fresnel) and a softer one in the fog

## Gallery
- [x] The Night viaduct gallery card opens Train Ride; viaduct/protos/window.html redirects to trainride/; new thumbnail.

## Round 5: valley, lamps, day
- [x] New land: winding river with lakes, pasture benches, wooded ridges, snow peaks out to 18 km
- [x] Terrain rows snap per row, so the land never swims; vertex normals and day shadows
- [x] Lakes mirror the peaks (coarse reflected march)
- [x] Night sky cleaned up: stars, softer moonlit cloud
- [x] Lamp posts redone: steel post, slim head, LED bar, beam in rain; dead and flickering lamps
- [x] Day look: Swiss valley, blue sky and cumulus, aerial haze, ACES with a punchier grade; T or the Night/Day chips
- [ ] Check lamps and smear at speed in a live tab (headless stills are static)

## Round 6: Zurich to the Walensee
- [x] One 36 km loop: Lake Zurich (towns, vineyards, Oberland), the Linth plain and canal, the Walensee under the Churfirsten
- [x] Lakes at -40 m; the eye lifts under the Churfirsten
- [x] Lights follow the route: a bright Lake Zurich shore, dark Walensee with Quinten
- [x] Sky dome follows the camera (it fell away past x = 20 km)
- [ ] Tom checks the route live at speed

## Round 7: real ground, window, display
- [x] Track traced on OpenStreetMap rails, Zurich HB to Walenstadt (77 km)
- [x] Heights from Terrarium tiles (zoom 13), lakes from OSM outlines, towns from OSM places; baked to trainride/route.png + route.json
- [x] Window: recessed lining with parallax, rubber seal, tinted glass, light cabin wall with panel joints
- [x] Passenger display over the window: next stop, the line ahead, clock
- [x] Station platforms and name signs as the train passes (26 stations, Au ZH and Schübelbach-Buttikon added)
- [x] Warmer interior: cream panels, wooden sill and ledge, warm light
- [ ] Denser lights along the Lake Zurich gold coast

- [x] Stops at every station: braking curve (0.9 m/s²), 18 s dwell, pull away at 1 m/s²; arrival chime

## Round 8: rain slant, platforms, frame (Tom, 2026-11-09)
- [x] Glass runs in four classes: each lags the head wind, grips until its own speed, slants its own amount; stick-slip heads; trails bend through a speed change
- [x] Air rain: each streak takes its own share of the wind, with a gust sway
- [x] Platforms: coping, white safety line, tactile strip, wet asphalt with puddle mirror; canopy with LED strips on columns; sector plates A to D; masts on the open ends; fence; benches and bins; signs hang on rods under the canopy
- [x] Station light reaches the rain, the frame, the wall and the glass
- [x] Frame: anodised window frame, green glass edge, blind cassette with pull tab, maker's etching, cleaning scratches, viewer's own reflection, double-glazing ghost

## Round 9: window, cabin, weather, display, Zurich HB (Tom, 2026-11-09)
- [x] Bigger window with a cross bar: a top hopper pane with its own tilted reflection, an aluminium bar and a latch
- [x] Lighter, cleaner cabin: pale grey panels and lining, neutral light, brighter cube-map room
- [x] Finer drops: smaller irregular beads, a fine mist, thinner threads, softer rims; each drop shows a flipped wide view with sky below
- [x] Smoother fog with finer grain and soft patch edges
- [x] Weather: random on load; rain arrives in the air first, the pane wets over seconds and dries slowly; fog eases
- [x] Passenger display: type only (next stop, minutes in amber, the stops after, clock); no track meter
- [x] Zurich HB: hall roof with a lamp field, four more platforms, a waiting train, no rain under the roof; a dense Zurich light field
- [x] Larger stations get an island platform with its own canopy
- [x] Walenstadt no longer sits on top of Zurich HB at the loop end

## Round 10: Bar v2.5, shared glass rain, Murg (Tom, 2026-11-09)
- [x] Bar v2.5: corners bar (Weather stepper with six states, Speed slider; Time, Drift, Wet glass and Quality in Settings) plus trainride/annex.json
- [x] Weather: Clear, Drizzle, Rain, Downpour, Mist, Fog; random on load; Drift steps to a neighbour every two to five minutes; W and T keys
- [x] shared/glassrain.js: one pane-rain and fog shader (beads, wind lanes, lens, fog) from Window seat's drops; Train Ride uses it; the sperm-like heads are gone
- [x] Runs slant with train speed through a 0.3 s lag
- [x] Line ends at Murg: tools/cut.py cut route.png 3.5 km past Murg and closed the loop; station values are route metres now
- [x] Quiet stop line: flat grey type on the wall, a clock, and a stop's name only while pulling in; no screen, no country tells
- [x] The train stops at six stations (Zurich HB, Thalwil, Wädenswil, Pfäffikon SZ, Ziegelbrücke, Murg) and runs through the rest
- [x] Frame: no blind cassette, thinner cross bar with no latch, lighter reveal and seal
- [ ] Window seat to adopt shared/glassrain.js (its own chat)

## Round 11: one glass base, proper bokeh (Tom, 2026-11-09)
- [x] glasslab/: full-resolution A/B split of every pane-rain shader on one backdrop; Tuned variant on knobs
- [x] Tom: "Train ride now (shared)" is the sole base; Window seat told to adopt shared/glassrain.js
- [x] shared/bokeh.js: disc bokeh after Buoy Business and Wind farm (48 golden-angle taps, hot texels weighted, blades, rim)
- [x] Fog blur: the outside drops to an eighth in two 4x4 box steps, then gathers into discs at half size; no more speckled blooms

## Round 12: cabin, track, express (Tom, 2026-11-09)
- [x] A proper cabin view: a smaller window set in a two-tone wall (warm white over slate, trim at the sill line, heater grille), a fold-down table with its shadow, the seat ahead in the foreground with a pale headrest cover; brighter, cleaner cabin light
- [x] The block ledge under the window is gone; the clock is gone; the stop line shows only a name while pulling in
- [x] Track: the viaduct parapet gives way to an embankment with a second track (ballast, smeared sleepers, glinting rails, cable trough) and a grassy slope; the gaze tilts down 3 degrees to show it
- [x] Express (Settings, key E): runs through every station
- [ ] Real-device fps, live check at speed

## Round 13: just the window (Tom, 2026-11-09)
- [x] No cabin decor: table, seat ahead, two-tone wall and grille removed; one centred window in a bright, clean wall, as in Window seat
- [x] Scratches after Window seat: hairlines in three sizes that glint across the line to each passing lamp, and cloth swirls; the noise scratches are gone
- [x] Faint cabin reflection on the glass stays (cube map, the viewer's ghost, the double-glazing ghost)
- [x] Window fills the view with a slim margin of wall; stop line off (the station signs name each stop)
- [x] Cross bar is a slim flush satin mullion with hairline seals
- [x] Lighter top reveal at night; phone view tilts less, so it is not mostly track bed

## Round 14: night light, dev scrub (Tom, 2026-11-09)
- [x] Night cabin light: fainter, one ceiling lamp above the window; its pool fades down and to the sides; the reveal dims toward the sides
- [x] ?dev: a scrub strip over the stage for the whole line (72.8 km), with km, the nearest station and km/h

## Round 15: rails, sun in the cabin, water, land, start at HB (Tom, 2026-11-09)
- [x] Second track 5.6 m out: real 15 cm rails (polished head mirrors the sky and the carriage, rust web in shadow), angular ballast that streaks at speed, sleepers with pads and clips; lamp posts moved between the tracks
- [x] Clear dries the pane fast; scratches and smudges stay
- [x] Sun now stands beyond the window (contre-jour): by day the cabin is dark, the window glows onto the wall, the frame faces turned to the sun take direct light, and passing posts sweep shadow bands across it
- [x] Water: four octaves of gradient-noise waves, each faded by its footprint (no aliasing streaks); calm far mirror; lighter shallows and a lap line; a sun glitter path; the mirrored land refines its hit with four halvings
- [x] Land: field hedges, less sky in valleys, back-lit grass and leaf edges against the sun
- [x] The ride starts standing in Zurich HB's hall; the waiting train sits one track further out

## Round 16: true sun shadow, flat lakes (Tom, 2026-11-09)
- [x] Sun on the reveal is traced: each point steps toward the sun to the glass plane and is lit only if it clears the opening, so the frame casts slanted shadow edges; the wall is 13 cm deep
- [x] Lakes: the elevation tiles held lake beds (to -170 m); tools/lakes.py sets every lake cell, and anything deeper, to one surface 12 m below the eye; no more cliffs into the Walensee near Weesen
- [x] Field hedges fade out sooner, so they never dash
- [ ] Far cliff shores still show the coarse far mesh as small teeth
- [x] Inset: no glow on the wall round the window; the recess darkens toward the glass, a lit bevel at the wall edge, a contact shadow on the glass by the frame
- [x] Water only on flat ground, so the coarse lake mask never paints a cliff; far land takes per-pixel normals; far vertices filter their height

## Round 17: route rebuilt from OSM (Tom, 2026-11-09)
- [x] tools/fetch.sh pulls 425 Terrarium tiles and OSM rails, stations, lakes and places; track.py traces Zurich HB to Murg (plus 3 km to Unterterzen for the loop); build.py bakes route.png and route.json
- [x] 25 stations, Zürich Wiedikon added; "Au ZH" is "Au" in OSM; Weesen comes from its disused stop node
- [x] Lake bug found: the rail level came from the ground beside the track, which in tunnels is the hill above; lakes sank up to 240 m. Now the rail level is the lowest near ground over 800 m, held to a band per stretch, so lakes sit 10 to 25 m below the eye
- [x] Default weather Clear; Drift moves it every one to three minutes
- [x] cut.py and lakes.py removed

## Round 18: mullion, faked GI, catenary masts (Tom, 2026-11-09)
- [x] Cross bar: a 19 mm mullion; by day dark against the view with a sunlit top edge, by night lit from the lamp above
- [x] Faked GI: the baked cabin traces sun patches through our window wall onto floor and far wall, bounces a warm wash, rebakes when day and night change; on the wall itself the sunlit faces of the recess spill warm light beside them and the sunlit floor fills from below
- [x] Catenary masts every 50 m (H-beam, bracket); every other one has a lamp, every one within 450 m of a station; lamps lowered to just above eye level so they show

## Round 19: adversarial pass on the window (2026-11-09)
Two critic agents reviewed seven stills (realism; feel and craft). Fixed:
- [x] Night: the lit cabin reflects plainly over the dark parts of the view
- [x] Transom higher (13 % from the top, clear of the horizon), one warm-grey material in every state, casts its own sun shadow across the lit jamb
- [x] Sun patches off under fog and rain, at 20 % under a station canopy, off under the HB hall
- [x] Runs through fog read as clear channels, not dark lines
- [x] Scratches near-invisible away from lights; they glint only near a lamp
- [x] Day wall lifted a little (still dark, per Tom); phone and short-landscape crops keep room for the header and chips
Open from the critics:
- [x] Reveal drawn as a projected box from an off-centre seated eye (unequal jambs)
- [x] Pillar reflections of shore lights: random lengths, clipped to water
- [x] Hard teal/blue seam in day water (reflected far shore edge); dark blob on near hills
- [x] Station: sign contrast, platform gradient, saturated back wall
- [x] Track band takes up to a third of the glass on some crops
- Done: the seated eye sits 7 cm left and 5 cm low, so the jambs foreshorten unequally; shore-light columns vary in length and width; the mirrored shore averages two rays; terrain shadows fade out close up; station signs read in shade; the gaze tilts 1 degree less, so the track takes less glass

## Round 20: Pixar-lite land, cleaner track bed (Tom, 2026-11-09)
- [x] Terrain: wrapped key light, shade tinted cool blue (never black), warm rim on edges turned from the eye (strongest against the sun), moon rim at night; cleaner saturated greens, less grain
- [x] Track bed: warm grey ballast with soft speed bands, contact shadow under each rail, a grassy far verge melting into a grass slope; rail web lighter rust, not a black void
- [x] Ballast filtered: rotated gradient-noise layers (no cell grid); each layer fades by its own footprint, along the track with the motion smear and across it separately, so at speed the stones become clean streaks and far off everything settles to its mean; sleepers fade to average cover; verge noise filtered too
- [x] No dark spots: terrain self-shadow floors at 55 %; shaded faces take strong sky fill and a green bounce; woods are rich green, not black
- [x] The cabin bobs too: the eye takes the rail-joint jolts and a slow sway against the wall, so the window moves with the outside

## Round 21: glow, glint, no avatar (Tom, 2026-11-09)
- [x] The viewer's head-and-shoulders ghost on the glass is gone
- [x] Glow after Window seat: quarter-size bright pass with a soft knee and four-tap block average, blurred twice (9-tap Gaussian), added back; replaces UnrealBloomPass, so lights no longer bloom into square pips
- [x] Rails glint: anisotropic specular from each lamp, the moon and the sun, stretched along the rail
- [x] Dev plan page trainride/dev/ (relief, line, stations, baked strip); Tom: the relief map goes into the annex later for background and explanation
- [x] Oncoming trains now and then: a 150 or 210 m two-unit train every one to two and a half minutes on the second track at 31 m/s; window band and doors blurred by the relative speed; lit windows at night, headlights; its bow wave knocks the carriage; ?opp=seconds calls one for QA
- [x] Landscape lights by sector: a streetlight string on the far lake shore from the map's lake mask, houses climbing above it; dense in Zurich and the gold coast, sparse on the Linth plain, nearly dark on the Walensee; a sodium motorway string over the Linth plain; Quinten's few lights across from Murg
- [x] Stations, Pixar-lite: light concrete platform with a crisp white line, calm mottling, pale canopy soffit and white fascia, lighter columns and platform wall; wrapped sun, strong sky fill and a warm bounce on every station surface; canopy lights halved to suit
- [x] Zurich lights sit on the ground; no floating cluster
- [x] Catenary masts: wider, darker, less smear fade, so they flick past the window
- [x] Pane rain calmer: shared grBeads takes a dens factor (Train Ride 0.4); runs stick and slip below 18 m/s (grRuns stick); Window seat calls unchanged
- [x] Dev: window.__train.S.hold(x) parks the train at a route metre
- [x] Terrain seams: cubic B-spline height sampling (bilinear creased along the 13 m grid); per-pixel normals at every distance; terrain shadows marched per pixel with a bias, no triangle-edged shadows
- [x] Dark spots: no lone woods on flat floors, lighter woods; farm fields blend at their edges and fade in from 300 m; hedges only far
- [ ] Walensee: the mirrored far shore at Murg shows jagged grey blocks
- [x] Signs matte: no self light, flat muted navy, soft white rule; station LED strips dark by day, half as strong at night; columns and slab matte, warm light concrete, calmer sky fill
- [x] Terrain restyle, smooth and neat: muted sage meadows in wide bands, no grain, far roofs merge into a soft town tint (no speckle), gentle woods, softer shadows
- [x] Props, placed on the GPU from the map (a placement pass per kind writes base point and size per texel): broadleaf and spruce trees (woods dense, lone trees on meadows, none past 1 km), low shrubs beyond the second track, Swiss chalets (plaster ground floor, timber above, shuttered windows lit at night), barns on farms, plaster blocks in Zurich, timber fences that follow the ground, white round bales in groups, a country road with timber poles and three sagging wires
- [ ] Props: check fps on the MacBook; shrubs may read as blobs
- [x] Audio study: trainride/dev/sonograph.png of Tom's inside-train recording, sections and peaks marked keep or cut
- [x] Cabin sound from Tom's recording (freesound community via Pixabay, inside-train-start-cruise-and-stop): trainride/sound/ holds seven mono 24 kHz clips (1.2 MB). Cruise bed loops seamlessly, its level and pitch follow speed; pull-away plays on departure; the arrival clip starts so its squeal lands on the stop (cruise time plus v/A_DN); idle tail while dwelling; points clatter through station throats at speed; a worn joint every 0.6 to 2 km; a pass-by rush as the oncoming train draws level. Synth rumble only until the clips load; synth clacks sit at 30 %; the recording's own chime replaces the synth chime
- [ ] Sound: Tom to listen and set the mix
- [x] OSM buildings: tools/corridor.py writes 8 corridor polygons (line to 4.5 km out on the lake side); Overpass gives 44,676 footprints and 2,403 Zurich heights; tools/buildings.py maps each to route s and t by Newton on the route grid and keeps 12,951 (Zurich's bigger blocks, none within 45 m of the line; a third of village houses; far shore thinned); buildings.bin 104 KB, 8 bytes each. Houses sit at their real place, footprint and heading; city blocks in five plaster colours with framed windows and shop floors; two thirds of village houses plaster, a third timber chalets; dense town ground paved with lawns; towns keep street trees
- [x] Sound: recording bus about 7 dB quieter, low shelf -4 dB, high shelf +5 dB, air +2.5 dB; all synth voices removed (rain hiss, drop ticks, clacks, rumble, chime); oncoming train plays Tom's trackside pass-by (freesound community, train-passing), cut to 15 s, low-passed at 1.9 kHz, compressed, timed so the fronts meet at its loud stretch and sped up to 1.3x for short trains
- [x] Station clipping pass (all 25 stations, at the mark and at the platform end): no house within 40 m of the line or 75 m of a platform, none on slopes over 0.32; trees and shrubs keep 40 m clear of platform ends; 9 m ramps at both platform ends; cutting banks beside the line grassed, not rock; town paving only in central Zurich
- [x] Zurich HB: a track field (five tracks with sleepers and rails) from 260 m behind the hall to the throat at 2.1 km, merging into the second track; its far edge drops as an embankment; hall platforms ramp down at both ends; props keep off it
- [x] Trains: one shared side shader for the oncoming train and two trains standing in the HB hall: curved body with sky sheen and sun glint, doors with panes, windows that look into a lit saloon (ceiling strip, seat backs, far windows) under a mirrored sky and sun on the glass; the saloon blurs at speed
- [x] Window cross bar backlit: its cabin face sits in its own shade, the view's light wraps its edges, the sun lights its top lip
- [x] Culling: each placement pass drops instances outside the view frustum; an async readback compacts the ids, so each prop mesh draws only what is in view (headless day frame 16.6 ms)
- [x] Pass-by timed to the oncoming train: whoosh held for its length, a recorded cabin thump as the fronts meet and a softer one as the tail goes

## Round 22: buildings, halts, view, glass, sound (Tom, 2026-11-09)

- [x] Night windows no longer vanish: the per-house seed is flat and quantised (an interpolated seed flipped the window hash); far or slanted walls keep the panes' mean glow
- [x] Buildings lower: mapped heights count the roof, so houses lose it; blocks three to five floors; floors 2.5 m (houses) and 2.9 m (blocks); flatter roofs; 34 m cap
- [x] Four station kinds: HB hall, town (canopy and island), village (canopy), rural halt (170 m slab, no canopy, five warm masts, a timber hut); 11 halts on the upper lake, the Linth plain and the Walensee
- [x] View: FOV 44 (62 on tall screens); bumps damped in the seat and full by the glass; more head turn and sideways reach by the glass; a soft head nod on start and stop
- [x] Glass: cabin cube map box-projected (shifts with the head), 512 px, far fainter; the reveal mirrors in the pane edge and always covers the cabin; the railway mark etched in the low right corner; seats, headrests, rack rails and pane frames in the cabin
- [x] No post shadows on the wall beside the window: bounced sun carries none
- [x] Water: each wave octave runs its own way; stronger ripples; livelier light columns at night
- [x] Far lights flicker a little, each at its own pace
- [x] Sound: pull-away and arrival cross-fade with the bed by speed; a whine band under power and brake; hum at any standstill (idle clip); compartment door muffles the bus and opens at platforms and now and then; a low thud on the sub bus as a train passes
- [x] Dev: top view of the built scene (?dev, tick Top view, or ?top=<m>)
- [ ] Sound: Tom to listen (whine level, door muffle, thud)
- [ ] Frame and cross bar wireframes: Tom to pick

## Round 23: churches, variety, shore, roads, fields (Tom, 2026-11-09)

- [x] Churches: in each village the house nearest the centre becomes a white nave with arched windows; its tower stands at the nave's end with a lit clock, belfry slots and a saddle roof, spire or tent. Same mesh and shader as the houses
- [x] Variety at the same polygon count: one roof mesh makes gable, half-hip, hip, tent and spire; a third of the houses turn their ridge; six plaster tints, five roof colours, five shutter colours, some houses without shutters; window spacing per house; plinths; barn doors
- [x] Near shore of both lakes at higher resolution (far shore stays): tools/shore.py bakes shore.png (8192 x 128, 60 KB), a signed distance to the OSM lake outlines for the 768 m beside the line, 8.7 m by 6 m texels, quarter-metre steps. shore() reads it there; the land lies flat at the column's lake level inside the outline and rises gently on the bank. The bake follows the drawn land's half-texel offset. Rebuild check: tools reproduce route.png bit for bit
- [x] Light OSM road data: tools/roads.py fetches 1,604 ways (205 km; motorway to residential, no tunnels) within 540 m on the lake side and bakes roads.png (204 KB): a distance map, 4.4 m by 4 m texels, two halves stacked. The land paints asphalt and verges from it; trees, shrubs, fences and bales keep off it. The invented country road is gone; its pole line stays
- [ ] Fields and pastures: realistic tilings in clusters, deterministic, all baked
- [ ] Train horn of the current Swiss stock

- [ ] Train horn: no source gives the pitch; candidate clip freesound 20065 (Swiss train whistle, licence unchecked). Tom to supply a clip and say when it sounds
- [x] Land tiles (Tom chose runtime tiles, all land): landMat() holds all land colour, the per-pixel normal, sky cover and shore distance. Five tiles (0.125, 0.5, 2, 8, 32 m texels; 2048 columns) scroll with the train; only columns that come into reach are baked, two targets each (colour as square root in 8 bit; normal, cover and shore in half float), mipped, 8x anisotropic. The land shader samples two textures and lights them. The eye's distance in the bake is the offset from the line times 1.08. GPU time per frame at 1586 x 1798 px, timer query, before to after: Bäch day 66 to 18 ms, lake day 93 to 22, plain day 59 to 16, Zurich night 61 to 16
- [x] Fields and pastures in clusters, in the bake: Voronoi clusters some 480 m across; two in five stay pasture; each of the rest has one heading (along or across the valley), one tiling (long strips, short strips or staggered blocks), a lean to a few crops (ley, maize, wheat, stubble, earth), drill lines, grass baulks, a meadow belt, and for half a hedge on the rim. Same strength rule as before: muted, fading in from 300 m
- [x] Stronger fields (Tom): strength 0.85, in view from 110 to 300 m out, clearer wheat, stubble and maize, stronger drill lines and hedges

## Round 24: fine heights, night lights (Tom, 2026-11-10)

- [x] Fine heights beside the line: tools/near.py fetches 146 swissALTI3D tiles (2 m, 112 MB, kept outside the repo) and bakes near.png (8192 x 192, 469 KB) for the 768 m beside the line, 8.7 m by 4 m texels, smoothed 3 m. The band is re-referenced to the real trackbed (our eye rides 3 m above our track) and eases back by its far edge; the sill clamp and the loop blend follow build.py. landO() blends it in with a cubic lookup; frame time unchanged (A/B with ?nonear). Fewer hills block the view: 12.6 % of columns against 17.7 %. Credits in annex.json name swisstopo
- [x] The catenary mast is solid at rest (its 3 % see-through showed the view as a ghost)
- [x] Far houses go dark again past 600 m: their mean window glow read as dense strips; the far light points carry the far shore
- [x] Water lights cleaned: slim soft streaks under each light, each with its own length and strength; ripples dash only the near ones; a narrower, fainter moon path
- [ ] Tunnels: the real line runs in tunnels in places (Kerenzerberg at 62 to 64 km); the ride shows a hillside there

- [x] Softer cabin light at night (Tom): one warm, dimmed light colour for wall, reveal and cross bar; a wide shallow pool with no hard spot; the baked cabin's lamps dim and warm at night
- [x] Cabin mirror blurred (Tom): the cube map reads from a coarse mip; the reveal's mirror image stays sharp

- [x] Darker night cabin (Tom): the cabin light is 0.6 of its last level on wall, reveal, cross bar and the glass's room terms; the baked cabin and its lamps drop by the same share, so the mirror image matches
- [x] Pull-away shaped like a real unit, quicker: the pull builds over about a second, holds 1.25 m/s2 to 13 m/s, then falls with speed (27 m/s in about 30 s). Out of Zurich HB: 300 m at 11 m/s, then 800 m at 19 m/s. Into Zurich HB: the last 250 m at 12 m/s. The arrival sound takes its timing from the same model (S.eta)
- [x] Stops drawn at random each lap: Zurich HB and Murg always; a town 0.4, a village 0.2, a halt 0.12; about seven stops a lap. A simulated two laps gave Thalwil, Lachen, Ziegelbrücke, Murg, HB, then Wiedikon, Enge, Kilchberg, Au, Altendorf, Siebnen-Wangen, Murg, HB

- [x] Dev sound mixer (?dev): each layer plays through its own channel gain (running noise, standstill hum, pull-away, arrival, whine, points, joint, passing train, pass knock, bass thud, door knock), with a level slider, mute and solo; All sound and Door muffle depth; play buttons for the one-shots and the door; a live line of what sounds now; Copy levels gives JSON. Levels save in the browser under stimming.trainride.mix and apply only with ?dev
- [ ] Tom to set the mix by ear and send the levels; then bake them in as the defaults

## Round 25: sound by speed (Tom, 2026-11-10)

- [x] Measured the clips against the cruise loop, by octave band: the low bands (45 to 355 Hz) rise in the first seconds of motion and hold; the bands above 700 Hz rise with speed at about 35 dB per decade; under power the 355 Hz band stands 5 dB over brake. The recording has no pitched whine; it is broadband
- [x] The running sound is now the cruise loop through a speed EQ: gain, low shelf (230 Hz), peak (430 Hz) and sub shelf (75 Hz), from a table by speed share (of 30 m/s) and drive (brake, coast, power). tools/sound-fit.py fits the table and checks it: the model stands within about 3 dB of the recording in each band from rest to 0.62 of cruise. At cruise the EQ is flat, so the loop plays as before
- [x] The timed pull-away and arrival clips no longer play whole. Events: the first 3.4 s of the pull-away clip (air and doors) ends as the train moves; the arrival clip from 35.5 s (squeal, the jolt on the mark, the air let go) starts when the model says 5 s to the stop
- [x] The standstill hum is the same loop at rest (a low hum, 35 s long); the old 5 s loop was the air hiss after a stop, with a bump at its end
- [x] The whine stays as a layer, at the level Tom set in the mixer (2.3 times the first try), driven by power and brake
- [x] Mixer rows follow the new layers; it reads only keys it knows
- [ ] Not run with live sound: the departure and arrival cuts (the pane was hidden). Tom to listen

## Round 26: life outside (Tom, 2026-11-10)

- [x] Boats: 14 lake steamers (two decks, lit windows at night, a wake) that run 1.5 km each way; 320 sails by day, most within a kilometre of the near shore; one car ferry that crosses at Horgen with cars on deck. One placer, three meshes on one shader
- [x] Birds: 340 gull flocks over the water (flap, then glide), 16 buzzards that circle over dry ground, and crows that sit in a field and lift off as the train draws near (about once a minute by day, at speed, clear of stations and water). All roost at night. One mesh, two triangles a bird
- [x] Plane: most pass 6 km out on their way down, a small grey shape by day and three lights at night (steady, red pulse, double strobe); one in three by day is a high one with a contrail. One every few minutes
- [x] Dev: S.cue('plane' or 'crows') and S.life, to bring them on and find them
- [ ] Not seen yet: gulls and buzzards up close, the ferry from the window, the contrail against blue sky. Tom to look

- [x] Headlights (Tom): tools/carpaths.py turns the bigger mapped roads (motorway to unclassified, no residential) into 177 paths, 52 km, paths.bin 19 KB. 713 cars drive them at night: paired headlights toward the eye, red tail lights away, a faint pool on the road, a wider halo in rain; pace and spacing by road class; they fade at a path's ends. One mesh, three quads a car. Seen: a car at Bäch, a line of lights on the motorway near Bilten
- [ ] Cars by day are not drawn; cars do not stop at junctions or meet each other

## Round 27: stations, yard, small things (Tom, 2026-11-10)

- [x] Sound body: the bus EQ now lifts the lows (+4 dB under 180 Hz), dips 2.8 kHz and rolls off the top; level 0.42 to 0.32. The motor band is lower and wider (120 to 500 Hz) and comes through plainly only with the compartment door open
- [x] A click on the view leans to the glass or sits back
- [x] A passing train's lit saloon washes the wall and the reveal while it is alongside

- [x] Platforms stand beyond the second track (the old ones sat on it): a gravel apron with grassed banks carries each; canopy lights, signs, masts and fence move with it
- [x] Rural halt redone: a short, narrow platform, five warm masts, a glass shelter with a bench and a yellow departures board, a clock on a post
- [x] Station clock with the real time; the red seconds hand waits at the top for the minute
- [x] Town stations: a two-floor station house with arched ground floor openings behind the platform (in place of the island platform)
- [x] Zürich HB: the five tracks join the line one by one from 1.5 km; six trains stand in the yard and one shunts; the land keeps below the deck
- [x] Line button (L): a strip with the route, a tick per station and the train; a drag jumps along the line; with ?dev it holds the top view
- [x] Main shelf as beta, No. 41 (Tom, 2026-11-10): menu tile moved, toys.json, AGENTS.md
- [ ] No intro emblem yet (emblem is null); icons are for the toy's icon chat
- [x] The ride starts standing at Zurich Enge (3.14 km), the last stop before the lake opens up (Tom, 2026-11-10); ?x= still sets any start
- [x] Time of day in five hours (Tom, 2026-11-10): morning, noon, afternoon, evening, night. Each sets the daylight share, the sun's direction and colour, a horizon tint for sky and haze, and its strength; a change eases over in about three seconds (sun, tints, daylight, cabin sun patches, lamps); the cabin rebakes as the sun moves; T steps through the hours; an old saved 'day' reads as afternoon
- [x] Menu icon: Tom picked A of spike trainride-1 (window by day; mast sweeps and lake glints on hover); emblem shared/emblems/trainride.svg; picks.json records it
