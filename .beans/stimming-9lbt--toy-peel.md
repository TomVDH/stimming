---
# stimming-9lbt
title: 'Toy: Peel'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-10T06:26:45Z
updated_at: 2026-11-10T10:44:51Z
parent: stimming-oh7b
---

Build Peel from docs/plans/peel.md (rank 3 in docs/plans/fidgets.md). F2: yes, Pop field's proposal untouched (Tom, 2026-11-09). It starts in the Lab. Peel a film off a glowing surface: it curls, the surface comes up crisp, a faint blue line runs along the peel front; flick to tear it off. Bar v2.

- [ ] Task 1: sheet mesh, peel model, base, haze (blockout); checkpoint with Tom
- [ ] Task 2: stick-slip, slack, tear-off and flutter, + Sheet, Newton's rings; Tom tries the feel
- [ ] Task 3: shadow, two-sided shading, Tape and Holo, the blue line
- [ ] Task 4: sound: hiss, crackle, squeal, rip, flutter; Q9
- [ ] Task 5: Settings, persistence, performance ladder; Q1 to Q10
- [x] toys.json entry and menu Lab entry with an icon and a GSAP hook
- [ ] Tom sets the Dutch name
- [ ] Record the session cost

## Notes

- Tom said "go" on 2026-11-10 after Ice tray; Peel is next by rank (Rain stick set aside).
- Task 1 blockout (2026-11-10): raw WebGL2, camera straight down. A base pass draws the glowing surface, the film's haze where it still lies (grey, dimmer, orange-peel texture, dust, bubbles), a shade just past the front, and the dark bezel. A 96 x 96 grid draws only the peeled flap: a curl of radius R, then a free run back over the film at angle beta, two-sided (Screen milky, Tape amber, Holo rainbow with a white paper back). The first frame has a tab lifted at one corner. Dragging the tab moves the front by about half the pointer's travel; the film never re-sticks. + Sheet lays a fresh sheet with a tab at another corner. Tack, Glow and the shadow pass are stubs for Tasks 2 and 3. Only the tab is grabbable for now.
- Dutch name draft: Aftrekfolie. Tom sets it.
