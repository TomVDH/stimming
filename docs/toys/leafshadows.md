# Leaf shadows (`leafshadows/`)

| | |
|---|---|
| Dutch | Bladerschaduw /ˈblaːdərˌsxaːdyʋ/ (draft) |
| Motto | None |
| Shelf | Lab, tag "Stimming Lab" |
| Stage | None |
| Series | None |
| Accent | `oklch(0.84 0.13 85)` |
| Sound | Yes |
| Legacy build | No |
| Signed off | No |

## Idea

Idea 76, group F: dappled light through leaves on a wall; a slider sets the breeze. The Japanese word komorebi names it. Bean `stimming-3a36`. Plan: [leafshadows.md](../plans/leafshadows.md), an MVP.

## Rules

- The stage is the wall. The tree stays out of view; only its shadow shows. No props.
- Each gap in the leaves is a pinhole: its spot on the wall is an image of the sun, not the shape of the gap.
- One wind model drives the branches, the twigs, the leaves and the sound.

## Direction

- Flat. A warm lime-plaster wall, seen square on: 1.5 m of wall tall on a wide stage, 1.25 m wide on a narrow one. A tall stage slides right, so the near sprig stays in the shot.
- A late-afternoon sun from the upper left: 28 degrees up, 58 degrees off the wall's normal. Gold sun, a cool grey-blue sky fill in the shadows, a warm bounce from the ground below.
- The crown shades the upper left; the sun falls open to the lower right. A mid branch reaches in low from the left; a near sprig hangs in from the upper right.

## Controls

Bar v3, from the `bar` spec in `initPage()`.

| Slot | Holds |
|---|---|
| Action | Gust (Space): one gust from the left edge |
| Slider | Breeze: still to gusty (stored) |
| Settings | Quality (shared) |

| Input | Does |
|---|---|
| Move over the wall | Your hand's shadow follows the pointer |
| Tap | A gust, from just upwind of the tap |
| Space | A gust |
| Touch | A finger down shows the hand; a tap sends a gust |

## The model

- Four layers by distance from the wall: the crown at 5.5 m and 3.6 m, in rosettes of leaves at the twig tips; a mid branch at 1.3 m; a near sprig at 0.55 m.
- A layer at distance d blurs by the sun's disc from there: radius d times 0.00465 over the light's cosine on the wall, stretched along the slant. The blur kernel is an ellipse of 32 to 64 equal-area taps with limb darkening.
- The far masks multiply in order (crown, crown, mid). The near sprig draws its own 6 mm penumbra.
- A leaf passes about a tenth of the sun, yellow-green. One leaf's shadow reads a little green; stacks read grey.
- Each branch is a damped spring. The wind leans it and buffets it near its own frequency. Twigs bob about their base, faster; a shoot's stem and leaves move as one. Each leaf twists and turns edge-on, so the dapples blink.
- Wind: the breeze times a gust field that runs left to right; a stronger breeze is also gustier. A gust from Gust or a tap is a front at 2.3 m/s with a sharp edge and a long tail.
- The hand: an open hand at 0.6 m from the wall, drawn 1.4 times life size, with the forearm off the lower right. Its edge glows a little red, as light through skin does.
- The plaster: a fine grain, trowel strokes in gradient noise, a few pits; baked once per size. The sun rakes it, so the grain shows in the light and fades in the shade.

## Passes

Five small programs, so D3D11 links each fast.

1. Leaves: instanced quads with a leaf or stick shape, multiplied into four masks (quarter, quarter, half and full size).
2. Blur: three passes, one per far mask, each times the one before.
3. Bake: the plaster, once per size.
4. Wall: the plaster lit through the masks and the hand.
5. Final: bloom (`shared/glow.js`), vignette, ACES fit, grain.

## Sound

Web Audio, muted by default. Two bands of leaf rustle, left (the denser crown) and right, follow the wind at each side of the view. A fine hiss and short leaf ticks come with the flutter; never two ticks alike. A low breath sits under them. A gust swells from where it starts and pans to the right. The hand makes no sound; breeze 0 is nearly silent.

## Frame loop

Drifting at 30 fps while the breeze blows. Lively while a gust runs or the hand moves. Asleep 60 s after the last input: the breeze eases out over 2 s and the branches settle with extra damping. Hidden stops the loop and the clocks. Reduced motion: no ambient sway; a gust or a slider move gives one slow, soft sway that settles; the hand still follows. Slow frames step down: the pixel ratio, then fewer blur taps, then a smaller bloom.

## Known

- Capture with Edge headless on D3D11 (RTX 3070).
