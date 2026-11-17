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
| The sky's time | Tonight's real sky: the real date and sidereal time, always drawn as night. At 14:00 you see the stars that are over the hill now. |
| The moon | None. A dark, moonless sky. |

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
- Daytime. The toy is always night.

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
  ·        ·    ·         ·      ·        ·   ·        ·
     ·        ·      ·        ·       ·  ✦     ·    ·
  ·     ·        ·       ·        ·       ╲        ·
      ·      ·       ·      ·      ·       ╲  laser    ·
  ·      ·       ·      ·       ·      ·    ╲     ·
  ░░░░░░░░░░░░░░░░░░░░░ haze ░░░░░░░░░░░░░░░░╲░░░░░░░░░░░░
                                        ▁▄▆██▆▄▁
  ▁▁▁▁▂▂▂▃▃▃▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄█▌▐█▄▄▄▄▃▃▂▂▁▁
  ████████████████████ hill ████████████████████████████
```

- **The shot.** Low, wide and locked off. The dome is small on the ridge, at about one third from the right. The sky fills about three quarters of the frame. A pointer move leans the lens a little, as in Railgun.
- **The observatory.** A white dome on a stone drum, a warm lit door, a dark slit, the steel tube out of it. The icon (A of `icons/spike-observatory-1.html`) sets the shapes.
- **The laser.** A thin green beam from the dome top to the aim point. The haze shows it, so it looks solid near the dome and fades with height.
- **The sky.** Tonight's real sky at 51° N, from the catalog, with no moon. It turns at sidereal speed. Railgun's haze and grade sit over it.
- **Fast time.** The Time slider runs the sky faster. Above a set speed, the stars draw trails with the accumulate and decay pass from `trails/index.html`, ported into the three.js chain.

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
