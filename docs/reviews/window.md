# Window seat (`window`)

- **Shelf:** Main #33
- **Tier / Size:** `three` · 344 KB
- **Verdict:** A technical masterpiece of Stimming with rich atmospheric raymarching, three.js wing flex, Vancouver terrain, and tactile glass interactions, needing only a minor audio visibility guard fix and small settings polish.

## Bugs
- window/index.html:2287: whenVisible unconditionally calls startBed() whenever the stage becomes visible, ignoring sound.on (unlike line 2281 which checks if (on)), so a tab switch or visibility change attempts to fetch and start cabin.mp3 even while muted.
- window/index.html:2074: mutating the literal array m[0] = -m[0] in place works only because m is recreated per keydown, but Shift+Arrow head movement and +/- leaning do not call wake() (only setStick() does on line 2070), although the main rAF loop runs continuously when visible.
- window/compare.html:32: the HOURS list in the compare workbench omits 'afternoon', which exists in window/index.html:189.

## Labels, Copy & Menu Settings
- window/index.html:2126-2127: the 'Falling' and 'Flying' Sights settings use type: 'choice' with value: '' as one-shot triggers, so picking an option leaves it visually selected in the settings drawer until another option in that row is clicked, and re-clicking the already-selected sight may not re-trigger onPick if Bar v3 suppresses no-op choice picks.
- window/index.html:2118: 'Cozy quiet flight' (Q) sets stormTarget = 1 and updates localStorage and the Storm slider, but does not offer a Reset option in the settings foot (noted in docs/toys/window.md:48 as 'The toy has no Reset') to restore default hour, seat, shade, and weather state.

## Gameplay Improvements (up to 5)
1. Let a click or double-tap on the overhead cabin reflection area toggle a warm overhead reading lamp spot that casts a directional pool onto the window sill, shade, and scratch pane.
2. Allow dragging horizontally along the lower bezel sill to wipe away accumulated frost and condensation droplets on the inner glass edge during high-altitude night flights.
3. Add a subtle tactile detent and faint mechanical click audio when pulling the window shade all the way down to latch or releasing it at the top slot.
4. Let clicking a distant airport runway or approaching aircraft briefly tune in a low, wordless radio carrier crackle or soft approach beacon pulse in the cabin audio mix.

## Graphics Polish (up to 3)
1. With the raised size budget, add a higher-resolution normal and roughness detail map (or procedural multi-scale brushed composite texture) on the close-up cabin bezel and shade plastic so leaning in close reveals crisp moulded micro-texture and subtle fingerprints on the scratch pane.
2. Add animated spinning fan blades and faint heat-shimmer refraction behind the nacelle exhaust cone in wing3.js / shader.js so the engine pod feels alive against the terrain below.
3. Enhance the electrochromic Dim glass transition in cabinFS with a subtle chromatic iridescence and thin-film interference fringe at grazing angles as the dark blue tint sweeps from the gasket edge toward the core.
