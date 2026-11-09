# Beer pour (`beer`) implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. One session builds this toy, task by task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** A high-fidelity pour of real Belgian beers. Each beer has its own bottle and its own glass. Bubbles stream up, the head climbs, swells and settles, and every sip leaves a lacing ring.

**Direction (Tom, 2026-11-09):**
- "Incredibly prestigious": a wide range of true Belgian beers, with their bottles and glasses.
- Real beer names are allowed in this toy, as Tom's own exception to the brand-name rule. The toy's own name stays generic.
- Tom supplies the real labels later. Until then the labels are generated stand-ins: colours and type only, with no copied logos.
- The fidelity bar is Dandelion: a premium backdrop, light flecks, grain, and the most we can get from the glass.

## Overhaul brief (Tom, 2026-11-09, ten questions)

The ray-traced build (rounds 1 and 2) is the reference. The overhaul replaces it.

| # | Question | Answer |
|---|---|---|
| 1 | Engine | Rebuild on three.js 0.170: glass and bottles as lathe meshes from the photo outlines, a physical transmission material, GPU particles. |
| 2 | Shot | Macro close-up. The glass fills most of the frame, with a shallow depth of field. The bottle enters from the side only to pour. |
| 3 | Pour | Grab the bottle itself. Drag it over the glass; dragging further round tips it more, so the angle sets the flow. A second drag on the glass tilts the glass. |
| 4 | Perfect first | Bubbles and fizz. |
| 5 | Light | Warm bar backlight: one lamp behind the glass, a dark bar, bokeh and flecks. |
| 6 | Range | Duvel first, to final quality. The other 24 follow on the same system. |
| 7 | Realism | Stylized. |
| 8 | Fizz | All four: nucleation trains, bubbles clinging to the walls, the surge after pouring, pops with sparkles and spray at the surface. |
| 9 | Style | Luminous painterly, after Dandelion: glowing gradients, soft bokeh, light bleeding through the foam, loose shapes. |
| 10 | Loop | Watch it live, then sip. Sips lower the beer and leave lacing rings. Clear brings a fresh chilled glass and bottle. |

Overhaul order:
1. three.js scene: macro camera, depth of field, the warm backlight, the bokeh backdrop, the Duvel glass and bottle from their outlines.
2. Fizz: GPU bubble particles for the trains, the wall bubbles, the surge and the pops. This is the checkpoint to show Tom.
3. Grab-the-bottle pour, the stream and the liquid.
4. The head, sips and lacing.
5. The other 24 beers.

**Architecture (rounds 1 and 2, reference):** raw WebGL2. One full-screen pass ray-traces the scene in 3D:
- **Vessels:** the glass and the bottle are solids of revolution. Each is a 512-sample profile texture holding outer radius, inner radius and both slopes.
- **Media:** the ray marches through air, glass, beer, foam and bottle glass. A step is a safe distance in meridian space, and bisection finds each boundary.
- **Optics:** each boundary refracts by Snell's law. Fresnel reflection samples a studio (a key softbox and a rim strip). Total internal reflection keeps the ray inside the glass wall.
- **Colour:** Beer–Lambert absorption applies along every real path.
- **Pipeline:** a downsample chain gives the bloom; the composite adds the grade, the vignette and the film grain.
- **Fill model:** the CPU tracks beer and foam volumes in the tilted glass, and the beer in the tilted bottle.

**Tech stack:** raw WebGL2 (RGBA16F targets), Tone.js through `kit.tone()`.

| | |
|---|---|
| Size, estimate | L · $60 to $100 |
| Data | `beer/data/research.json` (25 beers, sourced; estimates are flagged per field) → `beer/data/gen_catalogue.py` → `beer/catalogue.js` |
| Labels | `beer/labels/<id>.png`, when Tom supplies them |

## The shot

A dark bar at night. One soft lamp stands behind the glass, a little left. The far bar is out of focus: warm bands and bokeh in three sizes, from wide discs to bright flecks. Dust specks drift in the lamp's light.
On a slate table stand the beer's own glass, full and backlit, and its bottle. The table catches the lamp as a satin streak, and the glass throws a shadow with an amber caustic.

## Hero moments

1. **The backlit beer.** The light behind comes through the beer, bent by the real glass. The thick middle goes deep; the thin edges go golden; the walls glint where the softbox reflects.
2. **The pour.** The bottle lifts off the table and tips over the glass. The stream thins as it falls and beads near the bottom. The beer stays level while the glass tilts.
3. **Bubble trains.** Strings of bubbles rise from scratches and from the etched mark (Duvel's D, Gulden Draak's dragon). Each bubble grows as it rises, so the string spreads apart toward the top.
4. **The caustic.** The full glass is a lens: on the table, an amber line in the glass's shadow.
5. **Lacing.** Each sip lowers the beer and leaves a lace ring at the old foam line.

## The beers

25 beers, from `research.json`: Duvel, Omer, Averbode, La Chouffe, Kriek Boon, Lindemans Kriek, Oude Geuze Boon, Westmalle Tripel and Dubbel, Chimay Blue, Orval, Rochefort 10, Westvleteren 12, Tripel Karmeliet, Kwak, Delirium Tremens, Hoegaarden, Leffe Blonde, Rodenbach Grand Cru, Gulden Draak, St. Bernardus Abt 12, Brugse Zot Blond, Gouden Carolus Classic, Straffe Hendrik Tripel, Stella Artois.

| Field | Drives |
|---|---|
| EBC | Beer colour, by a spectral Beer–Lambert model: SRM = 12.7 × A430, and absorbance falls with wavelength. Red beers use a measured colour. |
| Clarity | Haze: scattering and extinction inside the beer |
| Foam colour, stability, half-life | Head colour, foam per pour, collapse rate (Real time uses the measured half-life; Fast is a third) |
| CO2 volumes | Bubble rate and foam power |
| Glass type and sizes | Tulip, chalice, flute, tumbler or coachman profile; gold or silver rim; etched mark; rock foot |
| Bottle type and sizes | Round belly, Belgian 33 cl, steinie, longneck, skittle, champagne with a punt; glass colour; painted bottles (Delirium, Gulden Draak) |
| Label shape and colours | Stand-in label: rectangle, oval, diamond, round, arch, foil or printed |
| Pour ritual | The Pour action: tilt, head height, leave the yeast |

## Loop

- Hold to pour. The bottle lifts and tips over the glass.
  - The pointer's x tilts the glass, up to 45°.
  - The pointer's height sets the drop. A high drop builds a big head.
- The bottle tips further as it empties. It pours only while its beer stands above the low side of its mouth.
- Release: the bottle goes back to the table. The head swells a little from bubbles still in the beer, then settles.
- Tap the glass: it rings, lower when full, and frees a burst of bubbles.
- Sip: the level drops by one gulp and leaves a lacing ring.

## Bar (Bar v2)

| Slot | Control | Content |
|---|---|---|
| Top left | Choice, `stepper` | The 25 beers |
| Bottom left | Actions | Pour (`P`, the beer's own ritual), Sip (`S`), Clear (`C`, an empty glass and a full bottle) |
| Bottom right | Slider | Fizz |
| Bottom centre | Keys | `[HOLD + DRAG] pour` · `[CLICK] ring the glass` · `[S] sip` · `[SPACE] pour` |

**Settings:** Light (Warm, White, Neon) · Foam time (Fast, Real) · Etched mark (On, Off) · Quality (site) · Reset (footer).

## 375 px recompose

- The camera widens to about 24 cm across. The glass sits left of centre, and the bottle stands behind it on the right.
- The choice moves bottom left as a stepper, the actions move bottom right, and Fizz moves into Settings.

## Physics

- **Bubble growth:** the radius grows at a near constant rate, `R = R0 + Gτ`. Stokes rise, `v ∝ R²`, so the height grows as `τ³`.
- **Stream:** `v = sqrt(v0² + 2gh)`, and the width goes as `v^(-1/2)`. Plateau–Rayleigh beads appear after about 6 cm.
- **Bottle flow:** `Q ≈ 0.42 · A_neck · sqrt(2gΔh)`, with a glug at 4 to 7 Hz. Δh is the beer's height over the low side of the mouth.
- **Foam front:** the foam per volume poured is power × fizz × drop × (1 − 0.8 × wall contact). The swell lasts 4 to 8 s after the pour.
- **Drainage and coarsening:** the foam is wet below and dry above, and its cells grow as `sqrt(age)`. Collapsed foam returns 20 % of its volume as beer.
- **Lens and caustic:** a water cylinder focuses near `2R` from its axis, so the table caustic narrows there.
- **The ring:** the pitch falls as the glass fills.

## Finesse

- The first frame is a picture: Duvel, full, with a head, the bottle beside it, and the bubble trains rising.
- Only the glass, the beer, the foam, the bubbles, the labels and the caustic are bright. The room stays dark and warm.
- No two hits sound alike.
- Real label art drops in by file name with no code change.

## Tasks

### Task 1: Blockout (checkpoint)

- [x] Ray tracer: glass, beer, foam, bottle, refraction, Fresnel, TIR, softbox glints, Beer–Lambert.
- [x] Catalogue of 25 beers from research; glass and bottle builders; stand-in labels; painted bottles; metal rims.
- [x] Premium backdrop: lamp, back-bar bands, three bokeh tiers, dust specks, film grain, bloom.
- [x] A plain hold to pour: the bottle lifts and tips, the stream falls, the beer levels in the tilted glass.
- [x] Stills at 1280 and 375 px. **Checkpoint with Tom.**

### Task 2: The pour and the head

- [ ] Pointer state machine (8 px drag, 260 ms hold). Stream leaves the mouth on a parabola.
- [ ] Foam generation, swell, drainage, coarsening; the churn cloud under the impact.
- [ ] The Pour action follows each beer's ritual (Duvel 45° then straight; Hoegaarden swirl; leave the yeast).
- [ ] Kwak's wooden stand; Hoegaarden's hexagonal facets; the etched D.

### Task 3: Sip, lacing and the ring

- [ ] Sip lowers the level and leaves a lacing ring; tap rings the glass and frees bubbles.

### Task 4: Sound

- [ ] Glug, stream, fizz, foam crackle and hiss, ring, sip.

### Task 5: Labels, settings, ladder and QA

- [ ] Real label art from Tom; glass prints (wordmarks, gold rims).
- [ ] Performance ladder; Q1 to Q10 in the pane; record the cost.
