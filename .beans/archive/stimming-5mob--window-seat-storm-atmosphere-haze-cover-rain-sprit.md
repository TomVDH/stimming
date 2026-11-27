---
# stimming-5mob
title: 'Window seat: storm atmosphere (haze, cover, rain, sprites, fog banks)'
status: completed
type: task
created_at: 2026-11-09T09:07:00Z
updated_at: 2026-11-09T09:07:00Z
parent: stimming-w1nd
---

Tom: storm must make the sky hazy, far more cloud cover, rain, lightning in clouds and up high, spooky, sometimes thick fog that hides the view. All scaled by the Storm slider; Storm 0 stays as approved.

- [x] Haze: sky and horizon turn milky and dim
- [x] More cover: deck, mid layer, cirrus close up; up to 8 towers
- [x] Rain: window rain from Storm; rain streaks outside
- [x] Lightning: more strokes, deck flashes all round, red sprites up high
- [x] Fog banks that come and go
- [x] Storm 0 pixel-identical to main; cost measured

## Summary of Changes

- Pass 1: stormAir() puts haze and fog over every layer; stormGlow() lights the murk round each flash; fogAt() streams wisps past the window; sprites() draws red tendrils under a crown 50 to 90 km up. A thick bank skips the far view.
- Pass 2: rainStreaks() races drops aft in three layers; window rain follows Storm up to heavy.
- JS: Storm closes the deck (uCover), fills the mid layer and cirrus, hides the aurora, dims the sun or moon flare. MAXCELL 8, MAXFL 6. Flashes flicker with more strokes; deck flashes all round; sprites over far cells (1 in about 8 s at Storm 1). Fog episodes: 5 in 10 sim minutes, thick 8 % of the time. Test hook ?fog=0..1 holds the fog.
- Storm 0 is pixel-identical to main (AE 0).
- Cost at Storm 1 (interleaved A/B vs main, 2496x1368): High full frame +0.5 ms (min) / +0.8 ms (median); Standard +0.2 to +0.4 ms. Inside a thick bank the frame is cheaper than main.
