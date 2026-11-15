---
# stimming-f32n
title: 'Bismuth: a held press queues one extra frame callback per frame'
status: todo
type: bug
priority: low
created_at: 2026-11-15T19:03:58Z
updated_at: 2026-11-15T19:03:58Z
---

Found by the gl.js port harness (stimming-x1q5), 2026-11-15. Not fixed there: the port changes no behaviour.

While the ratchet runs, frame() sets raf = 0, then ratchetStep() calls poke(). poke() sees raf === 0 and calls wake(), which queues a frame. The finally block then queues a second one. Each held frame adds one more callback. The extras reschedule themselves until the 60 s sleep.

The extras skip the draw (now - lastDraw < 31), so the cost is JS calls, not GPU work. A clock where performance.now() equals the frame timestamp makes every extra callback draw, and the count doubles each frame: the harness crashed the tab that way.

Fix idea: in poke(), skip wake() while frame() runs, or let frame() own the reschedule.

## Todo

- [ ] Fix in Bismuth's own chat, with a frame-count check
