# Lava coast (`lavacoast/`)

| | |
|---|---|
| Dutch | Lavakust /ˈlaːvaːˌkʏst/ (draft) |
| Motto | None |
| Shelf | Lab, tag "Stimming Lab" |
| Stage | None |
| Series | None |
| Accent | `oklch(0.74 0.17 50)` |
| Sound | Yes |
| Legacy build | No |
| Signed off | No |

## Idea

Idea 99, group C: a volcanic island at night; tap the vent for a lava fountain whose flow meets the sea in towers of lit steam. Bean `stimming-ix8b`. Plan: [lavacoast.md](../plans/lavacoast.md), an MVP.

## Rules

- The camera does not move. The vent, the flow and the steam change the scene.
- One sim drives the lava: the land shader draws it, its sea cells make the steam, its hot area makes the crackle.
- No props: rock, lava, steam, sea and stars. No eruption column, no ash, no bombs: Volcano has those.
- Light first, sound after: the fountain is heard after its distance over 343 m/s, the shore after its own.

## Direction

- 3D island, sea and sky on a flat stage. The eye floats 35 m over the sea and looks in level; the horizon sits 36% up the frame. About 46 degrees across. A portrait stage narrows the lens and shows more sky.
- Night, no moon. The lava is the key light: it lights the slope round it (a blurred map of its glow), the steam from below and the sea.
- The coast is 500 m out, a low sea cliff under a shield slope. The flank vent is a spatter cone 1.3 km out and about 195 m up. A summit shield rises to the right; a lava tube spills a thin stream into the sea right of centre.

## Controls

Bar v3, from the `bar` spec in `initPage()`.

| Slot | Holds |
|---|---|
| Action | Erupt (Space): the fountain, about 7 s at full |
| Slider | Flow: the fountain's height and how much lava it sends |
| Settings | Quality (shared) |

| Input | Does |
|---|---|
| Tap anywhere | The vent erupts |
| Hold or drag | The fountain lasts while held, 30 s at most |
| Space | Erupt |

## The model

- The land: one height function (`land.js`) for the sim, the two meshes and the sea's depth. Gullies, ridges and six old tumuli on the slope part the lava into braids.
- The lava: a 160 x 160 grid over the slope, 6.5 m cells, in JS at 90 steps a second. Each cell holds thickness and heat. Lava flows to its eight neighbours down the surface slope; hot lava is runny, cool lava has a yield slope and stops. Thin lava cools fast, thick lava slowly. Time runs about 20 times fast: the flow reaches the sea in about 8 s.
- The sea: lava in a sea cell quenches and breaks up; the heat it loses there is steam. Columns of steam along the shore group into at most four towers.
- The towers: each keeps 64 s of its steam in a history texture. A parcel at height y left the shore (y / 62 m)² seconds ago, so a tower rises, swells, leans downwind and lets go of its base when the lava stops.
- The fountain: 4,200 clots, each launched with the strength of its launch moment; the strength pulses with gas. Waves on hot rock throw spatter bursts with a flash.

## Passes

Six small programs, so D3D11 links each fast.

1. Sky: stars, a faint galaxy band, a warm airglow over the sea's rim.
2. Land: the slope mesh with the lava (320 x 320) and the island mesh round it. Crust plates with cracks that narrow and dim as they cool, hot threads along the flow, an open stream down steep faces, the glow of the lava field on the ground.
3. Clots and spatter: screen-space streaks, added light.
4. Steam, at half size: a march with Fire's smoke shading (K3 lighting), keyed by the brightest glow near each point, plus the lava field's glow and the sky. Two blur passes hide the dither.
5. Sea: waves, a mirror image of the shore, the glow of the entries in the water, surf, then the steam over all.
6. Final: bloom (`shared/glow.js`), vignette, night grade, ACES fit.

## Sound

Web Audio, muted by default. The surf swells and falls. The fountain roars and thumps with its gas pulses, from the vent, about 3.8 s late. The cooling crust clinks. The sea entry hisses with the steam about 1.5 s late; each wave burst on the hot rock pops with a crack, a thump and a gush.

## Frame loop

Lively while the vent runs or hot lava moves; drifting at 30 fps for the surf, the tube's trickle and the towers; asleep 60 s after the last input, over 2 s. Hidden stops the loop, the clocks and any sound in flight. Reduced motion: no drift and no bursts; a tap still runs a softer fountain and its flow, then the loop stops when the lava has cooled. Slow frames step down: the pixel ratio, then the steam's size and the bloom, then fewer steam steps.

## Known

- Capture with Edge headless on D3D11 (RTX 3070).
- The steam shows faint streaks where the wind shears it.
- The lava that cools on the slope stays: each eruption leaves new rock.
