---
# stimming-oldi
title: 'Railgun: the first Sight press freezes for 650 ms'
status: todo
type: bug
created_at: 2026-11-15T06:02:30Z
updated_at: 2026-11-15T06:02:30Z
parent: stimming-f793
---

QA, 2026-11-14. sightSetup builds the NVG Tube on the first V press. The warm-up behind the intro does not reach it.

On Windows (ANGLE D3D11) one tube program fails D3D validation twice, then compiles with skip optimization. The console shows X4000 warnings for f_sigAt, f_sigAtLod0, f_poisson_uint and f_mcp_uint (nvg/tube.js: sigAt, poisson, mcp).

Evidence (cold browser, Standard, 1280 at 2x): the worst frame round the first V press is 650 ms. A warm shader cache gives 17 ms. Sight then holds 30 fps.

## Checklist

- [ ] Build the tube and compile its programs in the warm-up
- [ ] Initialize the flagged variables in nvg/tube.js (the NVG toy shares it)
- [ ] Check the first V press on a cold browser: no frame over 100 ms, no X4000 warnings
