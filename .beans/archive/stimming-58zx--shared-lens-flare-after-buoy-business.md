---
# stimming-58zx
title: 'Shared: lens flare after Buoy Business'
status: completed
type: task
created_at: 2026-11-22T19:30:17Z
updated_at: 2026-11-22T19:30:17Z
parent: stimming-ssrh
---

Tom, 2026-11-22: "also the lens flares from buoy business (some toys kind of use them) -- shared lens flare module pls".

One shared lens flare module that the toys use, matched to Buoy Business's flares (Havoc `src/view/lensflare.js`, `orbNode` in `src/engine/post.js`, the tuned values in `lab/ocean/panel-schema.js`).
`shared/flare.js` exists (stimming-ssrh). Its `flFlare()` follows Beach walker, not Buoy Business. This bean adds the Buoy Business flare next to it. Old calls draw the same frame.

## Checklist

- [x] Take stock: users of `shared/flare.js`, hand copies, Buoy Business source
- [x] Add the Buoy Business flare to `shared/flare.js`, raw GLSL and a three.js pass helper
- [x] fxlab copy check for the Buoy Business flare: 0 / 255, raw and three.js
- [x] Sheet for Tom: Buoy Business, the current shared flare, the new one (`fxlab/spike-flare-buoy.html`)
- [x] Tom's pick: C, the Buoy Business flare (2026-11-22)
- [x] PR with /code-review, merged (TomVDH/stimming#97)
- [x] `docs/plans/shared-shaders.md` updated
- [x] Adopters listed below with status; each moves in its own pass, in its own chat

## Adopters

Tom, 2026-11-22: "dont alter look of current adopters". Every move keeps the toy's frame within 1 / 255. `flBuoy()` is for new flares.

| Toy | Today | Path | Status |
|---|---|---|---|
| Fireworks | `makeFlares`: a hand port of Havoc's streak and ghosts | `flWarm`, `flStreak`, `flGhosts` with its own numbers (lab: Fireworks, 0 / 255) | Not started |
| Coast and meteor | `makeFlares`, copied from Fireworks | The same parts as Fireworks | Not started |
| Window seat | `flare()` in `window/shader.js`, ten slots | The parts with its numbers (lab: Window seat, 1 / 255) | Not started |
| Broodautomaat | flare `ShaderPass` | The parts with its numbers and its blend (lab: Broodautomaat, 0 / 255) | Not started |
| Beach walker | `POST_FS`, with band and hard modes | The parts (lab: Beach walker, 1 / 255); keep its cover, haze and grade | Not started |
| Railgun, Ascent, Calaeno, Ten seconds | `flFlare()` or `flStreak()` from the module | Already on the module. No change | Done |
| Fog horn, Tornado alley | `flFlare()` through `shared/environment.js` | Already on the module. No change | Done |

Window seat's bean `stimming-w1nd` says its flares "should follow Buoy Business". That is a look change: its own chat asks Tom.
Not adopters: Night viaduct (`viaduct/pass.js`, `port.js`) draws point flares as world sprites. Frietkot's `uFlare` is a fryer flash. East Van Alley (`wires/main.js`) stays untouched: PR #96 is open on it.
