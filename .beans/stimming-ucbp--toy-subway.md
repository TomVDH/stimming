---
# stimming-ucbp
title: 'Toy: Subway'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-09T07:42:55Z
updated_at: 2026-11-09T14:07:58Z
---

Subway (`subway`, Lab). A static Dutch-angle shot of a dim subway cabin: floor, benches, poles, windows. Tunnel lamps pass outside; their light sweeps pools and shadows over the floor and seats. Reuses Train Ride's analytic motion blur, lamp streaks, bloom and grain.

Plan: shadows are exact intervals of lamp x (window minus occluders), convolved with the lamp box plus the shutter smear.

- [x] Page shell and cabin geometry
- [x] Analytic tunnel light and shadows
- [x] Windows: tunnel view and lamp streaks
- [x] Hold to brake
- [x] Sound: rumble, joint clacks, tunnel roar (not checked by ear)
- [x] toys.json and Lab menu entry (nl Metro: pending Tom)
- [ ] Browser check at 1280 and 375

## Detail pass (2026-11-09)

- [x] Mixed is the default; lamps run in blocks of eight: dark, normal or dense one-colour runs; red signals and blue work lamps
- [x] Walls: framed windows, grimy glass lit by passing lamps, backlit ad cards, dado rail, door leaves with route strip
- [x] Seats: moquette, separate cushions, heater grilles, end screens
- [x] Floor: studded rubber, polished aisle, door thresholds and tactile strips, contact shadows
- [x] Roof: two diffuser strips and a vent; pole collars; swinging hand straps
- [ ] Frame rate on a real screen (pane was hidden)

## Shots (2026-11-09)

- [x] Five tight still shots with long lenses: Straps, Seats, Window, Door, Floor (keys 1 to 5); the lamp chips go, Mixed stays
- [x] Smoother straps, poles and rails; finer moquette for close shots

- [x] Door: reframed, softer pole glare, no-lean stickers, lit door button
- [x] Floor: low angle across the lit aisle, a left umbrella and a used ticket
