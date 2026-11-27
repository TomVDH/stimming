---
# stimming-6vbt
title: 'Icons: a new round for every toy'
status: completed
type: epic
priority: normal
created_at: 2026-11-23T08:46:34Z
updated_at: 2026-11-27T07:19:52Z
---

Tom, 2026-11-23: "we want to have all our current toys have a one by one pass for new icons -- this is a new subsession we work chunked there -- ensure we involve our sheet".

Scope: the 145 toys with a page and a toys.json entry (69 main shelf, 76 Lab). Postcard is out (no folder, stimming-e0qw). Prism, Fidget board and Heat putty are the reference icons: they wait for the last chunk, and Tom says whether they get a round.

Per toy: one round icons/spike-<id>-<n>.html with Current, A (Shaded object) and D (Isometric block), emblems in icons/spike/emblems/, the sheet GALLERY entry points at the new round. No commits to main from an epic branch: the chunk tasks commit on main.

Chunks of 10, in this order: main-shelf toys with no round, the rest of the main shelf, Lab toys with no round, the rest of the Lab. After each chunk: commit, report to Tom with the sheet, record his marks in icons/picks.json, then install only what he picked.

Overlaps to tell Tom: Railgun has an open menu icon bean (stimming-yrcx, waits on his verdict); Observatory has one (stimming-2ztz, PR not pushed); Ink in water waits on a pick in stimming-xhhb.

## Chunks
- [x] 1 lava eyes shadyos chamber ink frietkot railgun trainride motorway kintsugi (stimming-0h67)
- [x] 2 crossing observatory nvg morpher pop domino pins galaxy kaleido ferro (stimming-ij6k, df8c2427)
- [ ] 3 soap magnet glass chladni pendulum (pushed), pool scope walker fire rain (to start) (stimming-zzyu)
- [ ] 4 to 7 the rest of the main shelf, then the Lab with no round
- [ ] 8 to 14 the Lab
- [ ] 15 the last of the Lab; ask Tom about Prism, Fidget board and Heat putty


## Sheet: all rounds (Tom, 2026-11-23)

Tom: "can we get the sheet with ALL logos per toy we've had so far". The sheet opens on All rounds: every card of every gallery per toy (`icons/rounds.json`, 154 galleries for 101 toys, plus `GALLERY`), newest round first; `?latest` keeps the A and D view. Chunk 2 moved to one side session per toy, five at a time.

## Sheet: earlier menu tiles (Tom, 2026-11-23)

Tom: the old menu icons did not come through. The early galleries never held a Current card; old menu tiles lived only in the git history of `index.html`. A headless pass loaded the last commit of each tile version from git history and took the tile at rest: 217 stills for 90 toys in `icons/history/` (WebP, 700 KB), listed in `icons/history/menu.json`. The All view shows them under each toy's rounds as "menu, earlier", newest first, markable (`<toy>-menu<n>@menu`). Stills, not live: the hover of that day is gone. Six retired toys (Morph set, Ribbon, Keys, Ripple, Jelly, Bench) have no menu row, so their old tiles are not shown.
- [x] Earlier menu tiles on the sheet

## Sheet: every iteration, live (Tom, 2026-11-23)

Tom: "Like all iterations we ever had, per toy, all functional and displaying". The earlier menu tiles now run live. Each runs in a snapshot of the menu from a commit that holds its exact markup: 51 pages in `icons/history/live/`, 8.5 MB. A snapshot keeps only the wanted tiles. Each top-level hook statement and each forEach step runs in its own try, so a tile that is left out fails alone. The WebP still shows until the snapshot loads. 218 tiles: the Kiwi tile joins Fruit slice. Five retired toys sit last, under Retired. The icon lab directions (`icons/index.html`) show under their toys. A gallery's emblems come from its own data URIs, and cut ones come from the archive. On phones the All view gets two columns. In Latest A and D, Plasma globe and Snow globe draw again: the big tile now hides only after the gallery fits its icons on it.
- [x] Live earlier menu tiles, Retired group, icon lab row
- [x] Emblems resolve without 404s
- [x] Phone layout of the All view

## Sheet: keep, cut and a cleaner layout (Tom, 2026-11-23)

Tom: "go across the icon rounds -- make this fucking easy -- also allow me to negative select icons so we can eliminate them once and for all", and "pls clean up the sheet". Each toy is one block: the name on top, Current on the left, each group of icons labelled (Round n of m and its gallery, Menu earlier, Icon lab). A click steps an icon through keep, cut and clear; Hide cut takes cut icons off the sheet; Copy marks gives both lists. A find box (/) narrows to a toy; J and K jump from toy to toy. Kintsugi: the repo holds one round (kintsugi-1), its Current tile (unchanged since 16 Nov) and one traced emblem; no other pass reached icons/.
- [x] Keep and cut marks, Hide cut, find box, J and K, labelled groups
