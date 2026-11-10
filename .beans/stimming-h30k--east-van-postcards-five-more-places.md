---
# stimming-h30k
title: 'East Van postcards: five more places'
status: completed
type: spike
priority: normal
created_at: 2026-11-10T10:45:43Z
updated_at: 2026-11-10T11:38:28Z
parent: stimming-guw5
---

Tom liked the postcard study (stimming-3tq6) and asked for more block-outs at the same fidelity, true to life.

Places: Commercial Drive at East 4th, a back alley, the Grandview Cut, the port from the hill, a corner store. One postcard each, in eastvan/postcard/ (noindex, unlinked).

- [x] Split the page: kit.js (light, weather, post, prefabs) and one module per place
- [x] House lot still draws its three postcards on the kit
- [x] Commercial Drive
- [x] Alley
- [x] Grandview Cut
- [x] Port from the hill
- [x] Corner store
- [x] Check each in the browser pane at 1280 and 375 x 812; clean console
- [x] Stills to Tom
- [x] Commit and push

## Summary of Changes

eastvan/postcard/ now holds eight postcards on keys 1 to 8.

| Key | Place | Module | Hour, weather | Loop |
|---|---|---|---|---|
| 1 to 3 | House lot on East 4th | scenes/lot.js | Rain, low sun, fog | See stimming-3tq6 |
| 4 | The Drive, looking north | scenes/drive.js | 5:40 pm, after rain | Trolley bus, neon in the wet road |
| 5 | The lane | scenes/alley.js | 12:10 pm, overcast | Cat on the fence, sheets, crows |
| 6 | Grandview Cut from the bridge | scenes/cut.js | 8:40 am, clear | Transit train, mist, leaves |
| 7 | Corner store | scenes/store.js | 9:40 pm, clear | Moths, OPEN flicker, cat tail |
| 8 | The port from the hill | scenes/port.js | 4:25 pm, last light | Freight train, crane trolley, crow commute |

- kit.js holds the renderer, sky, weather, post, loop and prefabs. A place exports `cards` and `build(k)`.
- Five subagents wrote the five new modules against the kit; each drew on the first load with a clean console. Light levels and frames were then tuned from stills.
- Checked: every card at 1280 x 800 and 375 x 812 by synchronous stills. The port lens on phones was narrowed after its last still (minHalf 0.2 to 0.15) and is not seen again.
- Not checked: frame rate of the five new places, reduced motion, real phones.
- Shop names are invented. No downloads.
