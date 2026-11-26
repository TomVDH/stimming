---
# stimming-e00e
title: 'Fake Cash: integrate Peter Canadian polymer note and push'
status: completed
type: task
created_at: 2026-11-26T21:48:54Z
updated_at: 2026-11-26T21:52:00Z
---

Add 8th banknote: Peter Canadian Dollars (Peter Pesos polymer note).
- [x] Convert and compress peter-front.webp and peter-back.webp (1500x762)
- [x] Trace pixel-exact RGB security/glyph/foil masks (peter-front-mask.webp, peter-back-mask.webp) and visually verify macro crops
- [x] Register Peter in fakecash/src/bills.ts, update copy (8 designs) in index.html and main.ts, build and type-check
- [x] Commit and push to main via tools/commit.sh

## Summary of Changes
- Added `fakecash/bills/peter-front.webp` and `fakecash/bills/peter-back.webp` (1500x762 WebP).
- Generated and visually verified traced RGB security masks `fakecash/bills/peter-front-mask.webp` and `fakecash/bills/peter-back-mask.webp` (wavy silver polymer strip and upper-left frosted maple leaf in `R`, floating drone, portrait, and Pumpkin-Peter medallion foil in `G`, four `50` glyphs and `PETER PESOS` lettering in `B`).
- Registered `peter` (`$50 CAD`, polymer substrate) in `fakecash/src/bills.ts`, updated bill count copy to eight in `fakecash/index.html` and `fakecash/src/main.ts`, and bumped the bundle cache-buster to `?v=11`.
- Verified `npx tsc --noEmit -p fakecash/tsconfig.json`, `npm run build`, and `node --check fakecash/dist/main.js`.
