---
# stimming-upzo
title: 'Pin art: Bar v3 and a redo of its controls'
status: in-progress
type: task
created_at: 2026-11-17T20:39:27Z
updated_at: 2026-11-17T20:39:27Z
parent: stimming-a5rs
---

One of the 77 toys that follow the first ten (Tom, 2026-11-17: "also proceed with all the toys -- subagetns for all -- per 5"; epic stimming-a5rs).
A subagent read the toy and wrote this review; it did not play the toy. The toy's one code change is `signal: true`.

## Checklist

- [x] Switch the toy to Bar v3 (`signal: true`)
- [x] Review every control, label, help row and line of copy, as a proposal
- [x] Tom rules on the proposal (2026-11-17: "Yes, apply all")
- [x] Apply the copy and the fixes under "Under Bar v3" (2026-11-17, by a subagent; its report names what it left and Tom's calls)
- [x] 1280 px, 375 x 812 and 812 x 375 on the real page; clean console (2026-11-17, after the apply)
- [ ] The toy's doc in `docs/toys/` says what is true

## The review (proposal; no word is changed)

**Pin art (`pins`): review for Bar v3**

Spec: `pins/index.html:70`. Renderer need: WebGL 2 (three.js 0.170 `WebGLRenderer`, line 1350; see Limits). Read, not played.

The one edit: `initPage({ id: 'pins', signal: true, bar: {` at `pins/index.html:70`. Plain HTML and JS; no build.

### Today

| Where | Label | Options | Key | What it does (from the code) |
|---|---|---|---|---|
| List (choice) | Finish | Chrome, Anodised; each has a `dot` | none | `setFinish` (line 1262) sets `uAnod` to 0 or 1. Anodised tints each pin head by how far it stands out (`anod()` in the head shader, line 1306). The pick is stored under the toy's own key `stimming.pins.finish` (line 62). |
| Action | Shuffle (Bar v2 adds a die icon) | | none | `shuffle()` (line 466) presses one of five objects into the pins: hand, face, fork, gear, key. It never repeats the object that shows. It removes the drawing and the word. It does nothing while the board turns. |
| Settings | Quality | Standard, High | none | The shell's row (`quality: true`, line 74). The toy refits its pixel ratio (`onQuality`, line 817). |
| System | Sound | on, off | none | The shell's button (`toys.json`: `sound: true`). The toy has its own audio context (line 119). |
| Key strip | drag: "push, hold deeper"; click frame: "knock flat"; drag frame: "turn over"; type: "press a word" | | | Line 75. |
| Slider, Settings rows, Dev, Reset | none | | | |

Inputs that are not on the bar (all in `pins/index.html`):

| Input | What it does | Where |
|---|---|---|
| Click or tap on the pins | One round push; `press()` stamps at once | lines 538, 1074, 1085 |
| Drag on the pins | The push follows the pointer and leaves a trail (`stamp`, a capsule; relief never moves back) | lines 555, 1127 |
| Hold on the pins | The push grows deeper with time, up to full travel (`sculpt`) | line 548 |
| Click on the frame | `shake(side)`: all pins drop flat in a wave from the side of the click; removes the word, the object and the drawing | lines 584, 1058 |
| Sideways drag on the frame (28 px or more) | `flipBoard`: the board turns over and shows its back | lines 753, 1050 |
| Mouse move over the stage | The camera sways a little (0.07 rad yaw, 0.045 rad pitch). Off with reduced motion and during a press | line 1138 |
| Wheel; two-finger pinch | The camera backs off, from 1 to 1.3 times the distance. At a limit the page scrolls | lines 1107, 1180 |
| Tilt of a phone | The camera sways. iOS asks for motion access on the first touch | lines 1154, 1171 |
| Letters, digits and the marks `!?&@#$%*+=.,:;'"/()<>-` | `typeKey`: presses a word into the pins, 14 characters at most. The first letter removes the object and the drawing | lines 618, 718, 1257 |
| Backspace | `backKey`: removes the last letter | lines 731, 1254 |
| Arrow keys (stage in focus) | Move the aim ring; a held key glides | lines 1197, 1221 |
| Space (stage in focus) | A push at the ring; a held key pushes deeper | line 1229 |
| Enter | `flipBoard()`; a focused button or link keeps its own Enter | line 1249 |
| Escape | `shake()` | line 1247 |

### Controls

| Where | Have | Suggested | Why |
|---|---|---|---|
| (no row changes) | | | |

Kept: Finish (Chrome, Anodised), Shuffle, Quality. Each is a noun or one verb, and each says what the code does.

### How to play

| Input | Have | Suggested |
|---|---|---|
| Click on the pins | (not listed) | Push the pins |
| Drag on the pins | push, hold deeper | Draw in the pins |
| Hold on the pins | (inside the drag row, as "hold deeper") | Push the pins deeper |
| Click on the frame | knock flat | Shake the pins flat |
| Drag on the frame | turn over | Turn the board over |
| Scroll; pinch on touch | (not listed) | Zoom the view |
| Mouse move | (not listed) | Look around (held out of the list below; see Under Bar v3, item 6) |
| Letters and digits | press a word, with the input word "type" | Press a word |
| Backspace | (not listed) | Remove a letter |
| Arrow keys | (not listed) | Move the ring |
| Space | (not listed) | Push the pins |
| Enter | (not listed) | Turn the board over |
| Escape | (not listed) | Shake the pins flat |
| Tilt of a phone | (not listed) | No row: the builder has no drawing for a tilt |

Notes on the words:

- "Push" is the toy's word for the pointer ("push pins" in the stage label, "push" in the key strip). The label uses "press" for the same action on Space. One word: Push, for the pointer and for Space.
- "Press" stays for a thing that comes from behind: a word, an object from Shuffle.
- "Shake the pins flat" for the click on the frame and for Escape. The toy has two words today, "knock" and "shake"; the drawing already shows the click, so the row says the result. The old bar button was Shake (`docs/plans/bar-v2-diegetic.md:16`).
- "Turn the board over" for the drag on the frame and for Enter: the stage label's own words, and the shared verb Turn.
- "Draw in the pins" follows Window seat ("Draw in the fog"). The plain option is "Push a line of pins".
- "Remove a letter" is Fire's row for Backspace. "Zoom the view" and "Look around" are the shared words.

### The `help` list, ready to paste

```js
help: [['click', 'Push the pins'], ['drag', 'Draw in the pins'], ['hold', 'Push the pins deeper'],
  ['click frame', 'Shake the pins flat'], ['drag frame', 'Turn the board over'], ['scroll', 'Zoom the view'],
  ['A-Z 0-9', 'Press a word'], ['backspace', 'Remove a letter'], ['← → ↑ ↓', 'Move the ring'], ['space', 'Push the pins'],
  ['enter', 'Turn the board over'], ['esc', 'Shake the pins flat']],
```

On touch the builder shows the first six rows as tap, drag, long-press, tap, drag and pinch, and hides the key rows (`fits` in `shared/signal.js:392`).

### Other copy

| Where | Have | Suggested |
|---|---|---|
| Stage label for screen readers (line 45) | "Pin screen. Press and drag to push pins; hold to push deeper. Knock the frame to shake the pins flat; drag the frame sideways to turn the board over. Shuffle presses a new object from behind. Type a word to press its letters from behind; Backspace lifts the last letter. Arrow keys move the press point, Space presses, Enter turns the board over, Escape shakes the pins flat." | "A board of metal pins in an orange frame. Click the pins to push them. Drag to draw in the pins. Hold to push the pins deeper. Click the frame to shake the pins flat. Drag the frame sideways to turn the board over. Scroll to zoom the view. Shuffle presses an object into the pins. Type a word to press it into the pins. Press Backspace to remove a letter. Press the arrow keys to move the ring. Press Space to push the pins. Press Enter to turn the board over. Press Escape to shake the pins flat." |
| Line when the toy cannot run (line 46) | "Pin art needs WebGL, which this browser has turned off." | "This toy cannot run in this browser. It needs WebGL 2." |
| Intro, under the name (line 40) | Stimming No. 05 | Remove; the name "Pin art" stays. |
| Text on the stage | None | |

### Under Bar v3

1. **The frame fit reads Bar v2 parts.** `rowsClear` (lines 887 to 898) measures the Bar v2 corner rows to keep the frame clear of them: `for (const el of document.querySelectorAll('.stim-ui > :is(.s2-tl, .s2-tr, .s2-bl, .s2-br) > *')) {` (line 891). Bar v3 sets `.stim-ui { display: none }` (`shared/stim.css:311`), so each rect has no height and line 893 skips it. The fit falls back to `12 + --chip + 4`: 42 px at the top and at the foot (52 px on a coarse pointer). The Bar v3 bar takes 12 + 44 = 56 px at the foot (`--pad`, `--h` in `shared/signal.css:16`), and more when it wraps to two rows. So the bar can stand on the lower edge of the frame, and that edge is a control (click to shake, drag to turn). Not measured on the page.
2. **The refit follows Bar v2 marks only.** The `MutationObserver` at lines 1453 to 1458 refits the camera on `data-stack` and `data-narrow` of `.stim-frame`. Those are Bar v2's marks (`shared/stim.js:879`, `:911`). A Bar v3 bar that wraps (`is-wrapped`, `--barh`, `shared/signal.js:547`) starts no refit.
3. **Escape is bound twice.** Bar v3 closes its open sheet on Escape and does not stop the event (`shared/signal.js:574`). The toy's handler then runs `shake()` (lines 1247 to 1248). Under Bar v2 the shell stops the event first (`shared/stim.js:335`, `e.preventDefault()`), and the toy skips a stopped event (line 1242). Result under Bar v3, from the code: Escape on an open Settings, Finish or How to play sheet also drops all pins flat and removes the picture.
4. **The toy's key guard names the Bar v2 sheet.** Line 1245: `if (t.closest?.('input, textarea, select, [contenteditable], .s2-sheet')) return;`. Bar v3 sheets are `.sg-sheet`. With focus on a button inside a Bar v3 sheet, a letter key presses a word into the pins (and the first letter removes the picture), and Backspace removes a letter.
5. **An input word the builder cannot draw.** The `keys` entry `['type', 'press a word']` (line 75) has no gesture in `KINDS` (`shared/signal.js:72`), so `inputHTML` draws it as a keycap that reads "type". Until `help` is in, How to play shows that keycap. The `help` list above uses `'A-Z 0-9'`.
6. **A `move` row is false on touch.** The builder swaps `move` to a touch drag (`TOUCH` in `shared/signal.js:71`). On this toy a touch drag pushes pins; the sway on a phone comes from tilt. So `['move', 'Look around']` is held out of the list. It can go in when the builder can hide a row on touch.
7. **The Shuffle die goes.** Bar v2 draws a die before the word Shuffle (`shared/stim.js:511`). Bar v3 draws the word alone (`actLabel`, `shared/signal.js:209`).
8. **Dots.** Both Finish options carry a `dot` (lines 67 to 68). Anodised's dot is a `linear-gradient`, not one colour. `optHTML` writes it as `background:` (`shared/signal.js:115`), which takes a gradient. Not seen on the page.
9. **A failed toy keeps the bar.** `failed()` (line 1282) only shows the fail line. The toy does not keep the `initPage` handle, so it cannot call `hideControls()`; Bar v3 keeps only the monogram for a toy that sets `data-bare` (`shared/signal.css:22`).
10. **The aim ring.** The keyboard ring on the stage takes the `--focus` colour (lines 1433 to 1440). Bar v3's rule for focus is an ink bar, never a ring. The ring also shows the size of the push, so it may stay; it is Tom's call.

Not found: toy CSS that reads Bar v2 parts; a toy-owned palette, tray, chip or DOM button on the stage; a chip the toy hides by itself; more than three actions; a `hold` action; a tray; an option with `icon` art; text on the stage that names a Bar v2 place.

### Findings

- **No Reset.** The spec has no `reset:`. The toy's Clear is the shake, and it lives on the frame by Tom's own verdict (`docs/plans/bar-v2-diegetic.md:16`; the comment at line 72). A Reset to the first view (the hand, the front face, zoom 1) needs new code.
- **Shuffle has no key, and no letter is free.** The toy takes every letter and digit for typing (line 1257).
- **"Push" on the front face lifts the pins toward the viewer.** A press raises the pin height (`stamp`, line 569) and the front face shows that height as how far a pin stands out (`pinP`, line 1289). The code calls it "a soft round press from behind" (line 535). On the back face the same press sinks the pins. The word Push is true for the back face; on the front the pins come out. Tom's eye on the word.
- **The stage label calls the toy "Pin screen".** The name is Pin art; the label and the rows above say "board" for the object.
- **The fail line can be false.** `failed()` also runs when three.js does not load from the CDN (lines 1341 to 1347). The line then blames WebGL.
- **A typed word has silent limits.** A 15th character does nothing (line 727). After a turn of the board, Backspace does nothing and the next letter starts a new word (lines 720, 732).
- **Holding Space pushes deeper.** No row says so: the builder draws `hold` as a mouse, not as a held key.
- **A pen's force sets the depth and the speed of the push** (`force`, line 1008). A finger gets a wider push than a mouse (`R_TOUCH`, line 536). No row; not a secret.
- **The arrow keys and Space need the stage in focus** (the listener is on the stage, line 1221). Typing, Enter and Escape work from anywhere on the page (line 1241).
- **iOS asks for motion access on the first touch** (line 1178). The release notes of 2026-11-16 already ask Tom about it.
- **No secret or easter egg found.**
- **No doc:** `docs/toys/pins.md` does not exist.

### Limits

- Read only: no page, no server, no browser, no touch screen. No stills.
- The overlap of the bar and the frame (item 1) is arithmetic from the CSS values, not a measure. The width at which the Bar v3 bar wraps for this toy is not known.
- "WebGL 2" rests on three.js 0.170 needing it; the three.js source is not in the repo and was not read. The toy's own code only asks for `WebGLRenderer`.
- Items 3 and 4 come from the order of the listeners in the code (document before window), not from a key press.
- The look of the gradient dot and of the `click frame` and `drag frame` drawings under Bar v3 is not seen.
- `shared/signal.js` and `shared/stim.js` were read only in the parts named above.
