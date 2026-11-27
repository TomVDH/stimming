---
# stimming-x63y
title: 'Tornado alley: destructible objects on the plain'
status: completed
type: task
priority: normal
created_at: 2026-11-17T08:53:47Z
updated_at: 2026-11-17T09:39:48Z
parent: stimming-dwwg
---

Objects on the plain take damage from each tornado's wind field, and the damage stays until Clear. Branch claude/tornado-destruction-3bd805.

- [x] Damage state: CPU wind at a point (line.js Rankine model), per-object damage uniforms, Clear mends
- [x] Vehicles: real shapes (hood, cab and bed, grille, arches, roof gear, light bars, van mast), rain and road spray, braking and swerving
- [x] Trees: shelterbelts and lone trees sway (Wind, storm, inflow), lose leaves and limbs, snap or uproot by distance and F
- [x] The farm: farmhouse, barn, bins, windmill: shingles and siding (F1), roof gone (F3), levelled (F4-F5), debris up and back
- [x] Infrastructure: far water tower or elevator, irrigation pivot, road sign, fences flatten, hay bales roll and fly
- [x] Stills in docs/qa/tornado-destruction/, 3 x F4.5 near 30 ms at 1828x984 (shared busy GPU: branch min 35.7 ms, main min 37.1 ms at the same shot; no measurable add)

## Summary of Changes

- traffic.js: vehicles as faceted hulls (glass with see-through, lamps, wells, grille, roof gear, van mast), wet mist and dry dust spray, braking, following, swerving round downed poles and bales.
- damage.js (new): 50 m peak-wind grid (dmgAt), exact sites, debris throws that climb the funnel and fall back; second Clear resets.
- plain.js: lobed lone trees that sway, strip, snap or uproot, stumps; belts, far trees, far steads and the fence take the field.
- farm.js (new, moved from main.js): house, barn, bins, windmill, hedge fail by wind stage; strewn yard.
- infra.js (new): water tower, billboard, centre pivot, round bales with simple physics.
- Stills: docs/qa/tornado-destruction/.
