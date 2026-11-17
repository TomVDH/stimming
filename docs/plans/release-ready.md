# Release readiness: the approved label

Bean: `stimming-jfwe` (epic `stimming-3s8z`). Written 2026-11-16.
A toy gets the approved label only when it passes every item on this list. Tom gives the label; nothing else does.
Each item comes from a rule that already exists. The source column names that rule. This page adds no new rule, except the Attributions section in the toy doc.

## The checklist

| # | Item | Pass when | Source |
|---|---|---|---|
| 1 | Port | Every module in the toy's row of the port list is adopted; the toy uses only proved modules; the same-frame check is recorded (a 1/255 shift on a few pixels is the same frame; more needs Tom's look). A "Map" row has the standard importmap. | [ports.md](ports.md), [code-health.md](../code-health.md) decisions 3 and 12 |
| 2 | Toy doc | `docs/toys/<id>.md` exists from [the template](../toys/_template.md). Every section is there; a section with nothing to say says "None." The doc says what is now, cites `file:line`, and dates its numbers. | [toy-docs.md](toy-docs.md) |
| 3 | Type check | The module script is in `<id>/main.js` (or other `.js` files), the folder is in `include` in `tsconfig.json`, and `npm run check` gives 0 errors. | [typescript.md](typescript.md), [code-health.md](../code-health.md) decisions 8 to 10 |
| 4 | Stack and build | The toy doc names the stack type (Sketch, Shader, Environment, Scene, Compute), the renderer tier, each library with its version, the shared modules, and how the toy is built: passes, sims, key techniques. The type matches the toy, or the doc names the planned move. | [code-health.md](../code-health.md) Stack types, [stack.md](../stack.md), [stack-types.md](stack-types.md) |
| 5 | Importmap | The page carries the importmap word for word. The WebGPU toys (Galaxy, Fire, Ink Water, Spark wheel) carry the 0.186.1 map. A page that imports no library needs none. No library outside the set, unless Tom named it. | `AGENTS.md` Conventions, [stack.md](../stack.md) |
| 6 | Attributions | The toy doc lists every outside source: libraries and their licences, data (maps, datasets), audio files, fonts, models, textures, and shader techniques or papers the toy adapts. Each row gives the source, the licence, and whether credit must show on screen. An unknown licence blocks the label. | This page (see Attributions below) |
| 7 | Bar v2 | The toy passes a `bar` spec to `initPage`. Slot limits hold: one choice, three actions, one slider, four key strip entries, five visible controls. Settings holds only what anyone playing may want; tuning sits in `dev` rows under `?dev`. The key strip and the phone layout work. The compliance list holds at 1280, 375 x 812 and 812 x 375. A toy change to the shell passes `tests/bar-v2.html`. | [bar-v2.md](bar-v2.md) (Slots, Phones, Mobile and compliance, Dev sheet) |
| 8 | Bar answered | Tom has answered the toy's questions in the question sheet below: what stays, what moves to Settings or Dev, what is missing, what goes. The bar matches his answers. | This page (Question sheet) |
| 9 | `toys.json` | The entry has every field in order, with `name`, `nl`, `ipa`, `tag`, `tagNl`, `accent` and `series` set. Tom sets the Dutch words and the mottos. | `AGENTS.md` (`toys.json` shape, Series) |
| 10 | Still | `shared/stills/<id>.webp` exists and shows the toy as it looks now. | `AGENTS.md` (Stills) |
| 11 | Load progress | A heavy toy reports real progress with `stage()` and `buildSteps(n)`. Heavy: a Scene, Compute or Environment toy, or a toy that fetches or bakes assets before its first frame. A light toy may keep the shell default. | `AGENTS.md` (The intro is the preloader), [loading.md](loading.md) |
| 12 | Sound | Sound is muted by default, starts after a gesture, and goes through `audioKit()` or the shell's `sound`, so the stored choice and sleep hold. A toy with no sound has `sound: false` in `toys.json`. | `AGENTS.md` Conventions, [modularize.md](modularize.md) step 1 |
| 13 | Reduced motion | The toy reads `prefers-reduced-motion` and changes what moves. The doc says what changes. | `AGENTS.md` Conventions, [stack.md](../stack.md) rule 4 |
| 14 | Runtime QA | Recorded and dated in the toy doc: 30 fps or better at 1280 px and on a phone; the loop stops when idle and when hidden; a clean console on load and after every control; checks at 1280, 375 x 812 and 812 x 375. | `AGENTS.md` Process and Conventions, [bar-v2.md](bar-v2.md) Checks |
| 15 | Sign-off | Tom puts `data-done` on the intro and the menu `<li>`, and sets the version after the port. Then he gives the approved label. | `AGENTS.md` (`data-done`), [ports.md](ports.md) Rules |

### Rules for the list

- Read every item from the code and the docs. Never mark an item from memory.
- A runtime item (12 to 14) passes only with a dated record in the toy doc. No record is a fail, not a pass.
- The list runs one toy at a time, in that toy's own chat, when Tom picks it. Never fix gaps across toys in one sweep.
- Tom alone sets `data-done`, the version and the approved label. An agent never sets them.
- How the label shows in the files is open (question 0 in the sheet).

## Attributions

Every toy doc gets an `## Attributions` section (the template has it from 2026-11-16).
One row per outside source:

| Field | Holds |
|---|---|
| Source | What it is, and its file or URL |
| Kind | Library, data, audio, font, model, texture, technique |
| Licence | The licence by name (MIT, CC0, CC BY 4.0, ODbL, own work). "Unknown" blocks the label |
| Credit shows | Yes (where on screen) or No (not required) |

- The libraries from the set and their licences: three.js (MIT), culori (MIT), Tone.js (MIT), GSAP 3.13 (the GSAP standard licence, free since 3.13), simplex-noise (MIT). B612 (SIL OFL 1.1), Gabarito (SIL OFL 1.1) and Iosevka (SIL OFL 1.1) are the site fonts. List each one a toy loads.
- A technique counts when a comment names its source (an author, a paper, a Shadertoy id) or when the code follows a known published method.
- Map data from OpenStreetMap is ODbL and needs a visible credit.
- An audio file needs its source and licence on record before the toy is approved. `ms3guns.mp3` (Railgun) was open on 2026-11-10.

## New toys

About 20 more toys come; then the project closes. Each new toy meets this list from its first commit:

1. Its bean names the stack type before the first line of code ([code-health.md](../code-health.md)).
2. Its toy doc starts with the toy, from the template, Attributions included. Every outside source goes into the doc in the commit that adds it.
3. It starts on Bar v2, with tuning in `dev` rows from day one.
4. Its module script lives in `<id>/main.js` and its folder joins `tsconfig.json` in the first commit.
5. It uses the shared modules that are proved; it copies no shared code.
6. It starts in the Lab. It reaches the main shelf only after Tom vets it; then it needs a `toys.json` entry in full and a still.
