---
# stimming-9lcg
title: 'Toy: Ice tray'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-10T09:04:15Z
updated_at: 2026-11-10T09:41:55Z
parent: stimming-oh7b
---

Build Ice tray from docs/plans/ice.md. Tom picked it on 2026-11-10 in place of Rain stick. It starts in the Lab. Twist a tray of ice: cracks flash, cubes pop loose, slide and throw caustics on a wet table; Dump and Refill. Bar v2.

- [x] Task 1: tray, cubes, table, light, twist (blockout); checkpoint with Tom
- [x] Task 2: bonds, cracks, pops, rigid bodies, flick, Dump, Refill; Tom tries the feel
- [x] Task 3: three ices, core, bubbles, frost, crack planes, caustics, wet mirror
- [ ] Task 4: sound: creak, crack, pop, clink, knock, slide, refill; Q9
- [ ] Task 5: Settings, persistence, performance ladder; Q1 to Q10
- [x] toys.json entry and menu Lab entry with an icon and a GSAP hook
- [ ] Tom sets the Dutch name
- [ ] Record the session cost

## Notes

- Task 1 blockout (2026-11-10): tray built from merged boxes, twisted on the CPU about its long axis, so shadows follow; cubes in cells ride the twist; two cubes lie loose on the table in the first frame. A sideways drag twists the tray through a spring; release springs it back with a little overshoot; a tap knocks it rocking. Ice is plain transmission for now (Task 3 adds core, bubbles, frost, cracks). Stubs: Dump knocks hard, Refill fills the tray; Table Dry only roughens the table. Waits on Tom's checkpoint.
- Dutch name draft: IJsblokjesvorm. Tom sets it.

- Task 1 passed Tom's checkpoint (2026-11-10: "Yes, build Task 2").
- Task 2 (2026-11-10): bonds break past strain for 80 ms, ends first; strain tires a bond, so a held twist frees a stubborn cube. A crack flashes a white sheet inside the cube. Cracked cubes pop when the twist eases to 70 % of its peak, up and out over the nearest long side. Loose cubes are rigid bodies: eight corners against the table (or the tray rim, which they slide off), spheres against each other, bounds the camera sees, sleep after 0.3 s still. Drag a loose cube to push it; release flicks it; a tap flicks it away with a spin. Dump flips the tray over its front edge and throws the cubes; Refill melts loose cubes away and grows new ones in the cells. Checked in a probe at desktop and 375 px: all cubes settle and the loop sleeps; console clean. Tom has not tried the feel yet.

- Task 2 passed Tom's checkpoint (2026-11-10: "Yes, build Task 3").
- Task 3 (2026-11-10): the ice shader marches ten steps through each cube in its own space: a streaked cloudy column (Cloudy, Juice), bubble trails, Clear's air band at the bottom. A crack is one plane found analytically, bright edge-on, frayed by noise; it flashes once and stays. Fresh cubes carry frost on top that fades about 6 s after they leave the tray. Caustic patches lie on the far side of each loose cube from the key and turn with it. Wet table: dim mirror copies of the tray and cubes, faded with depth, drawn before the real ones. The point flash from Task 2 stays. Stills of each ice checked at desktop and 375 px; console clean.
