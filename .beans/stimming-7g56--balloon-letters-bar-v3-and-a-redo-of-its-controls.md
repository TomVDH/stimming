---
# stimming-7g56
title: 'Balloon letters: Bar v3 and a redo of its controls'
status: in-progress
type: task
created_at: 2026-11-17T21:30:27Z
updated_at: 2026-11-17T21:30:27Z
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

**Balloon letters (`balloons`): review for Bar v3**

Spec: `balloons/index.html:72`. Renderer need: WebGL 2 (three.js 0.170 `WebGLRenderer`, line 2087). Read, not played.

### Today

| Where | Label | Options | Key | What it does (from the code) |
|---|---|---|---|---|
| List | Foil | Gold, Silver, Rose, Holo; each has a colour `dot` | none | `chooseFoil` (1250): new letters take the foil, and the word that is up changes letter by letter. Stored as `stimming.balloons.foil`. |
| Action | Let go | | none (Enter, bound by the toy) | `letGo` (1214): every letter rises off the stage. Off while no letter is up (`syncGo`, 1074). |
| Action, touch only | Type | | none | Focuses the hidden field, so the touch keyboard opens (2059). Built only when `(pointer: coarse)` at load (77). |
| Settings | Quality | Standard, High | none | The shell's row (`quality: true`). |
| Settings | Reset | | none | `resetAll` (2049): lets the word go, then inflates HI again. |

No slider, no settings rows of its own, no Dev rows. The bar binds no key: every printable key types (comment, 71).

### Controls

| Where | Have | Suggested | Why |
|---|---|---|---|
| List, option | Holo | Holographic | Rule 2: whole words. It is 11 letters on the bar row; Tom may keep "Holo" as the foil's shop name. |

Kept: Foil; Gold, Silver, Rose; Let go (plainly the toy's own verb); Type; Quality; Reset, already in Settings through `reset:`.

### How to play

| Input | Have | Suggested |
|---|---|---|
| A to Z, 0 to 9 | inflate (the input word is `type`) | Inflate a letter |
| Space | (not listed) | Add a space |
| Drag | bat it | Bat the letters |
| Click on a letter | (not listed) | Push a letter |
| Quick small moves on a letter | (not listed; the stage label says "rub") | Rub a letter (drawn as `circle`) |
| Hold on a letter, still for 0.6 s | prick | Prick a letter |
| Arrow keys | (not listed; in the stage label) | Bat the letters |
| Backspace, Delete | (not listed; in the stage label) | Prick the last letter (the row shows Backspace) |
| Enter | let go | Let the letters go |
| Tap on the bare stage, touch only | (not listed) | Open the keyboard |
| An arrow, then its opposite inside 360 ms | (not listed) | Leave out; see Findings |

### The `help` list, ready to paste

```js
help: [['A-Z 0-9', 'Inflate a letter'], ['space', 'Add a space'], ['drag', 'Bat the letters'], ['click', 'Push a letter'], ['circle', 'Rub a letter'], ['hold', 'Prick a letter'],
  ['← → ↑ ↓', 'Bat the letters'], ['backspace', 'Prick the last letter'], ['enter', 'Let the letters go'], ['tap', 'Open the keyboard']],
```

### Other copy

| Where | Have | Suggested |
|---|---|---|
| Stage `aria-label` (46) | "Foil balloon letters float on a dark stage, saying HI. Type to inflate more; drag to bat them, rub one to squeak it and hold one to prick it, or use the arrow keys to bat, Backspace to prick and Enter to let them all go." | "Foil balloon letters float on a dark stage. They say HI. Type a letter to inflate it. Drag to bat the letters. Click a letter to push it. Rub a letter to make it squeak. Hold a letter to prick it. Press the arrow keys to bat the letters. Press Backspace to prick the last letter. Press Enter to let the letters go." |
| Fail line (48) | "Balloon letters needs WebGL 2, which this browser has turned off." | "This toy cannot run in this browser. It needs WebGL 2." |
| Intro, under the name (41) | Stimming Lab | Remove. The name "Balloon letters" stays. |

Kept: the hidden field's label "Letters to inflate" (47). The toy puts no text on the stage.

### Under Bar v3

- **The word no longer keeps clear of the bar.** `measureBands` (1037-1049) reads `.stim-ui > :is(.s2-tl, .s2-tr, .s2-bl, .s2-br)` and skips a row with no `offsetParent`. Under Bar v3 the layer is `display: none`, so `t` and `b` are 0: `bandT = 1` (the stage's top edge, without the 24 px gap) and `bandB = -0.72` (a fixed 14% of the stage height). `layout` (1104-1106) fits the word between the two. The Bar v3 bar stands 12 px off the foot and is 44 px tall, 46 on touch (`shared/signal.css:16, 20, 85`), so its top is at 56 px. With the toy's own 24 px gap, a stage under about 570 px tall puts the bottom row of a long word behind the bar; a bar on two rows needs about 890 px. The top row of a long word can rest at the stage's top edge and behind the monogram. A short word (HI) rests at the centre and is clear.
- The `ResizeObserver` at 2200-2201 watches the same four corner rows. They have no size now, and nothing watches `.sg-bar`, so a bar that wraps to a second row does not move the word.
- Strings hang "most of the way to the floor" (`ropeLen`, 1020), so they pass behind the centred bar. Under Bar v2 the foot's centre was free.
- **Focus does not return to the stage.** Lines 2043-2046 listen on `.stim-ui` for a click on `.s2-chip, .snd` and then focus the stage. Bar v3's buttons are in `.sg-ui`, so this never runs. The key handler lets Enter and Space pass to a focused button (`onButton`, 2010-2012, 2022). After a mouse click on a foil, Space presses that foil again and adds no space, and Enter does not let go. A closed sheet gives focus to its bar button (`shared/signal.js:315`), with the same result.
- Known: the key guard names `.s2-sheet` (2009); the shell holds the keys under an open sheet.
- Known: the `keys` word `'type'` draws as a keycap that says "type"; the `help` list replaces it with `'A-Z 0-9'`.
- No drawing for a rub. `circle` is the nearest: the rub is quick moves inside a small patch (`pressTick`, 1954).
- On touch, `click` draws as a tap, so "Push a letter" and "Open the keyboard" are two tap rows. A small word (`'tap stage'`) can part them; Tom's call.
- Fine as it is: the four `dot` gradients (supported); two actions at most, no `hold`, no tray; `Let go` goes off through its handle, which the Bar v3 button follows; no toy CSS for a Bar v2 part; no control of the toy's own on the stage.

### Findings

- A drag that starts on a letter throws that one letter (`pressTick`, 1938-1951), then bats as usual. One help row covers both.
- An arrow and then its opposite inside 360 ms rubs the whole word (`gust`, 1230). Keycaps cannot say "quickly, one after the other", so it has no row.
- A prick is a coin toss (1175): the letter pops into confetti, or it deflates and flies about. "Prick" names both.
- Also typed: `! ? & @ # $ % + = * ' " . , : ; ( ) -` (`CHARS`, 460). The word holds 24 places, spaces included (`MAXTOK`); one key more shakes the last letter.
- On touch every key row leaves How to play, so no row says that typing inflates. The Type button is the only sign.
- `failed()` (2070-2072) shows the line and never calls `ui.hideControls()`, so the bar stays over a toy that cannot run. It also runs when three.js does not load (2080-2084) or `start` throws (2245), where "It needs WebGL 2" is not the cause.
- A mouse move with no button down only wakes the idle sway (1909). It is not an input and has no row.
- The toy has no doc in `docs/toys/`.

### Limits

- Read only: no play, no browser, no server, no touch screen. The preview check that the edit hook asks for was not run; the brief forbids a browser.
- The stage heights for the bar overlap are sums from `shared/signal.css` and the toy's constants, not measures of the real page.
- Not checked: the width of the bar with "Holographic", the look of the conic `dot` at the Bar v3 dot size, the touch keyboard through the Bar v3 Type button on a real phone.
- `toys.json` gives `legacy: false`; no Classic build was read.
