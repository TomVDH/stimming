---
# stimming-ao4x
title: 'Glass: Bar v3 and a redo of its controls'
status: completed
type: task
created_at: 2026-11-17T21:23:03Z
updated_at: 2026-11-27T07:19:52Z
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

**Glass (`glass`): review for Bar v3**

Spec: `glass/index.html:88`. Renderer need: WebGL 2 (`THREE.WebGLRenderer` of three 0.170, line 2659; that three has no WebGL 1 path, which I know from three, not from this file). Read, not played.

### Today

| Where | Label | Options | Key | What it does (from the code) |
|---|---|---|---|---|
| List (`display: 'stepper'`) | Glass | Window, Tempered, Laminated, Armored, Ribbed, Shuttle, Stained, Rice, Rainbow; each has a line icon | none | `setGlass` (2215): stores `stimming.glass.kind`, sets the look and the voice, mends the pane (`heal`). Nine glasses break in five ways (`MODE`, 66). |
| Action | Rewind | | R | `rewind` (2098): the shards replay their fall backwards, then the cracks close; the brick flies back. Disabled while the pane is whole and no brick lies there (`showChip`, 1885). |
| Settings | Tool | Hammer, Gun, Brick | 1 2 3 (the toy's own, 2615) | `setTool` (2243): sets what a click and a hold do. Stored (`persist`). |
| Settings | Quality | the shell's | | `quality: true`; a change refits the renderer (`onQuality`, 1666). |

No slider, no Dev rows, no `reset:`. Sound is the shell's button (`audioKit`, 118).

### Controls

| Where | Have | Suggested | Why |
|---|---|---|---|
| List, option | Rice | Sugar | The code names it sugar glass: "Sugar glass splits at once" (586), "Rice glass is cast sugar" (1222). Tom rules if Rice is meant. |

Kept: Glass and its eight other names; Rewind on the bar with R (the toy's own verb, and the toy disables it as part of play); Tool: Hammer, Gun, Brick; Quality.

### How to play

| Input | Have | Suggested |
|---|---|---|
| Click, hammer | crack (the strip's first row follows the tool) | Crack the pane |
| Hold, hammer | shatter, burst, bulge or pound (follows the glass, `LOOK`, 2185) | Break the pane |
| Click, gun | shoot | Shoot the pane |
| Hold, gun | full auto | Keep shooting |
| Click, brick | throw | Throw the brick |
| Hold, brick | wind up | Wind up the throw |
| Hold and drag | (not listed) | Move the aim |
| Click on a shattered pane | (not listed) | Knock a hanging shard down |
| 1 2 3 | tools | Select a tool |
| Arrows | aim and use (as `'arrows + space'`) | Move the aim |
| Space | (as above) | Use the tool |
| R | (not in `keys`; the action's key) | Rewind the pane |

### The `help` list, ready to paste

```js
help: [['click hammer', 'Crack the pane'], ['hold hammer', 'Break the pane'], ['click gun', 'Shoot the pane'], ['hold gun', 'Keep shooting'],
  ['click brick', 'Throw the brick'], ['hold brick', 'Wind up the throw'], ['hold + drag', 'Move the aim'], ['click shard', 'Knock a hanging shard down'],
  ['1 2 3', 'Select a tool'], ['← → ↑ ↓', 'Move the aim'], ['space', 'Use the tool'], ['R', 'Rewind the pane']],
```

The word after a gesture (`hammer`, `gun`, `brick`, `shard`) shows small beside the drawing.

### Other copy

| Where | Have | Suggested |
|---|---|---|
| Stage `aria-label` (53) | "A pane of glass in a frame. Pick a glass, then a tool in Settings: a hammer, a gun or a brick. Tap the pane to use it; hold for more. Space uses the tool, arrow keys aim, 1, 2 and 3 pick tools, R rewinds." | "A pane of glass in a frame. A city at night is behind it. Click the pane to use the tool. Hold to use the tool for longer. Press 1, 2 and 3 to select the hammer, the gun and the brick. Press the arrow keys to move the aim. Press Space to use the tool. Press R to rewind the pane." |
| Fail line (54) | "Glass needs WebGL, which this browser has turned off." | "This toy cannot run in this browser. It needs WebGL 2." |
| Intro, under the name (48) | Stimming No. 13 | Remove; the name stays. |

No other text on the stage.

### Under Bar v3

- **The help words that follow the tool are lost.** Line 102: `const [clickDD, holdDD] = [...document.querySelectorAll('.s2-keys dd')];`. `applyTool` (2236 to 2241) writes the tool's verbs into the first two rows of the Bar v2 key strip. Bar v3 hides that layer and draws How to play once from the spec (`shared/signal.js:401`). The nodes still exist, so no error shows; How to play says "crack" and "shatter" for every tool and every glass. The `help` list above replaces these rows. After that, lines 102, 2239, 2240 and the `click` and `hold` words in `TOOLS` (2228) and `LOOK` (2185) are dead.
- **The frame's place comes from two constants, not a measure.** `fit()`, 1672 to 1693: `const TOPPX = 60, BOTPX = 58;` with the comment "The corner rows take these pixels at the top and the bottom of the stage". The frame fits the band between them. A Bar v3 bar on one row is 56 px from the foot (12 + 44; 58 on touch), so it stays clear. A bar on two rows is about 100 px; by the same formula it covers the foot of the frame on a landscape stage under about 880 px tall. The toy does not read `--barh`. The 60 px at the top stay empty for a row that is gone; only the monogram is there.
- The bar stands in the middle of the floor strip under the frame, where the shards land (`ZMAX`, 1697). Bar v2 held the corners only. A look check for Tom.
- Rewind: one action, no `hold`, no tray. The toy sets `ui.action('rewind').disabled` (1885) and never hides the chip; Bar v3 follows `disabled` (`shared/signal.js:248`).
- The options have `icon` art: nine 16 px line icons with no fill attribute (77 to 87). Supported.
- Keys the toy binds itself, on the window: 1 2 3, the arrows, Space (2611 to 2634). R comes from the spec only. No key is bound twice. Enter is in `GESTURE_KEYS` (117) to wake the sound; it does nothing else.
- Known, one line each: the key guard names `.s2-sheet` (2613), the shell now holds the keys; `display: 'stepper'` (91) is not read, the list is a pick button; the `keys` word `'arrows + space'` (98) cannot be drawn, the `help` list replaces it; `failed()` (2640), the shell reads the mark.
- Toy-owned parts: one, the aim ring (`mark`, 2785), drawn in the scene in a fixed colour `0x40e2f3`. No palette, tray, chip or stage text of its own. The stage label names "Settings", which stays true.

### Findings

- One fixed list cannot follow the glass. "Break the pane" is true for six glasses. Laminated bulges under a hold (`press`, 1927); Armored and Shuttle take four blows a second (`pound`, 2479); none of the three breaks (`limit` is Infinity, 2166). Today's strip says "bulge" and "pound" there. The builder has no call to change a row after the draw.
- The tool is in Settings, but it changes what every click does. Keys 1 2 3 are the only quick way; touch has none. The bar's one list is Glass. Tom rules if Tool moves.
- No Reset. Rewind mends the pane; the glass and the tool stay as stored.
- A pen pressed hard gives a hard hammer blow (`e.pressure > 0.85`, 2595). It shows nowhere and the builder has no drawing for it; left out of the help.
- A hold of Space is the hold (the keyup ends it, 2634). A drag of more than 14 px cancels the hammer's hold (2603). The help has no row for either.
- With the gun or the brick, the aim follows the pointer in a hold (`cur`, 2575 and 2598); the "Move the aim" row is new.
- `failed()` also runs when a library does not load (2655) and on any start error (2869). The fail line then names the browser as the cause.
- Glass has no doc in `docs/toys/`.

### Limits

- Not played, no browser, no real touch screen. I did not measure if this bar wraps at 375 px.
- `glass/legacy.html` (Classic), the shaders and the physics were not read; the sound code only for its keys.
- The shell's behaviour comes from the lines of `shared/signal.js` and `shared/stim.js` named above, not from a full read.
- The Bar v2 layout ("the corners only") comes from the comment at line 75 and the slots in `buildBar`, not from a still.
