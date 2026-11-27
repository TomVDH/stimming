# Dijkstra (`dijkstra`)

- **Shelf:** Main #36
- **Tier / Size:** `webgl2` · 83 KB
- **Verdict:** A visually stunning and deeply tactical WebGL2 pathfinding toy with four procedural/OSM map styles and seven search modes, held back only by a dead sound button, a couple of stale Bar v2 selectors, and an oversized unbundled OSM map cache.

## Bugs
- toys.json sets "sound": true for dijkstra, so the shell renders a Sound button that toggles a state with no audio engine or output in dijkstra/main.js (tracked as stimming-e94j).
- dijkstra/main.js:1791 queries the legacy Bar v2 selector '.s2-keys dd' in keyWords() to update the Districts prompt, which matches nothing under Bar v3.
- dijkstra/main.js:1870 checks e.target.closest('input, textarea, .s2-sheet') for the KeyT shortcut instead of the Bar v3 '.s3-sheet' selector.
- dijkstra/main.js:1874 binds the Space replay listener to stage instead of document, so pressing Space only replays if the stage element itself has keyboard focus.

## Labels, Copy & Menu Settings
- dijkstra/main.js:45 passes a legacy Bar v2 'keys' array alongside 'help', and keyWords() (dijkstra/main.js:1790) attempts to mutate 'set the source' to 'add a district' on dead '.s2-keys dd' nodes; 'help' never mentions Districts pin adding or removal.
- dijkstra/main.js:29 persists the top-left 'Search' choice manually via localStorage ('stimming.dijkstra.algo') instead of using Bar v3's built-in choice 'persist: true' option.

## Gameplay Improvements (up to 5)
1. Add a subtle procedural audio engine with audioKit() where the advancing wavefront hums with street density, nodes chime softly when popped, and locking the shortest path plays a warm harmonic chord.
2. Allow dragging across jammed or blacked-out streets with an eraser modifier (such as right-click drag or two-finger drag) to selectively reopen corridors without clearing the entire map.
3. Let users drop an optional intermediate waypoint pin (for example via middle-click or shift-click) so the search chains source-to-waypoint-to-destination in two flowing phases.
4. In Districts mode, allow dragging two district pins onto each other to merge their territories, or double-tapping a district pin to pulse a shockwave along its border seams.

## Graphics Polish (up to 3)
1. With the 52 MB maps/ cache currently over the 10 MB statement budget, trim or quantize the cached OpenStreetMap city grabs down to a curated ~5 MB set and use the headroom for a rich normal/roughness detail tile texture across roofs, water, and soil in FINAL_FS.
2. Add tiny traveling light particles along locked shortest-path segments and major tree trunks in PATH_FS and EDGE_FS to give the settled route a living nocturnal traffic flow.
3. Render a subtle expanding shockwave ring in the scene target when a double-tap blackout occurs or when the wavefront locks onto the destination pin.
