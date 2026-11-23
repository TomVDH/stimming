# Event horizon (`eventhorizon`)

Status: built, 2026-11-23. Lab toy, MVP at high fidelity, Bar v3. Bean `stimming-u244`.
Idea 237, group B, batch 7: "Orbit a black hole; drop a star into the disc."

## Defaults (Tom's open question: 3D or flat, and the presentation)

- 3D, raw WebGL2. Each pixel traces a light ray through the curved space of a black hole. No mesh, no thin-lens trick.
- The home view sits about 11 degrees above the disc plane, at 30 Schwarzschild radii. The far side of the disc arcs over the shadow and under it.
- Deep space: a dark starfield with a faint band of the galaxy. The disc carries the light.
- The disc is thin and hot: white at the inner edge, orange and red outward. The approaching side is brighter and bluer.

## Reference

- NASA SVS 13326 (Schnittman, 2019): the far disc arcs over the shadow, a thinner arc under it, the near side beamed bright on the left.
- Luminet (1979) and the Starless ray tracer (Antonelli): the photon ring as a thin line, the shadow at 2.6 Schwarzschild radii.
- Tidal disruption visuals (NASA SVS 13237 and others): the star stretches into a stream, half of it wraps round and crosses itself, a flare at the crossing.

## Hero moment

1. Drag: the camera orbits the hole. The lensed arcs swing and the starfield smears round the shadow. Release: the orbit glides and eases to a stop.
2. Tap: a star drops in from the tapped side. It stretches toward the hole, tears into a stream at the tidal radius, wraps round, crosses itself and flares, then spirals into the disc and fades.

## Physics

| Part | Model |
|---|---|
| Light | Schwarzschild null geodesics. Units of one Schwarzschild radius. Acceleration `-1.5 h² x / r⁵`, RK4, step size from the radius. |
| Escape | Past r = 44 the rest of the bend is the weak-field term `(1/b)(1 - cos θ)`. |
| Disc | Equatorial, from the ISCO (r = 3) to r = 14. Temperature after Novikov and Thorne. Turbulent streaks shear at the Kepler rate. |
| Shift | Gravity `sqrt(1 - 1/r)` times Doppler `1 / (γ (1 + β φ̂·v))` for gas on circles. Intensity by `g⁴`, colour by `g T`. |
| Star | A Paczynski-Wiita orbit in the disc plane. It stretches before the tidal radius and tears there. |
| Stream | 3,000 CPU particles per star, three stars at most. Drag toward the circular speed heats the gas after each pericentre: the flare. Viscous drift carries it in; inside the ISCO it plunges. The trace reads the stream as a thin hot slab. |

## Passes

1. Boot: a cube of the galaxy band (6 faces, mipmapped) and a tileable noise texture. Point stars come from a hashed grid in the trace.
2. Stream: particles splat into a disc-plane emission map (RGBA16F, only while a star is live).
3. Trace: the geodesic march into an HDR target.
4. Bloom: `shared/glow.js`.
5. Final: tone map, bloom, grade (`shared/grade.js`).

## Bar v3

| Control | Content |
|---|---|
| Actions | Drop (Space), Reset view (R) |
| Slider | Zoom: camera distance |
| How | Drag: orbit · Tap: drop a star · Scroll: zoom · Space: drop |

## Loop

- Lively while a drag, a glide or a star is in flight.
- Drifting at 30 fps while the disc turns.
- Asleep 60 s after the last input; hidden stops at once.
- Reduced motion: the disc holds still; a star still falls, slower; no glide.

Toy doc with QA: `docs/toys/eventhorizon.md`.

## Tasks

1. Blockout: trace, disc, stars. Screenshot.
2. Disc shading, Doppler, photon ring, bloom, grade.
3. Star drop and stream; flare.
4. Sound; bar; icon round; Lab entry; QA.
