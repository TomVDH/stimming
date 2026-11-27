# Double slit (`doubleslit/`)

| | |
|---|---|
| Dutch | Dubbele spleet /ˈdʏbələ ˈspleːt/ (draft) |
| Motto | It behaves differently when you're watching. Relatable. |
| Shelf | Lab, tag "Stimming Lab" |
| Stage | None |
| Series | None |
| Accent | `oklch(0.7 0.17 258)` |
| Sound | Yes |
| Legacy build | No |
| Signed off | No |

## Idea

Idea 123, group A: fire single photons through two slits. Each photon lands as one random dot; only the crowd of dots shows the interference fringes. Bean `stimming-w9m0`. Plan: [doubleslit.md](../plans/doubleslit.md), an MVP.

## Rules

- Every landing comes from the true far-field intensity. Nothing draws the fringes by hand.
- A dot never moves and never fades. Only Clear empties the plate.
- No apparatus on the stage. The plate is the one object.

## Direction

- Flat, face on: the stage is the face of a photon-counting camera, as the real build-up photos show it (Tonomura's electrons; Harvard's EMCCD demo).
- A plate of dark blue glass in a matte black frame, in a darker room. One room light lies as a sheen on the glass, top left, and leans toward a hovering mouse.
- The faint hexagon grid of a fibre bundle lowers the gain along its seams, as on a real intensifier.
- Each landing flashes white-hot in its photon's colour, with bloom, and settles to a small dot in 0.1 s.
- Each dot keeps its photon's colour. A real detector is grey; here colour shows the wavelength.
- The default is 470 nm, a blue LED. Harvard's demo uses a blue LED.

## Controls

Bar v3, from the `bar` spec in `initPage()`.

| Slot | Holds |
|---|---|
| Choice | Two slits (2), One slit (1); stored as `stimming.doubleslit.slits` |
| Actions | Fire (Space, hold to stream), Clear (C) |
| Slider | Colour: 420 to 660 nm; stored as `stimming.doubleslit.nm` |
| Settings | Quality (shared) |

| Input | Does |
|---|---|
| Tap the plate | Fires one photon at once |
| Hold or drag | Streams: the rate rises to 60 a second over about 3 s, and falls on release |
| Space | Fires one, and streams while held |
| 1, 2 | Covers one slit, or opens both. The plate keeps its dots, so new dots fill the dark fringes. |
| C | Clears the plate |
| Touch | The same; one finger at a time |

## The physics

- Far-field intensity: `I(u) = cos²(5πu·532/λ) · sinc²(πu·532/λ)`, with `u = 1` at the first envelope zero for 532 nm.
- Slit width to gap is 1 to 5 (Harvard: 200 µm slits, 1.0 mm apart), so nine fringes fill the central envelope.
- One slit: `sinc²` only. The fringes go; the broad hump stays.
- A landing is drawn by inverse CDF from a 4096-bin table; the table rebuilds when the slits, the colour or the span change.
- 1.2% of landings are dark counts, uniform over the plate.
- Along y the beam falls off as a Gaussian (sigma 0.42 of the half height).
- The plate spans `u` to ±1.8 on a wide stage and ±1.1 on a narrow one, so a phone shows fewer, wider fringes.
- Colour: the CIE 1931 fit of Wyman, Sloan and Shirley, then linear sRGB. A quarter of the gamut shortfall goes to white; the rest clips.
- Tests: `tests/doubleslit-optics.test.mjs`.

## Render

Raw WebGL2 on `shared/gl.js`, bloom from `shared/glow.js`.

| Pass | Does |
|---|---|
| Dots | Instanced Gaussian quads, added into the plate (every count) and the flash layer |
| Decay | K1 from `trails/`: the flash layer fades by `exp(-dt / 0.09 s)` |
| Compose | Room, frame, glass, hexagon gain, the plate through a soft curve on its brightest channel, the flashes, sheen and bevel |
| Bloom, grade | Threshold 0.55; filmic curve, vignette, grain |

- The CPU keeps every landing (angle, height, wavelength), so a resize draws the plate again.

## Sound

Web Audio through `audioKit()`, muted by default.

- Each landing clicks: a noise burst of 12 to 28 ms through a band at 2.1 to 4.7 kHz with a Q of 4 to 9, and a faint low tap. Level, pitch, length and time jitter every time; it pans with x.
- Above 38 a second the clicks thin out by chance, and a soft rain of high noise rises with the rate.
- A slit change slides a cover: a short scrape, then a dull stop.
- Clear wipes from left to right.

## Frame loop

- Lively while a stream runs, for 2.5 s after input, or while a flash glows: full rate.
- Drifting: the idle source drips about 3 photons a second, at 30 fps.
- 60 s after the last input the drip stops over 2 s; the loop sleeps when the last flash fades.
- Hidden: the loop and the source stop at once.
- Reduced motion: no drip, softer flashes with no halo; tap and hold still fire.

## QA

Captures in `docs/qa/doubleslit/`. Headless Chromium with `--use-angle=gl` on Tom's PC.

| # | Result |
|---|---|
| Q1 | `node --check` passes on `main.js`, `optics.js`, `plate.js`, `sound.js` and the menu script. |
| Q2 | Clean console through tap, hold, Space, 1, 2, C, the chips, Clear and the slider. |
| Q3 | 1280 x 800, 375 x 812 and 812 x 375 captures, and one per hero moment. |
| Q4 | Drifting: 30 rAF per second. 62 s idle: 0. |
| Q5 | Hidden: 0 rAF calls in 2 s. |
| Q6 | Reduced motion: clean console; 0 rAF calls 2.5 s after a hold. |
| Q7 | A choice, one slider and two actions; four How to play rows. |
| Q8 | Space streams, 1 and 2 change the slits, C clears. |
| Q9 | The context runs after a tap and is suspended once the toy sleeps. |
| Q10 | Hold on this PC: median 16.7 ms, p95 16.7 ms. |
