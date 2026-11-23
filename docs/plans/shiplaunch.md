# Ship launch (`shiplaunch`) plan

Status: paused (Tom, 2026-11-23), MVP and the port basin in the Lab, the sweep at stage 1 (state in bean `stimming-z2w5`) · Beans: `stimming-y9pf`, `stimming-z2w5`

## Context

Tom picked Ship launch on 2026-11-23 as one of four parade pieces (idea 222, grown from Slipway, size XXXL, group C):
"A shipyard launch. Cut the rope; the hull rumbles down the ways, drag chains throw rust and dust, it hits the water sideways and a wall of wave crosses the harbour."
This plan names the full toy, cuts it to one MVP that ships to the Lab, and says how to build it.
Tom approved it on 2026-11-23. The MVP is built as a Lab toy.

## 1. Reference (opened before the design)

All from Wikimedia Commons, `Category:Sideways_launching`, plus two Polygoon newsreels on Commons.

| Reference | What it gave the look |
|---|---|
| `Pioneer (IMO 9313797) Westerbroek 2005.jpg`, `Nescio ... Westerbroek 1988.jpg` | The hero frame. A coaster leaves the ways on a narrow canal, heeled about 20 degrees outboard-down, deck tilted toward the far bank. The spray is a low white sheet that shoots along the waterline for the hull's full length, about a third of the hull high. Hammerhead crane, a shed, flat land, a still canal with strong reflections. |
| `Scheepsbouw, tewaterlating Coasters Ali S ... 126-0537.jpg` | The yard: eight steel ground ways in a row down the bank; brick houses, big trees and a road on the far bank; the crowd on the bank; one flag on a pole. The inboard bilge and the red bottom show as she tips. |
| `Wisaforest ... Hoogezand 2002.jpg` | The far-bank crowd along a quay road, a police car (left out), a tug waiting, a white superstructure aft over a blue hull. |
| `LST-32 launch 22 May 1943.jpg`, `Launch of USS John P. Gray (DE-673) ... 1944.jpg` | Restraining wires and chains hang in loops from the deck to the bank, then go taut. Spray under the keel, a wave fanning out over the water. |
| `USS LST-779 launching Pittsburgh 1944.jpg`, `LST-786 launching.jpg` | A wall of white water stands up along the whole hull; the ground ways run into the water in the foreground. |
| `LCS 13 launches sideways (29725271776).jpg`, `Launch of USS St. Louis at Marinette Marine 2018.JPG` | Colour and light: sunlit spray glows gold where the light comes through it; bunting from bow over the mast to stern; the hull rolls back hard toward the yard after the hit. |
| `'Magna Pete' tewatergelaten` (newsreel, 1950s) | The ritual: men grease the ways by hand, knock out wedges, cut a cord; the sponsor's speech; the bottle on the bow. |
| `Mislukte tewaterlating van de "Rian"` (newsreel) | A canal yard from the far road: hulls broadside on the bank, a narrow canal, a road with bare trees, houses. (The capsize is not in the toy.) |
| `Launch of the cargo ship 'Baron Belhaven'`, `Launch of the tanker 'North Sands'` | Stern launch for contrast: greased standing ways, chain heaps along the berth, dust over the ways. |

### Side or stern: side launch

1. Tom's words: "it hits the water sideways and a wall of wave crosses the harbour". A broadside hull makes a wave as long as the hull, so it crosses as a wall.
2. The drama is the heel: the hull tips off the ways, drops, rolls hard one way, then the other. A stern launch only slides.
3. The whole hull stays in one shot from start to finish. A stern launch runs away from or toward the lens.
4. The narrow Low Countries canal yard is the classic side-launch place, and the far-bank view is the classic photo.
5. Drag chains stay: as in LST-32 and DE-673, wires from lugs on the inboard side run to chain heaps on the berth. The heaps drag across the concrete, throw rust and dust, and pull the hull up before it hits the far bank.

No real yard, ship, town or company name appears in the toy, its copy or its code (hard rule 11). The hull is a generic short-sea coaster, no military ship.

## 2. The full toy (XXXL): stages in order

The scene: a canal yard in flat polder land, late in the day. Canal 55 m wide, 4.5 m deep. On the yard bank, eight ground ways, a hammerhead crane, a shed. The hull: an 88 m coaster, 13.5 m beam, 7 m deep, green over a red-brown bottom, white house aft, bunting from bow to mast to stern. On the far bank: a quay, a road, trees, a few brick houses, the crowd. The camera stands in the crowd on the far quay.

| # | Stage | What happens | The hand |
|---|---|---|---|
| I | The yard at rest | The first frame is a picture: the hull high on the ways, bunting lifting in the wind, the crowd, a still canal with the hull in it. | Drag turns the head a little. |
| II | Christening | The bottle swings on its lanyard and breaks on the bow: glass glints, foam runs down the plates. | Drag the bottle back and let go. |
| III | Release | The rope parts, the trigger weight drops, the dog shores knock out. Then nothing: the grease holds for one to three seconds, the hull creaks, the crowd goes quiet. Then she moves. | Tap the rope (or Space): cut. |
| IV | The slide | The hull runs down the ways; grease smokes under the cradles; the wires go taut and the chain heaps tear across the concrete, throwing rust and dust; a low rumble. | Watch; drag follows her. |
| V | Tip and drop | Her centre of weight passes the end of the ways: she tips outboard-down and drops off the edge. The red bottom shows. | Watch. |
| VI | The hit | The outboard side slams in. A white sheet of spray shoots along the waterline for her whole length, climbs, hangs, falls back as rain and mist, lit gold by the low sun. She rolls hard back toward the yard. | Watch. |
| VII | The wave | A wall of water about 1.5 m high crosses the canal in about 7 s, runs up the far quay, breaks over the edge at the crowd's feet and sheets across the quay. The crowd steps back and cheers. | Watch. |
| VIII | Settle and roll | She rolls down from about 20 degrees, about 6.5 s a roll, sways across the canal and back on her chains; the reflected waves come back from both banks; the canal sloshes for a minute and calms. | Drag looks round. |
| IX | Aftermath | Two tugs take her lines; the empty ways steam; timbers and packing float; the crowd thins. A flash cut resets the yard. | Reset. |

Later rungs of the full toy: a camera choice (far bank, yard quay, along the ways), time and weather on `shared/daytime.js` (grey newsreel day, low sun, floodlit night), hull kinds (coaster, tug, ferry), a stern launch at a river yard as a second kind, drops on the lens, gulls.

## 3. The MVP cut: the hit and the wave

One hero moment, finished to high fidelity: release, slide, tip, the hit with its spray sheet, the wave across the canal and over the near quay, and the roll down to calm. One fixed shot.

| In the MVP | Waits for later stages |
|---|---|
| One fixed shot from the far quay; drag turns the head up to about 15 degrees and eases back | A camera choice and moves |
| Stages III to VIII, cut by a tap or Space | II Christening (the bottle), IX tugs and debris |
| One hull, one canal, one light | Hull kinds, the stern launch, time and weather |
| Drag chains: four wires to four heaps, rust and dust | Sparks, scrape marks that stay |
| The crowd as lit silhouettes that step back from the wave | Individual crowd animation, umbrellas, cheering faces |
| The wave over the near quay as a running water sheet | Drops on the lens, puddles that stay |
| Reset by a flash cut to the hull on the ways | Hauling her back |

## 4. Tech

### Renderer

Scene stack type: three.js 0.170, small ShaderMaterials, as Calving and Volcano. Plain JS (TypeScript only for Railgun so far).
Why not the environment runner: the hull, the chains and the heaps are moving geometry, and one big full-screen scene function links badly on D3D11 (Calving's reason).

Passes, each its own short program:
1. Sky (gradient, sun, haze band, thin cloud from a baked noise texture).
2. Land and yard (quays, ways, shed, crane, far houses and trees as flat lit shapes in haze).
3. Hull: a custom PBR material (GGX, Schlick, painted steel, plate seams, red bottom, wet darkening above the waterline after the hit).
4. Chains (instanced links on a verlet rope, K4 from `balloons/`) and heaps; crowd (instanced lit silhouettes).
5. Water: the canal mesh displaced by the sim, a planar reflection at half size, murky absorption, foam.
6. Spray drops: CPU streak particles, ballistic with drag, as Volcano's bombs.
7. Spray mist, grease smoke and chain dust: a half-size volume march after the opaque pass that reads its depth.
8. Composite, bloom with a threshold (`shared/glow.js` ideas), grade (`shared/grade.js`), flare per the Look rule.

### The water and the wave: a GPU shallow-water sim

- A height field over the canal and both quays: 360 m by 96 m at 0.5 m cells (720 x 192), half-float ping-pong targets.
- The pipe model (virtual pipes, as Lava coast's CPU flow): one flux pass, one height pass, four sub-steps a frame at 1/240 s. It is stable, keeps mass, and handles wet and dry, so the wave can run up and over the near quay and sheet across it. The bed holds the canal floor, both quay walls and the quay tops.
- The hull pushes the water: each frame an orthographic camera under the canal renders the hull's keel depth into a small texture. The sim adds that draft as a pressure head (`eta + draft`) where the hull touches water, so a hull that drops in shoves water out. The wave height comes from the physics, not a script.
- A foam channel: made at the hull, at the steep wave front, and where water overtops; carried by the sim's velocity; it fades.
- Fine chop and glitter: `shared/water.js` (`WATER`, `wtWaves`, `wtFresnel`, `wtGlint`) on top of the sim's normal. A copy, not an import change: `shared/` stays untouched.
- Readback: one async read a frame of a 1 x 8 row (water level along the hull) for buoyancy, and one row along the near quay edge to place splash where the wave hits.

### Spray, dust and smoke: Fire's smoke shading

- A K3 volume fluid grid (the WebGL2 port in `jethover/fluid.js`, as `volcano/plume.js` copies it, kit-marked): 80 x 22 x 60 cells of 1.5 m over the berth and the canal.
- Fire's dye layout: r density, b age, a tint. Tint 0 is white water mist; tint 1 is rust and dust (warm brown, more absorption, less forward scatter); grease smoke sits between.
- Emitters: the spray sheet along the waterline at the hit, the chain heaps as they drag, the cradles as they slide.
- Shading copied from Lava coast's K3 lighting block (`lavacoast/shaders.js`): absorption, powder, ambient floor, Henyey-Greenstein phase, short shadow taps toward the sun. Backlit spray glows gold.
- Lessons kept: fixed-depth steps that end at the scene depth with a soft fade; height scaled like the other axes in the noise; shadow taps on the shape only.

### Keeping each program small for D3D11

- One material per object kind; no all-in-one shader.
- Noise from a baked 64-cubed texture (Lava coast), never long fbm loops in the shader.
- The volume march and its lighting in their own half-size pass; the composite stays short.
- `renderer.compileAsync` before `ready`; log link time per program; target 7.5 s or less in all (Car wash's bar).

### The hull's motion without a physics engine

Every way releases at once, so a side launch is one cross-section moving in a plane: sway, heave and roll. The hull's length only scales the forces.

1. Held: static friction of cold grease. On release, a creep of one to three seconds, then the break-away.
2. Slide: one degree of freedom down the 1 in 10 slope: `a = g (sin a - mu cos a) - chain drag / M`; mu falls from 0.04 to 0.02 as the grease warms.
3. Tip: when the centre of weight passes the tipping edge, the hull turns about that edge (inertia about the edge), until the contact force goes to zero.
4. Free: a 2D rigid body. Buoyancy from the section polygon (24 points: flat bottom, bilge radius, flare) clipped by the local water line; area and centroid by the shoelace sum give lift and its arm, so the righting moment comes out right by itself. Added mass for sway, heave and roll; linear plus quadratic damping (bilge keels).
5. Chains: each wire goes taut at its length; then its heap slides as a block with friction `mu_c m g` against the hull's outward motion. The heaps pull her up short of the far bank and swing her back.
6. Semi-implicit Euler at 240 Hz in JS. Pitch and yaw stay at zero; a small seeded twist keeps the ends from hitting in perfect step.

Numbers: launch weight 1,600 t; she reaches about 4.5 m/s at the edge; first roll about 20 degrees; roll period about 6.5 s; the wave runs at `sqrt(g h)` = 6.6 m/s.

## 5. Sound, bar and rules

### Sound (Web Audio via `audioKit()`, Tone.js, muted by default)

Every sound starts on the audio clock, late by its distance (343 m/s), with a handle per node; mute and a hidden tab cancel them.
- Release: the rope's snap, the trigger weight's thud, the dog shores knocked out in a ragged row of wooden bangs.
- The creak and groan before she moves.
- The rumble of the slide: low, rising with speed, felt first as a faint shake through the quay, then heard; its echo comes back off the shed behind her. This late rumble across the water is the hook.
- Chains: rattle and clank, a grinding scrape of the heaps.
- The hit: a deep whump, the roar of the spray, the patter of it falling back.
- The wave: a rushing wash that grows as it crosses, a slap on the quay wall, a hiss across the quay. The crowd's cheer swells after it.
- Then the slow slop of the canal, fading; the context suspends.

### Bar v3

| Part | Content |
|---|---|
| Action | Launch (Space): cuts the rope. After the launch it reads Again and resets by a flash cut. |
| Main slider | Drop: the height of the tipping edge over the water, 0.6 to 2.4 m. Low gives a soft slide; high gives a hard heel, a tall sheet and a wave over the quay. Stored as `stimming.shiplaunch.drop`. |
| Settings | Quality (shared), Reset |
| How to play | Click the rope: cut · Space: launch · Drag: look round · R: reset |

### Frame loop and rules

- Lively from the cut until the roll is under 0.3 degrees and the canal's wave energy falls under a floor, capped at 90 s (Calving's lesson: a tiny ripple must not keep it busy).
- Drifting at 30 fps for bunting and mist; the throttle measures from `performance.now()` at frame entry (Jet hover's lesson).
- Asleep 60 s after the last input; hidden stops the loop and the sim clock at once.
- Reduced motion: no bunting flutter, no shake, no head drift; the launch still plays with a softer sheet.
- Performance ladder (`shared/detail.js`): pixel ratio, then reflection and volume size, then counts (drops, crowd, march steps). The sim grid stays.
- Guards: clamp `pow()` bases (NVIDIA NaN), clamp dt at 0, guard zero-length normals.

## 6. Files, cost, risks, bean

| File | Holds |
|---|---|
| `shiplaunch/index.html` | Page skeleton, importmap word for word |
| `shiplaunch/main.js` | Bar, camera, frame loop, gestures, life cycle |
| `shiplaunch/launch.js` | The physics: grease, slide, tip, float, chains, events |
| `shiplaunch/canal.js` | The shallow-water sim, the draft pass, the water material |
| `shiplaunch/spray.js` | Spray and drops, after Ponlai's spray kinds |
| `shiplaunch/mist.js` | Mist, chain dust and grease smoke: the K3 fluid (from `volcano/plume.js`), its march and composite |
| `shiplaunch/foam.js` | The foam pattern, ported from Ponlai (MIT, in `CREDITS.md`) |
| `shiplaunch/yard.js` | Hull lines and topsides, ways, quays, crane, shed, far land |
| `shiplaunch/props.js` | Wires and heaps, the crowd, the bunting |
| `shiplaunch/sound.js` | Web Audio |

Plus: `icons/spike-shiplaunch-1.html`, `icons/spike/emblems/shiplaunch-a.svg` and `-d.svg`, the sheet `GALLERY` row, `shared/emblems/shiplaunch.svg`, a `toys.json` entry (`sub: "Stimming Lab"`, `number: null`, draft `nl` "Tewaterlating", `ipa`), a Lab `<li>` with its GSAP hook, `docs/toys/shiplaunch.md`, `docs/qa/shiplaunch/`.

Cost: the MVP about $60 to $100; the full toy $150 and up over many sessions.

Risks:
1. The sim with a moving pressure head can blow up: clamp flux, keep the sub-steps, test with the hull dropped from the highest Drop.
2. The spray sheet is the art tail; Tom judges it against the Westerbroek photos.
3. D3D11 link time of the water and volume passes.
4. Headless capture: Edge headless on D3D11 (memory note); check the renderer string.
5. The crowd at 375 px may read as noise: few, large silhouettes near the lens instead of many small ones.

Bean: one `feature` bean, "Ship launch: MVP", type Scene, under the 2026-11-23 parade picks; checklist from the tasks below. Commits go on `main` through `tools/commit.sh` with my own paths and hunks, as the sibling parade sessions do.

## Tasks (after the yes)

1. Write `docs/plans/shiplaunch.md` (Status: active), create the bean.
2. Blockout in the real framing within minutes: canal, banks, hull on the ways, sky. Screenshot at 1280 x 800 to Tom.
3. The physics and the sim: slide, tip, hit, wave, overtop, roll. Second screenshot at the hit.
4. Spray, dust, smoke; hull material; reflection; light and grade.
5. Bar v3, sound, frame loop, reduced motion, ladder.
6. Icon round `shiplaunch-1`, emblems, intro emblem, Lab tile and hook, `toys.json`.
7. QA Q1 to Q10, `docs/toys/shiplaunch.md`, commits; `git log origin/main..main` before each push, as a separate step.

## Verification

- `npm run dev` on port 8000 (check the port first), open `/shiplaunch/` in the browser pane.
- Drive: tap the rope, Space, every Drop value from 0.6 to 2.4, drag, R. Console clean.
- Screenshots at 1280 x 800 and 375 x 812: the first frame, the slide, the hit, the wave at the quay, the settle.
- Q4 and Q5 counts of rAF after settle and when hidden; Q9 the audio context suspends at the end.
- Link time per program and frame times at the hit, logged in the bean.

## Built (2026-11-23)

- Water reference (Tom, 2026-11-23: "a github with water dynamics"): Ponlai (github.com/HuberyLL/ponlai, its ocean adapts dgreenheck/tidewater). Both are WebGPU and TSL, so the toy ports ideas to GLSL: the foam pattern (a mat that tears, then lace) and the spray kinds.
- The MVP's canal had a near quay 0.8 m over the water and the eye on a bollard 2.3 m over it. The port basin replaced both.

## The port basin (2026-11-23)

Tom on the MVP: "Would like more faraway POV"; "I'd maybe want it to be released in a port or lagoon / wider waterway than a canal" (he picked Port basin over Open lagoon); "perhaps we can use frietkot like silhouettes instead of weird roblox people".

- The basin is 200 m wide and 6 m deep, closed at the west end and open east to the outer harbour. The sim covers 512 m by 256 m at 1 m cells.
- The camera stands on a stone pier from the north quay, about 150 m from the berth. Its head is 1 m over the water.
- The crowd are flat figure cards, Frietkot's `walker()` shape, ink against the low sun.

## Sweep: the quality pass (plan, Tom: "Yes, plan it")

Tom: "I think this is not the sweeping quality we're looking for..". The plan he approved:

### Context

The MVP plays, but Tom says it is "not the sweeping quality we're looking for". He said yes to this direction: one cinematic move, a real wall of water, shafts of low sun through the spray, and a detail pass.

The current state (local, uncommitted):
- a 200 m port basin;
- the camera on a stone pier among Frietkot-style ink figures;
- QA passing at 8.2 ms a frame.

Three things keep it small:
1. **A small wave.** In open water the pulse spreads, and it is about 0.1 m at the pier. I measured this at 1 m and at 0.5 m cells, so the grid is not the cause.
2. **Blockout art.** The shed and crane are boxes, the hull has no detail, the trees are blobs, and the sky is flat haze.
3. **One fixed shot.** A small hull sits in a wide frame and nothing moves the eye.

### 0. Base

Commit the basin, pier and figures as they are now: the Lab build, docs and captures updated. That gives each later stage a clean diff. This happens only on Tom's yes to this plan.

### 1. The wave wall (first: the biggest risk)

The sim keeps the physics, but the hit gets an art-directed source, and the basin is shaped to grow the wave.

- **Impact source.** At the hit, `canal.js` adds a volume pulse along a curve on her outboard side.
  - The curve is a 12 m wide Gaussian ridge, about 120 m long, bent slightly toward the pier so the wall focuses there.
  - Its volume scales with the Drop and her impact speed, injected over about 1.2 s.
  - A tiny sink over the whole basin takes the volume back over 20 s, so the mean level stays at 0.
  - This is one extra uniform pair in the height pass (a source line and a strength), with no new pass.
- **A shoal.** A rubble apron raises the bed from 6 m to about 1.5 m over the last 40 m before the pier head. By Green's law the crest grows by about 1.4x. It also slows and steepens, so it breaks on the pier.
- **The breaking crest.** Where the front is steep and the water shallow, `main.js` emits spray along the crest. The sim's foam already marks the front white.
- **Targets**, measured with the 0.15 s peak probe:

  | Where | Drop 1.5 | Drop 2.4 |
  |---|---|---|
  | Crest mid-basin | about 1.5 m | about 2.5 m |
  | Overtopping the pier deck (1.0 m) | from Drop 1.2 up | sheets across the head; the crowd runs back |

- **Arrival.** About 14 s after the hit.
- **Show Tom:** the probe numbers and a strip of four frames.

### 2. The camera sweep

The move is a timed track keyed to the launch, in `main.js`: eased keyframes, eye and aim each on a Catmull-Rom curve.

| Beat | When | Camera |
|---|---|---|
| Waiting | Before the cut | High and wide: 40 m over the north quay, about 230 m out. The whole basin, the yard and the low sun. Still, so idle does no per-frame work. |
| Cut and slide | About 5 to 8 s | A long crane move down and in toward the pier, following her as she slides. |
| Tip and hit | | It arrives at 3.5 m in the crowd, broadside on, and pushes in a little on the spray sheet. |
| The wave | About 14 s | It holds on the wall crossing toward the lens. As the wall breaks over the pier it sinks to about 1.8 m, so the wall stands over the lens. |
| Settle | About 25 s | A slow rise and pull back to a wide aftermath frame. It ends still. |

- **Drag** adds a look offset on top of the track, as now.
- **Again** flash-cuts back to the waiting shot.
- **Reduced motion:** no sweep. Three hard cuts (wide, pier, wide), each one still.
- **Tall stages** get their own keyframes: higher, closer and narrower on the hull.
- **Show Tom:** a contact sheet of eight frames across the whole move, still in blockout.

### 3. Light

- **Sky:** `shared/sky.js` (`skSky`, `skClouds`, thin cover) replaces the toy's own sky. The sun sits about 5 degrees up, behind the yard.
- **Light shafts:** `shared/clouds.js` (`clShaftsField`, `clShaftLook`). The mist volume is the occlusion field, so the backlit spray throws shafts of sun. Railgun is the reference.
- **Flare:** `shared/flare.js` (`flFlare`), covered when the sun is behind the hull, the spray or the shed.
- **Grade:** `shared/grade.js` (`gradePass`), for a warm tint, a light vignette and grain.
- **Sun path:** a glitter path on the water toward the sun, from `wtGlint` with a wider spread.
- Everything is imported from `shared/`. Nothing in `shared/` changes.

### 4. The detail pass (reference first)

Before modelling, I open the reference photos and drawings:
- the Commons side-launch set already in the plan;
- coaster general-arrangement drawings;
- hammerhead and level-luffing cranes at Dutch yards;
- yard sheds with corrugated walls.

In order, with a capture to Tom after each:
1. **Hull.**
   - Shape: the sheer line, a raised forecastle with a bulwark and anchor pockets, the hatch coaming and pontoon covers.
   - The aft house in tiers: windows, bridge wings, the funnel, the mast with lights and radar, and the rails.
   - A baked canvas texture: plate seams, weld lines, draft marks, rust streaks and window glass. There is no name on the hull.
2. **Crane and shed.**
   - The crane: a lattice tower and jib from instanced struts, a counterweight and a cab.
   - The shed: corrugated walls (a normal pattern in the shader), a roof with skylights, and big doors open on a warm-lit inside.
3. **Yard.**
   - Visible cradles and poppets under the hull, plate stacks and a mobile crane.
   - Workers on the berth as figure cards.
4. **Harbour.**
   - Warehouses and a moored ship on the north quay, a tug standing off, and a light at the mouth.
   - A polder skyline of poplar rows and a spire silhouette. No real names.
5. **Water:** wind bands of chop across the basin, and Ponlai-style lace foam behind the wall.

### 5. Budget and rules

- **Frame:** 12 ms mean or less at 1280 x 800 through the hit on the RTX 3070 (D3D11). Each program stays small.
- **Link:** about 7.5 s for all programs.
- **Loop and sound:** the existing rules hold. Lively until calm or 75 s, then drifting at 30 fps, asleep after 60 s, and hidden stops everything. Sound stays muted by default.
- **Quality ladder:** pixel ratio, then the mirror, mist and shaft sizes, then the counts.

### Files

| File | Change |
|---|---|
| `shiplaunch/canal.js` | Impact source, shoal bed, sink |
| `shiplaunch/main.js` | Camera track, beats, the crest spray, sky, shafts, flare, grade |
| `shiplaunch/yard.js` | Hull lines and topsides, crane, shed, yard, harbour |
| `shiplaunch/props.js` | Figure cards for the workers, the tug |
| New `shiplaunch/paint.js` | Baked hull texture |

Docs: `docs/toys/shiplaunch.md` and `docs/plans/shiplaunch.md` (a "Sweep" section, with Tom's words), the bean, and the QA captures.

### Cost and risks

**Cost:** about $120 to $200 across the stages, in this session.

**Risks:**
1. **The source looks staged.** Mitigation: tie it to the measured impact speed, and keep the shoal doing half the work.
2. **Link time** for the sky, shafts and flare. Mitigation: separate passes, and shafts at half size.
3. **The detail pass swallows the session.** Mitigation: hull first; Tom judges after each part.
4. **Tall phone stages.** Mitigation: their own keyframes, checked at 375 x 812.

### Verification

- `python -m http.server 8012`, then headless Edge (`channel: 'msedge'`, D3D11) with the existing scratch scripts:
  - `peak.mjs`: wave peaks and the overtop;
  - `pov.mjs`: the frame strip;
  - `qa.mjs`: Q2 to Q10, frame times and captures.
- Each stage ends with captures sent to Tom before the next starts.
- Before each commit:
  - Q1 `node --check` on every module;
  - the console is clean;
  - Q4, Q5 and Q9 show the loop sleeps and the audio context suspends.
- Commits go through `tools/commit.sh` with my own paths. Run `git log origin/main..main` as a separate step before each push.

## Tom's answers (2026-11-23, in the dialog)

| Question | Answer |
|---|---|
| Light | Low winter sun, low behind the yard: gold backlit spray, long shadows, haze |
| Camera | Far quay, in the crowd: the wave breaks over the quay at the lens's feet |
| Main slider | Drop, 0.6 to 2.4 m |
| Hull | Short-sea coaster, 88 m, green over red-brown, white house aft, bunting |

Open for later, not blocking: the toy's display name ("Ship launch") and the Flemish name draft ("Tewaterlating") for Tom's review in `toys.json`.
