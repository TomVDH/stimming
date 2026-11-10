---
# stimming-r13u
title: 'Fireworks: a clear-sky drift, a Vancouver city, a moonlit island'
status: completed
type: task
created_at: 2026-11-09T21:41:46Z
updated_at: 2026-11-09T21:41:46Z
parent: stimming-ersl
---

Tom (2026-11-09): improve the fidelity of the Island and City scenes; the standard is a clear sky; the change between cloudy and clear is smooth, slow and random; the city takes Vancouver BC as its inspiration.

- [x] Drift opens clear; at random every 2 to 7 minutes it eases into cloud (broken, cloudy or overcast) and back, each change 2.5 to 4 minutes on a smoothstep
- [x] The deck fades in and out (uCloud.w is now a fade, not an on switch); island snowfall and the moon follow the cloud
- [x] City: West End and downtown glass towers (homes and offices, lit crowns, sky and burst reflections), a tall tower, a disc-topped lookout, a flared tower; Stanley Park forest; a suspension bridge with a necklace of lamps; the inlet; the North Shore with its lit hillside, snow-capped range, the Lions, Grouse, Seymour and Cypress with lit ski runs; freighters at anchor; an orange city glow on the sky and the cloud undersides
- [x] Island: a low moon with seas, a halo and a glade on the water; moonlit and rim-lit snow, calmer under bursts; tiered snowy pines, a cabin, a lighthouse, snow-capped boulders and ice floes
- [x] QA: clean console; stills at 1280 and 375, at rest, mid-show and under Cloud

Not checked here: fps on a real device, and a full drift cycle in real time (it runs over minutes; the logic was read, not watched).

## Follow-up (Tom, 2026-11-09): too dense, the sky looked unnatural, wanted window glints

- The skyline thins out: towers on a wider grid, fewer of them, and a low gap between the West End and the core.
- The light dome is a low, wide band along the horizon, and the distance haze carries it, so far land greys out instead of going black.
- The city's snow glows less; the North Shore's homes reach higher and lift the hillside.
- Ski areas read as soft patches; high lamps stay out of the water's mirror, so no squiggles near the shore.
- Fewer lit windows; crowns only on towers over 130 m, white only.
- Glass: every pane tilts a hair on its own, so it mirrors its own bit of sky, and a burst glints pane by pane across the facades. Far panes lose their tilt, so nothing fizzes.
