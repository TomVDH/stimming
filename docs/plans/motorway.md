# Lit motorway (`motorway`) implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. One session builds this toy, task by task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** One buzzing sodium lamp over a motorway overpass. Pull the zoom and the camera climbs out through the dark until the whole country's motorway network glows as orange ribbons.

**Architecture:** three.js 0.170. World units are metres, with the origin at the hero lamp, so the close shot keeps full float precision. The country is a hand-drawn graph of about 30 motorways, each a smoothed polyline. Three layers draw it at every scale: a ribbon mesh (asphalt, verge and lamp pools), one instanced sprite per lamp head, and a dark land plane. One zoom value drives the camera on a log path, the exposure, the haze and the tilt-shift.

**Tech stack:** three.js 0.170 (EffectComposer, UnrealBloomPass, ShaderPass, OutputPass), Tone.js through `kit.tone()`.

**Spec:** the Belgian night series (Broodautomaat, Frietkot, Lit motorway, Beer pour, Chocolate tempering); batch rules in [README.md](README.md); the bar in [bar-v2.md](bar-v2.md).

| | |
|---|---|
| Size, estimate | M to L · $30 to $50 |
| Kits | none; the sodium warm-up idea comes from Canal at dusk, copied, not imported |
| Before the build | nothing. No geodata file ships: the graph is about 120 hand-placed points in the page. |

## The shot

Night. One lamp head hangs above you, close enough to see the long glowing bar under its housing. You stand on an overpass deck. Below, the motorway runs off in both directions, a double row of orange lamps that shrinks into haze.
Pull the zoom. The camera rises and tips down. The overpass becomes a dot, the road a thread, the junctions small knots. Then the whole country shows at once: orange ribbons on black, cities as warm smudges, the sea as true black.
Across the border the roads go dark. Only the towns of the neighbours glow, white and dim.

## Hero moments

1. **The pull-out.** One continuous zoom over five orders of magnitude, from 9 m to 400 km. The lamp row turns into a ribbon without a seam.
2. **Strike-up.** Tap a section. Its lamps catch one by one in a ripple: first a dim red-pink neon glow, then a slow warm-up to full sodium orange.
3. **Switch the country.** The Switch action darkens the whole network, then strikes it again, section by section, so the country draws itself in light.
4. **Traffic (Tom, 2026-11-09).** A typical weekday, baked into the page and looped: 15 Belgian jam points (the R0, the E40 either side of Brussels, the E19 to Mechelen, the Antwerp ring and Kennedy tunnel, the E313, Zwijnaarde, Loncin and more) with hourly shapes. Town-bound lanes jam at 8, outbound lanes at 17; volume follows the hour. One toy hour lasts 6 s. About 41,000 cars run on the CPU (1.2 ms a step; 0.5 ms from altitude, where a quarter steps each frame). Speed falls with the jam, and stop-and-go waves run upstream, so cars bunch where it is bad. White heads, red tails, brake glow when slow; streaks lengthen with altitude. From altitude, jammed stretches of the ribbon tint red, like a briefing map. Rush runs the clock to the next peak; a small clock shows the hour.

**City flags (Tom, 2026-11-09).** Big cities only, plus Mechelen and Bonheiden. Huge glowing slab letters in the map's own sodium amber stand on a stripe that fades down to a ring on the city. Names in Dutch, French and German, then English in brackets; repeats drop out. No coordinates. A flag fades in between 170 and 60 km, out again inside 4 km, and only once the camera has started to climb. Neighbouring flags stand at different heights, and words never leave the screen.

**Opening (Tom, 2026-11-09).** The page opens overhead on the dark country: only the border outline glows, with faint town domes. As the intro clears the outline brightens, then the network boots: lamps strike pink and warm to orange in a ripple out from Brussels, motorways first, slip roads 0.6 s later, main roads 1.2 s later. Traffic lights up behind them. The outline then settles to faint. The whole reveal takes about 12 s.

**The jam shot (Tom, 2026-11-09).** Zoom all the way in and you hang 25 m above the E19 by Mechelen at evening rush, looking down the outbound carriageway: a river of red tail-light pairs crawls under the sodium lamps toward the overpass 60 m ahead, while white headlights flow the other way. A local fleet of 150 cars per km loops 4 km either side of the spot. Flags show only from overhead, and only near their city.

**Far glow.** The tilt-shift disc turns per pixel and eases off from orbit; the bloom widens there, so thin lines glow round, not blocky.

**Road surface (Tom, 2026-11-09).** All procedural, in the ribbon shader: asphalt grain and patches, polished wheel tracks, a wet sodium sheen that mirrors each nearby head as a long GGX streak (wetter in fog), cat's eyes on the edge lines, and clumped grass verges. Slip roads draw as single-lane ramps.
5. **Fog.** The Fog chip thickens the low air. Every lamp grows a halo and the ribbons swell into a glowing mist; the close shot turns to an orange room.

## The physics

| Detail | In the toy |
|---|---|
| Low-pressure sodium (SOX) emits almost one wavelength: the sodium D lines at 589.0 and 589.6 nm. | All lamp light is one orange (OKLCH 0.72 0.17 62). Surfaces it lights lose their hue: the shader uses albedo luminance only. Only traffic lights keep colour. |
| A cold SOX lamp starts on its neon-argon starting gas. Neon glows red-pink. | Strike-up starts at OKLCH 0.5 0.17 12, at 10 % level. |
| The sodium then vaporises and takes over over several minutes. | Toy time: 6 s, ease-out, through a salmon midpoint, to full orange and full level. |
| A hot SOX lamp restrikes at once. | Each section keeps a temperature that cools over 20 s. A warm section comes back orange in under 1 s. |
| Mains at 50 Hz gives a 100 Hz ballast hum. | The lamp buzz is 100 Hz plus odd harmonics, louder close up. |
| Old lamps cycle at end of life: on, pink, out, again. | One lamp near the hero cycles slowly. |
| Motorway lamps stand on the central reserve, twin arms, about 12 m high, about 50 m apart. | Twin heads every 50 m; the pools are long ellipses along the road. |
| From orbit the network is visible because it is lit end to end; the neighbours' motorways are mostly unlit. | Roads past the border keep their asphalt but no lamps. |

## Loop

- Zoom (slider, scroll, pinch): the camera climbs or falls along the path.
- Tap a ribbon or a lamp: that section switches off, or strikes up.
- Drag: look a little left and right; at altitude it turns the map a little.
- The chip sets the air: Clear, Haze, Fog.
- Untouched, traffic flows and the lamp buzzes. The loop drifts at 30 fps, then sleeps.

## Bar (v2)

| Slot | Control |
|---|---|
| Top left | Choice `Style`: Sodium, LED, Tactical, Thermal (segments) |
| Bottom left | Actions: `Switch` (all lamps off, then a strike-up wave), `Rush` (a surge of traffic) |
| Bottom right | Slider `Zoom`, 0 to 1, starts at 0 |
| Key strip | `[SCROLL] zoom` (toward the pointer) · `[DRAG] pan the map` |
| Settings | Air: Clear, Haze, Fog (persist) · Tilt-shift (slider, persist) · Neighbours (toggle, persist) · Quality (shared) · Reset in the footer |

Five visible controls or fewer: Air, Switch, Rush, Zoom.

## 375 px recompose

- The close shot: a wider vertical lens. The lamp head sits in the upper third; the road runs down the frame toward you.
- The far shot: the country turns about 60°, so its long axis (coast to the south-east corner) runs up the screen. The camera fits that bounding box.
- The slider moves into Settings (Bar v2 phone rule). Pinch is the zoom; the key strip says `[PINCH] zoom`.
- Sprite minimum size is 1.5 px on phones too, so the ribbons stay solid.

## Tech

**Units and path.** Metres; the hero lamp stands at the origin. The zoom `z` maps to a camera distance `D = 9 · (4.4e5 / 9)^z`. Pitch eases from +6° (looking up at the head) to −72°. The target slides from the lamp head to the country's centre between `z` 0.45 and 0.95. Yaw turns from the hero road's heading to north-up (or the portrait angle) between `z` 0.5 and 1. Near and far planes follow `D`.

**Network.** Baked from OpenStreetMap once, offline, into `motorway/roads.json` (Tom, 2026-11-09). Nothing streams at runtime. The file holds every motorway carriageway (3,464 km), trunk road (1,959 km) and primary road (5,294 km) in Belgium, the neighbours' motorways within 60 km of the border (5,995 km), the true border and its land outline, 142 interchanges and a per-point fade for the neighbours. It is 449 KB raw, 170 KB gzipped. Credit: OpenStreetMap contributors, ODbL, under the toy's title.

**Bake.** `build_roads.py` (kept in the session notes, not shipped) chains OSM ways, simplifies them by Douglas-Peucker (10 m motorway to 60 m neighbours), finds interchanges (fast roads that cross at an angle) and bakes the fade. The page only samples curves and fills buffers: the network builds in about 0.2 s, under the intro.

**Efficiency.** Ribbons and lamp sprites live in 30 km tiles with padded bounding spheres, so the camera culls what it cannot see. Above zoom 0.72 the sprites switch off; below it, lamp tiles past three view depths are skipped. A frame costs 7 to 10 ms at every zoom on a Retina canvas, post included.

**Ribbon.** One mesh for all roads. Each vertex carries arc length `s`, lateral side, section id and lit flag. The vertex shader widens it to at least 1.2 px, so roads read from orbit. The fragment shader draws asphalt, the central reserve, lane dashes, verge, and the lamp pools: periodic in `s` with 50 m spacing, an ellipse along the road. When `fwidth(s)` passes the spacing, the pools fade to their average.

**Lamps.** One `InstancedBufferGeometry` sprite per head, with position, section and phase. Screen size is `max(world size, 1.5 px)`; the level falls by the area ratio when clamped, so a row of lamps sums to the right brightness. A wider halo sprite grows with the air's density. The section state lives in a small data texture: on/off, switch time, temperature.

**Land.** One plane, 900 km across, drawn after the solids without depth write. Dark fields with faint value noise, the sea mask from a coastline polyline, and town glows from about 25 towns (warm inside the country, cool and dim outside).

**Close set.** The overpass (deck, parapets, two piers), the hero pole with its twin arms and housings, crash barrier and central reserve. MeshStandardMaterial lit by point lights at the nearest eight lamps, plus a monochrome sodium grade.

**Air.** Exponential height fog, analytic along the view ray. Clear, Haze and Fog set density and scale height. The fog colour is the lamp orange, scaled by how much network the ray passes near (a cheap glow term), on a deep blue-black base.

**Post.** Render, then tilt-shift (two passes, blur radius by distance from a focus band; the band follows the hero at close zoom and the centre at far zoom), then bloom with a threshold, then a grade (vignette, grain) and output.

**Traffic.** Instanced streak quads along each lit road, two lanes each way. White heads one way, red tails the other. Streak length is speed times an exposure that grows with zoom, so from orbit they draw lines.

## Sound

- **Lamp buzz:** 100 Hz plus odd harmonics through a soft bandpass, with slow amplitude wobble. Level falls with zoom; it is off past `z` 0.3.
- **Neon tick:** a small click when a near lamp strikes, then a rising hum as it warms.
- **Road hiss:** pink noise through a band at 1 to 3 kHz. Level follows traffic, peaks at mid zoom, and passes swish by with a little pan.
- **Altitude:** a low wind bed that rises with zoom.
- All nodes connect to `kit.out`; muted by default.

## Finesse

- No seam in the pull-out: the lamp row, the ribbon and the country glow cross-fade by size, not by a switch.
- The first frame is a picture: the hero lamp is lit, the road lit both ways, traffic already in flight.
- Under sodium nothing has colour except the traffic lights.
- The strike-up ripple runs outward from the tap point, about 2 km per second, with a little jitter per lamp.
- A warm section restrikes orange at once; a cold one goes through pink.
- The border: lit ribbons end and the neighbours' roads carry on dark.

## Reduced motion and idle

- **Reduced motion:** the zoom eases in one step per scroll tick, without glide. Traffic moves at 30 % speed. Strike-up keeps its colour path but no ripple.
- **Idle:** traffic and buzz drift at 30 fps; after 60 s the traffic eases to a stop and the loop sleeps.

## Review focus

1. **Depth range:** at `z` 0 the far plane must reach the horizon. Keep near at `D / 30` or more and check for z-fighting on the overpass.
2. **Sprite flicker:** sub-pixel sprites must not shimmer as the camera moves. The 1.5 px floor and area-scaled level hold them.
3. **Exposure:** the ribbons must not blow out at mid zoom, where the most lamps fit on screen. The exposure curve is a table by `z`.
4. **Picking:** a tap picks the nearest section in screen space within 24 px.
5. **375 px portrait:** the turned map fits; no control covers the hero lamp.

## Tasks

### Task 1: Blockout (checkpoint)

**Files:** Create `motorway/index.html`, the bean, the `toys.json` entry and the Lab menu entry.

**Produces:** `ROADS`, `build()` (ribbon, lamps), `pathAt(z)`, the land and close set, post.

- [ ] Network graph, ribbon, lamp sprites, land, close set, sky, fog, post with tilt-shift and bloom.
- [ ] Zoom by slider, scroll and pinch. Air chips.
- [ ] Stills at 1280 and 375 px: close, mid and far. Checkpoint with Tom.
- [ ] Commit: `Lit motorway: blockout of the zoom from one lamp to the country`.

### Task 2: Strike-up

- [ ] Section texture, tap picking, ripple, pink-to-orange warm-up, hot restrike, Switch action, the end-of-life lamp.
- [ ] Commit: `Lit motorway: sections strike up like sodium lamps`.

### Task 3: Traffic

- [ ] Streak instances, exposure by zoom, Rush, Traffic setting.
- [ ] Commit: `Lit motorway: headlight and taillight streams`.

### Task 4: Sound

- [ ] Buzz, strike tick, road hiss, altitude wind.
- [ ] Commit: `Lit motorway: lamp buzz and road hiss`.

### Task 5: Settings, loop and QA

- [ ] Settings rows and persistence, frame loop, sleep, ladder, reduced motion.
- [ ] Browser-pane checks at 1280 and 375 px. Tick the bean. Commit.

## Round 3 (Tom, 2026-11-09)

- **Rush is a day run.** No clock otherwise. Rush starts a day at 04:00 and runs it in 72 s, back to 04:00, then returns to the evening rush. A readout shows the hour, the total jam length (`FILE · BOUCHON · STAU`, km, typically 290 km at 08:00 and 340 km at 17:00) and a bar across the day with the two rush hours shaded. Pressed again, Rush stops.
- **Day cycle.** In the day run, photocells switch the lamps off at dawn (about 08:06), east to west by about 16 minutes, and strike them at dusk (about 16:54), pink to orange. The land and sea lift to a grey Belgian day; car lamps dim by day.
- **Styles** (the top-left choice; Air moves to Settings; remembered per viewer):
  - **Sodium:** the low-pressure sodium look.
  - **LED:** cool white heads that come on at once, as Belgium's new lamps do.
  - **Tactical:** a cyan briefing map with a 10 km grid, dashes flowing at the traffic's speed, jams in red, faint scanlines.
  - **Thermal:** roads as a heat map of traffic and jams, black through purple and orange to white.
- **Scrub the map.** Drag grabs the ground and pans; scroll and pinch zoom toward the pointer. The pan stays within 40 km of the country.
- **Slip roads.** 1,433 km of motorway and trunk ramps from OpenStreetMap, so interchanges draw as real cloverleafs. roads.json is now 684 KB raw, 252 KB gzipped.

## Round 4 (Tom, 2026-11-09): the ridiculousness, and the trains

- **Queue bars.** Each of the 15 jam points stands a red bar on the map, as tall as its queue, labelled with the road and the km (`R1 KENNEDY 39 KM`). Bars that would collide step up. From orbit only the five worst show. Jams pulse with a heartbeat that runs back up the queue.
- **Day-run readout.** Under the clock and the total: a deadpan comparison that turns every two toy hours and changes language every 40 minutes (the coast, Manneken Pis, chips, Atomiums laid flat, Brussels to Paris), a sparkline of the day's jam curve with the rush hours shaded and the day's high dashed, lost hours (about 120 cars per queued km), a `RECORD!` flash when a rush passes 250 km, and the rail ticker.
- **Trains.** 6,030 km of main-line track from OpenStreetMap (`railway=rail`, `usage=main`), baked into roads.json. Trains run the lines with lit windows; now and then one sticks at a signal, blinks, and its delay climbs. Late trains blush red.
- **Station boards.** Brussel-Zuid, Antwerpen-C, Gent-Sint-Pieters, Luik-Guillemins, Leuven and Mechelen carry small dot-matrix boards from a middle height: three departures, delays creeping up, the odd cancellation, and a scrolling excuse in Dutch, French or German (late provision of rolling stock, leaves on the track, copper theft, a strike, a delay caused by an earlier delay).
- **No brand.** The rail operator's name and logo stay off the stage, by the house rule; the boards say `TREIN · TRAIN · ZUG`.
- roads.json is now 773 KB raw, 289 KB gzipped.
