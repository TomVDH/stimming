# Glowing tide (`tide`)

Status: built as an MVP, 2026-11-22; waits on Tom. Bean `stimming-swe9`. Idea 40, group F: "Waves on a night beach glow blue where you touch."

## The hero moment

Surf on a dark beach at night. A wave runs in, peels along its length, and its lip flashes blue as it breaks.
The white water rolls to the shore as a glowing band that fades behind it.
Touch the water or the wet sand: it lights up in bright blue sparks that fade over seconds.

## Defaults (Tom's open question: 3D or flat, and the presentation)

| | Choice | Why |
|---|---|---|
| Space | 3D, seen from the beach at eye height (1.6 m), a fixed camera | The glow is a line along the lip; only a low view shows the wave face and the lip as a line. Flat from above loses the breaking. |
| Renderer | Raw WebGL2, one scene pass per pixel, on `shared/gl.js`, bloom from `shared/glow.js` | No geometry to move. Each wave is an analytic crest line; the ray meets the crest sheet and the sand plane. Small programs, so D3D11 links fast. |
| Sky | No moon, a dark grey-blue sky, faint stars, a dim warm glow on the horizon | Moonlight hides the glow (the reference photos say the same). |
| Colour | The glow is one cyan-blue, about 475 nm (the emission peak of the dinoflagellate) | The reference photos show one saturated cyan-blue, white only at the brightest core. |
| Stir | A decaying map in screen space (K1 decay from Star trails, via Double slit) | The camera does not move, so screen space is the beach. |

## Reference (photos looked at, 2026-11-22)

- Torrey Pines, San Diego (NPR, 2018): only the breaking lip and the white water glow. The unbroken face stays dark.
- The lip is a thin bright band; the white water in front is a softer, wider blue.
- Sky: dark grey-blue, a faint lighter band at the horizon. The sand is near black.
- The glow is a flash on stirring: it lives a second or two, then fades.

## The scene

- Sea plane from the shoreline out to the horizon; wet sand from the shoreline to the camera.
- Waves: up to six at a time. Each is born far out, shoals, and breaks at about 24 m. The break peels along x from a random point.
- After the break the bore runs to the shore, the swash runs up the wet sand and slides back.
- The wet sand is a dull mirror: the lip's glow and the sky reflect in the swash sheet.
- The pointer stirs: a press or drag splats into the stir map. On water it glows soft and wide with sparks; on sand it shows as point sparks only.

## Bar v3

| Control | Content |
|---|---|
| Action | Wave (Space): sends a big wave in now |
| Slider | Swell: the wave height and how often waves come |
| How | Drag: stir the water or the sand · Space: send a wave |

## Frame loop

- Lively while the pointer stirs or the stir map glows. Drifting at 30 fps with the surf.
- 60 s after the last input the surf slows to a stop over 2 s; the loop sleeps.
- Reduced motion: the surf holds still; a touch still glows, softer.

## Sound

Muted by default. A low surf bed; each break a crash, panned at the peel and swelling as it peels; the swash hisses up the sand.
A stir makes a soft water swish and a faint shimmer of small high tones, never the same twice.
