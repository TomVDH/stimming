# Desert eclipse (`eclipse/`)

| | |
|---|---|
| Dutch | Zonsverduistering /ˈzɔnsfərˌdœystərɪŋ/ (draft) |
| Motto | None |
| Shelf | Lab, tag "Stimming Lab" |
| Stage | None |
| Series | None |
| Accent | `oklch(0.76 0.15 48)` |
| Sound | Yes |
| Legacy build | No |
| Signed off | No |

## Idea

Idea 17, group C: drag the moon across the sun; shadow bands, a corona, then the landscape goes cold. Bean `stimming-07yy`. Plan: [eclipse.md](../plans/eclipse.md), an MVP.

## Rules

- The camera does not move. The scene changes only with the sunlight that passes the moon.
- The shadow is a true umbra in 3D. Nothing paints darkness on the screen.
- No props: a salt pan, a line of mesas and the sky.

## Direction

- 3D sky and ground, flat stage. Eye height on a salt pan, level, facing the afternoon sun at about 24 degrees up, about 52 degrees across. The horizon sits at 30% from the foot.
- The sun is drawn about seven times its true size; the moon is 8% larger than the sun. At true size the sun is 4 px wide.
- The pan is white and flat, so shadow bands read on it. Three layers of mesas, 9, 22 and 46 km out, stand in haze.
- A portrait stage narrows the lens and keeps the sun large.

## Controls

Bar v3, from the `bar` spec in `initPage()`.

| Slot | Holds |
|---|---|
| Action | Totality (Space): the moon glides to the centre, or on out the far side |
| Slider | Moon: its place along its path, lower right to upper left |
| Settings | Quality (shared) |

| Input | Does |
|---|---|
| Drag anywhere | Moves the moon; near the sun it moves at a tenth of the hand, so the contacts are easy to hold |
| Release near the centre | The moon settles into totality |
| Tap, Space | A glide: slow through the contacts, as in life |
| Touch | The same |

## The model

- `disc.js`: the moon's limb has valleys about 15 times true depth. A polar grid on the sun's disc, dense at the limb and limb-darkened, gives the visible share F, the light centre and the brightest bead.
- The eye adapts in about a second, down to 4% of full light; the display gain is that level to the power -0.75. The crescent's drawn brightness has a cap, so its glare never drowns the sky.
- The umbra is 55 km in radius. Its distance from the viewer is the moon's offset over (k - 1), times 55 km. Before mid-eclipse it lies ahead, toward the sun; after, behind. Air in the umbra column leans toward the sun with height.
- Sky light is an 8-sample sum along each ray, weighted by the air's density and extinction; the penumbra's light comes from the two-disc overlap. At totality the far lit air is lifted and tinted: the 360-degree glow.
- Shadow bands: two wave sets on the pan, a hand's width apart, at 0.1 to 0.4% of the light. Diamond ring: a flare at the brightest bead while F is under 0.4%.
- The pan's heat lags the light (4 s to cool, 9 s to warm). The heat drives the mirage at the horizon, the wind and the warmth of the grade.

## Passes

Four small programs, so D3D11 links each fast.

1. Sky: air, stars and planets, the mesas in haze.
2. Ground: the salt pan, its polygon ridges, glare, shadow bands, the mirage; above the horizon it copies the sky.
3. Sun: a box round the sun, blended over the scene. Photosphere, chromosphere, prominences, corona; the moon's limb with its valleys.
4. Final: bloom (`shared/glow.js`), the lens flare and the diamond ring, the cold grade, vignette, grain, film curve.

## Sound

Web Audio, muted by default. Desert wind and a sand hiss follow the heat of the pan and drop as the light goes; the air hushes as a lowpass falls. Each diamond ring strikes a glass bell where the bead flares. At totality a low chord on D swells under a sub, and faint crickets start.

## Frame loop

Lively while the hand or a glide moves the moon; drifting at 30 fps while the light settles or the scene shimmers; asleep 60 s after the last input, over 2 s. Hidden stops the loop and the clocks. Reduced motion: no drift and no shimmer; the light settles three times faster, then the loop stops.

## Known

- Capture with Edge headless on D3D11; frame median 7.6 ms at 1280 x 800 on the RTX 3070.
- A zero vector once made a NaN in the shadow-band direction and the bloom spread it; the umbra keeps its last heading at the centre.
