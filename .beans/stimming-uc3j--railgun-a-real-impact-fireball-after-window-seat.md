---
# stimming-uc3j
title: 'Railgun: a real impact fireball, after Window Seat'
status: completed
type: task
priority: normal
created_at: 2026-11-10T23:10:20Z
updated_at: 2026-11-10T23:30:16Z
parent: stimming-f793
---

Give the railgun's impact a real fireball, after the Window Seat impact, and collect the impact's other missed chances.

## What we have now

- `fireball` (`makeVol`, about line 4062) is one volume for fire and soot.
- Fire: `T = exp(-age/5) * core + 0.8 * exp(-age/0.6)`. Most of it is gone in about a second.
- The soot is dense from the start and swells to 12 R. It hides the fire, so the blast reads as a grey ball.
- Light: `blastAt()` and `uBk` use the flash envelope plus a short glow tail.

## What Window Seat does (`window/index.html`, `capAt`, `jetUniforms`)

- One incandescent ball, separate from the smoke: `uBall`, `uBallC`, `uBallS`.
- It grows with `R = 20 (1 - exp(-u/4))` and rises as it grows.
- Colour cools from white to yellow to deep orange over 8 s.
- Glow: `0.9 exp(-u/8) + 0.12 exp(-u/40)`. A strong glow for about 8 s, then a faint tail for about 40 s.
- The ball lights the smoke column from inside (`twC`, low in the stem).

## Plan

- [x] Fire core: a separate emissive phase in the `fireball` volume. Low soot opacity for the first 3 to 6 s, so the fire shows. Turbulent, self-lit, about 3 to 4 R.
- [x] Blackbody cooling: white, yellow, orange, deep red, with the Window Seat envelope (8 s strong, 40 s tail).
- [x] Soot rolls over the fire: the soot forms as a growing outer skin. Fire pockets glow through the gaps as it tears.
- [x] Rise: the fire core rises and rolls into a buoyant ring as it cools.
- [x] Inner glow: the soot is lit orange from inside for about 15 s and fades with the fire tail (`vlight`).
- [x] A soft glow globe round the fire: one `flare()`, sized by the fire radius, fading with the 8 s envelope. It lights the air, not a bloom halo.
- [x] Scene light: the `uBk` tail follows the fire envelope, so the plain, the gun and the clouds glow as long as the fire does.
- [x] Bloom stays only on the fire, not on the lit soot or the clouds.

## Other missed chances to weigh

- Secondary bursts: two or three late flashes inside the cloud as big pieces break.
- Burning fragment rain from the cloud's underside for the first 10 s.
- A heat shimmer above the fireball while it burns.
- A deep, late rumble and crackle that track the fire's life.

## Verify

Headless stills at hit +0.3, 1, 3, 6, 10, 20 and 30 s, at dusk and at night. Tom judges it live on localhost:8077.
- [x] Redo: the fire is a sphere that blows outward to 8 R in about 2 s, with hot and cool cells and soot veins; burning embers jet out in sprays and arc down; trail embers lose their halo
- [x] Negative phase: the fire sphere pulls in by a fifth from 2 to 5 s, then eases back a little
- [x] Trail fade starts 2.5 s after the hit and keeps pace: density falls by e every 6 s, erosion opens it; gone by about 45 s
- [x] Debris and burning pieces carry the rock's own path on, at nearly one speed, with a small fan
- [x] Continuity: the impact cloud eats only the last fifth of the main trail; the four debris trains reach back to the burst and stay full there while the main trail lives, so the trail splits into them
- [x] Pacing: trail density falls by e every 10 s from 2.5 s, gone by about 90 s; the soot cloud lasts to 38 s
- [x] Layering: shards draw after the soot and fade by the soot ball's cover, so near pieces stay in front; debris trains draw after the main trail
