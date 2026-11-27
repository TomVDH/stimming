---
# stimming-lr84
title: 'Commit helper: tools/commit.sh for shared-checkout commits'
status: completed
type: task
priority: normal
created_at: 2026-11-08T17:27:33Z
updated_at: 2026-11-08T17:30:19Z
---

Parallel toy sessions in one checkout overwrite each other's commits to shared files (cd6b035, d1944a2). Build tools/commit.sh: lock, private index from HEAD, compare-and-swap ref update, push with rebuild on rejection.

- [x] Write tools/commit.sh
- [x] Test two shells committing different files at once
- [x] Test two sessions committing different hunks of index.html
- [x] Point AGENTS.md Process at the script
- [x] Save memory note
- [x] Commit and push through the script

## Summary of Changes

tools/commit.sh commits whole paths or patch hunks through a private index under .git/stim-commit.lock. It moves the branch by compare-and-swap, syncs the shared index for its paths, and pushes. On a rejected push it fetches and replays local commits with git replay. Tested: concurrent commits to different files, different hunks of index.html, six at once, a raw commit during the build, a remote ahead, a stale lock.
