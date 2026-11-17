---
# stimming-hvtr
title: 'Signal bar in the shell: a second bar builder, switched on per toy'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-17T08:54:07Z
updated_at: 2026-11-17T08:58:54Z
---

Tom, 2026-11-17: ten toys receive the new bar (epic stimming-a5rs). The Signal bar lives only in `barlab/` today. This bean moves it into the shell.

Hard rule 3 applies: this bean changes `shared/`. It needs Tom's yes before the first edit there.

## Shape (proposal)

- The `bar` spec does not change. A toy opts in; every other toy keeps Bar v2.
- The opt-in is one flag, in `toys.json` or in `initPage`; Tom picks.
- The builder comes from `barlab/shim.js` (the `signal` function and its parts) and `barlab/concepts.css` (the Signal block). The lab's knobs do not come along: Accent Toy, Ink Marks, Hover White box, Leaves after 8 s.
- The real intro hands over to the bar: the monogram square is the intro's flash box, cut to the top left.

## Checklist

- [x] Tom's yes for the edit in `shared/` (2026-11-17: "Yes, start")
- [x] The flag: `initPage({ signal: true })` on the toy's page. `?bar=signal` and `?bar=v2` pick one for a check
- [x] The builder in the shell, behind the flag: `shared/signal.js` and `shared/signal.css`. It draws over Bar v2, which still builds hidden and keeps the keys, the stored values and the handles. `stim.js` gains the option and one dynamic import; `stim.css` gains one hide rule
- [x] Tom, 2026-11-17: "we will pull out bar v2 when we have signed off barv3 per toy". Signal is Bar v3; spec in `docs/plans/bar-v3.md`
- [x] `tests/bar-v2.html` still passes: 108/108
- [ ] A Bar v3 test page beside it
- [x] Cauldron's real page, with its real intro, at 1280 px, 375 x 812 and 812 x 375: the bar waits for the intro, no control leaves the stage, clean console
- [ ] A real touch screen; keyboard only from end to end
- [x] A disabled control shows at 40% and takes no input (seen in use: Prism's Clear is off while the table has no added piece)
- [x] The site's type check passes (`tsc --noEmit -p tsconfig.json`). `npm run check` itself fails on Windows: its script is bash
- [x] `docs/plans/bar-v3.md` (the spec), `shared/AGENTS.md` and `DESIGN.md` say what is true
- [x] `/code-review` before the merge (rule in `shared/AGENTS.md`): run on PR 72 at high effort on 2026-11-17, after the merge of `main`. Ten findings, below. Tom: "skip code review and proceed"; none is fixed
- [ ] The lab keeps its own copy of the builder; one source is still to do
- [ ] `shared/signal.js` is not strict-clean: 94 findings under Railgun's tsconfig, most of them untyped parameters. `stim.js` builds the module's address at run time so that check passes; typing the module is still to do
- [x] Train ride and Railgun are on Bar v3 (2026-11-17)
- [x] Cauldron first: `signal: true` in `cauldron/index.html`
- [x] The other nine, one at a time, each in its own bean (2026-11-17: all ten run Bar v3 on this branch, each with its copy applied on Tom's yes)

## State on 2026-11-17: the ten run Bar v3

What the per-toy pass added to the shell, each from a fault or a need on one toy:

| Addition | From | Where |
|---|---|---|
| `help: [[input, instruction], ...]`, a typed spec field | Cauldron, Railgun | `shared/stim.js`, `shared/signal.js` |
| A touch-only gesture shows on touch alone | Train ride | `shared/signal.js` |
| An action leaves the bar while the toy hides its Bar v2 chip | Railgun's Reset | `actionParts` |
| One input column in How to play, as wide as its widest input | Railgun's four arrows | `shared/signal.css` |
| A lone `+` is a keycap | Galaxy | `inputHTML` |
| A bar group wraps its own parts on a narrow stage | Window seat | `.sg-grp` |
| An option's colour dot keeps its colour | Fire's salts | `optHTML`, `.sg-dot` |
| Drawings for a circle and for a pointer move | Googly eyes, Bubble wand | `GESTURE`; both are pointer words in `stim.js` |
| A tray: an action opens its options in a sheet, with tap or drag | Prism's Pieces | `actionParts`, `tray` in the action's type |

Open before a merge:

- `/code-review` (rule in `shared/AGENTS.md`).
- The branch is behind `main`; `main` has moved `shared/stim.css` and Railgun's Dev menu.
- A real touch screen; keyboard only from end to end; hands-on play of each toy.
- Tom signs off each toy. Bar v2 leaves a toy only after its sign-off.
- Railgun: a mark for Reset after a kill; Space and W A S D in its help.
- Window seat: three rows on a phone. Window seat and Train ride have no Reset.
- Prism: the Remove button and the zoom chip keep the old look.

## Code review of 2026-11-17 (PR 72, high effort): ten findings; seven fixed, three open

The branch has `main` merged in (commit 23b7f2b0): `tests/bar-v2.html` passes 108/108, both type checks pass, and the ten toys show no faults at three sizes.

Tom, 2026-11-17: "skip code review and proceed". The review had finished. The first batch of the other toys then met the same faults in the shell, so seven are fixed there; three wait.

| # | Where | Fault |
|---|---|---|
| 1 | `shared/stim.js:203` | The `stim-signal` class hides Bar v2 before `signal.js` loads, and the import has no catch. A failed load leaves the toy with no bar. |
| 2 | `shared/stim.js:384` and toys | Key guards name `.s2-sheet`; Bar v3 sheets are `.sg-sheet`. A shortcut key acts while focus is in a Bar v3 sheet (Galaxy: C clears; Fire: letters burn). Also `cauldron/index.html:2788`, `eyes/main.js:1197`, `railgun/src/input.ts:60`, `fire/index.html:1271`, `morpher/index.html:560`. |
| 3 | `shared/signal.js:574` | Escape closes a sheet with no preventDefault, so the toy's Escape runs too (Fire erases its word; Prism releases its piece). |
| 4 | `eyes/main.js:265` | The eyes keep clear of the Bar v2 corner rows, which have no size under Bar v3. An eye sits under the bar. |
| 5 | `shared/signal.js:583` | `data-bare` is copied only in the observer. A toy that fails before Bar v3 mounts may keep its full bar. |
| 6 | `trainride/index.html:6575` | Route writes its pressed state to the hidden Bar v2 chip. The Bar v3 button shows no state. |
| 7 | `shared/signal.js:457` | A mouse click leaves focus on the bar button, and focus keeps the bar. The bar then never leaves. |
| 8 | `prism/index.html:2634` | The strips the bar covers are measured from Bar v2 rows; they are zero under Bar v3. A piece can land under the bar. |
| 9 | `shared/signal.js:302` | A sheet that closes with focus inside drops focus to the body. |
| 10 | `shared/signal.js:338` | The intro's sound nudge pulses the hidden Bar v2 sound button. |

Fixed in the shell on 2026-11-17 and checked on real pages (Train ride, Domino Day, Googly eyes):

- 1: a module that does not load, a mount with no stage, or a draw that fails gives the stage back to Bar v2.
- 2 and 3: while a sheet is open a key is the sheet's; the toy's keys wait. Escape closes the sheet and does nothing else.
- 5: `draw` reads `data-bare`.
- 6: an action button shows the `aria-pressed` that the toy sets on its Bar v2 chip, in the toy's ink. Domino Day's Iso gains from it too.
- 7: only keyboard focus keeps the bar.
- 9: focus that was in a sheet returns to its button; a sheet opened by key takes focus.
- Also: a How to play row from an action's label shows its words, not its icon's markup, and no key shows twice (Domino Day).

Open: 4, 8 and 10.

Findings 4 and 8 are one pattern, and the largest open matter: a toy that keeps its picture clear of the bar measures the Bar v2 rows, which have no size under Bar v3. Of the first five further toys, three do it (Pop field, Pin art, Fidget board). The shell needs one call that gives a toy the strips the bar covers; each such toy then uses it.

## The keep-clear call (2026-11-17; Tom: "Yes, apply all")

Tom's yes covers the shell call that the keep-clear fault needs. It is `ui.cover()` and `ui.onCover(fn)` in `shared/stim.js`; `shared/signal.js` tells the shell when the bar has drawn or changed size (`stim:bar` on the frame). The spec is in `docs/plans/bar-v3.md`.

Checked on Window seat's real page with `?qa`: under Bar v3 at 1280 px the call gives top 56 and bottom 56 with two boxes, and at 375 px bottom 144 for the three-row bar; under Bar v2 it gives the five corner parts. `onCover` fires when Bar v3 arrives.

Also in the shell, from the subagents' reports:

- A mouse or touch press on the bar hands focus back to the stage (Soap cutting and Balloon letters did this for Bar v2 chips by themselves).
- An action button shows the HTML of its Bar v2 chip's label when the toy rewrites it (Pendulum wave's pattern glyph, TV tree's "Lights out" and "Lights on").

Open: Googly eyes and Prism, of the first ten, still measure Bar v2 parts; they move to `ui.cover()` next. The lab's copy of the builder has none of the fixes since the port.

## Tom's rulings of 2026-11-17, afternoon

- "Yes, run it": the rollout plan (`docs/plans/bar-v3-rollout.md`) with its four decisions.
- "SIGNAL IS THE NEW DEFAULT AND WILL NOT BE A SWITCH -- afer we're done we're pulling out ALL legacy bars". This replaces "we will pull out bar v2 when we have signed off barv3 per toy". The flag goes at the end of lane 1; the pull-out is the plan's last stage.
- "Yes, merge now": PR 72 merged into `main` as commit 8513a3fb (the shell and the first 30 toys). The Drone chat had relayed the wish; the merge waited for Tom's word in this chat.
