---
# stimming-oldi
title: 'Railgun: the first Sight press freezes for 650 ms'
status: completed
type: bug
priority: normal
created_at: 2026-11-15T06:02:30Z
updated_at: 2026-11-15T06:18:37Z
parent: stimming-f793
---

QA, 2026-11-14. sightSetup builds the NVG Tube on the first V press. The warm-up behind the intro does not reach it.

On Windows (ANGLE D3D11) one tube program fails D3D validation twice, then compiles with skip optimization. The console shows X4000 warnings for f_sigAt, f_sigAtLod0, f_poisson_uint and f_mcp_uint (nvg/tube.js: sigAt, poisson, mcp).

Evidence (cold browser, Standard, 1280 at 2x): the worst frame round the first V press is 650 ms. A warm shader cache gives 17 ms. Sight then holds 30 fps.

## Checklist

- [x] Build the tube and compile its programs in the warm-up
- [x] Initialize the flagged variables in nvg/tube.js (the NVG toy shares it)
- [x] Check the first V press on a cold browser: no frame over 100 ms, no X4000 warnings


## Summary of Changes

- The warm-up renders one sight frame behind the intro, then clears the tube. The first V press links no programs.
- nvg/tube.js: sigAt, mcp and poisson each have one return. D3D compiles them first time, with no X4000 warnings or retries.

Checks on cold browsers (1280 at 2x, ANGLE D3D11): the worst frame on the first V press drops from 650 ms to 17 ms, on Standard and High. Sight holds 30 fps. Load and first V show no console warnings. The median time to first frame is 12.9 s against 12.3 s before (spread 11.7 to 14.0 s). The NVG toy loads clean and looks the same.
