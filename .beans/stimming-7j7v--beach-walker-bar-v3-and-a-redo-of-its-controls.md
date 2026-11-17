---
# stimming-7j7v
title: 'Beach walker: Bar v3 and a redo of its controls'
status: in-progress
type: task
created_at: 2026-11-17T21:30:26Z
updated_at: 2026-11-17T21:30:26Z
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

**Beach walker (`walker`): review for Bar v3**

Spec: `walker/index.html:1928`. Renderer need: Canvas 2D (lines 83-84). three.js on WebGL draws the full scene and is optional: without it a flat 2D scene shows (lines 895-910). Read, not played.

### Today

| Where | Label | Options | Key | What it does (from the code) |
|---|---|---|---|---|
| List (with three.js only) | Time | Noon, Golden hour, Sunset, Dusk, Night, End of the world, Alien night, Black hole | none | `pickTime`: eases to the look in about 2 s, stores it, switches Cycle off. First value: Sunset. |
| Action (with three.js only) | Close | toggle | V | `setWide`: swaps the far wide shot and the near one, stores it. First view: wide. `aria-pressed` is true in the near view. |
| Settings | Legs | 8, 12 | none | `build`: four or six pairs of legs. Stored. |
| Settings (with three.js only) | Cycle the day | toggle | none | `setCycle`: the hour swings from noon to night and back, two minutes each way (`step`, line 1486). Stored. |
| Settings | Quality | the site's steps | none | `quality: true`; the canvas refits (`onQuality(fit)`). |
| Settings | Reset | button | R (the toy's own) | `reset`: the walker returns to its start; wind, vane and footprints clear. Time, view and Legs stay. |

No slider. No Dev rows.

### Controls

| Where | Have | Suggested | Why |
|---|---|---|---|
| List | Time | Time of day | The shared label (Window seat, Railgun). |
| List, last three options | no heading | `group: 'Other worlds'` on End of the world, Alien night, Black hole | They are not times of day. The code's own comment: "five hours of the day, then three other worlds" (line 1922). |
| Action (V) | Close | Close-up | "Close" reads as the verb for shut. "Close-up" is a noun and takes the shared toggle words. |
| Settings | Cycle the day | Day cycle | A label is a noun or one verb. See Findings for the "Changing" option. |

Kept: the eight option names; Legs: 8, 12; Quality; Reset in Settings (it is there already through `reset:`).

### How to play

| Input | Have | Suggested |
|---|---|---|
| Drag | blow wind | Blow a gust of wind |
| Click | (not listed) | Blow a puff of wind |
| Drag on the hub | crank by hand, as "drag the hub" | Turn the crank |
| Left and right arrows, held | gust | Blow a steady wind |
| V | wide or close | Switch the close-up on and off |
| R | (not listed; only the stage label names it) | Reset the toy |

### The `help` list, ready to paste

```js
help: [['drag', 'Blow a gust of wind'], ['click', 'Blow a puff of wind'], ['drag hub', 'Turn the crank'],
  ['← →', 'Blow a steady wind'], ...(sea ? [['V', 'Switch the close-up on and off']] : []), ['R', 'Reset the toy']],
```

The V row follows `sea`, as the action does.

### Other copy

| Where | Have | Suggested |
|---|---|---|
| Stage `aria-label` | Five sentences; two hold three facts each | "A walker with many legs on a beach. A breeze blows by itself. The walker strides with the wind. Drag across the stage to blow a gust of wind. Click to blow a puff of wind. Drag the crank hub to turn the crank. Hold the left or right arrow key to blow a steady wind. Press V to switch the close-up on and off. Press R to reset the toy." |
| Fail line | "Beach walker needs canvas drawing, which this browser has turned off." | "This toy cannot run in this browser. It needs the 2D canvas." |
| Intro, under the name | Stimming No. 20 | Remove. |
| Text on the stage | None | Nothing to change. |

### Under Bar v3

- **The feet and the bar, line 394.** `fit()` sets `trackY = clamp(h * 0.85, h * 0.5, h - 64)`; the comment says "The feet stay above the bottom row of controls". The 64 is a fixed number, not a measure of a Bar v2 part, so nothing reads zero. Bar v3 on one row takes 56 px from the foot, 58 px on touch (`--pad` 12 px and `--h` 44 or 46 px, `shared/signal.css:16`, `:20`, `:85`). That leaves 6 to 8 px on a stage under 427 px tall; a bar on two rows is taller than 64 px. In the near view the walker stands at the centre (`shift` is 0, line 412), where the Bar v3 bar is. Needs a look at 812 x 375 in the near view.
- Line 1944, `document.querySelector('.stim-ui button[aria-keyshortcuts="V"]')`: the toy writes `aria-pressed` on its Bar v2 chip (line 1948). Known; the Bar v3 button mirrors it. The builder finds the chip by its label, so a new label needs no other change.
- Line 1986, the key guard names `.s2-sheet`. Known; no fault.
- Line 1929, `display: 'stepper'`: Bar v3 does not read it; the list is a pick button with a sheet of eight tiles.
- `cycleName` (lines 1970-1974) sets the list to the nearest hour while the cycle runs. Bar v3 follows through its observer on the Bar v2 layer (`shared/signal.js:603`). Read, not seen.
- Nothing else found: no toy-owned control, palette, chip or cue; no text on the stage; no read of `.s2-tl`, `.s2-keys`, `--chip`, `data-stack` or `data-narrow`; one action, no `hold`, no tray; no `icon` or `dot` on an option. The `keys` words all draw (`drag`, `drag the hub`, `← →`, `V`). No key is bound twice: the shell binds V, the toy binds R and the arrows.

### Findings

- A quick click away from the hub (under 6 px, under 350 ms) blows a puff from the click toward the walker (`release`, lines 1907-1912). No list and no label shows it today.
- R resets, and only the stage label says so; `keys` does not list it.
- Cycle does nothing under reduced motion (`todCycle && !reduce`, line 1485), and the toggle still shows on.
- A pick from the list switches Cycle off (line 1958). Frietkot's Weather has "Changing" as an option of the list (`frietkot/index.html:117`). The same form fits here: "Changing" as an option of Time of day, and no Settings row. That is a change of behaviour, so it is Tom's call.
- With no three.js or no WebGL the toy has no list, no Close-up and no Cycle (lines 1929-1936). The stage label still names V.
- The pointer over the hub lights it and shows a grab cursor (lines 1903-1904). It does nothing else, and there is no drawing for a hover, so it is not in the help.
- The label "Noon" stands on the look that the code calls afternoon (line 337).
- Beach walker has no doc in `docs/toys/`.

### Limits

- A read of the spec, the input code and the shell's builder. No play, no browser, no stills.
- The shader and three.js scene code (lines 468-1478) was not read in full; it holds no input handler and no Bar v2 selector (searched).
- No real touch screen; the touch forms of the help rows are the builder's.
- The clearance in the near view is arithmetic from the CSS values, not a measure on the page.
