---
# stimming-xpky
title: 'Gas giant: the top layer as a storm ceiling, and a no-frame dev switch'
status: completed
type: task
created_at: 2026-11-24T03:17:29Z
updated_at: 2026-11-27T07:19:52Z
parent: stimming-vxno
---

Tom, 2026-11-24: "lets add a dev flag to take off the capsule window frame altgether - we need to seriously get to work on the cloud layers here -- starting from the very top." Contiguous, continuous cover up top, shaded like Tornado alley's storm ceiling, with large swirls like Tornado alley's (they may be baked). Lower layers are out of scope.

## Tasks
- [x] Commit the pinch-to-lean code left by the crashed session
- [x] Dev sheet: a switch that removes the window frame (wall, bezel, liner, panes)
- [x] Read Tornado alley's storm ceiling shading and swirl fields
- [x] Top layer: continuous cover, storm-ceiling shading, large baked swirls
- [x] Screenshot to Tom with the frame off
- [ ] QA: console, idle sleep, reduced motion, frame time
- [x] Tom, 2026-11-24: twisters take Tornado alley's funnel light (form and motion stay)
- [x] Tom, 2026-11-24: a few swirls set in cloud bands, not a field of pinwheels
- [x] Tom, 2026-11-24: only the visible layer renders: a tops zone, rays stop at the zone floor, cheap far sun taps
- [x] Grandeur: limb glow, aerial perspective, thunderheads with domes and frayed anvils, streaked haze lid
- [ ] Height field bake for the top deck (frame time is 1.8 to 3 ms now; held until a larger screen needs it)
- [x] Toy doc and plan lines


## Pass 1, 2026-11-24 (Edge in the app pane, ANGLE D3D11, RTX 3070, 1024 x 768, frame off)

- Swirl tile: 1024 square RGBA8 with mips, one draw at load, 57 ms to compile alone.
- Frame time, clouds at half size: 200 km 2.8 ms, 60 km 3.0, 30 km 2.5, 12 km 1.8, -10 km 2.8. At full size: 5.3, 6.5, 5.7, 4.5, 7.5.
- Cold first link took 12 to 22 s in the pane once; cached links take 15 ms. To check on a cold profile.
- The rings seen from above came from the log spiral winding without end near each whirl's centre; the winding now stops at 0.3 R.

## Pass 2, 2026-11-24

- Five whirls in a 4,096 km band tile; each rotates the band field round its centre, fading past 1.3 R.
- Zones: tops (over 12 km, the top deck only), top, mid, deep; rays stop at the zone floor; far sun taps on the top deck read bands and swirls only.
- Frame time at 992 x 720 (pane, noisy, shared GPU): clouds at full size 200 km 3.1 ms (was 5.3), 60 km 5.4 (6.5), 30 km 5.4 (5.7); at half size 1.7 to 2.6 ms.
- Cold first link 3.9 s in the pane (was 12 to 22 s).

## Grandeur pass, 2026-11-24

- The dark stripe over the horizon was open sky: the limb glow faded within 22 km of height, under the deck tops. Now a 40 km scale height from 18 km.
- Frame time at 992 x 720, clouds at half size: 120 km 2.0 ms, 60 km 2.9, 30 km 2.5, 12 km 2.1.
- ?qa view 6 shows the march's cover, hit and pass-through.
