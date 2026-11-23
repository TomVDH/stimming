---
# stimming-dl2w
title: 'Toy: Whiteout'
status: in-progress
type: feature
created_at: 2026-11-23T12:23:47Z
updated_at: 2026-11-23T13:30:00Z
parent: stimming-oh7b
---

Build Whiteout (idea 209, group C, a cinematic diorama) as a Lab toy: an MVP at high fidelity, Bar v3. Toy id whiteout. A polar hut on an ice field at night in a blizzard. The storm breathes in gusts: the hut fades nearly to nothing and returns. Tap the door lamp: a warm cone pours into the driving snow, every flake streaks through it, the glow halos in the haze. Plan: docs/plans/whiteout.md. Toy doc: docs/toys/whiteout.md.

- [x] Plan at docs/plans/whiteout.md
- [x] Reference photos of the real thing
- [x] Blockout on the stage, screenshot at 1280 x 800 (docs/qa/whiteout/01-blockout.jpg)
- [x] Hero moment: gusts breathe, lamp switches on, cone in the snow
- [x] Sound: muted by default
- [x] Bar v3 spec and copy
- [x] Icon round spike-whiteout-1 (Current, A, D), emblems, sheet row
- [x] Intro emblem, favicon, toys.json entry, Lab tile with GSAP hook
- [x] QA Q1 to Q10, docs/toys/whiteout.md
- [ ] Tom sets the Dutch name
- [ ] Record the session cost

Stack type: Environment-like, raw WebGL2 (shared/gl.js, bloom from shared/glow.js, flare from shared/flare.js, grade from shared/grade.js, detail from shared/detail.js). No shared module changed; new shared files are this toy's emblem and favicon only.

## Defaults chosen (Tom's open questions: 3D or flat, and the presentation)

- 3D, one fixed camera: a long lens (about 20 degrees) at eye height, 25 m from the hut. The lens stacks the snow between the camera and the hut.
- The set: a small orange box hut on skids with a snow roof, one door, one window, the lamp over the door; a mast with three guy wires behind it on the right. The door faces the lee; the windward face carries rime.
- Night: a dim blue-grey storm glow, a moon behind cloud in the upper right. The window glows faintly warm. The lamp is the one warm key.
- Wind from the right, a little toward the camera, so the snow crosses the cone.
- The first frame: the storm between gusts, the hut clear, the lamp off.
- Gusts come by themselves (6 to 21 s apart, more often in a strong wind). A gust front crosses the set from the right; at its peak the hut at 25 m falls to about 2 percent.
- The lamp: an incandescent bulkhead, about 2700 K. On a cold start the contact flickers twice; the filament heats in 60 ms and glows red as it cools.
- Bar v3: Lamp (Space, aria-pressed), Gust (G), Wind slider 0 to 100 (default 62). Tap the stage switches the lamp; hold or drag keeps a gust.
- Icon: no pick existed. Round whiteout-1 (Current, A, D); A is on the menu; the intro emblem is A's emblem.
- Draft Dutch name: Sneeuwjacht /ˈsneːuʋjɑxt/ (blowing snow). Accent oklch(0.78 0.13 70), the lamp's warm tone.

## Reference

Photo searches for polar huts in blizzards: Scott's hut in a whiteout (blue-grey, low contrast, no horizon), a rimed hut with its lamp glowing through blowing snow (the halo, the white feathers), an Antarctic hut in its own pool of light at night, an Antarctic field hut with a mast and guy wires.

## QA (headless Edge, D3D11, RTX 3070)

- Q1: node --check passes on the five modules, the menu scripts and the icon page.
- Q2: clean console in play (lamp, gust, slider, both sheets), on the menu with the tile hovered, and on the icon page.
- Q4: drifting 63 rAF in 2 s (30 fps); asleep 0 rAF in 2 s.
- Q5: hidden tab: 1 rAF in 2 s (the frame in flight), then none.
- Q6: reduced motion: clean console; 0 rAF at rest; the storm stands still; a tap fades the lamp on.
- Q7: Lamp, Gust, Wind slider (3 controls); How to play has 4 rows.
- Q8: Space switches the lamp; G sends a gust.
- Q9: the context runs after a gesture and is suspended at rest.
- Q10: frame times through a switch and a held gust: median 7.6 ms, p95 8.3 ms.
- Load: first frame 774 ms after navigation, shader links included.
- tools/fxc could not time these shaders: its HLSL stub reports a redefinition of the PS_OUTPUT members. The load time stands in.
- Captures: docs/qa/whiteout/.

## Commits

- a8c999cf: the toy, toys.json entry, plan, toy doc, QA captures, intro emblem, favicon, bean.
- 6d027bcb: the menu Lab tile and hook, icon round whiteout-1, emblems, sheet row.
- Both pushed to origin/main on 2026-11-23; `git log origin/main..main` listed only these two.
