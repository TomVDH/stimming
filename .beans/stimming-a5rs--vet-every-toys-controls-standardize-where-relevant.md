---
# stimming-a5rs
title: Vet every toy's controls; standardize where relevant
status: todo
type: epic
created_at: 2026-11-17T08:18:27Z
updated_at: 2026-11-17T08:18:27Z
---

Tom, 2026-11-17: "we may as well make a bean to fully vet all controls per toy and ensure we have standardized controls where relevant".

Vet the controls of every toy, one toy at a time, against the bar standard. Where a control has a standard part or a shared verb, the toy uses it. A toy that needs a change gets its own child bean; this bean changes no toy.

## What to check on each toy

1. Every control is one the toy needs. Cut what nobody uses.
2. The bar holds five visible controls at most: one choice, three actions, one slider. The rest lives in Settings.
3. Verbs: `+ Noun` adds, Shuffle randomizes, Clear empties, Reset returns to the start. With Clear on the bar, Reset sits in Settings. An own verb is one literal word.
4. Settings holds what a player wants. Tuning for builders sits in Dev.
5. Labels: one or two words, and the same word for the same thing across toys.
6. Keys: four entries at most; every action key and option key is listed; touch words are right.
7. Hard cases draw well in the Signal bar (`barlab/`): long lists, long choice rows, grouped rows, held actions, a bar with no controls.
8. Contrast: text on a held pick reaches 4.5:1 with the toy's accent. Measured on 2026-11-17: honey, turing, calaeno, meshball and lavaskin need the lightest stop of their accent; the lab does that now.

## Method

- The list below is a static read of each `bar` spec: 86 toys, 11 with a flag. A count can be off where a spec builds its rows in code. Open the toy at `barlab/?t=<id>` to see the truth.
- Tick a toy when Tom has seen it, or when it has a child bean for its changes.
- 25 toys pass no `bar` spec (Bar v1 or their own shell). They are listed last; each needs a port before this check.

## Toys with a bar spec

- [ ] `balloons` (main): choice Foil; actions let go, type; keys 4. Own verbs: let go, type
- [ ] `bubbles` (main): actions blow, clear (1 held); no key strip. Own verbs: blow. **Check: no key strip**
- [ ] `cauldron` (main): choice Add (tray); slider Fire; actions add, clear; Settings 1 (1 toggle); Dev 11; keys 4
- [ ] `chamber` (main): choice Source; slider Magnet; actions shower; keys 2. Own verbs: shower
- [ ] `chladni` (main): actions shuffle, reset; keys 4
- [ ] `dijkstra` (main): choice Search; actions shuffle, remap, clear; Settings 3 (1 slider, 1 toggle, 1 choice); keys 4. Own verbs: remap
- [ ] `domino` (main): choice Add (tray); actions iso, clear; Settings 2 (1 toggle, 1 choice); keys 4. Own verbs: iso
- [ ] `eyes` (main): actions shuffle, shake, blink; keys 4. Own verbs: shake, blink
- [ ] `ferro` (main): choice Fluid; slider Field; actions drip; keys 4. Own verbs: drip
- [ ] `fidget` (main): actions reset; keys 4
- [ ] `fire` (main): choice Salt (stepper); slider Intensity; actions reset; Settings 5 (2 sliders, 3 choices); keys 4
- [ ] `fireworks` (main): choice Shell (tray); slider Distance; actions showtime; Settings 4 (4 choices); keys 4. Own verbs: showtime
- [ ] `foghorn` (main): choice Time; slider Fog; actions horn; Settings 1 (1 slider); keys 2. Own verbs: horn
- [ ] `frietkot` (main): Settings 6 (1 slider, 2 toggles, 3 choices); keys 2. **Check: no control on the bar**
- [ ] `galaxy` (main): choice Add (tray); slider Gravity; actions clear; Settings 2 (2 sliders); keys 4
- [ ] `glass` (main): choice Glass (stepper); actions rewind; Settings 1 (1 choice); keys 4. Own verbs: rewind
- [ ] `ink` (main): choice Ink; slider Weight; actions drop, clear; Settings 3 (3 choices); keys 4. Own verbs: drop
- [ ] `kaleido` (main): choice Mirrors; actions shuffle; keys 4
- [ ] `ladder` (main): slider Gap; actions blow (1 held); Settings 1 (1 choice); Dev 14; keys 3. Own verbs: blow
- [ ] `launch` (main): choice Rocket; slider Dawn; actions launch; Settings 5 (3 sliders, 1 toggle, 1 choice); keys 3. Own verbs: launch
- [ ] `lava` (main): choice Colour; actions flip, shake (1 held); keys 4. Own verbs: flip, shake
- [ ] `lichtenberg` (main): choice Board; slider Voltage; actions clear; Settings 3 (3 sliders); keys 4
- [ ] `magnet` (main): actions ring, hex, shuffle; Settings 1 (1 toggle); keys 4. Own verbs: ring, hex
- [ ] `meshball` (main): choice Goo; slider Mesh; actions squeeze (1 held); Settings 1 (1 slider); keys 3. Own verbs: squeeze
- [ ] `morpher` (main): choice Shape (stepper); slider Blend; actions clear; keys 4
- [ ] `neon` (main): choice Gas (stepper); actions undo, clear; Settings 3 (1 toggle, 2 choices); keys 4. Own verbs: undo
- [ ] `pendulum` (main): choice Pendulums; actions release, stop, iso; keys 2. Own verbs: release, stop, iso
- [ ] `pins` (main): choice Finish; actions shuffle; keys 4
- [ ] `pool` (main): choice Tool; actions clear, rain; Settings 2 (2 choices); keys 4. Own verbs: rain
- [ ] `pop` (main): choice Material (stepper); actions shuffle, reset; keys 4
- [ ] `prism` (main): choice Light (stepper); actions add, clear; Settings 1 (1 toggle); keys 4
- [ ] `putty` (main): choice Putty; actions clear; keys 4
- [ ] `railgun` (main): slider Time; actions sight, reset; Settings 5 (1 slider, 1 toggle, 3 choices); Dev 56; keys 4. Own verbs: sight
- [ ] `rain` (main): choice Weather; slider Wind; keys 3
- [ ] `schlieren` (main): choice Source; slider Sensitivity; actions blow (1 held); Settings 1 (1 choice); Dev 5; no key strip. Own verbs: blow. **Check: no key strip**
- [ ] `scope` (main): choice Mode; slider Pitch; actions shuffle, clear; no key strip. **Check: no key strip**
- [ ] `shadyos` (main): choice Drag; slider Age; actions add, error, clear; Settings 4 (2 toggles, 2 choices); Dev 9; no key strip. Own verbs: error. **Check: no key strip**
- [ ] `soap` (main): choice Soap; actions new, blow; no key strip. Own verbs: new, blow. **Check: no key strip**
- [ ] `sonar` (main): choice Display; slider Range; actions ping, shuffle; Settings 3 (2 toggles, 1 choice); no key strip. Own verbs: ping. **Check: no key strip**
- [ ] `spark` (main): choice Sparks; actions grind (1 held); Settings 3 (1 slider, 1 toggle, 1 choice); keys 3. Own verbs: grind
- [ ] `steelwool` (main): choice Grade; actions blow, reset (1 held); Settings 1 (1 slider); Dev 7; keys 3. Own verbs: blow
- [ ] `trails` (main): choice Sky; slider Exposure; actions shutter, clear (1 held); Settings 3 (3 choices); keys 2. Own verbs: shutter
- [ ] `trainride` (main): choice Weather; slider Speed; actions line; Settings 4 (2 toggles, 2 choices); keys 4. Own verbs: line
- [ ] `tvtree` (main): actions shuffle, eyes, lights; Settings 1 (1 button); keys 4. Own verbs: eyes, lights
- [ ] `vortex` (main): choice Sheet; slider Haze; actions pair, collide, clear; Settings 4 (1 slider, 3 choices); keys 4. Own verbs: pair, collide
- [ ] `walker` (main): Settings 2 (1 toggle, 1 choice); keys 4. **Check: no control on the bar**
- [ ] `washer` (main): choice Surface; slider Fan; actions reset; Dev 5; keys 3
- [ ] `washline` (main): slider Sun; actions add, release; Settings 1 (1 choice); keys 3. Own verbs: release
- [ ] `windmap` (main): choice View; slider Wind; actions add, isobars, fronts; Settings 5 (1 toggle, 4 choices); keys 4. Own verbs: isobars, fronts
- [ ] `window` (main): choice Time of day; slider Storm; actions dim, light, cozy; Settings 7 (1 toggle, 6 choices); keys 4. Own verbs: dim, light, cozy
- [ ] `windtunnel` (main): choice Shape; slider Wind; actions puff; Settings 1 (1 choice); Dev 5; keys 4. Own verbs: puff
- [ ] `ascent` (lab): choice Camera; slider Flight; actions restart, pause; Settings 2 (1 slider, 1 choice); Dev 2; keys 3. Own verbs: restart, pause
- [ ] `beer` (lab): choice Beer; slider Fizz; actions pour, sip, clear; Settings 3 (1 toggle, 2 choices); keys 4. Own verbs: pour, sip
- [ ] `bench` (lab): choice Experiment; slider Current; actions stir, reset; Settings 2 (2 choices); no key strip. Own verbs: stir. **Check: no key strip**
- [ ] `bismuth` (lab): choice Habit; slider Heat; actions harvest, clear; Settings 3 (1 slider, 1 toggle, 1 choice); keys 4. Own verbs: harvest
- [ ] `bowl` (lab): choice Bowl; actions strike, hush; Dev 7; keys 4. Own verbs: strike, hush
- [ ] `bread` (lab): slider Tube; actions coin, add; Settings 5 (2 sliders, 2 toggles, 1 choice); keys 4. Own verbs: coin
- [ ] `calaeno` (lab): choice Craft; slider Sun; Dev 11; no key strip. **Check: no key strip**
- [ ] `canal` (lab): choice Weather; slider Dusk; actions add; Settings 1 (1 toggle); keys 4
- [ ] `carwash` (lab): actions proceed; Settings 2 (2 choices); Dev 8; keys 2. Own verbs: proceed
- [ ] `chocolate` (lab): choice Chocolate; slider Lamp; actions add, clear; Settings 3 (3 choices); keys 4
- [ ] `coil` (lab): actions nudge, reset; keys 3. Own verbs: nudge
- [ ] `crossing` (lab): Dev 2; keys 3. **Check: no control on the bar**
- [ ] `cuttle` (lab): choice Display; slider Zoom; actions ink; Settings 1 (1 toggle); Dev 5; keys 4. Own verbs: ink
- [ ] `dandelion` (lab): actions blow, regrow (1 held); keys 3. Own verbs: blow, regrow
- [ ] `fireflies` (lab): choice Rhythm; slider Pull; actions shuffle, lead (1 held); Dev 7; keys 4. Own verbs: lead
- [ ] `flametest` (lab): choice Salt (stepper); slider Air; actions flick, shuffle; Settings 3 (2 toggles, 1 choice); keys 4. Own verbs: flick
- [ ] `honey` (lab): choice Fluid; slider Height; actions pour, clear (1 held); keys 4. Own verbs: pour
- [ ] `hotice` (lab): slider Cold; actions reset; Settings 1 (1 toggle); Dev 1; keys 4
- [ ] `ice` (lab): choice Ice; actions dump, refill; Settings 2 (2 choices); keys 4. Own verbs: dump, refill
- [ ] `kintsugi` (lab): choice Glaze; Dev 7; keys 3
- [ ] `lanterns` (lab): choice Time; slider Wind; actions festival, clear; Settings 2 (1 toggle, 1 choice); Dev 5; keys 4. Own verbs: festival
- [ ] `lavaskin` (lab): slider Heat; actions surge, shuffle; Settings 1 (1 toggle); Dev 5; keys 4. Own verbs: surge
- [ ] `meteor` (lab): choice Size; slider Dusk; actions shower; Settings 2 (1 toggle, 1 choice); keys 3. Own verbs: shower
- [ ] `motorway` (lab): choice Style; slider Zoom; actions switch, rush, blackout; Settings 6 (2 sliders, 2 toggles, 2 choices); keys 2. Own verbs: switch, rush, blackout
- [ ] `nvg` (lab): choice Tubes (segments); slider Gain; actions ir, camera; Settings 5 (3 sliders, 2 choices); keys 4. Own verbs: ir, camera
- [ ] `peel` (lab): choice Film; slider Tack; actions add; Settings 2 (1 toggle, 1 choice); keys 2
- [ ] `phaeton` (lab): choice Mode; slider Slow-mo; actions load, lock, fire (1 held); Settings 2 (1 toggle, 1 choice); keys 4. Own verbs: load, lock, fire
- [ ] `purr` (lab): choice Pelt; actions shake; Settings 1 (1 slider); Dev 4; keys 4. Own verbs: shake
- [ ] `rubens` (lab): choice Voice; slider Volume; actions sweep; Settings 3 (1 slider, 1 toggle, 1 choice); keys 4. Own verbs: sweep
- [ ] `rupert` (lab): choice Light; slider Time; actions reset; Settings 1 (1 slider); Dev 4; keys 4
- [ ] `stone` (lab): choice Stone; actions wet, add; Settings 1 (1 slider); keys 4. Own verbs: wet
- [ ] `terrarium` (lab): choice Plants; slider Light; actions mist; Settings 1 (1 slider); keys 3. Own verbs: mist
- [ ] `tornado` (lab): choice F-scale (stepper); slider Storm; actions add, clear; Settings 2 (2 choices); Dev 3; keys 3
- [ ] `turing` (lab): slider Stripes; actions shuffle, clear; Settings 3 (2 sliders, 1 choice); Dev 4; keys 4
- [ ] `ulam` (lab): choice Spiral; slider Zoom; actions sweep; Settings 3 (1 toggle, 2 choices); keys 3. Own verbs: sweep

## Toys with no bar spec (25)

`cube`, `eastvan`, `flap`, `flock`, `foil`, `frost`, `gears`, `glow`, `harmono`, `harp`, `marble`, `musicbox`, `oilslick`, `orbits`, `plasma`, `sand`, `sequin`, `slime`, `snow`, `subway`, `tesseract`, `top`, `viaduct`, `windfarm`, `zipper`
