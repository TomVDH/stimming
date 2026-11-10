---
# stimming-f793
title: 'Toy: Railgun'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-09T19:40:51Z
updated_at: 2026-11-10T21:23:59Z
---

Railgun (`railgun`). One colossal planetside railgun on a braced pylon; hold to charge, release to fire; the slug crosses the sky and shatters a looming asteroid. Plan: `docs/plans/railgun.md`. three.js 0.170 on K2 and K6 lifted from `launch/index.html`. Bar v2.

## Checklist

- [x] Task 1: skeleton and kits from launch; gun, cradles, ground, sky, rock, plume, scale lights; camera with dolly; post chain; loop; pointer
- [x] Task 1: Bar v2 spec, `toys.json`, `docs/plans/railgun.md`, menu tile and hook
- [x] Task 1: stills at 1280 × 800, 375 × 812, 812 × 375, Dusk 0 / 0.5 / 1 (headless Chrome)
- [x] Task 1: checkpoint with Tom: the cadrage. Tom (13:17): far further away, a Villeneuve static shot. Done: eye at 3 km, 32° lens, locked off, no dolly, barrel at 18°
- [x] Task 2: approach and hold; charge: chase, cells, arcs, dust, sky dim, push-in, shake; `__qa.charge`, `__qa.jump`
- [x] Task 2: checkpoint: the draw. Tom (13:29, 13:33): daytime or dusk; the gun is stone with nothing glowing; keep the escalating charge chaos; the rock far out so the bolt takes seconds
- [x] Task 3: shot: slug, muzzle flash, bolt, Mach ring, recoil, hit, shards, burst, flash, respawn; `__qa.shoot`
- [x] Task 3: checkpoint: the slug (stills sent 13:45)
- [x] Task 4: sound: wind, hum, clicks, slug, crack at the Mach arrival, rumble; Q9 (context runs on hold, hum stops on release and on mute, pending drains, suspended after settle)
- [x] Task 5: persistence, reduced motion, Q1 to Q10 at three sizes, `tests/bar-v2.html` 98/98; fps below
- [x] Task 5: fresh-eyes review of the branch, then the PR (PR 32)
- [x] Task 6: Tom's TLC pass (2026-11-09): one artillery piece, not a ramp; straight hard-surface blocks; no standing stones
- [x] Task 6: an old gun on a fixed terraced mount; aged concrete shading; a sun depth map; a raking sun
- [x] Task 6: the barrel lowers 14° after the shot and climbs back to 26° for the next rock
- [x] Task 6: dust and strikes land on the plain outside the terraces; the portrait eye stands 3 km back
- [x] Task 6: QA again at 1280 × 800, 375 × 812, 812 × 375: no console errors; hold 30 fps, shot 30 fps; sleep and hidden draw 0 frames; Space charges and fires
- [x] Task 7: the gun after Tom's reference still: a banded round barrel, a breech housing, booms, a pylon with braced struts; two sibling guns far off
- [x] Task 7: the aim drops to 6°; the barrel lowers 4° after the shot; the rock sits low over the horizon
- [x] Task 7: open flats with a few faraway mesas, no ranges (Tom: the ranges enclosed the scene); long cirrus streaks
- [x] Task 7: QA again at 1280 × 800, 375 × 812, 812 × 375: no console errors; hold 30 fps, shot 30 fps; sleep and hidden draw 0 frames; Space charges and fires
- [x] Task 8: the meteorite: a displaced rock, a raymarched volumetric smoke train, Rayleigh air
- [x] Task 9: the rock starts high and falls head-on along its trail in 220 to 380 s
- [x] Task 9: ONE gun on a turning deck, a richer model; it tracks the rock
- [x] Task 9: a ten-partial harmonic charge synth; rage at a full hold
- [x] Task 9: muzzle blast, shock rings, dust front; a bolt with a width in metres that foreshortens
- [x] Task 9: impact fireball, two shock shells, blast light on the plain, the gun and the smoke
- [x] Task 9: QA again at 1280 × 800, 375 × 812, 812 × 375, rungs 2 and 3: no console errors; hold 30 fps, shot 30 fps; sleep and hidden draw 0 frames; reduced motion clean
- [ ] Tom sets the Dutch name (proposal: Spoorkanon) and IPA
- [ ] Record the session cost

## Rulings (2026-11-09)

- Flat plateau, no ridge: the cradles grow with the barrel to 580 m. Scale reads better; one mesh fewer. Cost if wrong: a heightfield under the axis.
- The composer renders into a multisampled half-float target through RenderPass; no separate scene target. Cost if wrong: one extra pass.
- Four cradles at stations 0.22 to 0.89, not nine: from the eye they overlapped into a wall.
- Scale lights are instanced quads with alpha one. gl.POINTS worked, but additive blending scales by alpha, so the first version was invisible.
- The plume streams across the sky, not down the axis: along the axis it foreshortened into a halo.

## Blockout notes (2026-11-09)

- Eye at (150, 64, 250), yaw 0.24 rad left, FOV 44 landscape, 64 portrait; the horizon on the lower quarter.
- Rails 22 × 34 m, gap 28 m, 1,400 m at 24°; breech block 96 × 76 × 70 m; cradles 11 m uprights, 95 × 9 m lintels.
- Rock at 5 km on the axis; Mountain spawns at s 0.55 (2.8°). Key light `(0.5 + 2.5·near²)·burn`.
- Dusk: sun 7° to 18° under, `7 + 11·(1 − v)²`, default 0.5.
- Headless QA runner: scratchpad `qa.mjs` on Playwright 1.62 with the Chrome channel and the GPU flags; the browser pane runs throttled while hidden.
- Tom asked for a far, static, Villeneuve-like shot: the eye moved to (1500, 70, 1800), lens 32°, horizon on the lower third, no dolly, no wobble; the barrel dropped to 18° so the rock stays in frame at every size.
- Charge cells moved from the inner faces to the rail flanks and tops: the inner faces never face the eye. Arcs bow up above the rails so they read against the sky.
- Tom (13:29): a day or dusk scene, and no glowing parts on the gun. The night K2 sky became a sunlit dusk sky; cells, seams, chase glow, beacons and service lights are gone. The charge reads as lightning over the gap, dust lifting and a shake, all growing with the hold.
- Tom (13:33): the rock far out, the bolt in flight for seconds. DA 40 km (same angular size), flight 9 s at a tap to 6 s at full charge; chaos saturates over 4 s, power over 2.5 s.
- The shot runs on a hand-rolled state keyed to the sim clock, not a GSAP timeline: fewer moving parts for one sequence. Cost if wrong: the same code in GSAP form.

## QA (2026-11-09, headless Chrome on Metal, 1280 × 800)

- Q1 `node --check` clean on the toy module and the four menu scripts. Q2 clean console through chips, slider, Settings, hold, release, Space, drag.
- Q4 zero `requestAnimationFrame` calls in 2 s once asleep (`?sleep=2500`). Q5 zero when hidden. Q6 reduced motion: clean, no arcs.
- Q7 two visible controls. Q8 Space charges and fires. Q9 see Task 4. Q10 hold 30 fps, shot 30 fps (the 30 fps film cadence is the cap).
- `tests/bar-v2.html`: DONE 98/98.
- Tom checks fps, sound by ear and the hold on a real device.

## Review (2026-11-09, fresh reviewer on the branch)

- Fixed: a hidden tab left the hold alive and the sound dead on return. The hidden branch now cancels the hold and stops the hum at once; the visible branch resumes the context when sound is on.
- Fixed: window blur fired the gun; it now cancels the hold. A second pointer is ignored while one holds. Space and the pointer own their holds; only the owner releases.
- Fixed: a NaN in the dust alpha (3.1416 > pi), the dust buffer (400 to 640), the Asteroid chip restoring the plume mid-shatter, reduced motion (shards do not spin, flashes halve), the QA charge hook clamp, a dead GSAP import, stale comments, the Alpha tag on the tile, a second rest ask after a pending rumble.
- Deferred (minor): a faint seam where the 30 km ground meets the sky dome at the horizon, unverified; depth precision at 40 km with near 0.5 and far 300000 is two steps of margin on the plume, unverified.
- Ruling: the wind bed's source and LFO are not tracked; they are a continuous bed gated by gain and die with the context. Cost if wrong: two idle nodes.

## Notes for other toys (2026-11-09)

- Tom: the trail shading "VERY impressive"; it may go to another toy ("ten seconds"). The `vol` and `trail` blocks in `railgun/index.html` lift as a pair.

## Main shelf (2026-11-10)

- [x] Menu icon: the far shot at dusk (icons/spike-railgun-2.html, A); the rock follows the pointer, rest to charge and fire, the clouds flash
- [x] Main shelf as beta: number 40, stage beta; Tom's call
- [x] Emblem for the intro (shared/emblems/railgun.svg) and an accent (proposal: dusk lilac to fireball amber; Tom sets the final)

## Final tweaks (2026-11-10)

- [x] Remove the case ejection synth; the landing thump stays
- [x] Case smoke wisp: built, then removed at Tom's call
- [x] The soot cloud: lobed billows, a curl warp, rim-first erosion into tufts, gone by 30 s
- [x] A thin first shock skirt leaves the hit to ten radii in a second
- [x] The charge dust ring centres on the plinth and never breaks
- [x] The shot dust wall and pall fan out in an arc ahead of the bore

- [x] Cirrus: thin streaks run across the whole sky; random seeds no longer leave it bare

- [x] Soot cloud: about two thirds the density, fewer steps once it is soot
- [x] A thin shock skirt leaves the muzzle and grows to about a kilometre
- [x] Air distortion: both shock fronts refract the frame; the hot barrel shimmers

- [x] Charge dust rebuilt: radial inflow, a low streaked sheet, beat rings, rage devils, uneven tops; the shot blows the ring outward


## Cinematic pass (2026-11-10)

- [x] 4. The sky answers the blast: the light sweeps out at 60 km/s, a 15 s amber afterglow, a slow heave bows and clears the cirrus, the plain takes the blast light
- [x] 1. Light shafts: the fireball throws shafts through the soot for about 20 s; the gun's shadow cuts the dust (the sun stays behind the camera, so no sun shafts in frame)
- [x] 2. Smoke shadows (see the queue)
- [x] 3. Air, distance and dust: the plain and mesas take the Rayleigh air; each shot loads the low air with dust that hazes and reddens it, settling over a minute
- [x] 6. Lens: a blue-white streak on the muzzle flash, warm halation in the widest bloom, procedural lens dirt that lights with the bloom (off on rung 3)
- [x] 7. Debris lights the plain: a landing throws a ring of dust and leaves an ember pool that cools over about twenty seconds
- [x] 5. The plain answers the shock: sand ripples trail the Mach front; three thin devils wake on the plain ahead as the front reaches them
- [x] 8. The gun breathes: steam from the housing joints during the charge, a dull red barrel tail over about 40 s, thin sand streams from the ledges after the kick
- [x] 10. Exposure and focus: the exposure dips after the hit (about 40 %) and the muzzle flash (15 %) and recovers over seconds; the lens softens on the hit and refocuses in about a second
- [x] 9. A slow sun drift: ±3° round the slider over ten minutes, stepped every 2 s, never below 2°, off under reduced motion and during the Reset spin

- [x] Fix: charge dust back to the old frame cost (36 ms vs 57 ms at a full hold, headless)
- [x] Fix: the cloud glow and the heave taper out; nothing cuts
- [x] Fix: no smoke hangs at the muzzle; the bolt trail drifts on the wind and fades in about 15 s

- [x] Fix: the night plain stays dark; the rock only warms it
- [x] Fix: more contrast and colour in the grade, a deeper vignette
- [x] Fix: the blast lights the meteor trail softly; the trail lingers about 150 s
- [x] Fix: softer, cheaper shafts; the cirrus glow fades over about 80 s
- [x] Fix: depth: the soot draws before the trails; the soot hides shards, sparks and trail behind it; far shards take the air
- [x] Fix: with no rock in the sky the bolt flies along the bore

- [x] Fix: the sky glow fades with the big flash, gone by about 15 s; the blast lights the trail softly, so its creases show


## Queue from Tom (2026-11-10), in order

- [x] Night flash: the foreground stays a stark silhouette against the lit sky
- [x] 2. Smoke shadows: the soot ball's shadow, steered so it falls on the seen plain and the gun; the trail's real shadow lands out of frame, so it is left out
- [x] Remove the light shafts altogether
- [x] Light the comet's main smoke column properly again under the blast
- [x] Remove the small ejecta that have no full trail
- [x] The big trailed ejecta fall a little faster
- [x] Rework the charge dust at the base: it still slows the whole toy
- [ ] Post pass: FXAA, AO, better bloom; every pass scales with the quality ladder
- [x] Quality ladder: 100/82/68/55 % of the quality's resolution per rung, High capped at 2x, FXAA when MSAA drops
- [x] Remaining cinematic items: 3, 5, 6, 7, 8, 10, 9

- [ ] The muzzle: flash, ring, shock wave and smoke puffs, one more look
- [x] Release lag spike: a warm-up frame behind the intro links every program and uploads every buffer (programs flat at 67 from load); the echo impulse builds in idle time during the hold; the shot samples prefetch in later()
- [ ] Last: one more look at the charge-up effect

- [x] The soot cloud: lit like the trail, pale ash as it cools, thinner as it grows
- [x] The case lands without the synth thump

- [x] Faint glow globes round the falling debris after the blast
- [x] The charge dust: closed-form shading, fewer steps, a tighter bound (58 ms to 14 ms a frame at a full hold, headless)
- [x] Daytime cirrus: denser and brighter by day, still subtle until the blast lights it
- [x] Fiery sky: a hotter, wider glow on the clouds and the trail at the hit, still ending with the flash
- [x] The mid rock is the default; each Reset brings the next size

- [x] The blast lights the asteroid's tail down its whole length, fading with the flash

- [x] Less white wash on the clouds; a bright rim runs at the light front first; the impact cloud swells in lobes and shears with the wind

- [x] The tail's end frays into the impact cloud; the tail takes the blast light all at once, not as a front crawling up it

- [x] A gentle glow globe lingers round the blast for about 10 s; the cirrus melts into the horizon

- [x] No orange night glow on the base or the plain; the rock warms only a pool under it
- [x] The ridged cumulus near the horizon melts into the haze at its base; the cirrus edge is back as it was

- [x] Blast light reaches every object at the same moment (no travel delay)
- [x] The lingering glow lights the plain and the gun's side that faces the blast
- [x] Glow globes smaller and quieter; they light the smoke round them from inside
- [x] Trailed debris: wider spread, more speed, falling on the arc the rock came in on
- [x] The big tail fades out slowly after the hit, starting sooner; no broken look
- [x] The cumulus heaps dissipate when the blast hits; no hard tufts

- [x] The storm tower reacts more to the blast; two more towers spread across the sky

- [x] Settings: long choices step instead of overflowing; graphics rows for Resolution, Smoke detail, Bloom and FXAA

- [x] Muzzle: a tighter flash, a torn shock disc square to the bore, smoke from the brake ports
- [x] Ejecta: dark silhouettes, faint embers and globes; half burn away in the air, the rest land and their trails fade; the case lands without a jolt

- [x] The clouds' shock rim is a faint warm ripple, not a white wave; the impact cloud takes the moon at night; the gun fires only when aimed; the storm towers ripple as the blast wave passes

- [x] The barrel heats only once the slug leaves; no glow through the over-hold; the conical muzzle plume (fire and smoke) is off, for a redo

- [x] Muzzle redo: a bright brief flash, a torus shock ring square to the bore, a billowing smoke burst lit by the flash
- [x] The impact lens flare is a wide orange glow
- [x] Projectile redo: it lights the clouds and the sky faintly as it races past

- [x] Muzzle: a cinematic redo: a volumetric white vapour ring square to the bore, a short fireball, a lobed smoke burst
- [x] Storm towers: a slow lean away from the hit and a long gentle swell, not a wobble

- [x] The bolt flies 2.5 s longer; its sky and cloud light is much subtler; it lights the plain faintly as it climbs

- [x] Night: no orange on the plain or the gun: the rock lights nothing near at night, and the haze takes the bare sky

- [x] Cirrus edges feather into the sky; towers and heaps stand off it with light through their bodies and silver edges

- [x] Towers lean hard and slump as the wave passes and ease back over a minute; heaps clear slowly; horizon clouds take the tail's light model (Beer, multiple scattering, two-lobe phase, powder), as in Window seat

- [x] Storm towers rebuilt as raymarched volumes lit like the comet's smoke (light marched through them, dark undersides); lumpy columns, anvils sheared downwind; the blast wave leans them; card heaps dim at night

- [x] Clouds: the card towers return in their old form, scattered (four, uneven sizes, distances and gaps); heaps and towers take the full distance haze and hue shift, the tail's light model, dark bases and a dim night; the volume towers are gone

- [x] Villeneuve grade: AgX tone mapping, colour pulled back, cool shadows and warm highs, a soft matte floor, more contrast; moonlit silver tops on the clouds at night
