---
# stimming-sy1p
title: 'Neon Hum: Bar v3 and a redo of its controls'
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

**Neon Hum (`neon`): review for Bar v3**

Spec: `neon/index.html:125`. Renderer need: WebGL 2, with float targets (`EXT_color_buffer_float`, line 1402). Read, not played.
Applied now: `signal: true` at line 125. Everything below is a proposal.

### Today

| Where | Label | Options | Key | What it does (from the code) |
|---|---|---|---|---|
| List | Gas | Red, Orange, Gold, Lemon, Green, Ice, Blue (first), Violet, Pink, White, Prism, Candy, Mix; each has a dot | none | Sets the gas of the next tube and of a stroke in progress (`setGas`). Prism is a rainbow tube, Candy a striped one. Mix gives each new tube the next of ten plain gases (`gasPick`, `MIX_ORDER`). |
| Action | Undo | | Backspace, Ctrl or Cmd + Z (bound by the toy) | Cancels the stroke in progress, else removes the newest tube (`undo`). Off on a bare wall (`syncActs`). |
| Action | Clear | | C | Removes every tube and ends Chase (`clearAll`). Off on a bare wall unless Chase runs. |
| Settings | Lights | Off, Chase, Rave, Storm | none | Chase lights the tubes in turn. Rave pulses the room in a new hue each 0.5 s, with a kick. Storm throws lightning each 3 to 8 s, with thunder (`setShow`). Not stored. Off and disabled under reduced motion. |
| Settings | Wall | Brick, Steel, Concrete, Tile, Sequins, Foam | none | Bakes a new wall; the wall also sets the knock's sound and shake (`setWall`, `thud`). Stored. |
| Settings | Straight tubes | Off, On | none | Every drag draws straight runs with round corners (line 2018). Stored. |
| Settings | Quality | the shell's | none | Refits the canvas (`onQuality`, line 2208). |
| Settings | Reset | | none | Stops the show and brings the OPEN sign back (`resetSign`). |

### Controls

| Where | Have | Suggested | Why |
|---|---|---|---|
| Settings | Lights: Off, Chase, Rave, Storm | Light show: Off, Chase, Rave, Storm | "Lights: Off" reads as the tubes off. The code's word is show (`setShow`). The stored id stays `lights`. |
| List, option | Prism | Rainbow | Prism is the name of another toy. The tube shows a rainbow (comment, line 95). |

Kept: Gas and its other options; Undo; Clear, on the bar; Wall and its options; Straight tubes; Quality; Reset, in Settings. No groups: Settings has three rows of its own.

### How to play

| Input | Have | Suggested |
|---|---|---|
| Drag | bend a tube | Draw a tube |
| Shift and drag | straight run | Draw a straight tube |
| Click, on a tube | switch a tube | Switch a tube on and off |
| Double-click, on a tube | change gas | Change the gas of a tube |
| Click, on the bare wall | (not listed; in the stage label) | Knock on the wall |
| Arrow keys, held | (not listed; in the stage label) | Draw a tube |
| Shift and arrow keys | (not listed; in the stage label) | Move the pen |
| Space, in a keyboard stroke | (not listed; in the stage label) | End the tube |
| Space, else | (not listed; in the stage label) | Switch the nearest tube on and off |
| Backspace | (not listed; in the stage label) | Remove the last tube |
| C | clear, on the chip | Clear the wall |
| Ctrl or Cmd + Z | (not listed) | Leave out: the same as Backspace, and no one keycap fits both platforms. |

### The `help` list, ready to paste

```js
help: [['drag', 'Draw a tube'], ['drag shift', 'Draw a straight tube'], ['click', 'Switch a tube on and off'], ['double-click', 'Change the gas of a tube'], ['click', 'Knock on the wall'],
  ['← → ↑ ↓', 'Draw a tube'], ['shift ← → ↑ ↓', 'Move the pen'], ['space', 'End the tube'], ['space', 'Switch the nearest tube on and off'], ['backspace', 'Remove the last tube'], ['C', 'Clear the wall']],
```

### Other copy

| Where | Have | Suggested |
|---|---|---|
| Stage `aria-label` (line 47) | Two long sentences, about 80 words | "A wall at night with a neon sign. Drag to draw a tube. Hold Shift and drag to draw a straight tube. Straight tubes in Settings makes every drag straight. Click a tube to switch it on and off. Double-click a tube to change its gas. Click the wall to knock on it. Hold the arrow keys to draw a tube. Hold Shift and the arrow keys to move the pen. Press Space to end the tube. Press Space to switch the nearest tube on and off. Press Backspace to remove the last tube. Press C to clear the wall." |
| Fail line (line 49) | "Neon Hum needs WebGL 2, which this browser has turned off." | "This toy cannot run in this browser. It needs WebGL 2." |
| Intro, under the name (line 42) | Stimming No. 10 | Remove. The name stays. |

The stage carries no text of its own: the OPEN sign is made of tubes (`sign`).

### Under Bar v3

- Nothing measures Bar v2. `neon/index.html` has no `.s2-`, `.stim-ui`, `--chip`, `data-stack` or `data-narrow`. The picture is one canvas over the full stage. `seedSign` (lines 573 to 581) places the OPEN sign from the stage size alone: 80% of the width and 62% of the height at most, a touch above centre. Only the CSS comment at line 29 names "the corner controls".
- A shell gap, shown by this toy: under reduced motion the toy disables the Lights row (`motionPref`, line 2124). Bar v3's `rowPart` (`shared/signal.js:259` to 275) does not read `handle.disabled` on a choice row, and its `handle.set(v, true)` passes the Bar v2 guard (`user && state.disabled`, `shared/stim.js:625`). So the row looks live; a pick reaches `setShow`, which forces Off and sets the row back (lines 712, 717).
- `'shift + drag'` in `keys` (line 142): the builder finds no gesture and draws three keycaps, SHIFT, + and DRAG (`inputHTML`, `shared/signal.js:80` to 82). The `help` list replaces it with `'drag shift'`: the drag drawing with "shift" small beside it. Open: on touch that row still shows, with the word "shift", and touch has no Shift key.
- Keys the toy binds itself, none in the spec (lines 2130 to 2164): the arrow keys, Shift with the arrow keys, Space, Backspace, Ctrl or Cmd + Z. The shell binds C. No key is bound twice. The toy's key guard does not name `.s2-sheet`; the shell holds the keys while a sheet is open.
- `display: 'stepper'` on the list (line 126): Bar v3 does not read it; Gas is a pick button with a sheet of 13 tiles.
- Option dots exist: 13, of which three are gradients (`GAS_DOTS`, lines 120 to 124). No option has `icon` art.
- Not found: a third action, `hold`, a tray, a toy-owned control on the stage, a chip the toy hides, a word that names a Bar v2 place. Undo and Clear go off through `ui.action(...).disabled`, which Bar v3 reads. `failed()` calls `ui.hideControls()` (line 2180): the shell reads the mark.

### Findings

- Two words for one action today: "bend" (key strip, stage label) and "draw" (stage label, keyboard). The proposal uses Draw, as Window seat does. "Bend" is the glass trade's word; Tom may keep it.
- Undo removes the newest tube only. It does not undo a Clear, a Reset, a switch or a gas change. Its keys show nowhere today.
- A double-click is two clicks: the first switches the tube, the second, inside 340 ms on the same tube, gives the next gas and lights it (`lift`, line 2032; `swapGas`). The tube always ends lit. The step runs through all 12 gases, Prism and Candy too.
- A limit with no sign: the wall holds 23 tubes, and the oldest leaves when a new one lands (`endDraft`, line 1972). The comment at line 325 says two dozen.
- A stroke longer than 3.2 stage units carries on as a new tube (line 1961). A stroke shorter than five tube radii is dropped (line 1971).
- Clear ends Chase; Rave and Storm play on over a bare wall (lines 2062, 2063).
- The fail line names WebGL 2 only. The toy also fails without float targets (line 1402), and the same line shows.
- Neon Hum has no doc in `docs/toys/`.

### Limits

- Not played: no page, no server, no browser. No real touch screen.
- The sign's place against the Bar v3 bar is not measured. A tube drawn at the foot of the stage may lie under the bar.
- A Gas pick shows the pen cross on the wall for 2.5 s in the gas's colour (`setGas`, line 2100; line 1689). Whether the Bar v3 sheet covers it is not checked.
- Lines 938 to 1683 (shaders, GL setup, the render passes) were not read line by line; they were searched for handlers, DOM writes, Bar v2 names and the pen. `legacy.html` was not read.
