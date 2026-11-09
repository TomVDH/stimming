# Rubens tube (`rubens`) implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. One fresh session builds this toy, task by task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** A long pipe lies in a dark room with a row of gas flames along its top. A speaker at one end plays the tone you choose. The flames follow the standing wave in the pipe: nodes dip and antinodes leap.

**Architecture:** Raw WebGL2. The CPU computes one height per flame from the standing-wave field and the drum pulses. A flame pass draws the flames into a half-resolution HDR buffer. A short blur chain makes the glow. One composite pass draws the room, the pipe, the floor and the flames, with heat shimmer, glow, grade and grain.

**Tech stack:** raw WebGL2 on the `shared/stim.js` helpers; Tone.js through `kit.tone()`. No three.js.

**Spec:** one of five science-fair toys Tom asked for on 2026-11-09 (with Lichtenberg burn, Smoke ring cannon, Flame test and Bismuth crystals); batch rules in [README.md](README.md); Bar v2 in [bar-v2.md](bar-v2.md).

| | |
|---|---|
| Size, estimate | S to M · $15 to $25 |
| Kits | none. Flame ideas may come from `fire/index.html` as copied code; never import it. |
| Before the build | nothing |

## The shot

A dark room you never see. A long steel pipe lies across the frame, low, on a dark glossy floor. Its left end is closed by a speaker; its right end is capped.
A row of small gas flames burns along its top. The flames are the only light: they warm the top of the pipe, the wall behind them and a long pool on the floor.
Nothing else is in frame: no stand, no hose, no valve, no labels.

The first frame is a picture: an even row of flames, blue at the root and orange at the tip, already lit and flickering.

## Hero moments

1. **The wave appears.** Drag across the stage and the row of flames bends into humps. At each resonance the humps snap tall and sharp; between resonances the row goes ragged and low.
2. **The drum.** Tap and the speaker kicks. A pulse of tall flames runs down the pipe, bounces off the cap and comes back, fading each trip.
3. **Blue to orange.** Short flames burn blue. Tall flames turn yellow and orange at the tip, as rich flames make soot that glows.
4. **The pipe sings.** At a resonance the tone swells, because the pipe amplifies it. The loudest sound and the tallest flames come together.

## Loop

- **Drag:** the pointer's x sets the pitch, on a log scale from 60 Hz to 1100 Hz. Its height sets the loudness: higher is louder.
- **Press:** the tone fades in at the pointer's x within 120 ms. The flames start to move in the same frame.
- **Tap:** the drum. A press that ends as a tap cuts the tone and kicks the speaker.
- **Release after a drag:** the tone rings down over 1.2 s, and the flames settle back to an even row.
- **Untouched:** the flames flicker. After 60 s the gas turns down to small blue pilot flames and the loop sleeps.

## Bar (v2)

| Slot | Content |
|---|---|
| Choice (top left) | Tone, Chord, Tune (`segments`) |
| Actions (bottom left) | Sweep (key S) |
| Slider (bottom right) | Volume: the drive level and the tone's gain |
| Settings | Gas (slider: flow, the flame size) · Fuel: Propane, Methane · Sustain: Off, On · Quality (shared) |
| Keys | `[DRAG] sweep pitch` · `[CLICK] drum` · `[S] sweep` · `[SPACE] drum` |

| Choice | What plays |
|---|---|
| Tone | One sine at the pointer's pitch. |
| Chord | The pitch and its fifth (3:2). Each makes its own wave; the flames show their sum. |
| Tune | A slow melody on the pipe's own harmonics, like a bugle. A drag takes over; the tune comes back on release. |

- **Sweep** glides from the lowest resonance up through ten and back in 8 s, then stops.
- **Sustain On** keeps the last tone after release. A tap still drums; a new drag replaces the tone.

### At 375 px

- The pipe spans 94 % of the width, with the speaker end just inside the left edge. It sits at 62 % of the height, so the flames have room to leap.
- 32 flames instead of 72. The pitch range stops at the mode where each hump still has five flames.
- The choice moves bottom left as a stepper; Sweep moves bottom right; Volume moves into Settings.
- Drag and tap work the same. Touch targets are 34 px.

## Physics

The pipe is L = 1.6 m long, closed at both ends. Both ends are pressure antinodes.

| Item | Rule |
|---|---|
| Speed of sound | Propane 258 m/s, Methane 446 m/s |
| Resonances | f_n = n · c / 2L: propane 81, 161, 242 Hz and up; methane 139, 279 Hz and up |
| Node spacing | λ/2 = c / 2f. Nodes sit half a wavelength apart at any pitch. |
| Pressure field | the steady state of a pipe driven at x = 0: p(x) = cos(k̃ (L − x)) / sin(k̃ L), with k̃ = k (1 − iη), η = 0.02 |
| Flame target | a = 1 − exp(−2.2 · drive · ηkL · \|p(x)\|). Height = gas · (1 + s · (2.2a − 0.45)), where s eases from 0 to 1 while a tone plays. Nodes dip to about 0.55 of rest; antinodes leap to about 2.75. |
| Flame response | each height follows its target with a critically damped spring of about 80 ms |
| Buzz | the tip of each flame trembles in proportion to a, as the gas jets pulse at audio rate |
| Drum pulse | a Gaussian bump that moves at a display speed of 2.6 tube lengths per second, decays with τ 0.9 s and reflects at both ends. A capped end reflects pressure upright, so the bump comes back as a bump. Up to 8 pulses. |
| Colour | soot = smoothstep(0.9, 2.2, height / rest). Short flames stay blue; tall flames grow a yellow-orange tip. |

- The real pulse would cross the pipe in 6 ms. The toy slows it about 100 times, so the eye can follow it. The physics stays true; only the clock changes.
- Methane gives wider humps at the same pitch, because sound is faster in it, and bluer flames, because it makes less soot.

## Tech

**Heights (CPU).** One `Float32Array` of N heights, uploaded each frame as an N × 1 `R16F` texture. N is 72, or 32 at 375 px. The field uses complex `cos` and `sin` on k̃.

**Flame pass.** Half resolution, `RGBA16F`, additive.

1. Each pixel finds its flame index and evaluates that flame and its two neighbours.
2. Shape: a teardrop from the hole. Width grows to 30 % of the height, then tapers. Domain-warped noise moving up gives the flicker and the torn tip.
3. Colour by height in the flame: a thin bright blue cone at the root, a faint violet-blue body, then yellow-orange soot light for tall flames, cooling to deep red at the tip.
4. Each flame flickers at its own rate near 10 Hz, the puffing rate of a small flame.

**Glow chain.** Three dual-filter (Kawase) downsamples of the flame buffer, then up again: a quarter, an eighth and a sixteenth.

**Composite.**

| Layer | How |
|---|---|
| Room | a near-black wall, warmed by the widest glow level above the pipe |
| Pipe | a horizontal cylinder in screen space: steel shading by the angle round its axis, a warm top rim from the glow just above it, a dark underside |
| Ends | the speaker end is a dark cone face that pumps with the drive and kicks on a drum; the capped end is a flat disc |
| Floor | a dark glossy plane. A blurred mirror image of the flames, a warm pool in front of the pipe that follows the local flame heights, and a contact shadow under the pipe |
| Shimmer | above each flame, a noise offset that rises with height bends the flame buffer and the wall glow. It grows with the local flame height. |
| Grade | soft tone map, a vignette and fine grain |

**Ready.** `ready` covers the program link, one height upload and one full frame, then `gl.finish()`.

## Sound

- **Tone:** sine oscillators into `kit.out`, with 30 ms portamento. Gain follows Volume and the pointer's height, plus a resonance boost: near a resonance the pipe sings louder.
- **Gas:** a quiet hiss, band-passed pink noise near 3 kHz, at a level set by Gas.
- **Roar:** brown noise below 300 Hz, at a level set by the mean height above rest.
- **Drum:** a membrane thump near the first resonance with a short noise click, panned left to the speaker. Pitch, time and level jitter on every hit.
- Muted by default. The flames still answer when muted: the field comes from the model, not from an analyser.

## Finesse

- At a resonance the humps are sharp and even; just off it they shrink and go ragged. The resonances feel like notches you find.
- Nodes keep a small blue flame. They never go out.
- The pulse comes back from the capped end upright, and fades each trip.
- The flames light the top of the pipe, the wall and the floor. A tall hump lights its part of the floor more.
- Heat shimmer is strongest above the tallest flames.
- Fuel: Methane gives wider humps at the same pitch and bluer flames.

## Reduced motion and idle

- **Reduced motion:** flicker is slower and smaller, no shimmer, no buzz. The drum gives one soft swell along the pipe, not a running pulse.
- **Idle:** this toy drifts. It runs at 30 fps while only the flames flicker, at full rate while a tone or a pulse is live, and sleeps 60 s after the last input: the gas eases down to pilot flames over 2 s, then the loop stops. Any input turns the gas back up.

## Review focus

1. **Aliasing:** a high mode on 32 flames would show nonsense. The pitch range stops where each hump still has five flames.
2. **A tap that starts as a press:** the tone that fades in on press stops in 40 ms when the gesture ends as a tap, under the drum.
3. **Fuel changed mid-tone:** the pattern moves to the new spacing within the spring time. The pitch stays.
4. **A drag that leaves the stage:** pointer capture keeps the tone; `lostpointercapture` rings it down.
5. **Bloom on many tall flames:** the tone map keeps a full row of tall flames from clipping to white.

## Tasks

### Task 1: Blockout (checkpoint)

**Files:** Create `rubens/index.html`, the bean, the `toys.json` entry and the menu Lab entry with a low-fi icon and its `toys.rubens` hook.

**Produces:** `FLAME_FS`, `COMP_FS`, the glow chain; `field(f)`, which fills the heights for one pitch; `heights` and their upload.

- [ ] Room, pipe, ends, floor, flames, glow and shimmer. Drag sets the pitch on screen only, so the waves can be seen. No sound.
- [ ] Bar v2 spec with the choice, Sweep, Volume and the Settings rows wired as stubs.
- [ ] Q1, Q2 and stills at 1280 and 375 px: the even row, and a resonance. Checkpoint with Tom.
- [ ] Commit: `Rubens tube: blockout, a row of flames on a standing wave`.

### Task 2: Play

**Produces:** the pointer state machine; `drum()`; `pulses`; `sweep()`; Chord and Tune; the pilot-flame sleep.

- [ ] Press, drag, hold and tap per the batch rules. The drum pulse with its reflections. Sweep. Chord and Tune.
- [ ] Q4: drifting at 32 fps or fewer; asleep after 62 s. Q5.
- [ ] Commit: `Rubens tube: drum, sweep, chord and tune`.

### Task 3: Sound

- [ ] Tone with the resonance boost, gas hiss, roar and drum. Q9.
- [ ] Commit: `Rubens tube: the tone drives the flames`.

### Task 4: Finish and QA

- [ ] Fuel, Gas, Sustain and persistence. The performance ladder: pixel ratio 1, then the flame buffer at a third, then 48 flames.
- [ ] Q1 to Q10. Tick the bean and record the cost. Commit.

## Kit handoff

None. The flame pass, marked as a section, suits Flame test or a candle toy later.
