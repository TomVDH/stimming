# Hurricane eye (`hurricane/`)

| | |
|---|---|
| Dutch | Orkaanoog /ɔrˈkaːnˌoːx/ (draft) |
| Motto | None |
| Shelf | Lab, tag "Stimming Lab" |
| Stage | None |
| Series | None |
| Accent | `oklch(0.8 0.08 235)` |
| Sound | Yes |
| Legacy build | No |
| Signed off | No |

## Idea

Idea 368, group C, size XXXL: fly a weather plane through the eyewall, then the eye opens, a sunlit stadium of cloud above a churning sea. Bean `stimming-uqgp`. Plan: [hurricane.md](../plans/hurricane.md). This build is the MVP: the punch into the eye.

## Rules

- The camera sits in the left cockpit seat and looks ahead. Window seat owns the cabin window; this toy has no cabin and no wing.
- The flight runs on its own. The hand turns the head and replays the run.
- The plane is generic: a high-wing four-engine turboprop, plain grey, no marks. The copy says "weather plane", never an agency or a squadron.
- Light first: the wall brightens before the break, then the eye opens. The eye adapts slowly, so the break dazzles.

## Direction

- The run starts 2.4 km inside the wall at 3.05 km up and flies in at 110 m/s. The break comes at 21.8 s of track time.
- The run's bearing is the deepest bay in the wall face, so the wall stands on both sides until the break. `faceExit()` in `track.js` finds the exact exit on the CPU from the same noise as the shader.
- After the break the plane flies in 2 km, then turns left over 7 km to run round the eye. The bank follows the turn's curvature: up to about 30 degrees, then a few degrees on the circle.
- Midday: the sun is 65 degrees up, left of the run and a little behind.

## Controls

Bar v3, from the `bar` spec in `initPage()`.

| Slot | Holds |
|---|---|
| Action | Punch (Space): fade through grey, back into the wall, run again |
| Slider | Category, 1 to 5: eye size, wall slope and height, rain, jolts, wind on the sea |
| Settings | Quality (shared); Reset |

| Input | Does |
|---|---|
| Drag | Turns the head: 70 degrees each way, 25 down, 35 up |
| Arrow keys | Turn the head |
| Space | Punch |

## The model

- Units: km and seconds. The eye's axis is x = z = 0; the sea is y = 0.
- `stormShape(cat)`: eye radius 26 to 13 km at flight level, wall slope 40 to 60 degrees, wall top 12 to 16 km, surface wind 36 to 75 m/s.
- The wall face: a cone that leans out as it climbs, stepped in tiers that wander round the eye, with buttresses and bays. Lumps on lumps (inverted Worley at three sizes) make the cauliflower surface. `faceR()` and `lumps()` exist twice, in `scene.js` and in `track.js`: change both together.
- The cloud floor: heaps 0.7 to 2.9 km up, turned into a spiral by the wind, with gaps to the sea.
- `pose(tau)` gives position, heading and bank from track time; `chop(tau)` gives the chop and five hard jolts. Both are pure functions of track time, so a later scrub is cheap.
- Lightning: three flashes in the wall, each a double pulse that lights the cloud from a point ahead.

## Passes

Six small programs, so D3D11 links each fast (all six link in about 1 to 4 s on the dev PC).

1. March, at half size: the wall, the floor and the haze. It skips air by a safe distance to the nearest cloud; when steps run out, the ray finishes on the smooth wall. Light: Fire's smoke shading (K3 lighting), with the sun's path through the smooth wall in closed form, three taps for the near lumps, and sky light that fades with depth into the wall.
2. Blur: five taps each way hide the dither.
3. World: sky, sea (confused swell, wind streaks, whitecaps, the shade of the wall and the floor), the cloud over them, rain rushing past.
4. Drops, at half size: beads and runs on the panes (`shared/glassrain.js`); each front pane's wiper clears an arc that fills again.
5. Cockpit: the frame, the glareshield, the panel, the wipers, the glass over the world. The sun that comes in through the glass lights the shield.
6. Final: bloom (`shared/glow.js`), the lightning lift, the fade, ACES fit, vignette, dither.

## Sound

Web Audio, muted by default. A bed while awake: four turboprops that beat slowly, a turbine whine, the slipstream. Rain roars on the skin in the wall and stops at the break; the hush in the eye is the engines alone. Thunder comes late by distance; each jolt thumps and rattles.

## Frame loop

Lively through the wall, the break and the roll-in; drifting at 30 fps on the circle; asleep 60 s after the last input, over 2 s. Hidden stops the loop, the clock and the sound. Reduced motion: no shake, softer flashes, half the rain; the plane holds still 9 s after the break and the loop stops. Slow frames step down: the pixel ratio, then the march size and steps, then the bloom.

## Dev links

`?t=<s>` starts at a track time; `?still` holds it; `?yaw=` and `?pitch=` set the head in degrees; `?qa` exposes `__hurricane`.

## Known

- Capture with Edge headless on D3D11 (RTX 3070). QA captures: `docs/qa/hurricane/`.
- The far wall's shaded parts still show a little march grain.
- The cockpit is a lit silhouette: no instruments, no yoke.
