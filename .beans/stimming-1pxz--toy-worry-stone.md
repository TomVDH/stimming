---
# stimming-1pxz
title: 'Toy: Worry stone'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-10T06:26:45Z
updated_at: 2026-11-10T08:51:42Z
parent: stimming-oh7b
---

Build Worry stone from docs/plans/stone.md (rank 4 in docs/plans/fidgets.md). Waits on F3. It starts in the Lab. Rub a rough stone to polish it; its play of colour wakes and slides with the light; Wet previews the polish, then dries. Bar v2.

- [x] Task 1: Labradorite body, height, polish buffer, shading (blockout); checkpoint with Tom
- [x] Task 2: Agate, Obsidian, wet buffer, splash, drying
- [x] Task 3: sound: rub that smooths with polish, splash, pour, knock; Q9
- [ ] Task 4: Settings, persistence, performance ladder; Q1 to Q10
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
