---
# stimming-hvtr
title: 'Signal bar in the shell: a second bar builder, switched on per toy'
status: todo
type: feature
created_at: 2026-11-17T08:54:07Z
updated_at: 2026-11-17T08:54:07Z
---

Tom, 2026-11-17: ten toys receive the new bar (epic stimming-a5rs). The Signal bar lives only in `barlab/` today. This bean moves it into the shell.

Hard rule 3 applies: this bean changes `shared/`. It needs Tom's yes before the first edit there.

## Shape (proposal)

- The `bar` spec does not change. A toy opts in; every other toy keeps Bar v2.
- The opt-in is one flag, in `toys.json` or in `initPage`; Tom picks.
- The builder comes from `barlab/shim.js` (the `signal` function and its parts) and `barlab/concepts.css` (the Signal block). The lab's knobs do not come along: Accent Toy, Ink Marks, Hover White box, Leaves after 8 s.
- The real intro hands over to the bar: the monogram square is the intro's flash box, cut to the top left.

## Checklist

- [ ] Tom's yes for the edit in `shared/`
- [ ] The flag and where it lives
- [ ] The builder in the shell, behind the flag; Bar v2 untouched
- [ ] `tests/bar-v2.html` still passes; a Signal test page beside it
- [ ] 1280 px, 375 x 812 and 812 x 375; a real touch screen; keyboard only
- [ ] A disabled control shows as disabled (the lab does not mirror it)
- [ ] `npm run check` passes
- [ ] `DESIGN.md` and `docs/standards/code.md` say what is true
- [ ] Cauldron first; then the other nine, one at a time
