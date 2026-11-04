---
# stimming-3cmz
title: 'Toy: Night viaduct'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-04T13:00:00Z
updated_at: 2026-11-04T20:00:00Z
---

Night viaduct, restyled from an empty file. One toy; each viaduct is a scene chosen by a chip.

> Restyle 2026-11-04. Tom parked the first build as broken and asked for a complete rethink.
> Concept rounds: valley, overpass, rings; then urban, mountain, port; then six more sketches.
> Tom picked two scenes: Pass (lone mountain viaduct) and Port (rail causeway to an industrial port, max fidelity).
> Pass follows Tom's reference: a wide, calm V gorge, one thin deck, a sawtooth wall of moonlit wedge peaks.
> Port: wide shot; the causeway and train lead; the port is a far, elaborate backdrop.
> Two.js was asked as an option for Pass. Three.js won: Two.js has no shaders, bloom or haze, and is outside the library set.

## Restyle checklist

- [x] Three concept stills, then refinements, then round 3 and six more sketches
- [x] 2D prototypes: Overpass, Rings, Urban, Mountain, Port
- [x] Framing in three.js: Pass and Port, 1280 and 375 px
- [x] One page, two scenes: `viaduct/index.html` hosts `pass.js` and `port.js`; scene chips; K2 bloom and grade shared
- [ ] Checkpoint 1: Tom approves both framings
- [x] Framing fixes. Pass: sea, crest snow line, taller peaks, portrait wedge rhythm. Port: fog on the port, rail glints, 375 px framing
- [ ] Motion and interaction: trains, gestures, bar (Time slider, + Train, Settings)
- [ ] Frame loop: 30 fps drift, sleep 60 s after input, stop when hidden; reduced motion
- [ ] Decide: Port rack focus as a moment, or off
- [ ] Sound
- [ ] Checkpoint 2: Tom reviews motion and sound
- [ ] Menu Lab entry: icon and `toys.viaduct` hook kept as they are
- [ ] QA Q1 to Q10 (docs/plans/README.md on branch claude/busy-feynman-itljep)
- [ ] Record the session cost

## Notes

- K2 lives in marked sections. Shared in `index.html`: bloom, grade. Per scene: sky, haze, precipitation (Pass: snow, Port: rain). Unify them before Fireworks lifts K2.
- Headless SwiftShader is slow: Port takes about 3 s per frame at 1280 px. A real-device fps check is still needed.
- `docs/plans/README.md` is not on main yet; it sits on branch claude/busy-feynman-itljep.
