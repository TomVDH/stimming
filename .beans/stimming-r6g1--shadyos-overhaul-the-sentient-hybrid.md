---
# stimming-r6g1
title: 'ShadyOS: overhaul, the sentient hybrid'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-16T08:17:15Z
updated_at: 2026-11-16T09:18:09Z
---

Follows stimming-shdy. One look: an evil, sentient, possessed hybrid of the glass-era Windows desktop and the brushed-aqua Mac desktop. Parody nods only (Tom, 2026-11-16). Every word lives in shadyos/content.yaml (js-yaml 4.1.0). Absorbs stimming-j1lw, stimming-yb20, stimming-balv.

- [x] Phase 1: split modules, content.yaml with js-yaml, defaults, bad-YAML notice
- [x] Phase 2: the hybrid look (menu bar with eye, dock, left gel beads, bendy shadows, wallpaper)
- [x] Phase 3: window framework, desktop icons, context menu, orb menu, balloons, bin drop
- [x] Phase 4: apps (terminal, files, bin, mines, patience, player, control panel, task manager, chat)
- [x] Phase 5: boot, crash screen, panic curtain, shut down, safe mode, wait cursors, Konami
- [x] Phase 6: screensavers (lineup, pipes, stars, bounce, mystify, waffles)
- [x] Phase 7: settings (haunt, hum, trail, boot), dev rows, sound pass
- [x] Docs: AGENTS.md libraries and layout, docs/plans/shadyos.md
- [x] QA: 1280, 375x812, 812x375, bar-v2 test (reduced motion, idle stop, sound and real-device fps move to stimming-lyw3)
- [x] PR merged (#66)

## Notes

- 2026-11-16: QA in the hidden pane with ?qa pump: 1280, 375x812, 812x375, every app, crash, curtain, boot, five savers, card cascade, jelly drag with the bending shadow, bad-YAML notice. No page errors. tests/bar-v2.html: ShadyOS passes; three shell tests fail (narrow moves, narrow slider, values survive), not in ShadyOS code.
- Open: sound listen and real-device fps with Tom; Tom's look verdict.

## Summary of Changes

ShadyOS is one sentient look: a hybrid of the glass-era and aqua-era desktops. The page split into modules (main, gl, paint, sound, eggs, savers, apps). It has 13 apps, a boot, a blue crash, a grey curtain, Shut Down, Safe Mode, Not Responding, Konami cheats and six screensavers. Every word lives in shadyos/content.yaml, read by js-yaml 4.1.0; defaults.js is the fallback, rebuilt by tools/shadyos-defaults.mjs. Settings: Haunt, Hum, Trail, Boot screen; Dev rows force each egg.
