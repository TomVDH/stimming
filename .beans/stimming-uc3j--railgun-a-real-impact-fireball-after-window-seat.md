---
# stimming-uc3j
title: 'Railgun: a real impact fireball, after Window Seat'
status: todo
type: task
created_at: 2026-11-10T23:10:20Z
updated_at: 2026-11-10T23:10:20Z
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

- [ ] Fire core: a separate emissive phase in the `fireball` volume. Low soot opacity for the first 3 to 6 s, so the fire shows. Turbulent, self-lit, about 3 to 4 R.
- [ ] Blackbody cooling: white, yellow, orange, deep red, with the Window Seat envelope (8 s strong, 40 s tail).
- [ ] Soot rolls over the fire: the soot forms as a growing outer skin. Fire pockets glow through the gaps as it tears.
- [ ] Rise: the fire core rises and rolls into a buoyant ring as it cools.
- [ ] Inner glow: the soot is lit orange from inside for about 15 s and fades with the fire tail (`vlight`).
- [ ] A soft glow globe round the fire: one `flare()`, sized by the fire radius, fading with the 8 s envelope. It lights the air, not a bloom halo.
- [ ] Scene light: the `uBk` tail follows the fire envelope, so the plain, the gun and the clouds glow as long as the fire does.
- [ ] Bloom stays only on the fire, not on the lit soot or the clouds.

## Other missed chances to weigh

- Secondary bursts: two or three late flashes inside the cloud as big pieces break.
- Burning fragment rain from the cloud's underside for the first 10 s.
- A heat shimmer above the fireball while it burns.
- A deep, late rumble and crackle that track the fire's life.

## Verify

Headless stills at hit +0.3, 1, 3, 6, 10, 20 and 30 s, at dusk and at night. Tom judges it live on localhost:8077.
