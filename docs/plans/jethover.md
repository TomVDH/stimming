# Jet hover (`jethover`) plan

Status: active · Bean: `stimming-ay6n`

Idea 366, group C, a cinematic diorama. Sources: `docs/toy-ideas.md` (Tom's picks, 2026-11-17) and the bean.
Tom sized the full toy XXL. Tom's brief for batch 3: an MVP at high fidelity, with icons, the intro emblem and Bar v3. One hero moment, finished. No extra modes.
Tom chose the craft over a jet engine on a plinth. The toy stays apart from Night catapult (idea 220) and Drone (`drone/`).

## The hero moment: the hover

1. The first frame: a jet holds in the hover over a damp pad at blue hour. Two nozzles point down; the afterburner is lit.
2. Hold on the stage (or Space): the throttle goes to full. The engines spool up over a second. The plumes lengthen and whiten, the shock diamonds stand out, the craft climbs a little, and the steam off the pad throws out wider and billows up.
3. Drag while you hold: the craft drifts toward the pointer and yaws a little to face it.
4. Let go: the throttle comes back to the hover setting. The craft settles back to its spot, the plumes calm, the steam thins and drifts up.
5. A click: a short blip of throttle.

The heat carries the shot: the plumes glow, the air over the pad shimmers and bends the far lights and the horizon, and the haze holds the glow.

## Defaults (open questions, answered here)

| Question | Default | Why |
|---|---|---|
| 3D or flat | 3D. Since 2026-11-23: three.js 0.186.1 WebGPU (Compute type) and one fixed long-lens shot from 150 m at eye height, after Villeneuve. Before: three.js 0.170 and a close three-quarter camera. | Heat shimmer needs depth: hot air between the craft and a far horizon. A flat elevation shows the plume but not the air it bends. |
| Setting | A wet concrete apron, an open plain, three far ranges at 2.6, 7 and 18 km in haze, a row of far lights. No buildings, no props. | The far lights and the horizon are what the shimmer bends. The damp pad takes the glow. The Look rule: few shapes, light and haze carry it. |
| Time of day | Blue hour, just after sunset. The camera looks toward the last light. | The exhaust is the brightest thing in the scene, and it lights the underside warm. The sky still parts the dark craft from the ground, with a cool rim. |
| The craft | A generic twin-engine VTOL: a blended body, a delta wing, two canted fins, two swivel nozzles under the rear body, a lift-fan door behind the canopy, gear down. Plain dark grey, no markings. | Hard rule 11. It reads as a jet in the hover without any real aircraft's shape or livery. |
| The hand | Throttle. Hold for full reheat, drag to drift and yaw, release to settle. Slider: Throttle, the hover setting. | The throttle drives every part of the show: glow, diamonds, shimmer, steam, sound. Drift is the one extra motion, and only while you hold. |
| Sound | Turbine whine and roar while the hand works the throttle, and through the spool-down after. Then it fades and the context sleeps. | An office toy: a jet that roars for a minute after one click is too much. The sound has a visible cause, the throttle. |

## Renderer

- three.js 0.186.1 WebGPU with TSL, WebGPU backend only (Tom, 2026-11-23: "truster will become webgpu").
- Passes: the scene; the gas volume and a heat volume at half size; the heat bend; the gas over the scene; bloom; ACES; a grade after Railgun's Villeneuve print.
- The craft: a few extruded shapes and standard materials. Two warm point lights at the nozzles and one on the apron light it from below.
- The plumes: view-facing ribbons along each nozzle axis. A core, a sheath, and shock diamonds as bright cells along the axis that fade one by one.
- The apron: wet concrete, a hot glow pool and a scorch under each plume, a mirror of the far country and the plumes, then haze.
- Steam, smoke, exhaust and heat: Fire's fluid and volume (`shared/fire.js`), copied into `gas.js` with jets, a solid floor and steam added (Tom, 2026-11-23: "fire shader for smoke and exhaust").
- The first build (2026-11-22) ported Fire's fluid to WebGL2 by hand; the WebGPU build replaces it.

## Physical details (the pizazz)

1. Shock diamonds: the spacing grows with the throttle, and each diamond is dimmer than the one above it.
2. The nozzle petals glow orange inside; the plume goes from yellow white at the nozzle to violet blue.
3. The engines lag the hand: they spool up in about a second and run down slower.
4. The shimmer is strongest just above the pad, where the hot jet turns along the ground.
5. A faint shake runs through the frame at full reheat.

## Frame loop

- Lively while the hand holds, the engines spool, or the craft moves. Full frame rate.
- Drifting in the hover: the flame flickers and the gas runs, at 30 fps.
- Asleep: 60 s after the last input, time eases to a stop over 2 s and the loop stops. Any input wakes it.
- Hidden: the loop and the sim clock stop at once.
- Reduced motion: no flicker and no shake while idle; the hover holds still. The throttle still answers, more softly.

## Bar (Bar v3)

| Control | Content |
|---|---|
| Action | Reheat (hold), key Space |
| Slider | Throttle: the hover setting |
| Settings | Quality (shared); Reset |
| How | Hold for full reheat; drag to drift; click for a blip; Space |

## Tasks

1. Blockout on the stage, screenshot at 1280 x 800.
2. Scene, craft, plumes, pad, gas (K3 port), heat, bloom and grade.
3. Interaction: throttle, drift, blip; the frame loop.
4. Sound: whine, roar, crackle.
5. Bar v3, the toy doc.
6. Icon round `jethover-1`, emblems, intro emblem, Lab tile and hook, `toys.json`.
7. QA Q1 to Q10 (`docs/plans/README.md`).

## Later stages (XXL; not in this build)

Tom sized the toy XXL. These are named so the MVP leaves room for them. None is built.

1. Start-up and landing: the craft sits cold on the pad, the engines light, it lifts into the hover, and it lands again.
2. Transition: the nozzles swing aft and the craft accelerates out of the frame.
3. A free camera: orbit the craft, and a low shot under the plumes.
4. Weather and time: rain and steam off the pad, night with lights, day with dust.
5. Distance sound: the sound arrives late with distance, with a ground echo.
