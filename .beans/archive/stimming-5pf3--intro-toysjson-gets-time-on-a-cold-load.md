---
# stimming-5pf3
title: 'Intro: toys.json gets time on a cold load'
status: completed
type: bug
created_at: 2026-11-25T08:51:17Z
updated_at: 2026-11-25T08:51:17Z
---

Tom's yes, 2026-11-25. The shared intro races toys.json against 1.5 s. On a cold load of a heavy toy (Star Chart) the fetch lands late, so the intro falls back to the page's static text: no Dutch name, no emblem.

- [x] Start the toys.json fetch when intro.js loads
- [x] Raise the race to 5 s
- [x] Check Star Chart and one light toy
