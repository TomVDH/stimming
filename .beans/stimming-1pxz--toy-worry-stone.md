---
# stimming-1pxz
title: 'Toy: Worry stone'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-10T06:26:45Z
updated_at: 2026-11-10T08:58:09Z
parent: stimming-oh7b
---

Build Worry stone from docs/plans/stone.md (rank 4 in docs/plans/fidgets.md). Waits on F3. It starts in the Lab. Rub a rough stone to polish it; its play of colour wakes and slides with the light; Wet previews the polish, then dries. Bar v2.

- [x] Task 1: Labradorite body, height, polish buffer, shading (blockout); checkpoint with Tom
- [x] Task 2: Agate, Obsidian, wet buffer, splash, drying
- [x] Task 3: sound: rub that smooths with polish, splash, pour, knock; Q9
- [x] Task 4: Settings, persistence, performance ladder; Q1 to Q10
- [x] toys.json entry and menu Lab entry with an icon and a GSAP hook
- [ ] Tom sets the Dutch name
- [ ] Record the session cost

## Task 1 notes (2026-11-10)

- Blockout pushed: Labradorite body bake, dome and dip, polish buffer with rub(x, y, v), light follows the pointer. Agate and Obsidian, Wet and splash are stubs.
- Draft Dutch name: Piekersteen, for Tom to set.
- Tom said yes to the blockout on 2026-11-10.

## Task 2 notes (2026-11-10)

- Agate (carnelian, blue lace, grey palettes; glow through thin edges) and Obsidian (black mirror, rainbow flow sheen).
- Wet buffer at quarter size: splash, Wet, beads that roll downhill, drying from the rim, water lingers in the dip.
- A kind change opens on a known stone with one stroke; + Stone is fully rough. Both clear polish and water.
- Q4: the loop stops about 11 s after the last water; no frames in the next 2 s.

## Task 3 notes (2026-11-10)

- Raw Web Audio on kit.out, as Spark wheel does; no Tone.js needed.
- Rub: low grainy noise with crackle on rough stone; a higher, quieter hiss as polish rises; a faint squeak near full polish. A coarse CPU copy of the polish (96 x 80) tells the sound the surface under the pointer.
- Splash: a rising-chirp drop, a short hiss, bead spatter. Wet: a pour that pans across. + Stone and a kind change: a soft double knock.
- Q9: the context runs after the gesture and is suspended about 1.5 s after the water dries. Tom still has to listen.

## Task 4 notes (2026-11-10)

- Mild bloom: the shading pass writes linear light; a quarter-size soft threshold and two blur rounds; a composite does vignette, tone map and grain.
- Performance ladder: after 4 s, an average above 1/38 s for 2 s steps down. Rung 1: pixel ratio 1. Rung 2: bloom at an eighth size. A quality change clears it.
- Grit persists under stimming.stone.grit. Agate band edges use low octaves only, so they stay smooth.
- A frame's dt can no longer go negative on wake.
- QA: Q1 syntax passes. Q2 console clean. Q4 and Q9 pass (Task 2, Task 3). Q5: hidden page, no frames in 2 s. Q7: 3 controls, 4 key rows. Q8: keys 1, 2, 3, W and N work. Q6 reduced motion checked in code only: the light stays at rest, no beads.
- Q10: 30 batched frames in a probe, synced once: 2.4 ms a frame at 2560 x 1600 (High), 0.9 ms at 750 x 1624. Tom checks fps on a real device.
- Session cost: not readable from the session; Tom records it.
