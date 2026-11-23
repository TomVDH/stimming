# Ship launch (`shiplaunch/`)

| | |
|---|---|
| Dutch | Tewaterlating /təˈʋaːtərˌlaːtɪŋ/ (draft) |
| Motto | None |
| Shelf | Lab, tag "Stimming Lab" |
| Stage | None |
| Series | None |
| Accent | `oklch(0.7 0.13 152)` |
| Sound | Yes |
| Legacy build | No |
| Signed off | No |

## Idea

Idea 222 (Slipway), grown to XXXL: Tom's pick of 2026-11-23. Bean `stimming-y9pf`. Plan: [shiplaunch.md](../plans/shiplaunch.md). This is the MVP cut: one fixed shot, one side launch, from the cut of the rope to the calm.

## Rules

- One fixed shot, one hull, one launch, scaled by the Drop. No modes.
- Metres and seconds. The hull's motion is a solved cross-section (sway, heave, roll); the wave is a shallow-water sim the hull drives. Nothing is scripted after the cut.
- Sound from the hull comes late by its distance at 343 m/s.
- The loop runs at full rate from the cut until she rolls under 0.3 degrees, the spray and mist are gone and the canal is calm: about 60 s after the hit, 75 s at most. Bunting and chop drift at 30 fps until the toy sleeps.

## Direction

- 3D, three.js 0.170, at true scale. A canal yard in flat land, low winter sun behind the yard, seen from a bollard on the far quay among the crowd.
- References: the Westerbroek and Hoogezand side launches (Wikimedia Commons, `Category:Sideways_launching`), the LST and LCS side launches, two Polygoon newsreels. No real yard, ship or place name.
- An 88 m short-sea coaster, green over a red-brown bottom, a white house aft, bunting from bow to mast to bridge.
- The launch: the grease holds one to three seconds, she slides 12 m down 1 in 10 ways, tips off the edge outboard-down, hits, rolls back toward the yard and down to calm. Four wires to rust heaps on the berth pull her up; the heaps tear across the concrete.
- The canal: a 640 x 176 pipe-model sim at 0.5 m cells over the canal and both quays. The hull's underside presses the water as a pressure head, so the wave comes from her drop: about 2.3 m at her side at full Drop, about 7 m/s across. It reflects off both walls and can run over the near quay, where the crowd steps back.
- Spray: dense spray and drops off her waterline and the quay edge (after Ponlai's spray kinds); the foam pattern is Ponlai's, ported to GLSL. Mist, chain dust and grease smoke: a K3 fluid (Volcano's port) with Fire's smoke shading, backlit by the sun.

## Controls

Bar v3, from the `bar` spec in `initPage()`.

| Slot | Holds |
|---|---|
| Actions | Launch (Space): cuts the rope. After the cut it reads Again and flash-cuts back to the yard |
| Slider | Drop: the tipping edge's height over the water, 0.6 to 2.4 m; stored as `stimming.shiplaunch.drop`. It takes effect while she waits on the ways |
| Settings | Quality (shared), Reset (puts her back on the ways) |

| Input | Does |
|---|---|
| Click the stage | Cuts the rope, while she waits |
| Space | Cuts the rope; after the launch, back to the yard |
| Drag | Turns the head up to 15 degrees; it eases back |
| R | Puts her back on the ways |

## Sound

Web Audio on the shared kit, muted by default: the rope, the trigger weight and the shores, her groan, the slide's rumble with its echo off the shed, the chains, the hit and the spray, the wave's slap on the near wall and its wash, the crowd's cheer. Hull sounds play late by distance on the audio clock. Mute and a hidden tab stop every pending sound; the context sleeps after the last one.

## Files

| File | Holds |
|---|---|
| `index.html` | Page skeleton |
| `main.js` | Bar, camera, frame loop, gestures, spray and mist emitters, sound cues |
| `yard.js` | The site, the hull lines and topsides, the berth, ways, quays, crane, shed, far land |
| `launch.js` | The physics: grease, slide, tip, float, drag chains |
| `canal.js` | The shallow-water sim, the draft pass, the mirror, the water surface |
| `foam.js` | The foam pattern bake (Ponlai, MIT) |
| `spray.js` | Spray and drops |
| `mist.js` | The K3 fluid for mist and dust, its march and composite |
| `props.js` | Wires and heaps, the crowd, the bunting |
| `sound.js` | Web Audio |

## QA

Captures: `docs/qa/shiplaunch/`. Headless Edge on D3D11 (RTX 3070), 1280 x 800: about 6 ms a frame at rest, 8 ms mean and 9 ms at the 95th percentile through the hit. Console clean. The idle, hidden, reduced-motion and sound results are in the bean.

## Open

- Tom's look at the shot, the hit and the wave.
- The icon round `shiplaunch-1` has no pick yet; A is on the menu.
- On a phone the hull stands small in a wide frame; the tall-stage lens wants Tom's look.
- Later stages are in the plan; none is built.
