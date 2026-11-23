# Rose window (`rosewindow`)

Status: in build as a Lab toy, 2026-11-23. Bean: `stimming-tzxy`. Idea 226, group F, quiet to use and rich to look at. Batch 7.

Tom's brief: "MVP at high fidelity, with icons for the lab and intro as well, bar v3". Idea: "Scrub the sun; coloured light crawls over pillars and dust."

## Defaults (Tom's open question: 3D or flat, and the presentation)

| | Choice | Why |
|---|---|---|
| Space | 3D. A fixed eye on the floor of a Gothic transept, a little off the axis, looking up at the rose in the end wall. Two arcades of round piers run toward the wall. | The light crosses depth: from the glass through the air to the floor and up the piers. A flat view loses the shafts. |
| Orientation | The rose faces south. `shared/daytime.js` puts the sun behind it all day: it rises on the left and sets on the right. | A south rose takes the sun from dawn to dusk, so the scrub has light at every hour. The shafts swing from the right arcade (morning) over the floor (noon) to the left arcade (evening). |
| Window | 8.4 m across, its centre 13 m up. A quatrefoil centre, 12 inner lancets, 24 outer lancets, 24 roundels between their heads. Deep blue ground, ruby medallions, gold and green accents. Lead cames, iron bars and stone tracery. | Notre-Dame's south rose: the reference photo of its structure. Blue and red are the 13th-century palette. |
| Light | Sun through the glass, projected along the sun's ray. The patch blurs by the sun's disc and the glass's waviness, by distance. A 1.0 m wall with a splayed inner reveal clips oblique light. Tracery 25 cm deep throws thicker shadows at a slant. | Real patches are soft coloured blobs, with the tracery still legible near the wall. At a slant the patch closes to a lens. |
| Haze | Thin dust in the nave: shafts show where the light crosses it, forward scatter toward the eye. Motes glint inside the shafts only. | The idea names dust. Shafts in a church only read in haze or dust. |
| Resting time | The real local time while the sun is up; 15:30 at night. A touch of the sun keeps the hour where you leave it. | The brief allows the real time. At night the window is dark, and the first frame must be a picture. |
| Renderer | Raw WebGL2 on `shared/gl.js`, bloom from `shared/glow.js`. The camera never moves, so the stone is ray-marched once per size into a G-buffer. Each frame only lights it. | A cheap frame, and small programs for D3D11. |

## The hero moment

Scrub the sun across the day. The shafts swing, the coloured patches crawl over the floor and the pier bases and climb the stone, stretch long and warm toward evening and fade. The window glows and dims as the light behind it changes: the panes the sun strikes glow hot, the rest glow with the sky.

## Bar

| Control | Content |
|---|---|
| Slider | Sun: the hour, 6:00 to 19:30 |
| Actions | Day (Space): the sun runs from now to dusk in about 24 s; press again to stop. Now (N): back to the real time. |
| How | Drag: scrub the sun. Tap: stir the dust. Arrows: a quarter hour. |

## Sound (muted by default)

- The room: a low, wide air tone with a long stone echo. It brightens with the light in the room.
- The scrub: a soft glass tone, like a wet finger on a glass rim, that swells with the speed of the sun. Its pitch steps through a D chord with the colour of the light.
- Each whole hour the sun crosses: one far bell, deep in the echo.
- A tap: a dry whisper of air and a few fine glints as the dust swirls.

## Frame loop

- Lively while the sun moves, a tap swirls, or the Day run plays.
- Drifting at 30 fps: the motes and the haze drift.
- Asleep 60 s after the last input. While the toy follows the clock, one frame a minute keeps the sun on time.
- Reduced motion: no drift; the motes stand; the Day run moves in quarter hours.

## Tasks

1. Bean, this plan, reference photos. Blockout screenshot at 1280 x 800.
2. Glass bake, G-buffer, light map, shading, haze, motes, grade.
3. Interaction, bar, sound.
4. Icon round `spike-rosewindow-1`, emblems, intro emblem, `toys.json`, Lab tile.
5. QA Q1 to Q10, `docs/toys/rosewindow.md`, commit.
