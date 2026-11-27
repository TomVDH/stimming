---
# stimming-k6qn
title: 'Star Chart: normalize choir volume for all bodies'
status: completed
type: task
priority: normal
created_at: 2026-11-26T19:16:33Z
updated_at: 2026-11-26T21:57:24Z
parent: stimming-e35i
---

Normalize choir, tap, and glow loudness (NORM, TAPNORM, GLOWNORM) across all 51 Star Chart bodies, replacing unmeasured relative fallbacks and stale copy-overs on the newer additions.

- [x] Build and validate offline K-weighted (ITU-R BS.1770) measurement harness against the 25 previously measured bodies
- [x] Measure NORM, TAPNORM, and GLOWNORM for all 51 bodies
- [x] Update starchart/choir.js with measured tables and remove stale/fallback assignments
- [x] Fix article card Wikipedia link bottom gradient overlap and clickability (starchart/article.css, starchart/article.js)
- [x] Zoom out quarter camera preset (long lens) so the pole and curved limb arc sit clearly in view (starchart/main.js)
- [x] Update docs/toys/starchart.md to match
- [x] Add unit test and run syntax/test checks

## Summary of Changes

- Measured K-weighted (ITU-R BS.1770) choir loudness, tap loudness, and glow room lift across all 51 Star Chart bodies after validating the offline Web Audio harness against the 25 original bodies (matching within 0.00-0.41 dB).
- Replaced stale pre-from() copy-overs and fallback levels in starchart/choir.js with explicit measured NORM, TAPNORM, and GLOWNORM entries for all 51 bodies (fixing up to +19.95 dB excess loudness on Einstein Cross, +12.18 dB on MoM-z14, +11.3 dB on UHZ1 and Earendel, +9.6 dB on V838 Monocerotis, +7.2 dB on Mothra, +6.4 dB on Eta Carinae, +6.3 dB on WOH G64, +6.1 dB on VFTS 352, etc.).
- Fixed the article card Wikipedia link in starchart/article.css and starchart/article.js: raised .sl-art z-index to 5, increased .a-body padding (14px top / 32px bottom) to clear the fade mask, cleared edge fades dynamically when scrolled to top/bottom (.is-top / .is-end), and enlarged the .a-src a hit target.
- Zoomed out the quarter camera preset (fit.long / fit.longH) in starchart/main.js (hwL 225/315/420, d factor 0.32) so the pole and limb curve sit cleanly in view across all objects.
- Updated docs/toys/starchart.md and added tests/starchart-choir.test.mjs.
