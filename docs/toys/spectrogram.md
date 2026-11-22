# Spectrogram (`spectrogram/`)

| | |
|---|---|
| Dutch | Spectrogram /ˌspɛktroːˈɣrɑm/ (draft) |
| Motto | None |
| Shelf | Lab, tag "Stimming Lab" |
| Stage | None |
| Series | None |
| Accent | `oklch(0.78 0.13 300)` |
| Sound | Yes |
| Legacy build | No |
| Signed off | No |

## Idea

Idea 54, group B: play a small synth; the sound scrolls past as a waterfall of colour. Bean `stimming-cj6s`. Plan: [spectrogram.md](../plans/spectrogram.md), an MVP.

## Rules

- One instrument, three voices, one paper. No modes.
- The waterfall reads the synth's own voice model, not an `AnalyserNode` and never the microphone. Mute suspends the audio context, so an analyser would go blank; the model draws the same picture muted or not.
- The paper runs only while a note sounds. A drawing stays on screen when you stop, and the loop sleeps.

## Direction

- Flat. Pitch runs up the stage on a log scale, C2 at the foot to C7 at the top, so the note sits under the finger and its overtones stack above it and close up.
- Time runs right to left. The pen is a thin cold slit at about three quarters of the width; the live partials throw light to its right.
- Each voice takes its hue from its pitch class, once round the wheel per octave: a sweep paints a rainbow, a chord paints several colours.
- Fresh ink burns white at the pen. Age blurs it, lifts and sways it like smoke, cools it to indigo, and fades it.
- A faint noise floor rides the paper; a faint rule marks each C.

## Controls

Bar v3, from the `bar` spec in `initPage()`.

| Slot | Holds |
|---|---|
| Choice | Voice: Glass, Reed, Bow; stored as `stimming.spectrogram.voice` |
| Actions | Clear (C): the paper runs out fast to the left, with a soft rush |
| Slider | Trail: how far the ink lasts; stored as `stimming.spectrogram.trail` |
| Settings | Quality (shared) |

| Input | Does |
|---|---|
| Hold on the stage | Plays a note; its height is the pitch, further right is brighter |
| Drag | Bends the note and changes its brightness |
| Click | A short pluck |
| Keys A to K | A minor pentatonic, A2 to D4; hold several for a chord |
| Touch | Each finger plays its own voice |

## Voices

| Voice | Partials | Release | Picture |
|---|---|---|---|
| Glass | Seven, soft, falling fast | 0.6 s | Few lines, a long fade |
| Reed | Odd only, 1/k | 0.2 s | A brush with gaps |
| Bow | All, 1/k | 0.3 s | A dense brush |

- A held note grows a 5.5 Hz vibrato after a third of a second.
- The low-pass closes on release, so upper partials die first.
- Each onset puffs a faint broadband stripe, the chiff.

## Sound

Raw Web Audio on the shared kit, muted by default. Each voice: a `PeriodicWave` oscillator from the voice's partial table, a low-pass biquad that tracks brightness, a gain that follows the model's envelope, a pan from the pointer. A short synthetic room (convolver). The chiff is filtered noise. Clear plays a falling rush. High notes play softer. Each note jitters in level.

## Tech

| File | Holds |
|---|---|
| `voice.js` | The voice model (glide, vibrato, envelope, cutoff) and its Web Audio voice |
| `paper.js` | The ring writer: one log-pitch column per step, partials splatted with their ink |
| `render.js` | Raw WebGL2: the ring texture (512 x 2048 RGBA16F, mips), the ink pass, bloom, grade |
| `main.js` | Bar, pointer, keys, frame loop, the first-frame phrase |

- The ring holds 512 pitch rows by 2048 time columns. Each frame uploads the new columns and rebuilds the mips; the ink pass reads by age.
- The model steps once per column, so fast sweeps stay continuous.
- First frame: a short phrase (a bowed rise, a reed chord, a glass arpeggio, a bowed fall) is written at load.
- Slow frames step the pixel ratio down, then the bloom to three levels.

## Frame loop

- Lively while a voice sounds, while the paper coasts, or during Clear. Then the loop stops; nothing drifts.
- Hidden: the loop stops, every voice lets go and the context suspends.
- Reduced motion: no vibrato, no smoke sway or lift, still grain. The paper still runs while you play.

## QA (2026-11-22)

Headless Chromium, ANGLE GL, Tom's PC. Captures in `docs/qa/spectrogram/`.

| Check | Result |
|---|---|
| Q1 syntax | Pass: the four modules and the menu scripts |
| Q2 console | Clean on the toy and on `?lab` |
| Q4 idle | 0 frames in 2 s after the intro and after play |
| Q5 hidden | 0 frames in 2 s |
| Q7 bar | Three controls; four How to play rows |
| Q8 keys | A, F, H play a chord; C clears |
| Q9 sound | Running in play, suspended after settle |
| Q10 frames | 16.6 ms mean, 16.8 ms p95 during a drag |

## Open

- 3D or flat: flat by default, stated in the bean.
- The Dutch name and the IPA are drafts.
- The icon pick: A of spike `spectrogram-1` is on the menu until Tom picks.
- No listen-through yet: the sound needs Tom's ear.
