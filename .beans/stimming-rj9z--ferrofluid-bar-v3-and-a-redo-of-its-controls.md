---
# stimming-rj9z
title: 'Ferrofluid: Bar v3 and a redo of its controls'
status: in-progress
type: task
created_at: 2026-11-17T21:15:04Z
updated_at: 2026-11-17T21:15:04Z
parent: stimming-a5rs
---

One of the 77 toys that follow the first ten (Tom, 2026-11-17: "also proceed with all the toys -- subagetns for all -- per 5"; epic stimming-a5rs).
A subagent read the toy and wrote this review; it did not play the toy. The toy's one code change is `signal: true`.

## Checklist

- [x] Switch the toy to Bar v3 (`signal: true`)
- [x] Review every control, label, help row and line of copy, as a proposal
- [ ] Tom rules on the proposal
- [ ] Apply the copy and the fixes under "Under Bar v3"
- [ ] 1280 px, 375 x 812 and 812 x 375 on the real page; clean console
- [ ] The toy's doc in `docs/toys/` says what is true

## The review (proposal; no word is changed)

**Ferrofluid (`ferro`): review for Bar v3**

Spec: `ferro/index.html:57`. Renderer need: WebGL 2 (three 0.170 `WebGLRenderer`; the shader uses `texelFetch`, lines 869 and 905). Read, not played.

### Today

| Where | Label | Options | Key | What it does (from the code) |
|---|---|---|---|---|
| List | Fluid | Ink, Alien, Magma, Oil; each has a `dot`, Oil's is a gradient | 1 2 3 4 | `setFluid` (1363): base colour, glow colour, inner glow, oil film. Stored under `stimming.ferro.fluid`. |
| Slider | Field | 0.5 to 1.7, starts at 1, not stored | - = + (the toy's own), scroll, pinch | `setDial` (1250): the field's strength at rest. A lifted glow comes back over the dish. |
| Action | Drip | | D | `drip` (659): a drop falls from the glow when the glow is low over the dish; if not, from above the frame at a random place. 16 drops at most. |
| Settings | Quality | the site's two | | Pixel ratio (`fitRenderer`, 960). |
| Shell | Sound | | | A hum with the field; clicks and blips for spikes and drops. |

No Settings rows of its own, no Dev rows, no Reset.

### Controls

No row changes.

Kept: Fluid and its four names, Field, Drip, Quality. Drip is one verb and plainly the toy's own.

### How to play

| Input | Have | Suggested |
|---|---|---|
| Move | move the glow, as `hover` | Move the glow |
| Hold | charge, lift drops, as `hold + drag` | Charge the field |
| Hold and drag | (as above) | Move the drops |
| Release | (not listed) | Release the drops |
| Scroll | field strength | Change the field |
| Arrows | (not listed) | Move the glow |
| + and - | (not listed) | Change the field |
| Space | full field | Switch the full field on and off |
| Escape | (not listed) | Remove the glow |
| D | drip, on the chip only | Add a drop |
| 1 2 3 4 | the fluid names, on the chips only | Change the fluid |

### The `help` list, ready to paste

```js
help: [['move', 'Move the glow'], ['hold', 'Charge the field'], ['hold + drag', 'Move the drops'], ['release', 'Release the drops'],
  ['scroll', 'Change the field'], ['← → ↑ ↓', 'Move the glow'], ['+ -', 'Change the field'], ['space', 'Switch the full field on and off'],
  ['esc', 'Remove the glow'], ['D', 'Add a drop'], ['1 2 3 4', 'Change the fluid']],
```

### Other copy

| Where | Have | Suggested |
|---|---|---|
| Stage `aria-label` (42) | Two long sentences, about 70 words | "A dish of ferrofluid. A faint glow hangs above the dish. The glow is a magnet. Move the pointer to move the glow. Hold to charge the field. The charged field lifts drops to the glow. Scroll to change the field. Press the arrow keys to move the glow. Press plus and minus to change the field. Press Space to switch the full field on and off. Press Escape to remove the glow. Press D to add a drop. Press 1 to 4 to change the fluid." |
| Fail line (43) | "Ferrofluid needs WebGL, which this browser has turned off." | "This toy cannot run in this browser. It needs WebGL 2." |
| Intro (37) | Stimming No. 09 | Remove; the name stays. |
| Text on the stage | None | |

### Under Bar v3

- **Framing, needs a look on the real page.** `fitCamera` (1015 to 1053) measures no bar part. It fits the `FIT` points (1006 to 1014) into 93% of the stage height, centred (92% in portrait). `FIT` holds the whole rim but only the back of the base; line 1005 says "The front of the base can go under the bar", and the CSS comment at line 25 says "under the Bar v2 corners". Bar v2 left the foot's middle free. Bar v3 stands there, 12 to 56 px above the foot (`shared/signal.css:16`, `:85`). When the height is the limit, the rim's front is 3.5% of the stage height above the foot: about 19 px on a 544 px stage (a 720 px window less the default 176 px, `shared/stim.css:153`), about 10 px on the 280 px floor. So the bar's words stand on the front rim and the near strip of fluid. This is arithmetic from the code, not seen.
- `keys` word the builder cannot draw: `'hover'` (73). It would show as a keycap that reads HOVER. The `help` list replaces it with `move`.
- Key guard that names `.s2-sheet` (1276): known, the shell handles it.
- `ui.slider.set` from scroll, pinch and the keys (1246): Bar v3 follows it, because the Bar v2 slider writes its `--v` style (`shared/stim.js:497`) and the observer at `shared/signal.js:599` syncs. Under 640 px the slider is in Settings; scroll and pinch still set it.
- The four `dot` colours are supported; `optHTML` writes `background:`, so Oil's gradient holds (`shared/signal.js:115`).
- Nothing else found: no toy-owned control on the stage, no chip shown or hidden by the toy, one action, no `hold`, no tray. The toy's own keys (arrows, Space, Escape, -, =, +; 1274 to 1297) do not clash with D or 1 to 4.

### Findings

- `failed()` (1384) shows the fail line and does not call `ui.hideControls()`. No `data-bare` mark is set, so the bar's controls stay beside the fail line, under Bar v2 and Bar v3. 52 other toys call it.
- No Reset. Nothing builds up: drops fall back into the pool, Field is not stored, only Fluid is. Tom's call if Settings needs one.
- Drip does two things by the glow's place (663). A mouse press on the Drip button moves the pointer off the stage, the glow lifts (`pointerleave`, 1269), so the drop falls from above. The D key with the pointer over the dish drops it from the glow.
- "Add a drop" for D follows the shared add verb; the label stays Drip. "Change the fluid" for 1 to 4 has no model: none of the first ten toys has keys on its list.
- Hold, hold and drag, and release are one hold. The drops come only when the tall spikes throw them (`spitOne`, 523; four per press at most). Tom may cut the two extra rows.
- On touch there is no hover: each touch charges the field (1206 to 1226) and a lifted finger removes the glow (1237). The builder's touch form of `move` is a drag, which is true here.
- A pen sets the charge by its pressure (779, 1222). No help row can draw it.
- `GESTURE_KEYS` (148) holds Enter; no handler acts on Enter. While a bar button has focus, Space is the button's and does not switch the full field (1283).

### Limits

- Not played, no server, no browser: nothing above is seen on a real page, the framing least of all.
- No real touch screen; pinch and pen are read from the code only.
- No doc in `docs/toys/` for Ferrofluid, so no doc line was checked.
- Sound was not reviewed beyond its triggers.
