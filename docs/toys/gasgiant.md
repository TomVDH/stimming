# Gas giant dive (`gasgiant/`)

| | |
|---|---|
| Dutch | Duik in een gasreus /dœyk ɪn ən ˈɣɑsˌrøːs/ (draft) |
| Motto | None |
| Shelf | Lab, tag "Stimming Lab" |
| Stage | None |
| Series | None |
| Accent | `oklch(0.74 0.12 185)` |
| Sound | Yes |
| Legacy build | No |
| Signed off | No |

## Idea

Idea 367, group C: fall from orbit past the rings into the cloud bands. Bean `stimming-vxno`. Plan: [gasgiant.md](../plans/gasgiant.md). Tom sized the full toy XXXL; this is the MVP cut, "the plunge": from 260 km over the cloud tops to crush depth, 640 km down at about 1,000 bar.

## Rules

- One descent column. The capsule hangs where the hand lets go; the Depth slider takes it back up.
- A held dive takes about 3 min 20 s to crush depth: fast in the sky, slow in the decks, a glide through the voids.
- Units are km and seconds; altitude counts from the 1 bar level. Thunder runs at 1.2 km/s, the speed of sound in hydrogen.
- No more than three flash starts a second, always. Lightning starts in the water, indigo, salt and last decks and the lightning nest; none under the last deck.
- The loop runs at full rate while the hand dives, the capsule moves or a flash runs. The bands flow and the storm turns at 30 fps until the toy sleeps.

## Direction

- Seen from a capsule window (Tom, 2026-11-23), after Window seat: an angled view across a curved wall, a machined bezel, a tapered liner, two panes. The window lights the cabin, with one bounce of its light off the liner and wall; a dim lamp behind the eye shows the metal and paint.
- Entry: between 200 and 110 km, while the capsule falls fast, plasma streams past the pane in Fire's flame colours. It lights the cabin and melts the frost.
- A fictional giant in green, teal and purple (Tom, 2026-11-23): mint zones, jade and teal belts, a purple storm with a magenta heart and teal filaments.
- Bright rings arch over the northern sky, seen from their unlit side. Their shadow lies on the deck.
- A low sun at the side, 10 degrees up (Tom, 2026-11-23): the heads on the deck throw long shadows.
- Everything outside is raymarched. The storm's billows swirl on angle and log radius, as Tornado alley's storm deck does.
- Near the eye the white deck shows relief at Juno's scale: popcorn heads and folded ridges along the bands, with shaded valleys (Tom, 2026-11-23).
- Three decks with a void under each of the upper two (Tom, 2026-11-23). Hourglass towers join each floor to its ceiling, far off in the haze.
- A deep, majestic, abyssal dive with much variance in the layers (Tom, 2026-11-23). Sixteen layers, top down (diagram: [gasgiant-layers.svg](../plans/gasgiant-layers.svg)):

| km | Layer | Kind |
|---|---|---|
| 40 to 22 | Haze lid | Thin teal sheets over the tops |
| 22 to 0 | Ammonia | White deck, popcorn heads and ridges |
| 0 to -24 | Upper void | Storm ceiling, god rays, towers, a few twisters |
| -24 to -38 | Brown | Deck |
| -38 to -64 | Mushball fall | Void: slush hail falls in streaks |
| -64 to -92 | Water | Deck, lightning |
| -92 to -140 | Shelves | Violet sheets 16 km apart, some whole, some lace |
| -140 to -158 | Veil | Purple gauze |
| -158 to -230 | Nave | A forest of columns 72 km tall |
| -230 to -262 | Indigo | Heaped deck, lightning |
| -262 to -360 | Gyre | Void: colossal towers, a vast eyewall 440 km off, rays down its eye |
| -360 to -385 | Salt | Pale jade deck in long wave rows, lightning |
| -385 to -425 | Lightning nest | Void: floor-to-ceiling bolts, three flash starts a second |
| -425 to -470 | Stairs | Laminae 9 km apart, teal and violet by turns |
| -470 to -500 | Last | Dark magenta deck, tall heads, rare lightning |
| -500 to -640 | Dark | Clear gas; the light fails; the hull fails at -640 |

- The voids are expansive stretches, as in Tornado alley (Tom, 2026-11-23): in a void the eye sees to the horizon, 1,600 km, where floor and ceiling meet. Towers gather in clusters and lines with open plains between; some join floor and ceiling, some rise as plumes, some hang. Rain curtains hang from the ceilings; a rare twister drops at a curtain's edge (Tom, 2026-11-23).
- Light gets into the clouds (Tom, 2026-11-23): under the deck tops it comes down through the ceiling, slanted to the sun's side; thin parts glow, cores go dark.
- Each void's ceiling is a storm base after Tornado alley's (Tom, 2026-11-23): folded lumps on a warped field, broad rolls, scud; the lit floor lights the crests, the folds go black.
- God rays and scale (Tom, 2026-11-23): ragged breaks 20 to 40 km across cut through each void's ceiling and the deck above. Light falls through them in slanted shafts that glow in the gas, brightest toward the light, and lands in soft pools on the floors and towers; the rest lies in shade. From above, a break opens onto the lit void below.
- Each layer tints the light. The light fades slowly through the abyss and fails under the last deck. The eye opens up to 8 times as the light fails; flashes dim to match.
- The outer pane carries the weather: frost high up, drops that bead and race up in the decks, veils of hue and brightness in the air, heat shimmer deep down.
- Inside a deck, wisps tear past the glass in three layers and flashes come three times as often.

## Controls

Bar v3, from the `bar` spec in `initPage()`.

| Slot | Holds |
|---|---|
| Actions | Dive (Space, hold) |
| Slider | Depth: drag up to rise, down to sink; it follows the capsule |
| Settings | Quality (shared), Reset (back to the cloud tops) |

| Input | Does |
|---|---|
| Hold on the stage | Dives; the fall gains speed, the frame shakes |
| Release | The fall eases to a hang over about 3 s |
| Drag | Looks round: 25 degrees each way, 15 up and down; the head moves a little |
| Click | A short sink |
| Space (hold) | The same as a hold |

## Sound

Web Audio on the shared kit, muted by default. Wind through a low-pass that falls with pressure, buffets in the dive, a low hum that climbs with depth. Thunder from flashes within 45 km, late by distance at 1.2 km/s, scheduled on the audio clock. Mute and a hidden tab stop every pending sound; the context sleeps after the last one.

## Files

| File | Holds |
|---|---|
| `index.html` | Page skeleton |
| `main.js` | Bar, capsule and eye, gestures, frame loop, ladder |
| `world.js` | Planet, decks, light table, ring profile, palette, shared GLSL |
| `map.js` | Pass 1: bands, the storm, its wake |
| `clouds.js` | Pass 3: the cloud march, voids and towers (noise kit from Volcano) |
| `sky.js` | Space, sun, rings, limb haze |
| `post.js` | Pass 4: the composite. The final grade |
| `cabin.js` | The capsule: wall, bezel, liner, panes and the glass weather |
| `bolts.js` | Lightning timing |
| `sound.js` | Web Audio |

Dev: `?dev` shows the Dev sheet (Tom, 2026-11-23): Go to any layer; Pitch and Yaw past the drag's limits; Sun azimuth and elevation, Exposure, Eye gain cap, Light into cloud, Ambient from above, Floor bounce, Haze reach, Flash strength, God rays; Reset. The values persist.

Links: `?alt=-14` starts at that height; `?out` shows the outside with no cabin; `?qa` exposes the state as `__gg`, times each shader link, and `__gg.bench(n)` times n frames on the GPU.

## QA

Stills: `docs/qa/gasgiant/`.
