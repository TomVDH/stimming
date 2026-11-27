---
# stimming-jfwe
title: Release readiness standard
status: completed
type: task
priority: normal
created_at: 2026-11-17T01:52:44Z
updated_at: 2026-11-17T04:53:32Z
parent: stimming-3s8z
---

One checklist a toy passes before Tom gives it the approved label. Built from existing rules. Audit of the 52 main-shelf toys against it, and a per-toy question sheet for Tom on bar contents and attributions.

Doc: docs/plans/release-ready.md

## Checklist
- [x] Write the standard (docs/plans/release-ready.md)
- [x] New-toys section (the ~20 toys still to come)
- [x] Commit the standard
- [x] Audit the 52 main-shelf toys: one table, read from code and docs
- [x] Question sheet per toy: bar today, open questions, attribution unknowns
- [x] Commit the audit
- [x] Ask Tom the first batch; write answers with the date
- [x] Commit each batch of answers

## Summary of Changes

- `docs/plans/release-ready.md`: the 15-item release-readiness standard, each item cited to its source rule; a new-toys section; the audit of the 52 main-shelf toys; findings across the shelf; the question sheet; Tom's answers in 14 dated batches (all answered on 2026-11-16).
- Toy doc template gains a Stack type row and an Attributions section (`docs/toys/_template.md`, `docs/plans/toy-docs.md`).
- Raw audit notes: `docs/qa/release-ready/notes-2026-11-16.md`.
- From Tom's answers: the approved label is version 2.0; Cauldron joins the 0.186.1 WebGPU list; ZzFX 1.3.2 joins the library table (Fireworks only); the Kaleidoscope zoom item is closed (`AGENTS.md`, `docs/stack.md`, `docs/code-health.md`).
- TV tree's interactivity rethink ran in its own session (bean `stimming-idee`).

The per-toy work (bar changes, ports, attributions, runtime QA, sign-off) happens one toy at a time in each toy's own chat.
