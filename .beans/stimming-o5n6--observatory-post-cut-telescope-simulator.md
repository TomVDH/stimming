---
# stimming-o5n6
title: 'Observatory: post-cut telescope simulator'
status: in-progress
type: task
priority: normal
created_at: 2026-11-22T11:01:56Z
updated_at: 2026-11-22T11:33:10Z
parent: stimming-wqq9
---

After the pick cuts, a telescope simulator: the player drives the tube and the eyepiece, and sees a simulated view through the optics. Scope: a new module under observatory/src/sim/ with its own workbench page. No edits to view/cuts.ts or loop.ts until the cuts bean (stimming-746h) lands. Tom signs off the look and the Lab entry.

## Checklist

- [ ] observatory/src/sim/ optics maths (tube pose, eyepieces, projection)
- [ ] observatory/src/sim/main.ts: entry, Canvas 2D eyepiece view, controls
- [ ] observatory/sim.html workbench page (noindex)
- [ ] tools/build.mjs: sim/main in the observatory extras (one line)
- [ ] npm run check: 0 errors
- [x] npm run build: dist/sim/main.js written
- [ ] Browser pane: sky renders; tube controls move the view
- [x] Commit on claude/obs-sim-5faa06 with tools/commit.sh --no-push

## Open choices for Tom

- The look of the eyepiece view and the page.
- The Lab entry (none added here).
- Integration with the pick cuts (stimming-746h) and the hand-off from the shot.

## Notes

- The catalog holds about 8,900 naked-eye stars, about 0.2 per square degree.
- A 1.73° field (40 mm) is often empty, so the tube starts on the brightest star from 20° to 80° altitude.
- Polaris check at LST 15h12m: it lands about 0.7° below the centre at alt 51, az 0, as expected near lower culmination.
- Open for Tom: faint procedural field stars to fill the eyepiece, a live sky clock, an inverted (true eyepiece) image.

## Round 2: realistic optics (Tom, 2026-11-22)

Tom asked for a quasi-realistic eyepiece and a digital camera view, with shaders and screen effects, procedural stars, flares and a spectrogram.

- [x] WebGL2 renderer: instanced bodies into a float target (Moffat seeing PSF, scatter wing, achromat violet halo)
- [x] Procedural field: seeded 0.5° cells, faint stars to mag 16.5, denser toward the Milky Way; galaxies (spiral, elliptical) with redshift
- [x] Eyepiece: field stop, soft saturation that keeps hue, rod-vision desaturation, glare from mips, lateral colour and soft edge, seeing tip-tilt, grain
- [x] Flares: ghost ring mirrored through the field centre; optional spider spikes in the camera
- [x] Camera: shot and read noise, hot pixels, amp glow, live stack per sub, asinh stretch, histogram, reticle and 5′ scale bar
- [x] Spectrograph: noisy integration, line finding (H, He, Ca, Na, Mg, Fe, CH, TiO, telluric O₂, nebular emission), colour temperature and class, galaxy redshift
- [x] Sky physics: live sidereal time with tracking, air mass extinction, seeing growing toward the horizon
- [x] Loop: 30 fps when ambient, sleeps 60 s after input; reduced motion stills seeing and grain
- [x] npm run check 0 errors; build writes dist/sim/main.js (57.6 kb); checked in the browser pane at desktop and phone width

### Open choices for Tom (round 2)

- The look of both views; the spike and ghost strength; galaxy density.
- Stellar flares (an M dwarf flaring with Hα emission) are not built; ask before adding.
- The QA hook window.__sim stays for review; remove before shipping.
