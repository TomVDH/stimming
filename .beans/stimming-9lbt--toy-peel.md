---
# stimming-9lbt
title: 'Toy: Peel'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-10T06:26:45Z
updated_at: 2026-11-10T10:48:46Z
parent: stimming-oh7b
---

Build Peel from docs/plans/peel.md (rank 3 in docs/plans/fidgets.md). F2: yes, Pop field's proposal untouched (Tom, 2026-11-09). It starts in the Lab. Peel a film off a glowing surface: it curls, the surface comes up crisp, a faint blue line runs along the peel front; flick to tear it off. Bar v2.

- [x] Task 1: sheet mesh, peel model, base, haze (blockout); checkpoint with Tom
- [x] Task 2: stick-slip, slack, tear-off and flutter, + Sheet, Newton's rings; Tom tries the feel
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

- Task 1 passed Tom's checkpoint (2026-11-10: "Yes, build Task 2").
- Task 2 (2026-11-10): pulled taut, the front holds until the pull passes a gap set by Tack (smaller when the pull is fast), then jumps: each jump is a slip event for Tasks 3 and 4. Pulled back, the film goes slack and the flap tilts up so its end stays under the pointer. Let go, it sags back over. A fast throw once a third of the sheet is off tears it away: the sheet leaves flat, lifting, turning and rippling, and fades in about 1 s (reduced motion: it fades in place). A tap on the empty panel or + Sheet lays a fresh sheet that fades in with extra air. A press on the film draws Newton's rings that follow the pointer and fade 0.6 s after release. Tear-off threshold lowered from half to a third (plan updated): half needed a drag across the whole stage. Checked in a probe with synthetic drags: slips, slack lift, sag, tear-off, new sheet, rings; the loop sleeps after each; console clean. Tom has not tried the feel yet.
