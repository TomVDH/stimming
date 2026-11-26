---
# stimming-80x7
title: 'Pages: strip workbenches, internal tools, and non-public routes from prod'
status: todo
type: feature
priority: high
created_at: 2026-11-26T22:23:50Z
updated_at: 2026-11-26T22:23:50Z
parent: stimming-51dy
---

Strip or make inaccessible every non-public page, workbench, probe, spike, and internal route in the GitHub Pages prod build (.github/workflows/pages.yml) while keeping everything working locally in dev. Related: stimming-z9je.

Checklist:
- [ ] Exclude all workbenches from _site: accesslab/, barlab/, fxlab/, glasslab/, introlab/, inventorylab/, menulab/, serieslab/, icons/, tests/, docs/, tools/
- [ ] Exclude probe-*.html, spike-*.html, and dev/test fixtures inside toy folders
- [ ] Decide with Tom whether Lab toys (number: null in toys.json) stay deployable behind the celestible Lab gate or get stripped/obfuscated in prod
- [ ] Remove/disable non-public query backdoors (?dev, ?lab bypass, ?m=<parked>) in prod menu build
- [ ] Verify _site tree contains only public main-shelf pages, credits/, shared/, and required JSON/assets
