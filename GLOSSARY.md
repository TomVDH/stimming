# Stimming

A directory of small interactive desk toys: one menu, and one self-contained page per toy on a shared shell.

## Shelves and menu

**Toy**:
One interactive page at `<id>/index.html` with an entry in `toys.json`.
_Avoid_: app, demo, page (for a toy)

**Main shelf**:
The toys Tom has vetted. Each has a number in `toys.json`.
_Avoid_: toy view, live shelf

**Lab**:
The shelf of toys that wait for Tom's vetting, shown at `?lab`.
_Avoid_: lab (for a workbench or a dev page)

**Workbench**:
A dev page that tunes shared parts, such as `fxlab/`, `introlab/`, `glasslab/`, `menulab/` or `serieslab/`. It is not a shelf.
_Avoid_: lab

**Clock**:
The default menu view: twelve main-shelf toys on a dial, with the tube in the middle.

**Tube**:
The picture in the middle of the Clock: the toy in hand as a colour CRT image.
_Avoid_: tube (for the railgun sight's image tube; say "sight tube")

**Still**:
One 512 px picture of a main-shelf toy, shown in the tube and as the fallback when a toy cannot run.

**Loop**:
A 5 s clip of a toy that plays in the tube in place of its still.
_Avoid_: loop (for the frame loop or an icon's idle motion)

**Re-roll**:
A new deal of twelve toys on the Clock.

**Series**:
A group of toys by place or theme. Each toy has one.

**Shot**:
The picture inside a series icon, in a hexagon ring.

**Tagline**:
The site's line under the wordmark.

## A toy page

**Stage**:
The area where the toy runs.
_Avoid_: stage (for the release stage, a load stage or an intro beat)

**Release stage**:
A toy's maturity mark in `toys.json`: alpha, beta or none.

**Bar v2**:
The control shell in the corners of the stage, built from the toy's `bar` spec.
_Avoid_: v2 (alone)

**Old bar**:
The earlier control bar under the stage. Some pages still use it.
_Avoid_: v1, skeleton v1

**Sheet**:
A Bar v2 panel that opens on click: Settings, Dev or a tray.
_Avoid_: sheet (for the icon sheet)

**Settings**:
The sheet for anyone who plays the toy: comfort, controls, performance.

**Dev**:
The sheet for the people who build the toy, shown only with `?dev`.

**Content zone**:
The writing under the stage: idea, making-of, changes and credits.
_Avoid_: vignette, annex, about

**Intro**:
The flash sequence that opens a toy page and shows its load progress.

**Intro beat**:
One timed step of the intro.

**Base beats**:
The shared timing that every intro look follows.
_Avoid_: Classic (for the beats)

**Flash box**:
The white box with the dark logo cut out, used in the intro and on picked controls.

**Motto**:
A toy's short line under its name, in English and Dutch.
_Avoid_: tag

**Lab tag**:
The short label a Lab toy carries in its intro.
_Avoid_: tag, sub (in prose)

**Accent**:
A toy's own colour. In the intro it is the logo's ink.

## Builds and versions

**Fresh**:
A toy's current build at `index.html`. The menu always opens it.

**Classic**:
A toy's older build at `legacy.html`, reached from Settings.
_Avoid_: legacy (in prose to visitors)

**Port**:
A toy moves to a new base (library set, renderer or Bar v2) and keeps a Classic build when it looks different.

**Adopt**:
A toy takes a shared module and gives the same frame as before.
_Avoid_: port (for this)

**Same frame**:
Two builds whose pictures differ by 1/255 at most on a few pixels.

**Toy version**:
A toy's internal version string in `toys.json`. Nothing on screen shows it.
_Avoid_: version (alone)

**Site version**:
The menu's `0.N` number with its codename. It steps once per signed-off toy.
_Avoid_: version (alone)

**Signed off**:
Tom's mark on a finished toy (`data-done`). Only Tom gives it.
_Avoid_: done, approved

## Code

**Shell**:
The shared page frame every toy uses: `shared/stim.css` and `shared/stim.js`.

**Shared module**:
A file in `shared/` that toys import.

**Bundle**:
A shared module that wires a group of shader effects into one call.

**Stack type**:
The kind of renderer a toy uses: Sketch, Shader, Environment, Scene or Compute.
_Avoid_: tier

**Reference toy**:
The toy that proves a stack type or a shared module first.

**Quality**:
The site-wide graphics choice, High or Standard.

**Detail**:
Quality joined with the slow-frame watch: High, Standard or Low.
