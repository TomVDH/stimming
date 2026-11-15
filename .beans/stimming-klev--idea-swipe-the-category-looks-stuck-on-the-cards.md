---
# stimming-klev
title: 'Idea swipe: the category looks stuck on the cards'
status: completed
type: bug
created_at: 2026-11-15T09:19:02Z
updated_at: 2026-11-15T09:19:02Z
---

Tom: categories on cards do not update.

The labels were right. Batch 4 lists 40 ideas per group in a row, so one category stayed for 40 cards. The filter counts also stood still while Tom swiped.

- [x] Deal the groups in turn in each deck
- [x] A Keep in the queue counts as Tool-approved at once; both chip counts are live
- [x] The card that flies off stays above the new card
- [x] Check in the browser pane

## Summary of Changes

`docs/swipe.html`: `mix()` deals the deck one group at a time (A, B, C, D, E, F, then again). The Queue chip shows the cards left. The Tool-approved chip and filter add the new Keep verdicts to the 41 in the pool list. Undo and Reset take them back out.
