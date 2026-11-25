---
# stimming-uxmm
title: 'Access lab: the Feedback tab overwrites the desk''s heading'
status: completed
type: bug
priority: normal
created_at: 2026-11-25T08:48:19Z
updated_at: 2026-11-25T08:48:33Z
---

The Feedback panel's header used id=title, the same id as the desk's h1. $('title') found the desk's h1, so on Feedback the heading 'Toy desk' became the toy's name and version.

- [x] Rename the panel's id to invTitle
- [x] Check in the pane: the heading stays 'Toy desk'; the panel header shows the toy
- [x] Commit and push

## Summary of Changes

The panel's header id is now invTitle. The desk's heading stays 'Toy desk' on every tab.
