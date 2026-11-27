# Glowing tide (`tide/`)

| | |
|---|---|
| Dutch | Lichtend tij /ˈlɪxtənt ˈtɛi/ (draft) |
| Motto | The sea is showing off after dark. |
| Shelf | Lab, tag "Stimming Lab" |
| Stage | None |
| Series | None |
| Accent | `oklch(0.74 0.15 228)` |
| Sound | Yes |
| Legacy build | No |
| Signed off | No |

## Idea

Idea 40, group F: waves on a night beach glow blue where you touch. Bean `stimming-swe9`. Plan: [tide.md](../plans/tide.md), an MVP.

## Rules

- Only stirred water glows. An unbroken wave face stays dark; the lip lights when it breaks.
- The glow is one colour, the cyan-blue of the plankton (about 475 nm). Only the hottest core goes toward white.
- A stir fades over seconds (time constant 2.4 s), as the flashes die out.
- No props on the beach. No moon: moonlight hides the glow.

## Direction

- 3D, seen from the beach at eye height (1.5 m), with a fixed camera. The horizon sits a third down the free stage.
- Raw WebGL2. Each wave is an analytic crest line with a leaning face; the ray meets the face or the beach plane. No geometry.
- A wave runs in, shoals, and breaks at 13 to 21 m. The break peels along the crest at 5 m/s from a random point.
- The bore runs to the shore; the swash runs up the wet sand and slides back.
- The wet sand is a dim, broken mirror; the swash sheet is a clean one. The sea and the sand mirror the glowing lip.
- Sky: a dark grey-blue dome, faint stars, a dim warm band at the horizon. Haze softens the far sea.

## Controls

Bar v3, from the `bar` spec in `initPage()`.

| Slot | Holds |
|---|---|
| Action | Wave (Space): a big wave rises just outside the break |
| Slider | Swell: wave height and how often waves come; stored as `stimming.tide.swell` |
| Settings | Quality (shared) |

| Input | Does |
|---|---|
| Tap | A splash of glow at once: a cloud with sparks on the water, point sparks on the sand |
| Drag | Stirs a trail of glow along the path |
| Hold | Keeps the water round the finger stirred |
| Space | Sends a big wave in |

## Sound

Web Audio, muted by default. A low surf bed follows the breaking waves. Each break is a crash that rises as the lip falls, panned to the peel, with a low thump. The swash hisses up the sand. A stir swishes with the hand's speed and a few soft high tones glint with the sparks. No two sounds repeat: pitch, length, level and pan jitter.

## Frame loop

- Lively while a hand stirs or within 1.5 s of input; drifting at 30 fps with the surf and a fading stir.
- 60 s after the last input the surf slows to a stop over 2 s and the loop sleeps.
- Reduced motion: the surf holds still; a touch still glows, softer, and the loop sleeps once it fades.
- The slow-frame step lowers the pixel ratio first, then the bloom levels.

## Icons

Round `icons/spike-tide-1.html` (Current, A, D). No pick yet: A is on the menu. The intro emblem is A's silhouette.

## QA captures

`docs/qa/tide/`: blockout, first frame, a drag, a big wave, phone, reduced motion, the Lab tile.
