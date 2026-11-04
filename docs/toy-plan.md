# Toy plan: feasibility, ranking, budget

Covers the 27 shortlisted toys in [toy-ideas.md](toy-ideas.md). Drafted 2026-11-04; Tom decides.
Tom chose the top four to build first; their briefs are in [toy-dev-plan.md](toy-dev-plan.md).

## Budget assumption

Budget: $250 of coding credits. Estimates use Claude Opus 5.5 API rates: $4 per million input tokens, $20 per million output, $0.20 per million cached reads.
Most of a build session's cost is re-reading the conversation every turn, so long sessions cost more than big files.

| Size | What it means | Rough cost per toy, to Tom's sign-off |
|---|---|---|
| S | One or two shaders, little scene | $10 to $15 |
| M | A scene or a sim, some tuning | $20 to $30 |
| L | A cinematic scene with many parts, heavy art tuning | $40 to $70 |

These are estimates. Build the first toy, read the real cost (`/cost` in the CLI, or the usage page), then rescale this table.

## Techniques

| Code | Technique | Notes |
|---|---|---|
| 2D | Fragment shaders on a full-screen quad, with ping-pong buffers | three.js 0.170 as a thin WebGL2 host. Cheapest and most robust. |
| 3D | three.js scene with lights, fog and post effects | UnrealBloomPass ships in three.js addons; ten toys already use bloom. |
| VOL | WebGPU 3D fluid, adapted from Fire | Fire runs a 100 × 100 × 200 smoke grid in TSL (from the three.js volume fire example, MIT). Needs WebGPU; Fire already shows a fallback notice. |
| SIM | Hand-rolled CPU physics: Verlet ropes and cloth, particles | No physics library is in the set; Verlet cloth is about 200 lines. |

## Shared kits

Five toys share one trick. Build the trick once in the first toy, then copy it into the next. Do not refactor the existing toys.

| Kit | First built in | Reused by |
|---|---|---|
| **K1. Phosphor buffer**: a fading trail buffer | Star trails | Cloud chamber, Sonar, Wind map, Kelvin dropper |
| **K2. Night scene**: sky, height fog, water reflection, bloom, falling snow or rain | Night viaduct | Fireworks, Wind farm, Canal at dusk, Marsh launch, Coast and meteor |
| **K3. Volume fluid**: Fire's grid, retuned | Ink in water | Dry ice fog, Sunbeam dust (optional) |
| **K4. Verlet rope and cloth** | Pull chain | Washing line, Pea pod |
| **K5. 2D fluid**: stable fluids on a grid | Electrolysis | Iodine clock, Calm jar |

## Feasibility

| # | Toy | Tech | Kit | Size | Risk | Note |
|---|---|---|---|---|---|---|
| 79 | Star trails | 2D | K1 | S | Low | Accumulation buffer plus a silhouette. Very high beauty per line of code. |
| S1 | Sonar (+54) | 2D | K1 | M | Low | CRT pass, sweep, contacts, waterfall from an AnalyserNode. Absorbs Spectrogram. |
| 1 | Cloud chamber | 2D | K1 | S | Low | Tracks as random walks drawn into the fading mist buffer. |
| 75 | Sunbeam dust | 3D | (K3) | S | Low | Additive light cone plus instanced motes on curl noise. |
| S2 | Fireworks | 3D | K2 | S to M | Low | GPU particles plus bloom; shell types are data. |
| 12 | Wind map | 2D | K1 | S | Low | Particles on a noise field; simplex-noise is in the set. |
| 49 | Ulam spiral | 2D | | S | Medium | Easy to build; the risk is "too minimal". Needs a deep zoom and glow. |
| 50 | Collatz coral | 2D | | S | Low | Known, lovely visual; tune the bend angles. |
| 35 | Ink in water | VOL | K3 | M | Low | Fire's sim with dye that sinks and a light background. WebGPU only. |
| 47 | Dry ice fog | VOL | K3 | M | Medium | Heavy fog in Fire's grid; the basin rim and the spill need care. WebGPU only. |
| 16 | Night viaduct | 3D | K2 | M to L | Medium | Keep it stylised (silhouette arches, lit windows, snow, fog) to hold cost. |
| 59 | Wind farm | 3D | K2 | M | Low | Instanced turbines, height fog, sea. Cheap once K2 exists. |
| 56 | Window seat | 3D | | M to L | Medium | Night Earth needs a city-lights texture. NASA Black Marble is public domain; procedural lights look fake. A texture file is an asset, not a library. |
| 15 | Coast and meteor | 3D | K2 | L | High | Many effects in one scene: cliffs, water, sky, impact, the sea pulling back. Build it after K2 has proved itself. |
| 61 | Canal at dusk | 3D | K2 | L | High | Procedural step-gable facades, wet reflections, rain ripples. Art-heavy. |
| 55 | Marsh launch | 3D | K2 | M to L | Medium | Plume and dawn light carry it; the delayed sound is the hook. |
| 63 | Pull chain | SIM | K4 | S to M | Low | Verlet chains, lamp toggles, tones. |
| 42 | Iodine clock | 2D | K5 | S | Medium | One snap per pour: the loop is thin. Stronger as a chip in a shared bench toy. |
| 43 | Electrolysis | 2D | K5 | M | Medium | Bubble particles plus coloured clouds. |
| 46 | Kelvin dropper | 2D | K1 | M | Medium | People may not read what charges up. Needs a clear charge meter. |
| 34 | Washing line | SIM + 3D | K4 | M | Medium | Verlet cloth with wind; feel matters. |
| 65 | Rain stick | SIM | | M | Medium | About 300 beads among pins with a spatial hash; the sound sells it. |
| 23 | Peel | 3D | | M | Medium | Curl geometry that follows the pointer; feel is everything. |
| 27 | Calm jar | 3D | K5 | M | Medium | Overlaps Snow globe. Could reuse Snow's three.js scene, but needs its own idea first. |
| 67 | Pea pod | SIM + 3D | K4 | M | High | A soft body that splits is fiddly to make satisfying. |
| 73 | Water wheel | SIM | | L | High | Particle water against moving wheels is hard to make look right. |

## Ranking

Order weighs four things: how much Tom wants it, cost, risk, and whether it builds a kit.

1. **Star trails** (S). Cheapest, builds K1, and calibrates the real cost.
2. **Sonar** (M). Tom asked for it by name. It reuses K1 and absorbs Spectrogram.
3. **Cloud chamber** (S). K1 again, so it gets cheap.
4. **Night viaduct** (M to L). Tom likes it a lot. It builds K2 for every cinematic toy.
5. **Fireworks** (S to M). Rides on K2.
6. **Window seat** (M to L). Tom: "absolutely".
7. **Ink in water** (M). Rides on Fire's sim.
8. **Sunbeam dust** (S). Cheap and beautiful.

Next tier, when budget allows: Wind map, Coast and meteor, Wind farm, Collatz coral, Dry ice fog, Pull chain, Ulam spiral.
Last tier, costly or risky: Canal at dusk, Marsh launch, Washing line, the chemistry bench, Kelvin dropper, Rain stick, Peel, Calm jar, Pea pod, Water wheel.

## Next set (Tom, 2026-11-04)

Built so far in this sequence: Star trails, Sonar, Cloud chamber, Window seat (Lab, still open).

| Toy | Kind | Status |
|---|---|---|
| Wind farm (59) | Scene | Blocked out on Beach walker framing: the cluster on the left third, a low sun right of it |
| Fireworks (S2) | Scene | Blocked out; the cheapest of the three to finish |
| Ink in water (35) | Volume | Blocked out: dark water, glowing ink; the costliest of the three |
| Glow paper (44) | Small | Picked |
| Oil slick (77) | Small | Picked |
| Sequin brush (104) | Small | Picked |
| Crinkle foil (107) | Small | Picked |

- Every toy gets a blockout before code. Tom signs it off.
- Rendering starts in raw WebGL2. Any of them may move to three.js later.
- Window seat stays unvetted: do not reuse its parts yet.

## Plan for $250

| Phase | Toys | Estimate |
|---|---|---|
| 0. Calibrate | Star trails | $10 to $15 |
| 1. K1 set | Sonar, Cloud chamber | $30 to $45 |
| 2. K2 set | Night viaduct, Fireworks | $50 to $70 |
| 3. Wishes | Window seat or Ink in water | $25 to $40 |
| Reserve | Tom's feedback rounds, fixes, QA | $40 |
| **Total** | 6 toys | **$155 to $210** |

Whatever is left goes to Sunbeam dust or Wind map.
Coast and meteor waits for the next budget, after Night viaduct proves the cinematic register. It is the costliest toy here; building it on a working K2 saves the most money.

## How each build stays cheap

1. One fresh session per toy, opened with that toy's brief from this doc.
2. Point the session at `shared/stim.js` and the Pop field reference port only. Large pages (Glass, Prism, Neon: 4,500 to 5,900 lines) stay closed.
3. Screenshots: one or two mid-build, then the QA set at 1280px and 375px at the end.
4. Tom's feedback in batches, not one tweak per message.
5. Optional, Tom's call: run the small 2D toys (Ulam, Collatz, Wind map) on Sonnet 5.5, at half the price per token.
6. Merge where it is honest. Spectrogram goes into Sonar. Iodine clock, Electrolysis and Kelvin dropper could be one "Bench" toy with three chips.
