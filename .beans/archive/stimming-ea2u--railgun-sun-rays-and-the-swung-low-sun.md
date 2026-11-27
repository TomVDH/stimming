---
# stimming-ea2u
title: 'Railgun: sun rays and the swung low sun'
status: completed
type: task
priority: normal
created_at: 2026-11-15T07:33:24Z
updated_at: 2026-11-15T07:57:52Z
parent: stimming-f793
---

Tom (2026-11-14): sky and post first; sun rays first. The low sun sat 63 degrees right of the view, so rays never crossed the frame. Tom chose to swing the sun toward the frame at dawn and dusk.

## Checklist

- [x] Sun rays: analytic shadows of the heaps, towers, soot ball and trail through a dust veil, in the sky dome
- [x] Shadow bands dim the sky; lit dust adds a faint sunward glow; low sun only, none at night or by day
- [x] Dev rows: Sun rays (gain, default 1.6) and Sun bearing (default 36 degrees right of the look)
- [x] The low sun swings to the frame's right edge; above about 15 degrees it eases back to the old bearing
- [x] Stills at dawn, dusk, noon and night, 1280 and 375 x 812; clean console
- [x] Tom's verdict on the swung sun (2026-11-14: yes, next area)
- [x] Better blending (Tom): soft penumbra edges, shadows fade over about 110 km behind their caster, shade turns cool before dim
- [x] Tom's verdict on the rays' strength (2026-11-14: yes, next area)

## Notes

- The trail's shadow is the main band: it runs from the trail toward the upper left at dusk.
- The heaps' shadows lie near the horizon and are masked there; they read as a band otherwise.
- Phones: the sun sits off the narrow frame; the trail's band still shows.
- Cost: 21 ellipsoids and 6 trail slabs per sky pixel, closed form; headless timings stay inside their noise (about 1 ms at most).

## Summary of Changes

Sun rays in the sky dome from analytic shadows of the heaps, towers, soot ball and trail through a tall dust veil; soft, fading, cool shade. The low sun swings to the frame's right edge and eases back as it climbs. Dev rows Sun rays and Sun bearing.

Follow-up: the backlit trail shows dark blotches when the sun stands near it at about 12 to 18 degrees with a full swing; the ease-back hides it at the defaults.
