---
# stimming-ral1
title: 'Toy: Terrarium'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-16T19:44:51Z
updated_at: 2026-11-16T23:00:36Z
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

## Fill research (2026-11-16)

Tom asked to max out the plants and fill, with online examples (moss as fur, plants, particles, volume). Findings and two build paths are in docs/plans/terrarium.md under "The fill, maxed out". Recommendation: A, a raster garden of instanced meshes read by the ray-marched jar.
- [ ] Tom picks the fill build: A (raster garden) or B (ray march)

## Moss and fern, procedural PBR (2026-11-16)

Tom: "start with moss and the fern", then "PBR the plants".
- Moss: each strand is a shoot with nine leaves in a golden-angle spiral; dry leaves press to the stem, wet ones spread. Physical material: sheen for the velvet, a clearcoat water film that grows with the wake. Sub-pixel leaves have a light ceiling, so they cannot flare.
- Fern: leaflets split into nine pinnules a side. Generated PBR maps (colour, normal, roughness): raised midrib, side veins, domed lobes, paler rim. The underside is paler and rougher; old fronds carry spore dots there. Light through the leaf dims along the veins.
- The garden picture holds at most 2.2 MP. Misting, headless: 2.7 ms at 1x, 21 ms at 2x (57 ms on garden redraws).

## Moss and fern tuned (2026-11-16)

Tom: "tune moss and fern".
- The white patch on the big fern was its direct specular at grazing angles (found by switching each term off). Leaf specular is now 0.06, the wet clearcoat 0.17 at most.
- Moss grows in tufts (a small noise sets height) with colour in patches (yellow-green tufts, deep green hollows); each shoot varies only a little, so the carpet reads as a surface.
- The front of the bed was dark: the grow light is behind. A soft fill from the viewer's side, a wider spot cone and more ambient light it. Wet moss is a fifth brighter.
- Frond stems are green-brown with a little sheen; each frond has its own green.
- garden.debug (materials, lights, redraw) is open to QA through window.__terrarium.garden.

## The stone (2026-11-16)

Tom: "do the stone". A smooth, merged mesh (about 47,000 triangles; the old one was 720 flat faces): a lumpy body, sharp ridges from ridged noise, upright grooves, stepped strata and a flat foot. Per-vertex colour: blue-grey stone, faint calcite veins, dark crevices, lichen on the upward faces. PBR: shader grain; wet, it darkens and turns glossy, most in the crevices where water gathers. Moss now sits in the cracks (a sampler weight), about 5,000 shoots, no longer a cap.
