---
# stimming-vats
title: 'Domino Day: Bar v3 and a redo of its controls'
status: in-progress
type: task
created_at: 2026-11-17T20:39:26Z
updated_at: 2026-11-17T20:39:26Z
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

**Domino Day (`domino`): review for Bar v3**

Spec: `domino/index.html:91`. Renderer need: WebGL 2 (three.js 0.170.0 `WebGLRenderer`, line 2163; see Limits). Read, not played.

The one edit: `signal: true` in the `initPage` call (`domino/index.html:91`). Nothing else changed. Plain HTML and JS; no build.

### Today

| Where | Label | Options | Key | What it does (from the code) |
|---|---|---|---|---|
| List | Add | Line, Three rows, Five rows, Picture field, Spiral, Star, Tower, Steel ball. `display: 'tray'`. Each option has a line icon (70 to 79). | none | `act.tool` (2059): sets what a drag on the table makes, stores it (`stimming.domino.tool`) and gives focus to the stage. Line, Three rows and Five rows lay 1, 3 or 5 rows along the drag (`TOOLS`, 2051). The five others are set shapes (`make`, 1122). |
| Action | Iso, with a cube icon in the label (`CUBE`, 85) | | I | `setView(!lensTo)` (2061, 1769): switches between the free view and a true isometric view. Stored (`stimming.domino.view`). The toy sets `aria-pressed` on the Bar v2 chip (105, 106, 1773). |
| Action | Clear | | C | `clearAll` (555): removes every tile, tower and ball. Switched off while the table is empty, while a clear runs, and before the toy is ready (`syncChips`, 572). |
| Settings | Picture | Mix, Grin, Sun, Heart, Rings | none | `act.picture` (2067): the picture that a Picture field shows when its tiles fall. Mix takes the four motifs in turn, one per field (1019). A pick switches Yours off. Stored by the toy (`stimming.domino.picture`). |
| Settings | Yours | Off, On | none | `act.own` (2068): On uses the visitor's own image for the field. With no image loaded, or when On is pressed again, it opens the file picker; the row stays Off until an image loads. Off returns to the motif. The image is stored as a 48 px PNG (`stimming.domino.own`, 2085). |
| Settings | Quality | Standard, High | none | The site's row (`quality: true`, 102). A change clears the slow-frame steps and re-fits the canvas (2230). |
| Settings | Reset | | R (the toy's own key, 2039) | `reset` (538): stands every fallen tile back up, the last one down first; rebuilds a fallen tower; removes the balls. It keeps every tile that was laid, the Add pick, the picture and the view. |
| Dev | none | | | |
| Sound | on the bar | | | `audioKit` (156). Space and Enter wake the audio; so does a pointer gesture. |
| Key strip | drag: lay tiles. click: tip a tile. right-drag: turn the table. i: iso view. | | | `keys`, line 103. |

### Controls

| Where | Have | Suggested | Why |
|---|---|---|---|
| Action (I) | Iso | Isometric | "Iso" is a short form; the rule asks for whole words. The verb id `'iso'`, the key and the stored value stay. The cube icon is a separate question: see Under Bar v3, item 2. |
| Settings | Yours | Your picture | "Yours" is not a noun or a verb, and it reads only because it stands under Picture. In Bar v3 each row stands by itself. The row id `'own'` stays. Tom ruled "Keep Yours" on 2026-11-16 (`docs/plans/release-ready.md:414`): that ruling keeps the upload; this row changes only the word. |

Kept: Add and its eight option names; Clear, on the bar; Picture and its five option names (Mix does not move by itself, so "Changing" does not fit); Quality; Reset in Settings (the spec already has `reset:`).

### How to play

| Input | Have | Suggested |
|---|---|---|
| Drag (Line, Three rows, Five rows, Picture field, Spiral, Star) | lay tiles | Lay tiles |
| Drag (Tower) | (in "lay tiles") | Add a tower |
| Drag (Steel ball) | (in "lay tiles") | Throw a steel ball |
| Click a tile | tip a tile | Tip a tile |
| Click a tower | (not listed) | Tip a tower |
| Click the table (Tower) | (not listed) | Add a tower |
| Click the table (Steel ball) | (not listed) | Throw a steel ball |
| Right-drag; two fingers on touch | turn the table | Turn the table |
| Shift and a drag | (not listed) | Leave out: it is a second way to the same turn (1965), and the builder cannot draw "shift drag". |
| Space | (not listed) | Tip the first tile |
| Arrow keys | (not listed) | Turn the table |
| I | iso view; also "iso" as the action's key | Switch the isometric view on and off |
| C | clear (the action's key) | Clear the table |
| R | (not listed) | Stand the tiles up |
| A picture file dropped on the table | (not listed; the stage label names it) | Leave out: the builder has no drawing for a file drop. The Your picture row does the same. |

Notes on the words:

- "Lay" is plainly the toy's own verb and is the word on the strip today. "Add" stays the word of the list.
- "Tip a tower" uses the tile's verb for the same action on a tower. The code calls it `shove` (1662): the tower's tiles burst away from the viewer.
- "Throw" is the code's verb (`throwBall`, 1150). A drag sets the direction and the speed; a click throws the ball away from the viewer.
- "Turn the table" stays for the view. The shared words for a view drag are "Look around". Here the camera goes round the table and tilts over it; the toy's own name says what the visitor sees. Tom rules.
- "Stand the tiles up" and not "Reset the toy": R does not put the toy back to its start. See Findings.
- The list has two rows for the tower and two for the ball (a drag and a click each). Tom may cut the two drag rows; the click rows then cover both.

### The `help` list, ready to paste

```js
help: [['drag', 'Lay tiles'], ['drag', 'Add a tower'], ['drag', 'Throw a steel ball'],
  ['click', 'Tip a tile'], ['click', 'Tip a tower'], ['click', 'Add a tower'], ['click', 'Throw a steel ball'],
  ['right-drag', 'Turn the table'], ['space', 'Tip the first tile'], ['← → ↑ ↓', 'Turn the table'],
  ['I', 'Switch the isometric view on and off'], ['C', 'Clear the table'], ['R', 'Stand the tiles up']],
```

With `help` in the spec the builder adds no action keys by itself (`shared/signal.js:394`), so the I and C rows are in the list. On a touch screen the builder swaps `right-drag` for the two-finger drawing and drops the key rows.

### Other copy

| Where | Have | Suggested |
|---|---|---|
| Stage label for screen readers (51) | "Domino table. Drag to lay what Add picks: a line, rows, a picture field, a spiral, a star, a tower or a steel ball; a long line ends at a tower. Drop an image on the table to make it the field picture. Click or tap a tile to tip it. Right-drag or two fingers turn the table; I toggles the iso view. Space tips the first tile, C clears, R stands the tiles back up." | "Domino tiles on a dark table. A long line ends at a tower. Drag to lay tiles. The Add list sets what a drag makes. Click a tile to tip it. Click a tower to tip it. Drag with the right button to turn the table. Drop a picture file on the table to use it in a picture field. Press Space to tip the first tile. Press the arrow keys to turn the table. Press I to switch the isometric view on and off. Press C to clear the table. Press R to stand the tiles up." |
| Line when the toy cannot run (53) | "The tiles need WebGL, which this browser has turned off." | "This toy cannot run in this browser. It needs WebGL 2." |
| Intro, under the name (46) | Stimming No. 04 | Remove; the name stays. |

There is no other text on the stage: the stage holds one canvas.

### Under Bar v3

1. **How to play prints markup as text.** The Iso label holds an SVG: `` label: `${CUBE}Iso` `` (94). Without `help`, the builder adds a row for each action key with `actLabel(a).toLowerCase()` as plain text (`shared/signal.js:395`, `text()` on 387). So the I row reads `<svg class="cube" viewbox="0 0 14 14" ...>iso`. This is live from the `signal: true` edit until a `help` list is in the spec. The I key also shows twice: once from `keys` (`['i', 'iso view']`, 103) and once from the action.
2. **The toy's CSS reads a Bar v2 part.** Lines 36 to 38: `.s2-chip .cube { margin-right: 6px; vertical-align: -2px; fill: currentColor; stroke: none; }`, `.s2-chip .cube .cut { fill: none; stroke: var(--glass); stroke-width: 1.4; }`, `.s2-chip[aria-pressed="true"] .cube .cut { stroke: var(--fg); }`. None of them reaches the Bar v3 button. There the cube takes the builder's icon rule (`shared/signal.css:34`): 18 px, no fill, a 1.75 line in the accent ink. So the solid cube with cuts becomes an outline. None of the Bar v3 specs I read has an icon in an action label; Tom's look is needed (keep the cube as an outline, or the word alone).
3. **The held state of Iso does not show.** Line 105: `const isoB = document.querySelector('.stim-ui [aria-keyshortcuts="I"]');`. The query still finds the hidden Bar v2 chip, so nothing throws. But `aria-pressed` (106, 1773) lands only on that hidden chip. The Bar v3 action button follows `disabled` and `hidden` alone (`shared/signal.js:246` to 252). Under Bar v3 the Iso button looks the same in both views, and a screen reader gets no state. The view on the stage is the only sign. Window seat's Wing light is a toggle action in the same position.
4. **`display: 'tray'` is not read.** Line 92. Bar v3 never reads `display`: eight options give a pick button that opens a list of eight tiles (`shared/signal.js:318` to 323). The pick button shows the icon and name of the current option.
5. **Option icons.** All eight Add options carry an `icon` (70 to 78): line art, some with `class="solid"` parts, no `fill` attribute. `isArt` is false for them (`shared/signal.js:108`), so they draw as outlines in the accent ink with the solid parts filled (`shared/signal.css:34`, 35). No option has a `dot`.
6. **Keys with a sheet open.** The toy's key handler (2034 to 2048) skips a press whose target is a button, a link or a field. Bar v2 moved focus into an open sheet (`shared/stim.js:364`); Bar v3 does not. With Settings or How to play open and focus on the page body or the stage, Space tips the first tile, R stands the tiles up and the arrows turn the table. Not seen on a page.
7. **The toy binds keys that the spec does not list.** Space, R and the four arrows (2038 to 2045). I and C come from the spec (`key:` on 94, 95; bound by `shared/stim.js:553`). No key is bound twice.
8. **The page that cannot run.** `failed()` (2144) calls `ui.hideControls()`, which marks the Bar v2 layer `data-bare`. Bar v3 copies that mark only in its observer callback (`shared/signal.js:583`), not in `draw`. If `failed()` runs before `mountSignal` attaches the observer, the Bar v3 bar can stay on a page that shows the fail line. The order is not settled by a read. The code is in `shared/`, not in the toy.
9. **Followed, no gap found.** Clear is switched off, not hidden (`syncChips`, 573; `shared/signal.js:247`). A dropped image sets the list through `ui.choice.set('field')` (2115); the Bar v3 pick button follows the Bar v2 state (`shared/signal.js:327`, 580). The Yours row sets itself back through `ownRow.set` (2070, 2074, 2086, 2089, 2100); the Bar v3 row reads the same handle.
10. **A toy-owned cue.** Line 40: `.stage--domino.drop { box-shadow: inset 0 0 0 2px var(--fg); }`. A white 2 px frame on the stage while a picture file is over it. Nothing breaks; it is a box on a bar with no boxes.
11. Nothing found for: more than three actions (there are two); `hold: true`; an action that opens a toy-owned list; a palette, tray or round button on the stage; a chip the toy hides; stage text that names a Bar v2 place; a `keys` word the builder cannot draw (`drag`, `click`, `right-drag` are drawings; `i` is a keycap).

### Findings

- **Reset does not reset the toy.** `reset` (538) rewinds: fallen tiles stand up in reverse order, fallen towers rebuild (`rebuild`, 1566), balls leave. Nothing that was laid goes away; the opening run is not laid again; Add, Picture and the view stay. The button in Settings reads "Reset" (the shell's word). The key row says what it does: "Stand the tiles up".
- **Space was left off the strip on purpose.** `docs/plans/release-ready.md:415`: "Leave hidden. The strip keeps its four entries; Space stays a hidden key." That ruling is for the Bar v2 strip and its limit of four. The Bar v3 help lists every input, so Space is in the list above. Tom may want it out again.
- **A drag from a standing tile continues its chain.** `begin` (854): the stroke starts at that tile, lays one row whatever Add says (`lanes`, 880), and takes away the tower that the tile fed (`uncrown`, 1345). The help has no row for it.
- **A chain of six tiles or more ends at a tower** when the tower fits (`crown`, 1316; `TLEN`, 1210). A spiral gets one too (1088). The last tile knocks it over (`strike`, 1376).
- **Limits in the code that the page does not say.** 1600 tiles (`MAX`, 302); 6 balls, the oldest leaves (`BMAX`, 1147; line 1152); a picture field needs 3 rows and 2 columns (1015); a star needs a drag of 1.8 units (1101).
- **In the isometric view** the left and right arrows turn a quarter turn (2044), the up and down arrows do nothing (2045), and a right-drag settles on the nearest diagonal (1956).
- **A second finger drops the stroke in progress.** Line 1969 turns every touch into a turn; the tiles already laid stay, and the stroke gets no tower.
- **The arrows act only while the page body or the stage has focus** (2041). Space and R act anywhere but on a button, a link or a field (2037). After a press on Iso or Clear the focus stays on that button, so Space presses it again. Bar v2 did the same.
- **A click on the stage with a sheet open** closes the sheet (`shared/signal.js:573`) and also starts a press on the table (1962). Bar v2 did the same (`shared/stim.js:344`).
- **Enter wakes the audio and does nothing else** (`keys: new Set([' ', 'Enter'])`, 156). It is not in the help.
- **The fail line can name the wrong cause.** `failed()` also runs when three.js does not load from the CDN (2152 to 2160).
- **The visitor's image stays in the browser.** It is read to a canvas and stored in `localStorage` (2076 to 2086). No request leaves the page for it.
- **No easter egg or secret found.**
- **No doc.** There is no `docs/toys/domino.md`.
- **Doc lines that the edit makes false.** `docs/plans/stack-types.md:153` lists `domino` with "Bar v2". `docs/qa/release-ready/notes-2026-11-16.md:985` says "bar: v2 (`domino/index.html:94`)"; that file is a dated record. The brief forbids a doc edit here.
- With the help list applied, the `keys` entry on line 103 still feeds the hidden Bar v2 strip and `?bar=v2`. The cube CSS (36 to 38) and `isoB` (105) are also needed for `?bar=v2`.

### Limits

- Not played. No server, no browser, no screenshot: the brief forbids them. The `signal: true` edit is not checked on a page.
- The outline cube on the Bar v3 button (item 2) and the markup in How to play (item 1) are read from `shared/signal.js` and `shared/signal.css`, not seen.
- No touch screen. The narrow layout (under 640 px) is not seen; whether the bar at the foot covers tiles at the near edge of the table is not known.
- That three.js 0.170.0 needs WebGL 2 comes from knowledge of three.js, not from this repo. The toy has no shader text of its own that proves it.
- The physics (lines 368 to 575, 1206 to 1565) is read only as far as the inputs reach it.
- "None of the Bar v3 specs I read has an icon in an action label" covers Fire, Prism, Galaxy and Window seat, not all ten.
- The `.about` section under the stage (57 to 60) holds the name and a hidden vignette; it is not reviewed.
