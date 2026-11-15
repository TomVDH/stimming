---
# stimming-oi3i
title: 'Railgun: sight down the barrel, ancient high-tech optic'
status: completed
type: task
priority: normal
created_at: 2026-11-12T08:08:54Z
updated_at: 2026-11-12T08:18:44Z
parent: stimming-f793
---

Tom (2026-11-12): the sight is the gun's rangefinder. It aims down the barrel and does not track the projectile. A little less zoomed in. The UI reads as ancient high tech.

- [x] Sight camera: eye on the rangefinder optic, looking along the bore; follows traverse, elevation and recoil; no tracking, no zoom
- [x] Wider lens: 22 degrees (was 12 down to 1.4)
- [x] Optic, first pass (green phosphor, seven-segment readouts, tapes): Tom: gaudy sci-fi, not ancient. Dropped
- [x] Optic, period glass: round eyepiece, warm aged coatings, rim fringes; etched black chevron with lead marks and posts; split-image coincidence prism whose top half slides into line as the range is taken; a lamp-lit range scale in km under an index; dust on the reticle; a red ready lamp on the housing
- [x] QA: stills at 1280 x 800, 375 x 812, 812 x 375; clean console; free aim turns the view with the gun

## Summary of Changes

- The sight camera sits on the rangefinder's right lens and looks along the bore (`barrelPt`), at a fixed 22 degrees (portrait x 1.6). It turns and climbs with the gun and recoils with the housing; it never follows the bolt.
- The grade's sight block is period glass: a round eyepiece, warm aged coatings, rim fringes; an etched black chevron with lead marks and posts; a split-image coincidence prism; a lamp-lit km scale (`makeScale`, a canvas strip); dust on the reticle; a red ready lamp lit at full charge.
- `sightMark` takes the range by hand with a 0.45 s lag; the prism's split shows the range error, so the halves slide into line on each look.
- Commit b55cba4 also carries stimming-wsjx hunks (aim ramp, idle return to the lay, recoil dip) that sat in the working tree when the patch was cut. The page loads clean with them.
