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
- [x] A disabled control shows at 40% and takes no input (built; no toy in the ten disables one, so it is not seen in use)
- [x] The site's type check passes (`tsc --noEmit -p tsconfig.json`). `npm run check` itself fails on Windows: its script is bash
- [x] `docs/plans/bar-v3.md` (the spec), `shared/AGENTS.md` and `DESIGN.md` say what is true
- [ ] `/code-review` before the merge (rule in `shared/AGENTS.md`)
- [ ] The lab keeps its own copy of the builder; one source is still to do
- [ ] `shared/signal.js` is not strict-clean: 94 findings under Railgun's tsconfig, most of them untyped parameters. `stim.js` builds the module's address at run time so that check passes; typing the module is still to do
- [x] Train ride and Railgun are on Bar v3 (2026-11-17)
- [x] Cauldron first: `signal: true` in `cauldron/index.html`
- [ ] The other nine, one at a time, each in its own bean
