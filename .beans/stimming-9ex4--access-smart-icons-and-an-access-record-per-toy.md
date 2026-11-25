---
# stimming-9ex4
title: 'Access: smart icons and an access record per toy'
status: completed
type: spike
priority: normal
created_at: 2026-11-25T05:21:26Z
updated_at: 2026-11-25T07:25:01Z
---

Tom, 2026-11-24: "we also need a system of smart icons and accessibility ... we want epilepsy, motor and accessibility issues -- colorsym can be useful here".

Question: which glyphs flag a toy's access issues, what record holds them, and how the shell uses them.

- [x] Read standards, shell, intro
- [x] Research ColorSym: licence, glyph set, use
- [x] Glyph workbench: accesslab/index.html (noindex), intro and tile sizes, dark ground
- [x] Tom's round 1: sleeker hairline glyphs in the Bar v3 idiom, left-aligned layout
- [x] Audit ten toys: WCAG 2.3.1 flashes, motor flags
- [x] Plan: docs/plans/access.md with a status line
- [x] Player: the real intro with the access row, gate, Calm, every variety, List / Line / Rail
- [x] ColorSym from any colour: hue picks the mark; the Colour flag names the toy's colours
- [x] Merge the old intro lab's knobs (Layout, Type, Box, Glass, Timing, Static, slow load) into accesslab
- [x] Votes: Keep and Cut words, cut asks first, Undo toast; menu in four groups; duplicate mocks out
- [x] Feedback: the inventory record inline per toy, shared drafts with inventorylab; strip filter; unlisted toys via tools/hubdata.mjs
- [x] Current tile glitch: the menu frame lays out at desktop width
- [x] Desk: index.html as a template (desk.js core, desk.config.js, panels/icons, feedback, intro), YAML per toy and export all, TEMPLATE.md; access kit moved to access.html
- [x] Feedback panel: all of inventorylab ported (toy, builds, stack, logos, full form, meta, modularize, save file, export, clear, states, Alt+J/K, overview)
- [x] Ask Tom: retire inventorylab/? Tom, 2026-11-24: keep it for now. Both pages share stimming.inventory.<id>, so either continues the other.
- [x] Type: the desk's intro trials Tom's pairing (title Iosevka; subtitle and text B612; Knobs Type new/shipped). accesslab/type.html trials the wordmark in Iosevka vs B612 at full fidelity: the menu title's GSAP fidgets word for word, the header's stim-wave keyframes copied from shared/stim.css. The shell change goes to the intro-layout session (told).
- [x] Still from introlab: font slots, timeline, phase pauses, Copy table, audio notice words, number place: moved to stimming-b1si
- [x] Tech tags: tools/techtags.mjs (dry run), tags in accesslab, plan section 6
- [x] Hub: section bar; Icons laid out natively per toy from the sheet's data (rounds, picks, emblems, shared keep/cut), with access glyphs, tech tags, Play intro
- [x] Tom sees the workbench and the plan
- [x] Tom's yes on ColorSym use, then a CREDITS.md row: moved to stimming-jkji

No edit to toys.json, shared/, index.html or a toy in this spike.


## Commit

Waits for the main/origin split (local main 11 ahead, 108 behind; the Gas giant owner or Tom sorts it). Tom, 2026-11-24: commit after the split.
Files to commit: accesslab/ (index.html, access.html, desk.js, desk.css, desk.config.js, yaml.js, glyphs.js, access-data.js, hub.json, panels/, TEMPLATE.md, AGENTS.md), tools/techtags.mjs, tools/hubdata.mjs, docs/plans/access.md, this bean. AGENTS.md workbench row gains accesslab/ in the same commit.


## Summary of Changes

- Smart icons: seven hairline access glyphs in the Bar v3 How to play idiom (flashing, fast taps, long hold, precise drag, colour, strong motion, sound), tech tags as a quieter family (DOM, 2D, GL, 3D, GPU; outline supports, filled runs now).
- Data: a per-toy access record (docs/plans/access.md), an audit of ten toys (Fireworks, Plasma and Railgun can strobe), tools/techtags.mjs and tools/hubdata.mjs derive tech tags and unlisted toys from the code.
- ColorSym: open source confirmed (symbols CC BY-SA 4.0, font OFL 1.1); a hue-to-mark mapping; redrawn symbols wait for Tom's yes (stimming-jkji).
- The toy desk (accesslab/index.html): one toy at a time with Icon (every round live, Keep / Cut with confirm and Undo, the sheet's vote keys), Feedback (all of inventorylab, ported) and Intro (the real intro inline: gate, Calm, Hold, varieties, knobs, alignment, icon colour, access row with its Signal flash, tech tags in the corner) and a YAML per toy, Export all.
- A template: desk.js core, desk.config.js, panels/, TEMPLATE.md. The access kit (access.html) and type trials (type.html) beside it.
- Follow-ups: stimming-jkji (ColorSym credits), stimming-b1si (desk leftovers), stimming-849j (build steps).
