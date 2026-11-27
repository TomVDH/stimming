# Fidget board (`fidget`)

- **Shelf:** Main #3
- **Tier / Size:** `dom` · 492 KB
- **Verdict:** Solid, tactile SVG/Web Audio desk toy on Bar v3, held back mainly by a missing visibility pause, minor input/audio-wake edge cases, and 46 unmounted parts inflating its footprint to 492 KB.

## Bugs
- Missing whenVisible pause (verified): neither fidget/index.html nor fidget/kit.js calls whenVisible(), and visibilitychange (fidget/index.html:221) only calls snd.hush() without stopping the rAF loop (fidget/kit.js:167-186) or clearing wave timeouts (fidget/index.html:213). If fader.js:60 is still sliding in a background/occluded frame, draw() calls snd.scrape.set() and restarts the scrape drone after snd.hush(); frame() also lacks try/finally around step()/draw().
- Audio wake gap on S and R (fidget/kit.js:216-218): GO only lists Space, Enter, arrows, PageUp/Down, Home, and End, omitting 's', 'S', 'r', and 'R'. Because shared/stim.js:1078 only wakes a suspended AudioContext for keys in GO, pressing S (Shuffle) or R (Reset) after the 2 s audio nap (sleepMs: 2000) produces no sound.
- Key tap race and untracked timer (fidget/parts/keys.js:69, 80, 90): tap() sets s.held = true and schedules an untracked setTimeout(release, 120) that is never cleared in destroy(). pointerdown and keydown do not guard against s.held, so clicking or pressing a key mid-shuffle lets the timer release it while held and double-toggle the mint key's latch on pointerup.
- Missing keydown guard on joystick keyup (fidget/parts/joy.js:113-123): unlike keys.js:83, joy.js does not track whether Space/Enter keydown started on #joy. Releasing Space or Enter right after focus moves onto #joy unexpectedly triggers board.shuffle?.(joyEl).
- Active drag interrupted on resize (fidget/parts/fader.js:29-38): ResizeObserver calls fit(), which unconditionally snaps s.x.x = s.x.t = XS[s.n] and zeroes s.x.v without checking s.pid != null or updating s.rect.
- Dead launch wiring and 46 unmounted parts (fidget/kit.js:206-211, 318; fidget/parts/keys.js:52; fidget/parts/dial.js:124, 207; fidget/parts/index.js): board.fire is null and safe.js is unmounted, leaving keys.js:52 (unguarded board.fire()), dial.js:207 (board.dial.run()), and snd.launch unreachable, while 46 unused part modules (~450 KB of the 492 KB toy) still sit in fidget/parts/ and index.html:182-183 awaits the 5 active modules sequentially.

## Labels, Copy & Menu Settings
- Stale Bar v2 sheet selector (fidget/index.html:151): keydown guard checks .s2-sheet instead of Bar v3's .sg-sheet (shared/signal.js:368).
- Redundant Bar v2 keys array (fidget/index.html:140): passes keys: [['drag', 'turn the dial'], ['click', 'flip a switch'], ['click joystick', 'shuffle the board'], ['s', 'shuffle the board']] alongside help, which Bar v3 ignores whenever help is present (shared/signal.js:512).
- Ambiguous help icons and missing per-control keys (fidget/index.html:142-145): help repeats generic 'click' (4x) and 'drag' (3x) entries without target labels (unlike 'click joystick') and omits Arrow keys, Space/Enter, Shift+Space, Home/End, and PageUp/Down even though the stage aria-label (fidget/index.html:116) tells users to press Arrow keys and Space.

## Gameplay Improvements (up to 5)
1. Add passive-false mouse wheel / trackpad scroll support on the dial (fidget/parts/dial.js) and fader (fidget/parts/fader.js) so desktop users can click through detents and notches with a scroll wheel.
2. Give the fader thumb flick momentum across notches (like dial.js and abacus.js) and step the three cream keys in keys.js across subtly distinct mechanical switch pitches so rapid drumming feels varied.
3. Couple the existing five controls gently: let the three toggle switches tint or accent the dial's lit ticks (coral, sky, mint) when flipped on, or let the latching mint key switch the dial between crisp 24-detent clicks and free-spinning coasting.
4. Light the nearest gate tick marks on the joystick (joy.js:18-21) as the coral nub leans toward them, matching the lit-tick feedback already present on the dial and fader.
5. Expose a quiet board-preset or 'Deal' option (or mount a curated second plate using existing parts like abacus, piano, safe, or wheel) if the remaining parts in fidget/parts/ are kept, or archive the 46 unused parts per the release plan to trim the bundle.

## Graphics Polish (up to 3)
1. Fix pressed keycap shadow drift (fidget/parts/keys.js:42 and fidget/kit.js:162): shine() shifts shadow <use> elements by a fixed shadow.y = 6 while keys.js overwrites skirt.sh transform on press, so moving the joystick while holding a key offsets the shadow using the unpressed height.
2. Tilt skin() body gradients with the joystick light (fidget/kit.js:126-128, 157-163): shine() currently moves radial sheens, rim gradients, and drop shadows, while the body fill gradient (base) stays locked vertically DOWN; rotating base slightly with (nx, ny) would unify shading across the dial cap, toggle levers, and fader thumb.
3. Add a subtle recessed well() plate under the four-key cluster (fidget/parts/keys.js) and a top specular rim on the dial's coral indicator pill (fidget/parts/dial.js:36-38) so all five controls share the same recessed tray depth and specular edge language.
