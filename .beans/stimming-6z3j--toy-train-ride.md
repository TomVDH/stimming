---
# stimming-6z3j
title: 'Toy: Train Ride'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-08T11:02:11Z
updated_at: 2026-11-09T22:20:00Z
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
