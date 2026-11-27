# Lava lamp (`lava`)

- **Shelf:** Main #26
- **Tier / Size:** `webgl2` · 83 KB
- **Verdict:** An exceptionally tactile, physically rich WebGL2 raymarched desk toy with great sound design, Bar v3 support, and smart idle/sleep handling, needing only minor pointer-capture and reduced-motion polish.

## Bugs
- In lava/index.html (lines 188-192, 1689-1695), prefers-reduced-motion only halves simulation dt and turbulence amplitude instead of stopping ambient drift when idle, allowing blobs to keep rising and sinking for 25 seconds before sleeping.
- In lava/index.html (lines 1802, 1877-1878), pointer capture lacks a lostpointercapture listener, so if the browser drops pointer capture without firing pointerup or pointercancel, the active grab in grabs remains stuck and panel.classList('held') never clears.
- In lava/index.html (lines 1559, 1666-1668), the custom slow-frame step-down triggers after 30 frames (~0.5 s) at >24 ms instead of the standard 2 s average above 1/38 s after a 4 s warm-up, and it can step down up to four times inside one session.

## Labels, Copy & Menu Settings
- No Reset action or Settings reset callback is provided in initPage's bar spec (lava/index.html lines 94-106), leaving no way in Settings to re-seed a lamp whose wax has been popped into tiny boblets or flipped upside down.

## Gameplay Improvements (up to 5)
1. Add a subtle rotary dimmer ring around the metal base collar so dragging horizontally across the collar lets you dial the bulb brightness and convection speed up or down directly on the lamp.
2. Let two simultaneous touch pointers on a single large blob pull in opposite directions to stretch and snap it apart in place, giving multi-touch users a direct two-finger pinch-and-tear gesture.
3. Allow flicking or tapping the metal cap at the top to send a sharp downward mechanical jolt through the glass that detaches stubborn cool blobs clinging to the top meniscus.
4. Let a cold, sleeping lamp wake with a realistic warm-up phase where the bottom wax pool forms tall stalagmite spikes before melting into free-floating spheres when you hold the base.

## Graphics Polish (up to 3)
1. Add subtle chromatic dispersion and glass-wall thickness refraction at the curved silhouette of sdGlass in FS so background desk and wall light bends with a faint prism fringe at grazing angles.
2. Render the coiled metal heating spring at the bottom of the glass vessel (Y0) in the raymarcher, glowing dull orange under the translucent wax pool and casting a faint ring shadow into the rising wax.
3. Project soft, slow-moving volumetric light caustics from the tinted liquid and passing wax blobs onto the wood-grain desk surface and back wall inside lampLight().
