# Spectrogram (`spectrogram`)

Status: in progress, 2026-11-22. Bean: `stimming-cj6s`. Idea 54, group B, in `docs/toy-ideas.md`.
Size: MVP at high fidelity (Tom's brief for the Lab run): one hero moment, finished.

## The toy

Play a small synth with the pointer. The sound paints itself as light: the note and its overtones draw bright lines at the pen, the paper carries them away to the left, and they cool and dissolve like smoke. Sweeps draw curves, a held note grows a vibrato wave, a chord draws a lattice. You draw with sound.

## Defaults, and why

| Question | Default | Why |
|---|---|---|
| 3D or flat | Flat | The drawing must read. A 3D landscape bends every stroke; flat keeps the pen under the finger. Depth comes from the smoke, not from a camera. |
| Renderer | Raw WebGL2 (Shader type) | A ring texture, one ink pass, a bloom chain and a grade. No scene. |
| Instrument | Theremin pad | Height is pitch, continuous. Left to right is brightness: few lines on the left, a dense brush on the right. Keys A to K play eight notes of A minor pentatonic; hold several for a chord. Touch: each finger is a voice. |
| Pitch axis | Log, C2 to C7 up the stage | The fundamental sits under the finger. The overtones stack above it and close up, so one stroke is a brush of parallel hairs. |
| Time axis | Right to left | The pen is a slit at three quarters of the width. The past runs left. |
| Paper | Runs only while a note sounds | The drawing stays on screen when you stop. Idle is a still picture, and the loop sleeps. |
| Colour | Each voice takes a hue from its pitch class, round the colour wheel once per octave | A sweep paints a rainbow; a chord paints several colours. Age cools every line toward deep indigo. |
| Voices (choice) | Glass, Reed, Bow | Glass: few soft partials. Reed: odd partials only, so the brush has gaps. Bow: every partial. Each is a different picture, not a mode. |
| Slider | Trail | How far the ink lasts before it dissolves. |
| Action | Clear | The paper runs out fast to the left, with a soft rush. |

## How it differs from Sonar and Prism

- **Sonar** (`sonar/`) has a passive waterfall: a red phosphor CRT, frequency across and time down, fed by a scripted sea. You watch it; you only knock the hull. Spectrogram is an instrument: you make every line, it is full colour, and it is light painting, not a console.
- **Prism** (`stimming-k7x5`, `stimming-p3bf`) shows the spectrum of light: one sharp line per wavelength at an instant, with nm ticks. Spectrogram shows sound over time, with no ticks, no numbers and no axes.

## The signal

Mute suspends the audio context (`shared/stim.js`, `audioKit`), so an `AnalyserNode` goes blank when muted, as Sonar's plan found. The waterfall therefore reads the synth's own voice model: each voice is a table of partials through a two-pole low-pass and an envelope. The page sets the same numbers on the Web Audio voice (a `PeriodicWave` oscillator, a `BiquadFilterNode`, a gain). So the picture is the exact spectrum of what you hear, muted or not, with no microphone.

## Tech

1. **Voice model** (`voice.js`): glide, delayed vibrato (5.5 Hz, onset after 0.35 s), attack and release, a filter that closes on release so upper partials die first, an onset chiff.
2. **Paper ring**: an RGBA16F texture, 512 log-frequency rows by 2048 time columns, with mips. Each frame writes the new columns (interpolated between frames, so fast sweeps stay continuous) with `texSubImage2D`, then rebuilds the mips.
3. **Ink pass**: one full-screen pass reads the ring by age. Age blurs the line (mip level), lifts and sways it (smoke), cools its hue and dims it. The slit at the pen throws the live partials to the right as light.
4. **Bloom and grade**: `shared/glow.js` chain, filmic curve, vignette, grain.
5. **First frame**: a short phrase is written into the ring at load, so the stage opens painted.

## Sound

Additive voice per note: `PeriodicWave` from the voice's partial table, a low-pass that tracks brightness, an envelope, a pan from the pointer. An onset chiff of filtered noise. A short synthetic room (convolver). Clear plays a soft rush. Muted by default; every hit jitters in pitch and level.

## Frame loop

- Lively while a voice sounds, while the paper moves, or during Clear.
- The paper eases to a stop 0.5 s after the last release tail; then the loop stops. Nothing drifts.
- Hidden: the loop and the voices stop at once.
- Reduced motion: no smoke sway or lift, no grain motion. The paper still runs while you play.

## Tasks

1. Blockout: the ring, the ink pass and the pen, with the scripted phrase. Screenshot at 1280 x 800.
2. Voices, pointer, keys, the bar.
3. Shading to finish; sound to finish.
4. Icon round `spike-spectrogram-1`, emblems, intro emblem, favicon.
5. `toys.json`, Lab `<li>` and hook.
6. QA Q1 to Q10; toy doc; commit.
