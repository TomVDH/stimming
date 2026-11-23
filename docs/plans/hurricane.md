# Hurricane eye (`hurricane`) plan

Status: active · Bean: `stimming-uqgp`

Idea 368, group C, size XXXL. Source: `docs/toy-ideas.md`, Tom's picks, 2026-11-23: "Fly a weather plane through the eyewall: rain and slamming turbulence, then the eye opens, a sunlit stadium of cloud above a churning sea."
Tom approved this plan on 2026-11-23 with no change to the defaults. The MVP ships to the Lab.

## Context

Tom picked four parade pieces on 2026-11-23. This is the one about weather and flight.
Window seat (`window/`, signed off) is the nearest toy: an airliner cabin window, storm towers, rain shafts, a sea with whitecaps, drops on the glass.
Hurricane eye must not repeat it. So: a forward view from a cockpit, one storm with one structure (the eye), and one event (the punch from dark to light).
The toy's whole drama is a change of light: grey roar, then a sudden sunlit hush.

## 1. Reference (opened before the design)

| Image | Source | What it gave the look |
|---|---|---|
| Inside Epsilon, 2020 (Commons, public domain, US Air Force Reserve) | Cabin window, inside the eye | The stadium: the wall leans out as it climbs, in stacked cauliflower ledges; a disc of deep cobalt sky overhead; a lumpy low cloud floor fills the eye; the far wall glows, the near wall is grey blue |
| Inside Katrina's eye, 2005 (Commons, public domain, NOAA) | Cabin window, inside the eye | The far wall as a long horizontal cliff with a blinding white crest against navy sky; a dark shadow band where the wall meets the eye floor; the floor is low hub cloud with gaps |
| Melissa, 2025 (AP video still, PetaPixel) | Inside the eye, Cat 5 | A steep, tight bowl; the wall curves round the frame edge; fine cumuliform texture over the whole face |
| Irma, 2017 (Live Science, US Air Force) | Inside the eye at night | Later stage only: a moonlit bowl. Not in the MVP |
| Reports on the Michael 2018, Erin 2025, Milton 2024 and Lee 2023 penetrations | Cockpit and cabin video | The sequence: smooth flight in the outer bands, rough in the wall, heavy rain roar and static, lightning in the wall, then a sudden break into calm and light; loose items lift in the jolts |

Not found as open images: a clear view of the sea in the eye. The sea follows physics and Window seat's sea code: under the wall the wind tears foam into long white streaks along the wind; in the eye the wind is light but the swell is high and confused.

The aircraft stays generic: a high-wing four-engine turboprop, plain grey, no livery, no agency, no tail number, no name. The toy copy says "weather plane", never an agency or a squadron nickname.

## 2. The full toy (XXXL)

Camera: the left cockpit seat, eye height, looking forward through a framed windscreen. The side window shows the wall in a bank. Drag turns the head (yaw ±70°, pitch ±25°). A chase view is a later stage.

| # | Stage | What happens | The hand |
|---|---|---|---|
| 1 | Approach | Flight at 3 km through the outer rain bands: grey cloud walls, sunlit gaps, rain curtains, the sea in breaks | Drag looks; yoke steers between bands (later) |
| 2 | Eyewall punch | The light fails, rain sheets over the glass, wipers race, lightning in the wall, hard jolts, hail rattles | Drag looks; the flight runs on its own |
| 3 | The eye opens | The wall thins, the light grows, the plane breaks out; rain stops at once; the hush | Watch |
| 4 | The stadium turn | A slow banked turn round the eye; the wall swings across the windscreen and the side window; the low cloud swirl and the sea below | Drag looks; Bank slider or yoke sets the turn |
| 5 | Exit | Back into the far wall and out to the bands | Action: Exit |

Later layers: a timeline scrub over the whole track (the scene is a function of track time, so scrub is cheap), a dropsonde you release and follow down to the sea, time of day (dawn, noon, moonlit night as Irma), a chase view, yoke control.

## 3. The MVP cut: the punch into the eye

One hero moment, finished to high fidelity:

1. First frame: inside the eyewall's outer edge. Dark grey cloud races past, rain beats on the windscreen, the wipers sweep, the plane jolts.
2. The flight runs on its own at about 110 m/s. Over about 20 s the wall gets darker and rougher: two or three hard jolts, a lightning flash in the cloud ahead, its thunder.
3. The cloud ahead brightens to white, then breaks. Sun floods the cockpit. Rain stops in one second; the wipers park; the last drops run off the glass.
4. The stadium: the far wall stands 8 to 12 km tall across the windscreen, a cobalt disc overhead, the near wall towering at the side window, the low cloud swirl and the white-streaked sea 3 km below.
5. The plane banks into a slow turn round the eye and holds it. The scene drifts, then sleeps after 60 s.
6. Action "Punch" (or Space) turns back to the wall: a fade through grey, and the run starts again.

| In the MVP | Waits (later stages) |
|---|---|
| The wall run and the break into the eye | The approach through the outer bands |
| A slow scripted bank round the eye | Yoke steering, the exit, a full lap |
| Drag to turn the head in the cockpit | Chase view |
| Category slider: eye size, wall slope and height, rain, jolts, sea state | Time of day; night eye |
| Midday sun | Dropsonde; scrub timeline |
| Cockpit as a lit silhouette frame | A modelled cockpit with instruments |

## Defaults (open questions answered here; Tom may change them)

| Question | Default | Why |
|---|---|---|
| Camera | Cockpit, left seat, forward | The punch is a forward event. Window seat owns the side window. |
| The hand | The flight runs on its own; drag turns the head; Punch replays | An office toy: one watch, one press. Steering waits for a later stage. |
| Slider | Category, 1 to 5 | One knob that changes the whole structure, true to physics: a stronger storm has a smaller eye, a steeper and taller wall, harder jolts, a wilder sea. |
| Time | Midday, sun at 65° | The stadium photos are all high sun: a blinding far wall, a blue disc, a shadow band at the foot of the sunward wall. |
| Scale | Metres. Flight at 3,050 m; eye radius 12 to 30 km by category; wall tops 12 to 16 km; wall slope 40° to 60° from flat | True numbers, so the stadium reads huge. |

## 4. Tech

**Renderer:** raw WebGL2 on `shared/gl.js` (Environment stack type), as Tornado alley and Window seat. No three.js: the scene is one sky, one cloud field, one sea and a cockpit frame, all per pixel.

**Passes** (each its own small program, linked in parallel with `linked()`):

| Pass | Size | Holds |
|---|---|---|
| `march` | 0.5 (0.375 on the low rung) | The cloud march: wall, low swirl, near fog in the wall. One output: light and cover. Blue-noise jitter. |
| `blur` | 0.5 | Five taps each way hide the march dither. A temporal resolve waits: the camera never stops, so history needs reprojection. |
| `world` | full | Sky (`shared/sky.js`, `shared/clouds.js` phase), the sea, the cloud composite, rain streaks (`shared/precip.js`), lightning flash. |
| `drops` | 0.5 | Drops on the windscreen and the wiper sweep (`shared/glassrain.js`). |
| `cockpit` | full | The frame, the glareshield, the side window, wet glass (`shared/wetglass.js`). |
| bloom, grade, output | chain | `bloomChain` (`shared/glow.js`), `shared/grade.js`, `shared/output.js` (ACES). |

**The stadium:** a density field in cylinder coordinates round the eye centre. The wall's inner edge leans out with height (`r_in = r0 + h·cot(slope)`), stepped in ledges, eroded by a baked 3D noise (copy of `window/noise3d.js`). The low swirl is a thin layer at 0.6 to 1.8 km with gaps, turned by the tangential wind. The march is in two ranges: a short, dense range near the camera (inside the wall), then long strides to the far wall.

**Cloud shading follows Fire's smoke** (rule: smoke follows Fire's shader): the K3 lighting block as `cloudbottle/scene.js` carries it. A shadow march toward the sun (three to six taps), Beer, the multiple-scatter lobe (`exp(-τ·0.25)·0.5`), powder (`1 − exp(−2τ)`), an ambient floor, and the two-lobe phase from `shared/clouds.js`. Sky light from above darkens with depth into the wall.

**The sea:** after Window seat's sea (`window/shader.js`: `seaWaves`, `monahan`, `caps`), written small in the world pass of `hurricane/scene.js`. Long foam streaks lie along the local wind under the wall; the swell in the eye is high and confused. The wall's shadow falls on the sea and the swirl.

**Rain on the glass:** `shared/glassrain.js` beads and runs, pushed up and aside by 110 m/s air; a wiper arm per side sweeps a cleared arc that fills again. In the eye the drops stop arriving and the last ones run off.

**Turbulence and shake:** a seeded random process from track time (Window seat's `turb` shape): small chop all through the wall, and three to five hard jolts (heave, pitch, roll). The camera moves in the scene, not by CSS, so the cockpit and the world move together.

**D3D11:** one heavy function per program with one call site, loops the compiler cannot unroll (Tornado's `ROLL0`), one output per program, the march split from the composite, shapes as data tables. Measure each link with `tools/fxc/`. Clamp every `pow` base. Target: each link under 5 s.

**No `shared/` changes in the MVP.** If one turns out to be needed, it gets its own bean and Tom's yes first.

## 5. Sound, bar and rules

**Sound** (Tone.js through `audioKit()`, muted by default):

| Sound | When |
|---|---|
| Engines: four turboprops, a drone with blade-pass harmonics | Always while awake |
| Rain roar on the skin, gusty, with hail rattles on the jolts | In the wall; it cuts out in one second at the break |
| Thunder | After each flash, late by distance |
| The hush: engines alone, a soft wind | In the eye |

**Bar v3:**

| Control | Content |
|---|---|
| Action | Punch (key Space): back into the wall, run again |
| Slider | Category 1 to 5 |
| Settings | Quality (shared); Reset; Dev rows for look knobs with `?dev` |
| How | Drag: look round the cockpit · Space: punch |

**Frame loop:** lively in the wall and the break; drifting at 30 fps in the eye; asleep 60 s after the last input, eased to a stop over 2 s; stopped at once when hidden.

**Reduced motion:** no shake at all. The jolts show only as a flicker of the cockpit light and in the sound. The bank stays still; the head turn still answers the hand.

**Performance ladder** (`shared/detail.js`, three rungs): pixel ratio, then march size and steps, then the drops pass at lower size. Budget: 30 fps or better at 1280 × 800 on the dev PC.

## 6. Cost, risks, bean

**Size:** XXXL in full. MVP: about three sessions (blockout and the stadium, the wall run and glass, finish and QA).

| Risk | Answer |
|---|---|
| Too close to Window seat | Forward cockpit, one storm structure, the eye. No cabin, no wing. |
| The march inside a dense wall is costly and noisy | The two-range march, temporal resolve, a half-size pass, the ladder. |
| D3D11 link times | Small programs, measured with `tools/fxc/` from the first blockout. |
| The break looks like a fade, not a punch | The wall's inner face is a real surface in the density field; the plane crosses it at a true speed, with light first, then the open view. |
| Brand drift on the aircraft | Generic shape, no marks; checked at the icon round. |

**Bean** `stimming-uqgp`: `Toy: Hurricane eye`, type `feature`, parent `stimming-oh7b`, idea 368, with this checklist:

- [x] Plan in `docs/plans/hurricane.md`
- [x] Blockout: stadium, sea, cockpit frame; screenshot (`docs/qa/hurricane/01-blockout.jpg`)
- [x] The wall run: march inside the wall, rain, drops and wipers, jolts, lightning
- [x] The break and the eye: light, hush, bank
- [x] Sound; Bar v3; frame loop; reduced motion; ladder
- [x] Icon round `hurricane-1` (`icons/spike-hurricane-1.html`, A and D emblems, `GALLERY` row), intro emblem `shared/emblems/hurricane.svg`
- [x] `toys.json` entry (`sub: "Stimming Lab"`, `number: null`, draft `nl` "Orkaanoog", `ipa` "ɔrˈkaːnˌoːx"), Lab `<li>` with its GSAP hook
- [x] QA Q1 to Q10; `docs/toys/hurricane.md`

## Files (new, all in `hurricane/` unless named)

| File | Holds |
|---|---|
| `hurricane/index.html` | Page skeleton, importmap word for word from `docs/standards/code.md` |
| `hurricane/main.js` | Bar, track clock, head turn, frame loop, life cycle |
| `hurricane/track.js` | Storm shape by category; the flight as a function of time: position, attitude, jolts, the break; the wall face on the CPU |
| `hurricane/scene.js` | The six passes: march, blur, world (sky and sea), drops and wipers, cockpit, grade |
| `hurricane/noise.js` | The baked cloud noise, a copy of Window seat's baker |
| `hurricane/sound.js` | Web Audio |
| `docs/plans/hurricane.md`, `docs/toys/hurricane.md` | Plan, toy doc |
| `icons/spike-hurricane-1.html`, `icons/spike/emblems/hurricane-a.svg`, `-d.svg`, `shared/emblems/hurricane.svg` | Icon round, intro emblem |
| `toys.json`, `index.html`, `icons/sheet.html` | Own hunks only; `index.html` through a private index |

## Verification

1. `npm run dev` on port 8000 (check the port first); open `http://localhost:8000/hurricane/` in the browser pane.
2. Blockout screenshot within the first session; one each for the wall, the break and the eye at 1280 × 800 and 375 px.
3. Console clean; no NaN; each program's link time measured with `tools/fxc/`; fps read from `detail.js`.
4. Reduced motion, hidden tab, sleep after 60 s, mute by default checked by hand in the pane.
5. QA Q1 to Q10 from `docs/plans/README.md`; commit through `tools/commit.sh` with own paths and hunks; `git log origin/main..main` before each push.

## Questions for Tom (no answer on 2026-11-23; the defaults stand)

1. Camera: cockpit forward (default), or cabin side window as in the Epsilon photo?
2. MVP hero: the punch from the wall into the eye (default), or start in the eye and only turn round the stadium?
3. Slider: Category 1 to 5 (default), or Bank (how tight the turn round the eye)?
4. Time of day: midday (default), or late afternoon with a golden wall and long shadows?

## Build notes (2026-11-23)

- The MVP is built: `hurricane/`, toy doc `docs/toys/hurricane.md`, QA captures in `docs/qa/hurricane/`.
- The run aims at the deepest bay in the wall face; `faceExit()` finds the exact exit on the CPU, so the break lands at 21.8 s.
- The march skips air by a safe distance to the nearest cloud and finishes on the smooth wall when its steps run out.
