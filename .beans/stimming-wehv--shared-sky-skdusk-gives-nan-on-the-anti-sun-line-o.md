---
# stimming-wehv
title: 'Shared sky: skDusk() gives NaN on the anti-sun line on NVIDIA'
status: draft
type: bug
created_at: 2026-11-22T18:46:18Z
updated_at: 2026-11-22T18:46:18Z
---

`skDusk()` in `shared/sky.js` computes `pow(0.5 + 0.5 * az, 3.0)`.
At rounding, `az` goes just below -1, so the base is negative.
On NVIDIA (GL and D3D11), `pow()` of a negative base is NaN.
Bloom turns each NaN pixel into a flare on the line opposite the sun.

Found in Car wash (stimming-4uc8). Ten toys import `shared/sky.js`.

Fix: `pow(max(0.5 + 0.5 * az, 0.0), 3.0)`. No visible change where the base is positive.

Rule 3: a change in `shared/` needs Tom's yes before the edit.

- [ ] Tom says yes
- [ ] Guard the base in `skDusk()`
- [ ] Check Car wash: the flare dot in the shot's sky goes
- [ ] Commit through `tools/commit.sh`
