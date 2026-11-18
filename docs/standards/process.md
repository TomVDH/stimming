# Process standards

How work moves in Stimming: beans, git, QA, sign-off. Terms follow `GLOSSARY.md`. Decisions: [[stimming/decisions]].

## Who decides

- Ask Tom before anything visible, a new library, a change in `shared/` or the menu, and any move between shelves.
- Decide alone on code structure, invisible fixes and tests. Report after.
- Build only what Tom asked. A brief's examples are not his asks.
- Perfect one thing first. Never roll a change across all toys at once; Tom picks which toys get it.
- One visual change at a time: removals first, then one design ask per pass. Show it, then the next. Roll back at once when Tom says so.
- Keep what Tom approved. Before a fix, compare to the approved look and say what a swap of technique changes.

## Beans

- Run `beans prime` and follow it. Find or create a bean before work. Keep its checklist current. Commit the bean file with the code.
- One chat, one bean. The title starts with the toy or area name: `Railgun: ...`, `Menu: ...`.
- Bigger work is an epic or a feature with child tasks.
- A chat ends with its bean's checklist current and one NEXT line in the adjudant handoff.
- A bug the audit finds: one bean per toy; the fix happens in that toy's chat.

## Git

Toy chats share one checkout and one git index.

- `git pull --ff-only` first.
- Commit only through `tools/commit.sh -m "msg" [--hunks <patch>] -- <paths>`. It commits and pushes.
- Never `git add -A`, `git commit -a` or a whole-file `git add` of a shared file such as `index.html`.
- For a shared file, pass only your hunks. Build the patch from `git show HEAD:<file>` and `diff -u`. Never pass one file both as `--hunks` and after `--`.
- Exit code 3 means committed but not pushed: resolve by hand.
- `commit.sh` refuses a commit that drops lines another bean added (`--drop-ok` with a reason overrides).
- Never revert another toy's changes.
- Commit after every change, one logical change per commit. Message: `<Area>: what changed (bean-id)`. Area is a toy name, Menu, Shell, Docs or Tools.
- Toy work goes to `main`. A change to `shared/`, the menu or several toys, and any feature Tom marks, gets a worktree (`.worktrees/<bean-id>`, branch `feature/<bean-id>`) and a PR.
- A PR gets `/code-review` before merge. Direct toy commits get Tom's look.
- Check the menu script parses before you push.
- Edit a shared file only after you read it whole. Build the new text in the scratchpad, check it, then copy it in.

## QA

- Headless Playwright with GPU flags: `--enable-gpu --ignore-gpu-blocklist --use-angle=metal --enable-unsafe-webgpu`. On Windows, use `--use-angle=d3d11`.
- Every visual change: 1280 px, 375 x 812 and 812 x 375. The shell measures collisions; never trust a breakpoint alone.
- Check: script syntax (`node --check`), a clean console, every control and gesture, reduced motion, hidden tab, idle sleep, sound suspends after a gesture.
- Tests: `npm test` runs `node --test tests/*.test.mjs`, then `tests/run.sh` against the dev server on port 8000 (`stimming-04og` builds this). `tests/bar-v2.html` must pass.
- Pure logic gets a `.test.mjs`. Looks get Tom's eye.
- Show Tom screenshots early. Show a page over `http://localhost:8000/`, never a file link.
- Never leave timing holds or debug builds in a toy file. Restore only the `localStorage` keys a check changed.
- Load times: `tools/loadtime.mjs`. Railgun clouds: `npx -y -p playwright@1.63.0 node tools/clouds-check.mjs`.

## Shelves and sign-off

- New toys start in the Lab (`tools/new-toy.mjs`, bean `stimming-wrxq`). A toy reaches the main shelf only after Tom vets it.
- A move to the main shelf is one commit with: a number in `toys.json`, toy version `"1.5"`, a still, Bar v3, a menu icon in the menu language, a series.
- Before Tom signs a toy off (`data-done`), it passes: the QA checks above, the perf budget in `docs/standards/code.md`, a complete `docs/toys/<id>.md`, a fresh still and a loop if a good one exists.
- Only Tom gives `data-done`. A sign-off steps the site version (`docs/menu.md`).

## Docs

- A change that makes a doc line false fixes that line in the same commit.
- Shipped code wins over a doc on a fact.
- A standard changes only from Tom's own words, with a vault decision linked.
- Each plan in `docs/plans/` opens with `Status: active | done | dropped` and its bean.
- Prose: ASD-STE100, double density. No em dashes. Vault writes go through adjudant.

## Running and publishing

| Task | Command |
|---|---|
| Dev server | `npm run dev` (port 8000, rebuilds TypeScript toys), then <http://localhost:8000/>. `python3 -m http.server 8000` works after `npm run build`. |
| Type check | `npm run check` |
| Commit and push | `tools/commit.sh -m "<Area>: what (bean-id)" -- <paths>` |
| Stills / loops | `npx -y -p playwright@1.63.0 node tools/stills.mjs [id ...]` (same for `tools/loops.mjs`) |

- GitHub Pages deploys every push to `main` (`.github/workflows/pages.yml`) to <https://tomvdh.github.io/stimming/>.
- The claude.ai Artifact is retired. Never publish to it.
