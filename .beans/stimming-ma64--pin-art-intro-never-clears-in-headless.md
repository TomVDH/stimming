---
# stimming-ma64
title: Pin art intro never clears in headless
status: todo
type: bug
priority: normal
created_at: 2026-11-04T12:00:00Z
updated_at: 2026-11-04T12:00:00Z
---

In headless Chromium, the Pin art intro (`pins/`) stays on screen. After 12 s and more, `.intro` is still `intro is-live`. In the same setup, Pop field's intro clears at about 7.5 s.

## Evidence

- `pins/index.html` builds `ready` the same way `pop/index.html` does: the window `load` event plus `document.fonts.ready`.
- After 6 s, `readyState` is `complete` and `document.fonts.status` is `loaded`. There are no page errors and no failed requests, so `ready` has resolved.
- The console warns `KHR_parallel_shader_compile extension not supported` and repeats `GPU stall due to ReadPixels`. Pins reads pixels back each frame; that may starve the intro's timing.

## Checklist

- [ ] Find which await in `intro()` (`shared/intro.js`) never resolves on Pins. Use a temporary probe only.
- [ ] Test in real Chrome on macOS and in Safari. If the hang occurs only in headless, record that and close.
- [ ] If real browsers hang too, make the smallest fix. Keep every other toy's intro unchanged.
- [ ] QA: the intro clears on Pins and still clears on Pop field; screenshots at 1280 and 375 px; clean console.
