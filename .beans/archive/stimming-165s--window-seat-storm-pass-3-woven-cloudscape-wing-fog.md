---
# stimming-165s
title: 'Window seat: storm pass 3 (woven cloudscape, wing fog, fewer beads)'
status: completed
type: task
created_at: 2026-11-09T09:30:37Z
updated_at: 2026-11-09T09:30:37Z
parent: stimming-w1nd
---

Tom: few drops stick outside in a storm; lightning slightly less often; merge the deck with the storm clouds, weaves of cloud everywhere; layered volumetric fog on the wing inside a storm cloud, noise mapped.

- [x] Rain: beads strip in a storm, runs stay
- [x] Lightning less frequent
- [x] Deck weaves and heaves into towers; towers spread a foot into the deck; mid layer in bands
- [x] Near volumetric fog over the wing, streaming aft
- [x] Storm 0 checked against main; cost measured

## Summary of Changes

- Rain: bead density x (1 - 0.8 Storm); runs keep uRain.
- Lightning: cell rate 0.1 + 0.32 Storm (was 0.15 + 0.5); deck flashes (Storm - 0.3) per s (was x1.6).
- Deck: weave() bands along the wind and towerSkirt() swell set per main sample (gWeave, gSkirt); cover and tops lift with them; ceiling rises to DECK_HI + 6 Storm. Storm deck and mid layer take the towers' murk light. Mid layer runs in bands, thicker.
- Towers: a lobed foot (2.4 rc wide at the base) spreads each tower into the deck; no extra sink.
- nearFog(): ten mid-step samples over 1 to 30 m of streaky layered noise in world space (uWisp), lit by murk, strobe and nav light; on the wing and on the open view when uFog > 0.05.
- Storm 0: one pixel differs from main by 1/255 (float rounding); otherwise identical.
- Cost at Storm 1, 2496x1368 High, interleaved A/B vs main: +0.8 ms median tower share, +1.4 ms on the min; in fog 0.7 the frame matches main (5.3 vs 5.3 ms).
