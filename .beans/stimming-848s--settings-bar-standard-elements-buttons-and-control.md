---
# stimming-848s
title: 'Settings bar standard: elements, buttons and controls'
status: scrapped
type: feature
priority: normal
created_at: 2026-11-03T09:55:39Z
updated_at: 2026-11-09T07:04:21Z
parent: stimming-avdk
---

Write one standard for the settings bar so every toy builds it the same way, then bring the toys onto it.

## The bar, left to right
1. **Primary picker**: what the toy is about. Either segmented choice chips (`choices()`), a pill picker (‹ icon name ›, as Morpher), or an **Add** tray button (as Prism, Galaxy).
2. **Options**: cycling chips whose label shows the state (Light: White, Look: Solid). `aria-label` reads "Name: state".
3. **Settings** tray (gear icon) for anything past the visible budget: secondary toggles, quality, view.
4. **Actions**: the shared verbs only: Clear, Reset, Shuffle. Disabled (`aria-disabled`) when they would do nothing.
5. **(i) how-to tip**: far right, added by the shell. Never a visible key line.

## Rules
- At most five visible controls; a tray counts as one.
- Element types and only these: text chip, icon chip (16px SVG, 1.5 stroke), toggle chip (`aria-pressed`), cycling chip, tray button (popover above the bar; hover opens on fine pointers, tap toggles, closes on pick, outside tap or Escape), slider (only when it is the toy's main control).
- Inset bar: no band behind it; each control carries its own dark frosted backing (shell CSS).
- Hit target at least 32px; keyboard focus visible; every control reachable by Tab.
- Choices persist in `localStorage` under `stimming.<id>.<key>`.
- Keys and gestures live only in the (i) tip, at most four entries, using the shell mouse glyphs.

## Checklist
- [ ] Add `tray()` and `cycle()` helpers to `shared/stim.js` so toys stop hand-rolling trays and cycling chips
- [ ] Shared CSS for tray popovers (one look for Add, Settings and tool trays)
- [ ] Write the standard into AGENTS.md Conventions
- [ ] Brief toy sessions; each toy session audits its bar against it
- [ ] Main shelf toys pass the audit

## Reasons for Scrapping

Superseded by Bar v2 (stimming-tbpn).
