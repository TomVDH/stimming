---
# stimming-8sfe
title: 'Window seat: the Signal bar and a redo of its controls'
status: completed
type: task
priority: normal
created_at: 2026-11-17T08:54:08Z
updated_at: 2026-11-22T08:54:45Z
parent: stimming-a5rs
blocked_by:
    - stimming-hvtr
---


One of the first ten (Tom, 2026-11-17, epic stimming-a5rs). The toy takes the Signal bar and gets its controls and menus redone in the same pass, clean and neat.

First read of what to redo: Dim, Light and Cozy look like three states of one thing: one choice may hold them. Seven Settings rows.

## Checklist

- [x] List every control and what it does (from the spec, the input code and close-up stills of the real page; not a hands-on play session)
- [x] Check it against the eight points in stimming-a5rs
- [x] Propose the redo to Tom before any change (2026-11-17, below); Tom rules
- [x] Apply the redo to the toy's `bar` spec (2026-11-17; Tom: "Yes, apply"), as proposed
- [x] Switch the toy to the Signal bar: `signal: true` in `window/index.html` (2026-11-17). Checked on the real page at 1280 px, 375 x 812 and 812 x 375; clean console
- [x] 1280 px, 375 x 812 and 812 x 375; clean console (2026-11-17, with the new copy)
- [x] The toy's doc in `docs/toys/` says what is true (the Controls block, by hand; it said "To write.")

## Review and copy rewrite of 2026-11-17 (applied the same day; Tom: "Yes, apply")

The rules are those of the four toys before it: one word for one thing; a label is a noun or one verb; a help row is one instruction with the verb first; the same action has the same words on every toy.

### Controls

| Where | Have | Suggested | Why |
|---|---|---|---|
| List | Time of day: Dawn, Morning, Noon, Afternoon, Golden hour, Dusk, Blue hour, Midnight | Keep | The same words as Train ride and Railgun. |
| Action (D) | Dim | Keep | One verb. |
| Action (W) | Light | Wing light | It says which light. The key is W. |
| Action (Q) | Cozy quiet flight | Keep | The joke is the label: it starts the worst weather. Tom rules. |
| Slider | Storm | Keep | |
| Settings | Cloud: Clear, Broken, Deck | Clouds: Clear, Broken, Overcast | Plural, as Towns. Deck is a pilot's word. |
| Settings | Towns: Sparse, Some, Dense | Towns: Few, Some, Many | Count words for a thing you count. |
| Settings | Rain: Off, Light, Heavy | Keep | |
| Settings | Seat: Wing L, Wing R, Aft L, Aft R | Seat: Wing left, Wing right, Aft left, Aft right | Whole words. Four long options do not fit one row; Bar v3 then shows a stepper. |
| Settings | Aurora | Keep | |
| Settings | Falling: Meteor, Fireball, Impact. Flying: Rocket, Jet | Keep, under a heading Sights | A pick starts the sight now; it stores nothing. The heading says so. |
| Settings | no headings | Outside: Clouds, Rain, Towns, Aurora. Cabin: Seat. Sights: Falling, Flying | Seven rows read better in three groups. |
| Settings | Quality; Version: Classic | Keep | |

### How to play

| Input | Have | Suggested |
|---|---|---|
| Click | a storm flashes | Flash a storm |
| Drag | lean and peer | Look around |
| Drag | (not listed) | Pull the shade |
| Drag | (not listed) | Draw in the fog |
| Scroll (pinch on touch) | lean closer | Lean to the glass |
| Left and right arrows | bank, climb, dive | Bank the plane |
| Up arrow | (as above) | Dive |
| Down arrow | (as above) | Climb |
| Shift and the arrows | (not listed) | Look around |
| + and - | (not listed) | Lean to the glass |
| B | (a cue on the stage only) | Breathe on the glass |
| D | dim | Dim the glass |
| W | light | Switch the wing light on and off |
| Q | cozy quiet flight | Start a cozy quiet flight |

### Other copy

| Where | Have | Suggested |
|---|---|---|
| Stage label for screen readers | "A cabin window on a night flight, the wing below. Towns glow on the ground; storms flash inside the clouds. Drag to peer around, pull the time of day, dim the glass, tap a storm to make it flash." | "A cabin window on a flight. The wing is below. Towns glow on the ground. Storms flash in the clouds. Drag to look around. Scroll to lean to the glass. Click a storm to flash it. Hold the arrow keys to fly the plane." |
| Line when the toy cannot run | "Window seat needs WebGL2, which this browser has turned off." | "This toy cannot run in this browser. It needs WebGL 2." |
| Cue on the stage | "Hold B to breathe"; on touch "Hold here to breathe" | Keep |
| Intro, under the name | Nothing | Keep |

### Findings

- The toy has no Reset. It stores nine values (hour, storm, dim, cloud, towns, rain, seat, aurora, shade).
- A tap on the winglet calls a lightning strike on the plane. It is a secret; the help does not list it.
- On a phone "Wing light" pushed the bar's first row off the stage. A bar group now wraps its own parts (`.sg-grp` in `shared/signal.css`). The phone bar has three rows: Dusk, Dim, Wing light; Cozy quiet flight; the three icons.
- In How to play the Shift row has five keycaps, so "Switch the wing light on and off" takes two lines.
- On 812 x 375 the Settings sheet shows three rows at a time and scrolls.
- `docs/toys/window.md` says "To write." for its controls.
- Limits: a read of the spec, the input code and stills. No hands-on play. No real touch screen.


## Summary of Changes

Bean triage, 2026-11-22 (Tom: "Yes, close them").
- The toy is on the Signal bar with the copy rewrite Tom approved (db8bf0bf, 8cd3d8ce).
- Checked at 1280 px, 375 x 812 and 812 x 375 with a clean console.
