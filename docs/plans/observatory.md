# Observatory (`observatory`) design

Status: active · Bean: `stimming-wqq9`

Idea 58 in [toy-ideas.md](../toy-ideas.md), group C. Concept: section 3 of [next-ten-concepts.md](next-ten-concepts.md).
This page is the design. The task-by-task build plan comes after Tom approves it.

## Intent

An old observatory stands on a hill at night, under a big sky. The pointer is a green aiming laser. The cupola turns slowly after the beam, the slit opens and the telescope slews to the star you pick.
The bonus: you enter the telescope. You see the star in the eyepiece, with its real catalog data and some pseudo data around it.
The joy is the heavy, slow machine that does what you ask, under a real sky.

## Decided by Tom (2026-11-17)

| Topic | Decision |
|---|---|
| The shot | The observatory on the hill, seen from outside |
| The look | Railgun's Villeneuve look: one wide, locked-off shot, haze, a big quiet sky, a small machine |
| Fast time | Fast-forward time draws star trails, as Star trails does |
| The hand | The aiming laser aims; the cupola turns after it |
| The bonus | Enter the telescope; the eyepiece shows the star with pseudo data |
| The stars | A real catalog: HYG (Hipparcos, Yale, Gliese). The download needs Tom's yes with file and size. |
| The eyepiece | Approved as proposed: the way in, the round view, the sparse data, the hand (see "Inside the telescope") |
| The build | Approach A: TypeScript and three.js, the Railgun way |
| The sky's time | Tonight's real sky: the real date and sidereal time, drawn as night after the opening. At 14:00 you see the stars that are over the hill now. |
| The opening | "We will start from a nice cinematic dusk and will slowly go into the night before play becomes possible". The approved reading is in "The opening: dusk into night". |
| The far view | "we want faraway mountains -- distance haze -- clouds (railgun raymarched) in the distance -- then we will trial the first versions of the telescope ready cut etc etc -- we'll focus on getting all of this sorted before the actual telescope". The approved reading is in "The far view". |
| The moon | None. A dark, moonless sky. |
| The scene (blockout review) | "we want woods and a view of the complex around it". The approved reading is in "The outside view": woods on the hill, a complex of three domes, a stone building, a roll-off shed and a road; all three domes answer the laser. |

## Calls made by the designer

Tom can change any of these.

| Topic | Call | Reason |
|---|---|---|
| The place | Fixed at 51° N, as Star trails' first preset; a Dev row changes it | No location prompt |
| The view's facing | The locked shot faces south | The sky turns across the frame; the bright winter and summer stars pass through it |
| Wake from sleep | The sky jumps to the real time on wake, in one eased move of about 1 s | Tonight's real sky stays true |
| The light | Starlight, the lit door, a faint sky glow on the horizon | No moon |
| Eyepiece field | 2°. Real catalog stars to magnitude 6.5, plus pseudo faint stars, seeded by sky position, so the field is never empty | A real 0.5° field at magnitude 6.5 is often empty; a deeper cut breaks the budget |
| Tap in the eyepiece | Snaps to real catalog stars only; pseudo stars are not targets | Every target has real numbers |
| Fast time | Above the trail speed, tracking pauses: the tube and cupola hold, the tracking light goes off, `Enter` is disabled. Back to real speed, the machine slews back to its star. | The dome cannot follow a fast sky at real speed |
| Lens lean | Off while trails show | A moving camera smears the trail buffer |
| The Lab entry | The `toys.json` entry and the Lab menu entry go in this bean, as Lantern lake (`acd73c78`) and Terrarium (`f6025f49`) did. Ask Tom before that commit (hard rule 3). | It is how Lab toys reach the menu for Tom's look |

## Goals

1. A night scene with Railgun's restraint: one dome, one hill, haze, the sky does the work.
2. The machine is heavy: it moves at the speed of a real dome or slower, and it is always a little late.
3. Every star you aim at is a real star with real numbers.
4. The way into the telescope is one continuous move, not a cut.

## Non-goals (first version)

- The moon, the planets, satellites or deep-sky objects.
- Constellation lines, star labels on the sky, a search box. This is not a planetarium app.
- Daytime. The toy opens at dusk, then stays night.

## Anti-goals

These make the toy fail even if it works.

- A fast, snappy machine. The dome never whips round.
- Neon and sci-fi panels. The eyepiece text is thin and quiet, in Railgun's register (memory: less neon).
- Labels and data everywhere on the outside view. Data lives in the eyepiece only.
- An import from `railgun/src/`. Another chat owns Railgun; the toy copies what it needs.

## Approaches

| | Approach | Trade-off |
|---|---|---|
| **A (picked)** | TypeScript and three.js in `observatory/src/`, bundled by `tools/build.mjs` | Real 3D dome, slit, tube and flight down the tube. Railgun's look code is TypeScript, so it copies over. Biggest start of the three, earned by the 3D. |
| B | Plain JS and three.js in one page | Faster start. Railgun's look code needs a rewrite, and the toy needs a port to TypeScript later. |
| C | Raw WebGL2, painted hill and dome over a star shader | Lightest. The dome turns only as a flat trick and the flight down the tube becomes a cut. That loses the point of the toy. |

Tom picked A: the 3D machine needs three.js, and the look comes from Railgun in its own language.

## The outside view

```
   ·    ·        ·     ·       ·    ✦      ·      ·     ·
 ·   ·      ·       ·     ·      ·    ╲   ·    ·      ·
      ·   ·     ·      ·      ·        ╲laser    ·   ·
 ░░░░░░░░░░░░░░░░░░░░░ haze ░░░░░░░░░░░░╲░░░░░░░░░░░░░░░
                         ▄▄    ▃▃    ▅██▅      ▂▂
                ▲▲▲▲▲▲ ▐██▌ ▐▀▀▀▀▀▀▀▌▐████▌ ▐▀▀▌ ▲▲▲▲▲▲▲
          ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
     ▲▲▲▲▲▲▲▲▲▲▲▲▲▲ woods ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
```

- **The shot.** From a nearby rise, a little above the treetops, about 300 m from the complex. Locked off. The sky fills the upper 60% of the frame. A pointer move leans the lens a little, as in Railgun.
- **The woods.** Dark conifer woods cover the hill. A clearing at the top holds the complex. A gravel road turns up through the woods to it.
- **The complex.** The main dome (the big refractor; the laser comes out of it), two smaller domes, a long low stone building with a few lit windows, and a shed with a roll-off roof.
- **The domes.** A white dome on a stone drum, a warm lit door, a dark slit, the steel tube out of it. The icon (A of `icons/spike-observatory-1.html`) sets the shapes.
- **All three domes answer.** The two small domes turn to the same star a few seconds after the main dome, each at its own slow speed. Each stands at a different angle to the camera, so a slit faces the viewer for most aims.
- **The laser.** A thin green beam from the dome top to the aim point. The haze shows it, so it looks solid near the dome and fades with height.
- **The sky.** Tonight's real sky at 51° N, from the catalog, with no moon. It turns at sidereal speed. Railgun's haze and grade sit over it.
- **Fast time.** The Time slider runs the sky faster. Above a set speed, the stars draw trails with the accumulate and decay pass from `trails/index.html`, ported into the three.js chain.

## The opening: dusk into night

Tom, 2026-11-17: "We will start from a nice cinematic dusk and will slowly go into the night before play becomes possible". Tom approved this reading ("Go"):

1. **Start.** The page opens at dusk, just after sunset, in the same locked wide shot. The west is still warm; the sky runs from deep blue to slate. The domes, the drum and the treetops catch the last light.
2. **Into the night.** About 45 s. The sky darkens to the night look of Task 7. The stars come out by magnitude, brightest first. The haze cools. The complex lights come on one by one as it gets dark.
3. **Play.** The laser and picks stay off until full night. Then the laser comes on and the toy plays.
4. **The sky stays real.** The light comes from tonight's real sunset direction at 51° N. The sky clock runs fast through the opening and eases to speed 1 at full night, so it ends on the real sky of now. Its speed stays under the trail speed.
5. **Defaults (designer's calls, approved).** It plays on every visit. A tap or Esc skips to night in a short ease. Reduced motion opens at night. Sound stays muted.

Tom, 2026-11-17, on the opening: "lets make the dusk (be earlier) to night go a little longer and more prominently show the stars.. (e.g. rail gun star streak effect??)", and: "Behind the ridge". Reading: the opening starts in the golden hour, with the sun already behind the western ridge and only its light in the scene; it runs about 70 s; while the sky clock runs fast, each star draws as a short streak along its arc round the pole (Railgun's star streak under a Time drag), and the streaks shrink to points as the clock eases to real time; the stars show earlier and brighter, brightest first. The end state does not change: the approved night look and the real sky of now.

## The far view

Tom, 2026-11-17: "we want faraway mountains -- distance haze -- clouds (railgun raymarched) in the distance -- then we will trial the first versions of the telescope ready cut etc etc -- we'll focus on getting all of this sorted before the actual telescope". Tom approved this reading ("Yes, go"):

1. **Far mountains.** Two or three ridgelines on the southern horizon, about 10 to 40 km away, 1 to 3° above the horizon. They replace the hard horizon line. At dusk they are warm silhouettes toward the west; at night, dark shapes on the sky glow.
2. **Distance haze.** Each ridge further back fades more into the sky. The valley haze runs out to the mountains.
3. **Distant clouds.** Railgun's raymarched clouds, copied, as a low bank above the far ridges only. The sky over the hill stays clear for the stars. The clouds take the sunset at dusk and go dark at night.
4. **A live trial of the pick sequence.** Tom plays the cuts in the browser.
5. **Order.** One change at a time, each shown to Tom: mountains, haze, clouds, then the trial. The outside view, fast time (Task 8) included, is done before the inside of the telescope (Task 9).

## Detail and trees

Tom, 2026-11-17: "lets also up detail on the complex, telescope and the hill it sits on -- can we get some cheap but nice looking trees we can instance?" Tom then supplied the tree model: "Pine Tree - PS1 Low Poly" by Wersaus33 (Sketchfab), CC BY 4.0, a 124 KB GLB of about 1,180 triangles in alpha-cut branch cards with one 23 KB PNG.

Four changes, one at a time, each shown to Tom:

1. **Trees.** The woods use Tom's pine. Near trees (the clearing edge and what the close cuts see) are the real mesh, instanced. The rest are impostors baked from the same model at load: crossed cards, a few triangles each. The texture filters smoothly (no PS1 pixel crunch) to sit in the Villeneuve look. The woods keep the starlit tops, the dark bases, the haze layers and the per-tree variation. Credit in `CREDITS.md`.
2. **The hill.** Uneven ground, rock outcrops, grass and bare earth, a gravel path from the road to the buildings, a road edge.
3. **The complex.** Roof edge, window frames, a door canopy and a chimney on the building; panel seams and a catwalk rail on the domes; stone courses on the drums; rails on the roll-off shed; a fence along the road.
4. **The telescope.** A real mount, a counterweight, a dew shield and a finder scope.

Tom, 2026-11-17, on the order: "lets prioritize the cut -- then move to detail and making the complex road up to it and street lights etc nice". So: the cuts first (locked cuts, then the lens shot), then the complex with its road and street lights, then the hill and the telescope. The road up to the complex and its street lights are part of change 3.

## The pick sequence and the lights

Tom, 2026-11-17, on the second blockout: "the slit points at camera initially -- slowly opens -- (maybe we can do a cut close up of the animation -- sleek and with zoom lens, several cuts) -- as it opens, and the telescope rolls through -- then back to regular screen -- as the periscope hunts the lights around complex dim -- they go off when we do a survey". Tom approved this reading:

1. **At rest.** On load, the main dome's shut slit faces the camera.
2. **On a pick: a cut sequence.** About 6 to 8 s, 3 or 4 cuts (about 9.5 s with the lens cut), each a close-up on a long zoom lens: tight, shallow depth, slow, clean.
   1. The shutter starts to slide: tight on the slit edge.
   2. The shutter opens further: a wider close-up of the whole slit.
   3. The telescope rolls through the open slit, against the sky.
   4. Optional: the dome's ring gear or rail turning.
   5. The lens (Tom, 2026-11-17: "the final cut of the sequence is a close up of the lens of the telescope with starry reflections on the glass / mirror itself -- this will be filmic as fuck"). About 2 s, the last cut: tight on the objective glass of a refractor, very shallow focus, a slow push in. Tonight's real stars reflect in the glass, slightly curved, the target star brightest near the centre. The slit edge crosses the reflection as a dark band. A faint green and magenta coating sheen moves as the tube tilts. The tube settles onto the star, the reflections drift and stop, then the cut goes back wide. Reduced motion: a still frame inside the crossfade. Approved ("Yes, queue it").
   Tom, 2026-11-17, on the first cuts: "the cinematic intro for when the telescope goes has a stupid zoom in cut for every one -- static angles, slow moving geometry -- think ace combat / coen -- also -- the telescope rises up from below in the final shot -- dont forget we're gonna spruce up those models like fuck later". Approved reading ("Yes, go"): every cut is a locked camera, a fixed angle and a fixed lens, with no push and no zoom. Only the machine moves in the frame, slowly and heavily. Hard cuts between static frames, each held a beat longer. The final lens shot is locked on the open slit; the tube rises into frame from below until the objective glass fills it, with tonight's stars reflected, then the cut goes back wide. The models gain detail later; the cuts pick it up.
   Tom, 2026-11-17, on the locked cuts: "Better cadrage please -- also the final cut hangs a bit after the telescope slowly pivots / traverses in place -- when are the upgrades to the observatory model / telescope being done? keep in mind that that model only needs to play for the cut and can be LOD'd out in default mode". Reading: (a) a hero model of the main dome and the telescope, with full detail, shown only in the cuts; the wide shot keeps the light model. (b) Every cut is recomposed on the hero model: strong lines, clear negative space, the moving part crossing a fixed edge. The near-static gear cut gives way to the tube lifting. (c) The final shot: the tube rises into the locked frame, pivots slowly in place, stops, and the shot holds about 1.5 s before the cut back wide.
3. **Back to the wide shot.** The domes turn to the star; the tube hunts for it.
4. **The lights.** While the telescope hunts, the complex lights dim (windows, door lamps, road lamps). When it locks on and the survey starts, they go off. "Survey" is tracking and the time inside the telescope. Back to aim: the lights come up again, slowly.

Blockout v2 (woods, clearing, three domes, building, shed, road, the camera on the rise) is approved.

## The machine

1. **Aim.** The pointer moves the laser (mouse: move; touch: drag). The cupola turns after the beam's azimuth at a capped speed, with ease in and out.
2. **Pick.** A tap or click picks the brightest catalog star near the beam end.
3. **Open.** The slit shutter opens, about 4 s, if it is shut.
4. **Slew.** The cupola turns to the star; the tube slews in its mount. The tube and the dome arrive together.
5. **Track.** The tube follows the star as the sky turns; the cupola steps after it. A small tracking light comes on.
6. **Idle.** After the sleep time, the shutter stays as it is; nothing moves.

## Inside the telescope

Approved by Tom as proposed.

1. **The way in.** The camera goes through the open slit and down the tube in about 2 s and arrives at the eyepiece.
2. **The view.** A round 2° field, black outside. The target star sits in the centre with a slight shimmer from the air, in its true colour from the colour index. Real catalog stars nearby are in their true places; pseudo faint stars fill the field.
3. **The data.** Sparse instrument text in Railgun's register. No panels.
4. **The hand.** A drag nudges the field (fine aim). A tap on a nearby star slews to it, and the data changes to that star. Back or Esc returns to the hill.

```
  HIP 32349                    TRACKING ●
  SIRIUS · α CMa
                 .
        .      ╭─────╮       .
              (   ✦   )
     .         ╰─────╯           .
                        .
  RA 06h 45m 09s   DEC −16° 42′ 58″
  MAG −1.46   A1V   9 900 K   8.6 ly
  ▁▂▃▅▇█▇▅▃|▂▁ ▁|▁   spectrum
  LIGHT LEFT IT IN 2018
```

| Data | Source |
|---|---|
| Name, Bayer and Flamsteed, HIP number | Catalog |
| RA, Dec, magnitude, spectral type, distance | Catalog |
| Temperature | Pseudo: from the colour index |
| Spectrum strip | Pseudo: lines that suit the spectral type |
| "Light left it in" | Pseudo: this year minus the distance in light years |
| Tracking light | Pseudo |

## The catalog

- **Source.** HYG, the current release from its author's repository. Licence CC BY-SA 4.0: credit in `CREDITS.md`; the cut-down file carries the same licence.
- **Download.** About 30 MB as CSV. It goes to the scratchpad, not the repo. Ask Tom first, with the file name, the source and the size.
- **The cut.** A script, `tools/hyg-cut.mjs`, keeps stars to magnitude 6.5 (about 9,000) and the fields above. It writes `observatory/stars.bin` (packed numbers) and `observatory/stars.json` (names). Target: under 300 KB together, inside the 1 MB toy budget.

## Bar v2 and settings

| Slot | Holds |
|---|---|
| Bottom left (actions) | `Enter` (E): into the telescope, when a star is picked; `Back` (Esc) inside |
| Bottom right (slider) | `Time`: real speed to fast; trails above a set speed |
| Settings | Letterbox; Resolution; Quality |
| Dev (`?dev`) | Camera eye, pitch, yaw and field of view (memory: scene camera in Dev); latitude; look values copied from Railgun |

## Rules that apply

- Sound muted by default; it starts after a gesture. Voices: dome motor, shutter, a quiet wind.
- Idle: no rAF loop after 60 s. Fast time is "drifting" at 30 fps. Hidden: stop at once.
- Reduced motion: real speed only, no trails; the flight down the tube becomes a crossfade.
- Budgets: 30 fps or better, first frame under 3 s, toy files under 1 MB.
- Feature bean: worktree `.worktrees/stimming-wqq9`, branch `feature/stimming-wqq9`, merge by PR.
- Lab first: a `toys.json` entry and a Lab menu entry with the icon, as in the Lantern lake commit `acd73c78`.

## Order of work

1. **Blockout, for Tom's sign-off.** Grey hill, dome, drum, slit, tube, the laser, the cupola turning after it, a plain star field. No look, no catalog.
2. The catalog: download (Tom's yes), the cut, the real sky.
3. The machine: pick, open, slew, track.
4. The look from Railgun: haze, grade, grain, bloom; the laser in haze.
5. Fast time and trails.
6. Inside the telescope.
7. Sound, Bar v2, QA at 1280 px and 375 px.

## Left to the builder

- Mesh detail, materials and the drum's stone.
- The exact cap speeds and easings, inside "real speed or slower".
- The packing format of `stars.bin`.
- Which Railgun post modules to copy, and how to trim them.
