# Fire (`fire`)

- **Shelf:** Main #21
- **Tier / Size:** `three` · 67 KB
- **Verdict:** A flagship WebGPU volumetric fluid and procedural audio showpiece with rich chemical flame physics, held back slightly by dead iron-block geometry, an unguarded boot catch, and manual settings persistence.

## Bugs
- fire/index.html:1283 checks e.target.closest('.s2-sheet') to ignore typing inside open sheets, missing Bar v3's .sg-sheet class (currently masked by signal.js capture-phase stopPropagation).
- fire/index.html:1251 starts a hold-to-feed salt stream on canvas pointerdown, but never cancels press/holdT/feeding on window blur or visibilitychange, so tabbing away during a hold leaves feeding active when returning.
- fire/index.html:1353 start().catch(...) logs boot or shader compile errors without calling noWebGPU() or stage('first-frame'), leaving the stage blank if renderer init or shader compilation rejects after hasWebGPU() passes.
- fire/index.html:420 hardcoded const object = 'none' leaves the entire slotted iron block (shell, core, slotBeam, floorShade, and floorPlane emissive rays at lines 399-624) permanently unreachable in normal play.

## Labels, Copy & Menu Settings
- fire/index.html:259 manually saves settings in onPick/onInput instead of setting persist: true on its Bar v3 settings rows (base, motion, temp, chaos), so ui.setting(id).value is not restored by buildRow andReset does not reset any settings or clear a typed word.
- fire/index.html:330 calls buildSteps(6) without step notes; passing plain-word notes (such as ['Starting WebGPU', 'Compiling fluid kernels', 'Warming scene pass', 'Warming volume pass', 'Lighting fire', 'First frame']) would populate the intro load caption.
- toys.json:592 lists access.motor as [] for fire, whereas fire relies on drag (to blow or move) and keys/hold, which may warrant checking against accesslab motor tags.

## Gameplay Improvements (up to 5)
1. Restore or expose a Burner setting (Bare floor, Iron block, Brazier) so players can enjoy the already-built slotted iron firebox and its rotating floor light rays, or drop a word plate onto it.
2. Let holding and dragging after the 260 ms hold threshold sprinkle a continuous trail of salt grains across the flame width rather than canceling the salt stream on movement.
3. Allow mixing two salts at once by tossing a second salt while the first is still burning, blending their OKLCH tint ramps in separate streaks across the emitter grid.
4. Add a gentle bellows or downward draft gesture (such as scroll wheel or two-finger vertical drag) that momentarily compresses the flame into a wide ring of sparks before it roars back up.
5. Let typed iron word plates heat up over 20 seconds from dull dark iron to glowing orange-white along the letter cutouts, slowly warping or shedding scale sparks when tapped.

## Graphics Polish (up to 3)
1. With the raised 2.5-5 MB budget, add a subtle procedural floor roughness/normal map and glowing ember bed texture on floorPlane so the fire pool reflects off tangible charred stone or cast iron instead of a flat Lambertian plane.
2. Give the 4096 GPU spark sprites curl-noise spin and stretch their sprite scale along their velocity vector (sparkVel.xyz) in sparkMat so fast magnesium and strontium sparks draw crisp incandescent streaks.
3. Add a subtle heat-shimmer refractive distortion pass behind the upper flame column using the projected fluid velocity texture (fire.vel) so background edges and rising embers waver through hot air.
