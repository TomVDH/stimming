# Observatory: celestial selector and sky controls

Status: active · Bean: `stimming-iv1u` · Parent: `stimming-wqq9`

## Intent

Tom, 2026-11-23: "Depends on selection in the overview screen -- let's redo the celestial selector -- we should also have controls for diff skies (diff seasons, diff ability to see specific skies)".
The wide shot gets a selector that shows what a tap picks, then lets you choose which telescope answers.
The sky gets three controls: the season, the darkness, the place.

## Decided by Tom (2026-11-23, from two mocks on a live frame)

| Topic | Decision |
|---|---|
| Which telescope | You choose after you set the star. Two beats. |
| Hover | A soft glow and a thin ring on the star, a hairline to a dome, two quiet lines: name and magnitude, then the instrument |
| Choose | A tap locks the star (corner brackets). Two thin chips: `Great refractor · eyepiece`, `1 m reflector · camera`. Each chip has a hairline to its own dome. A tap on a chip, or key 1 or 2, sends that telescope. Esc or a tap on empty sky lets go. |
| Send | The chosen hairline becomes the green laser. The other hairline fades. The slew and the cuts follow the chosen dome. |
| Season | Four named nights as chips |
| Seeing | Darkness on a Bortle slider, 1 to 9. Default Bortle 2, alpine dark. |
| Place | Named sites as chips. The hill and the woods do not change. |

## Calls made by the designer

Tom can change any of these.

| Topic | Call | Reason |
|---|---|---|
| Hover snap | The glow snaps to the star a tap picks: the nearest star in a small radius, the brighter of two near ones | Today a tap picks the brightest star in 3°, unseen; a preview must show the true pick |
| Hover before night | No hover while the opening plays | The beam stays off until night today |
| Chip side | The chips sit on the side of the star with more room; they flip near an edge | The chips stay on screen at 375 px |
| Chip size | 44 px tap height on touch | Touch target |
| Re-pick while tracking | A new star shows the chips again. The same dome slews. The other dome takes over; the first one shuts. | One telescope answers at a time |
| The hover hairline | Before the lock it runs to the dome you used last; at first, to the big dome | A hover must show one line only |
| Nights | `Tonight` (the default: real time, as the plan says), `Winter` (Orion south), `Spring` (Leo), `Summer` (the Summer Triangle), `Autumn` (Pegasus). Each sets the sidereal time at about 22:00 that season; the sky then runs at real speed. | Tonight's real sky stays the default |
| Sites | `Home 51° N` (default), `Tropics 20° N`, `Equator 0°`, `Andes 24° S` | Tom's pick, the recommended set |
| The swing | A change of night or site eases the sky in about 3 s, drawn with the opening's star streaks, then the streak settles | Same device as the opening |
| Bortle model | Faintest star: 7.6 at 1, down 0.5 a class, 4.0 at 9 (the catalog ends at 6.5). The night glow brightens with the class. From 3 up, warm light domes rise over valley towns on the horizon, more and taller each class. | The common naked-eye table |
| Where the controls live | Bar v3 rows: `Night` and `Site` as chips, `Sky` as a slider. Settings persist under `stimming.observatory.<key>`. | Code standard |
| The machine | A pick sends one telescope. The small modern domes still follow the leader as today. | Keeps the complex alive |

## Depends on

- **The classic dome.** The building session built it: `complex.main` is the classic dome with the great refractor; `complex.big` is the Keck-style dome with the 1 m.
- **The switchable hero dome.** The obs-cuts session made the dome a parameter: `cuts.start(phase, view, target, dome)`, each dome's close model from `hero.of(dome)`. The selector passes the chosen dome (integration 357658dd, 2026-11-23).

## Non-goals

- Constellation lines, labels on stars other than the one under the pointer, a search box.
- The moon, the planets, deep-sky objects.
- A change to the hill, the woods or the buildings for a site.

## Left to the builder

- The glow's size and the hairline's opacity, inside the mock's look.
- The light domes' azimuths and colours.
- The ease curve of the swing.
