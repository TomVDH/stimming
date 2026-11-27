---
# stimming-115w
title: 'Toy inventory: form page and records'
status: completed
type: task
priority: normal
created_at: 2026-11-18T01:53:17Z
updated_at: 2026-11-18T01:55:57Z
---

A workbench (inventorylab/) to record Tom's per-toy verdicts in one JSON format (docs/inventory/<id>.json), and a collate tool for the master improvement plan.

- [x] Schema doc (docs/inventory/schema.md)
- [x] Form page (inventorylab/index.html)
- [x] Collate tool (tools/inventory.mjs)
- [x] AGENTS.md rows
- [x] Browser check

## Summary of Changes

- inventorylab/: toy list left; the toy in a frame on top; the form under it. Autosave to localStorage; Save writes docs/inventory/<id>.json (File System Access) or downloads it.
- docs/inventory/schema.md: schema 1, seven areas, findings by severity, expansions by size, one verdict.
- tools/inventory.mjs: checks the records and writes docs/inventory.json, worst verdict first.
