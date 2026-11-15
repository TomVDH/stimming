---
# stimming-m23q
title: 'East Van postcards: five more places, thirteen cards'
status: completed
type: spike
priority: normal
created_at: 2026-11-15T04:25:39Z
updated_at: 2026-11-15T04:47:37Z
parent: stimming-guw5
---

Tom: "we'd like a lot more here". Five more block-out places in eastvan/postcard/, one postcard each, true to life, same fidelity as the first eight.

- [x] kit.js: snow card field, shared prefabs; the eight old cards stay the same (stills are byte-identical)
- [x] index.html: thirteen cards, arrow keys, foot buttons fit 375 px
- [x] Trout Lake at dawn (scenes/lake.js)
- [x] The station at night (scenes/station.js)
- [x] The wooden coaster, summer evening (scenes/coaster.js)
- [x] New Brighton pool, hot noon (scenes/pool.js)
- [x] Vancouver Specials, first snow (scenes/snow.js)
- [x] Check each at 1280 x 800 and 375 x 812; clean console
- [x] Frame cost of each new card
- [x] Stills to Tom
- [x] Commit and push

## Summary of Changes

eastvan/postcard/ now holds thirteen postcards. Keys 1 to 9 pick a card; the left and right arrows step and wrap; the foot shows thirteen buttons (27 x 34 px at 375 px wide).

| Card | Place | Module | Hour, weather | Loop | Cost |
|---|---|---|---|---|---|
| 9 | Trout Lake, from the south shore | scenes/lake.js | 6:50 am, mist | Dog walker goes to the dock head and back; geese glide; mist drifts; crows fly west | 12.7 ms |
| 10 | The station at Commercial and Broadway | scenes/station.js | 10:15 pm, drizzle | Train arrives, waits, leaves (44 s); two buses; the signal changes | 9.6 ms |
| 11 | The wooden coaster, Hastings Park | scenes/coaster.js | 8:40 pm, summer | Train climbs the lift, drops, runs the hills; ferris wheel turns | 11.9 ms |
| 12 | New Brighton pool | scenes/pool.js | 12:30 pm, clear | Lap swimmers, caustics, gulls, a freighter under the bridge | 11.6 ms |
| 13 | Vancouver Specials on East 12th | scenes/snow.js | 9:10 pm, snow | Snow in the lamp cone, TV flicker, smoke, bulb string | 8.1 ms |

Cost: one frame with a pixel read-back at a 1280 x 800 buffer. Card 1 costs 9.0 ms and card 8 costs 12.5 ms by the same measure.

Kit changes (kit.js):
- Card field `snow`: slow flakes; `rainLamp` lights them in a cone.
- `personGeo()` and `k.person()`: a block-out figure. `k.bulbs()`: a string of glowing bulbs.
- Camera fields `upMax` and `downMax`: on a narrow screen they cap one side of the lens.
- The eight old cards render byte-identical before and after (stills at t = 30, 2560 x 1600).

Invented names in use: Night Owl Pizza, Salmonberry Cafe, Golden Crane Noodle, Late Grocer, Raincoat Records, The Wooden Coaster.

Not checked: real frame rate (the pane was hidden; no rAF), High quality cost, real phones, reduced motion, 812 x 375 landscape. Each place had one tuning pass only.
