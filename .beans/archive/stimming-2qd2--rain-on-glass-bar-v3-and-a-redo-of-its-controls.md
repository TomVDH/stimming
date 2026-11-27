---
# stimming-2qd2
title: 'Rain on glass: Bar v3 and a redo of its controls'
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

**Rain on glass (`rain`): review for Bar v3**

Spec: `rain/main.js:36`. Renderer need: WebGL 2. Read, not played.

Applied now: `signal: true` at `rain/main.js:36`. Nothing else in the toy changed. All below is a proposal.

### Today

| Where | Label | Options | Key | What it does (from the code) |
|---|---|---|---|---|
| List | Weather | Drizzle, Rain (first), Storm | Space, the toy's own listener (`main.js:1242`) | Sets the drop rate, the mist rate and the rain sound's level, low-pass and patter (`WEATHER`, `:380`; `onPick`, `:39`) |
| Slider | Wind | 0 to 1, step 0.01, first 0 | None | Sets `windGoal` (`:40`): the drops' paths tilt up to 1.28 rad, smaller drops break loose, the wind sound rises (`step`, `:454`; `rainLevel`, `:288`) |
| Settings | Quality | Standard, High | None | Fits the canvas again and clears the slow-frame step (`:1256`) |
| Actions | None | | | |
| Dev | None | | | |
| Reset | None | | | |
| Stage | | | Click, drag, arrow keys, Space | See How to play |

Weather and Wind are not stored: each load starts at Rain and 0. Only sound and quality are stored (`docs/toys/rain.md`, State and storage).

### Controls

No row changes.

Kept: Weather (Drizzle, Rain, Storm); Wind; Quality (Standard, High). Each label is a noun. Weather and Quality are shared labels already.

### How to play

| Input | Have | Suggested |
|---|---|---|
| Click | (not listed) | Wipe a spot |
| Drag | wipe the fog | Wipe the fog |
| Arrow keys | wipe a stripe, under the word `arrows` | Wipe a stripe |
| Space | next weather | Select the next weather |

On touch the builder shows the first two rows as tap and drag; the key rows leave.

### The `help` list, ready to paste

```js
help: [['click', 'Wipe a spot'], ['drag', 'Wipe the fog'], ['← → ↑ ↓', 'Wipe a stripe'], ['space', 'Select the next weather']],
```

### Other copy

| Where | Have | Suggested |
|---|---|---|
| Stage `aria-label` (`index.html:36`) | "A rainy window at dusk. Drag to wipe the fog. Arrow keys wipe a stripe; Space steps through drizzle, rain and storm." | "A rainy window at dusk. Fog covers the glass. Click to wipe a spot. Drag to wipe the fog. Press an arrow key to wipe a stripe. Press Space to select the next weather." |
| Fail line (`index.html:38`) | "Rain on glass needs WebGL 2, which this browser has turned off." | "This toy cannot run in this browser. It needs WebGL 2." |
| Intro (`index.html:31`) | Name only: "Rain on glass". No `intro-sub`. | Keep |
| Text on the stage | None | |

### Under Bar v3

- Measures of Bar v2 parts: nothing found. The toy reads only the stage's own size (`fit`, `main.js:1032`) and its rectangle (`local`, `:1205`). The picture fills the stage; the toy keeps nothing clear of a bar.
- `main.js:1244`: the key guard names `.s2-sheet`. Known; the shell now holds the toy's keys while a Bar v3 sheet is open.
- `main.js:42`: the `keys` word `arrows` is not a word the builder draws as arrows. `inputHTML` (`shared/signal.js:82`) makes one keycap that reads "arrows". The `help` list replaces it with `'← → ↑ ↓'`. Until the list is applied, How to play shows that keycap.
- `main.js:1268`: `failed()` calls `ui.hideControls()` (`data-bare`). Known; the shell reads the mark at its draw.
- Arrow keys with focus on a Weather button act differently on the two bars. Bar v2: the row of segments takes the arrow keys and steps the weather (`shared/stim.js:412`, `:431`). Bar v3: `segPart` (`shared/signal.js:153`) has no arrow handler, and the toy's guard (`main.js:1244`) does not stop an arrow that comes from a button, so the key wipes a stripe. This agrees with the help row; it is a change, not a fault.
- Needs a look on the real page: the bar's words stand with no box at the foot of the stage, over the car lights (rows at 0.665 to 0.82 of the height, `buildScene`, `main.js:141`, `:148`; headlight lightness 0.96) and the pale fog. The code does not tell if they read well.
- Not present: actions, a tray, a toy-owned control on the stage, a chip the toy hides, option icons or dots, stage text that names a Bar v2 place, a key bound twice.

### Findings

- A click alone wipes one round spot (`pointerdown` calls `wipeAt`, `main.js:1215`). The bar shows it nowhere today; the toy's doc has it.
- A wipe removes more than fog. `wipeAt` (`main.js:624`) thins the fog, erases the spray and removes the drops under the brush. "Wipe the glass" is the truer name. The proposal keeps "Wipe the fog" because the name is clear. Tom's call.
- Space does not step the weather while a button or a link has focus: the toy leaves Space to that control (`main.js:1250`). After a mouse click on a Weather button, Space is that button's key until focus returns to the stage. Bar v2 has the same rule.
- Each arrow key has its own direction (`sweep`, `main.js:649`): Left and Right sweep a level stripe that way, Up and Down an upright one. Each press takes the next lane, from the middle out (`laneAt`, `:645`). One help row covers the four.
- Enter does nothing in the toy. It is in `GESTURE_KEYS` (`main.js:197`) only so that it can start the sound. It is not in the help.
- No Reset, and none proposed: nothing but sound and quality is stored, and the fog grows back by itself (`FOG_TIME` 28, `main.js:565`). Weather has no "Changing" option; none proposed.
- Several fingers wipe at once (`strokes`, `main.js:1208`), and a finger's brush is 1.2 times a mouse's (`brush`, `:623`). No extra help row.
- Two lines go stale with the switch, and I did not edit them: the CSS comment "a dusk window in the Bar v2 shell" (`rain/index.html:17`), and the generated block in `docs/toys/rain.md:27` to `:35` ("Bar: v2", "Key strip").

### Limits

- Not played. No page, no server, no browser, no touch screen. No type check run.
- I did not read `ui.choice.set` in `shared/stim.js`; that Space runs `onPick` rests on the call in `nextWeather` (`main.js:1238`).
- How well the bar reads over the street and the fog is not judged.
- The narrow stage (under 640 px: Wind in Settings, Weather as a list) is read from `docs/plans/bar-v3.md` and `shared/signal.js:332`, `:363`; not seen.
