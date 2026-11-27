# Fjord aurora (`aurora/`)

| | |
|---|---|
| Dutch | Noorderlicht /ˈnoːrdərˌlɪxt/ (draft) |
| Motto | The sky is putting on something comfortable. |
| Shelf | Lab, tag "Stimming Lab" |
| Stage | None |
| Series | None |
| Accent | `oklch(0.82 0.19 158)` |
| Sound | Yes |
| Legacy build | No |
| Signed off | No |

## Idea

Idea 18, group C: a slider sets the solar wind; curtains ripple and reflect in still water. Bean `stimming-fzek`. Plan: [aurora.md](../plans/aurora.md), an MVP.

## Rules

- The camera does not move. The horizon stays level, so the water is an exact mirror.
- The curtains are true sheets in the sky. Nothing paints a curtain on the screen.
- No props: no houses, boats or lights. The mountains and the water frame the sky.

## Direction

- 3D sky, flat stage. The camera stands 2 m above the water on the shore and looks north up the fjord, about 80 degrees across. An off-axis shift puts the horizon at 36% from the foot.
- Long-exposure colour, as the Lofoten photos show it: a navy sky, saturated green, a pink hem in a storm, faint red tops.
- Mountain walls left and right, a hazy snowy range in the gap. Snow takes the colour of the aurora light above it.
- A portrait stage brings the curtains nearer (higher in the sky) and makes the peaks taller.

## Controls

Bar v3, from the `bar` spec in `initPage()`.

| Slot | Holds |
|---|---|
| Action | Gust (Space) |
| Slider | Solar wind, 0 to 1; stored as `stimming.aurora.wind`; default 0.45 |
| Settings | Quality (shared) |

| Input | Does |
|---|---|
| Tap the sky or the water | A gust: a brightening that runs both ways along the near curtain |
| Drag up or down | Moves the Solar wind; half the stage height spans the range |
| Space | A gust at a random point |
| Touch | The same |

## The model

- Units are km. Earth radius 6371. Each curtain is a vertical sheet across an arc, turned from east-west (0.55, 0.18 and -0.16 rad), so the near one sweeps across the view in perspective.
- The sheet folds by four sines; amplitude grows with activity. Field lines lean 0.2 km toward the viewer per km of height, so the rays fan out upward.
- A ray march crosses each sheet in 24 steps (16 on the low rung). The sheet integral per step is exact (an erf), so a thin sheet never flickers, and a fold seen edge on glows brightest.
- Colour by height above the lower border: a pink hem 2 km below it in a storm, green 557.7 nm above it, red 630 nm from 140 km.
- Activity = 0.85 x level + 0.75 x storm. Level chases the slider (3 s up, 6 s down).
- A rise of the wind 0.14 above its slow baseline starts a substorm: a 2 s rise, a 7 s hold, a 9 s fade. A surge head starts east of the frame and runs west at 70 to 130 km/s.
- The water: a mirror of the sky above the horizon, a faint swell near the shore only, Schlick Fresnel with n = 1.33.

## Passes

Three small programs, so D3D11 links each fast.

1. Aurora: emission only, at half size, over the sky above the horizon. Mipmapped; a small mip lights the snow and the haze.
2. Scene: sky, airglow, stars, mountains, snow; below the horizon, the mirror.
3. Final: bloom (`shared/glow.js`), vignette, grain, film curve.

## Sound

Web Audio, muted by default. A low pad on A (55 Hz with fifth and octave) opens its filter with the activity; soft air moves over the water. Above an activity of 0.7, faint crackles, as observers report. The substorm sweeps a breath east to west under a rising low tone. A gust rings three soft bell partials from a pentatonic set, never the same three.

## Frame loop

Lively in a storm, a gust or a slider move; drifting at 30 fps; asleep 60 s after the last input, over 2 s. Hidden stops the loop and the clocks. Reduced motion: no drift; a gust or a storm runs the clock at 0.35 speed, then the loop stops.

## Known

- Headless Chromium with `--use-angle=gl` falls back to SwiftShader here (about 290 ms a frame). Capture with Edge on D3D11.
- Two NaN traps on NVIDIA GL, both guarded: `pow()` of a negative base, and `tanh()` of a large value.
