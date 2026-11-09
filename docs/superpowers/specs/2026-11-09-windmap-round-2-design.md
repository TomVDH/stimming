# Wind map, round 2: design

Approved in chat by Tom on 2026-11-09. Bean: `stimming-5qae`. Base build: `docs/plans/windmap.md`, tasks 1 to 5, all pushed.

## Intent

Tom asked for icons and promotion first, richer interaction, a faint map grid behind the wind, and a large step up in ambition.

| Tom picked | Not picked |
|---|---|
| Main shelf, Beta tag | Main shelf with no tag; stay in the Lab |
| Weather chart layer, Globe, Light pass | Satellite weather (cloud shields, lightning, terminator) |
| Hold for high pressure, Flick a storm, Paint a jet stream | Two fingers and pinch |
| Chart grid | Faint single grid; projected graticule |

Out of scope: land, coastlines, numbers or labels on the stage, satellite clouds, multi-touch.

## Build order

Each part is one or more commits. Each part ends with stills at 1280 and 375 px and a clean console.

1. Icon round, then emblem and promotion.
2. Chart grid.
3. Light pass.
4. Gestures: high pressure, flick, jet stream.
5. Chart layer: fronts, tracks, H and L.
6. Globe.

## 1. Icons and promotion

**Icon round.**
- One gallery page, `icons/spike-19.html` (the next free number at build time), in the format of the recent rounds (`icons/spike-18.html`).
- Five directions, A to E. Angular brut tiles with a hard offset shadow, as the menu demands.
- Every direction reacts to the pointer through the menu hook `{ enter(p), move(p), leave() }`, as a tiny form of the toy:
  - the pointer circles and spins up a storm, or
  - streamlines bend toward the pointer, or
  - a press holds a high that clears the tile.
- A loop may run only as the idle state.
- Each direction ships an emblem draft in `icons/spike/emblems/windmap-<a..e>.svg`.
- Tom picks. The pick goes into `icons/picks.json`.

**Emblem.** A luminance map from the picked icon's own geometry, saved as `shared/emblems/windmap.svg`.

**Promotion.** The same pattern as bean `stimming-p4fl` (Sonar, Star trails):

| File | Change |
|---|---|
| `index.html` (menu) | The Wind map `<li>` moves from `section.lab` to the end of the main shelf. The name carries `<span class="beta"><i>(</i>Beta<i>)</i></span>`. The picked icon and its hook replace the placeholder. |
| `toys.json` | `number`: the next free number (33 today). `sub: null`. `emblem: "shared/emblems/windmap.svg"`. `tier: "beta"`. |
| `windmap/index.html` | The intro carries the emblem span, as Star trails does. No `data-done`: only Tom bestows it. |

Commit `index.html` and `toys.json` through `tools/commit.sh --hunks`, own hunks only.

## 2. Chart grid

- Major lines every 15 degrees; minor lines every 5 degrees at about a third of the major contrast.
- Short ticks on the four stage edges at each major line.
- The grid draws over the plate at low contrast, so bright trails do not hide it. In the composite: `c = mix(c, gridCol, line * a)`, applied after the plate, where `a` is about 0.10 for major lines and 0.04 for minor lines.
- Anti-aliased with `fwidth`, as now. Minor lines fade where they get closer than 6 px apart.
- No labels.

## 3. Light pass

The Look rule: one key light, haze, bloom with a threshold; light moves when something happens.

- **Bloom.** Bright pass at half size with a threshold, then a two-level blur, as in Star trails' `bloomPass`. The composite adds it. Only the fast jets and storm arms cross the threshold.
- **Eye glow.** A soft ring of light at each eye. Its radius is 1 to 2 rc. Its level follows |Γ| and breathes slowly.
- **Gust flash.** A short radial light that expands and fades over 0.3 s at the gust point.
- **Merge ring.** A bright ring that expands from the merge point over 0.6 s. It is in time with the whomp.
- The watchdog's effect-buffer rung now applies: rung 2 halves the bloom buffers, rung 3 halves the particles.

## 4. Gestures

The pointer machine keeps its 8 px and 260 ms thresholds.

| Gesture | Result |
|---|---|
| Press outside every storm core, then circle | Spin-up, as now |
| Press inside a storm core (r < 1.5 rc), then drag | The storm follows the pointer. On release it keeps the pointer's velocity and slows with τ 2 s. |
| Press, hold still 260 ms | A high: opposite spin, outflow, a calm centre. It grows while held, up to a cap. It follows the pointer if it moves. It fades over about 8 s after release. |
| Fast straight drag in open air | A jet ribbon on release. Lasts about 20 s, at most 4. |
| Tap | Gust, as now |

**High.** A vortex record with `kind: 'high'`.
- Circulation is opposite to a low, with a weaker core.
- A radial source term `+r̂ * Q / (2π r)` keeps the centre calm and pushes air out.
- The eye pass and the eye respawn do not apply to it.
- Lows steer away from it through their induced velocity, plus an extra repulsion inside 3 rc.
- A high never merges with a low.

**Flick.** While the storm is held, its velocity is the pointer velocity, smoothed over the last 100 ms. After release, its velocity is the dynamics plus a carried term that decays with τ 2 s.

**Jet.**
- The seed vortex records the pointer path.
- On release, the gesture becomes a jet when all three hold:
  1. path length is at least 0.25 world,
  2. straightness (chord over path length) is at least 0.85,
  3. |Γ| of the seed is below 0.03.
- The seed is then removed.
- The jet is a polyline of up to 8 points, resampled from the path.
- Its velocity field runs along the nearest segment, with a Gaussian across it (width 0.04). Peak speed is 0.35 world/s.
- Amplitude fades in over 0.5 s and out over 20 s. The points drift with the base flow, so the ribbon meanders.
- GPU: `uniform vec4 uJet[32]` (4 jets by 8 points; xy is the point, z the amplitude), plus a count. The CPU path gets the same sum.
- The stream function gets a matching term, so isobars bend around jets.

**Key strip.** `drag: circle to spin a storm`, `click: gust`, `hold: high`, `space: cyclone`. That is four entries, the limit. Flick and jet are found by play, and the vignette can name them later.

**Sound.** A high gets a soft low drone while it grows. A flick makes a short whoosh. A jet gets a rising band of noise as it is laid.

## 5. Chart layer

Settings: `Chart` Off/On, and `Marks` Off/On for the H and L letters. Both persist.

- **Rendering.** A 2D canvas over the WebGL canvas, the same size and DPR. Redrawn only on frames that step the sim. Chart ink: pale warm grey for lines; the front colours are muted chart red and blue. Line width 1.25 CSS px.
- **Fronts.**
  - Each low older than 3 s grows a warm front and a cold front.
  - Each front traces a streamline from 1.5 rc out along a fixed bearing relative to the storm: warm about 60 degrees ahead, cold about 200 degrees behind. Both rotate with the storm's age.
  - Length grows to about 6 rc.
  - Warm fronts carry half-moons on the leading side; cold fronts carry triangles.
  - After 25 s the cold front catches the warm one, and the shared part draws as an occluded front, alternating both symbols.
  - The fronts fade with the storm's amplitude.
- **Tracks.** Each storm drops a dot every 1.5 s, up to 40 dots. Dot radius follows |Γ|. Dots fade over 30 s, so the dotted path trails behind each storm. Highs leave no track.
- **H and L.** A letter at each low and each high, in the slab face, about 14 CSS px. It fades with amplitude. Default is Off, because letters are copy on the stage; Tom decides.
- Reduced motion: unchanged. The chart is static per frame.

## 6. Globe

Settings: `Projection` Chart/Globe, persisted. Default is Chart.

- **Domain.**
  - In Globe the sim runs on a fixed world, x in [0, 2) (360 degrees of longitude) and y in [0, 1] (180 degrees of latitude).
  - x wraps: particles, storms and jets that cross an edge reappear on the other side.
  - Distances take the wrapped minimum in x.
- **Plate.** Equirectangular, 2048 by 1024. Half size at watchdog rung 1.
- **Noise.** The base field samples 3D noise on a cylinder, so it wraps without a seam: `snoise(vec3(cos(2π x / 2) * R, sin(2π x / 2) * R, y * s + t * k))`, with R chosen to match today's feature size. Time moves the third axis. The CPU port mirrors it, and the CPU fallback works the same way.
- **Composite.**
  - Per pixel, a ray against a unit sphere under an orthographic camera.
  - A hit gives longitude and latitude, which sample the plate.
  - Background: slate.
  - The limb gets a thin atmosphere rim of light.
  - The chart grid becomes a true graticule on the sphere.
- **Turn.** The globe turns at 3 degrees per second while drifting, eased to a stop asleep. A drag that starts outside the disc turns it, with inertia. Reduced motion: no auto turn.
- **Pointer.** A hit on the disc maps to world (lon, lat), so every gesture works on the globe. Misses outside the disc only turn it.
- **Chart layer on the globe.** Fronts, tracks and letters project through the same mapping. The far side is hidden.
- **Switching.** Chart to Globe re-seeds particles in the global domain and keeps storms at their screen-relative places. Globe to Chart maps the visible hemisphere back.

## Checks

The QA table in `docs/plans/README.md` applies. Run it in the browser pane, in a background tab; no Playwright.

1. A clean console after every control and gesture, in both projections and with no float targets.
2. Frame loop: lively at full rate, drifting at 30 fps, asleep 60 s after input, hidden stops. Highs, jets and flicks count as lively while they move.
3. Gestures: each one in the table sorts correctly at the 8 px and 260 ms thresholds. A tap never makes a storm or a jet.
4. Globe: no seam at the wrap; a storm crossing the wrap keeps its spin and track.
5. Stills at 1280 and 375 px for each part. The icon round adds a gallery capture.
6. The menu script parses; the menu console stays clean while hovering the new icon.

## Risks

- The globe changes the world domain under every system. It comes last, behind a Projection setting, so Chart stays the shipped default if it slips.
- A press that waits 260 ms before it moves becomes a high, not a spin-up. 8 px of travel is small, so a circling start rarely waits that long. QA checks it.
- More gestures crowd the pointer machine. Each gesture keys on where the press starts (in a core, or open air) and how the path ends (circling, straight, still). Nothing is decided mid-drag except the hold timer.
- The chart canvas redraws at most once per sim frame and sleeps with the loop.
