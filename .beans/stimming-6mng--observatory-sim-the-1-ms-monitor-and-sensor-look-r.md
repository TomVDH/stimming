---
# stimming-6mng
title: 'Observatory sim: the 1 m''s monitor and sensor look real'
status: todo
type: task
created_at: 2026-11-23T23:34:22Z
updated_at: 2026-11-23T23:34:22Z
parent: stimming-wqq9
blocking:
    - stimming-27uv
---

Tom, 2026-11-23: noise, screen effects and artefacts as real as they can be. Sensor: bias pattern, read noise, hot and dead pixels, amp glow, cosmic-ray hits, saturation bleed columns, row banding. Screen: LCD subpixels close up, backlight bleed, gamma, refresh. References first.

## Checklist

- [x] Bleed columns from overfull stars: length from the spare charge, width from the overfull core, the whole sensor for a star like Capella (main.ts build, stack.frag.glsl u_bleeds)
- [x] Cosmic-ray hits: dots and short worms, about 0.25 a second over the sensor
- [x] Fixed column offsets, one warm column, faint row stripes that change each exposure
- [x] Vignetting and three dust rings on the filter (flat field)
- [x] Hot pixels, dark current and amp glow (were there)
- [x] The monitor: patchy backlight, IPS corner glow on dark areas, LCD subpixel stripes when the panel is seen up close
- [x] A [Flaws?] label on the log explains each flaw in plain words
- [ ] Calibration: dark and flat frames that remove the flaws, as real software does
- [ ] Tom looks at it
