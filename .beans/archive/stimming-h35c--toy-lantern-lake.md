---
# stimming-h35c
title: 'Toy: Lantern lake'
status: completed
type: feature
priority: normal
created_at: 2026-11-16T21:08:16Z
updated_at: 2026-11-27T07:19:52Z
parent: stimming-oh7b
---

Idea 60 in docs/toy-ideas.md, group C. Tom picked it on 2026-11-16.

Tap to release paper lanterns over a still lake; they rise and reflect.

Rough size: M (a guess; no plan yet).

- [ ] Blockout, signed off by Tom
- [x] Development plan in docs/plans/lanterns.md (Tom took the defaults for D1 to D3, 2026-11-16)
- [ ] Build in the Lab
- [x] QA at 1280 px and 375 px
- [ ] Tom's sign-off

## Progress

- [x] Task 1: the lake at dusk (sky, far shore of hills and pines with six warm windows, a far ridge, calm water, low mist). Stills at Dusk, Blue hour and Night, 1280 and 375 px, console clean.

Rulings in Task 1:
- The page is `index.html` plus `main.js`, as Fog horn is.
- The hour choice is on the bar now, for the stills; the rest of the bar waits for Task 5.
- Chop is 0.05, not 0.08: 0.08 broke the mirror too much.
- On a tall frame the lens widens by the square root of the aspect, and the horizon lifts only 0.04: a wider lens left half the frame black.
- The loop sleeps 60 s after the last input. The 30 fps cap while drifting waits for Task 5.

Tom, 2026-11-16: no head-on view (Train ride, Ten seconds and Fireworks have one). He picked the view from the hill above.
- The eye stands 5 m over a wooded hill, about 60 m over the lake, and looks down.
- The lake is a bowl about 1.4 km long. The land is a raymarched heightfield: low hills that level off near 110 m, slender tiered pines in stands, a smooth canopy far off.
- A lane down the slope keeps the lake clear; pines frame it at the sides.
- The mirror marches the same land, softened by the ripples. The windows are streaks in it.
- The plan's flat `shore(x)` is gone; `coast(p)` and `ground(p)` take its place.
- Open: the march is 128 steps a pixel. Task 5 checks the frame rate on High.

Tom, 2026-11-16: more angles to compare. `?cam=<name>` picks a trial camera: hill (the default), wide, fish, dutch, tele, scope (2.39 letterbox), shore, along, drone. The march now strides over open water, and the pine grid turns 31 degrees, so the far bank shows no fence.

Tom picked `tele` as the camera (2026-11-16): the long lens on the far bank from the hill. A tall frame turns 6 degrees right, so the lit windows stay in it. The other trials stay behind `?cam=`.

- [x] Task 2: sky lanterns and their reflections. Checkpoint stills: one tapped lantern, ten in the air (`?lan=10`), all three hours, 1280 and 375 px, console clean.

Rulings in Task 2:
- With the long lens no near shore shows, so a tap launches from the land or water under it; a tap on the sky finds the far shore under that point.
- The pool and its float texture are `pool`, `release(u, v)`, `stepLanterns(dt)` and `tLan`. The runner calls the texture as a live picture, so each draw uploads the pool.
- A lantern behind the land is hidden by a depth test against the scene's own hit.
- The runner draws no loop with reduced motion, so the lanterns run their own while any is alive.
- Lanterns use the straight lens only; the `fish` trial shows them in the wrong place.
- Each glow fades out inside its cull box, so no square edge shows.

- [x] Task 3: Festival and floating lanterns. Checkpoint: the river at Blue hour (`?fest=60`), floating lanterns at Night (`?float=10`), hold, Clear and Space checked live; 1280 and 375 px, console clean.

Rulings in Task 3:
- A tap on the water sets a floating lantern there (D1). Any other tap lifts a sky lantern from the far shore's water's edge under that point, so it shows at once in front of the trees.
- The festival's river: each lantern climbs at its own rate (0.7 to 1.3) and keeps its own lane in a band that leans right as it climbs and runs off into the haze.
- Clear gives each lantern a random start in the next 1 s and a 0.5 s fade.
- Drag pans 12 degrees and tilts the horizon 0.2 of the frame at most.
- A lantern on the water skips the depth test; the water under it hid its base.
- Festival and Clear are on the bar now; Space sends up a festival. The rest of the bar waits for Task 5.

- [x] Task 4: sound, plain Web Audio on `kit.out` (no Tone.js needed). Lake bed (low noise with a slow swell, and soft laps), release (a paper rustle, then a whoosh as the flame catches; a plop for a floating lantern), Night only (crickets and frogs, far and quiet), and the festival drone (a low chord that follows the festival lanterns still burning). Q9 passed headless: the context runs after the first gesture and is suspended once the page settles. Nobody has listened yet: Tom checks it by ear.

Rulings in Task 4:
- In a festival, one release in four rustles, softly; the drone carries the rest.
- Each release pans with its place on the frame, and its pitch, timing and level vary every time.

- [x] Task 5: bar, menu and QA.
  - Bar v2: Dusk, Blue hour, Night; Festival and Clear; the Wind slider; keys for click, hold, drag and Space. Settings: Mist (Off, Light, Thick), Letterbox, the shared Quality. Dev rows (`?dev`): paper hue, flicker, rise speed, burn time, lantern cap. The hour, the wind and every row persist under `stimming.lanterns.*`.
  - The toy runs its own frame loop: every frame while lanterns burn, 30 fps or less while only the water moves, asleep 60 s after the last input with the sky empty. Only full-rate frames feed the slow-frame watch.
  - `toys.json`: Lab, series `vistas`, draft Dutch name Lantaarnmeer (lɑnˈtaːrnˌmeːr) for Tom. The menu has a Lab entry at the top of the Lab, with a placeholder icon and its GSAP hook.

QA, headless, 2026-11-16:

| Check | Result |
|---|---|
| Q1 node --check, toy and five menu scripts | pass |
| Q2 every control and key, ?dev | console clean |
| Q3 1280, 375 x 812, 812 x 375 | shots taken |
| Q4 drifting / asleep | 12 rAF/s; no frames once asleep |
| Q5 hidden | 0 rAF in 2 s |
| Q6 reduced motion | clean; lanterns show and rise |
| Q7 bar | 4 controls (choice, slider, 2 actions); 4 key rows |
| Q8 keys 1 2 3, Space | each works |
| Q9 sound | runs after a gesture; suspended once settled |
| Q10 160 lanterns, 1280 | Standard 38 fps, High 37 fps (headless at 1x; High at 2x not measured) |
| RF3 20 s hold | stacked at first; starts now spread 12 m, each lantern shows |
| RF4 hour change, 80 up | eases, nothing pops |
| RF5 Clear | out within 1.5 s, in no fixed order |
| tests/bar-v2.html | 102 pass, 0 fail, 6 pane-only skips |

- Cost: the app shows plan limits only (Ultra), not a cost per session. Tom records it.
- Seen in passing, not fixed: the menu's hover warm-up fetches `shared/emblems/<id>.svg` for every toy, so each Lab toy with no emblem logs a 404 (Tornado and Fog horn too).

Final review (fresh reviewer, 2026-11-16). Three Important findings, each fixed:
- At the cap, a burning lantern vanished in one frame (a Festival on Low, or two on Standard). The oldest burning one now fades out in 0.5 s; only past 160 does one go at once. Check: cap 8, ten taps leave 8 burning and 2 fading (failed first, passes now).
- The frog's buzz modulated the envelope's own gain by plus or minus 0.5, about 20 times its peak, and clicked. The buzz now has its own gain stage ahead of the envelope. Checked by reading, not by a test.
- Space needed focus on the stage; on a focused button it pressed that button. Festival now takes Space through the shell's key binder (document-wide, no repeats). Check: Space with no focus, and after Clear, starts a festival (failed first, passes now).

Minors, fixed on Tom's word (2026-11-16):
- Clear fades a lantern already in its ember from its own glow, over 0.5 s. Check failed first, passes now.
- Back in view, the sound wakes with no new gesture, unless it is muted. Checks for both failed or held as expected, and pass now.

`?qa` shows the pool to a test as `window.__lanterns`.
