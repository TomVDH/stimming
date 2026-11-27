---
# stimming-al27
title: 'Star Chart: the disk pass crashed Edge and Zen (D3D compile)'
status: completed
type: bug
created_at: 2026-11-25T08:26:01Z
updated_at: 2026-11-27T07:19:52Z
parent: stimming-e35i
---

Tom, 2026-11-25: "it crashes on edge and zen -- earlier today we had great performance". Same cause as Tornado Alley: D3D11's compiler (FXC) on one huge program.

Measured with tools/fxc (d3dcompiler_47 at ANGLE's level), SKY compile time:
- 5bb1c7e9 (2026-11-24 18:02, ran well): 18.0 s; 71f15fa3: 15.4 s
- a19320b5, the brown dwarf deck: 32.9 s (four pasted copies of the cloud code)
- eff01090, the quasar's Worley clouds: 28.0 s on its own line
- main at d8fdc758: 44.5 s; every other program waits behind it

- [x] Measure every program and bisect SKY's growth
- [x] The dwarf deck as one copy in loops D3D cannot unroll
- [x] SKY in versions: an unused feature uniform becomes a zero constant; the first star's version before the first frame, the rest in idle time
- [x] Every version measured: 1.1 to 7.2 s on a busy machine, against 44.5 s; none near the crash. Plain stars sit about 5 to 6 s: the shared surface code is the floor
- [x] Every object renders as before (35 objects, contact sheet), console clean; first frame 3.3 to 3.7 s headless, was about 48 s
- [ ] Land on main (Tom's word)
