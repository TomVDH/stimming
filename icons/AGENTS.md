# icons/

Workbench for menu icons. The live icons are inline SVG in `index.html` (`docs/menu.md`).

## Before any icon work

- Read the icon sheet (`icons/sheet.html`) over the local server. A file link opens it without its data.
- Look at the main-shelf icons first. Prism, Fidget board and Heat putty are the reference.
- Icon work happens per toy, in that toy's own chat. Tom starts those chats.
- Generate no icon until the icon sheet shows its slot. Renew the sheet first when it is out of date.
- Tom's verdicts live in `icons/picks.json`. Tom marks tiles on the sheet; `Copy marks` gives JSON.

## The standard

A toy has at most three icons:

| Icon | What it is |
|---|---|
| Current | The icon on the menu today. |
| Shaded object (A) | The toy's object in full colour: glossy, in the toy's colours, with the shared light (a rim and a soft top-left glint), free on the menu ground. |
| Isometric block (D) | The object stands on a block, or is the block, at 30 degrees: light top, mid left face, dark right face, rim on the top edges. |

- Draw no other style: no stencil, no single-weight line, no abstract mark.
- One bold object fills the box. Body: one gradient, then the same shape with the shared `lit`, then a `rim` line 2 wide.
- Details are few, flat and bold. No dark outlines, thin lines, tiny parts or sparkle. No frame by default.
- Never a two-tone hard offset shadow. A soft halo is fine.
- Every icon reacts to the pointer (enter, move, leave), shows at 128 and 64, and fills 110 of the 128 box on its long side.
- Every icon on the sheet stays live. Never swap a live icon for a still copy.

## Files

- A round is one gallery, `icons/spike-<toy>-<n>.html`, with three cards: Current, A and D. Then add the toy to the sheet's `GALLERY` table.
- The sheet opens on All rounds: every icon of every gallery a toy has had, newest round first, from `icons/rounds.json` plus `GALLERY`. `?latest` shows only A and D of the voted rounds. Cut directions show dimmed, marked "cut".
- The All view also shows each toy's earlier menu tiles, newest first, as stills (`icons/history/`, listed in `history/menu.json`). Each still is the tile at rest in the last commit that had it. Its hover is gone.
- A new round joins the toy's `GALLERY` list, oldest first. Earlier rounds stay on the sheet under the newest, for the vote (Tom, 2026-11-23). A mark names its round.
- An emblem name that is taken by an earlier round gets the round number: `<toy><n>-a.svg`.
- Emblems: `icons/spike/emblems/<toy>-a.svg` and `<toy>-d.svg`. The gallery also carries each as a data URI.
- Older galleries keep B, C and E cards for reference; the sheet hides them.
- Cut directions go to `icons/archive/` (`cut.json`, `emblems/`). Leave that folder out of context unless Tom asks.
- `icons/index.html` is an unlinked page of old directions. The spheres are rejected.
