# TV tree (`tvtree`)

- **Shelf:** Main #23
- **Tier / Size:** `three` · 434 KB
- **Verdict:** Healthy, expressive 3D desk toy with 156 GLSL channels and spring-pendulum physics, held back by missing WebGL context-loss handling, an unthrottled idle loop, and leftover Bar v2 DOM/key drift.

## Bugs
- Missing webglcontextlost handling: tvtree/index.html (start(), line 2498) and tvtree/channels.html (line 54) create WebGL2 renderers/contexts without webglcontextlost or onContextLoss listeners, so context loss leaves the loop running or fails silently.
- Missing whenVisible and unthrottled 24 fps loop: tvtree/index.html omits whenVisible (line 72), hand-rolls IntersectionObserver(([e]) => ...) reading only the first entry (line 2648), and returns (lit > 0 && !reduce) in step() (line 2029) so the atlas, composer, and Web Audio hum/parties never sleep after 60 s idle. tvtree/channels.html also lacks an intersection observer and only checks document.hidden (line 157).
- Audio unlock gap and uncancelled wave timers: GESTURE_KEYS in tvtree/index.html:194 omits 'o'/'O' and 'c'/'C', so pressing O on load never unlocks AudioContext. ACTS.shuffle() (line 2391) and powerAll() (line 2405) schedule uncancelled setTimeout waves that interleave if triggered twice or while hidden, and strike() (line 1673) disconnects its panner via setTimeout instead of node onended.
- Unbounded meshCache growth on portrait resize: fit() (tvtree/index.html:2059) recomputes continuous ky = clamp(0.95 / A, 1.12, 1.6) for A < 1.1, running treeSurface() and settle(240) synchronously on every portrait resize step and caching every BufferGeometry in meshCache (line 699) without ever disposing old geometries.
- Missing try/finally in frame() and per-frame array allocations: frame() (tvtree/index.html:2137-2138) calls step() and draw() without try/finally. Inside the 120 Hz physics() loop, pushOut() (line 1221) and collide() (lines 1201-1204) allocate fresh [x, y, z] arrays per segment and pair, and pick() (line 2177) allocates two Vector3 instances on every mouse move.
- Keyboard carry (C) and Enter hold edge cases: Pressing C (tvtree/index.html:2427) acts on picked >= 0 even when kbd is false (no selection ring shown) and shows no visual indicator on the carried set. Holding Enter (enterT, line 2365) is not cancelled on blur (line 2382), so the 520 ms power toggle fires after focus leaves the stage.

## Labels, Copy & Menu Settings
- Stale Bar v2 DOM coupling: tvtree/index.html reaches into hidden Bar v2 markup (.stim-ui and .s2-chip[aria-keyshortcuts="O"] .s2-label, lines 98-99 and 2417-2418) to toggle 'Lights out' / 'Lights on', guards against '.s2-sheet' instead of '.sg-sheet' on keydown (lines 2341, 2424), and keeps a stale 'under the Bar v2 corners' comment (line 44).
- Undocumented and inconsistent shortcuts (T and P): ACT_KEYS (tvtree/index.html:2421) binds T ('tune' to trigger a big picture) and P (duplicate of O for power), but neither T nor Big picture appears in bar.help (lines 91-95) or the stage aria-label (line 64), while GESTURE_KEYS (line 194) still lists P instead of O.
- Contact sheet count and tooltip mismatch: bar.settings (tvtree/index.html:86) labels the link 'All 155' (All ${NCH - 1}) with title 'Every channel on one sheet', but tvtree/channels.html renders all 156 channels (00..155 including Static), and signal.js reads row.hint rather than row.title for row tooltips (shared/signal.js:287).
- Missing Lantern setting and repeated generic verbs in help: LANTERN_KEY ('stimming.tvtree.lantern', line 1676) persists a lantern state that has no row in bar.settings (commented as 'The old Settings row's key'), making it easy to miss on touch. bar.help also uses bare 'click' three times and 'drag' twice without target nouns, and shows 'move' on touch screens where hover look does not apply.

## Gameplay Improvements (up to 5)
1. Show a glowing spark or coloured ring on the source TV while carrying a picture with C, and draw a faint glowing tether to the pointer when dragging one TV over another before release.
2. Add sympathetic resonance when 2 or 3 sets tune to the same channel, subtly pulsing their bezels or cords and slightly biasing nearby channel clicks so manual 4-set Big Picture matches are easier to discover.
3. Let the lantern rock gently when tapped or nudged, and attract a couple of slow moths or dust motes around its warm glow when lit at night.
4. Let dragging across empty night sky sweep a directional breeze through the hanging TVs and rabbit ears, giving a calm way to sway the whole canopy without yanking the trunk.
5. Let clicking a tile in tvtree/channels.html preview that channel on a live link back to the tree (such as tuning the cabinet set via a URL parameter) so the contact sheet connects back to play.

## Graphics Polish (up to 3)
1. Give the hanging cords (s.cord in place(), line 1923) a slack catenary curve when L < s.R instead of scaling a straight cylinder, matching the slack-rope physics when lifting a set toward its branch.
2. Add a soft additive halo sprite around lantern.glass (buildLantern(), line 1635) and slightly stronger warm bounce on nearby TV bezels so the lantern integrates into UnrealBloomPass like the screens do.
3. Blend a brief decaying phosphor afterimage or vertical-hold wobble in SCREEN_FS during channel switch bursts and power-on uFlash so tube warmups feel richer.
