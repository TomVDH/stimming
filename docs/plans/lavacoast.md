# Lava coast (`lavacoast`)

Status: built as a Lab toy, 2026-11-22; waits on Tom's look. Bean: `stimming-ix8b`. Idea 99, group C. Toy doc: [lavacoast.md](../toys/lavacoast.md).

Tom's brief: "MVP at high fidelity, with icons for the lab and intro as well, bar v3". Idea: "A volcanic island at night. Tap the vent for a lava fountain whose flow meets the sea in towers of lit steam."

## Defaults (Tom's open question: 3D or flat, and the presentation)

| | Choice | Why |
|---|---|---|
| Space | 3D island, sea and sky on a flat stage. The camera does not move. | The flow must run down a real slope toward the eye, and the steam must stand in depth in front of it. A fixed camera keeps it a diorama. |
| Camera | Offshore, 35 m over the sea, about 46 degrees across. The coast is 500 m out, the vent 1.3 km out and about 195 m up. The frame is shifted up, so the horizon sits 36% from the foot. | The reference photos are taken from the sea: the pour at the waterline, the plume over it, the glow in the water. The sea strip in front carries the reflections. |
| Light | Night. No moon disc; a dim cool sky light from the upper left. The lava is the key light: it lights the slope round it, the steam from below and the sea. | The look rule: light carries the scene. At night the lava is the only strong light, as in the photos. |
| Sky | Stars, a deep blue night, a faint warm airglow over the horizon. | |
| Steam | Towers of laze over each sea entry, a volume with Fire's smoke light (`shared/smoke.js`), keyed from below by the glow at its base. | Tom's ruling: every steam volume follows Fire's smoke shader. |
| The flow | A lava sim on a 160 x 160 grid over the slope, in JS: thickness, heat and flow per cell. Hot lava runs in braids round the terrain's ridges; it crusts as it cools and glows at the cracks. | The flow must find its own path, and the sim knows where it meets the sea, for the steam and the sound. |
| Apart from Volcano | Volcano is a blast and an ash column at blue hour, seen from 1.5 km. Here: a quiet coast at night, a small flank vent with a fountain of about 150 m, and the event is where the lava meets the sea. | The brief. |
| Renderer | Raw WebGL2 on `shared/gl.js`; bloom from `shared/glow.js`. Six small programs and a blur, so D3D11 links each fast. | Per-pixel sky, sea and steam; meshes for the land. |

## The hero moment

At rest the coast is dark and calm. A lava tube spills a thin glowing ribbon into the surf, and a small plume of steam rises from it, lit orange from below. The vent on the flank glows dull red.

A tap (or Space) wakes the vent:

1. The fountain: a jet of incandescent clots climbs about 150 m in gas pulses, white-yellow at its core, orange as the clots fall. It lights the slope round the vent and the gas over it.
2. The flow: lava pours from the vent and runs down the black slope. It splits round ridges into braided channels. Fast channels stay bright; slow lava crusts into dark plates with glowing cracks.
3. The sea entry: where the flow pours into the surf, the steam grows into towers that rise and lean with the wind, lit orange from below. Waves burst on the hot lava in small spatter bursts.
4. The vent calms after about 8 s. The fountain sinks; the flow slows, crusts, and its cracks dim from orange to dull red to black. The towers lose their base, rise away and thin out. The coast is quiet again, with new black rock on the slope.

A hold keeps the fountain going for as long as it is held (up to 30 s).

## Bar

| Control | Content |
|---|---|
| Action | Erupt (Space): the fountain |
| Slider | Flow: the size of the fountain and how much lava it sends |
| How | Tap: the vent erupts. Hold: the fountain lasts. Space: erupt. |

## Sound (muted by default)

- The surf: a low wash of waves with slow swells. Always on while the loop runs.
- The fountain: a deep roar with gas thumps in its pulses, from the vent. It comes after the distance over 343 m/s (about 3.8 s); its light comes at once.
- The flow: a dry clink and crackle of crust, with the hot area.
- The sea entry: a hiss that follows the steam, and sharp pops with a low thump for each burst, from the entry. About 1.5 s late.

## Frame loop

Lively while the fountain runs or hot lava moves. Drifting at 30 fps for the surf, the trickle and its plume. Asleep 60 s after the last input. Hidden: stopped. Reduced motion: no drift; a tap still runs a softer fountain and its flow, then the loop stops when the lava has cooled.

## Tasks

- [x] Plan, references
- [x] Blockout on the stage, screenshot
- [x] Hero: fountain, flow, sea entry, steam towers, calm
- [x] Sound
- [x] Bar v3
- [x] Icon round, emblems, intro emblem
- [x] Lab entry
- [x] QA, toy doc
