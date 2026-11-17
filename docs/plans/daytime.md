# Time of day: the shared module and its reach

Status: active · Bean: `stimming-5dol`

Tom, 2026-11-16 (decision 14 in [code-health.md](../code-health.md)): "time of day should be a module too, seeing how often it returns; lots of toys use it."
Bean `stimming-5dol`, under epic `stimming-3s8z`.

## The module: `shared/daytime.js`

### Design: a new file beside `sky.js`

`sky.js` stays as it is. `skyAt(hour)` stays the sky palette: GLSL colours for `skSky`, `skDusk` and `skClouds`.
`daytime.js` holds the clock: hour presets, the ease, the real clock, and the values a toy lights its scene with.

Why a new file:

1. Every current `skyAt` caller keeps its frame by construction. `sky.js` does not change.
2. Most time-of-day toys draw no `sky.js` sky. Window, Train ride, Railgun and Walker each have their own sky. They need the hour, the light and the lamps, not the GLSL.
3. `dayAt()` calls `skyAt()` for the sun, `day`, `stars` and the zenith. One source: the two never drift apart. The test proves this bit for bit.

The module imports only `sky.js`, never three.js. Every value is a plain number or array.

### API

```js
import { HOURS, dayAt, dayClock, localHour, photocell } from '../shared/daytime.js';

const d = dayAt(HOURS.dusk);
// d.sun, d.moon         unit directions, y up (raw WebGL2: uniform3fv; three.js: fromArray)
// d.elevation           the sun's height, radians
// d.sunUp, d.moonUp     0 below the horizon, 1 above; the change spans 3 degrees
// d.day, d.stars        skyAt's own values
// d.lamps               1 - day
// d.light, d.level      the key light: linear colour (brightest channel 1) and its level
// d.ambient             the sky's fill: the zenith colour
// d.sky                 the whole skyAt palette

const clock = dayClock({ hour: 'night', tau: 0.6, wrap: true });
clock.to('dawn');            // a preset name or an hour
if (reduced()) clock.snap(); // no ease with reduced motion
if (clock.step(dt)) wake();  // true while the hour moves
clock.follow(true);          // the device's local clock drives the hour
clock.at();                  // dayAt(clock.hour)

photocell(1 - d.day, 0.28);  // one lamp: 0 off, 1 on, over 0.025 past its mark
```

Canvas 2D toys convert the linear colours with `linFit()` and `css()` from `stim.js`.

### Presets

Each hour comes from a toy's own Bar choice.

| Preset | Hour | From |
|---|---|---|
| `dawn` | 6.2 | Fog horn |
| `day` | 12.5 | Carwash's noon |
| `afternoon` | 16 | Tornado |
| `golden` | 18.3 | Tornado |
| `dusk` | 19.3 | Fog horn (Tornado 19.4, Lanterns 19.8) |
| `blue` | 20.6 | Lanterns |
| `night` | 23 | Fog horn |

### Where each value comes from

| Value | Source | Proved by |
|---|---|---|
| `sun`, `day`, `stars`, `ambient`, `sky` | `skyAt()` | The test: bit for bit, 584 hours from -30 to 50 |
| `HOURS` | Fog horn, Tornado, Lanterns, Carwash | Fog horn (dawn, dusk, night) |
| `lamps` | Train ride: `lampK * (1 - day)` | Fog horn's fog glow |
| `moon` | `skyAt(hour + 12).sun`, a full moon opposite the sun | The test |
| `light`, `level` | Tornado's sun colour ramp, driven by `day`; Railgun's moon colour under day 0.3 | Not yet |
| `photocell` | Canal: `smoothstep(mark, mark + 0.025, dusk)` | Not yet |
| `dayClock` ease | Lanterns: `h += (t - h) * (1 - exp(-dt / 0.6))` | The test: bit for bit over 300 frames. Lanterns proves it in a page |
| `follow`, `localHour` | No toy lights by the real clock today. Train ride and Frietkot use it for clock hands only | Not yet |

The key light follows `day`, not the sun's height: `sky.js` sets the sun at 18:00, but its palette keeps last light until 18:30 (see Drift).

## Reference port: Fog horn

Fog horn (main shelf, v1.5, the Environment reference toy). Its three Bar hours are the module's `dawn`, `dusk` and `night`, so it passes no hours of its own.

| Before | After |
|---|---|
| `import { skyAt } from '../shared/sky.js'` | `import { HOURS, dayAt } from '../shared/daytime.js'` |
| `const HOURS = { dusk: 19.3, night: 23, dawn: 6.2 }` | `HOURS` from the module |
| `1 - skyAt(env.state.hour).day` (the fog glow) | `dayAt(env.state.hour).lamps` |

The runner (`shared/environment.js`) still calls `skyAt(S.hour)` for the sky. It does not change.

### Proof

Headless Chromium with a seeded `Math.random`, and a clock that moves only when the harness feeds a frame (1/60 s each).
Before is the HEAD page through a route; after is the port. The Bar keys 1, 2 and 3 pick dusk, night and dawn, each with and without `?ship=4.5`. Frames 2, 30 and 120 after the pick, at 1280 x 800 and 375 x 812.

| GPU | Frames | Pixels that differ | Console |
|---|---|---|---|
| RTX 3070, ANGLE D3D11 | 36 | 0 in 36 | Clean |
| SwiftShader | 36 | 0 in 36 | Clean |

Two runs of the port match each other on both GPUs (0 pixels in 36), so the check is stable. Night against dusk differs on every pixel, so each preset is in the proof.
The values are the same numbers: `dayAt(h).lamps` is `1 - skyAt(h).day`, and `HOURS` holds Fog horn's three hours. `tests/daytime.test.mjs` covers the rest of the module (9 of 9 pass).

## The map

Every toy the search named, read on 2026-11-16. Stack: **GL** raw WebGL2, **3** three.js, **2D** Canvas 2D.

### Toys with an hour, a preset or a time slider

| Toy | Computes | Picks the hour | Stack | From `sky.js`, and drift |
|---|---|---|---|---|
| `foghorn` | Sky by the runner; fog glow by `1 - day` | Bar: dusk 19.3, night 23, dawn 6.2; snaps | GL (runner) | `skyAt` through the runner. Reference port |
| `lanterns` | Sky by the runner; exposure per preset (1.0, 1.25, 1.7); night voices at hour > 21.6 | Bar: dusk 19.8, blue 20.6, night 22.5; eases, tau 0.6 s; `?t=` | GL (runner) | `skyAt` through the runner. It re-aims the sun ahead and right (`gSun`), keeping its height |
| `tornado` | Own sun: elevation `clamp((19.6 - h) / 3.6) * 25` degrees, behind the eye; sun colour and ambient from it. Sky palette from `skyAt` | Settings: afternoon 16, golden 18.3, dusk 19.4 | GL (runner) | `skyAt` for zen, mid, band, anti only. Its sun sets near 19.6; `sky.js`'s sets at 18 |
| `carwash` | Night at `skyAt(1.5)`; the Strange "Noon" eases to `skyAt(12.5)` over 2.5 s | Fixed; a Strange event | GL | Reads zen, mid, band, anti, sun, stars, day. Lerps the sun as a vector, not on its arc. Adds its own stars and galaxy. Lamps stay on, not by `day` |
| `eastvan` (`postcard/`) | `skyAt(card.hour)` per card; the sun, light, exposure and lamps are set per card by hand | Fixed per card | 3 | The card's `sun` is its own vector, not `skyAt`'s. `eastvan/index.html` and `looks.html` have a local `skyAt(v)`: a dusk gradient, no hour |
| `window` | Eight named hours, each a sun or moon angle, exposure, stars, town lights, tint; a physical sky bake (`window/sky.js`); `dayK = smooth(-2, 8, rel)` | Bar stepper: dawn, morning, noon, afternoon, golden, dusk, blue, night | 3 | None. Angles per name, not hours |
| `trainride` | Five presets: `day`, a hand-set sun vector, tint, horizon, dusk band; lamps `lampK * (1 - day)`; fixed moon | Bar: morning, noon, afternoon, evening, night; crossfade `min(1, dt * 1.1)`; `?time=`; T key | 3 | None. Own sky by `mix(night, day, uDay)` |
| `railgun` | Its own sky: latitude 30, hour angle, the moon 6 h behind at -33.7 degrees, stars on the pole; everything keyed on sun elevation; exposure, grade | Bar slider 0 to 1, knots to elevation; Reset spins days | 3 (TS) | None. Its local `skyAt(H)` takes an hour angle in radians: same name, other function |
| `walker` | Five look keys from afternoon to night, and three other worlds; the sun's height in radii | Bar stepper of eight looks; a cycle mode | 2D | None. Its local `skyAt(t)` is a band gradient |
| `sunbeam` | Four rigs: elevation, azimuth, power, colour, glare, dust | Bar: morning, noon, golden, moon; eases 1.2 s | GL | None. The light runs into the room, so the axes differ |
| `washline` | The sun from a lerp between two vectors; light, hemi and exposure by the sun's height; the lighthouse beam | Bar slider "Sun" 0 to 1 | 3 | None. A physical sky (`places/atmo.js`) |
| `meteor` | Three keys: last light, blue hour, night, with zen, mid, band, anti, stars, sun depression, exposure | Bar slider "Dusk" 0 to 1 | 3 | Its own palettes, not `LAST`, `BLUE`, `NIGHT` |
| `canal` | Three keys from blue hour to night; stars, haze, lamp photocells per lamp | Bar slider "Dusk" 0 to 1 | 3 | Its stars and haze are `skStars` and `skHaze` (one ancestor); the palette is its own |
| `launch` | Solar depression 18 to 1 degrees; sky brightness, ambient, glow, exposure, stars, Earth's shadow | Bar slider "Dawn" 0 to 1 | 3 | None |
| `ascent` | The same depression mapping as Launch; light from `shared/air.js` | Bar slider "Dawn" 0 to 1 | 3 | None. Uses `shared/air.js` |
| `motorway` | The hour drives traffic only; lamp photocells exist but never run (`uRush` is 0) | A day run, a chart drag, arrow keys | 3 | None. The scene always renders night |

### Fixed at one moment

`rain` (dusk), `phaeton` (dusk), `flock` (dusk), `bread` (night), `lavaskin` (dusk), `tvtree` (night), `viaduct` (night), `frietkot` (night; the real clock turns the tower's hands only).
Each has one palette and no hour. None adopts until a toy gains a time choice.

### False hits

`shadyos` (a desktop clock), `oilslick` (light presets, no hour), `terrarium` (a grow lamp; the runner's sky is off), `pop` (a colour scheme named dusk), `eyes` and `cuttle` ("dusky" in a comment).

## Adoption order

One toy at a time, in its own chat, when Tom picks it. A port must give the same frame.

| Step | Toy | Takes | Same frame? |
|---|---|---|---|
| 1 | `foghorn` | `HOURS`, `dayAt().lamps` | Yes: reference port (done) |
| 2 | `lanterns` | `dayClock` for its ease, with its own hours (dusk 19.8) or the module's | Yes with its own hours: the ease is bit for bit. This proves `dayClock` in a page |
| 3 | `tornado` | `HOURS.afternoon`, `HOURS.golden`; dusk stays 19.4 or moves to 19.3 (Tom's call) | Yes with its own dusk. Its sun stays its own |
| 4 | `carwash` | `dayAt(1.5)`, `dayAt(HOURS.day)` for its two skies | Yes: the same `skyAt` values |
| 5 | `eastvan/postcard` | `dayAt(card.hour)` for the sky | Yes for the sky. The card suns stay by hand |
| 6 | `shared/environment.js` | `dayAt(S.hour)` in place of `skyAt`; `light` for the key lamp colour | Same sky. The key colour changes: a look check |

After these, each toy with its own model needs Tom's eye: `trainride`, `window`, `sunbeam`, `walker` (presets and the ease), then `meteor`, `canal`, `launch`, `ascent`, `washline` (a 0 to 1 slider, not an hour), then `railgun` (its own sky, last or never).

## Drift for Tom

1. **Sunset at 18:00.** `sky.js` turns the sun on a fixed 6 to 18 arc. Its palette keeps last light at 18.5 and blue hour at 19.5, so at the golden preset (18.3) the sun is 4.5 degrees under the horizon. Tornado's sun sets near 19.6. A later sunset changes every `skyAt` caller's frame.
2. **Three dusks.** Fog horn 19.3, Tornado 19.4, Lanterns 19.8. The module takes 19.3.
3. **Carwash's darker night.** Its comment says the night is "a little darker than the shared palette"; the code multiplies by 1.0.
4. **Three local `skyAt`s.** `eastvan`, `walker` and `railgun` each define a `skyAt` that is not the shared one. Each one renames it when it adopts.
5. **Motorway's lamps.** The photocell code never runs: `uRush` is 0 everywhere.
