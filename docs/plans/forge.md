# Forge (`forge`)

Status: done as an MVP, 2026-11-23; waits on Tom. Bean `stimming-tlme`. Toy doc: `docs/toys/forge.md`. Idea 372, group E, size L: "Pump the bellows, the bar glows yellow, hammer it with sparks and ring, quench it in a roar of steam."

## The hero moment

A coal forge in a dim smithy. The only strong light is the fire and the hot steel.
Pump the bellows: the coals flare, and the end of the bar in the fire heats through the colours of real heat (black, dull red, cherry, orange, yellow).
Drag the bar to the anvil and tap to hammer. Each blow rings, throws a fan of sparks and flakes of scale, and flattens and draws out the hot end.
Plunge the bar in the trough: a roar of steam and boiling water, and the bar comes out dark.

## Defaults (Tom's open question: 3D or flat, and the presentation)

| | Choice | Why |
|---|---|---|
| Space | 3D, a fixed eye 3/4 from the front right; it pans along the line to the bar's station and steps in, most at the anvil | The bar's glow lights the anvil, the hood and the floor; the light is the toy. |
| Renderer | three.js 0.170 (Scene type): standard materials, bloom, haze, a grade | Rigid parts and many lights. Steelworks is the reference for the haze, sparks and fume passes; Forge keeps its own copies. |
| Set | Hearth with a coal bed under a hood, a leather bellows on its left, the anvil on a stump, a water trough on the right | The four things the idea names. No smith, no tools on the walls (Look rule). |
| Steel | One bar of square stock, 50 cm, held in tongs. A heat field of 48 samples along it; scale and shape per sample | The colour runs along the bar; the hot end flattens where it was hit. |
| Heat colour | A ramp in degrees: 550 faint, 650 dull red, 750 cherry, 900 orange, 1050 yellow-orange, 1200 yellow, 1300 white | The smith's colour chart. The same ramp lights the room. |
| Steam | Fire's smoke shading, through Steelworks' WebGL2 port of the K3 fluid, retuned for steam | House rule: every smoke and steam follows Fire. |
| Light | The coal bed is the key light; the bar is a second light; a faint cool spill from a high window | Warm against cool; the haze carries both. |

## Interaction

| Input | Act |
|---|---|
| Tap or hold the bellows | One stroke, or strokes in rhythm while held. The coals flare. |
| Drag the bar | It follows the pointer along the line: fire, anvil, trough. It drops at the nearest station. |
| Tap a station | The bar goes there. |
| Tap at the anvil | One blow. Hold: blows in rhythm. |
| Bar in the trough | Quench: steam, boil, the bar goes dark. |
| Keys | 1 to 3 stations, Space strike, B pump, N new bar |

## Bar v3

Choice Station (Fire, Anvil, Trough; keys 1 to 3). Slider Hammer (0.5 to 2 kg). Actions Strike (Space), Pump (B), New bar (N).

## Physics

| Part | Model |
|---|---|
| Fire | Air from the bellows (each stroke adds 0.26, tau 3.6 s). The coal core runs 820 °C idle to about 1340 °C on full blast. |
| Heat | 48 samples. Gain from the coals on the part in the fire; conduction along the bar; loss by radiation (T^4) and air; the anvil draws heat where the bar lies; water draws it fast. Timed for play: yellow after about eight strokes; yellow to dull red on the anvil in about 15 s. |
| Scale | Grows above 700 °C; flakes off at each blow (sparks and dark chips) and in the quench. A cold bar is dark with scale. |
| Shape | Per sample: width, thickness, length. A blow takes thickness under the hammer, by heat and hammer weight; width and length take the volume. Cold steel does not move; it rings. |
| Steam | The heat that the water takes from the bar feeds the steam emitters at the bar's line, and the boil on the water. |

## Reference (photos looked at, 2026-11-23)

- Anvil, Ironworks Blacksmith Forge, 2020 (Flickr, CC BY): London pattern, face 60 % of the length, a step, a long horn, a narrow waist, flared feet.
- Abbaye de Fontenay forge (Commons): a raised hearth with a glowing coal bed under a huge hood.
- Soufflet de forge (Commons): a lung-shaped leather bellows between two boards, studded rims, a nozzle to the hearth, worked by a lever and chain.
- Blacksmith sparks (Commons, several): at a blow the sparks fan out low and wide over the anvil; orange streaks, few forks.

## Tasks

1. Blockout: set, camera, lights, a hot bar. Screenshot.
2. Heat sim and colour; the fire and the bellows.
3. Bar moves; hammer, sparks, scale, deformation; ring.
4. Quench: steam, boil, dark bar.
5. Sound.
6. Bar v3; icons; Lab entry; QA Q1 to Q10.
