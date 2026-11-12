# Railgun: Salvo fire mode (`stimming-e39e`) design

> Design spec. Tom approved it section by section, 2026-11-12. Tom reviews this file next. The implementation plan comes after, through superpowers:writing-plans. Build nothing before that.

**Goal:** A second Railgun fire mode beside today's Rail. The hold banks up to five rounds. The release ripples them out. The rounds crater the rock, break it, then hunt its big chunks in the sky.

**Why (Tom):** bigger spectacle, and a mode that fits the capital ship target (`stimming-x3wl`). Not a quicker loop.

**Architecture:** Procedural, in `railgun/index.html`. The single `shot` becomes a list of rounds. The rock gets a damage total and crater spots. Rounds go through the same target seam that the ship plan adds (`tgtHit`). No new library and no asset load.

## Decisions

| Question | Ruling |
|---|---|
| Modes | Rail stays the default. Salvo is the second mode. Siege comes later (`stimming-e39e`). |
| Selector | An on-HUD selector. Its form waits for the sight session's HUD. It does not use the Bar v2 top-left slot. |
| Input | Bank, then ripple: the hold banks rounds, the release fires all of them. |
| Hits | Crater, break, hunt. |
| Recoil | Rising. The last round of a full bank stops at the clearance point (see 3). |

## 1. The mode

1. `fireMode` is `'rail'` or `'salvo'`. It persists in `stimming.railgun.firemode`.
2. A pick during a ranging, a hold or a ripple applies at the next press.
3. Aim modes (Track, Free) work as today. In Free aim, a traverse during the ripple spreads the rounds: a sweep.

## 2. The charge: banking

The ranging, the build, the hum and the chaos stay as in Rail. The hold banks rounds instead of power.

| Round | Banks at (hold time) | Stage |
|---|---|---|
| 1 | about 2.4 s (power 0.6, `ARM`) | Build |
| 2 | 5.5 s | Build |
| 3 | 8.6 s (`HOLD.full`) | Full |
| 4 | 12.6 s (`HOLD.ready`) | Over |
| 5 | 14.6 s | Over |

1. Each banked round gives today's arm cue: a clunk, a small shake and two arcs down the rails.
2. A release before round 1 fizzles, as in Rail.
3. The vent at 16.6 s empties the bank. No round fires.
4. Each round carries 0.35 power. The kill line is 1.0.
5. Three rounds (a full hold) break a fresh rock. Five rounds break it and leave two to hunt.
6. One or two rounds leave the rock alive and cratered. The damage stays on the rock until it breaks. The next salvo that takes the total past 1.0 breaks it.
7. The kill line applies to Salvo rounds only. Any armed Rail hit breaks the rock, as today.

## 3. The ripple

1. Round 1 leaves 0.3 s after the release, as in Rail. The next rounds leave every 0.5 s.
2. Each round has its own muzzle flash, crack, Mach ring and tracer. The tracers string out across the sky.
3. Each round flies `lerp(11.5, 8.5, 0.35)`, about 10.5 s. The rounds land 0.5 s apart, in order.

### Recoil

1. The kick rises with the round number: round k slides `k / 5` of the cap.
2. The cap is the clearance point: the deepest slide where the breech does not clip the mount. Measure it in the build with `__qa.recoil()` and stills. Then set the cap just under it.
3. A full bank of five ends on the cap. A smaller bank stops lower.
4. Between rounds the barrel gets back only part of the way. After the last round it runs out over seconds, as in Rail.
5. The cradle kick rises in the same steps.
6. Rail itself slides 320 m at full power and 400 m at the over-hold peak (`stepShot`), and Tom sees the breech clip there. That is a separate bug. Salvo does not fix it.

## 4. The hits: crater, break, hunt

### Crater (the total stays under 1.0)

1. A glowing spot marks the hit point on the rock. It cools from white to dull red over about 20 s.
2. A spall plume throws dust and a spray of burning pips off the face.
3. A small flash (about a third of a break's flash). The rock lurches a little on its path.
4. The rock holds up to four crater spots.

### Break (the round that takes the total past 1.0)

1. Today's `shatter` runs at the salvo's total power, capped at 1.25.
2. The fireball, the four big chunks, the embers and the smoke tail are as in Rail.

### Hunt (rounds still in flight after the break)

1. Each round locks onto one of the four big chunks, the biggest first.
2. The round arrives 0.5 s after the last one. The chunk has moved only a few hundred metres. The bolt needs no visible bend.
3. The hit is a mid-air burst. The chunk's trail ends in a flash. Its embers rain down.
4. A wounded rock can break on round 1. Then four rounds hunt all four chunks.
5. A round with no chunk left flies on past the cloud, as a miss does today.

### The ship (when `stimming-x3wl` lands)

The same rule maps onto the ship: round 1 wounds, round 2 kills, the next rounds hunt the five hulks.

## 5. Sound

Salvo builds on the shot takes that are on `main` at build time. The sound branch (`claude/railgun-sound-3af021`) is not merged yet.

1. Banking: each banked round adds a clunk. The hum lifts one step.
2. Ripple: each round plays the shot take. It rises as the recoil does. Early rounds are lighter and shorter, so they do not smear. The last is full.
3. Craters: a thin far crack and a small thud each, about 10 s after the shot.
4. Break: today's full impact and boom.
5. Hunts: a sharp mid-air crack with crackle. Lighter than the boom.
6. The existing rules hold: mute stops all sound, pending sounds drain, the context suspends after the last sound.

## 6. Code shape (`railgun/index.html`)

1. `fireMode`, its persisted value and `__qa.mode(m)`.
2. `charge.bank`: the count of banked rounds against a `SALVO_BANK` time table. `vent()` empties it.
3. `shot` becomes `shots[]` (up to five). `fire` takes a round count. `stepShot` steps each round.
4. Recoil and cradle kick add up over the rounds. `U.uRecoil` stays one uniform.
5. Each round has its own bolt and ion trail. The one `uShock` ring becomes up to five rings.
6. `ast.dmg` holds the damage total. Up to four crater spots are uniforms on the rock shader.
7. At the break, rounds in flight retarget onto `chunks[]`. A chunk burst reuses the late bursts in `blastFx.bursts`.
8. The target seam: the ship plan's Task 2 adds `tgtHit(c)` and its siblings. Salvo uses the same seam. Whichever lands first builds it.
9. `busy()` stays true while a round flies or a crater glows.

## 7. Cost, quality and QA

1. Hold 30 fps through the hold and with five rounds in flight.
2. Five bolts and five rings are the cost risk. On rungs 2 and 3, the ion trails of rounds 2 to 5 are thinner.
3. Reduced motion: no recoil, as today. Flashes halve. Tracers stay.
4. QA hooks: `__qa.mode(m)`, `__qa.bank(n)` (bank n rounds), `__qa.salvo(n)` (bank and fire n rounds), `__qa.dmg()`.
5. QA runs: Q1 to Q10 in both modes at 1280 × 800, 375 × 812 and 812 × 375, at the three rock sizes. A clean console. `tests/bar-v2.html` stays green.

## Out of scope

- Siege, Flak, Lance and Pierce.
- The HUD selector's look (waits for the sight session).
- The ranging laser (`stimming-48f4`).
- Rail's own breech clipping.
