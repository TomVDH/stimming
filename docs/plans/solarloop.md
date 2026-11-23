# Solar loop (`solarloop`)

Status: done as an MVP, 2026-11-23; the cinema pass (below) done the same day; the long lens next. Bean `stimming-e35i`. Toy doc: `docs/toys/solarloop.md`. Idea 238, group C: "Plasma loops rise off the sun's edge; tap for a flare."

## The hero moment

A close view of the sun's edge, as a solar space telescope sees it in extreme-ultraviolet light.
The disk fills the foot of the frame: a mottled surface with bright patches where loops stand.
Above the edge, loops of glowing plasma arc on magnetic field lines, fine threads in bundles. They rise, brighten, drain and fade, one after another, in slow, continuous motion.
Tap an active region and it flares:

1. Two bright ribbons flash along the region; the core saturates the detector, with a diffraction cross and a bleed line.
2. A twisted rope of plasma lifts off the limb and leaves the frame. A faint bubble swells behind it; a bright wave runs over the disk.
3. A new arcade of loops snaps in over the ribbons, low loops first, then higher ones, as the ribbons part.
4. The arcade cools, rain drains down its legs, and the region relaxes back to calm.

## Defaults (Tom's open question: 3D or flat, and the presentation)

| | Choice | Why |
|---|---|---|
| Space | 3D, seen as the telescope sees it: an orthographic view, the limb as a gentle arc across the lower third | Loops are 3D arches. Some stand on the near side, some rise from behind the limb with hidden feet, some lie on the disk, foreshortened. A drag turns the sun a little and shows the depth. |
| Look | Gold, the 171 band (iron at about one million kelvin) | 171 shows coronal loops as fine, sharp threads, the classic image of loops over the limb. Gold keeps it apart from Desert eclipse's white corona and pink prominences. |
| Other bands | Teal (131, hot flare plasma) and Red (304, cool plasma), as a choice | Each band sees a different temperature, so the same flare reads differently: Teal lights the hot arcade first; Gold sees it as it cools; Red sees the ribbons, the erupting rope and the rain. |
| Image | One intensity channel, then the band's colour table, after a log stretch, as the real images are made | The colour table gives the true look; bloom, saturation, the diffraction cross and the bleed line act on intensity. |
| Renderer | Raw WebGL2 on `shared/gl.js`: a disk and corona pass, instanced ribbon strands with additive blending (optically thin plasma), bloom from `shared/glow.js`, a final pass | Loops are thin and many. Strands as camera-facing ribbons cost little, at any count. |

## Physics (lengths in Mm; the sun's radius is 696)

| Part | Model |
|---|---|
| Disk | Network mottle at supergranule scale, finer speckle, limb brightening (a longer path through the thin corona), bright moss round loop feet |
| Corona | Off-limb glow falling with a scale height near 60 Mm, radial streaks, a haze over each active region |
| Loops | Arches between two footpoints on the sphere, height near half their span, a tilt and a shear. Each loop lives about 30 s: rises, brightens, drains (knots slide down its legs), fades, and returns with a new shape |
| Flare | Impulsive peak in 0.15 s. Ribbons part from 3 to 15 Mm. A rope rises with growing speed. Arcade loops form 0.5 s apart, low first, each born hot (20 MK) and cooling; the band's response sets when it shows. Rain from about 10 s. Calm by about 40 s |
| Detector | Above saturation: a diagonal cross of diffraction spots from the filter mesh, and a vertical bleed line from the readout |

## Bar v3

Choice Band (Gold, Teal, Red; keys 1 to 3). Slider Activity. Action Flare (Space). Tap a region to flare it; drag to turn the sun.

## Reference (looked at, 2026-11-23)

- TRACE, 171, coronal loops over the eastern limb, 6 November 1999: fans of fine threads, bright feet at the limb, a dark mottled disk.
- SDO, 131, 171 and 304, the limb flare of May 2013: a saturated core with a diagonal diffraction cross and a vertical bleed line; the colour tables of the three bands.
- Papers on flare-driven coronal rain: rain shows best in 304; in 171 it shows as knots and dark strands.

## The cinema pass (Tom, 2026-11-23)

Tom's words: inspired by Danny Boyle's *Sunshine* with a spritz of Villeneuve; better shaders, better LUTs, better effects, far more cosmic scale and feeling for the prominences.

| | Was | Now |
|---|---|---|
| Frame | 430 Mm across, a gentle arc | 1040 Mm across: the limb is a dome, half the frame is black sky |
| Prominences | None; only loops and the flare's rope | A hedgerow 165 Mm tall and an arch 205 Mm high, both tappable: each erupts and forms again |
| Scale | None | The earth at true size under the arch |
| Image | One intensity channel, log stretch, a detector's colour table | Two channels (hot, cool), a film tone curve, a colour ramp per channel per band |
| Effects | Bloom; a diffraction cross and a bleed line | Bloom, light rays and shafts, heat shimmer, colour split, halation, an anamorphic streak, lens ghosts, film grain |
| Disk | EUV mottle | Boiling granules, slow swirls, dark filaments |
| Sound | Crack, rush, roar, notes, rain | Plus a deep hum while awake and a low brass blast on each flare and eruption |

## Next: the long lens (Tom, 2026-11-23)

A long lens, a tight frame on a quarter arc of the sun (a crop of its top half), Mercury loosely visible in transit, layering and haze: the scale should feel creepy.

## Tasks

1. Blockout: disk, limb, corona, a few loops, camera. Screenshot.
2. Loops: bundles, life cycle, flows, drain.
3. Flare: ribbons, saturation, rope, bubble, wave, arcade, rain, relax.
4. Bands and colour tables; bloom; detector effects.
5. Drag to turn; frame loop, drift and sleep; reduced motion.
6. Sound.
7. Bar v3; icons; Lab entry; QA Q1 to Q10.
