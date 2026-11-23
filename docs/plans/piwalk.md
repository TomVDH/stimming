# Pi walk (`piwalk`) implementation plan

Status: built as a Lab MVP (2026-11-22) · Bean: `stimming-dl9i` · Toy doc: [piwalk.md](../toys/piwalk.md)

**Goal:** Each digit of pi takes one step in one of ten directions. The walk draws itself from the centre and grows into a long, branching path like a coastline.

**Architecture:** Flat, raw WebGL2 on `shared/gl.js`, bloom from `shared/glow.js`. A module worker computes the digits with the Chudnovsky series in BigInt (binary splitting), first 5,000 and then 250,000. The page turns the digits into points once. The GPU draws each step as one instanced line of light into a float target, with additive blend, so the places the walk crosses again glow brighter. Then bloom and a grade.

**Spec:** idea 51 in [toy-ideas.md](../toy-ideas.md), group B; batch rules in [README.md](README.md); Bar v3 in [bar-v3.md](bar-v3.md).

| | |
|---|---|
| Size, estimate | S to M · $15 to $25 |
| Kits | None. The grade follows Epicycles' `FINAL` pass. |
| Before the build | nothing |

## References

- Francisco Aragón Artacho's walks on real numbers (CARMA gallery): pi in base 4, 100 billion steps, light on black, colour along the index. The well-known poster.
- Nadieh Bremer, "Exploring the art hidden in pi" (2015): pi in base 10, ten directions of 36 degrees, colour by digit. Colour by digit tangles; colour by index reads as growth.

## Defaults (Tom's open question: 3D or flat, and the presentation)

- **Flat, face on.** A walk is a plane figure. A 3D camera adds nothing true and hides the branching.
- **Light on black,** as the poster. Each step is a fine line of light; lines add, so knots and crossings glow.
- **Colour follows the index,** on a calm ramp: deep indigo at the start, through blue and sea teal to pale gold and a soft coral at the head. The ramp spans the walk drawn so far, so the full gradient always shows.
- **The head is a white-hot point;** the last few dozen steps burn brighter and cool into the ramp.
- **Ten directions like a dial:** digit 0 points up, each next digit 36 degrees clockwise.
- **The pace grows with the walk:** 5 steps a second at the start, then faster in proportion to the steps drawn. About 72 s for 250,000 digits. The view zooms out at a near-constant rate.
- **The readout:** the last digits and the count, small, in the top right corner, quiet grey with the newest digit white. The brief asks for it; it is the one piece of copy on the stage.

## Interaction

| Input | Does |
|---|---|
| Tap, Space | Pause or go on. At the end: start again. |
| Hold | Rush: the pace eases up to 12 times while held. |
| R | Start again from the centre. |
| Slider Pace | 0.25 to 4 times the pace, log scale. |

## Sound

- One soft note per step, pitched by its digit: a pentatonic over two octaves, 0 low to 9 high. A rounded mallet on glass, rendered once into ten buffers.
- Pan follows the head across the stage.
- Past 14 steps a second the notes thin to 14 a second, shorter and softer; a low air bed rises with the pace.
- At the last digit: a soft open chord. Then the context sleeps.

## Frame loop

- Lively while the walk draws, while the view eases, or within 2.5 s of input.
- At the end, or paused: one last frame, then the loop sleeps. No ambient drift.
- Reduced motion: no smooth zoom (the view steps), the head has no flare, and the pace is the same.

## Tasks

1. Digits worker and its test (node: matches a Machin series at 20,000 digits).
2. Blockout: the walk on the stage, flat colour. Screenshot.
3. Hero: ramp, head heat, density, zoom, readout, end beat.
4. Sound.
5. Bar v3, icons, emblem, Lab entry.
6. QA Q1 to Q10.
