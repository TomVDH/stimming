---
# stimming-6z3j
title: 'Toy: Train Ride'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-08T11:02:11Z
updated_at: 2026-11-09T19:34:00Z
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
