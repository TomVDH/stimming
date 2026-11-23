---
# stimming-3l13
title: 'Shell: skDusk() returns NaN at the anti-sun direction'
status: scrapped
type: bug
created_at: 2026-11-22T20:08:35Z
updated_at: 2026-11-22T20:08:35Z
---

shared/sky.js skDusk() computes pow(0.5 + 0.5 * az, 3.0). At the direction opposite the sun, az rounds below -1 on some compilers, the base goes negative, and pow returns NaN. Tornado alley's wheat reads hazeCol(-sunD) and turns black (seen on headless Chromium ANGLE GL, build 1248; main was black on another build). Fix: clamp the base at 0. Valid inputs give the same value. Tom's yes: 2026-11-22.

- [x] Clamp the base in skDusk()
- [x] Tornado alley's wheat renders on headless ANGLE GL: the frame matches main again
- [ ] Commit with the bean

## Reasons for Scrapping

The same fix landed on main first: 795e3992, bean stimming-wehv (the car-wash session). This branch now carries main's line exactly, so the PR merges clean.
