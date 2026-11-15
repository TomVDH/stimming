---
# stimming-oa98
title: 'Train Ride: tunnels where the real line runs underground'
status: completed
type: task
priority: normal
created_at: 2026-11-15T05:36:05Z
updated_at: 2026-11-15T05:43:32Z
parent: stimming-6z3j
---

The traced OSM ways carry tunnel tags: the Kerenzerberg tunnel (60.97 to 64.91 km), Biberlikopf, Stutz, Bühl and others. The ride shows open hillside there today.

## Checklist
- [x] tools/tunnels.py writes tunnels.json in route metres from the traced edges; skips the HB yard; keeps clear of stations
- [x] A tunnel tube with lamps, niches and a cable tray; portal faces at both mouths
- [x] Inside: no sun patches, the cabin turns to its night look, no rain in the air, masts hidden, the bed and rails go dark
- [x] Running sound louder and fuller inside
- [x] Browser pane check, clean console
- [x] Commit and push

## Summary of Changes

- tools/tunnels.py reads the tunnel tag on the OSM edges the traced track follows and writes tunnels.json: seven bores, 2.32 to 2.94 and 3.34 to 4.21 km (Zurich Enge), 54.95 to 55.07 km, Biberlikopf, the Kerenzerberg (60.97 to 64.91 km), Stutz and Bühl. Bores under the HB yard (before 2.1 km) are left out; each mouth keeps 200 m from a platform.
- A lined tube round both tracks follows the window inside the near tunnel: concrete rings, soot low down, wet streaks, refuge niches every 50 m, a cable tray, wall lamps every 25 m that streak at speed, the carriage panes thrown on the far wall, daylight at the mouths.
- At each mouth a concrete headwall and a hillside mound (grass on top, rock on the cut) close over the vault and settle into the ground; each mound reaches half the bore, so short tunnels stay closed.
- Inside: masts gone, bed and rails lit by the tunnel lamps and the panes, no sun patches, the cabin in its night look (the glass a mirror), no rain in the air and the pane slowly dries, the oncoming train out of the sun.
- Running sound +6 dB with +4 dB low shelf inside, scaled by speed.
- The land itself is not lifted: a lift broke the land tiles and props.

## Open
- Tom to ride through at speed and listen.
- The mounds are plain grass and rock, with no trees on them.

## Fixes (2026-11-14, Train Ride chat)
- [x] The mound's profile was upside down: `MathUtils.smoothstep` needs its low edge first, so the hill sat low by the line and high far out. A sloped sheet then crossed the window inside each mouth (a flat green screen 15 m into the Kerenzerberg). The profile now runs on -z.
- [x] Mound faces textured: limestone beds of uneven thickness, moss in the seams, shrubs on the ledges; meadow patches and scrub on the grass. The grass and rock split uses the face normal, so grass no longer creeps down the cut.
- [x] The mound's far rim sinks to 30 m down, so no flat shelf floats over the Walensee at the east mouth.
- [x] Checked in headless Chrome (ANGLE D3D11) at 1280 and 375 px, parked and at 97 km/h, day and night: 60 fps, no console errors.
- [x] A cabin knock and a low thud as the train enters a tunnel above 12 m/s, softer as it leaves (the recorded thump, through the knock and thud channels)
