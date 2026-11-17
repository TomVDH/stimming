# Tornado alley: Film and ACES tone maps (stimming-d3af)

Dev row `Tone map: Film / ACES`, after Exposure. Default ACES.
Film is `ouFilm` (the Narkowicz fit). ACES is `ouFilmAces`: Stephen Hill's RRT and ODT fit with its colour matrices, input times 1 / 0.6.
ACES takes a 1.1 gain in `tornado/main.js` (`TONE_GAIN`); Exposure trims both curves.

All frames are 1600 x 900, `?tor=F2.5&age=20`, Exposure 1, the loop paused. Each pair is the same moment.
`*-sbs.jpg`: Film left, ACES right.

| File | Shot |
|---|---|
| `golden-*` | `?time=golden` (18.3 h) |
| `dusk-*` | `?time=dusk` (19.4 h) |

## Levels, sRGB 0 to 1

| Shot | Mean R, G, B | Peak R |
|---|---|---|
| Golden, Film | 0.246, 0.186, 0.138 | 0.835 |
| Golden, ACES | 0.221, 0.170, 0.129 | 0.820 |
| Dusk, Film | 0.181, 0.120, 0.080 | 0.820 |
| Dusk, ACES | 0.157, 0.106, 0.072 | 0.812 |

No pixel clips in either curve.

## Other toys

The environment runner's default (`tone: 'film'`) is bit-equal to the old code: 0 of 204,800 bytes differ on a test scene. Fog horn, Lantern lake and Pressure washer load with no errors.
