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

Idea 222 (Slipway), grown to XXXL: Tom's pick of 2026-11-23. Beans `stimming-y9pf` (the MVP) and `stimming-z2w5` (the sweep). Plan: [shiplaunch.md](../plans/shiplaunch.md). This is the MVP cut: one fixed shot, one side launch, from the cut of the rope to the calm.

## Rules

- One camera move, one hull, one launch, scaled by the Drop. No modes.
- Metres and seconds. The hull's motion is a solved cross-section (sway, heave, roll); the wave is a shallow-water sim the hull drives. At the hit an impact ridge, scaled by the Drop and her impact speed, joins the sim; the sim carries the rest.
- Sound from the hull comes late by its distance at 343 m/s.
- The loop runs at full rate from the cut until the camera's pull back ends (43 s after the hit) and she rolls under 0.3 degrees, the spray and mist are gone and the basin is calm, 75 s after the hit at most. Bunting and chop drift at 30 fps until the toy sleeps.

## Direction

- 3D, three.js 0.170, at true scale. A yard on a port basin in flat land, low winter sun behind the yard, (Tom: "Would like more faraway POV"; he picked a port basin over a canal.)
- The sweep (Tom: "not the sweeping quality we're looking for"): one camera move in three shots. Waiting: high and wide over the north quay, 40 m up, about 230 m out, still. On the cut it cranes down along a curve as she slides and lands on the pier head, in the crowd, broadside, about 55 m off her side, at the hit. It pushes in on the spray sheet, sinks 1.3 m as the wall breaks over the pier, rises, and from 18 s pulls back to a wide shot toward the harbour mouth, still by 43 s. A tall stage has its own lens per shot. Reduced motion: hard cuts between the three still shots.
- References: the Westerbroek and Hoogezand side launches (Wikimedia Commons, `Category:Sideways_launching`), the LST and LCS side launches, two Polygoon newsreels. No real yard, ship or place name.
- An 88 m short-sea coaster, green over a red-brown bottom, a white house aft, bunting from bow to mast to bridge.
- The launch: the grease holds one to three seconds, she slides 12 m down 1 in 10 ways, tips off the edge outboard-down, hits, rolls back toward the yard and down to calm. Four wires to rust heaps on the berth pull her up; the heaps tear across the concrete.
- The basin: 200 m wide and 6 m deep, closed at the west end, open east to the outer harbour. A 512 x 256 pipe-model sim at 1 m cells covers it, the pier and the quays. The hull's underside presses the water as a pressure head. At the hit a ridge rises beside her over 1.2 s (at most 6.5 m) and runs out as a wall; a slow sink over the basin takes its water back over 20 s. A rubble apron before the pier head (6 m to 1.5 m deep over 40 m) slows the wall and grows it. At Drop 1.5 the wall is about 1.5 m across the basin and 1.7 m at the pier head, half a metre over the deck; at Drop 0.6 it stays under the deck. Water on the deck makes the crowd step back.
- Spray: dense spray and drops off her waterline and the pier's faces (after Ponlai's spray kinds); the foam pattern is Ponlai's, ported to GLSL. Mist, chain dust and grease smoke: a K3 fluid (Volcano's port), lit by Fire's smoke light from `shared/smoke.js` (`smLight`, `smPhase`, `smConsts`), backlit by the sun.
- The crowd: flat figure cards in profile, Frietkot's `walker()` shape (Tom: "perhaps we can use frietkot like silhouettes"). Against the low sun they are ink with a sunlit rim. They face the berth; after the hit some wave and point.

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
| Drag | Turns the head up to 15 degrees on top of the move; it eases back |
| R | Puts her back on the ways |

## Sound

Web Audio on the shared kit, muted by default: the rope, the trigger weight and the shores, her groan, the slide's rumble with its echo off the shed, the chains, the hit and the spray, the wave's slap on the pier and its wash, the crowd's cheer. Hull sounds play late by distance on the audio clock. Mute and a hidden tab stop every pending sound; the context sleeps after the last one.

## Files

| File | Holds |
|---|---|
| `index.html` | Page skeleton |
| `main.js` | Bar, camera, frame loop, gestures, spray and mist emitters, sound cues |
| `yard.js` | The site, the hull lines and topsides, the berth, ways, quays, pier, crane, shed, far land |
| `launch.js` | The physics: grease, slide, tip, float, drag chains |
| `canal.js` | The basin's shallow-water sim, the draft pass, the pier readback, the mirror, the water surface |
| `foam.js` | The foam pattern bake (Ponlai, MIT) |
| `spray.js` | Spray and drops |
| `mist.js` | The K3 fluid for mist and dust, its march (light from `shared/smoke.js`) and composite |
| `props.js` | Wires and heaps, the crowd, the bunting |
| `figures.js` | The figure shape, copied from `frietkot/figures.js` (`walker()` and its helpers) |
| `sound.js` | Web Audio |

## QA

Captures: `docs/qa/shiplaunch/` (from the basin build, before the pier moved). Headless Edge on D3D11 (RTX 3070), 1280 x 800: 8.1 ms mean and 9.3 ms at the 95th percentile through the hit. Console clean. The idle, hidden, reduced-motion and sound results are in the beans.

## Open

- Tom: "not the sweeping quality we're looking for". The sweep is planned (`stimming-z2w5`): a wave wall, a camera move, light, a detail pass.
- The icon round `shiplaunch-1` has no pick yet; A is on the menu.
- On a phone the hull stands small over a wide pier deck; the sweep gives tall stages their own frames.
- Later stages are in the plan; none is built.
