# Forge (`forge`)

Lab toy, idea 372. Bean `stimming-tlme`. Plan: `docs/plans/forge.md`.

A coal forge in a dim smithy: the hearth under its hood, a leather bellows, an anvil on its stump, a water trough, and a bar of square stock in tongs. The fire and the hot steel are the light.

## Play

| Input | Act |
|---|---|
| Click or hold the bellows | One stroke, or strokes in rhythm. The coals flare, flames lick up, embers rise. |
| Drag the bar | It follows the pointer along the line of stations and drops at the nearest one. |
| Click a station | The bar goes there. |
| Click at the anvil | One blow. Hold: blows in rhythm. |
| Bar in the trough | Quench: steam, boil, the bar goes dark; it comes back to the anvil. |
| Keys | 1 to 3 stations, Space strike, B pump, N new bar |

## Bar v3

Choice Station (Fire, Anvil, Trough; 1 to 3). Slider Hammer, 0.5 to 2 kg. Actions Strike (Space, hold), Pump (B, hold), New bar (N). How to play has four rows.

## How it works

| Part | Model |
|---|---|
| Stack | three.js 0.170: standard materials, a haze pass (the fire's glow and the window shaft), the steam volume, bloom, a grade. |
| Heat colour | One ramp in degrees C, in GLSL and JS: 650 dull red, 750 cherry, 900 orange, 1050 yellow-orange, 1200 yellow, 1300 white. It colours the steel, the coals, the sparks and the lights. |
| Fire | Air from the bellows (each stroke adds 0.26, tau 3.6 s). The core runs 820 degrees C idle to about 1340 on full blast. |
| Steel | 48 samples: heat, scale, width, thickness, length. Gain in the coals; conduction; loss by radiation (T^4) and air; the anvil draws heat; the water draws it fast, slower above 450 degrees C (a vapour film). |
| Blow | Thickness under the hammer drops by heat and hammer weight; width takes a share and length the rest, so volume holds. The bar walks along the face between blows. Cold steel does not move; it rings. |
| Scale | Grows above 720 degrees C; a blow sheds it as sparks and dark chips; the quench sheds half. A cold bar is dark. |
| Steam | Steelworks' WebGL2 port of Fire's K3 fluid, retuned (copied, not imported): two emitters where the bar meets the water, fed by the heat the water takes. Lit by the fire, the window and the bar below. |
| Eye | Fixed 3/4 view from the front right; it pans and steps in toward the bar's station. |

## Sound

Muted by default. The fire's low roar and coal ticks (left); a bellows stroke (whoosh, creak, knock); a blow (click, thud, the anvil's five inharmonic modes, damped when the steel is hot, bright on cold steel, a dry scale crackle); the plunge (slap, hiss) and the steam's roar and boil (right); a clink when the bar lands on the anvil.

## Frame loop

Lively while anything moves; 30 fps while the bar or the fire is still warm; asleep 60 s after the last input (the heat clock stops); hidden stops at once. Reduced motion: no flicker or embers, fewer sparks, no shake.

## Known

- The composer's two buffers share one depth texture, so the steam marches inside the haze pass, while the scene's depth holds.
- The coal light casts no shadow: its cube shadow lit an ellipse on the floor. A spot shadow from the hearth is a possible follow-up.
- Sound is built and checked for state (the context runs and sleeps), not yet heard by Tom.
