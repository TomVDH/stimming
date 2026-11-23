# Sorting sounds (`sorting`) implementation plan

Status: built as a Lab MVP (2026-11-22) · Bean: `stimming-98c1` · Toy doc: [sorting.md](../toys/sorting.md)

**Goal:** Pick an algorithm. A row of bars sorts itself; each compare and each move lights up and sounds as a tone whose pitch follows the bar's height. A sweep plays the rising scale when the row is sorted.

**Architecture:** Flat, raw WebGL2 on `shared/gl.js`, bloom from `shared/glow.js`. Each algorithm is a generator over one array of bar values. It yields steps: compare, swap, move (take one bar out and set it in further left) and read. The bars are objects: a swap or a move glides them to their new slots, so no bar ever copies or changes height. The sound is Web Audio with pre-rendered struck-glass notes.

**Spec:** idea 9 in [toy-ideas.md](../toy-ideas.md), group B; batch rules in [README.md](README.md); Bar v3 in [bar-v3.md](bar-v3.md).

| | |
|---|---|
| Size, estimate | S to M · $15 to $25 |
| Kits | None. The grade copies Epicycles' `FINAL` pass. |
| Before the build | nothing |

## References looked at

- Timo Bingmann's *The Sound of Sorting* (panthema.net, 2013): white bars, red on access, a triangle wave per comparison with an ADSR envelope. Its sound has an 8-bit feel; its bars copy values in and out of a buffer.
- Mike Bostock's *Visualizing Algorithms* and the "15 sorting algorithms in 6 minutes" video: the access footprint reads best as light that lingers.

What this toy does instead: bars are physical rods that glide and never copy; the footprint is a heat afterglow; the voice is a soft struck glass on a pentatonic scale, so no step is ever a wrong note.

## Defaults (Tom's open question: 3D or flat, and the presentation)

- **Flat, face on.** The toy compares heights. A 3D camera foreshortens the row and the eye loses the order. The floor reflection and the haze give the depth.
- **Rods of light on black glass.** Each bar is a slim glass rod lit from within, its colour set by its height: low bars deep indigo, then violet and rose, high bars warm gold. A shuffled row is a scatter of colours; a sorted row is one dusk gradient rising left to right. The rods stand on a black glass floor that mirrors them.
- **White is the flash.** A compare lights the two rod tips white. A swap or a move heats the whole rod white-hot; it cools back to its colour in about 0.2 s, so the algorithm leaves a wake of light where it works. A pivot or a held key shows as a small cool light on the floor under its rod.
- **48 bars, 32 on a narrow stage.** Enough for the shapes of the algorithms to read; few enough that each tone is a step you can follow at the default speed.
- **First algorithm: Quick.** It is the fastest way to see and hear the idea: the row splits into halves, then quarters, and the pitch contour shows it. The page opens on a shuffled row, lit, and starts to sort when the intro clears.
- **Six algorithms:** Bubble, Insertion, Quick, Merge, Heap, Radix. Merge is in place: a bar moves left into the run and the bars between step right. Radix is LSD in base 4: each pass reads every bar and moves those with digit 0, then 1, then 2 to the front, in order.

## Sound

- **Pitch:** the A major pentatonic, 21 notes from A2 (110 Hz) to A6 (1760 Hz). A bar's height picks its note. No step is a wrong note, so a fast sort is a run and a slow one is a tune.
- **Timbre:** a struck glass bar, pre-rendered per note: partials 1, 2 and 2.76 with a short strike partial, a 3 ms raised-cosine attack, and a decay that shortens with pitch. Two strengths: a soft tone for a compare or a read, a bright tone for a swap or a move.
- **Speed shapes the voice.** At a slow speed each tone rings out. At a fast speed each tone is cut short with an exponential fade, its level falls with the square root of the step rate, and at most four tones start in one frame (moves and swaps first). The fast sorts become a texture, never a roar.
- **Space:** each tone pans with its bar. A short generated room reverb at a low send.
- **No clicks, no clipping:** every tone starts from zero and ends on an exponential fade; a limiter (a compressor at ratio 20, 1 ms attack) sits before the kit's own compressor.
- **Shuffle:** a soft riffle of random notes and a band-passed swish.
- **Sorted:** the sweep plays the scale upward, one tone for each new note, and ends on a soft A major chord.
- Muted by default. The context sleeps when the last tone ends.

## Hero moments

1. **Sort.** The intro clears and the row starts to sort with Quick. Each step lights and sounds.
2. **Pick.** Pick another algorithm: the row shuffles if it is sorted, and the new algorithm starts.
3. **Sorted.** A white light runs left to right; each rod flashes as it passes and the rising scale plays. The row keeps a faint warm sheen until the next shuffle.
4. **Strum.** Drag across the rods: each rod you cross rings its note and flashes, like a glockenspiel.

## Controls (Bar v3)

| Control | Content |
|---|---|
| Choice | Algorithm: Bubble, Insertion, Quick, Merge, Heap, Radix (keys 1 to 6) |
| Slider | Speed: 3 to 1200 steps a second on a log scale; default 60 |
| Actions | Sort (Space: sort, pause, resume), Shuffle (S) |
| How | Tap to sort or pause · Drag across the rods to play them · Space · S |

## Frame loop

- Lively while a sort runs, while rods glide or cool, and during the sweep.
- No ambient drift. When the row is still and cool, the loop stops at once.
- Hidden: the loop and the sort stop; all tones stop.
- Reduced motion: no auto start after the intro; rods jump to their slots; the heat steps off at once; the sweep lights the row in one step with the scale still played.

## Tasks

- [x] Algorithms as generators, with a node test that each one sorts and yields valid steps
- [x] Blockout: rods, floor, bloom; screenshot at 1280 x 800
- [x] Glide, heat, tips, pivot light, sweep, sheen
- [x] Sound: notes, voice budget, limiter, reverb, riffle, sweep, chord
- [x] Bar v3, pointer (tap, strum), keys
- [x] Icons, intro emblem, favicon, Lab tile, toys.json
- [x] QA Q1 to Q10, toy doc
