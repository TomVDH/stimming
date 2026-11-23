---
# stimming-e35i
title: 'Toy: Solar loop'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-23T12:26:17Z
updated_at: 2026-11-23T12:35:20Z
parent: stimming-oh7b
---

Build Solar loop (idea 238, group C, a cinematic diorama) as a Lab toy: an MVP at high fidelity, Bar v3. Toy id solarloop. A close view of the sun's limb in extreme-ultraviolet light: a mottled disk, coronal loops of glowing plasma arcing on field lines and draining back, a soft corona fading into black. Loops rise, brighten and drain; tap an active region and it flares: bright ribbons, a brighter arcade, an eruption lifting off the limb, then a slow return to calm. Plan: docs/plans/solarloop.md. Toy doc: docs/toys/solarloop.md.

- [x] Plan at docs/plans/solarloop.md
- [x] Reference images of the real thing
- [x] Blockout on the stage, screenshot at 1280 x 800 (docs/qa/solarloop/01-blockout.jpg)
- [x] Hero moment: loops rise, brighten, drain; tap flares a region
- [x] Sound: muted by default
- [x] Bar v3 spec and copy
- [x] Icon round spike-solarloop-1 (Current, A, D), emblems, sheet row
- [x] Intro emblem, favicon, toys.json entry, Lab tile with GSAP hook
- [x] QA Q1 to Q10, docs/toys/solarloop.md
- [x] Cinema pass (Tom, 2026-11-23): film grades, cosmic scale, giant prominences, light rays, lens, hum and blast
- [x] Long lens (Tom, 2026-11-23): the arc cuts the bottom left quarter, Mercury in transit, layered haze
- [x] Stars replace the colour bands (Tom, 2026-11-23): Sun, Proxima, Rigel, Betelgeuse, VY CMa, with scale bodies
- [ ] Tom sets the Dutch name
- [ ] Record the session cost

Stack type: Shader, raw WebGL2 (shared/gl.js, bloom from shared/glow.js). No shared module changed; the toy adds only its own shared/emblems/solarloop.svg and shared/favicons/solarloop.png.

## Defaults chosen (Tom's open questions: 3D or flat, and the presentation)

- 3D, seen as a solar telescope sees it: an orthographic view of the limb, a gentle arc across the lower third, black sky above. Loops are 3D arches on the sphere: some on the near side, some behind the limb with hidden feet, some on the disk. A drag turns the sun up to 18 degrees and shows the depth.
- Look: Gold, the 171 band (iron near one million kelvin). 171 draws loops as fine sharp threads, the classic picture of loops over the limb, and its gold keeps the toy apart from Desert eclipse's white corona and pink prominences. Teal (131, hot flare plasma) and Red (304, cool plasma: spicules, the rope, the rain) are the other two choices; each sees the same flare at its own temperature.
- The image is one intensity channel, a log stretch and the band's colour table, as the real images are made. Above saturation the detector shows a diagonal diffraction cross and a vertical bleed line.
- Loops: bundles of threads drawn as instanced additive ribbons (optically thin plasma). Each loop rises, shines, drains (knots slide down its legs) and fades over 24 to 46 s, then returns with a new shape.
- Flare on a tap: ribbons flash and part, the rope lifts off as a bulb and leaves the frame, a bubble and a disk wave follow, 22 arcade loops snap in low to high, cool and rain; calm by about 45 s.
- Bar v3: Band choice Gold (default), Teal, Red (1 to 3); Flare (Space); Activity slider. Tap flares the nearest region; drag turns the sun.
- Icon: no pick existed. Round solarloop-1 (Current, A, D); A is on the menu; the intro emblem is A's emblem.
- Draft Dutch name: Zonnelus /ˈzɔnəlʏs/. Accent oklch(0.8 0.15 80).

## Cinema pass (Tom's words: Sunshine with a spritz of Villeneuve)

- A wide frame: the limb is a dome; half the frame is black sky.
- Giant prominences: a hedgerow (80 threads, 165 units), an arch (18 twisted threads, 205 units) and a tall curtain (46 threads, 240 units); a tap lifts any of them off into space; each forms again by 46 s.
- Two light channels (hot, cool); a film tone curve; a colour ramp per channel per star.
- Light rays and shafts, heat shimmer, colour split, halation, an anamorphic streak and lens ghosts on a flare, film grain.
- Disk: boiling granules, slow swirls, dark filaments. Sound: a deep hum while awake; a low brass blast on flares and eruptions.

## Long lens and stars (Tom's words: a long lens, the bottom left quarter for the arc cut, Mercury in transit, creepy scale; instead of colours, more stars, like VY Canis Majoris)

- The long lens is the default (Tom chose it). Lens (L) zooms over about two seconds between it and the wide view. The limb runs from the middle of the foot to the middle of the left side. Darker, harder tones, a deeper vignette, three haze layers.
- A body crosses the disk at true size: Mercury on the sun, a planet on Proxima, our sun on Rigel, Betelgeuse and VY CMa.
- Star choice (1 to 5) replaces Band. The model runs in star units, so the scale body carries the scale: the earth is a seventh of Proxima's width; our sun is a speck one pixel wide beside VY CMa.
- The giants: a handful of giant cells, strong limb darkening, a dust envelope, dim loops.

## The corner, the pan, the haze, more stars, film (Tom, 2026-11-23)

- The long lens: the star fills the frame; its bottom left limb cuts off the corner; the star turns so its prominences stand there. A drag pans along the limb.
- Haze at four depths for every star, lit by its own light: veils, clouds with self shadow, near dust, motes.
- Eight stars, smallest to largest: neutron star (beams, ticks, field lines, bent light; Phobos), Sirius B (the earth beside it is larger; the moon in transit), Proxima, Sun, Sirius (our sun beside it), Rigel, Betelgeuse, VY CMa.
- Scale bodies are shaded spheres: the earth with land, sea, cloud and a blue rim; the moon; Phobos.
- Film post after *Sunshine*: heavy grain, shadow colour noise, gate weave, flicker, lens dirt, burnt highlights.

## Held still, active all round, full view, volume (Tom, 2026-11-23)

- The long lens holds still; activity all round the limb, with its own regions and prominences on the bottom left limb.
- L steps three views: long lens, wide, full star.
- A raymarched haze and dust volume with Fire's smoke shading (K3 from cloudbottle) replaces the flat haze layers.
- The film touch is light: fine grain, soft colour split, faint lens dirt.
- Full view: a raymarched 3D corona (warped streamer sheet, spiral bend, polar plumes, radial rays); half the exposure.
- Dev rows behind ?dev: eleven post knobs, four volume knobs, Reset.

## Reference

TRACE 171, loops over the eastern limb, 6 November 1999: fans of fine threads, bright feet, a dark mottled disk. SDO 131, 171 and 304, the limb flare of May 2013: a saturated core with a diagonal diffraction cross and a vertical bleed line; the three colour tables. Papers on flare-driven coronal rain: rain shows best in 304.

## QA (headless Edge, D3D11, RTX 3070)

- Q1: node --check passes on the four modules, the menu scripts and the icon page.
- Q2: clean console in play, on the menu with the tile hovered, and on the icon page.
- Q4: drifting 32 rAF a second; asleep 63 s after the last input, 0 rAF in 2 s.
- Q5: hidden tab, 0 rAF in 2 s.
- Q6: reduced motion: clean console, 0 rAF at rest, a tap still flares, softer.
- Q7: Band choice, Flare, Activity slider (3 controls); How to play has 2 rows.
- Q8: 1 to 3 and Space each do their job.
- Q9: the context runs after a gesture and is suspended once the toy sleeps.
- Q10: frame times through a flare: median 7.5 ms, p95 8.1 ms. Build to first frame 1.0 s.
- Captures: docs/qa/solarloop/.


## Commits

- 7826b742: the toy, toys.json entry, plan, toy doc, QA captures, intro emblem, favicon, bean.
- a9d61361: menu Lab tile and hook, icon round solarloop-1, emblems, sheet row.
- 69ca056c: the cinema pass.
- be04ba72: five stars and the long lens.
- cc31bb1b: the long lens is the default.
- ace6477f: the corner, haze layers, eight stars, film post.
- 9bb873e0: the still long lens, activity all round, the full view, the volume, a lighter film.
- 43c09e01: the sweeping corona, half the exposure in the full view.
