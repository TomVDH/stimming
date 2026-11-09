# Beer pour (`beer`) implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. One session builds this toy, task by task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Pour a Belgian beer into a backlit glass. Bubbles stream up, the head climbs, swells and settles, and every sip leaves a lacing ring.

**Architecture:** raw WebGL2, as Rubens tube. One full-screen scene pass draws the room, the table, the glass, the beer, the foam, the stream and the bubble trains analytically. A downsample chain gives bloom, and a composite pass grades. The CPU runs a small fill model: liquid volume, foam volume, foam age and lacing rings.

**Tech stack:** raw WebGL2 (RGBA16F targets), Tone.js through `kit.tone()`.

**Spec:** the Belgian batch (Tom, 2026-11-09); batch rules in [README.md](README.md); Bar v2 in [bar-v2.md](bar-v2.md).

| | |
|---|---|
| Size, estimate | M · $20 to $35 |
| Kits | none |
| Before the build | nothing |

## The shot

A dark bar at night that you never see. One soft light stands behind the glass, a little to the left.
One glass on a dark table. The glass is only edges: two thin rim glints, a bright lip ellipse and the refracted light.
The beer glows from behind. The head sits on top, lit by a weak key light from above.
On the table in front of the glass, the light that came through the beer lands as an amber caustic.
A few soft bokeh discs of far lights float in the dark. No bottle, no tap, no label, no logo.

## Hero moments

1. **The backlit beer.** Light comes through the beer. The thick middle glows deep amber; the thin edges go golden, then dark where the glass bends the light away.
2. **The pour.** The stream falls from the top of the frame, thins as it speeds up and breaks into beads near the bottom. Where it lands, a cloud of fine bubbles churns and the head climbs.
3. **Bubble trains.** Strings of bubbles rise from scratches on the wall and from the etched mark in the base. Each bubble grows as it rises, so the string spreads apart toward the top. Each bubble is a small lens with a bright spark.
4. **The caustic.** The full glass is a lens. On the table it throws a bright amber line with a soft pool around it, and the bubbles make it flicker.
5. **Lacing.** Each sip lowers the beer and leaves a white lace ring on the glass, one ring per sip, as in a real glass.

## Loop

- Hold to pour. The pointer's x tilts the glass, up to 45°. The pointer's height sets the drop height and the flow.
  - A tilted glass and a low pour: the stream runs down the wall, and the head stays thin.
  - A straight glass and a high pour: the stream hits the beer, and the head climbs fast.
- Release: the stream stops. The head swells a little from bubbles still in the beer, then slowly settles.
- Tap the glass: it rings. A full glass rings lower. The knock frees a burst of bubbles from the walls.
- Sip: the level drops by one gulp and leaves a lacing ring at the old foam line.
- Untouched, the bubble trains keep rising. The loop drifts at 30 fps and sleeps after 60 s.

## Bar (Bar v2)

| Slot | Control | Content |
|---|---|---|
| Top left | Choice, `segments` | Wit, Blonde, Tripel, Dubbel, Kriek |
| Bottom left | Actions | Pour (`P`, a perfect two-stage pour), Sip (`S`), Clear (`C`, a fresh empty glass) |
| Bottom right | Slider | Fizz: carbonation, from flat to lively |
| Bottom centre | Keys | `[HOLD + DRAG] pour` · `[CLICK] ring the glass` · `[S] sip` · `[SPACE] pour` |

Five visible controls: the choice, three actions and the slider.

**Settings** (each persists under `stimming.beer.<key>`):

| Row | Type | Values |
|---|---|---|
| Light | choice | Warm, White, Neon (a pink bar sign, as light only) |
| Foam time | choice | Fast (a head half-life near 40 s), Real (near 2 min) |
| Etched mark | toggle | On, Off |
| Quality | site | Standard, High |
| Reset (footer) | | Full glass of the current style, lacing cleared |

### Styles

| Style | Glass | Beer (OKLCH at 3 cm) | Clarity | Foam | Head half-life (Fast) |
|---|---|---|---|---|---|
| Wit | Tumbler, thick wall | 0.86 0.08 95 | Cloudy | White, fine | 30 s |
| Blonde | Goblet | 0.8 0.13 80 | Clear | White | 35 s |
| Tripel | Tulip | 0.78 0.15 75 | Light haze | Ivory, dense | 50 s |
| Dubbel | Chalice | 0.36 0.1 40 | Clear | Tan | 40 s |
| Kriek | Flute | 0.45 0.16 20 | Clear | Pink | 25 s |

Each style has its own glass profile. A new style starts a fresh, full glass with a new head. The glass morphs to the new profile over 0.6 s.

## 375 px recompose

- The glass fills more of the frame: its height is 58 % of the stage, and its base sits at 72 % down.
- The stream comes from the top centre, so a thumb does not cover it.
- The caustic is shorter, and the bokeh discs are fewer.
- Bar v2 phone rules: the choice moves bottom left as a stepper, the actions move bottom right, and Fizz moves into Settings.
- Touch: hold and drag pours; a tap rings; the Sip and Pour chips cover the keys.

## Physics

**Beer–Lambert colour.** The transmitted light is `T = exp(-σ_rgb · L)`, where `L` is the chord length through the beer at that pixel: `L = 2·sqrt(r² - x²)`. A thick glass is darker and redder in the middle. Each style sets `σ_rgb` from its colour at 3 cm. Haze adds in-scatter: `(1 - T) · haze · light`, and it softens the view through the beer.

**The glass is a lens.** A full glass flips the scene behind it left to right. The backlight stands left of the glass, so through the beer its bright part shows on the right. Near the walls, the bend sends rays outside the light, so the edges go dark.

**The caustic.** A water-filled cylinder of radius `R` focuses light near `nR / (2(n - 1))`, about `2R` from its axis (n = 1.33). On the table the light pool narrows to a bright line near `2R` in front of the glass, then spreads. The pool takes the beer's colour, and its brightness falls with the beer level.

**Bubble growth.** A bubble leaves its site with a radius near 0.02 mm. CO2 diffuses in as it rises, so its radius grows at a near constant rate: `R(τ) = R0 + Gτ`. Its rise speed follows Stokes, `v ∝ R²`, so its height grows as `τ³`. Bubbles in one train speed up and the spaces between them grow toward the top. A site fires 8 to 25 times per second; Fizz scales the rate and `G`.
In the shader each train is analytic: for a pixel at height `y`, `τ = cbrt((y - y0) / A)` gives the nearest bubble index, and the shader tests that bubble and its two neighbours.

**The stream.** The stream speeds up as it falls, `v = sqrt(v0² + 2gh)`, so continuity makes it thinner: width `∝ v^(-1/2)`. Lower down, the Plateau–Rayleigh instability breaks it into beads.

**The foam front.** Foam volume grows with flow × drop height × the style's foam power. A stream that runs down a tilted wall makes about a fifth of the foam. In a hard pour, the head climbs at 1 to 3 cm/s. After the pour, bubbles still in the beer feed the head for 4 to 8 s, so it swells a little before it settles.

**Drainage and coarsening.** Foam is about 80 % gas.
- Drainage: liquid runs down the Plateau borders, so the foam is wet at the bottom and dry at the top. Wet foam has round bubbles with beer between them. Dry foam has thin, bright polygon walls.
- Coarsening: gas moves from small bubbles to large ones, so the mean bubble size grows as `sqrt(age)`. The top coarsens first.
- Collapse: the head loses height on the style's half-life. Each collapsed foam volume returns 20 % of its volume to the beer.

**Lacing.** When the level drops, foam proteins hold a band of bubbles to the glass at the old foam line. Each sip leaves one ring. Its strength follows the style's foam power and the head height at that moment. Rings dry and dim over minutes, but never fully go.

**The ring.** A tap rings the glass. A wine-glass mode drops in pitch as the glass fills, because the liquid adds mass to the wall: `f ≈ f0 / sqrt(1 + k·fill⁴)`.

## Finesse

- The first frame is a picture: a full Tripel with a two-finger head, bubble trains rising, the caustic lit.
- Light carries the scene. Only the glass edges, the beer, the foam, the bubbles and the caustic are bright; the room stays black.
- Bubble sparks are small and many, but each one is brief. Bloom has a threshold, so only sparks, the lip glint and the caustic line bloom.
- The glass rim is an ellipse seen a little from above. The beer surface and the foam top are ellipses too.
- The head is never a flat white block: cells, wet base, dry top, beer-tinted edges.
- A fresh head is fine and creamy; an old head is coarse and see-through at the top.
- Every gesture answers in one frame: the stream starts at the press, and the glass tilts with the pointer.
- No hit repeats: each glug, ring and crackle jitters in pitch, time and level.

## Sound

Muted by default; Tone nodes connect to `kit.out`.

- **Glug:** low filtered noise pulses, 3 to 6 per second, faster with flow; pitch rises as the glass fills (the air column shortens).
- **Stream:** band-passed noise; its level follows flow, its brightness follows drop height.
- **Fizz:** sparse high clicks, density from the number of bubble trains and Fizz.
- **Foam crackle and hiss:** fine noise grains whose rate follows the foam collapse rate. It fades as the head settles.
- **Ring:** a sine pair with a slow beat, pitch from the fill level, 2 s decay.
- **Sip:** a soft low swallow, filtered noise with a falling band.

## Reduced motion and idle

- **Reduced motion:** bubble trains rise at a quarter speed; no stream beads; the head settles in steps of 5 s; the caustic does not flicker.
- **Idle:** drifting at 30 fps while bubbles rise or the head settles. After 60 s untouched, the bubbles ease to a stop over 2 s and the loop sleeps.
- **Hidden:** the loop and the sim clock stop.

## Review focus

1. **Foam cells at 375 px:** cells must stay at least 3 px, or they read as noise.
2. **Tilt and the level:** the beer surface stays level in the world while the glass tilts.
3. **Bloom with Neon light:** the pink light must not wash the frame.
4. **No float targets:** without `EXT_color_buffer_float`, show `.fail`.
5. **Fresh glass on style change** must not cut a pour in flight: the pour stops first.

## Tasks

### Task 1: Blockout (checkpoint)

**Files:** Create `beer/index.html`, the bean, the `toys.json` entry and the Lab menu entry.

**Produces:** `SCENE_FS`, `profile(style)`, the fill model (`vol`, `foam`, `level()`), Bar v2 wiring.

- [ ] Scene pass: room, backlight, bokeh, table, glass profile from a texture, Beer–Lambert beer, foam head, rim and lip glints, caustic.
- [ ] Static bubble trains (analytic), the etched mark.
- [ ] A plain hold to pour: tilt, stream, level and head rise, so the stream reads in a still.
- [ ] Bloom chain and grade. Bar v2 with the five styles.
- [ ] Stills at 1280 and 375 px, one per style and one mid-pour. **Stop. Checkpoint with Tom.**
- [ ] Commit: `Beer pour: the backlit glass, blockout`.

### Task 2: The pour and the head

- [ ] Pointer state machine (8 px drag, 260 ms hold). Tilt and drop height from the pointer.
- [ ] Foam generation from flow × height × tilt, the swell after the pour, drainage, coarsening and collapse.
- [ ] Stream thinning and beads; the churn cloud under the impact.
- [ ] Pour action: tilt to 45°, fill to two thirds, straighten, finish high.
- [ ] Commit: `Beer pour: the pour, the head and its settle`.

### Task 3: Sip, lacing and the ring

- [ ] Sip lowers the level and leaves a lacing ring; rings dry over minutes.
- [ ] Tap rings the glass and frees a bubble burst. Style change morphs the glass.
- [ ] Commit: `Beer pour: sips, lacing and the ring`.

### Task 4: Sound

- [ ] Glug, stream, fizz, crackle and hiss, ring, sip. Q9.
- [ ] Commit: `Beer pour: glug, fizz and foam hiss`.

### Task 5: Settings, ladder and QA

- [ ] Light, Foam time, Etched mark; persistence; performance ladder (pixel ratio, bloom size, fewer trains).
- [ ] Q1 to Q10 in the pane. Tick the bean and record the cost.
- [ ] Commit: `Beer pour: settings and QA`.
