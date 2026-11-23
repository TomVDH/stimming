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

Idea 367, group C: fall from orbit past the rings into the cloud bands. Bean `stimming-vxno`. Plan: [gasgiant.md](../plans/gasgiant.md). Tom sized the full toy XXXL; this is the MVP cut, "the plunge": from 260 km over the cloud tops to the dark at 20 bar.

## Rules

- One descent column. The capsule hangs where the hand lets go; the Depth slider takes it back up.
- Units are km and seconds; altitude counts from the 1 bar level. Thunder runs at 1.2 km/s, the speed of sound in hydrogen.
- No more than three flash starts a second, always.
- The loop runs at full rate while the hand dives, the capsule moves or a flash runs. The bands flow and the storm turns at 30 fps until the toy sleeps.

## Direction

- Seen from a capsule window (Tom, 2026-11-23), after Window seat: an angled view across a curved wall, a machined bezel, a tapered liner, two panes. The window lights the cabin, with one bounce of its light off the liner and wall; a dim lamp behind the eye shows the metal and paint.
- Entry: between 200 and 110 km, while the capsule falls fast, plasma streams past the pane in Fire's flame colours. It lights the cabin and melts the frost.
- A fictional giant in green, teal and purple (Tom, 2026-11-23): mint zones, jade and teal belts, a purple storm with a magenta heart and teal filaments.
- Bright rings arch over the northern sky, seen from their unlit side. Their shadow lies on the deck.
- Everything outside is raymarched. The storm's billows swirl on angle and log radius, as Tornado alley's storm deck does.
- Near the eye the white deck shows relief at Juno's scale: popcorn heads and folded ridges along the bands, with shaded valleys (Tom, 2026-11-23).
- Three decks with a void under each of the upper two (Tom, 2026-11-23). Hourglass towers join each floor to its ceiling, far off in the haze.
- The light fails with depth: teal, then green, then violet, then black. The eye adapts only part of the way.
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

Links: `?alt=-14` starts at that height; `?out` shows the outside with no cabin; `?qa` exposes the state as `__gg` and times each shader link.

## QA

Stills: `docs/qa/gasgiant/`.
