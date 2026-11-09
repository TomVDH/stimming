---
# stimming-by83
title: 'Prism: Bar v2 port'
status: completed
type: task
priority: normal
created_at: 2026-11-09T08:20:23Z
updated_at: 2026-11-09T08:27:22Z
parent: stimming-ubwe
---

Move prism/index.html to Bar v2. Brief: docs/plans/bar-v2-migration.md. Migration epic: stimming-80dc. legacy.html stays on v1.

## Control map

| v1 control | v2 slot | Why |
|---|---|---|
| + Piece tray (7 kinds) | Top left: choice `Piece`, tray with icons; a pick adds that piece | Adding pieces is the main verb; same pattern as Galaxy's Add tray |
| Light: White, Red, Green, Violet | Settings: row `Light`, segments with colour dots | One choice group per bar; diegetic lamp switch proposed below |
| Clear | Bottom left: `clear`, key C | Shared verb |
| Style: Solid, Wireframe | Settings: toggle `Wireframe`, persist (keeps the old key `stimming.prism.wire`) | Tweak a person wants back |
| Quality | Settings: site row | Shell |
| Reset | Settings footer | Clear shows, so Reset moves |
| dl.how | Key strip: drag move, drag ring turn, scroll resize, delete remove | Four entries; ring drag works on touch too |
| Classic link | Top right (shell, from `legacy`) | Shell |

## Diegetic check
Proposal: the lamp carries its own light switch (tap the lamp body to step White, Red, Green, Violet; key L). It would replace the Light row. Build only on Tom's yes.

## Checklist
- [x] Read brief, spec, Galaxy, Prism
- [x] Play v1 at 1280 and 375
- [x] Port to one bar spec; delete dead CSS and JS
- [x] Fix: burst adds stack pieces on one spot
- [x] Fix: halo and sensor pictures under the v2 corners
- [x] Check at 1280 and 375 in the pane
- [x] Diegetic still to Tom
- [x] Commit, push, tick prism in stimming-80dc

## Summary of Changes

Prism passes one bar spec to initPage. Piece tray top left, Clear bottom left (key C), Light and Wireframe in Settings, Reset in the footer, four-entry key strip. Classic link comes from the shell. Fixed: fast adds piled pieces on one spot; a full table dropped new pieces on the base prism; halo offsets broke inside the shell frame; sensor pictures sat under the top-left corner. Diegetic lamp switch proposed with a still; not built.
