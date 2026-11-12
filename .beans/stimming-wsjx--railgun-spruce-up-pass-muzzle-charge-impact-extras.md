---
# stimming-wsjx
title: 'Railgun: spruce-up pass (muzzle, charge, impact extras, post, PBR)'
status: in-progress
type: task
priority: normal
created_at: 2026-11-12T05:20:00Z
updated_at: 2026-11-12T06:20:00Z
parent: stimming-f793
---

Tom (2026-11-11): spruce up the railgun further. Open items from the railgun beans, plus Tom's live notes through the session. One pass on main.

## Checklist

- [x] Muzzle: a plasma spray (fine sparks, molten drops, port sprays), cut to fewer sparks at Tom's call
- [x] Muzzle: the vapour ring tears and wobbles; two smaller rings run out along the bolt's line
- [x] Muzzle: the fireball shows fire colour, not a clipped white disc; the smoke lights warm
- [x] Muzzle brake: a longer round sleeve with four port rings, a taper and a lip
- [x] Muzzle smoke: thinner, wider, gone by 6 s; the follow-up rings have their own tight volumes (the shot's frame cost is back near the old one)
- [x] Vent steam: lit as the comet trail is
- [x] The berm is sand in the plain's colour; the plain swells a few metres, flat round the mount
- [x] Charge: arcs pick the flank that faces the eye; they step 12 m toward the eye, so the barrel skin never hides them
- [x] Charge: crown arcs bow up into the sky; corona streamers reach off the brake
- [x] Charge: coil-stage hoops tried, then removed at Tom's call; the arcs carry the build again
- [x] Charge: field motes on Galaxy's dot look; CPU orbits round the barrel as a line mass (1/r pull, drag, a pull toward the muzzle); the shot hurls them
- [x] Charge dust: a spiral inflow; the sheet reaches out to about 1.1 km
- [x] Impact: two or three late bursts in the cloud (flash, sparks, light flicker, a thud each)
- [x] Impact: burning fragments rain from the cloud's underside for about 12 s
- [x] Impact: a heat shimmer column over the fire, strong 8 s, faint to 30 s
- [x] Impact: a far fire roar and crackle that track the fire
- [x] Back of the gun: two-tier back block, square edges; an armoured, chamfered counterweight with lugs and a yellow band
- [x] Back of the gun: vent louvres on the upper tier; a ripple of side steam jets before the case leaves
- [x] Back of the gun: a bolted equipment module on each flank of the lower tier
- [x] Ejector flap: a top-hinged flap over a dark, framed recess; it swings open as the case leaves, then falls shut
- [x] Spent case: faster, heavier throw (38 m/s² stylised gravity, a firmer hop)
- [x] Antenna: one straight banded mast; a faint red beacon that blinks, goes dark at a charge, relights once the gun parks
- [x] Viewfinder: an eight-sided cupola with a visor and a side optic along the bore; Sight rides the optic
- [x] The gun stands 30 m higher on a sloped berm; a ramp replaces the flat causeway
- [x] Volumes stop marching at the gun's depth (a depth-only pass of the gun), so smoke respects the gun
- [x] PBR gun shading: GGX sun lobe, fresnel sky reflection, metal graphite, rough concrete and paint, cavity shade
- [x] Dunes: wrap light, a cool bounce in the lee, a fresnel rim on the crests
- [x] Free aim: Settings Aim (Track, Free); arrows or WASD traverse at 8°/s and elevate at 5°/s (2° to 35°); a free shot hits only if the bore covers the rock's lead point
- [x] Impact: the fireball's in-pull collapses and bulges in lobes; three small trailed pieces; embers fly all round, no jet sprays; the far fireball keeps the depth test, so clouds and mesas stand in front
- [x] The bolt stays hidden inside the barrel: no head, ribbon or light until it leaves the muzzle
- [x] Impact void: the blast shoves the 9 km cirrus deck outward into a packed ring and clears a hole round the fireball; clouds inside it go; the sky heals over a minute
- [x] Meteor: a bow-shock arc at its nose; its shed sparks leave from the whole back, small, orange, fanned wide
- [x] Clouds: noise samples at level 0 (no derivatives after discard, for Direct3D); nearer heaps tried and reverted (grainy)
- [x] Impact: the fire pulls in by about 45 % in the negative phase; a billowing dark smoke puff bridges the tail's end and the debris (to about 45 s)
- [x] Muzzle: a glow globe swells on firing, brightest at night
- [x] The torn cirrus deck thins and stays torn until Reset
- [x] Barrel 75 % longer past the cradle (L 900 to 1388); the brake keeps its size
- [x] The back block rides the full recoil: it slides out of the housing on the shot
- [x] Charge gauge: ten dim amber lamps under the flap; rose blink in the over-hold
- [x] Ranging laser before the charge: one long pulse, two short blips, a soft tick each; a release cancels
- [x] Gentle camera sway and bob while the cursor moves; still at rest
- [ ] Falling debris rework (Tom to say what reads wrong)
- [ ] Impact plume as a trail-shader instance
- [x] GLB export and a nine-view turnaround (docs/railgun-model/, not committed)
- [ ] Post pass: AO not added (a screen-space pass would need the volumes kept out of its normal pass); FXAA and bloom already on the ladder
- [x] Cloud flicker: heap tops flickered on every GPU (measured on D3D11 and GL, old and new builds): the heaps' drift re-sampled their fine cells each frame. Heaps now hold still (they still boil and cycle); their edges stay at least two pixels wide
- [x] Slow ejecta: 460 small burning flecks drift down through the cloud; each goes out at its own time, most before the ground. Three to seven small companion rocks ride round the main one at random
- [x] Rock light on the clouds: the burning rock lights the heaps and the storm tower, faint far out, strong near the end; `rockGlowK` scales it for the game-over event
- [x] Bow shock: a thin crescent hugs the nose and wraps a little down the flanks (the long cone read as whiskers); it never thins below a pixel
- [x] Fiery haze: a soft amber globe round the rock, faint by day, strong at night
- [x] Rayleigh fade on the rock: extra air (`uRockAir` 3) reddens and pales it far out; it sharpens as it nears
- [ ] Frame cost on Tom's PC: headless RTX 3070 at 1280 x 800 shows shot 2.8 / 5.2 ms and impact 5.4 / 11.9 ms (p50 / p90), near the old 1.9 / 4.2 and 4.6 / 12; check live
- [ ] Stills to Tom; Tom's verdict

## Notes

- QA stills come from headless Edge on D3D11 (Playwright 1.62, scratchpad scripts). `__qa.run` draws once at its end, so arcs and draw-time spawns need frame-by-frame steps for honest stills.
- `__qa.screenOf(a, x, u)` projects a barrel point; `window.__models()` hands the gun meshes to a dev export script.
