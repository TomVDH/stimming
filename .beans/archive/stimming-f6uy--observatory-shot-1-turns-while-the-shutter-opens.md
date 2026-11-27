---
# stimming-f6uy
title: 'Observatory: shot 1 turns while the shutter opens'
status: completed
type: task
priority: normal
created_at: 2026-11-18T03:02:29Z
updated_at: 2026-11-27T07:19:52Z
parent: stimming-wqq9
---


Tom, 2026-11-17: the first shot shows more dome, Villeneuve scale: the dome turns and the hatches open slowly while it pivots. Shutter 10 s; the cupola turns to the star during the opening; shot 1 low and close from the slit's side.

- [x] SHUTTER_S 6 to 10 (also the small domes)
- [x] The cupola steps to the star in the open phase; test
- [x] Shot 1 framing low and close, slit's right
- [x] Shot 1 holds 6.5 s of the 10 s opening, shot 2 the last 3.5 s (Tom, 2026-11-22: bigger turn)
- [x] Shot 1 locks ahead of the slit by half its turn, at most 4.5 degrees
- [ ] Tom's look; tune with the Dev camera rows

## Check, 2026-11-22
- In shot 1 the cupola turns from 1.1 to 354.5 degrees, up to 2 degrees a second.
- The shutter goes from 0 to 0.5 in shot 1 and from 0.5 to 1 in shot 2.
- On screen the plate seams drift and the leaves part under the locked camera.
- Open: the turn is about 7 degrees, so the motion is slow. Tom decides if it is enough.

## Bigger turn, 2026-11-22
- The cupola now turns about 9 degrees in shot 1, was 7. The shutter reaches 0.72.
- The slit turns toward the eye, through the frame's middle.
- The cupola's 2 degrees a second limits the turn. That value is in core/machine.ts.
- A 30-degree lead brings the slit round to face the eye. EDGE_LEAD tunes that.
