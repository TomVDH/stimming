---
# stimming-48o4
title: 'Load states: show loading states and stages in every context'
status: todo
type: epic
created_at: 2026-11-25T07:57:09Z
updated_at: 2026-11-25T07:57:09Z
---

Tom, 2026-11-24: "we want preloading states and stages displayed in ALL contexts -- make that an epic bean -- will require work".

The shell already knows the stages: shared/stim.js stage(name, part) marks shell, libs, build (buildSteps(n)), first-frame and extras, and sets html[data-stage]. Today only the intro's load line shows them, and only as a fill. This epic makes the state readable wherever something loads. Trial: the desk's Intro tab (accesslab/) simulates a load (Load now / 3 s / 8 s / 20 s) and shows Stage words under the flash box.

Contexts:
- [ ] Intro: the stage in words with the load line (trial in accesslab), Calm intro too
- [ ] Toy page after the intro: a toy still building (extras, late shaders, assets) says so, on the bar or the stage
- [ ] Menu: the click hairline under a tile names the stage while the toy page loads
- [ ] Failure states: a stalled or failed stage shows its name and the .fail line, never a blank stage
- [ ] Workbenches and frames: the desk, the icon sheet and inventorylab show loading per frame (galleries, menu tile, toy frame)
- [ ] Reduced motion: still states, words only
- [ ] One shared module or API for every context, after Tom picks the look

Rules: a change in shared/ or the menu needs its own bean and Tom's yes first; one context at a time.
