# Pi walk (`piwalk/`)

| | |
|---|---|
| Dutch | Piwandeling /ˈpiːˌʋɑndəlɪŋ/ (draft) |
| Motto | None |
| Shelf | Lab, tag "Stimming Lab" |
| Stage | None |
| Series | None |
| Accent | `oklch(0.76 0.15 42)` |
| Sound | Yes |
| Legacy build | No |
| Signed off | No |

## Idea

Idea 51, group B: each digit of pi takes one step in a direction, and a random-looking walk draws itself. Bean `stimming-dl9i`. Plan: [piwalk.md](../plans/piwalk.md), an MVP.

## Rules

- The digits are true digits of pi. A module worker computes them with the Chudnovsky series in BigInt: 5,000 first, then 250,000. The page ships no digits file.
- Digit d steps 36 d degrees clockwise from up, like the hours on a dial. The 3 is the first step.
- The pace is dn/dt = (5 + 0.12 n) times the Pace slider and the rush. The step is exact at any frame rate. The whole walk takes about 72 s at the default pace.
- `tests/piwalk-digits.test.mjs` checks the digits against a Machin series.

## Direction

- Flat, face on, light on black, as the well-known poster walks are.
- Each step is a fine line of light. Lines add, so the places the walk crosses again glow brighter.
- The colour follows the index on a calm ramp: deep indigo at the start, then blue, sea teal, pale gold, and coral at the head. The ramp spans the walk drawn so far.
- The head is a white-hot point. The newest steps burn hot and cool into the ramp.
- The view eases out in log space as the walk's box grows, so the zoom reads as steady.
- At the last digit a band of light runs down the walk from start to end, and the head goes out.
- The readout in the top right corner shows the last digits, the newest in white, and the count. It is the one piece of copy on the stage.

## Controls

Bar v3, from the `bar` spec in `initPage()`.

| Slot | Holds |
|---|---|
| Actions | Pause (Space), Restart (R) |
| Slider | Pace: 0.25 to 4 times, log scale |
| Stage | Tap: pause or go on; at the end, start again. Hold or drag: rush, up to 12 times. |

## Sound

Muted by default.

- One soft note per step: a mallet on glass, rendered once per digit into a buffer. The digits 0 to 9 are the A major pentatonic over two octaves from A3.
- Notes pan with the head. Faster runs ring shorter and softer; above 14 steps a second the notes thin to 14 a second.
- An air bed of filtered noise rises with the pace.
- At the last digit: an open chord, strummed upward.

## Frame loop

- Lively while the walk draws, the view eases, the end sweep runs or the head fades.
- Paused or done, the loop stops. There is no ambient drift.
- Hidden: the loop and the walk's clock stop.
- Reduced motion: the view steps, the head does not burn, and the end has no sweep.

## Files

| File | Holds |
|---|---|
| `piwalk/index.html` | The page, the readout styles |
| `piwalk/main.js` | State, view, pace, pointer, loop |
| `piwalk/digits.js` | Chudnovsky digits; the worker |
| `piwalk/render.js` | Instanced steps, bloom, the grade |
| `piwalk/sound.js` | Notes, air bed, chord |

QA captures: `docs/qa/piwalk/`.
