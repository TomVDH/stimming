# Bar v3: the Signal bar

Status: in progress. Bean: `stimming-hvtr`. Cauldron is the first toy on it; nine more are earmarked (epic `stimming-a5rs`).
Tom's rulings: `DESIGN.md`, Rulings, 2026-11-16 and 2026-11-17. Workbench: `barlab/`.

Bar v3 replaces Bar v2 (`docs/plans/bar-v2.md`) toy by toy. Bar v2 comes out when Tom has signed off Bar v3 on every toy (Tom, 2026-11-17).

## What a toy does

- The `bar` spec does not change. A toy opts in: `initPage({ id, signal: true, bar })`.
- `?bar=signal` and `?bar=v2` pick one on any Bar v2 toy, for a check.
- Bar v2 still builds, hidden. Bar v3 draws from the same spec and acts through the same handles, so keys, stored values and the toy's code stay as they are.

## The bar

| Part | Rule |
|---|---|
| Place | One bar at the foot of the stage, centred. Three groups, parted by a slash: play (choice, actions), the main slider, the system (Sound, Settings, Dev with `?dev`, How to play). |
| Surface | No boxes. Words and icons stand on the stage; each carries a dark edge. |
| Type | Iosevka Term Slab ExtraBold, 14 px, caps. Controls are 44 px tall, 46 px on touch. |
| Colour | White is the flash: a press, or a thing that lands. The toy's accent is a state that holds: the icons, the slider fill, a held pick. Words stay white. |
| Hover | The white flash box closes in from the sides (Tom's pick). |
| Press | The white box lands oversize on pointer down for one frame, holds at size, and parts on release. A key press shows no box. |
| Focus | An ink bar at the control's foot. Never a ring. |
| Presence | The bar stays while you play. It leaves after 8 s with no input and returns on the next one. |
| Narrow stage | Under 640 px the main slider joins Settings, and a row of options folds into its list. A bar that needs two rows drops its slashes. |

## Beats

All motion is in film frames at 30 fps, as in the intro. Every sequence stops when a newer one starts. Reduced motion shows and hides at once.

- First arrival, after the intro has gone: the flash fills for 2 frames, snaps to size, holds, then parts in 3 frames.
- Return: 5 frames. Leave: 3 frames.
- A sheet lands from its own button in 5 frames and leaves in 2. Its rows do not stagger.

## Sheets

- A sheet has no box. Its rows stand on a soft glass with no edge (Tom kept the glass).
- The choice opens a list: every option as a tile; a `group` on an option puts a heading across the list.
- Settings: the main slider on a narrow stage, the toy's rows, Quality, the build link, Reset. A `group` on a row opens a labelled section.
- A choice row with more than four options, or long names, steps one name at a time.
- How to play, behind (i): each input as a drawing (a mouse, touch points) or a hairline keycap, then what it does. A toy may pass `help: [[input, instruction], ...]`, one instruction per row with the verb first; without it the `keys` entries and the action keys make the list. Keycaps show only here.

## Top left

The toy's icon as a monogram: a white square with the toy's emblem cut out dark, the intro's flash box at rest. It always stays. Pointing parts the square; then the return chevron and the Stimming logo play, one letter per film frame. A click goes to the menu. A toy with no emblem shows the wordmark's S in the square.

## Floors

- Text on a held pick reaches 4.5:1: the fill and the text colour come from the accent's stops (`setAcc` in `shared/signal.js`).
- Controls are 44 px or more. Keyboard focus always shows.
- A disabled control shows at 40% and takes no input.
- An action leaves the bar while the toy hides its Bar v2 chip, and returns with it. Railgun shows Reset only after a kill.
- A group wider than the stage wraps its own parts. Window seat on a phone has three rows.
- An action may open a tray: `tray: { title, hint, touchHint, options, onPick }`. Bar v3 draws it as a sheet; the action's handle gets `tray.open(on)` and `tray.isOpen`. Each option carries `data-value`, so the toy can start a drag from it. Prism's Pieces is the first.
- How to play has a drawing for each of: click, drag, hold, hold and drag, release, scroll, circle, move, and their touch forms. An option's colour dot keeps its colour.

## Open

- The toy's name is not on the stage. Tom says where it goes, if anywhere.
- The intro's logo does not yet cut into the monogram's corner; the monogram lands with the bar.
- Not checked: a real touch screen; keyboard-only use from end to end.
