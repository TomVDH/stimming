# Bar v2 migration: every toy

Tom, 2026-11-09: move every toy to Bar v2, five at a time. Be diligent, fix bugs, truly upgrade, and look for diegetic controls.
Spec: [bar-v2.md](bar-v2.md). Standard: `AGENTS.md`, "Control bar standard". Reference port: `galaxy/index.html`.
Bean: `stimming-80dc`. One session per toy. The orchestrating session starts the next batch when a batch lands.

## Per toy, in order

1. **Read first.** The toy's `index.html`, its bean if any, `docs/plans/bar-v2.md`, `galaxy/index.html`, `tests/bar-v2.html`.
2. **Play it** in the browser pane at 1280 px and 375 px before you change anything. Note every bug and every rough edge.
3. **Map the controls** onto the slots. Write the map in the toy's bean before you code:

   | v1 control | v2 slot | Why |
   |---|---|---|

   Keep at most five visible controls. Everything else goes in Settings. Persist settings that a person would want back (`persist: true`).
4. **Diegetic check.** Ask: does a control belong inside the scene? Examples: a dial on the TV tree, a knob on the Oscilloscope, a crank on the Music box, a switch on the Neon sign, a lever on the Gear train, a chain on a lamp.
   - A diegetic control draws on the toy's canvas, under the shell layer, and is grabbed by the pointer like any other part of the toy.
   - It replaces a bar control, never duplicates it. It needs a keyboard path too: a key in the key strip.
   - If it fits, propose it to Tom with one still, and build it only on his yes. If it does not fit, say so in one line.
   - A toy whose own on-screen legend teaches its keys sets `keys: false`.
5. **Port.** Replace `<header data-shell>`, `.bar`, `dl.how` and local tray or popover code with one `bar` spec to `initPage`. Delete the dead CSS and JS.
6. **Fix and upgrade.** Fix the bugs from step 2. Upgrade where it is cheap and clearly better: idle pages do no per-frame work, 30 fps or better, `prefers-reduced-motion`, sound muted by default. Keep every look Tom approved.
7. **Check** in the browser pane at 1280 px and 375 px: placement, the narrow layout, sheets, keys, Escape, reload keeps persisted values, a clean console. Leave Tom's tab on the plain toy page.
8. **Commit and push** through `tools/commit.sh`, one logical commit at a time. Tick the toy in the migration bean.
9. **Report** in three short lists: what moved where, bugs fixed, diegetic proposal (or "none fits").

## Rules

- `legacy.html` (Classic) pages stay on v1. Only `index.html` moves.
- Never edit `shared/stim.js` or `shared/stim.css`. The orchestrating session owns the shell. Send it a shell bug or a missing hook with `SendMessage` to `local_c4166dbd-e1ff-4f85-bd91-ad5bbd12bb8a`: one line of repro, one line of the need. Work on the rest of the toy while you wait.
- Never touch another toy's files. Commit only your hunks of shared files (`index.html`, `toys.json`).
- No Playwright. Check in the built-in browser pane.

## Batches

| Batch | Toys |
|---|---|
| 1 | pop, prism, pins, fidget, morpher |
| 2 | domino, eyes, fire, glass, rain |
| 3 | bubbles, kaleido, ferro, neon, scope |
| 4 | magnet, soap, chladni, pendulum, pool |
| 5 | putty, walker, balloons, lava, tvtree |
| 6 | coil, cube, dandelion, flap, flock |
| 7 | frost, gears, harmono, harp, marble |
| 8 | musicbox, orbits, plasma, sand, slime |
| 9 | snow, tesseract, top, zipper, trails |
| 10 | chamber, shadyos, glow, foil, sequin |
| 11 | oilslick, ink, sonar, subway, trainride |
| 12 | fireworks, windfarm, window, viaduct, sunbeam |

Batches 10 to 12 hold toys with their own live sessions. Those move in their own session when it is free.
Already on v2: galaxy, ulam, launch, bench, canal, washline, windmap, meteor, flametest, rubens, bismuth, lichtenberg, vortex.
