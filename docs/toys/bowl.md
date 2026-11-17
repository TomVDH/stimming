# Singing bowl (`bowl/`)

<!-- gen:identity -->
| | |
|---|---|
| Dutch | None yet (Tom sets it) |
| Motto | None |
| Shelf | Lab, tag "Stimming Lab" |
| Stage | None |
| Series | None (proposal: `science`) |
| Accent | `oklch(0.78 0.12 76)` |
| Sound | Yes |
| Legacy build | No |
| Signed off | No |
<!-- /gen:identity -->

## Idea

A heavy hammered bronze bowl with a little water stands on a dark table, seen from above and a little to the side. Circle the rim as with a wooden wand: a steady circle builds the tone, and the water answers with fans of fine ripples from the four points where the rim moves most. At full voice, drops leap from those points. Break the rhythm and the tone wavers; lift the wand and the bowl rings on for a long time. A tap strikes it like a bell.

## Controls

<!-- gen:bar -->
Bar: v3 (the default; the old bar still builds, hidden).

| Slot | Holds |
|---|---|
| Choice | Bowl, segments: Small, Medium, Large (keys 1 to 3) |
| Actions | Strike (key S), Hush (key H) |
| Key strip (old bar) | `[DRAG] circle the rim` · `[CLICK] strike the bowl` · `[HOLD] damp the bowl` · `[← →] circle the rim` |
| How to play (`help`) | Circle: Circle the rim. Click: Strike the bowl. Hold: Damp the bowl. ← →: Circle the rim. Enter: Strike the bowl. Space: Strike the bowl. S: Strike the bowl. H: Hush the bowl. 1 2 3: Change the size of the bowl |
| Settings | Quality (site) |
| Dev (`?dev`) | Eye: Height, Turn, Distance, Field of view. Look: Exposure, Ripples. Sound: Room (sliders, not persisted) |
<!-- /gen:bar -->

| Gesture | Does |
|---|---|
| Click or tap | Strikes the rim at the angle of the press. The wand taps and fades out. |
| Drag | Circles the rim. The angle round the bowl drives the wand; the distance from the rim sets the contact. A steady circle builds mode 2; an erratic one wavers. |
| Hold (300 ms, no move) | Rests the wand on the rim: the bowl damps fast and buzzes against it. |
| Keys | 1 to 3 pick a bowl. S strikes, H hushes. With the stage focused, Left or Right held circles the rim; Enter or Space strikes. |
| Wheel, pinch, tilt | None. |

A new bowl stops the old one, then rings once, softly, so its voice is heard.

## Renderer and libraries

<!-- gen:stack -->
| | |
|---|---|
| Tier | Raw WebGL2 |
| Libraries | None imported by the page; culori loads through `shared/stim.js` |
| Importmap | Word for word |
<!-- /gen:stack -->

The scene is one view of a few analytic shapes (two ellipsoids, planes, capsules), so a ray cast per pixel in one full-screen pass is the lightest tier that draws it (`docs/stack.md`, decision guide step 1).

## Shared modules

<!-- gen:shared -->
| Module | Imports |
|---|---|
| `shared/stim.js` | `initPage`, `whenVisible`, `reduced`, `onReducedChange`, `audioKit`, `linFit`, `sound`, `stage`, `pageReady` |
| `shared/intro.js` | `intro` |
| `shared/detail.js` | `detail` |
| `shared/glow.js` | `bloomChain`, `glowDetail` |
| `shared/output.js` | `OUTPUT` |
| `shared/grade.js` | `GRADE` |
| `shared/gl.js` | `program`, `linked`, `target`, `free`, `bind`, `tri`, `TRI_VS`, `onContextLoss` |
<!-- /gen:shared -->

Local copies: the value-noise GLSL (`NOISE`) follows `stone/index.html`. No shared module holds it yet; see `docs/plans/modularize.md`.

## Files

<!-- gen:files -->
| File | Lines | Role |
|---|---|---|
| `index.html` | 1537 | The page |
<!-- /gen:files -->

## Render pipeline

Bowl space: the widest outer radius is 1 and the table is y = 0. The outer and inner walls are ellipsoids cut by the rim plane, the foot and a flat inner floor. Each bowl's shape comes from `BOWLS` (`bowl/index.html:108`).

| Pass | Target | Shader or material | Does |
|---|---|---|---|
| Wave steps | Wave pair, 256, 384 or 512 square, RG16F or RG32F, ping-pong | `SIM_FS` (`:197`) | Passing waves only: the ring a strike throws in from the wall, and the dents of falling drops. Runs at a rate that keeps the scheme stable (`simTune`, `:987`); it stops 3.5 s after the last ring. |
| Height | Height map, the same size, R16F or R32F | `HEIGHT_FS` (`:228`) | Once a frame: the passing waves plus the rim's ripples. Eight sources on the waterline, at the antinodes and nodes of mode 2, each with the amplitude and phase of the mode's two tones (`heights`, `:1062`). |
| Scene | HDR frame, RGBA16F | `SCENE_FS` (`:255`) | Ray cast: the bowl CSG (`hitBowl`, `:310`), table, drops and wand as capsules. Hammered outer wall (blended Voronoi dimples), turned inner wall, half-round lip, water with refraction, reflection, caustics on the floor and on the wall above the water. A warm lamp in front on the left and a window pane behind the bowl light it. |
| Bloom | Half-size chain | `bloomChain` from `shared/glow.js` | Threshold 1.1; the glints on the water, the lip and the drops. |
| Composite | Screen | `COMP_FS` (`:708`) | Vignette and grain (`GRADE`), then exposure, film curve, sRGB and dither (`OUTPUT`). |

### Uniforms

Per bowl (`BOWLS`, `:108`). A person tunes these:

| Field | Meaning | Small, Medium, Large |
|---|---|---|
| `f` | Mode 2 pitch, Hz | 329.6, 220.8, 146.2 |
| `ratio` | Modes 2 to 6 as ratios to mode 2 | 1, 2.71, 5.06, 8.08, 11.8 · 1, 2.76, 5.2, 8.32, 12.1 · 1, 2.82, 5.4, 8.7, 12.7 |
| `split` | Each mode's two tones apart, Hz (the beat) | 2.3 to 10.4 · 1.4 to 8.2 · 0.8 to 6 |
| `tau` | Mode 2 decay to 1/e, s; higher modes decay as ratio to the power -0.85 | 9, 14, 21 |
| `shape` | Rim lift, foot cut, height, wall, floor, water depth | see the table in the page |
| `cells`, `cellsIn` | Hammer marks round the outside and the inside | 26/20, 34/26, 44/32 |
| `ripple` | Ripple wavelength, bowl units | 0.064, 0.052, 0.042 |
| `metal`, `patina` | OKLCH of polished bronze and patina | golden, warm, dark |
| `out`, `inner` | Patina amount outside and inside | 0.22/0.06, 0.36/0.14, 0.86/0.24 |
| `dent` | Hammer dimple depth | 0.42, 0.5, 0.55 |

Dev rows: Exposure scales the composite; Ripples scales the water height (slope about 0.1 at full voice); Room is the reverb send. The camera rows move the eye; `fitCamera` (`:771`) keeps the bowl clear of the top corners and the bottom row.

## Sound

| | |
|---|---|
| Graph | `audioKit()` |
| Engine | Raw Web Audio |
| Voices | Partials: modes 2 to 6, each two sine tones a split apart, into two virtual ears an eighth turn apart round the bowl (`buildAudio`, `:1157`). Each ear hears both tones, so a strike beats, and the beat swings between the ears. While the wand drives, the two tones merge and the pattern turns with the wand: a slow wah at four times the circling rate. Rasp: grit and a wooden drag from filtered noise, and a stick-slip buzz (noise pulsed once per cycle of mode 2); it ducks once the tone catches (`audioFrame`, `:1209`). Strike extras: three short high partials and a soft mallet knock (`strikeSound`, `:1262`). Drops: a small rising plip each, at most 20 a second. Fizz: faint high noise at full voice. Hush: a muffled thup. Room: a 2.4 s generated impulse that darkens as it decays. |
| Sleep | When the frame loop sleeps, each tone's level is set to fall on its own time constant (`audioTail`); the context suspends only after the slowest tone has faded (`restLater`, `:1255`). A hidden tab suspends it. |

The bowl state (two signed amplitudes per mode) is the one source for the sound, the water and the drops (`stepBowl`, `:839`). A steady drive grows mode 2 toward a level set by the circling speed; an unsteady one adds a wobble to the level and the pitch (`stepWand`, `:895`).

## Quality and performance

| | |
|---|---|
| Pixel ratio | `detail({ maxDpr: 2, budget: 2.2e6 })` (`:1041`); High gives the screen's ratio up to 3 |
| Slow-frame step | `detail()`: two seconds under 38 fps drop one level; the level also sets the wave map size (256, 384, 512) and the bloom levels |
| Idle | The loop runs while a hand or a key is on the bowl, the wand fades, a mode is above 0.09, drops fly, or passing waves are less than 3.5 s old (`busy`, `:1350`). Then it draws one flat frame and sleeps (`sleep`, `:1377`); the long tail goes on in the sound alone. |
| Reduced motion | No drops and no crinkle; the ripples run at half rate; the wand shows and goes at once; no canvas fade. |
| Measured | 2026-11-16, dev Mac, High, 2496 x 1504 px, GPU throughput in a background tab: 5.8 ms per frame while a strike rings, 7.4 ms at full voice with drops. Phones not measured. |

## State and storage

| Key | Holds |
|---|---|
| `stimming.bowl.sound` | Sound on or off |
| `stimming.quality` | Site quality (shared) |

Dev rows are not persisted.

## Tests and QA

No files in `tests/`. QA on 2026-11-16 in the built-in browser pane, with a throwaway probe page (manual frames, synthetic pointer events, canvas captures) and offline renders of the real audio graph (an `OfflineAudioContext` stepped at 60 Hz, checked by spectrogram and level): console clean; rub, tap, hold and an erratic circle by pointer; every Bar v2 control and key; idle after release; reduced motion by a forced media query; 1280 x 800, 375 x 812 and 812 x 375 layouts. A change must keep the console clean and hold Bar v2 compliance (`docs/plans/bar-v2.md`).

## Known issues

- The sound was checked by offline renders and spectrograms only, not by ear (`stimming-zsv0`).
- Motion was seen as stills from a manual frame driver; the live frame rate was not watched (`stimming-zsv0`).
- Phone frame times are not measured (`stimming-zsv0`).

## Legacy build

None.

## History

| | |
|---|---|
| Epic | None; feature bean `stimming-zsv0` |
| Plans | None; idea 256 in `docs/toy-ideas.md` |
| Version | None |
