# Ink Water (`ink`)

- **Shelf:** Main #32
- **Tier / Size:** `three` · 50 KB
- **Verdict:** A gorgeous, well-engineered WebGPU 3D MacCormack fluid and volumetric raymarching toy with clean idle sleep, smooth grid resampling, and expressive procedural audio.

## Bugs
- ink/index.html:78 (hasWebGPU) requests a throwaway WebGPU adapter without disposing/checking device loss, and ink/index.html:333 never registers renderer.backend.device.lost to pause the loop and show the fallback if the GPU device resets.
- ink/index.html:628 (resampleFrom) builds two ad-hoc TSL compute passes on every resize or quality change without disposing their compiled GPU pipelines.

## Labels, Copy & Menu Settings
- ink/index.html:59 stage aria-label still says 'lit from the side' and 'One indigo drop', which drifts when Light defaults to 'Backlit' (line 146) or when another ink is saved.
- ink/index.html:183 keys array omits ['C', 'clear the tank'], whereas help (line 186) includes it.
- toys.json:915 is missing the Dutch tagline ('tagNl': null) while 'nl' and 'ipa' are populated.

## Gameplay Improvements (up to 5)
1. Add a two-finger or right-drag gesture that tilts or sloshes the tank slightly, shifting the gravity vector so settled plumes slide across the floor.
2. Let a quick double-tap or shift-click fire an upward jet from the floor of the tank so rising and sinking vortex rings can collide mid-water.
3. Add a gentle temperature or buoyancy mode in Water settings (e.g. 'Warm bottom' or 'Layered') where an invisible thermocline suspends falling ink in a mid-tank cloud before fingers break through.
4. Allow holding Space or the Drop chip to charge a larger, heavier droplet that enters with a deeper cavity splash and wider vortex ring.

## Graphics Polish (up to 3)
1. Render subtle glass tank rim highlights and a faint top meniscus reflection so the water volume feels bounded by a physical vessel without boxing in the dark background.
2. Add chromatic dispersion or dual-lobe Henyey-Greenstein phase scattering in the raymarcher (ink/index.html:721) so backlit ink edges catch a bright forward-scattered silver lining.
3. Advect a sparse set of tiny sub-voxel dust motes or micro-bubbles through the K3 velocity texture to make clear-water stirring and convection rolls subtly visible before ink arrives.
