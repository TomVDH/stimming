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
- [x] Charge: arcs pick the flank that faces the eye; they step 12 m toward the eye, so the barrel skin never hides them
- [x] Charge: crown arcs bow up into the sky; corona streamers reach off the brake
- [x] Charge: coil-stage hoops tried, then removed at Tom's call; the arcs carry the build again
- [x] Charge: field motes on Galaxy's dot look spiral in to the barrel and stream to the muzzle; the shot flings them
- [x] Charge dust: a spiral inflow; the sheet reaches out to about 1.5 km
- [x] Impact: two or three late bursts in the cloud (flash, sparks, light flicker, a thud each)
- [x] Impact: burning fragments rain from the cloud's underside for about 12 s
- [x] Impact: a heat shimmer column over the fire, strong 8 s, faint to 30 s
- [x] Impact: a far fire roar and crackle that track the fire
- [x] Back of the gun: two-tier back block, square edges; an armoured, chamfered counterweight with lugs and a yellow band
- [x] Back of the gun: vent louvres on the upper tier; a ripple of side steam jets before the case leaves
- [x] Back of the gun: a bolted equipment module on each flank of the lower tier
- [x] Ejector flap: a top-hinged flap over a hot port; it swings open as the case leaves, then falls shut
- [x] Spent case: faster, heavier throw (38 m/s² stylised gravity, a firmer hop)
- [x] Antenna: one straight banded mast; a faint red beacon that blinks, goes dark at a charge, relights once the gun parks
- [x] Viewfinder: an eight-sided cupola with a visor and a side optic along the bore; Sight rides the optic
- [x] The gun stands 30 m higher on a sloped berm; a ramp replaces the flat causeway
- [x] Volumes stop marching at the gun's depth (a depth-only pass of the gun), so smoke respects the gun
- [x] PBR gun shading: GGX sun lobe, fresnel sky reflection, metal graphite, rough concrete and paint, cavity shade
- [x] Dunes: wrap light, a cool bounce in the lee, a fresnel rim on the crests
- [x] GLB export and a nine-view turnaround (docs/railgun-model/, not committed)
- [ ] Post pass: AO not added (a screen-space pass would need the volumes kept out of its normal pass); FXAA and bloom already on the ladder
- [ ] Cloud flicker on Tom's Windows PC: not reproduced headless on D3D11; needs a screen grab
- [ ] Impact frame cost: up from about 5 to 8-19 ms median at 1280 x 800 on an RTX 3070 (runs vary 2x); check on a real device
- [ ] Stills to Tom; Tom's verdict

## Notes

- QA stills come from headless Edge on D3D11 (Playwright 1.62, scratchpad scripts). `__qa.run` draws once at its end, so arcs and draw-time spawns need frame-by-frame steps for honest stills.
- `__qa.screenOf(a, x, u)` projects a barrel point; `window.__models()` hands the gun meshes to a dev export script.
