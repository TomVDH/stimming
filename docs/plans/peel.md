# Peel (`peel`) implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. One fresh session builds this toy, task by task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** A sheet of film lies over a glowing surface. Grab an edge and peel it back: the film curls, the surface under it comes up crisp and bright, and a faint blue line of light runs along the peel front. Flick it and the sheet tears free and flutters off. Lay another and peel again.

**Architecture:** Raw WebGL2. Each sheet is a grid mesh bent in the vertex shader by a peel model: an attached flat part, a curl of radius R at the peel front, and a free part toward the pointer. The CPU solves the peel front from the pointer and the film's tack, with stick-slip. A shadow pass, a base pass and a film pass compose with a small glow chain.

**Tech stack:** raw WebGL2 on the `shared/stim.js` helpers; Tone.js through `kit.tone()`. No three.js. If the lighting tuning grows past the estimate, three.js 0.170 is the fallback host.

**Spec:** shortlist 23 in [toy-ideas.md](../toy-ideas.md); "Peel" in [toy-plan.md](../toy-plan.md); rank 3 in [fidgets.md](fidgets.md); batch rules in [README.md](README.md); Bar v2 in [bar-v2.md](bar-v2.md).

| | |
|---|---|
| Size, estimate | M · $20 to $35 |
| Kits | none. The thin-film colour for Holo may copy Oil slick's interference function (`oilslick/index.html`) as code. |
| Before the build | F2 in [fidgets.md](fidgets.md) |

## The shot

A dark stage. A soft glowing surface fills most of it: a slow, deep gradient of light, like a screen with nothing on it.
One sheet of film covers the surface with a small margin. Under the film the glow is hazed, dimmer and a little blurred, with a few specks of dust and two or three trapped air bubbles.
One corner of the film is already lifted a few millimetres, as a tab, and catches the light.
Nothing else: no device, no hand, no table.

The first frame is a picture: the hazed glow, the lit tab and its small shadow.

## Hero moments

1. **The reveal.** Peel back the film and the surface under it comes up crisp and vivid, with a hard line at the peel front between haze and clarity.
2. **The blue line.** A faint blue-violet glow runs along the peel front and flickers with each stick-slip jump. Peeling tape in the dark does this (triboluminescence).
3. **The tear-off.** A flick past halfway tears the sheet free. It flutters off the stage, turning, and its underside shows.
4. **The curl.** The film wraps over a tight curl at the front and its free part follows the pointer, lit on its back face, throwing a soft shadow on the surface.

## Loop

- **Press near an edge or on a lifted flap (within 28 px):** grab the film there. The peel direction is set by the grab point: an edge peels straight, a corner peels on the diagonal.
- **Drag:** the front advances when the film goes taut. A slow drag peels smoothly and quietly; a fast drag peels in crackling jumps.
- **Release:** the flap stays lifted and sags into a loose curl. Grab it again to go on.
- **Flick past halfway:** the sheet tears free and flutters off.
- **Press inside the sheet:** the film flexes under the press and coloured rings bloom where the air gap thins (Newton's rings). Nothing peels.
- **+ Sheet (N):** a fresh sheet drops on, settles, and pushes its air out to the edges.
- **Untouched:** no drift. The loop sleeps.

## Bar (Bar v2)

| Slot | Content |
|---|---|
| Top left | Choice: Film, `segments`: Screen, Tape, Holo (keys 1, 2, 3) |
| Bottom left | Action: `+ Sheet`, key `N` |
| Bottom right | Slider: Tack (adhesion: low peels smooth and silent; high peels in jumps) |
| Bottom centre | Keys: `[DRAG EDGE] peel` · `[FLICK] tear off` · `[N] new sheet` |
| Settings | Glow (toggle: the blue line) · Under: Aurora, Ink, Plain (choice) · Quality (shared) |
| Settings footer | Reset: one fresh sheet with its tab |

Three visible controls.

| Film | Top face | Underside (seen on the curl) | Detail |
|---|---|---|---|
| Screen | clear, milky haze, dust specks, bubbles | clear, a faint sheen | the glow under it comes up crisp |
| Tape | amber, translucent | dull amber adhesive | leaves faint stick-slip bands on the surface |
| Holo | a holographic foil: thin-film colour and diffraction streaks that shift with the curl | white paper backing | the rainbow slides along the curl as the normal turns |

### At 375 px

- The sheet fills the stage less a 16 px margin. Grab radius stays 28 px.
- The choice moves bottom left as a stepper; + Sheet moves bottom right; Tack moves into Settings.
- Touch targets are 34 px.

## Peel model

Sheet coordinates: u runs along the peel direction d from the grabbed edge; the front sits at u = s. Points with u ≥ s lie flat; points with u < s are peeled.

| Item | Rule |
|---|---|
| Curl | Peeled points within πR of the front wrap round a cylinder of radius R at the front. R grows with Tack and film stiffness. |
| Free part | Past the curl, the film runs straight to the grabbed point, which sits at the pointer, lifted to a height that rises with drag distance. |
| Length | The film does not stretch. Arc length from the front to the grabbed point equals s. |
| Advance | If the path from the front to the pointer is longer than s, the film is taut and the front advances. |
| Stick-slip | The front holds until tension passes the tack threshold, then jumps a step. Faster pulls make smaller, more frequent jumps. Each jump is an event: crackle, a glow flicker, and on Tape a faint band left on the surface. |
| Slack | If the path is shorter than s, the free part sags under gravity into a loose curl. |
| Tear-off | Release with s past half the sheet and pointer speed above a threshold: the sheet leaves as one body with spin and lift, and flutters off in about 1 s. |

## Tech

**Sheet.** A 96 × 96 grid mesh (64 × 64 on the lower rung). The vertex shader maps each grid point through the peel model from uniforms `uDir`, `uS`, `uR`, `uGrab` and `uLift`, and computes the normal for each part.

**Base pass.** The surface under the film: a slow OKLCH gradient field (Aurora), a deep ink wash (Ink) or one flat tone (Plain). It renders once per change, not per frame, unless Aurora drifts during a gesture.

**Haze.** Where the film still lies flat, the film pass blurs and dims the base, adds dust and bubbles. The peeled area shows the base untouched. The front line is sharp.

**Shadow pass.** Draw the lifted part a second time, projected onto the surface along the key light, blurred by its height. It darkens the base under the flap.

**Film pass.** Two-sided shading: top face per Film, underside per Film. One key light from the upper left, a soft fill, and a rim on the curl where the film turns toward the light. Holo uses a thin-film function of the view angle plus a diffraction streak along one axis.

**Blue line.** An additive band along the front, 2 to 4 px wide, its brightness set by the stick-slip rate. Glow toggles it.

**Newton's rings.** A press inside the sheet draws a radial interference pattern that fades over 600 ms.

**Post.** A small glow chain for the blue line and the Holo highlights; grade with grain and a vignette.

## Sound

- **Smooth peel:** a soft tacky hiss whose level follows peel speed.
- **Stick-slip:** a crackle per jump, a 2 to 5 ms noise click. Tape adds a pitched squeal whose pitch follows peel speed, as stick-slip frequency does.
- **Tear-off:** a quick rip, then the flutter: low, soft air buffets for 1 s.
- **+ Sheet:** a soft slap, then a faint hiss as the air squeezes out.
- Pan follows the front's x. Pitch, time and level jitter on every event. Muted by default.

## Finesse

- The hard edge between haze and clarity is the reward. Keep it sharp.
- The underside of each film differs from its top.
- The blue line only shows in the dark; on Plain under-glow it is faint, on Ink it is clear.
- Tape leaves faint bands where the front jumped.
- A slow peel is silent; the crackle is earned by speed.

## Reduced motion and idle

- **Reduced motion:** no flutter; a torn sheet fades out where it is. No Newton's rings animation, only a still ring. The blue line holds steady, no flicker.
- **Idle:** lively during a gesture and while a sheet flutters off or settles. Asleep otherwise. No drift.

## Review focus

1. **Grab at a corner versus an edge:** the direction follows the grab point, and the front stays perpendicular to it.
2. **A drag back over the sheet:** the peel angle passes 180°; the curl stays round and the free part never passes through the attached part.
3. **Fast drags:** stick-slip events cap at 60 per second for sound; the front never jumps more than one curl width per frame.
4. **Release, then grab the flap again:** the model resumes from the saved s and direction, with no pop.
5. **A drag that leaves the stage:** capture holds; `lostpointercapture` releases the flap as a normal release.

## Tasks

### Task 1: Blockout (checkpoint)

**Files:** Create `peel/index.html`, the `toys.json` entry and the menu Lab entry with a low-fi icon and its `toys.peel` hook. Commit shared files with `--hunks`.

**Produces:** the sheet mesh, `peelModel(pointer)` returning `{ s, dir, R, lift }`, the base pass, the haze, the film pass in flat shading.

- [ ] One Screen sheet, its tab, the base and the haze. Grab and drag peel the sheet. Release holds the flap.
- [ ] Bar v2 spec with Film, + Sheet, Tack and the Settings rows wired as stubs.
- [ ] Q1, Q2 and stills at 1280 and 375 px: the first frame and a half-peeled sheet. Checkpoint with Tom.
- [ ] Commit: `Peel: blockout, a film that peels back from a glow`.

### Task 2: Feel

**Produces:** stick-slip, slack sag, tear-off and flutter, + Sheet and its settle, Newton's rings.

- [ ] The full model and the pointer state machine. Tom tries the feel. Checkpoint with Tom.
- [ ] Q4: the loop sleeps after a flutter ends.
- [ ] Commit: `Peel: stick-slip, tear-off and fresh sheets`.

### Task 3: Light and films

- [ ] Shadow pass, two-sided shading, Tape and Holo, the blue line, the glow chain.
- [ ] Stills of each Film mid-peel. Checkpoint with Tom.
- [ ] Commit: `Peel: three films and the blue line`.

### Task 4: Sound

- [ ] Hiss, crackle, squeal, rip, flutter, slap. Q9.
- [ ] Commit: `Peel: the crackle follows the pull`.

### Task 5: Finish and QA

- [ ] Glow, Under and persistence. The performance ladder: pixel ratio 1, then the glow chain, then the grid size.
- [ ] Q1 to Q10 in the browser pane. Tick the bean and record the cost. Commit.

## Kit handoff

None. The peel model, marked as a section, suits a sticker or label toy later, and Pop field's peel corner if Tom picks it.
