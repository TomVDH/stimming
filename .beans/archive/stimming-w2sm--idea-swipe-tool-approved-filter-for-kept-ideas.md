---
# stimming-w2sm
title: 'Idea swipe: Tool-approved filter for kept ideas'
status: completed
type: task
priority: normal
created_at: 2026-11-15T09:13:25Z
updated_at: 2026-11-15T09:14:29Z
---

Tom's Keep verdicts leave the main queue. The pool lists them under Tool-approved; the swipe page shows them under a filter of that name.

- [x] Add the Tool-approved list to docs/toy-ideas.md
- [x] Add the filter to docs/swipe.html
- [x] Check in the browser pane
- [x] Commit

## Summary of Changes

`docs/toy-ideas.md` has a `## Tool-approved` list: 41 kept ideas by group, with their numbers. Each idea stays in its table. Iodine clock (42) is not on it: its Keep came from a test key, and it is one half of Bench.

`docs/swipe.html` reads that list. Two filter chips sit above the deck: Queue (205) and Tool-approved (41). Each filter has its own verdicts and undo history; Reset clears the open one. The JSON names its filter. Saved progress from the first build moves to the queue set; verdicts on ideas that left the queue drop out.

Next round: add new Keep numbers to the Tool-approved list and cut the Can rows.
