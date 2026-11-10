# Spark wheel (`spark`) implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. One fresh session builds this toy, task by task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** A knurled steel wheel rests on a flint, close up, in the dark. Flick it and a fan of sparks sprays out, forks into stars, hits a wet floor, skids and cools to embers. The ratchet of the knurl clicks under every flick.

**Architecture:** three.js 0.170 as a thin host. The wheel and flint are two small meshes with a procedural knurl shader. Sparks are K6 burst particles, lifted from Fireworks and given gravity, drag, a floor bounce and a fork on burn. A warm point light sits at the contact point and follows the spark rate. Bloom and grade come from K2.

**Tech stack:** three.js 0.170 (WebGLRenderer, EffectComposer, UnrealBloomPass, OutputPass), Tone.js through `kit.tone()`.

**Spec:** idea 102 in [toy-ideas.md](../toy-ideas.md); rank 1 in [fidgets.md](fidgets.md); batch rules in [README.md](README.md); Bar v2 in [bar-v2.md](bar-v2.md).

| | |
|---|---|
| Size, estimate | S to M · $12 to $20 |
| Kits | K6 burst particles from `fireworks/index.html` (`K6: burst particles` to `end K6`). K2 bloom and grade from the same page. |
| Before the build | F5 in [fidgets.md](fidgets.md): the wheel and flint only, no lighter body |

## The shot

Black space with a faint cool haze. The knurled wheel sits at the left third, a little above the middle, seen three-quarter on. A short grey flint presses up into it from below.
A cool rim light from the upper right picks out the knurl. The lower third is a wet black floor that mirrors everything above it.
Nothing else is in frame: no lighter body, no thumb, no fuel, no brand.

The first frame is a picture: the knurl glints in the rim light, a thin smoke wisp rises from the flint, and five or six embers on the floor glow orange and fade to deep red over 8 s.

## Hero moments

1. **The flick.** A hard flick spins the wheel. A fan of sparks leaves the contact point along the rim's direction of travel, and the knurl flashes warm in their light.
2. **Stars.** Ferro sparks burst in flight into small stars of three to eight children, each with a tiny pop.
3. **The floor.** Sparks hit the wet floor, skid, split and slow. Their mirror images streak in the wet surface. They cool from yellow-white to orange to deep red, then go dark.
4. **Grind.** Hold Grind for a steady shower. Embers carpet the floor and the warm light pool breathes with the spark rate.

## Loop

- **Drag across the wheel:** the pointer's speed along the rim sets the wheel's spin. A downward flick throws the sparks to the right and down.
- **Tap:** a short strike: one quarter turn, a small spray.
- **Hold Grind (or Space):** the wheel runs at a steady speed, as a grinder does.
- **Release:** the wheel spins down on friction over about 1 s; the spray thins with it.
- **Untouched:** no drift. The loop sleeps when the wheel stops and the last ember goes dark.

## Bar (Bar v2)

| Slot | Content |
|---|---|
| Top left | Choice: Metal, `segments`: Ferro, Steel, Titanium (keys 1, 2, 3) |
| Bottom left | Action: Grind, held (`hold: true`), key `Space` |
| Bottom right | none |
| Bottom centre | Keys: `[DRAG] flick the wheel` · `[CLICK] strike` · `[HOLD SPACE] grind` |
| Settings | Trails (slider: streak length, as a shutter) · Floor: Wet, Dry (choice) · Smoke (toggle) · Quality (shared) |
| Settings footer | Reset: stops the wheel and clears every spark and ember |

Two visible controls. The stage is the toy.

| Metal | Spark | True detail |
|---|---|---|
| Ferro | yellow-white, short, many forks into stars | Cerium alloy fragments shatter as they burn. |
| Steel | orange streaks, each ending in a star-shaped carbon burst | High-carbon steel bursts; the spark test reads carbon by the bursts. |
| Titanium | long, brilliant white streaks, few forks | Titanium burns hot and white. |

### At 375 px

- The wheel moves to the top centre; the sparks fly down onto the floor in the lower half.
- Spark counts halve. Touch targets are 34 px.
- The choice moves bottom left as a stepper; Grind moves bottom right.

## Physics

| Item | Rule |
|---|---|
| Wheel | Angular speed ω with inertia. Friction slows it with τ about 0.35 s. A drag sets ω from the pointer speed along the rim, through a stiff spring. |
| Teeth | 36 knurl teeth. Tooth rate = ω · 36 / 2π. |
| Emission | Each passing tooth scrapes 0 to 3 particles (Ferro 2, Steel 1.5, Titanium 1 on average). No sparks below 4 teeth per second. |
| Launch | From the contact point, along the rim's tangent, at 1.5 to 3 times the rim speed, in a 12° cone. |
| Flight | Gravity, plus air drag proportional to speed squared. Small sparks slow faster. |
| Burn | Each spark has a life of 0.4 to 1.6 s and a temperature that falls from 2200 K. Colour comes from a blackbody ramp. |
| Fork | Ferro and Steel sparks may burst once in the last third of life: 3 to 8 children, short life, in a sphere. |
| Floor | y = 0. Restitution 0.35, sliding friction 0.6. A hot Ferro spark may split on impact. |
| Ember | Below 1000 K a spark stops streaking. It sits on the floor as a point that cools to dark in 2 to 4 s. |

## Tech

**K6 lift.** Copy `K6: burst particles` from Fireworks into a marked section, then change:

| Item | Fireworks | Spark wheel |
|---|---|---|
| Motion | ballistic, written once per burst | CPU integration per spark (drag, floor, fork), uploaded each frame |
| Count | 48 000 slots | 6 000 (3 000 at 375 px and on the lower rung) |
| Ramps | firework salts | one blackbody ramp per metal |
| Streak | trail from velocity | trail from velocity times the Trails setting |

**Wheel.** A cylinder with a procedural diamond knurl: two sets of grooves from `fract()` on angle and height, as a normal map. Steel shading with one cool rim light. The knurl turns with ω; the body light does not.

**Flint.** A short grey cylinder with a rough, dusty shader. It shortens by a hair every 200 teeth and stops at half length. Reset gives a fresh flint.

**Contact light.** One warm PointLight at the contact point. Its intensity follows the spark rate through a 60 ms envelope, so the knurl and the floor flash.

**Floor.** A plane with a mirror of the spark streaks: draw the streak layer a second time, flipped at y = 0, blurred and faded with distance. Dry swaps the mirror for a matte light pool.

**Smoke.** Six to ten soft sprites rise from the contact point and drift. Only with Smoke on.

**Post.** K2 bloom with a threshold so only sparks bloom, then the grade with grain and a vignette.

## Sound

- **Knurl:** one tick per tooth, a 2 ms noise click through a 4 kHz bandpass. Above 25 teeth per second the ticks merge into a rasp: band noise amplitude-modulated at the tooth rate.
- **Strike:** a short scrape with a dull body knock on each new flick.
- **Pops:** a 1 to 3 ms pop for each fork, panned by x. At most 40 per second.
- **Floor:** a faint sizzle when hot sparks hit the Wet floor.
- Pitch, time and level jitter on every hit. Muted by default.

## Finesse

- The sparks leave along the rim's direction of travel. Reverse the flick and they spray the other way.
- The knurl flashes warm with the spray and falls back to cool steel.
- Small sparks slow and die first; the long survivors are the big ones.
- Mirror images in the wet floor streak toward the viewer.
- The flint wears down over a long session.

## Reduced motion and idle

- **Reduced motion:** no forks, half the count, shorter trails, no contact-light flash. The wheel still answers a flick.
- **Idle:** lively while the wheel turns or a spark burns. It sleeps when the wheel stops and the last ember is dark. No ambient drift; the still frame keeps its rim light.

## Review focus

1. **A flick that leaves the stage:** capture holds; `lostpointercapture` lets the wheel spin down.
2. **Grind held with a tab switch:** window blur releases the hold, and the hidden tab stops the loop and pending sounds.
3. **Tooth rate at full speed:** the tick scheduler never queues more than 25 single ticks; the rasp takes over.
4. **Spark slots:** a long Grind recycles the oldest embers first, never live streaks.

## Tasks

### Task 1: Blockout (checkpoint)

**Files:** Create `spark/index.html`, the `toys.json` entry and the menu Lab entry with a low-fi icon and its `toys.spark` hook. Commit shared files with `--hunks`.

**Produces:** `wheel` (`{ omega, angle }`), `spin(dω)`, the knurl shader, the floor, the first-frame embers.

- [ ] Wheel, flint, floor, rim light, smoke wisp and first-frame embers. A drag spins the wheel. No sparks yet.
- [ ] Bar v2 spec with Metal, Grind and the Settings rows wired as stubs.
- [ ] Q1, Q2 and stills at 1280 and 375 px. Checkpoint with Tom.
- [ ] Commit: `Spark wheel: blockout, a knurled wheel on a flint`.

### Task 2: Sparks (K6 lift)

**Produces:** marked `K6` with `emit(n, pos, vel, metal)`, `stepSparks(h)`, forks, floor bounce and embers; the contact light.

- [ ] Lift and change K6 as in the table. Three metals, forks, floor, embers, mirror.
- [ ] Q4: the loop sleeps after the last ember. A still of each metal mid-spray. Checkpoint with Tom.
- [ ] Commit: `Spark wheel: sparks, stars and embers`.

### Task 3: Sound

- [ ] Knurl ticks and rasp, strike, pops, sizzle. Q9.
- [ ] Commit: `Spark wheel: knurl ticks and spark pops`.

### Task 4: Finish and QA

- [ ] Trails, Floor, Smoke and persistence. The performance ladder: pixel ratio 1, then the bloom buffer, then the spark count.
- [ ] Q1 to Q10 in the browser pane. Tick the bean and record the cost. Commit.

## Kit handoff

K6 gains CPU flight with drag, a floor bounce and a fork on burn, as options of `emit()`. A grinder, welding or forge toy can copy it from here.
