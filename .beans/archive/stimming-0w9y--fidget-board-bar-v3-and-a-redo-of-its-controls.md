---
# stimming-0w9y
title: 'Fidget board: Bar v3 and a redo of its controls'
status: completed
type: task
created_at: 2026-11-17T20:39:26Z
updated_at: 2026-11-27T07:19:52Z
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

**Fidget board (`fidget`): review for Bar v3**

Spec: `fidget/index.html:124`. Renderer need: none (DOM and inline SVG; Web Audio for sound). Read, not played.

The one edit is made: `initPage({ id: 'fidget', signal: true, bar: {` at `fidget/index.html:124`. Nothing below is applied.

### Today

### On the bar

| Where | Label | Options | Key | What it does (from the code) |
|---|---|---|---|---|
| Action | Reset | none | R | `act.reset` runs `sweep('reset')` (`index.html:168-180`): each part resets in a wave from left to right, 55 ms apart (25 ms with reduced motion). The dial turns its indicator to the top, the switches go to on, off, on, a locked key comes loose, the slider goes to notch 3. The joystick has no reset. |
| Key strip | click: "flip and press" | | | `keys`, `index.html:126` |
| Key strip | drag: "turn, slide, flick" | | | |
| Key strip | click stick: "shuffle" | | | |
| Key strip | s: "shuffle" | | S | The toy binds S itself (`index.html:129-134`). `act.shuffle` runs `sweep('shuffle', stick)`: a wave outward from the joystick. |
| System | Sound | off, on | | The shell's button; `toys.json` has `sound: true`. Muted by default. |

There is no list, no main slider, no Settings row, no Dev row, no Quality, no `reset:` and no `help`.

### On the stage (the toy's own five parts, `BOARD` at `index.html:139`)

| Part | Its label for screen readers | Pointer | Keys, with focus on the part |
|---|---|---|---|
| Dial (`parts/dial.js`) | "Dial", a slider 0 to 23 | Drag turns it; it snaps to one of 24 detents. A release faster than 5 rad/s spins it (`end`, line 166). | Arrows: one detent. Page Up, Page Down: six detents. Home: indicator to the top. Space or Enter: a spin. Shift with Space or Enter: a spin backwards (lines 171-186). |
| Switches (`parts/tog.js`) | "Switches": "Coral switch", "Blue switch", "Mint switch" | Click flips. A drag of more than 5 px moves the lever; the release flips it by position (lines 62-84). | Space or Enter flips (line 86). Up arrow: on. Down arrow: off (lines 87-92). |
| Joystick (`parts/joy.js`) | "Joystick. Press the nub to shuffle the board." | Drag moves the nub inside its gate; it springs home on release. The nub steers the board's light (`shine`, `kit.js:157`). A press on the nub shorter than 450 ms with under 6 px of travel shuffles the board (lines 31, 89-93). | Arrows, held: push the nub. Space or Enter: shuffle, on key up (lines 104-123). |
| Keys (`parts/keys.js`) | "Keys": "Key 1", "Key 2", "Key 3", "Latching key" | A key stays down while the pointer is down. The fourth key (mint, with a pip) locks on one press and comes loose on the next (`release`, lines 55-67). | Space or Enter, held: the key stays down (lines 77-87). |
| Slider (`parts/fader.js`) | "Slider", 1 to 5 | Drag moves the thumb; it lands on one of five notches. A click on the track sends the thumb to that notch (lines 76-100). | Arrows, Page Up, Page Down: one notch. Home: first notch. End: last notch (lines 102-111). |

### Controls

| Where | Have | Suggested | Why |
|---|---|---|---|
| Action (R) | Reset, on the bar | Reset, in Settings (`reset: () => act.reset()`) | Rule 7. Nothing in the toy shows or hides Reset. See Findings: the R key and the empty play group follow from this row. |

Kept: Sound. The toy has no other bar control.

### How to play

| Input | Have | Suggested |
|---|---|---|
| Drag, on the dial | turn, slide, flick | Turn the dial |
| Drag fast, on the dial | (in "flick") | Spin the dial |
| Click, on a switch | flip and press | Flip a switch |
| Drag, on a switch | (in "slide") | Flip a switch |
| Drag, on the joystick | (not listed) | Move the joystick |
| Click, on the joystick | click stick: shuffle | Shuffle the board |
| Click, on a key | (in "flip and press") | Press a key |
| Click, on the fourth key | (not listed) | Lock the mint key |
| Drag, on the slider | (in "slide") | Move the slider |
| Click, on the slider's track | (not listed) | Move the slider to a notch |
| Tab | (not listed) | Select the next control |
| Arrows, on the dial | (not listed) | Turn the dial |
| Space, on the dial | (not listed) | Spin the dial |
| Shift and Space, on the dial | (not listed) | Spin the dial backwards |
| Up and Down, on a switch | (not listed) | Flip the switch |
| Space, on a switch | (not listed) | Flip the switch |
| Arrows, on the joystick | (not listed) | Move the joystick |
| Space, on the joystick | (not listed) | Shuffle the board |
| Space, on a key | (not listed) | Press the key |
| Arrows, on the slider | (not listed) | Move the slider |
| S | shuffle | Shuffle the board |
| R | A keycap on the Bar v2 chip; under Bar v3 a row "reset" from the action key (`shared/signal.js:395`) | Reset the toy |

### The `help` list, ready to paste

```js
help: [['drag', 'Turn the dial'], ['drag fast', 'Spin the dial'], ['click', 'Flip a switch'], ['drag', 'Flip a switch'],
  ['drag', 'Move the joystick'], ['click joystick', 'Shuffle the board'], ['click', 'Press a key'], ['click', 'Lock the mint key'],
  ['drag', 'Move the slider'], ['click', 'Move the slider to a notch'],
  ['tab', 'Select the next control'], ['← → ↑ ↓', 'Turn the dial'], ['space', 'Spin the dial'], ['shift space', 'Spin the dial backwards'],
  ['↑ ↓', 'Flip the switch'], ['space', 'Flip the switch'], ['← → ↑ ↓', 'Move the joystick'], ['space', 'Shuffle the board'],
  ['space', 'Press the key'], ['← → ↑ ↓', 'Move the slider'], ['S', 'Shuffle the board'], ['R', 'Reset the toy']],
```

That is 22 rows. A short form, if Tom wants fewer: the ten pointer rows, then `['tab', 'Select the next control'], ['S', 'Shuffle the board'], ['R', 'Reset the toy']`.

### Other copy

| Where | Have | Suggested |
|---|---|---|
| Stage label for screen readers (`index.html:103`) | "Fidget board" | "A board with a dial, three switches, a joystick, four keys and a slider. Drag the dial to turn it. Click a switch to flip it. Drag the joystick to move the light. Click the joystick to shuffle the board. Click a key to press it. Drag the slider to move it. Press Tab to select a control. Press the arrow keys to move it. Press Space to press it. Press S to shuffle the board. Press R to reset the toy." |
| Intro, under the name (`index.html:98`) | Stimming No. 03 | Remove; the intro shows no number. |
| Joystick label (`parts/joy.js:5`) | "Joystick. Press the nub to shuffle the board." | "Joystick. Click it to shuffle the board." One word for the thing: "nub" shows nowhere else in the copy. |
| Fourth key label (`parts/keys.js:5`) | "Latching key" | "Mint key". The switches take their colour as a name ("Mint switch"); `aria-pressed` says the state. Low priority. |
| Line when the toy cannot run | None. The page has no `<p class="fail">`. | Keep none. The toy needs no WebGL and no WebGPU. |

Kept: the intro name "Fidget board"; the labels "Dial", "Switches", "Coral switch", "Blue switch", "Mint switch", "Keys", "Key 1" to "Key 3", "Slider".

### Under Bar v3

1. A Bar v2 class in the toy's own key guard, `fidget/index.html:131`: `if (e.target.closest?.('input, textarea, select, [contenteditable], .s2-sheet')) return;`. Bar v3 sheets are `.sg-sheet` (`shared/signal.js:296`), so S shuffles while focus is in a Bar v3 sheet. Today the toy has no sheet with a focusable row: no Settings button (`hasRows` is false, `signal.js:346-347`) and How to play holds only text. It starts to matter when Reset moves to Settings. The shell's own binder has the same guard (`shared/stim.js:384`), so R acts the same way; that part is the shell's, not the toy's.
2. The board's padding is sized by Bar v2 parts, `fidget/index.html:31-33`: `/* The top row clears the corner chips; the bottom row clears the key strip too. */` and `padding: max(var(--edge), calc(var(--chip, 26px) + 22px)) var(--edge) max(var(--edge), calc(var(--chip, 26px) + 56px))`. `--chip` is Bar v2's chip size (`shared/stim.css:326`, 36 px on touch at line 329). By the numbers: the top keeps 48 px (58 on touch) and the Bar v3 monogram ends at 56 px (58 on touch; `shared/signal.css:193-194`), so the monogram can reach 8 px into the dial's cell corner on a mouse screen. The dial is a centred circle, so the corner is most likely empty. The foot keeps 82 px (92 on touch) and a one-row Bar v3 bar ends at 56 px (58 on touch), so the bar clears the slider with room left. Not seen on a page.
3. Without `help`, How to play under Bar v3 shows the four `keys` rows and then "R: reset" (`shared/signal.js:393-396`). All four words draw: `click`, `drag`, `click stick` (the word "stick" small beside the click), `s`.

Nothing else found: no read of `.stim-ui` or an `.s2-` part beyond item 1; no toy-owned palette, tray, chip or cue; no chip that the toy hides; one action, with no `hold` and no list; no option with an icon or a dot; no text on the stage that names a Bar v2 place; no key bound twice (the shell binds R, the toy binds S, the parts take keys only with focus).

### Findings

Open for Tom:

1. With Reset in Settings the shell no longer binds R: the key comes from the action (`shared/stim.js:549-553`). The toy then binds R itself beside S, as Galaxy does, or R goes. The `help` row for R holds only in the first case.
2. With Reset in Settings the bar has no play group: Sound, Settings, How to play. Shuffle sits on the joystick by design (`index.html:122`: "The stick's nub is the Shuffle button; S is its key"). Reset here is a visible sweep, the twin of Shuffle, so Tom may want it to stay on the bar.
3. One word for the joystick. The code and the copy use three: "stick" (`keys`), "joystick" (label), "nub" (label). The proposal uses "joystick".
4. The `help` list is long because each of the five parts has its own keys. Four rows start with Space and differ only by the control in focus. Enter does the same as Space on every part (`KEYS`, `kit.js:17`) and has no row: two keycaps on one row would read as a chord beside "shift space".
5. Home, End, Page Up and Page Down act on the dial and the slider and have no row. They are not in the brief's keycap list. By `inputHTML` (`shared/signal.js:82`) `'home'` and `'end'` would draw as one keycap each; not seen. Rows if Tom wants them: `['home', 'Turn the dial to the top']`, `['home', 'Move the slider to the first notch']`, `['end', 'Move the slider to the last notch']`.

Facts from the code:

1. Dead code for a launch. A plain key calls `board.fire()` when the board is primed (`parts/keys.js:52`). Primed needs `armed`, which only the safety cover sets (`parts/safe.js:76`), and the page does not mount that part. No file assigns `board.fire` (`kit.js:207` has `fire: null`); no file calls `board.dial.run()` (`parts/dial.js:207`) or `snd.launch` (`kit.js:318`). So the lit ring (`dial.js:124`) and the launch sound cannot show today. It reads as a secret that is half removed; it is not in the help.
2. The registry holds 51 parts (`parts/index.js`) and its comment names a die that deals them. The page mounts five and has no die. No other file in the repo imports `fidget/parts`.
3. By my reading, S and R make no sound when the audio context sleeps. The sound kit wakes on a key only when the key is in `GO` (`kit.js:216-218`, `shared/stim.js:1006-1010`), S and R are not in it, and the context sleeps 2 s after the board is still (`sleepMs: 2000`). A click wakes it. Not heard.
4. Shuffle taps the locking key half of the time, so it also locks and frees that key (`parts/keys.js:98`). With reduced motion Shuffle leaves the joystick alone and steps the dial (`joy.js:132`, `dial.js:193`).
5. The toy has no doc in `docs/toys/`.

### Limits

- Not played, not run, not seen: no server, no browser, no screenshot. Every layout number is from the CSS.
- No touch screen, no screen reader. The length of the stage label on a `role="group"` is not checked by ear.
- Read in full: `fidget/index.html`, `fidget/kit.js`, the five mounted parts, `parts/index.js`. Of the 46 other parts only `safe.js` lines 60-84, plus a search for `board.` across the folder.
- `shared/signal.js`, `shared/signal.css` and `shared/stim.js` read in part: the help builder, the action and Settings code, the key binder, the bar's place and the audio wake.
- The keycap drawing of `tab`, `shift space` and `↑ ↓` is taken from the brief's list and `inputHTML`; not seen.
