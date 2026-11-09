---
# stimming-glot
title: 'Window seat: three.js wing spike'
status: in-progress
type: task
created_at: 2026-11-09T18:24:15Z
updated_at: 2026-11-09T18:24:15Z
parent: stimming-w1nd
---

Spike (Tom, 2026-11-09): does three.js earn its place in Window seat?
Hybrid: the raw shader keeps the outside and the cabin. three.js draws the near aircraft as meshes into pass 1.
Page: `window/spike-three.html` (noindex). Wing code: `window/wing3.js`. The live toy stays untouched.

- [x] Lofted airfoil wing: main box, inboard and outboard flaps, aileron, spoilers, winglet
- [x] Nacelle, pylon and three flap-track fairings as meshes
- [x] Physical paint lit by the baked sky (PMREM), the sun and its shadows
- [x] Shared WebGL2 context; composite into the outside buffer
- [ ] Screenshots to Tom: current vs spike, Dusk and Dawn
- [ ] Verdict: GPU cost, look, code size

Findings (2026-11-09, browser pane, 707x755):
- Frame time matches the live toy: 10 ms median on both (display cap).
- The env map takes the shader's satin squash; without it, curved skin mirrors dark ground in bands.
- Fairings read as flat blades in daylight; they need a rounder, shorter canoe.
- Spoiler side edges catch the sun as ridges.
- The shader's wing fog, storm air and flash tint do not reach the meshes yet.

Round 2 (Tom, 2026-11-09: "the wing looks better"; better flaps that move with the bank):
- [x] Compare page: `window/compare.html`, live and spike side by side, hour chips
- [x] Flaps: elliptic noses tucked under a cove lip; inboard flap, flaperon, outboard flap, aileron; 3 cm seams
- [x] Seven spoilers form the lip; fixed shroud inboard and over the aileron
- [x] Fairings: round pods hung under the trailing edge
- [x] Motion: roll rate drives aileron (to 5 degrees), flaperon and spoilers; bank trims the flaps down
- [x] Fix: the shader's view axes are left-handed; the camera now takes -R and the composite flips x

Round 3 (Tom, 2026-11-09: nicer weather on a performance-efficient three.js build). Steps, one at a time:
- [x] Step 1: three.js owns the frame. Both shaders run as RawShaderMaterial passes; sky, noise and trail are three.js textures; the outside target is a 4x MSAA half-float target.
  The wing draws first; the outside quad sits on the far plane, so depth skips pixels under the wing. Shadows redraw at 5 Hz.
  Bench (M4, 1248x752, Dusk, Storm 1, render plus readPixels): live 5.2 ms median, port 5.5 ms.
- [x] Step 2: temporal resolve. The cloud marches jitter per frame (R2 offsets); a resolve pass blends a quarter of each new frame into history, clamped to the 3x3 neighbourhood.
  The saving buys finer towers on Standard: 40 steps at 0.5 km, 3 octaves (was 32, 0.6, 2); deck 20 steps (was 18). Cost stays inside bench noise (about 5 to 6 ms).
  Test hooks: ?seed fixes the storm (reseeded before the cells, as three.js ids draw randoms); ?freeze holds the simulation for A/B shots.
  Not done: quarter-size clouds and haze bands. The look gain is modest: crisper billows, less march noise.
- [x] Step 3: bolts (`window/bolts3.js`): each tower flash gets a seeded, branching channel as fat lines, a white core in a blue halo, flickering with the flash's strokes.
  Cloud to ground below a thin deck; otherwise a crawler through the anvil. The lines sit on the far plane, so the wing hides them; a fog bank swallows them.
  The brightest bolt lights the wing from its side; a fog bank fogs the wing (FogExp2 from the shader's sight range). Cloud tops were already lit from inside.
  Test hook: `__ws.flash(x, z, big, cell)`; a flash's `kind` forces 'ground' or 'crawl'.
- [x] Step 4: glow. A bright pass at a quarter of the outside size, two rounds of a separable blur, added before the cabin pass; history stays clean. Lights, bolts and the wing's glints bloom.
  Bench (M4, Dusk, Storm 1, ?seed&freeze, min / median of 60): live about 2.9 / 3.5 to 5.5 ms; spike about 4.0 / 5.1 to 5.9 ms. Glow costs about 0.5 ms.
  Phone: 375 x 812 and 812 x 375 hold, clean console. The tip strobe on the wing toned down (it blew out with glow).
- [ ] Rain on the glass stays the shader's; instanced drops not done.
- [ ] Wing fog only tracks fog banks, not the storm's haze; check in a storm at Dusk.
- [ ] Tom: compare page, then decide whether the three.js build replaces the live toy.
