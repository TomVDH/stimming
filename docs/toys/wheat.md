# Wheat storm (`wheat/`)

| | |
|---|---|
| Dutch | Tarwestorm /ˈtɑrʋəˌstɔrm/ (draft) |
| Motto | None |
| Shelf | Lab, tag "Stimming Lab" |
| Stage | None |
| Series | None |
| Accent | `oklch(0.8 0.14 80)` |
| Sound | Yes |
| Legacy build | No |
| Signed off | No |

## Idea

Idea 21, group C: wind ripples through a wheat field; tap to call lightning. Bean `stimming-tqse`. Plan: [wheat.md](../plans/wheat.md), an MVP.

## Rules

- The camera does not move. The wind and the strikes change the scene.
- One wind field drives the far canopy, the near heads and the sound of the near wheat.
- No props: open wheat to the horizon and the storm. No road, no farm, no tornado: Tornado alley has those.
- Light first, sound after: thunder runs on the audio clock, at 343 m/s.

## Direction

- 3D field and sky, flat stage. The eye stands 4 m over the field and looks out level; the frame is shifted down, so the horizon sits 34% from the top. About 48 degrees across. A portrait stage narrows the lens.
- A low evening sun from the left and a little behind, 9 degrees up, lights the wheat orange-gold. Past about 4 km the field lies in the storm's shadow.
- One storm deck covers the sky: a base near 900 m with billows that hang lower, rolls that run across the view, a heavier core to the right. Its far edge, 19 to 27 km out, leaves a strip of clear gold evening sky over the horizon.
- From just under the frame's foot (7.5 m on a wide stage) to about 60 m the heads are instanced: a stalk, a head with its spikelets and the awns. Past that, a canopy shader carries the same wind.

## Controls

Bar v3, from the `bar` spec in `initPage()`.

| Slot | Holds |
|---|---|
| Action | Strike (Space): a bolt at a random place, 25 m to 2.5 km out |
| Slider | Wind: the strength of the gusts |
| Settings | Quality (shared) |

| Input | Does |
|---|---|
| Tap the field | A bolt lands there |
| Tap the sky | A bolt leaves the cloud base there and lands 1.5 to 5 km out |
| Space | A strike |
| Touch | The same |

Strikes come one per 0.6 s at most. A tap inside that gap waits for it.

## The model

- Gusts: a three-octave noise field, long across the wind, rolling downwind at 2.5 to 9.5 m/s. A head leans with the gust; behind a gust it swings back past upright. Bent heads show their pale side (a bright band); heads swinging back show dark.
- A stalk bends as a cantilever and keeps its length. Each stalk flutters a little at its own rate.
- The channel: midpoint displacement from the cloud base to the ground, with kinks that scale with the drop, and three to six branches, some forked. A stepped leader grows down in 75 ms, then the return stroke, a restrike 85 to 145 ms later on the main channel only, and an afterglow.
- The strike's light: a vertical line source over the strike point (one over the distance) on the field and the heads; thin parts glow when the bolt stands behind them. Inside the deck it is a point light at the channel's top.
- The gust front: a ragged ring of outflow from the strike point at 19 m/s. It flattens the wheat away from the strike, then the stalks spring back past upright and wave. It fades as it spreads; it is gone after 22 s.

## Passes

Five small programs, so D3D11 links each fast.

1. Deck, at half size: a 44-step march with Fire's smoke shading (K3 lighting: self-shadow taps toward the sun, Beer plus multi-scatter, powder, ambient floor, HG phase), lit by the strike from within. Two blur passes hide the dither.
2. Field: the sky behind the deck, and the canopy. It writes depth.
3. Heads: instanced strips of 28 vertices, 90,000 heads, into a 4x multisampled target with alpha to coverage.
4. Channel: screen-space quads, a violet halo and a white core, added over the scene.
5. Final: bloom (`shared/glow.js`), vignette, the storm grade, ACES fit.

## Sound

Web Audio, muted by default. A dry rustle of heads, a fine hiss and a low wind roar follow the gust field at the near wheat and the gust front at the eye. Thunder comes after the distance over 343 m/s: close strikes crack, then boom with a sine thump; far ones only roll, low, as air takes the highs. The roll is a random set of filtered bursts, so no two are alike.

## Flashing light

A strike flashes at most twice; strikes come one per 0.6 s at most, so the frame never flashes more than three times a second. Reduced motion: one soft flash and no restrike.

## Frame loop

Lively while a strike or a gust front is in flight; drifting at 30 fps while the wind blows; asleep 60 s after the last input, over 2 s. Hidden stops the loop, the clocks and any thunder in flight. Reduced motion: no wind drift; a strike and its gust front still play, softer, then the loop stops. Slow frames step down: the pixel ratio, then the deck's size and the bloom, then half the heads.

## Known

- Capture with Edge headless on D3D11 (RTX 3070).
- The deck shows a faint grain from its march at half size.
