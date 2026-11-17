---
# stimming-25sr
title: 'Chladni plate: Bar v3 and a redo of its controls'
status: in-progress
type: task
created_at: 2026-11-17T21:23:03Z
updated_at: 2026-11-17T21:23:03Z
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

**Chladni plate (`chladni`): review for Bar v3**

Spec: `chladni/index.html:85`. Renderer need: WebGL 2 with `EXT_color_buffer_float` (`initGL`, 777-779). Read, not played.
Edit made: `signal: true` at `chladni/index.html:85`. Nothing else is changed. The toy is plain JS; no build.

### Today

| Where | Label | Options | Key | What it does (from the code) |
|---|---|---|---|---|
| Action | Shuffle | | S | `shuffle` (1084): picks a different pattern at random, glides the pitch to it and rings the plate for 4 s (2.6 s with reduced motion). |
| Action | Reset | | Space | `scatter` (1091): lays all the sand evenly again, falling from above, with a pour sound. The pitch stays. It resets nothing else. |
| Settings | Quality | Standard, High | none | Shell row. On a change the toy clears its slow-frame step and fits again (1282). |
| Stage | (drag) | | | Tunes the pitch: up is higher, a stage height is 5.5 patterns (1133). The plate rings in the drag and 1.4 s after (1147). |
| Stage | (click the plate) | | | `toss` (1098): throws the sand near the click up and outward. A click off the plate does nothing (1144). |
| Rail | Pitch (`role="slider"`, line 75) | 13 notches | | Drag: the cap follows the pointer and the tone turns bowed (1191-1199, 1074). Click: glides to the nearest pattern and rings it 4 s (1206). |
| Keys | (none on the bar) | | arrows, Enter | Up and Right: next pattern up; Down and Left: next down; rings 4 s (`stepRung`, 1079). Enter: `toss` at a random place (1227). |

No list, no slider on the bar, no Settings row of its own, no Dev, no `reset:`.

### Controls

| Where | Have | Suggested | Why |
|---|---|---|---|
| Action (Space) | Reset | Scatter (`label: 'Scatter'`; the verb, the key and the bar place stay) | The action does not reset the toy: the pitch stays. It is a play action of the toy's own, and the code's word is `scatter`. "Reset" stays free for "Reset the toy". See Finding 1. |

Kept: Shuffle (S); Quality: Standard, High; the rail's name "Pitch".

### How to play

| Input | Have | Suggested |
|---|---|---|
| Drag | tune | Tune the plate |
| Drag the rail | ring, as "drag rail" | Tune the plate |
| Click the rail | (not listed) | Select a pattern |
| Click the plate | toss sand | Toss the sand |
| Arrows | next pattern, as "arrows" | Select the next pattern |
| Enter | (not listed; the stage label has it) | Toss the sand |
| S | shuffle (from the action) | Shuffle the pattern |
| Space | reset (from the action) | Scatter the sand |

### The `help` list, ready to paste

```js
help: [['drag', 'Tune the plate'], ['drag rail', 'Tune the plate'], ['click rail', 'Select a pattern'], ['click', 'Toss the sand'],
  ['← → ↑ ↓', 'Select the next pattern'], ['enter', 'Toss the sand'], ['S', 'Shuffle the pattern'], ['space', 'Scatter the sand']],
```

### Other copy

| Where | Have | Suggested |
|---|---|---|
| Stage `aria-label` (73) | "A sand-covered steel plate: drag up or down, or slide the cap on the rail, to tune it, and tap to toss sand. Arrow keys step between patterns, S picks a random pattern, Space spreads the sand again and Enter tosses it." | "A steel plate covered in sand. Drag up or down to tune the plate. Drag the cap on the rail to tune the plate. Click the rail to select a pattern. Click the plate to toss the sand. Press the arrow keys to select the next pattern. Press S to shuffle the pattern. Press Space to scatter the sand. Press Enter to toss the sand." |
| Fail line (76) | "Chladni plate needs WebGL 2 with float textures, which this browser lacks." | "This toy cannot run in this browser. It needs WebGL 2." The float textures leave the line; Tom may keep them. |
| Intro, under the name (68) | Stimming No. 15 | Remove; the name stays. |
| Rail readout (1176) | "196 Hz" over "2·4" (pitch, then the pattern's two numbers) | Keep. |
| CSS comment (27) | "The rail runs between the shell's right-hand corners." | Not copy. It is false under Bar v3. |

### Under Bar v3

- MEASURES Bar v2, the main fault: `corners()` (899-914) reads the hidden layer (`shell`, line 95): its `clientWidth` and `clientHeight`, and each child's offsets by class `s2-tl`, `s2-tr`, `s2-bl`, `s2-br`, `s2-keys`. Under Bar v3 the layer is `display: none`, so every child fails `!el.offsetParent` (904) and all four measures are 0.
- What `camera()` does with the zeros (928-934): the plate is fitted to 10 px from the top and 12 px from the foot (`myTop`, `myBot`, 932), and the rail to 64 px from the top and 28 px from the foot (929-930). Bar v3 stands in the band 12 to 56 px above the foot (`shared/signal.css:16`, 85), centred.
- What the user sees, plate: where the height limits the fit, the plate's front edge and its front rows of sand lie under the bar, and a click there goes to the bar, not to `toss`. By my arithmetic the height limits at 1160 x 652; not seen.
- What the user sees, rail: the rail's lane is the 58 px at the right (`right: 14px; width: 44px`, line 29). On a stage narrow enough for the bar to reach that lane, the bar lies over the rail's foot: the lowest notch and the cap at the lowest pitch, and the bar takes the pointer there (`.sg-ui > *`, `shared/signal.css:19`). The bar's width is not measured.
- Dead under Bar v3: the observers of the Bar v2 parts (1277-1280: a `ResizeObserver` on each child of the layer, a `MutationObserver` for `data-narrow`, `data-stack`, `data-tight`). Nothing tells the toy when Bar v3 changes size.
- Toy-owned control on the stage: the rail (CSS 28-55). Not the old boxed look: a slot, hairline notches, a gold cap, a readout in the slab font. Its gold is fixed (`--gold`, line 20), not the accent in `toys.json`.
- Key guard: the toy's listener (1220) names `.stim-ui`, not `.s2-sheet`. The shell holds keys while a sheet is open. With focus on a Bar v3 bar button the arrows now step the pattern; Enter is still left to a button (1225).
- Known, one line each: `failed()` (1249) disables both actions through `ui.action`; Bar v3 mirrors it at 40%. Shuffle shows as a word. `keys` word the builder cannot draw: `'arrows'`; the `help` list replaces it. `'drag rail'` draws as a drag with "rail" beside it.
- Nothing else found: two actions, no `hold`, no `tray`, no list, no `icon` or `dot`, no chip the toy hides, no stage text that names a Bar v2 place, no key bound twice (shell: S, Space; toy: arrows, Enter).

### Findings

1. "Reset" does not reset. It scatters the sand and keeps the pitch (1091-1097; the spec's own comment, 88: "Reset pours fresh sand over the plate"). The other choice for Tom: keep the word and move it to Settings as `reset:`; then Space needs a binding in the toy.
2. The toy has no true reset: no way back to the first pattern but the rail or the arrows. Nothing of the toy is stored; only Sound and Quality (shell).
3. Today's key strip says "drag rail: ring". Every tuning input rings the plate; the rail drag alone adds the bowed tone and the rosin rasp (1073-1074). A stage drag to the side rings the plate and does not change the pitch (1130-1133).
4. Up and Right go one way, Down and Left the other (1223). The help has one row for the four keys.
5. The arrows are taken for the whole page: the listener is on `window` and calls `preventDefault` (1218-1223) for every target but a field. With focus in the page below the stage the arrows step the pattern and do not scroll.
6. The rail is a `role="slider"` with `tabindex="0"` and no key handler of its own; it moves only by the page-wide arrows. Home, End and Page keys do nothing.
7. When WebGL 2 fails, `failed()` (1243-1250) hides the rail and disables the two actions, but sets no bare mark (`ui.hideControls`, `shared/stim.js:953`). Sound, Settings and How to play stay on the bar of a toy that cannot run.
8. No doc at `docs/toys/chladni.md`. Open items elsewhere: `docs/plans/release-ready.md:229` ("Keep the pitch rail as a diegetic control?") and `docs/plans/bar-v2-diegetic.md:33` (a signal generator with a dial, waiting).

### Limits

- Not played. No server, no browser: the bar over the plate and over the rail is derived from the code and the CSS, not seen. The bar's width and its two-row form are not measured.
- No touch screen: the touch forms of `drag rail` and `click rail` are read from `inputHTML` (`shared/signal.js:78-88`) only. A second finger's tap also tosses sand (1141-1145); not checked further.
- `shared/signal.js` and `shared/stim.js` are read in parts (help rows, actions, sheets, the key hold, `keyBinder`), not in full.
- The sound code (215-402) and the shaders (405-731) are read for inputs only.
