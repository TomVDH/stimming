# Stimming

Read ADJUDANT.md first. It is generated; do not edit it.

`stimming` · type: `coding` · vault: [[stimming/brief|stimming]]

Small interactive desk toys for the office: one menu, and one self-contained page per toy on a shared shell.
Plain HTML and JS; toys move to TypeScript one at a time (Tom, 2026-11-16). A TypeScript toy builds from `<id>/src/`; Railgun is the first. Terms: `GLOSSARY.md`.

## Hard rules

1. Commit only through `tools/commit.sh`. Never `git add -A`, `git commit -a`, or a whole shared file such as `index.html`: pass your hunks.
2. Toy chats share this checkout. Touch only your bean's files. Never revert another toy's changes.
3. A change in `shared/` or the menu needs its own bean and Tom's yes before the edit.
4. Ask Tom before anything visible, a new library or a shelf move. Build only what he asked.
5. One thing at a time: one toy, one visual change. Never roll a change across all toys.
6. New toys start in the Lab. Only Tom moves a toy to the main shelf, and only Tom signs a toy off (`data-done`).
7. Use only the library set, at its pinned versions. Copy the importmap word for word from `docs/standards/code.md`.
8. Publishing is a push to `main` (GitHub Pages; the workflow runs `npm run build` first). The claude.ai Artifact is retired: never publish to it.
9. A change that makes a doc line false fixes it in the same commit. A standard changes only from Tom's own words.
10. Sound is muted by default. Idle pages do no per-frame work. Respect `prefers-reduced-motion`.
11. Never use brand names for toys (exceptions: Domino Day, Strandbeest).

## Read before work

| Work on | Read |
|---|---|
| Any code | `docs/standards/code.md` |
| Beans, git, QA, sign-off | `docs/standards/process.md` |
| Instruction files, skills, memory | `docs/standards/agents.md` |
| A toy | `docs/toys/<id>.md` (when it exists) |
| The menu (`index.html`, `shared/menu/`) | `docs/menu.md` |
| `shared/`, `icons/`, a workbench | The `AGENTS.md` in that folder |
| Look and visual system | `DESIGN.md` |
| Users, purpose, taste | `PRODUCT.md` |
| Renderer choice and costs | `docs/stack.md` |
| Code-health decisions and ports | `docs/code-health.md` |
| Plans (each has a status line) | `docs/plans/` |

## Layout

| Path | What |
|---|---|
| `index.html` | The menu: a body fragment; views `./` (Clock), `?all`, `?lab` |
| `<id>/index.html` | One toy (Fresh). `<id>/legacy.html` is its Classic build. |
| `toys.json`, `series.json` | The one list of toys, and the series |
| `shared/` | Shell (`stim.js`, `stim.css`), intro, WebGL2 kit, shader bundles, menu code, fonts, stills, loops |
| `shared/daytime.js` | Time of day: hour presets, sun and moon, key light, lamps, an eased clock. Plan: `docs/plans/daytime.md` |
| `icons/` | Icon workbench and the icon sheet |
| `barlab/`, `fxlab/`, `introlab/`, `glasslab/`, `menulab/`, `serieslab/` | Workbenches (`noindex`) |
| `tools/` | `commit.sh`, capture scripts, checks |
| `tests/` | `bar-v2.html` and node tests |
| `docs/` | Standards, menu, toy docs, plans, QA captures |

## Commands

| Task | Command |
|---|---|
| Dev server | `npm ci` once, then `npm run dev` (serves on port 8000, rebuilds TypeScript toys), then <http://localhost:8000/>. `python3 -m http.server 8000` works after `npm run build`. |
| Build TypeScript toys | `npm run build` |
| Type check | `npm run check` |
| Bar v2 test | `tests/run.sh http://localhost:8000/tests/bar-v2.html` |
| Commit and push | `tools/commit.sh -m "<Area>: what (bean-id)" [--hunks <patch>] -- <paths>` |
| Work items | `beans prime` |

## Where things live

| | |
|---|---|
| Remote | `git@github.com:TomVDH/stimming.git` (public), branch `main` |
| Site | <https://tomvdh.github.io/stimming/> |
| Brief | [[stimming/brief]] |
| Decisions | [[stimming/decisions]] |
| Sessions | [[stimming/sessions]] |
| Handoff | [[stimming/_handoff]] |
| Credits | `CREDITS.md` |

## Claude-specific overrides

Live in `CLAUDE.md` next to this file. CLAUDE.md `@`-imports this file.
