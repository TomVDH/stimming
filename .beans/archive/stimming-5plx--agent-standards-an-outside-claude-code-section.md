---
# stimming-5plx
title: 'Agent standards: an Outside Claude Code section'
status: completed
type: chore
priority: normal
created_at: 2026-11-27T06:56:49Z
updated_at: 2026-11-27T06:57:40Z
---

docs/standards/agents.md lists Claude-only skills and hooks with no fallback. Add a short section naming the Claude-only pieces (ADJUDANT import, adjudant-code.md auto-load, hookify hooks, plugin skills, vault writes) and the fallback for each. Tom: fix that real quick, author as kimi.

- [x] Add the Outside Claude Code section
- [x] Commit doc and bean via tools/commit.sh --no-push

## Summary of Changes

Added an "Outside Claude Code" section to docs/standards/agents.md: a five-row table naming the Claude-only pieces (ADJUDANT.md import, adjudant-code.md auto-load, hookify hooks, plugin skills, vault writes) and the fallback for each. Committed as f834f4d6 with --no-push so the two unpushed commits from other sessions stay local.
