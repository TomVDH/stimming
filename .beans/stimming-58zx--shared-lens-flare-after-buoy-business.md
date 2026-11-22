---
# stimming-58zx
title: 'Shared: lens flare after Buoy Business'
status: in-progress
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
- [ ] fxlab card for the Buoy Business flare
- [x] Sheet for Tom: Buoy Business, the current shared flare, the new one (`fxlab/spike-flare-buoy.html`)
- [ ] Tom's pick
- [ ] PR with /code-review, merged
- [ ] `docs/plans/shared-shaders.md` updated
- [ ] Adopters listed below with status; each moves in its own pass

## Adopters

| Toy | Today | Status |
|---|---|---|
| Fireworks | `makeFlares`: a hand port of Havoc's streak and ghosts | Not started |
| Meteor | `makeFlares`, copied from Fireworks | Not started |
| Window seat | `flare()` in `window/shader.js`: Beach walker look, ten slots | Not started (stimming-w1nd says follow Buoy Business) |
| Broodautomaat | flare `ShaderPass`: Beach walker look | Not started |
| Beach walker | `POST_FS`: the Beach walker look plus band and hard modes | Not started |
| Railgun | `flFlare()` three times in `post/grade.ts` | Not started |
| Ascent, Calaeno | `flFlare()` | Not started |
| Ten seconds (launch) | `flStreak()` | Not started |
| Runner toys (Fog horn, Tornado alley) | `flFlare()` in `shared/environment.js` | Not started |

Not adopters: Night viaduct (`viaduct/pass.js`, `port.js`) draws point flares as world sprites. Frietkot's `uFlare` is a fryer flash. East Van Alley (`wires/main.js`) stays untouched: PR #96 is open on it.
