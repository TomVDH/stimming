---
# stimming-btcm
title: 'Window seat: wingtip light and blue hatching in fog'
status: completed
type: bug
priority: normal
created_at: 2026-11-22T09:10:22Z
updated_at: 2026-11-22T09:54:46Z
parent: stimming-w1nd
---

Tom, 2026-11-22: the wingtip lighting and the blue hatching in fog.

Seen at Midnight, Storm 1, in a fog bank (wwib QA, panels 6 and 7).

- The red nav light tints the whole fog bank. The view goes red from edge to edge.
- St Elmo's fire paints the winglet face in regular violet stripes. Two crossed sines in world space make the stripes. The edge test passes the whole winglet face.

- [x] The nav light glows only round the tip in fog
- [x] The corona hugs the edges and flickers without a regular pattern
- [x] Before and after at 1280 px, Midnight, Storm 1, fog
- [x] 375 x 812 and 812 x 375; clean console; reduced motion
- [x] Tom's look (2026-11-22: "Yes, commit both")

## Fix (2026-11-22)

- The near fog scaled the steady nav light about 100 times over the far fog (0.25 against 0.0024). At night the dark bank took the nav colour everywhere. The right seat turned it green, which confirmed the source.
- Now the nav light falls off as the square of distance, with a 2 m core, at 0.03. The strobe keeps its wide flash. `window/shader.js` nearFog and `window/wing3.js` fog glow match.
- The corona was two crossed world-space sines, and the tip term lit the whole winglet face.
- QA headless (ANGLE GL), against port 8000. Port 8002 on 127.0.0.1 belongs to another http.server.

## Rebuild after Tom's question (2026-11-22: "how would this show up as a corona on a composite metal wing?"; "Yes, rebuild it")

On a composite wing, charge leaves at sharp conductors: static wicks first, then thin trailing edges and the winglet top. The blunt leading edge stays dark.

- Seven static wicks, 18 cm rods: three on the aileron (they turn with it), one on the fixed tip, three up the winglet trailing edge.
- A brush at each wick tip: a small hot core, a violet fan of filaments, a 24 Hz sputter. Each wick lights and dies over a few seconds on its own; a strike lights all of them.
- The brushes draw after the outside pass (`wing3.glow`, one render call in `window/index.html`). The outside pass fills every bare pixel, so a brush drawn with the wing was lost against the sky.
- The skin glow stays only on the trailing edges and the winglet top, weaker and patchy, at least about 1.5 px wide.


## Summary of Changes

- In a night fog bank the nav light glows only round the wingtip (717f84aa).
- St Elmo's fire burns at seven static wicks on the outer trailing edges and the winglet, with a faint patchy glow on those edges. The leading edge stays dark.
- The brushes draw after the outside pass, in `wing3.glow`.
