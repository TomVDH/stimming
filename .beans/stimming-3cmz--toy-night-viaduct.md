---
# stimming-3cmz
title: 'Toy: Night viaduct'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-04T13:00:00Z
updated_at: 2026-11-08T12:00:00Z
---

Night viaduct, restyled from an empty file. One toy; each viaduct is a scene chosen by a chip.

> Restyle 2026-11-04. Tom parked the first build as broken and asked for a complete rethink.
> Concept rounds: valley, overpass, rings; then urban, mountain, port; then six more sketches.
> Tom picked two scenes: Pass (lone mountain viaduct) and Port (rail causeway to an industrial port, max fidelity).
> Pass follows Tom's reference: a wide, calm V gorge, one thin deck, a sawtooth wall of moonlit wedge peaks.
> Port: wide shot; the causeway and train lead; the port is a far, elaborate backdrop.
> Two.js was asked as an option for Pass. Three.js won: Two.js has no shaders, bloom or haze, and is outside the library set.

## Restyle checklist

- [x] Concept rounds: three stills, refinements, round 3, six sketches
- [x] 2D prototypes: Overpass, Rings, Urban, Mountain, Port
- [x] Framing in three.js: Pass and Port, 1280 and 375 px
- [x] One page, two scenes: `viaduct/index.html` hosts `pass.js` and `port.js`; scene chips; K2 bloom, orbs and grade shared
- [x] Framing fixes. Pass: sea, crest snow line, taller peaks, wedge rhythm. Port: fog, rail glints, 375 px framing, horizon blend, cloud
- [x] Volumetrics: Port fog volume, lamp orbs (havoc lens post as the model)
- [x] Port motion: train out and back; swell, cloud drift, plumes, flame, blinkers, searchlight sweep
- [x] Port performance: matte-painting bake (still layer, mirror, sea fog), one full-screen sky and sea pass, live 3D only for train, searchlight, flame, plumes, lamps, rain; quality ladder
- [x] Port interaction: tap water ripple, tap sky train, drag or hold steers the searchlight, Space and + Train
- [x] Frame loop: 30 fps drift, sleep 60 s after input, stop when hidden; reduced motion
- [x] `?tune` panel: 61 look knobs, saved per scene, Copy JSON, Reset
- [x] Prototype gallery `viaduct/protos/`: 34 concepts, playable pages and stills
- [ ] Tom: real-device fps check of the Port on Standard and High
- [x] Tom: tune the Port in `?tune`, then send the Copy JSON; bake those values in as defaults
- [ ] Checkpoint 1: Tom approves the Port framing
- [x] Death Stranding pass: precast girder causeway, monolithic train, train light on the baked deck, full rate while the train shows
- [x] Chase cam: tap the train to ride beside it; the scene renders live during the ride
- [x] Polish pass: glow, terminal portal, smoothness (branch feature/stimming-3cmz)
- [ ] Port sub-project 2: live fog layer, tune desk by layer, player Settings tray
- [ ] Port sub-project 3: lights wave, lightning, Fog slider
- [ ] Lens flare (havoc `src/view/lensflare.js`) and the rack focus as hero moments
- [ ] Bar: Settings tray holds Quality (pass it to `qualitySetting(tray)`) plus Port options; (i) vignette
- [ ] Sound
- [ ] Checkpoint 2: Tom reviews motion and sound
- [ ] Pass: parked by Tom 2026-11-04; Port first
- [ ] Pass snowbound, sub-project 1: shared `train.js`, span, storm and moon gaps, long freight with plough (spec `docs/plans/viaduct-pass-snowbound.md`)
- [ ] Pass snowbound, sub-project 2: avalanche on tap
- [ ] Prototypes: Tom picks any to grow (all six final in the gallery)
- [ ] Menu Lab entry: icon and `toys.viaduct` hook kept as they are
- [ ] QA Q1 to Q10 (docs/plans/README.md)
- [ ] Record the session cost

## Resume here

1. Everything is on `main`; branch `feature/stimming-3cmz` is level with it.
2. Open `viaduct/?scene=port&tune` and tune; Copy JSON gives the new defaults.
3. Next build steps: lens flare and rack focus, the Settings tray, then sound.
4. Port files: `viaduct/port.js` (scene, bake, tune list), `viaduct/index.html` (loop, post, panel, gestures).

## Notes

- K2 lives in marked sections. Shared in `index.html`: bloom, grade. Per scene: sky, haze, precipitation (Pass: snow, Port: rain). Unify them before Fireworks lifts K2.
- Headless SwiftShader is slow (about 1 s per Port frame), so it cannot judge fps. A real-device check is still needed.
- The bake hides static parts each frame; tune knobs marked bake re-render the still layer 150 ms after the last move.
- Polish pass not yet seen in a visible pane; frame times not measured.
- havoc (`TomVDH/havoc`) holds the lens flare, disc blur and box-fog shaders used as models; it is WebGPU/TSL, so ports are rewrites in GLSL.
