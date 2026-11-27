# Googly eyes (`eyes`)

- **Shelf:** Main #27
- **Tier / Size:** `webgl2` · 51 KB
- **Verdict:** A flagship S-tier WebGL2 shader and 240 Hz physics toy with crisp procedural sound and exemplary idle sleep, held back only by stale Bar v2 corner-avoidance selectors and duplicate help labels.

## Bugs
- In eyes/main.js (lines 264-272 and 1318-1325), measureCorners() queries Bar v2's hidden .s2-tl/.s2-tr/.s2-bl/.s2-br selectors instead of calling ui.cover() and ui.onCover(), so in Bar v3 (where .stim-ui has display: none and zero offsetWidth/offsetHeight) corners is always empty and eyes are not pushed clear of the Signal monogram or bottom bar.
- In eyes/main.js (line 1197), the keydown guard checks tgt.closest?.('input, textarea, select, [contenteditable], .s2-sheet') and misses Bar v3's .sg-sheet, though signal.js stops propagation for open sheets.
- In eyes/main.js (lines 22-24), prefers-reduced-motion changes update the local reduce flag and call plan(), but do not call wake() or draw() to redraw the board offset scaling (vis = reduce ? 0.3 : 1) if the loop is currently resting.

## Labels, Copy & Menu Settings
- In eyes/main.js (lines 17-19), the Bar v3 help array has duplicate identical input words without targets: ['click', 'Blink an eye'] alongside ['click', 'Blink all the eyes'], and ['drag', 'Move an eye'] alongside ['drag', 'Shake the eyes']; qualify them (e.g. 'click eye' / 'click space' and 'drag eye' / 'drag space', which signal.js renders with a <small> target label).
- In docs/toys/eyes.md (lines 10, 12, 27), the doc says 'Series: None' (toys.json has 'series': 'poke'), 'Sound: Yes' (toys.json has 'sound': false), and references 'signal: true' at eyes/main.js:8 which is no longer present.

## Gameplay Improvements (up to 5)
1. Allow scroll wheel or two-finger pinch on an eye to inflate or shrink its radius between tiny and jumbo sizes, causing neighbouring eyes to re-pack around it with soft plastic ticks.
2. Add a double-click or long-press on an eye to flick its pupil hard against the dome wall, setting off a sympathetic chain rattle in touching neighbours.
3. Support subtle device orientation or two-finger stage tilt so gravity direction shifts smoothly, letting all free pupil discs slide and clatter to the low side of their domes.
4. Let dragging one eye briskly into another transfer momentum with a clack and knock both pupils dizzy for a second rather than only separating silently.

## Graphics Polish (up to 3)
1. Add inter-eye ambient occlusion and coloured rim bounce light in EYE_FS by passing the 4 nearest neighbours' positions and rim hues (or sampling a tiny low-res occupancy/colour field), grounding the packed cluster together.
2. Give the white backing disc inside EYE_FS subtle paper-grain micro-texture and a faint stamped concentric molding ring near the flange seam so close-up jumbo eyes feel like real craft-store plastic.
3. Cast a faint secondary refractive rim highlight and chromatic edge dispersion through the clear dome wall in EYE_FS where grazing angles catch the magenta and teal studio lamps.
