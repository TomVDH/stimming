---
# stimming-a5dt
title: 'Kaleidoscope: Bar v3 and a redo of its controls'
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

**Kaleidoscope (`kaleido`): review for Bar v3**

Spec: `kaleido/index.html:88`. Renderer need: WebGL 2 (`initGL`, line 1019), with a 2D canvas as the glass texture. Read, not played.
Edit made: `signal: true` at `kaleido/index.html:88`. Nothing else is changed. The toy is plain JS; no build.

### Today

| Where | Label | Options | Key | What it does (from the code) |
|---|---|---|---|---|
| List | Mirrors | 6, 12, Tri | none | `setN` (1301): sets the sector count to 6 or 12, or 0 for the three-mirror triangle; the picture cross-fades in 0.5 s. Then focus goes to the stage (line 91). Not stored: 6 on each load. |
| Action | Shuffle | | S | `pour` (1265): builds new glass and pours it in from the top. Mirrors and the barrel's angle stay. |
| Settings | Quality | Standard, High | none | Shell row. On a change the toy clears its slow-frame step and fits again (1309); High lifts the 512 px cell cap (1076). |
| Stage | (drag) | | | Turns the barrel (`turnBy`, 1201). A press stops a spin (1210). A fast release keeps the spin (`lift`, 1237). |
| Stage | (hover) | | | Mouse or pen: the wedge under the pointer lifts and its seams show (`hover`, 1097). |
| Keys | (none on the bar) | | arrows, Space | Arrows turn the barrel; Space shakes the glass (1278-1296). |

No slider, no Settings row of its own, no Dev, no Reset.

### Controls

| Where | Have | Suggested | Why |
|---|---|---|---|
| List | Mirrors: 6, 12, Tri | Mirrors: 6, 12, Triangle | Whole words, no abbreviation. The code's own word: "Three mirrors in a triangle" (925). 11 letters in all, so the row still fits on the bar. See Finding 1 for the label. |

Kept: Shuffle (S); Quality: Standard, High.

### How to play

| Input | Have | Suggested |
|---|---|---|
| Drag | turn | Turn the barrel |
| Drag fast | spin, as "swipe" | Spin the barrel |
| Click | (not listed) | Stop the barrel |
| Move | (not listed) | Show the mirrors |
| Arrows | turn, as "arrows" | Turn the barrel |
| Space | shake | Shake the glass |
| S | shuffle (from the action) | Shuffle the glass |

### The `help` list, ready to paste

```js
help: [['drag', 'Turn the barrel'], ['drag fast', 'Spin the barrel'], ['click', 'Stop the barrel'], ['move', 'Show the mirrors'],
  ['← → ↑ ↓', 'Turn the barrel'], ['space', 'Shake the glass'], ['S', 'Shuffle the glass']],
```

### Other copy

| Where | Have | Suggested |
|---|---|---|
| Stage `aria-label` (38) | "A kaleidoscope full of coloured glass. Drag to turn the barrel or flick to spin it; arrow keys turn it and Space shakes the glass." | "A kaleidoscope full of coloured glass. Drag to turn the barrel. Drag fast to spin it. Click to stop it. Press the arrow keys to turn it. Press Space to shake the glass. Press S to shuffle the glass." |
| Fail line (40) | "Kaleidoscope needs WebGL 2, which this browser has turned off." | "This toy cannot run in this browser. It needs WebGL 2." |
| Intro, under the name (33) | Stimming No. 08 | Remove; the name stays. |
| About text (48) | "<em>Tri</em> adds a third mirror" | "<em>Triangle</em> adds a third mirror", only if the option changes. |
| CSS comment (16) | "the barrel view in the Bar v2 shell" | Not copy. It goes false when Bar v2 comes out. |

### Under Bar v3

- Measures of Bar v2 parts: none. `fit` (1066-1081) reads only `panel.clientWidth` and `clientHeight`. The toy has no `.s2-tl`, `.s2-keys`, `--chip`, `data-stack` or `data-narrow`.
- The picture is not kept clear of any bar. The disc is centred on the stage with a radius of 0.475 of the short side (1070). Bar v3 stands centred at the foot, so on a wide stage it lies over the foot of the disc. The disc fades to black from 0.6 to 1.0 of its radius (958), so the bar is over the dark rim. In Triangle the picture fills the stage (954), so the words stand on lit glass. Not seen; a look on the real page is needed.
- Arrows on the Mirrors row: Bar v2's row took the arrows to step the option (`shared/stim.js:412-416`). Bar v3's row has no arrow handler (`segPart`, `shared/signal.js:153-164`), so with focus on any bar button the arrows turn the barrel (toy listener on `window`, 1278).
- A pick moves focus to the stage (`panel.focus`, line 91). Under Bar v3 a keyboard user leaves the bar after each pick and must Tab back; with focus gone, the bar may leave after 8 s.
- Known, one line each: the key guard names `.s2-sheet` (1280), handled by the shell. `failed()` calls `ui.hideControls()` (1320), handled. Shuffle shows as a word. `keys` words the builder cannot draw: `'arrows'` (a keycap that reads "arrows") and `'swipe'` (see Finding 2); the `help` list replaces both.
- Nothing else found: no toy-owned control on the stage, no palette, no hidden chip, one action, no `hold`, no `tray`, no `icon` or `dot` option, no stage text that names a Bar v2 place, no key bound twice.

### Findings

1. "Mirrors: 6" and "12" do not count mirrors. They are the sector count (`MIRRORS`, 86-87: "Mirrors 6 and 12 set the sector count"); the About text says both use two mirrors. Tom rules: keep "Mirrors", or a label such as "Pattern".
2. `swipe` has no drawing. The brief lists it as a touch gesture and the row filter knows the word (`shared/signal.js:400`), but `GESTURE` and `KINDS` (`shared/signal.js:56-72`) do not, so on a touch screen today's `['swipe', 'spin']` row would show a keycap that reads "swipe". The help uses `drag fast`, as Bubble wand uses `move fast`.
3. The spin is not a gesture of its own. `lift` (1237-1241) keeps the spin when the release comes within 90 ms of the last move and the speed is above 0.3; the cap is 7.
4. Up acts as Left and Down as Right (`ARROWS`, 1276). The help row shows all four keys with one instruction.
5. Arrows and Space are taken for the whole page: the listener is on `window` and calls `preventDefault` for every target but a field (1279-1295; Space also leaves buttons and links alone). With focus in the About text the arrows turn the barrel and do not scroll.
6. "Show the mirrors" is the hover (mouse or pen). Touch has no hover; there the held barrel shows the wedge (1213). Tom may drop the row.
7. No Reset and no `reset:` in the spec. Nothing of the toy is stored but Sound and Quality (shell). Enter is in `GESTURE_KEYS` (172) to wake the sound only; it does nothing in the toy, so it is not in the help.
8. No doc at `docs/toys/kaleido.md`. `docs/plans/release-ready.md:208` holds an open item, "zooms in too far"; the toy has no zoom input (no wheel handler).

### Limits

- Not played. No server, no browser: the bar over the disc, the bar's two-row form and the How to play sheet are not seen.
- No touch screen: the `drag fast` and `move` rows in their touch forms are read from `inputHTML` only.
- `shared/signal.js` is read in parts (the help rows, `segPart`, the sheets, the actions, the key hold), not in full. The accent in `toys.json` is a gradient; how `setAcc` takes it is not checked.
- The sound code (129-255) is read for inputs only.
