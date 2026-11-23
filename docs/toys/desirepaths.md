# Desire paths (`desirepaths/`)

| | |
|---|---|
| Dutch | Olifantenpaadjes /ˌoːliˈfɑntəˌpaːcəs/ (draft) |
| Motto | None |
| Shelf | Lab, tag "Stimming Lab" |
| Stage | None |
| Series | None |
| Accent | `oklch(0.82 0.09 75)` |
| Sound | Yes |
| Legacy build | No |
| Signed off | No |

## Idea

Idea 14, group B, a data toy: the pointer wears trails into a lawn over the session. Bean `stimming-l8sg`. Plan: [desirepaths.md](../plans/desirepaths.md), an MVP.

## Rules

- The data is the hand's own route. Nothing walks the lawn but the pointer.
- Wear builds over minutes, not seconds. One pass only bends the grass.
- The flags take no wear. No props: the park is turf, two paths and light.

## Direction

- Flat: a plan view, straight down, with no camera motion. 7.5 m of lawn tall on a wide stage (12 m across at 16:10), 5.4 m wide on a phone. A tall stage slides right, onto the crossing.
- Two paths of pale concrete flags, 1.8 m wide, cross at right angles: one across the lower third, one down the right third. The turf edge hangs a few cm over the flags.
- The lawn is mown in 0.9 m stripes. Morning sun from the upper left, 24 degrees up; a cool sky fill. Slow cloud shadows drift over.
- The first frame shows an old line already worn across the main corner, bare in the middle.

## Controls

Bar v3, from the `bar` spec in `initPage()`.

| Slot | Holds |
|---|---|
| Action | Mow (M): the lawn regrows fresh over about 2 s |
| Slider | Footfall: how hard each pass wears, 0.25 to 4 times (stored) |
| Settings | Quality (shared) |

| Input | Does |
|---|---|
| Move over the lawn | Walk it: one print each stride |
| Drag | A crowd walks your line: heavier, wider |
| Tap | Stand: two prints side by side |
| M | Mow |
| Touch | A finger down walks; a tap stands |

## The model

- The walker follows the pointer and sets one print each 0.37 m, left and right of the line, with a little scatter. A new walk starts at a random phase and foot.
- A print is a sole, 27 cm long, heel and ball pressed hardest, with a halo of brushed blades. Prints draw as instanced quads into a deposit target.
- The wear field is 16 x 13 m at 2.5 cm a cell, RGBA16F: wear, flattening, and the lean as an axis at twice its angle, so walks there and back add up.
- A pass bends the blades along the walk; the bend springs back to the flattening in about 5 s.
- About ten passes flatten a line for good. Some seventy yellow it. Some 170 wear it to bare, packed earth. The wear takes a blurred deposit, so the line is one band, not a row of prints.
- Healing runs on the awake clock, in whole seconds: bare earth greens over about 10 minutes, flattening stands up over about 4 minutes once green.
- The turf stands about 6 cm, lower when flat; a worn trough sinks 1.5 cm. A short march toward the sun casts the turf's shadow into the trough and onto the flags.
- Each blade's sheen is Kajiya-Kay along its lean. Standing turf shows dark gaps between the tips; laid turf shows streaks. A trodden band lights both senses of its axis; the mown stripes keep theirs.
- Earth tracked out of a worn line smears onto the flags where it meets them.

## Passes

Four small programs, so D3D11 links each fast.

1. Stamp: instanced prints, added into the deposit.
2. Wear: the deposit into the field; spring back; heal.
3. Lawn: turf, earth and flags, lit by the sun and the sky, with cloud shadows.
4. Final: bloom (`shared/glow.js`), vignette, ACES fit, grain.

## Sound

Web Audio, muted by default. Each print makes a step, never the same twice: a swish of blades on turf (brighter as it dries), a soft thud, dry grit grains on bare earth, a heel tap and scuff on the flags. A crowd thins its steps to keep the mix clean. A low breeze bed sits under the drift. Mow is a long soft swell.

## Frame loop

Lively while the walker sets prints. Drifting at 30 fps for the wind sheen, the cloud shadows and the spring back (22 s after the last print). Asleep 60 s after the last input: the wind and clouds ease out over 2 s, and the lawn's clock stops with the loop. Hidden stops the loop and the clocks. Reduced motion: no wind and no clouds; prints still bend and spring back. Slow frames step down: the pixel ratio, then a smaller bloom.

## Known

- Capture with Edge headless on D3D11 (RTX 3070).
