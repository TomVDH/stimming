---
# stimming-m1el
title: 'Menu: promote Signal Dial to prod and park legacy displays'
status: completed
type: feature
priority: high
created_at: 2026-11-26T22:23:50Z
updated_at: 2026-11-26T22:55:00Z
parent: stimming-io49
---

Promote the approved Signal Dial menu from menulab/signal.html to become the production main menu in index.html + shared/menu/, and park/wire out all unused legacy menu displays.

Checklist:
- [x] Port Signal Dial (top-left fidget Stimming + tagline + OKLCH mesh, top-right Re-roll [R] / All Toys, balanced Dial + unblurred WebGL2 CRT + frosted center readout with tiny faded hardware badges above consistent no-shadow title + bare Bar v3 Play button, bottom Copyleft GPL-3.0 / AI / Attributions + stacked onnøzelaer chip + crisp convex OKLab rainbow cloud, full-viewport All Toys page + floating dark blurred transparent-gradient header + horizontal Series coming soon + monochrome Signal flash Lab password gate over crusty CRT grain) into index.html & shared/menu/ (`dial.js`, `dial.css`)
- [x] Add smooth standby fade-to-black with gentle central CRT grain when nothing is selected (on load, Re-roll, pointer leave, or 15 s idle)
- [x] Park and wire out unused legacy menu displays (legacy Clock/Dozen/Drum files unlinked from `index.html`; parked menulab layouts omitted from `dial.js`)
- [x] Promote reworked top-down Harmonograph icon + multi-tone luminosity emblem (`shared/emblems/harmono.svg`) and reworked glossy Ebru Marbling icon + luminosity emblem (`shared/emblems/marble.svg`)
- [x] Sync `shared/intro.css` faded hardware badges with the Dial center readout
- [x] Land `toys.json` sound-flag, quip, and `postcard` tech updates, refresh share cards + `shared/cards/main.jpg` + `og:*` tags, and sync `docs/menu.md`, `shared/AGENTS.md`, and `menulab/AGENTS.md`
- [x] Tom's live sign-off on <http://localhost:8000/> and commit/push via `tools/commit.sh` as Stimming v1.0
