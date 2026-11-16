---
# stimming-ral1
title: 'Toy: Terrarium'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-16T19:44:51Z
updated_at: 2026-11-16T20:01:24Z
parent: stimming-oh7b
---

Build Terrarium from docs/plans/terrarium.md (idea 361, Tom's add). Size M. It starts in the Lab, on Bar v2. A sealed glass jar of moss and ferns: mist it, drops run down the glass, the green wakes up.

- [ ] Task 1: blockout: jar, moss bed, ferns, backlight; checkpoint with Tom (built and QA'd 2026-11-16; waits on Tom)
- [ ] Task 2: mist, drops and runs on the glass (shared/wetglass.js)
- [ ] Task 3: the green wakes: fronds unfurl, moss brightens, fog clears
- [ ] Task 4: sound, Settings, QA at 1280 and 375 px
- [ ] toys.json entry and menu Lab entry with an icon and a GSAP hook
- [ ] Tom sets the Dutch name
- [ ] Record the session cost

## Task 1 notes (2026-11-16)

- terrarium/index.html and main.js on shared/environment.js. The jar's glass runs through the runner's `glass` hook, so wetglass.js already draws the fog on the jar's curved skin.
- Task 2 needs one change to environment.js: the pane pass takes no toy uniforms, so the wipe stripe has no way in yet.
- Stubs: Mist and hold only fog the glass; drag and tap do nothing. Fog return works.
- Menu tile is a low-fi icon with a toys.terrarium hook (mist, fog, fern sway).
