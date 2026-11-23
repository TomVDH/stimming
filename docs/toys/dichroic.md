# Dichroic glass (`dichroic/`)

| | |
|---|---|
| Dutch | Dichroïsch glas /diˈxroːis ɣlɑs/ (draft) |
| Motto | None |
| Shelf | Lab, tag "Stimming Lab" |
| Stage | None |
| Series | None |
| Accent | `oklch(0.8 0.15 80)` |
| Sound | Yes |
| Legacy build | No |
| Signed off | No |

## Idea

Idea 39, group F: move the light; the glass shifts colour as you move it. Bean `stimming-pj5e`. Plan: [dichroic.md](../plans/dichroic.md), an MVP.

## Rules

- One folded screen of three coated panes, one white table, one lamp. No props.
- All colour comes from the coating: reflected one way, passed the other, both shifting with the angle.
- The light on the table is traced from the lamp through and off the panes, never painted.
- Kept apart from Glass (`glass/`): nothing breaks here; the light is the toy.

## Direction

- 3D. A fixed eye in front, 36 degrees down. The table fills the frame and falls off into a dark room outside the lamp's beam.
- The screen: three upright leaves fused at their seams in a zigzag, 12, 15 and 10 cm tall. Three faces at three angles: at any lamp place the leaves read different colours side by side.
- The lamp: a small frosted bulb in a 34-degree beam, aimed at the glass. It keeps the glass equally lit at any distance. The eye never sees the bulb, only its glints in the glass.

## Controls

Bar v3, from the `bar` spec in `initPage()`.

| Slot | Holds |
|---|---|
| Choice | Coating: Gold, Magenta, Cyan (keys 1 to 3, stored). Named by the reflected colour. |
| Action | Orbit (Space): the lamp circles the glass once, 10 s |
| Slider | Height: the lamp from 17 to 42 cm over the table (stored) |
| Settings | Quality (shared) |

| Input | Does |
|---|---|
| Press, drag | The lamp hangs over the table point under the finger, 1.15 times further out; a soft spring carries it |
| Tap | The lamp goes to that spot |
| Arrows | Move the lamp 4 cm a step |
| Space | Orbit |

## The model

- One unit is 10 cm; the table is z = 0. Geometry and coatings: `glass.js`.
- Light in 12 spectral samples, 412.5 to 687.5 nm, packed in a `mat3x4`. RGB weights come from the CIE 1931 fit of Wyman, Sloan and Shirley, white-balanced to a flat spectrum.
- The coating: a reflected band with soft edges, peak 0.88 to 0.9. Its edges move blue with the angle, by sqrt(1 - sin^2 / n^2), n = 1.75. The edges soften at a slant. Bare-glass Fresnel takes over at a graze. Transmission is 1 - R, less 3 %.
- Each name holds at the usual 40 to 55 degrees: Gold reflects from 570 to 692 nm at normal incidence, Magenta all but 512 to 592 nm, Cyan 482 to 574 nm.
- **MAP** (only when the lamp or coating moves): a 1280 square light map over 1.8 x 1.8 m of table, three RGBA16F targets. Per point: the lamp through every pane on the way, plus each pane's mirror image of the lamp, filtered by the other panes on both legs. Penumbras come from the bulb's size. A thin dark line marks each pane's edge in its shadow.
- Seams: the leaves overlap 12 mm at a fused seam, and a seam border blurs no wider than that, so no light slips through. Reflections fade softly at seams.
- **SCENE**: one ray tree a pixel. A pane hit splits into a reflected and a passed ray, two levels deep: seven rays at most, one loop, one shading site. Leaves read the map on the table, or the dark room and the bulb. Polished edges are green and dim, with a rounded glint.
- **FINAL**: bloom from `shared/glow.js`, ACES tone, vignette, dither.

## Sound

Web Audio, muted by default, through `audioKit`.

- A leaf rings when the lamp crosses its face: a struck glass bar, one note of a major triad per leaf, panned to the leaf. The root follows the coating.
- A rubbed-rim hum follows the lamp's speed. Its pitch follows the middle leaf's reflected colour: long waves low, short waves high.
- A coating change lifts and sets the glass down: a clink and a lower ring.

## Loop

- Lively while the lamp moves, the coating morphs or a finger is down. Then the hum fades and the loop sleeps. No ambient drift: a still life.
- Hidden tab: the loop and the clock stop at once.
- Reduced motion: the lamp follows with no overshoot, Orbit takes 16 s, the coating morphs in 0.3 s.
- Ladder: pixel ratio, then a 896 map and three bloom levels.

## QA (2026-11-23)

Captures: `docs/qa/dichroic/`, 01 blockout to 13 sheet row.

| Check | Result |
|---|---|
| Q1 | `node --check` clean on the five modules and the menu script |
| Q2, Q6 | Clean console through drag, tap, chips, Orbit, keys; also under reduced motion |
| Q3 | 1280 x 800, 375 x 812, 812 x 375, one per coating |
| Q4 | 0 rAF calls in 2 s after it settles |
| Q5 | 0 rAF calls in 2 s hidden, mid-drag |
| Q7 | One choice, one slider, one action; four How rows |
| Q8 | 1 to 3, arrows, Space each act |
| Q9 | The context runs after the gesture and is suspended at the end |
| Q10 | 7.5 ms median frame, 8.1 ms p90, through a circular drag (Edge headless, D3D11, RTX 3070). First frame 1.0 s. Tom checks on a real screen. |
