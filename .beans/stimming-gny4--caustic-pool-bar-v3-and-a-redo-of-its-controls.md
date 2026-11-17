---
# stimming-gny4
title: 'Caustic pool: Bar v3 and a redo of its controls'
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

**Caustic pool (`pool`): review for Bar v3**

Spec: `pool/index.html:84`. Renderer need: WebGL 2 with `EXT_color_buffer_float` (`initGL`, lines 1377 to 1379). Read, not played.

### Today

| Where | Label | Options | Key | What it does (from the code) |
|---|---|---|---|---|
| List | Tool | Ball, Anvil, Kettlebell, Cut; each has an icon | 1, 2, 3, X | `setTool` (1934): the object that a click adds, or the Cut mode. The toy stores it. |
| Action | Clear | | C | `clearPool` (2499): every object sinks away. Off while the pool is empty (`syncClear`, 2529). |
| Action | Rain | a switch | R | `setRain` (1907): raindrops fall until the next press. Not stored. |
| Settings | Pool | Lap, Round, Bean | P, the toy's own | `nextPool` (2506): a new shape, depth and tiles. The pool empties. Stored. |
| Settings | Time | Day, Night | N, the toy's own | `setNight` (1915): the sun, or the moon and the lamps. Stored. |
| Settings | Quality | Standard, High | | `onQuality` (2592): the canvas fits again. |

No slider, no Dev rows, no Reset.

### Controls

| Where | Have | Suggested | Why |
|---|---|---|---|
| Settings | Time | Time of day | The shared label. Window seat has it. |

Kept: Tool and its four options; Clear; Rain; Pool and its three options; Quality.

### How to play

| Input | Have | Suggested |
|---|---|---|
| Click | drop | Add an object |
| Hold | (not listed) | Hold an object over the water |
| Drag | throw or cut | Throw an object |
| Drag | (as above) | Cut a trench with the Cut tool |
| Drag the deck | turn | Look around |
| Right-drag | (not listed) | Look around; held out of the list, see Under Bar v3 |
| Scroll | (not listed) | Zoom the view |
| Space | toss one in | Add an object at a random place |
| Arrows | (not listed) | Look around |
| 1, 2, 3 | on the chips only | Select an object |
| X | on the chip only | Select the Cut tool |
| C | clear | Clear the pool |
| R | rain | Switch the rain on and off |
| N | (stage label only) | Change the time of day |
| P | (stage label only) | Select the next pool |

### The `help` list, ready to paste

```js
help: [['click', 'Add an object'], ['hold', 'Hold an object over the water'], ['drag', 'Throw an object'], ['drag', 'Cut a trench with the Cut tool'],
  ['drag the deck', 'Look around'], ['scroll', 'Zoom the view'], ['space', 'Add an object at a random place'], ['← → ↑ ↓', 'Look around'],
  ['1 2 3', 'Select an object'], ['X', 'Select the Cut tool'], ['C', 'Clear the pool'], ['R', 'Switch the rain on and off'],
  ['N', 'Change the time of day'], ['P', 'Select the next pool']],
```

### Other copy

| Where | Have | Suggested |
|---|---|---|
| Stage `aria-label` (line 52) | Five long sentences; names a "Throw" mode; no scroll, arrows or tool keys | "A pool of thick water seen from above. Click the water to add a ball, an anvil or a kettlebell. Hold to keep it over the water. Drag on the water to throw it. Drag with the Cut tool to cut a trench in the water. Drag the deck to look around. Scroll to zoom the view. Press Space to add an object at a random place. Press 1, 2 and 3 to select an object. Press X to select the Cut tool. Press C to clear the pool. Press R to switch the rain on and off. Press N to change the time of day. Press P to select the next pool. Press the arrow keys to look around." |
| Fail line (line 54) | "Caustic pool needs WebGL 2 with float textures, which this browser lacks." | "This toy cannot run in this browser. It needs WebGL 2." Tom's call: the toy also fails without float render targets (line 1379); "It needs WebGL 2 with float textures." is the exact line. |
| Intro (line 47) | Name only; no `intro-sub` | Keep |

### Under Bar v3

- **The four tool icons lose their fill.** Each icon puts `class="solid"` on the `<svg>` itself (`stencil`, line 64). The toy's rule that fills it is scoped to Bar v2: `.stim-ui svg.solid { fill: currentColor; stroke: none; }` (line 39). The Bar v3 layer is not inside `.stim-ui` (`shared/signal.js:136`), and the shared rule `.sg-btn svg .solid` (`shared/signal.css:35`) matches a child of the svg, not the svg. So `.sg-btn svg { fill: none; stroke: currentColor; stroke-width: 1.75 }` applies: by the CSS, Ball, Anvil, Kettlebell and Cut draw as outlines. `isArt` does not catch them (`fill-rule=` is not `fill=`). Fix in the toy: put the class on a `<g class="solid">` inside the svg; line 39 can then go. Pool is the only toy with this pattern.
- **`right-drag` gives a false row on touch.** The builder swaps it to `two-finger drag` (`TOUCH`, `shared/signal.js:71`). In this toy a second finger starts the pinch (line 2400), so two fingers zoom and do not turn. The row is out of the paste list for that reason. A mouse user does not learn the right-drag.
- Nothing measures Bar v2 parts: no `.s2-tl`, `.s2-keys`, `--chip`, `data-stack` or `data-narrow` in the file. `fitCam` (257 to 275) fits the pool and its rim to the full stage, with no room kept for a bar. The Bar v3 bar at the foot stands over the near rim and deck; not seen.
- Known, one line each: the Rain state goes to the Bar v2 chip as `aria-pressed` (lines 98, 99, 1909) and the button mirrors it; the key guard names `.s2-sheet` (2537); `failed()` (2559) disables the list and both actions, and Bar v3 follows `disabled`.
- Clear is disabled, not hidden, while the pool is empty: Bar v3 shows it at 40% (`data-disabled`). No gap.
- Four options with icons, no dots: a row on a wide stage, the pick button and its list under 640 px. Two actions, no `hold`, no tray, no slider.
- Keys the toy binds itself and the spec does not list: N, P and the four arrows (2535 to 2555). No key is bound twice; the shell holds C, R, 1, 2, 3, X.
- Every `keys` word draws (`'drag the deck'` is a drag with "the deck" beside it). The `help` list replaces them.

### Findings

- The stage label says "In Throw". No control has that name; `mode = 'throw'` is internal (line 1932).
- The Tool list holds two kinds: three objects and one mode. Space with Cut chosen moves the list back to the last object, then adds it (line 2545).
- No Reset. The view has no way back: `cam.yaw`, `cam.tilt` and `cam.zoom` change only by input (2363, 2433, 2434, 2551, 2552), and a new pool keeps the turn (313). Clear leaves the rain and the view as they are.
- At most eight objects live (`CAP`, 1926). A ninth sinks the oldest (`addObj`, 1991). Nothing says so.
- A press holds the object above the water until the release (2416 to 2423); a still release drops it, a moving one throws it (`letGo`, 2476 to 2485). The old key strip had no word for the hold.
- On touch a second finger always starts the pinch and ends the first finger's action (`pinchStart`, 2380). `NCUT = 4` cutters and several held objects look out of reach on touch, by my read.
- The arrow keys are taken page-wide: `preventDefault` runs with no focus test and before the `ready` check (2546 to 2549). The arrows never scroll the page.
- Pool has no doc in `docs/toys/`.

### Limits

- Read only: no server, no browser, no play. The outline claim for the icons comes from the selectors, not from a picture.
- Read in full: lines 1 to 925, 1812 to 1847, 1880 to 2015, 2280 to 2606. The rest (shaders, GL, physics) by search for handlers and Bar v2 names.
- Not checked: the width of the bar with four icon options and two actions at 1280 px and 375 px; a real touch screen.
- `pool/legacy.html` not read.
