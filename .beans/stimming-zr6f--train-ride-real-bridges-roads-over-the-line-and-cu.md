---
# stimming-zr6f
title: 'Train Ride: real bridges, roads over the line, and curves'
status: completed
type: task
created_at: 2026-11-15T08:04:57Z
updated_at: 2026-11-15T08:04:57Z
parent: stimming-6z3j
---

Tom, 2026-11-15: bridges and curves, from the Train Ride chat's list of next steps.

## Bake
tools/line.py writes trainride/line.json (21 KB) from OSM: the rail ways tagged bridge on the traced line, road bridges (dem/over.json) and rivers and canals (dem/water.json).
- 36 rail bridges from 2.2 km on: 5 over water (the Linth canal at 55.6 and 57.3 km, the Linth at 60.8 km, two more), 30 over roads and paths, 1 long one at 66.2 km.
- 23 roads over the line, as centre, width along the line, skew and class. None stands within 190 m of a station mark, in a tunnel or on a rail bridge. Dual carriageways join into one deck.
- Signed curvature every 20 m, smoothed over some 60 m. The tightest curves run 302 to 485 m. The HB stretch stays straight to 2.3 km: the trace leaves through the S-Bahn tunnel, but the ride shows the yard.

## Scene
- Rail bridge: the bank gives way to a concrete deck edge with a railing (handrail, two rails, posts every 2 m that blur with speed). Under it the ground is dug 6.5 m down and climbs back by 41 m out. The floor shows a road (asphalt, edge and centre lines), a river (rippled, mirrors the sky) or a dip. Concrete abutments close each end. The floor and walls read the land, so they show only where the dig cuts below it. Props keep off the dig.
- Road over the line: a deck 6 m over the rails across both tracks, with parapets, a far abutment and wing walls whose tops fall away over 12 m. Skew bridges turn up to half a radian. The deck shades the bed and takes the sun patches off the cabin while overhead.
- Curves: the carriage rolls on the cant, up to 0.06 rad (60 x curvature). The far land tilts in the window; the bed, the second track and the passing train roll with the carriage. The view swings up to 0.06 rad toward the curve's inside. The unbalanced pull leans the head on or off the glass by up to 3 cm.
- Sound: +2.5 dB and a +3 dB low shelf on a bridge; a short +4 dB rush under a deck.

## Checklist
- [x] Bake and line.json
- [x] Bridges: deck edge, railing, dig, floor by kind, abutments
- [x] Roads over: deck, abutment, wings, shade, sun off
- [x] Curves: cant, swing, sway
- [x] Sound on bridges and under decks
- [x] Headless Chrome (ANGLE D3D11), parked and at 97 km/h, day and night, 1280 and 375 px: 60 fps, no console errors

## Open
- Tom to ride and judge the cant and swing strength (cant x60 capped at 0.06, swing x25 capped at 0.06), and to listen.
- No flange squeal on tight curves: it needs a clean loop from a recording, cut by ear.
- Truss or arch bridges: every bridge draws as a concrete deck.
