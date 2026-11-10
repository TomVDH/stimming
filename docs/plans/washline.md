# Washing line (`washline`): full redo spec

> Bean `stimming-d1vq`. Tom picked this direction on 2026-11-10. It replaces the first plan (sheets against the sky), the seven anime scenes and the Coen dioramas. Their pages stay in git history.

**Goal:** you hang the washing yourself on a pulley line. Reel it out over a gap, watch it glow with the sun behind it, and pull pegs until a piece flies away.

**Look:** cinematic wide. The line sits in a big place, and the place sets the mood. Each place has its own anchors, camera and light.

**Tech stack:** three.js 0.170 (the importmap word for word), simplex-noise, Tone.js through `kit.tone()`, Bar v2 through `initPage({ id: 'washline', bar })`.

## Kept and dropped

| Kept | Dropped |
|---|---|
| Unclip and fly | Travelling gust field |
| Backlit glow: overlaps mix like stained glass | Flap cracks |
| Hang it yourself, on a pulley line | Every old look and scene: anime, dioramas, sky only |
| Strangereal, built fully new | Iso view |

## Loop

1. **+ Piece** puts a garment at the near pulley, held by two pegs.
2. **Drag the line** to reel it. The pegs ride the line, so the washing travels out over the gap.
3. **Tap a peg** to pull it off. With one peg the piece flags. With none it flies away.
4. **Drag a piece** to pull it. It swings back when you let go.
5. **Release** takes every peg off at once.
6. The **Sun** slider moves the sun from in front to behind. From behind, the cloth glows.

## Places

Three to start, then more. Tom signs off each place before the next one.

| Place | Anchors | Camera | Light |
|---|---|---|---|
| Alley (first) | Two shuttered windows high on facing walls | Street level, down a narrow street | A strip of sky over the line |
| Garden | Pulley on the house wall, out to a pole | Set back across the lawn | Open sky |
| Beach | A hut and a post | Low, toward the sea | Low sun over the sea, behind the line |
| Strangereal | A rooftop line | Out over a city vista | Blue hour; a jet furball far off |

## Bar (Bar v2)

| Slot | Content |
|---|---|
| Choice | Segments: one per place |
| Actions | + Piece, Release |
| Slider | Sun |
| Keys | `[DRAG LINE] reel` · `[CLICK] unclip` · `[DRAG] pull` |
| Settings | Wind: Calm, Breeze, Blowy · Quality (shared) |

## Files

- `washline/index.html`: the page. It builds the bar, the renderer and the loop.
- `washline/core.js`: the K4 Verlet rope and cloth, lifted from the old Classic page (`K4`, `windAt`, `windForces`, `step`).
  It adds the pulley: each peg holds an arc-length position on the rope, and reeling shifts every position.
  It also holds the pegs, picking, a steady noise breeze and the two-pass backlit cloth material.
- `washline/places/<id>.js`: one module per place. It exports the camera, two pulley anchors, sun, sky, grade and `build(scene)`.
- The old `index.html`, `diorama.html` and `legacy.html` move to `washline/archive/` with noindex (assumption; Tom to confirm). `toys.json` sets `legacy: false`.
- `washline/probe-sr.html` stays as it is.

## Tech notes

- **Pulley:** the rope is pinned at both pulleys. Reeling adds a length to every peg's arc position. A piece stops at the far pulley.
- **Cloth:** the old cloth draws in two order-free passes: a multiply pass for light through the cloth and an add pass for the front light. Overlaps multiply.
- **Wind:** a steady breeze plus simplex noise. No gusts that travel.
- **Free cloth:** gravity, wind and drag only. It is removed 20 % beyond the frame.
- **Clamp:** each particle steps 0.05 units at most, so a hard yank cannot blow up the solver.

## Sound

Reel ratchet, peg click, fly-away whoosh and a quiet ambience for each place. Muted by default.

## Reduced motion and idle

- Reduced motion: wind at 30 %; a fly-away fades out.
- Idle: 30 fps; 60 s after the last input the wind eases to calm and the loop sleeps.

## Tasks

- [ ] R1: core plus Alley blockout; old pages archived; checkpoint with Tom.
- [ ] R2: hands on: reel, + Piece, unclip and fly, cloth drag, Release.
- [ ] R3: backlit glow; Alley sign-off.
- [ ] R4: Garden; sign-off.
- [ ] R5: Beach; sign-off.
- [ ] R6: Strangereal, fully new; sign-off.
- [ ] R7: sound.
- [ ] R8: Bar v2 Settings, persistence, QA at 1280, 375 × 812 and 812 × 375; `tests/bar-v2.html` passes.
