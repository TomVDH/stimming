---
# stimming-nh74
title: 'Subway and Train ride: no first frame in headless Chromium on D3D11'
status: todo
type: bug
created_at: 2026-11-16T09:34:02Z
updated_at: 2026-11-16T09:34:02Z
parent: stimming-3s8z
---

Found during the detail() reference port (stimming-01gd), 2026-11-16.

In headless Chromium (Playwright, --use-angle=d3d11, RTX 3070), Subway never shows its first frame: compileAsync does not finish in 90 s. The old page (HEAD) and the port act the same. Train ride blocks the main thread at 12 s. With KHR_parallel_shader_compile turned off, Subway's page load stalls past 30 s.

With --use-angle=gl (the same GPU) and with SwiftShader, both are ready in about 4 s.

Questions for the toy's chat:
- Does desktop Chrome on Windows (D3D11 is its default) show the same stall?
- Is the cause the D3D shader compiler on the shared surface shader (loop unrolling)?

Probe: probe5.mjs in the session scratchpad; the harness is subway-qa.mjs in the session notes folder.
