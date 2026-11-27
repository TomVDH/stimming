---
# stimming-1i76
title: 'Fake Cash: Helena, Cheryl, and the bill selection ribbon'
status: completed
type: task
priority: normal
created_at: 2026-11-27T21:47:01Z
updated_at: 2026-11-27T22:20:07Z
---

Add the supplied front and back as a ninth custom banknote. Preserve the artwork, normalize its physical orientation, compress it, trace security masks, tune its paper material, update the toy copy, and verify the build under the 2.5 MB addition budget.

- [x] Process front and back into aligned WebP assets under 2.5 MB total
- [x] Create and inspect front/back RGB security masks
- [x] Register the ninth note and update count/help copy
- [x] Build, type-check, and syntax-check; record browser verification limits
- [x] Commit and push through tools/commit.sh

## QA notes

- New assets: 1500 x 752 WebP, 668 KB total.
- `npm run build`, `npx tsc --noEmit -p fakecash/tsconfig.json`, `node --check fakecash/dist/main.js`, and `git diff --check` pass.
- `npm run check` reaches pre-existing errors in `shared/flare.js` lines 188 (`r`, `g`, and `b` on `ArrayLike<number>`). This bean does not touch shared code.
- The local page returns HTTP 200. Awaiting Tom's visual check before commit.

Refined Helena shading: reduced foil and relief, softened mask strengths, and removed stray masked areas around the engraving.

Added Cheryl Cinnamorolls as the tenth note: portrait front, illustrated back, subtle seal masks, and 776 KB of assets. Build and toy type-check pass; visual review remains open.

## Bill tray

- Added a Fake Cash ribbon based on Star Chart: a soft glass band, note previews, selection frames, paging arrows, keyboard navigation, and the All bills choice.
- The toy build and TypeScript check pass. Visual and interaction checks in the in-app browser remain open.

Tray revision from Tom: rotate note previews vertically and restore the original colored SVG currency glyph beneath each preview. Reuse glyphIcon and ALL_ICON from the previous menu. Build, toy type-check, and syntax checks pass.

## Summary of Changes

- Added Helena Pesetas and Cheryl Cinnamorolls with compressed faces and masks.
- Added a bill ribbon with vertical previews and original currency glyphs.
- Adapted Star Chart's spring scrolling, edge fades, and late mounting.
- Passed build, toy type-check, bundle syntax, and menu syntax checks.
- Browser verification remains unavailable. Tom requested commit and push.

NEXT: Check the published bill ribbon in the in-app browser.
