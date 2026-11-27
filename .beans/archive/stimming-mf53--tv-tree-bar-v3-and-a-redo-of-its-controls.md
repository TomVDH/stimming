---
# stimming-mf53
title: 'TV tree: Bar v3 and a redo of its controls'
status: completed
type: task
created_at: 2026-11-17T21:30:27Z
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

**TV tree (`tvtree`): review for Bar v3**

Spec: `tvtree/index.html:65`. Renderer need: WebGL 2 with a float or half-float colour buffer (line 2494). Read, not played.

### Today

| Where | Label | Options | Key | What it does (from the code) |
|---|---|---|---|---|
| Action | Shuffle | | S | `ACTS.shuffle` (2380): deals a new lineup; each lit TV changes to it in a wave from the trunk. |
| Action | Eyes | | E | `startWatch` (1488): each lit TV shows an eye that follows the pointer, for about 6.5 s. Disabled unless three TVs are lit with a signal and no show runs (`syncActs`, 2403). |
| Action | Lights out, or Lights on | | O | `ACTS.power` (2392): with a TV lit, all go dark; with all dark, all come on. The toy rewrites the label (2409). |
| Settings | Channels | link "All 155" (`NCH - 1`) | | Opens `channels.html`, the contact sheet. |
| Settings | Quality | Standard, High | | `onQuality` (1715) clears the low pixel ratio step and refits. |
| Bar | Sound | | | `toys.json` has `sound: true`. |

No list, no slider, no Reset, no Dev rows. The pointer and the keys are under How to play.

### Controls

| Where | Have | Suggested | Why |
|---|---|---|---|
| Action (O) | "Lights out", rewritten to "Lights on" by the toy | "Lights", a toggle: the toy sets `aria-pressed` on its chip while a TV is lit | Bar v3 does not follow a rewritten label (see Under Bar v3). A toggle is what Bar v3 shows. One noun. |

Kept: Shuffle, Eyes, Channels (All 155), Quality. No Reset: the toy stores only the lantern's state.

### How to play

| Input | Have | Suggested |
|---|---|---|
| Click a TV | change channel | Change the channel of a TV |
| Hold a TV | power off | Switch a TV on and off |
| Drag a TV | swing or pass | Move a TV |
| Release over another TV | (in "swing or pass") | Pass the picture to another TV |
| Click the lantern | (not listed) | Switch the lantern on and off |
| Drag off a TV | (not listed) | Shake the tree |
| Click off a TV | (not listed) | Knock on the tree |
| Scroll, pinch | zoom | Zoom the view |
| Move | (not listed) | Move the point the eyes watch |
| Arrows | (not listed) | Select a TV |
| Enter | (not listed) | Change the channel |
| Enter, held | (not listed) | Hold to switch the TV on and off |
| Shift and arrows | (not listed) | Swing the TV |
| C | (not listed) | Pass the picture to the TV you select next |
| Escape | (not listed) | Release the picture |
| Space | (not listed) | Shake the tree |
| + and - | (not listed) | Zoom the view |
| S | shuffle | Shuffle the channels |
| E | eyes | Show the eyes |
| O | lights out | Switch every TV on and off |
| L | (not listed) | Switch the lantern on and off |

### The `help` list, ready to paste

```js
help: [['click', 'Change the channel of a TV'], ['hold', 'Switch a TV on and off'], ['drag', 'Move a TV'], ['release', 'Pass the picture to another TV'],
  ['click', 'Switch the lantern on and off'], ['drag', 'Shake the tree'], ['click', 'Knock on the tree'], ['scroll', 'Zoom the view'], ['move', 'Move the point the eyes watch'],
  ['← → ↑ ↓', 'Select a TV'], ['enter', 'Change the channel'], ['enter', 'Hold to switch the TV on and off'], ['shift ← → ↑ ↓', 'Swing the TV'],
  ['C', 'Pass the picture to the TV you select next'], ['esc', 'Release the picture'], ['space', 'Shake the tree'], ['+ -', 'Zoom the view'],
  ['S', 'Shuffle the channels'], ['E', 'Show the eyes'], ['O', 'Switch every TV on and off'], ['L', 'Switch the lantern on and off']],
```

### Other copy

| Where | Have | Suggested |
|---|---|---|
| Stage `aria-label` | Two long sentences (line 52). No word on Scroll, plus and minus, S, E. | "A tree at night, hung with little TVs. Each TV shows a channel. Click a TV to change its channel. Hold a TV to switch it on and off. Drag a TV to move it. Release it over another TV to pass its picture. Click the lantern to switch it on and off. Drag the tree to shake it. Scroll to zoom the view. Press the arrow keys to select a TV. Press Enter to change its channel. Hold Enter to switch it on and off. Press Shift and an arrow key to swing it. Press C on two TVs to pass a picture. Press Space to shake the tree. Press S to shuffle the channels. Press E to show the eyes. Press O to switch every TV on and off. Press L to switch the lantern on and off." |
| Fail line | "TV tree needs WebGL 2, which this browser has turned off." | "This toy cannot run in this browser. It needs WebGL 2." |
| Intro | "TV tree", no `intro-sub` | Keep |
| Channels link, `title` | "Every channel on one sheet" | Keep |

### Under Bar v3

- **The tree no longer keeps clear of the bar.** `bands()` (2029-2043) measures `.s2-tl`, `.s2-tr`, `.s2-bl`, `.s2-br` and `.s2-keys` inside `.stim-ui` (line 81). Under Bar v3 that layer has `display: none` (`shared/stim.css:311`), so each `offsetHeight` is 0 and `bands()` returns `[0, 0]`. `fit()` (2054-2055) then frames the tree on the full stage with an 8% margin at the top and the foot. The Signal bar stands 12 to 56 px above the foot edge (`shared/signal.css:16, 85`), centred, on top of the picture. By my arithmetic from `fit` (not measured; the camera is raised and tilted, line 2068) the ground line is about 10% of the stage height above the foot edge on a wide stage. So on a stage under about 560 px tall the bar covers the trunk foot, the shrubs and the lantern (x = -0.4, near the centre; hit sphere at line 2201). A click on the bar does not reach the lantern under it. A bar on two rows covers more.
- The refit watch (2610-2615) observes the same Bar v2 parts and `data-narrow`, `data-stack`, `data-tight`. Under Bar v3 it never fires for the bar. A fix needs the Signal bar's height (`--barh`, `shared/signal.js:566`) or a fixed foot band.
- **The Lights label stays "Lights out".** `syncActs` (2408-2409) finds `.s2-chip[aria-keyshortcuts="O"] .s2-label` and writes "Lights on" into the hidden chip. Bar v3 writes its button once from the spec (`shared/signal.js:210`) and mirrors only disabled, `aria-pressed` and hidden (249-258). With every TV dark the button still reads "Lights out".
- Eyes' disabled state reaches Bar v3 through the handle (2407). No fault.
- Key guards that name `.s2-sheet` (2332, 2415): known, the shell holds the keys.
- Shuffle shows as a word, without the die: known.
- Keys the toy binds itself, not in the spec: T, P, L, C, Escape, plus, minus (2412-2422); Space, arrows, Shift and arrows, Enter (2330-2365). P and O do the same thing.
- A held Enter has no drawing. The paste list uses a keycap row that starts with "Hold to".
- The Channels row's `title` shows under Bar v2 only; Bar v3's link row does not set it (`shared/signal.js:274-277`).
- Three actions, none with `hold` or a tray. No icons, no dots. No toy-owned controls on the stage. Every word in `keys` has a drawing.

### Findings

- T starts the big picture at once (`ACTS.tune`, 2386). It shows nowhere. The goal of the toy is to get there by hand: four TVs on one channel (`matchCheck`, 1442). I left T out of the help as a secret. Tom rules.
- P is a second key for the Lights action (2412) and shows nowhere. O is not in `GESTURE_KEYS` (176) and P is, so O as the first input does not start the sound.
- Three quick clicks off a TV start the eyes (2287-2288). A secret; left out of the help.
- "Lights out" leaves the lantern lit: `powerAll` (2395) sets the TVs only. Tom may prefer "TVs" or "Power" as the noun.
- Hold switches a TV both ways (2215); `keys` says "power off". A click on a dark TV switches it on (1359).
- The stage label says "drag the trunk". The code takes any point that is not a TV or the lantern (2218-2225).
- The lantern has no control on the bar: a click and L only. Its state is stored as `stimming.tvtree.lantern` (1658).
- `docs/toys/tvtree.md` has "To write" under Controls. Its Idea line says "hold to power it off".

### Limits

- Read, not played. No browser, no server. The 560 px figure is arithmetic, not a measure.
- Portrait and phone sizes: `fit` read for the wide case only. The top band and the monogram are not checked.
- Touch: the pointer code is read (pinch, the 30 px nearest-TV pick); no real touch screen.
- `channels.js`, `channels.html` and `lab.html` are not reviewed. Of the shell, only the parts of `signal.js` and `stim.js` named above.
