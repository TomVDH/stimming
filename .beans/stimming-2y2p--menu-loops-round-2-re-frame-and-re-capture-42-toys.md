---
# stimming-2y2p
title: 'Menu loops round 2: re-frame and re-capture 42 toys in batches of six'
status: completed
type: task
priority: normal
created_at: 2026-11-16T09:48:53Z
updated_at: 2026-11-16T19:02:30Z
parent: stimming-1rv3
blocked_by:
    - stimming-z7j5
---

Redo the 42 main-shelf stills and loops for the Clock's round tube, in shelf order, six toys at a time (Tom, 2026-11-16).
Tom: "ensure that all loops -- up to 9s long now are very space and computing efficient -- also a bit cropped out (as in zoomed out) -- so the circular tv is neatly filled".

## Rules

- The tube shows the middle circle only, about 80% of the frame's width. The whole subject and its action lie inside it, with a little air.
- Real picture reaches all four edges. Show more of the toy; do not pad a tight crop.
- One framing for a toy's still and loop.
- A loop is 5 to 9 s, 256 x 256, 20 to 24 fps, 40 to 120 KB. All 42 stay under 3.5 MB. A still is WebP 512 x 512, 15 to 50 KB.
- Capture into a scratch folder first (`LOOPS_OUT`, `STILLS_OUT`, `LOOPS_STRIP=1`). Read every strip and still. Then copy the batch.
- `shared/loops/index.json` stays valid at every moment. An old loop stays until its new one is in place.
- At most three browsers at one time.

## Batches

- [x] 1: morpher, pop, fidget, domino, pins, galaxy
- [x] 2: prism, kaleido, ferro, neon, magnet, soap
- [x] 3: glass, chladni, pendulum, pool, putty, scope
- [x] 4: walker, fire, rain, tvtree, balloons, bubbles
- [x] 5: lava, eyes, sonar, trails, shadyos, window
- [x] 6: chamber, ink, windmap, vortex, dijkstra, fireworks
- [x] 7: launch, frietkot, railgun, trainride, foghorn, washline
- [x] Report: one table (id, length, fps, KB, what it shows, recipe, listed), the two folder sizes, the renew commands.

## Round 1 against the 80% circle (from its stills)

| Verdict | Toys |
|---|---|
| Subject cut: zoom out or move the centre | fidget, domino, neon, soap, pendulum, putty, walker, tvtree, balloons, lava, window, frietkot, railgun, washline |
| Subject touches the circle: a little more air | morpher, kaleido, sonar, windmap, galaxy |
| Fine, or a full field | pop, pins, prism, ferro, magnet, glass, chladni, pool, scope, fire, rain, bubbles, eyes, trails, shadyos, chamber, vortex, dijkstra, fireworks, launch, trainride, foghorn |

## Renew commands

```bash
npx -y -p playwright@1.63.0 node tools/stills.mjs [id ...]
npx -y -p playwright@1.63.0 node tools/loops.mjs [id ...]
```

## Summary of Changes

- 42 stills and 42 loops are new, in `shared/stills/` and `shared/loops/`. `index.json` lists all 42.
- Loops: 256 x 256, 24 fps, High profile, one key frame; 18 to 93 KB; 1.9 MB in all (was 3.5 MB). Three are 8 s (pop, ink, railgun); the rest are 5 s.
- Stills: 512 x 512 WebP, 6 to 49 KB; 0.8 MB in all.
- Not framed as asked: lava (cap and base lie outside the circle; the page has no zoom), balloons and domino (a little of the subject lies outside the circle).
- Route finder now uses a random seed, so its still and loop show one city.
- TV tree's loop starts after the page's first all-sets show, so the sets differ as in the still.

## Review sheet

`shared/loops/sheet.html` (noindex) plays every loop in `index.json`, in shelf order. Views: Tube circle (the 80% circle, soft edge), Full square, Still. Only the loops on screen play.

## Round 3 (Tom, 2026-11-16)

- railgun: night (`stimming.railgun.time` 0.03), close on the rock's head; 9 s from two seconds before the strike, through the fireball. The still shows the fireball.
- morpher: zoomed out (the capture shrinks the stage to 72% over its flat colour; `SETUP.css`); 9 s with a dragging pointer, a stretch and two blobs; four shapes show.
- cauldron: new on the main shelf; two things in, a held drag stirs. Its lens always fits the pot, so the rim runs past the circle.
- `tools/capture.mjs`: `SETUP.css`, and a crop above 1 for a stage on a flat colour.
