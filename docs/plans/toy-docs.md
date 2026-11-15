# Per-toy documentation standard

Bean: `stimming-l902` (epic `stimming-3s8z`). Written 2026-11-14. A proposal: Tom judges the standard on three examples before it rolls out.

## The problem

Facts about a toy live in five places: `toys.json`, `series.json`, the page source, its beans, and its plan doc (if it has one).
A new chat reads 2,000 to 9,000 lines of HTML to learn which bar slots a toy fills, which shared modules it uses, or why its pixel ratio is what it is.
Plan docs in `docs/plans/<id>.md` record how a toy was built, not what it is now. They go stale on purpose.

One doc per toy, in one shape, answers "what is this toy now" in one screen.

## The standard

- One file per toy: `docs/toys/<id>.md`. The template is `docs/toys/_template.md`.
- Every doc has the same sections in the same order. A section with nothing in it says "None.", so a missing fact and an absent feature look different.
- Prose follows ASD-STE100 at double density, like every doc here. Tables carry the facts.
- `docs/toys/` holds what a toy is now. `docs/plans/` keeps how it got there. A toy doc links its plans; it never copies them.
- The doc cites the page by `file:line` for anything a reader may want to check.

### Sections

| # | Section | Holds | Source | Generated? |
|---|---|---|---|---|
| 1 | Identity | Dutch name and IPA, motto, shelf and number, stage, series, accent, sound, legacy, signed off | `toys.json`, `series.json`, `data-done` in the page and the menu | Yes |
| 2 | Idea | Two or three sentences | The vignette, the code, Tom | No |
| 3 | Controls | The bar spec by slot; gestures | The `bar` object passed to `initPage` | Bar: yes. Gestures: no |
| 4 | Renderer and libraries | Tier, imported libraries and addons, importmap match | `import` lines, the importmap | Yes |
| 5 | Shared modules | Imports from `shared/` by name; drift | `import` lines; `docs/plans/modularize.md` | Imports: yes. Drift: no |
| 6 | Files | Every file, its lines and its role | The folder | Lines: yes. Role: no |
| 7 | Render pipeline | Passes in frame order; uniforms a person tunes | The page | No |
| 8 | Sound | Graph, engine, voices, samples, sleep | The page | No |
| 9 | Quality and performance | Pixel ratio, slow-frame step, idle, reduced motion, numbers | The page; `docs/plans/loading.md` | No |
| 10 | State and storage | `localStorage` keys | `stimming.<id>.` keys in the page and the bar spec | Yes |
| 11 | Tests and QA | Files in `tests/`, QA notes | `tests/`, `docs/qa/` | Partly |
| 12 | Known issues | One line each, with the bean | Open beans; the code | Beans: yes |
| 13 | Legacy build | What `legacy.html` is | `legacy.html` | No |
| 14 | History | Epic bean, plan docs, version codename | Beans, `docs/plans/`, the footer tag | Partly |

## Generated sections

Six sections come from data that already exists. A generator keeps them true; a person writes the rest once.

- A generated block sits between `<!-- gen:<name> -->` and `<!-- /gen:<name> -->`. The generator rewrites only the text between its markers.
- Blocks: `identity`, `bar`, `stack`, `shared`, `files`, and (later) `storage`, `beans`.
- Proposed tool: `tools/toydoc.py <id>` (Python, like `tools/updates.py`; no new library). With no id, it refreshes every existing doc. It never creates a doc a person has not started.
- It reads `toys.json` and `series.json` as JSON, and the page with plain pattern matches: `import ... from '../shared/x.js'`, the importmap block, `data-done`, `getContext('webgl2')`, `from 'three/webgpu'`.
- The bar spec is the hard part. It is a JavaScript object literal in an inline script. The tool finds `initPage({` and reads the `bar:` keys it can parse (`choice.label`, `choice.display`, `actions[].id`, `slider.label`, `keys`, `settings[].label`, `dev[].label`). What it cannot parse, it leaves to the person and says so.
- If the TypeScript plan (`docs/plans/typescript.md`) goes ahead, a typed bar spec in `shared/stim.js` makes this part exact.

Not built in this spike. It is the first follow-up if Tom likes the standard.

## Examples

Three docs show the standard on three different toys:

| Doc | Why this toy |
|---|---|
| `docs/toys/pop.md` | Signed off, the reference port for the library set, a hybrid of three.js and Canvas 2D, has a legacy build |
| `docs/toys/galaxy.md` | The Bar v2 reference, WebGPU and TSL, its own importmap, drift in sound and slow frames |
| `docs/toys/railgun.md` | The largest toy (9,400 lines), the Dev sheet, samples, tests, a module borrowed from another toy, work in progress in another chat |

Facts came from the page source, `toys.json`, the beans and `git log` on 2026-11-14.

## Roll-out, after Tom picks the standard

1. Tom reads the three examples and changes the template.
2. Build `tools/toydoc.py` for the generated blocks. Check it against the three examples.
3. Each toy gets its doc in its own chat, the next time that chat works on it. A toy chat updates its doc in the same commit as a change that makes the doc wrong.
4. The main shelf first, then the Lab. Never as one sweep across all toys, and never from this chat.
5. `AGENTS.md` gains one line: "Read `docs/toys/<id>.md` first; keep it true."

## Rules for a toy doc

- It says what is, not what was or what may be. Plans and ideas go in `docs/plans/` and in beans.
- Numbers carry their date (measured frame times, sizes).
- Tom's verdicts carry his name and the date, as in `AGENTS.md`.
- No marketing words, no blurbs. The toy's own copy stays in its vignette.
- The doc is internal. The Pages workflow skips `.md` files, so `docs/toys/` never ships.

## Open questions for Tom

1. The section list: add, drop or reorder.
2. Uniform tables: every shader, or only the ones a person tunes (the examples do the second).
3. The generator: build it now, or after ten docs by hand.
4. Order of roll-out: main shelf first, or the toys under active work first.
