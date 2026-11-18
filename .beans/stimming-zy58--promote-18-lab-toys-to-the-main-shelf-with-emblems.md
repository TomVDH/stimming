---
# stimming-zy58
title: Promote 18 Lab toys to the main shelf, with emblems and Bar v3
status: in-progress
type: feature
priority: normal
created_at: 2026-11-17T23:27:53Z
updated_at: 2026-11-17T23:32:14Z
parent: stimming-ft0e
---

Tom asked on 2026-11-17 to promote these toys from the Lab to the main shelf. Each gets an intro emblem (the luminance mask), Bar v3 and, where needed, an icon round. Tom wants this done now, before a pause of some months.

Plan: `C:\Users\tmlns\.claude\plans\can-we-promote-and-federated-mccarthy.md` (local). The template is `stimming-0mq6`. The rule is `docs/standards/process.md:52-55`.

## Toys

| id | Toy | Stage (Tom) | Series | Emblem | Bar on main |
|---|---|---|---|---|---|
| postcard | East Van postcards | beta | eastvan | no | own shell |
| motorway | Lit motorway | beta | belgian | yes | v3 copy on hvtr |
| foil | Crinkle foil | full (null) | poke | yes | v1 |
| kintsugi | Kintsugi | beta | poke | no | v3 copy on hvtr |
| crossing | Crossing button | alpha | poke | no | v3 copy on hvtr |
| marble | Marbling | beta | goo | no | v1 |
| rupert | Rupert's drop | beta | science | no | v2 spec |
| bowl | Singing bowl | beta | science | no | v2 spec |
| observatory | Observatory | alpha | dark | spike A ready | v2, empty spec |
| nvg | Night vision | beta | dark | yes | v3 copy on hvtr |
| plasma | Plasma globe | full (null) | dark | no | v1 |
| drone | Zena | alpha | none, by Tom's word | yes | v3 copy on hvtr |
| snow | Snow globe | full (null) | wild | no | v1 |
| tornado | Tornado alley | beta | vistas | yes | v2 spec |
| windfarm | Wind farm | alpha | vistas | no | v1 |
| subway | Subway | alpha | vistas | no | v1 |
| carwash | Car wash | alpha | vistas | no | v3 copy on hvtr |
| harmono | Harmonograph | full (null) | maths | no | v1 |

East Van itself stays in the Lab. Only East Van postcards moves.

## Decisions from Tom (2026-11-17)

- Merge Bar v3 (`feature/stimming-hvtr`, PR #80) first, then promote.
- Zena keeps no series for now.
- Icon rounds: Subway for sure. Also Singing bowl, Rupert's drop, Car wash and East Van postcards, flagged in `stimming-h01g`.
- Walk the icons one toy at a time. Show the current menu icon beside its intro emblem version.

## Open points

- Harmonograph has an open retire bean, `stimming-9ld8`. Tom's promote request replaces it. Scrap `stimming-9ld8` when this work starts.
- PR #80 was in progress in another session on 2026-11-17. That session had uncommitted Bar v3 copy for bowl, rupert and observatory. Check that it landed before step 2.
- Stages: all set by Tom (2026-11-17).
- East Van postcards gets Bar v3 (Tom, 2026-11-17).
- Ask Tom for the shelf order (numbers 54 to 71).

## Checklist

- [ ] PR #80 (Bar v3 default) merged; pull main
- [ ] Bar v3 copy: rupert, bowl, tornado, observatory (check what #80 did)
- [ ] Bar spec port, then v3 copy: foil, marble, plasma, snow, windfarm, subway, harmono
- [ ] East Van postcards: Tom decides the bar
- [ ] Icon walkthrough page `icons/spike-promote-1.html`: current icon beside its emblem, one toy at a time
- [x] Icon rounds: subway, bowl, rupert, carwash, postcard; picks in `icons/picks.json`; menu tiles updated
  - [x] Menu tiles on their A icon (2026-11-17): subway, bowl, marble, plasma, snow, postcard, rupert. Observatory has icon 1 of spike observatory-2 (from main)
  - [x] Current icon kept, by Tom: carwash, windfarm, harmono, kintsugi, crossing
  - [x] rupert: A of spike rupert-2 (2026-11-17)
- [x] Emblems `shared/emblems/<id>.svg` and the `emblem` field for the 13 without one
  - [x] Done (2026-11-17): subway, bowl, marble, plasma, snow, postcard, rupert, observatory, kintsugi, crossing, windfarm, harmono, carwash
  - [x] rupert: A of spike rupert-2 (2026-11-17)
- [ ] Promotion commit: numbers, version 1.5, sub null, stages, tag/tagNl, nl/ipa gaps, stills, menu tiles, AGENTS.md shelf lists, intro fallback text
- [ ] `process.md:52` says Bar v3, not Bar v2
- [ ] Verify: check, build, bar tests, `?all` and `?lab`, each toy's intro and bar, reduced motion
