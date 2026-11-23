---
# stimming-o5n6
title: 'Observatory: post-cut telescope simulator'
status: in-progress
type: task
priority: normal
created_at: 2026-11-22T11:01:56Z
updated_at: 2026-11-22T20:16:30Z
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

## Round 3: the family's two telescopes (Tom, 2026-11-22)

Checked with the other chats: the main dome holds the hero refractor (hero-scope.ts: 0.276 m objective at size 1, the dome's 1.5 scale gives about 41 cm, f/12). The modern-scope branch builds a 1 m f/3 Ritchey-Chretien on a direct-drive fork with four vanes and a cooled camera.

- [x] Great refractor mode: 41 cm f/12, eyepieces 55/40/25/12 mm, no spikes
- [x] 1 m reflector mode: f/3 camera (23.5 x 15.7 mm sensor, 27' x 18'), four-vane spikes, deep layer to mag 25 (11,656 galaxies in one Draco frame)
- [x] High-redshift spectra: [O II], Lyα, the 400 nm break, the Lyman forest and limit; lookback time and distance (flat ΛCDM)
- [x] Fixes: round glare (ring taps on mips), TiO no longer found in hot stars
- [x] Operator screen for the 1 m (Tom: a faux OS, real capture-software feel, zoom and crop)

Note: the building redo moves the dome scale to 1.7; the refractor would then be about 47 cm.

## Round 4: the 1 m's operator screen (Tom, 2026-11-22)

- [x] System bar: host, roof, weather mast, UTC and LST, Night (red screen)
- [x] Image viewer: Fit, 1:1, zoom at the cursor, drag to pan; the crop re-renders at sensor resolution, sensor pixels show as blocks past 1:1; a zoom keeps the stack
- [x] Overlays: crosshair, detected stars with HFR, labels, compass (N up, E left), scale bar
- [x] Camera: loop, exposure, filter wheel L R G B Hα (mono), live stack, cooler, ADU statistics and histogram
- [x] Mount: hold-to-jog N S E W with four rates, Go To by name or RA and Dec, eased slews, 10° limit, double-click to slew, tracking
- [x] Focuser: drift with temperature, out-of-focus donuts with vane shadows, autofocus (9 points, hyperbola fit, V-curve)
- [x] Guider: error graph and RMS; unguided, the periodic error smears the stack
- [x] Log strip; check 0 errors; checked in the browser pane

### Open for Tom (round 4)

- The look of the operator screen, and the app name "Observatory Control".
- The camera loops at 4 fps while it waits for a sub, and pauses after 10 minutes without input.

## Round 5: two ways of seeing (Tom, 2026-11-22)

Tom: simplify; make the 1 m's software diegetic (we look at a computer screen); the refractor is optical, with chromatic aberration and lens flaws; the two do not share a style.

- [x] 1 m: the control software is drawn in a 1440 x 900 canvas, laid over the camera image on a virtual monitor, then shown through a monitor shader (LCD black level, backlight bleed, panel bloom, matte sheen, bezel and desk lit by the screen). Clicks map through the glass.
- [x] 1 m software simplified: targets list (slew on click), camera, focus with autofocus, guiding, spectrum, image stats; log under the image. DOM panels and os.ts removed.
- [x] Refractor: full-bleed eyepiece, no software; an eyepiece case (55, 40, 25, 12 mm, grating), a clock drive switch, scroll to focus.
- [x] Refractor optics: per-colour focus (achromat secondary spectrum, f/2000), coloured rims out of focus, coma and astigmatism off axis, pincushion, lateral colour, dust shadows on the field lens, ghosts and glare.
- [x] Grating: every bright star shows its first-order spectrum from a temperature atlas; Balmer lines show in Vega.
- [x] Seeing drifts on its own (random walk around 2.2 arcsec).

### Open for Tom (round 5)

- The look of the monitor and the room; LCD now, a CRT is a shader swap.
- What the toy keeps: these are realistic first passes; concessions later.

## Round 6: a DOS-era program on the LCD (Tom, 2026-11-22)

- [x] The 1 m's software is a text-mode program: 120 x 42 cells, VGA colours, double-line boxes, a cyan title bar, a function-key bar (F2 slew, F3 expose, F4 filter, F6 focus, F8 guide, F9 night), keys 1-6 for targets, block progress bar
- [x] Boxes: IMAGE (stats on its border), LOG, TELESCOPE (RA, Dec, HA, alt, az, air mass, tracking, seeing, guiding), CAMERA, FOCUS (V-curve), TARGETS, SPECTROGRAPH (teff and class, or z, lookback and distance)
- [x] The LCD monitor shader stays; panel.ts keeps only the element rows
- [x] The screen effect fills the view: no bezel, no room; black bars take up any difference in shape

## Round 7: into the toy (Tom, 2026-11-23)

Tom: integrate it into the toy for now; an overview with a sweeping scene, a sleek animation, then the sim.

- [x] The glass shot pushes into the objective glass (1.8 s, speeding up); the view through the telescope opens as an iris in the glass (view/through.ts)
- [x] sim.html?embed&ra&dec&t: loads hidden at the pick, starts on the picked star at the toy's sky time, draws only after the toy's go
- [x] Esc or "Back to the dome" fades the view out; the wide shot fades up from black; the scene sleeps while the view shows
- [x] A skip during the cuts or the push drops the view; reduced motion fades the view in with no push
- [ ] Tom sees the push and the iris in the pane
- [x] The sweeping overview: the opening (golden hour to night, 10 s) starts toward the sunset, the dome low on the left, and pans and tilts down onto the dome; it lands on the wide shot (view/camera.ts applySweep). It stays on the rise: the woods and the land are built for that view only
- [x] Tom keeps the pan, not an orbit round the summit (2026-11-23)
- [ ] Open: what "medium fidelity" trims from the sim
- [ ] Open: optics.ts still says a 41 cm refractor; at the main dome's scale 3.64 the hero glass is about 1 m
