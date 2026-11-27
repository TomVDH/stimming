---
# stimming-7hqo
title: 'Rain on glass: rainfall follows Tom''s reference model'
status: completed
type: task
priority: normal
created_at: 2026-11-03T20:41:12Z
updated_at: 2026-11-03T20:44:22Z
parent: stimming-848s
---

Tom pasted a standalone Rain on Glass page and asked for its rainfall.

- [x] New drops land with momentum; bursts and linear braking as in the reference
- [x] Merges pass on speed (cap 40 px per frame) and jog the drop sideways; no random wander
- [x] Trail spacing shrinks with speed and size
- [x] Mist lands mostly in tight clusters of four to eight
- [x] Fast drops hop in short steps, so they clear their lane and meet every drop
- [x] Weather rates retuned around the reference's default
- [x] QA at 1280 and 375 with a clean console; screenshots for Tom
- [x] Commit through a private index and push

## Summary of Changes

The rainfall follows the rules of Tom's pasted reference, in its units. RK converts radii, because our drop shows 0.41 of its radius and the model's shows 0.3. Our fog, wiping, sound and renderer stay.

- New drops land with momentum. Bursts scale with size; braking is linear, so fast drops keep racing. Speed caps at 40 px per frame.
- Merges pass on speed and jog the drop toward what it swallows. The random wander is gone.
- Trail spacing shrinks with speed and size. Trail drops stretch with speed.
- 80% of mist lands in clusters of four to eight specks.
- Fast drops hop in short steps, so they clear their lane and meet every drop. The reference does not do this.
- Weather rates: Drizzle 10, Rain 30 (near the reference default), Storm 72 drops per second.
- Mist stays far below the reference rate of 7200 specks per second. Our mist dries over time, and the glass keeps its fog.

Headless QA: 60 fps at 1280 and 375 in Rain and Storm; clean console; wipe works.
