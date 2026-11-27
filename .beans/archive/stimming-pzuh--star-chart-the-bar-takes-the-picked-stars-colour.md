---
# stimming-pzuh
title: 'Star Chart: the bar takes the picked star''s colour'
status: completed
type: task
priority: normal
created_at: 2026-11-25T08:25:55Z
updated_at: 2026-11-25T08:30:14Z
parent: stimming-e35i
---

The Signal bar's accent (--acc-*) on the Star Chart layer follows the selected star's colour, tinted, eased over the star switch; reduced motion sets it at once. Star Chart code only; shared/ untouched.

- [x] Set the accent from starchart/main.js on each star pick
- [x] Ease it with the switch; no ease under reduced motion
- [x] Keep 4.5:1 text on held picks
- [x] Check a few stars in the in-app pane
- [x] Tom sees it
- [x] Doc line in docs/toys/starchart.md
- [x] Commit and push

## Summary of Changes

main.js sets --sc-acc and the bar's --acc-* on the Signal layer on each pick and each bar draw (stim:bar). chart.css registers --sc-acc, eases it over 3 s, and tints .sg-bar words half with white. Reduced motion: no ease. No shared/ change.
