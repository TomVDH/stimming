---
# stimming-6z3j
title: 'Toy: Train Ride'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-08T11:02:11Z
updated_at: 2026-11-09T09:38:00Z
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
