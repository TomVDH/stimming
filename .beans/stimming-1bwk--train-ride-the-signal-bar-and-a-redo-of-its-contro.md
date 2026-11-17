---
# stimming-1bwk
title: 'Train ride: the Signal bar and a redo of its controls'
status: todo
type: task
created_at: 2026-11-17T08:54:07Z
updated_at: 2026-11-17T08:54:07Z
parent: stimming-a5rs
blocked_by:
    - stimming-hvtr
---

One of the first ten (Tom, 2026-11-17, epic stimming-a5rs). The toy takes the Signal bar and gets its controls and menus redone in the same pass, clean and neat.

First read of what to redo: The own verb Line. Time holds many values in one row.

## Checklist

- [x] List every control and what it does (from the spec, the code and close-up stills of the real page; not a hands-on play session)
- [x] Check it against the eight points in stimming-a5rs
- [x] Propose the redo to Tom before any change (2026-11-17, below); Tom rules
- [ ] Apply the redo to the toy's `bar` spec
- [x] Switch the toy to the Signal bar: `signal: true` (2026-11-17). Checked on the real page at 1280 px, 375 x 812 and 812 x 375; clean console
- [ ] 1280 px, 375 x 812 and 812 x 375; clean console
- [ ] The toy's doc in `docs/toys/` says what is true

## Review and copy rewrite of 2026-11-17 (proposal; no word is changed)

Rules: one word for one thing; a label is a noun or one verb; a help line is one instruction, verb first; the same action has the same words in every place; no "or" in a line.

### Controls

| Where | Have | Suggested | Why |
|---|---|---|---|
| Choice title | Weather | Weather | Keep. |
| Option 1 | Clear | Dry | On the bar it reads "CLEAR", the same word as the Clear action on other toys. |
| Options 2 to 6 | Drizzle, Rain, Downpour, Mist, Fog | Keep | One noun each. |
| Slider | Speed | Speed | Keep. |
| Action (L) | Line | Route | It shows the route and the train on it. "Line" is also a drawn line. |
| Settings row | Time: Morning, Noon, Afternoon, Evening, Night | Time of day | Window seat says "Time of day" for the same thing. |
| Settings row | Drift: Off, On | Weather change: Off, On | "Drift" does not say what moves. On lets the weather change by itself. |
| Settings row | Express: Off, On | Express | Keep. A rail word with one meaning. |
| Settings row | Wet glass: Less, Some, More | Rain on glass: Less, Some, More | It names the thing you see. |
| Settings | (no Reset) | (finding only) | The toy has no Reset. The standard gives every toy one. A Reset is a new control, so it needs your word. |

### Help (How to play)

| Input | Have | Suggested |
|---|---|---|
| Click | lean in or sit back | Lean to the glass |
| Click again | (same line) | Sit back |
| Drag | peer | Look along the valley |
| Scroll (pinch on touch) | (not listed) | Lean to the glass |
| W | next weather | Change the weather |
| T | (not listed; the key works) | Change the time of day |
| E | express | Switch express on and off |
| L | line | Show and hide the route |

### Other copy

| Where | Have | Suggested |
|---|---|---|
| Stage label (screen readers) | A mountain valley by night or by day, seen through a carriage window on a high viaduct. Rain runs back along the glass as the train goes. Drag to lean and peer along the valley; scroll or pinch to lean against the glass. | A valley, seen from a train window. Rain runs along the glass. Drag to look along the valley. Click to lean to the glass. |
| Line when the toy cannot run | Train Ride needs WebGL2, which this browser has turned off. | This toy cannot run in this browser. It needs WebGL 2. |
| Intro, under the name | Stimming No. 41 | (remove; the intro shows no number) |
| Name | Train Ride | Train ride (as "Soup cauldron" and "Googly eyes" are written); Tom's call, it is in `toys.json` |
| Motto | none | Tom sets it. |
| Route strip, for screen readers | Place on the line | Place on the route (if Line becomes Route) |

### Findings that are not copy

- The route strip is the toy's own surface: rounded, blurred, Gabarito at 12 px. It does not match Bar v3. It sits 2 px above the bar and does not collide.
- With `?dev` the toy shows its own Sound mix panel at the bottom left. It is a builder tool and is not reviewed here.
- On 812 x 375 the Settings sheet scrolls inside its own box; nothing leaves the stage.
