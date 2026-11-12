---
# stimming-e39e
title: 'Railgun: alternative fire modes (Salvo, Siege)'
status: draft
type: task
priority: normal
created_at: 2026-11-12T08:57:54Z
updated_at: 2026-11-12T09:15:02Z
parent: stimming-f793
---

Alternative fire modes for Railgun. Brainstorm with Tom, 2026-11-12. Build nothing until Tom says so.

## Intent (Tom)

- Bigger spectacle: more hits, more of the target in play.
- Fit the capital ship target (stimming-x3wl): hard points, wounds, a finish.
- Not a quicker loop. Rail (today's hold) stays the default mode.

## Selection

An on-HUD selector (Tom). Its form is open. It does not use the Bar v2 top-left slot.

## Short list (Tom's pick)

| Mode | Charge | Bolt and gun | Impact | Sound | Ship |
|---|---|---|---|---|---|
| Rail (today) | Power 0.12 to 1.25 | One slug, one 320 m slam | Full shatter | Hum, crack, one boom | One big hit |
| Salvo | The hold banks rounds: arm 1, full 3, over-hold up to 5 | Release ripples them out 0.5 s apart. Short stutter slams; the barrel does not run out between them. A string of tracers. | Each round gouges a glowing crater and throws spall. The last round breaks the rock along the craters. | A cadence of cracks; ten seconds later a rolling string of booms | Hits walk down the hull. Traverse in Free aim during the salvo gives a sweep. |
| Siege | The over-hold does not vent. A hold through it commits to one shot near level 2. | A thick slug, slow to leave; it lights the plain. The gun pays: white-hot barrel, stuck recoil, 20 s of steam, no press until it cools. | No shards: the rock vaporises. A ring wave runs through the cloud deck; the sky flashes. | The hum chokes to silence before the shot; a deep, late boom | One shot breaks it up |

## Set aside

- Flak: one slug that splits mid-flight into a cone of tracers; many small strikes.
- Lance: a dragged beam; it breaks the rule that the bolt takes seconds.
- Pierce: a Rail variant for the ship only; the slug goes through every deck.

## What the code needs (from reading `railgun/index.html`)

- `fire` returns while a `shot` flies: Salvo needs several bolts in flight.
- `shatter` spends the whole rock: Salvo needs partial hits (craters, wounds). Build one wound model, shared with the ship's Task 4.
- Siege changes the `vent` branch in `stepCharge` and adds a cooldown lock on `act.press`.
- Recoil, Mach ring and blast in `stepShot` assume one shot; Salvo needs them per round.

Salvo spec: `docs/plans/railgun-salvo.md` (Tom approved the sections, 2026-11-12). Next: Tom reviews the spec, then writing-plans.

## Open questions

- [ ] The HUD selector: its form, its place, and whether the sight session's HUD holds it.
- [x] Salvo: bank then ripple; five rounds at 0.35; 0.5 s gap; crater, break, hunt; rising recoil to the clearance point (spec).
- [ ] Siege: is a 20 s lockout fun in a desk toy, or does the gun only look spent?
- [x] Order: Salvo first (Tom, 2026-11-12). It builds the wound model the ship shares.
