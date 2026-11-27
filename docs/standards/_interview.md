# Standards interview log

Working log for epic `stimming-51dy`. One line per answer. The rebuild reads this file.

## Card 1: frame (2026-11-16)

| # | Question | Answer |
|---|---|---|
| 1 | AGENTS.md size cap | Under 100 lines. Hard rules and an index; detail in `docs/standards/*`. |
| 2 | Decision records | Vault, through adjudant (`[[stimming/decisions]]`). Repo docs link to them. |
| 3 | Dated rulings in docs | Rule only. Date, quote and rejected options move to the decision records. |
| 4 | Glossary | `GLOSSARY.md` at the repo root. Project terms only. |

## Card 2: agent instructions

| # | Question | Answer |
|---|---|---|
| 5 | Nested AGENTS.md | `shared/`, plus `icons/` and the labs (`introlab/`, `fxlab/`, `menulab/`, `serieslab/`, `glasslab/`). Not the big toys. |
| 6 | CLAUDE.md / GEMINI.md | Keep the thin import files. No symlink. |
| 7 | Claude memory | Promote project-wide rules into the repo docs. Memory keeps Claude-only habits. |
| 8 | Skills per job | Short task-to-skill table in `docs/standards/agents.md`, only where the project requires a skill. |

## Card 3: where rules live

| # | Question | Answer |
|---|---|---|
| 9 | Big-toy rules | `docs/toys/<id>.md` gets a Rules section. Root index: read the toy doc before work on a toy. |
| 10 | Menu rules | New `docs/menu.md`: views, Clock parts, loading, stills, loops. Rule only. |
| 11 | Doc register | ASD-STE100, double density. No em dashes. |
| 12 | Rule edits | Any agent, only from Tom's own words, with a vault decision linked. |

## Card 4: root and repo docs

| # | Question | Answer |
|---|---|---|
| 13 | Root AGENTS.md rules | Only rules whose miss costs work or ships a mistake. About ten lines. |
| 14 | Shared code from a toy chat | Own bean and Tom's yes before the edit. Commit hunks only. |
| 15 | Finished plans | Each plan opens with `Status: active \| done \| dropped` and its bean id. |
| 16 | README.md | Humans on GitHub: what it is, live link, how to run, link to AGENTS.md, plus a generated main-shelf toy list. No rules. |

## Card 5: code

| # | Question | Answer |
|---|---|---|
| 17 | Code layout | Inline until about 800 lines of script; past that, `<id>/main.js` and named modules. Existing toys split only when ported. |
| 18 | Format and lint | Prettier + ESLint, dev tools only. |
| 19 | Types | `@ts-check` and JSDoc on exports in `shared/` now. Toys opt in when ported. |
| 20 | Perf budget | First frame under 3 s cold (`tools/loadtime.mjs`). Toy's own files under 1 MB; more needs Tom's yes (superseded 2026-11-27: stay under 2.5 MB recommended, 5 MB comfortable max, up to 7.5 to 10 MB for S-tier or statement pieces). Idle: no rAF loop, no audio nodes. 30 fps floor stays. |

## Card 6: code hygiene

| # | Question | Answer |
|---|---|---|
| 21 | Prettier/ESLint scope | Only files a chat creates or owns outright. No repo-wide reformat. Shared files and old toys wait for their port. |
| 22 | Errors | Raw WebGL2 toys use `onContextLoss` from `shared/gl.js`; three.js toys listen for `webglcontextlost`. Any boot failure (CDN, shader, device) shows the stage's `.fail` line. Clean console at load and in play; a known warning carries a comment. |
| 23 | Naming | Toy id = folder = `toys.json` key, lowercase, one word. Dev pages `spike-*.html`, `probe-*.html`, `lab.html`, all `noindex`. Keys `stimming.<id>.<key>`. A probe page goes when its check ends. |
| 24 | Commit message | `<Area>: what (bean-id)`. Area: toy name, Menu, Shell, Docs or Tools. One logical change. |

## Card 7: stack rules

| # | Question | Answer |
|---|---|---|
| 25 | WebGPU missing | Redirect to `legacy.html` when one exists; otherwise the still (`shared/stills/<id>.webp`) and one line. |
| 26 | New toy start | `tools/new-toy.mjs`: id, name, stack type; writes the Bar v2 page with `stage()`, the `toys.json` entry (Lab, series), `docs/toys/<id>.md` and the bean. Replaces code-health decision #2. |
| 27 | Library bumps | Tom's yes; a chore bean; one library at a time; its reference toy proves it with a same-frame check; then all importmaps in one commit. |
| 28 | Browsers | Latest Chrome desktop, Safari desktop, iOS Safari and Firefox. |

## Card 8: tests, assets, privacy

| # | Question | Answer |
|---|---|---|
| 29 | Tests | `npm test`: `node --test tests/*.test.mjs`, then `tests/run.sh` on port 8000. Pure logic gets a `.test.mjs`; looks get Tom's eye. |
| 30 | Assets | Site-wide: a download needs Tom's yes (file, source, size, licence) and a row in root `CREDITS.md`. Procedural first. |
| 31 | Privacy | No analytics, cookies or trackers; localStorage for settings only. Scripts from jsDelivr and cdnjs only, pinned. A CSP meta tag on each page. No SRI. |
| 32 | Shell API | JSDoc in `shared/stim.js` is the reference. Docs name no exports. |

## Card 9: process and QA

| # | Question | Answer |
|---|---|---|
| 33 | QA method | Headless Playwright by default. Replaces the 2026-11-02 "stop playwrighting" ruling. |
| 34 | Branching | Toy work: `tools/commit.sh` to `main`. Worktree and PR for shell, menu or multi-toy changes, and for a feature bean Tom marks. |
| 35 | Sizes | 1280, 375 x 812, 812 x 375 for every visual change. |
| 36 | Review | `/code-review` on PRs before merge. Direct toy commits: Tom's look only. |

## Card 10: gates

| # | Question | Answer |
|---|---|---|
| 37 | Counts in docs | None in prose. `toys.json` is the only list; the README list is generated. |
| 38 | Sign-off gate | Checks pass (clean console, three sizes, reduced motion, idle sleeps, perf budget, Bar v2 limits); toy doc complete; fresh still and a loop if a good one exists. Sound listen not a gate. |
| 39 | Lab to main shelf | Fixed list in one commit: number in `toys.json`, version `"1.5"`, still, Bar v2, menu icon in the menu language, series. |
| 40 | Autonomy | Ask Tom on anything visible, a new library, a shared change, a shelf move. Decide alone on code structure, invisible fixes, tests; report after. |

## Card 11: upkeep

| # | Question | Answer |
|---|---|---|
| 41 | Doc drift | A change that makes a doc line false fixes it in the same commit. |
| 42 | Probes on Pages | `pages.yml` drops `probe-*.html`, `spike-*.html` and dev lab pages from the build. They stay in git. |
| 43 | Session end | Bean checklist current, plus one NEXT line in the adjudant handoff. |
| 44 | Bean size | One chat, one bean. Title starts with the toy or area name. Bigger work is an epic or feature with child tasks. |

## Card 12: design clashes

| # | Question | Answer |
|---|---|---|
| 45 | B612 trial | Ends as a yes: B612 headings everywhere. DESIGN.md changes; trial notes in `clock.css`, `stim.css`, `tube.js` go. |
| 46 | Shadows | No hard shadows anywhere. Bar v2 pressed state needs a new cue (own bean, Tom's look). |
| 47 | Logo and name halo | They share the stage-text halo (bar-v2 rule 8 wins over DESIGN.md:327). |
| 48 | Focus | `:focus-visible` ring in the focus token, keyboard only (own bean, Tom's look). |

## Card 13: design picks

| # | Question | Answer |
|---|---|---|
| 49 | Bar v2 press cue | A bean explores three options in a gallery; Tom picks. |
| 50 | Copy | Content zone under the stage, fixed short sections: idea, making-of, changes, credits. Nothing written on the stage. "Vignette" retires as a word. |
| 51 | Icon motion | Pointer-reactive (enter, move, leave). `play`/`rest` stays as the idle loop API. |
| 52 | Series icon | Hex-ring shot. Memory's iso-block note dropped. |

## Card 14: sources of truth

| # | Question | Answer |
|---|---|---|
| 53 | Doc vs code facts | Shipped code wins; fix the doc. Code that looks wrong is a bug bean. |
| 54 | Site-wide taste notes | Look rules to DESIGN.md (Do's and Don'ts); product taste to PRODUCT.md. |
| 55 | Per-toy directions | A Direction section in `docs/toys/<id>.md`; memory keeps a pointer. |
| 56 | Creative North Star | Open; its own naming round later. |

## Card 15: glossary I

| # | Question | Answer |
|---|---|---|
| 57 | Lab | Lab = the shelf at `?lab` only. fxlab, introlab and the rest are workbenches. Folder names stay. |
| 58 | Port | Port: a toy moves to a new base, keeps `legacy.html` when it looks different. Adopt: a toy takes a shared module, same frame. A Bar v2 move is a port. |
| 59 | Version | Always "toy version" or "site version". Bar v2 is a name. The v1 bar is the "old bar". |
| 60 | Stage | Stage = the canvas area. "Release stage" (toys.json), "load stage" (`stage(name)`), "intro beat". No code renames. |

## Card 16: glossary II

| # | Question | Answer |
|---|---|---|
| 61 | Loop | Loop = the 5 s tube clip. "Frame loop" and "idle motion" for the others. |
| 62 | Sheet | Sheet = the Bar v2 panel. `icons/sheet.html` is "the icon sheet". |
| 63 | Motto words | Motto = `tag`/`tagNl`; tagline = the site line under the wordmark; lab tag = `sub`. Avoid "tag" alone. |
| 64 | Classic | Classic = the legacy build. The intro's `CLASSIC` is "the base beats". |

## Follow-up beans (from the answers)

Each is its own bean under epic `stimming-51dy`. Visible ones need Tom's look.


| Bean | Work |
|---|---|
| `stimming-zggq` | Shell: Bar v2 press cue without hard shadows |
| `stimming-knup` | Shell: :focus-visible ring for keyboard users |
| `stimming-wrxq` | Tools: new-toy.mjs scaffold script |
| `stimming-chp1` | Tools: Prettier and ESLint for owned files only |
| `stimming-04og` | Tools: npm test runs node tests and bar-v2 on port 8000 |
| `stimming-z9je` | Pages: skip probe, spike and workbench pages in the build |
| `stimming-im51` | Design: end the B612 heading trial as a yes |
| `stimming-byp3` | Shared: @ts-check and JSDoc on shared/ exports |
| `stimming-oqrt` | Shell: CSP meta tag on every page (draft) |
| `stimming-bp2b` | Toys: context loss and fail line on every GPU toy (draft) |
| `stimming-0cr6` | Data: drift the standards audit found |
| `stimming-iv3j` | Design: name the Creative North Star (draft) |
