---
# stimming-8oqo
title: 'Soup cauldron: liquid redo: paddle wake, trail bubbles, staged soup shader'
status: completed
type: task
created_at: 2026-11-22T10:40:11Z
updated_at: 2026-11-27T07:19:52Z
parent: stimming-fskg
---

Tom, 2026-11-22: quick streaks should make marbling with bubbles in the trail; redo and refactor the liquid shader. Tom: "go" (no further brief).

- [x] Paddle wake: a quick stroke (over 0.7 soup units a second) sheds an eddy each 8 cm, one side then the other, as an oar does. Lamb-Oseen vortices; they drift with the soup, spread and fade over about 1.4 s (sooner in thick soup). `DYE_FS` adds their swirl to `flow()`, so the colours fold into marbling along the stroke
- [x] Trail bubbles: air pulled under at the blade's edges comes up as small domes (6 to 16 mm). They ride the eddies, gather in their hearts and pop with a small ring. They share the bubble array: 20 slots for the boil, 44 for the trail
- [x] NaN fix: `pow(1.0 - x, n)` with x a hair over 1 gave NaN on bubble caps; the bloom clamped it into white glare with a black dot. All eight Fresnel terms use `om(x)`, clamped to 0 to 1
- [x] Bubble caps mirror the lamp at roughness 0.12, capped at 0.5, as drops do
- [x] `shadeSoup` in four stages on one `Soup` record: `soupSurface`, `soupBody`, `soupGloss`, `soupDetail`. Pixel-identical before and after (300 frames, seeded, fixed clock: 0 pixels differ)
- [x] Compile on D3D11 after the redo: S pass about 10 s, the last pass about 8 s offline under load; first frame in the pane at about 10 s, console clean
- [ ] Tom checks it live: the stroke, the marbling, the trail bubbles
