# Rose window (`rosewindow`)

Lab toy, idea 226. Bean `stimming-tzxy`. Plan: `docs/plans/rosewindow.md`.

A Gothic transept in pale limestone: two arcades of round piers run toward the end wall, and a great rose of stained glass glows high in it, deep blue with ruby medallions.
Sunlight through the rose throws coloured shafts through the dust and lays a soft image of the window on the stone.
Scrub the sun across the day: the shafts swing, the patches crawl over the floor, over the pier bases and up the arcade, stretch long and warm toward evening and fade. The window glows and dims as the sky behind it changes.

## Play

| Input | Does |
|---|---|
| Drag across the nave | Moves the sun: the full width is ten hours; right is later |
| Tap | Stirs the dust round the tap: a puff in the shafts, motes swirl and settle |
| Wheel, arrow keys | A fifth of an hour a notch; arrows a quarter hour |
| Sun slider | The hour, 5:54 to 19:36 |
| Day (Space) | The sun runs on to dusk at 0.45 hours a second; again stops it. Past dusk it starts at dawn |
| Now (N) | Back to the real local time |

- Untouched, the toy rests on the real local time while the sun is up (6:36 to 18:12). At night it opens at 15:30.
- A touch keeps the hour where you leave it. Now returns to the clock.

## How it is built

| File | What |
|---|---|
| `index.html` | The page shell |
| `main.js` | The hour, the light at each hour, the camera, pointer and keys, Bar v3 spec, frame loop |
| `render.js` | Raw WebGL2: the glass bake, the G-buffer, the light map, haze, shade, motes, bloom, grade |
| `shaders.js` | The nave's distance field and the seven programs |
| `sound.js` | Web Audio: the room, the rim tone, pings, the bell, the dust |

- 3D, raw WebGL2. The eye stands in the west gallery, 9 m up, a little left of the axis, 36 m from the rose.
- The camera never moves. The stone is ray-marched once per size into a G-buffer: normal and depth, albedo and occlusion. Each frame only lights it.
- The glass bakes once into a 1024 map with mips: a quatrefoil centre, 12 inner lancets, 24 outer lancets, roundels, iron bars, a Voronoi net of leads with painted matting and figure strokes.
- The light map (512, mips) runs when the sun moves. Each texel is a point on the glass: the glass colour, times the outer reveal's clip and the 25 cm tracery's slanted shadow, and the depth along the sun's ray to the first stone.
- Any point in the nave finds its light by one projection onto the glass: the colour at a mip that grows with the distance (the sun's disc and the glass's waves blur the patch), and a depth test for the piers' shadows.
- Haze: 36 steps at half size through two drifting octaves of dust, forward scatter toward the eye. The rose also glows in the air round itself.
- Motes: 6000 points in the air before the rose. A mote shows only in a shaft; each glints as its face turns to the sun.
- The sun from `shared/daytime.js`, its swing narrowed to 55 percent: a south rose under a winter-like arc keeps its light in the nave.
- Each loop count adds a uniform zero, for D3D11 link times.

## Frame loop

- Lively while the sun moves, the Day run plays, or a tap's swirl is under 3.5 s old.
- Drifting at 30 fps: the dust and the motes drift.
- 60 s after the last input the drift eases to a stop over 2 s; the loop sleeps. While the toy follows the clock, one frame a minute keeps the sun on time.
- Hidden tab: the loop and the drift clock stop.
- Reduced motion: no drift. The Day run steps a quarter hour each 0.6 s. Gestures still move the sun.

## Sound

Muted by default. A synthetic 5.5 s stone echo under every voice.

- The room: a low air tone and a faint high hush, louder by day.
- The scrub: a glass rim tone, two near sines that beat and a high partial. It swells with the sun's speed. Its pitch walks D, F sharp, A, D by the half hour, and it pans toward the side where the light lands.
- Each half hour crossed: a glass ping. Each whole hour: a far bell, late, as from the tower.
- A tap: a dry whisper of air and three to six fine glints.
