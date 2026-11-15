---
# stimming-t14e
title: 'Train Ride: real tunnels and clean far shores'
status: in-progress
type: task
created_at: 2026-11-15T05:56:45Z
updated_at: 2026-11-15T05:56:45Z
parent: stimming-6z3j
---

Tom, 2026-11-14, from the Train Ride chat: tunnels and shores.

The real line runs in tunnels in places (Kerenzerberg at 62 to 64 km); the ride shows a flattened hillside there. The Walensee's mirrored far shore at Murg shows jagged grey blocks. Far cliff shores show the coarse far mesh as small teeth.

## Checklist
- [x] Reproduce each bug in stills (tunnel: yes; shores: see below)
- [x] Tunnel spans from OSM (tunnel=yes on the rail ways), in route metres
- [x] Tunnel look: walls, portals, dark cabin, cabin mirror on the glass, no rain, no sun
- [x] Tunnel sound
- [ ] Walensee mirror blocks: not seen in the new stills; Tom to point at it
- [ ] Far cliff teeth: not pinned down yet; Tom to point at it
- [x] QA: 1280, 375 x 812 and 812 x 375 px, no console errors, 54 to 60 fps (RTX 3070, ANGLE D3D11)
- [x] Commit with this bean

## Tunnels (2026-11-14)
- tools/tunnels.py reads the OSM rail ways (tunnel=yes) and the traced line, maps each tunnel to route metres (station drift 0 m) and writes route.json `tunnels`. Run it after track.py, in the folder with dem/.
- Kept in the open: Zurich HB's hall and track field (to 2.3 km; OSM puts the trace in the S-Bahn tunnel under HB), and every platform (tunnels stop 190 m short of a station mark).
- Seven tunnels: Enge (2.31 to 2.95 km), Enge to Wollishofen (3.33 to 4.21), a 120 m one at 54.95, Biberlikopf (56.87 to 57.17), Kerenzerberg (60.97 to 64.91), Stutz (65.94 to 66.07), Bühl (68.82 to 68.94).
- The bore: a double-track horseshoe, far wall 8 m out, crown 8 m over the rails, walkway, handrail and cable line; shotcrete with ring joints every 10 m that blur with speed; a lamp on the handrail every 25 m; our windows wash the wall and the bed.
- Portals: a concrete ring, then a rock cutting whose top falls from 9 m to the bed over 75 m; limestone beds with moss and ledge shrubs.
- Daylight reaches 30 m in. The cabin goes to its lamp light (the glass mirrors it), the sun patches go, masts and lamps go, no rain in the air or new rain on the pane; the passing train loses its sky.
- Sound: within 8 m of the portal the running noise rises about 5 dB with a 6 dB boom at 250 Hz; a cabin knock and a low thud on entry at speed, softer on exit. Mixer row "Tunnel boom" (?dev).

## Shores (2026-11-14)
Stills at 66.5 to 68.4 km, four hours: the lake no longer mirrors the far shore, so the old jagged grey blocks do not show. Seen instead: a thin bright seam along the far shoreline, and the Churfirsten cliffs as a smeared grey band with vertical streaks. Waiting on Tom to say which he means.
