---
# stimming-ral1
title: 'Toy: Terrarium'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-16T19:44:51Z
updated_at: 2026-11-16T20:29:55Z
parent: stimming-oh7b
---

Build Terrarium from docs/plans/terrarium.md (idea 361, Tom's add). Size M. It starts in the Lab, on Bar v2. A sealed glass jar of moss and ferns: mist it, drops run down the glass, the green wakes up.

- [x] Task 1: blockout: jar, moss bed, ferns, backlight; checkpoint with Tom (Tom passed it 2026-11-16)
- [x] Task 2: mist, drops and runs on the glass (shared/wetglass.js)
- [x] Task 3: the green wakes: fronds unfurl, moss brightens, fog clears
- [ ] Task 4: sound, Settings, QA at 1280 and 375 px
- [ ] toys.json entry and menu Lab entry with an icon and a GSAP hook
- [ ] Tom sets the Dutch name
- [ ] Record the session cost

## Task 1 notes (2026-11-16)

- terrarium/index.html and main.js on shared/environment.js. The jar's glass runs through the runner's `glass` hook, so wetglass.js already draws the fog on the jar's curved skin.
- Task 2 needs one change to environment.js: the pane pass takes no toy uniforms, so the wipe stripe has no way in yet.
- Stubs: Mist and hold only fog the glass; drag and tap do nothing. Fog return works.
- Menu tile is a low-fi icon with a toys.terrarium hook (mist, fog, fern sway).

## Tom's direction (2026-11-16)

Very richly shaded: glass, fog on glass, droplets, plants that grow by rules (geometry-node style), maybe some bugs. Recorded in docs/plans/terrarium.md under Tom's direction.

## Task 2 notes (2026-11-16)

- shared/environment.js takes an opt-in `pane` option: GLSL head, uniforms and textures for the glass step. Fog horn and fxlab are unchanged.
- The glass is unrolled round the jar in metres; drops lens the view at the jar's own scale.
- Hold mists: a spray cone from the lid, fog on the glass, then beads (two sizes) and runs that clear tracks.
- Drag wipes a stripe (a 256 x 96 map round the jar); the fog creeps back. Fog return sets the pace of the whole cycle.
- The rest fog comes back from the lid; after one mist the loop sleeps at about 66 s. Reduced motion puts drops on at once with no frames after.

## Jar shape (2026-11-16)

Tom: "increase size and shape of jar". The jar is now any profile turned round its axis, and about 30% larger in the frame. Three shapes for Tom to pick: apothecary (the default), `?jar=globe`, `?jar=bell`. Each profile exists in GLSL and in JS (the wipe), and both must match.
- [x] Tom picks a jar shape: apothecary (2026-11-16). Globe and bell are cut; git history keeps them (06e05aa5).

## Apothecary jar, higher quality (2026-11-16)

Tom: "make a higher quality apothecary jar". New profile: belly, round shoulder, neck, rolled lip, and a solid glass lid (flange, low dome, stem, ball knob). Green glass: the wall's tint follows the glass the light crosses, so the rim turns deep green. The lid, knob and the 1.4 cm base are solid glass that bends the view and glows at its edges. Two soft panels out of frame put tall reflection strips on the belly. Reflections see a softer lamp, so thin highlights do not alias. Round pebbles under the soil. Drops stay on the wall; the lid stays dry. Rest fog 0.14.

## Task 3 notes (2026-11-16)

- One value, wake (0 to 1), follows the water a mist put in the jar: up in about 5 s, down as it dries.
- Fronds grow by one rule: each new frond turns a golden angle (137.5 degrees) from the last; young ones are shorter, stand higher and stay curled longer. Dry fronds curl toward fiddleheads; wet ones open.
- Growth (0 to 1, saved in stimming.terrarium.grow): each mist adds 0.05. It buds new fronds on each crown (4 to 8, 3 to 6, 2 to 5) and spreads the moss over bare soil.
- Moss: olive and patchy when dry, deep green with small glints when wet; it lifts a little. Mushroom caps glisten when wet.
- A tap near a fern swings it; it settles in about 2 s.
- Mist fog peaks lower (0.65) and clears faster, so the wake shows through the beads.
- Not yet: a drop falling from a poked frond, and the bugs.
