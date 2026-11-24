# The menu (`index.html`)

What the menu is now. Rules only; the decisions and their history are in the vault, [[stimming/decisions]].
Terms follow `GLOSSARY.md`. Prose: ASD-STE100, double density.

## Page

- `index.html` is a body fragment. The Pages build adds the doctype and the viewport.
- A script in the head sets `data-view` on the root from the address:

  | Address | `data-view` | Shows |
  |---|---|---|
  | `./` | `clock` | The Clock: twelve main-shelf toys on a dial. The default. |
  | `./?all` | `all` | The whole main shelf. Only this view shows the Series switch, the Lab link and a Clock link. |
  | `./?lab` | `lab` | The Lab. `lab/` redirects here. |

- `toys.json` is the list of toys. The menu shows English names only.
- No JS, a failed load, an error or a script that stalls for 8 s leaves the whole shelf.

## Clock

Files: `shared/menu/clock.css`, `shared/menu/clock.js`, `shared/menu/tube.js`, `shared/menu/mesh.js`. `index.html` links only the first two.

### Deal
- The Clock deals twelve toys from a shuffled line. No toy comes back before every other toy had a turn.
- The last three hands are kept in `stimming.seen`, across loads. A new line puts their toys last.
- Re-roll (key R) shows after 5 s, inside the clock: low in the middle, under the motto, over the six o'clock toy. It scales with the clock. It sends the old dozen back into blur in the comet's order, then runs the comet.
- The Clock has no link to `?all` or `?lab`. Both are flags.

### Middle
- It shows the name and the motto of the toy in hand. With no toy in hand it is empty: no words, no picture, no counter.
- The name's last line sits on one fixed line, a little above the centre. A longer name grows up; the hairline and the motto hang below.
- The page keeps its own words for screen readers. It shows them if the tube fails to build.

### Tube
- The tube shows the toy in hand: its still (`shared/stills/<id>.webp`) or its loop.
- `tube.js` draws in raw WebGL2 on `shared/gl.js`, in one pass, only on a change.
- Look: an oscilloscope screen (`scope/index.html`) and the railgun sight tube (`nvg/tube.js`), in colour.
  - Screen: a slight bulge, a quiet aperture grille, scan lines that widen where bright, halation from low mip levels, a faint rolling band, a power-on (dot, line, raster) when the first toy comes.
  - Sight: fine grain with no grid, new each field, uneven in slow patches; a few dead spots; a rare spark; a soft rim. Grain is never coarse or blotchy.
  - Warble: each scan line sits a hair off; a tracking band climbs the face about every 12 s. No slow sine sways.
- Words burn in: the name in B612, then the motto. The core is always white. A soft band round each letter works against the picture.
- The picture is dark and deep in colour: a steep curve, more of each hue, full strength in the middle only.
- It lies behind the clock. Its plate is 124% of the face, with no hard edge; it fades out past the ring of toys. On a phone the plate is never wider than the window.
- No square shapes: every edge of the tube, its power-on and its wedge is a soft falloff.

### Selection
- The tube masks its picture away in a soft wedge from the middle to the toy in hand, so the icon stands on the clear page.
- The wedge turns the short way to the pointer and opens and closes with an ease. `aim()` in `tube.js` draws it. There is no selection element in the page.

### Intro
- On a fresh page the tube warms up to snow, holds, and switches off like a real set (raster to line to a dot that fades). Then the comet runs.
- The comet runs once round the toys' track in 1.6 s from twelve o'clock. It fades in where it starts and runs a little past twelve as it fades.
- It drops each toy off at its hour. The toy comes in out of the menu's grainy blur (`.js-reveal`), with no tilt and no wobble.
- `clock.js` draws the comet on a canvas: a white core in a soft halo, a tapering tail of shaded dots in the wordmark hues (magenta at twelve round to red). No rim, no minute marks, no blink after.
- The Clock holds a toy with `data-hold` on its `li`, not by removing `is-in`.
- The load runs in one line: the wordmark letters drop in once the fonts are in; the TV starts 0.3 s later; the wait dot at twelve becomes the comet head.
- The intro waits for the tube's shader build (0.9 s at most). The footer shader starts after the intro.
- While the comet runs, and until the tube's blink ends on a fresh page, toys take no hover and no focus (`shy`). A toy under the pointer or in focus shows when the hold ends.
- Reduced motion or a hidden tab shows the dozen at once.

### Unattended
- After 12 s with no pointer, key or touch, each hour in turn puts its toy on the tube for 3.6 s.
- It stops after two laps. Any input stops it. Reduced motion has no such show.

### Fit
- In the Clock view the wordmark, tagline, gaps and clock scale with the window height (`--pad`, `--gap`, `--title`, `--tag`, `--clk` in `clock.css`).
- The clock takes the height that is left after the blocks above and the footer below: at least 200 px, at most 92% of the width and 1200 px. The footer's margin, chip and foot scale with the window height too, so the whole page fits the window. Below 200 px the page scrolls.
- The page fills the window: the footer and its glow stand on the bottom edge, with no band under them.
- A phone in portrait (640 px wide at most) shows the dozen as a grid of three with names, like the whole shelf: no dial, comet, tube or wait dot. A tap opens the toy. The Re-roll stands under the grid and shows at once. On load and on a Re-roll the dozen comes in out of a grainy blur, one toy after another, as the old menu did.
- Phones, portrait up to 640 px: the dial keeps 24 px clear of each edge. The page never pans sideways.
- Touch: the first tap on a toy shows it, a tap on another toy moves there, a tap away puts it down, a second tap on the same toy opens it. The check reads focus from before the tap.

### Footer
- The glow is `mesh.js` (raw WebGL2 on `shared/gl.js`, 0.4 of its CSS size): slow noise picks from six hues (magenta, violet, cyan, green, amber, red) mixed in OKLab, rising as a low horizon (340 px at most), dimmer at the foot.
- The pointer stirs and brightens it. It moves for 2.6 s after the last pointer move, then rests on one frame. Reduced motion draws one frame. Without WebGL2 the CSS glow stays.
- The credit chip sits in the middle. On hover or focus its bands light and "onnøzelaer" rises in under it, letter by letter, out of a blur, in a kept place. Under that, one row of quips in lower-case mono: "some of these are very wonky and may suffer from *ss performance", a faded dash, "made with the help of ai". A phone stacks them and drops the dash.
- The Clock shows no site version. `?all` keeps it.
- `clock.js` builds the footer from its own markup.
- Never clip on the root: the body then clips at its 8 px margin and boxes the glow.

## Wordmark

- The letters flash the footer's hues left to right: `mark-1` to `mark-8` in `DESIGN.md`. The menu title and `MARK` in `shared/stim.js` hold the same eight values.
- The wordmark and every heading are B612.

## Loading

Numbers: `docs/plans/loading.md`. The menu opens in stages and never holds for a gate.

- The wordmark, tagline and labels wait for their fonts (`data-fonts="wait"`, 1.2 s at most), then fade in once. No fallback face shows.
- Fonts load from `shared/fonts/`. No page links a font host for Gabarito or B612.
- At a click, the toy's tile shows the intro hairline under its icon (`.go`) after 0.25 s until the toy's page comes. Reduced motion gets a still line. A page from the history shows none.
- While the page loads, the comet head waits at twelve and breathes (`main::before` in `clock.css`, after 0.4 s). `clock.js` sets `data-clock="wait"` at the deal and `"on"` as the comet starts. Reduced motion gets a still dot.
- The view script and `clock.css` load in the head, so no paint shows the plain shelf before the Clock.
- All menu motion runs at 30 fps: GSAP through `gsap.ticker.fps(30)`, the tube and the glow through a 30 fps step in their frame loops.
- `clock.js`, `tube.js` and `gl.js` preload from the head. The credit line waits for `data-clock`.
- The Clock waits for the whole page, because the icon script draws some icons.

## Stills and loops

- Every main-shelf toy has one 512 px WebP still in `shared/stills/`. `tools/stills.mjs` captures them; its header holds the command and the poke per toy.
- Renew a still when the toy's look changes. A toy that joins the main shelf needs one.
- A toy listed in `shared/loops/index.json` plays `shared/loops/<id>.mp4` in the tube, only while in hand.
- A loop is 5 s, 256 px, 24 fps, H.264, no sound. Its end cross-fades into its start. `tools/loops.mjs` captures them. A toy with no good loop keeps its still.

## Menu icons

Rules for drawing icons: `icons/AGENTS.md`.

- Each icon is inline SVG of the toy's own object, live under the pointer.
- It reacts to the pointer (enter, move, leave). A GSAP 3.13 timeline gives its idle motion: `toys.<id> = { play, rest }`.

## Series

- Every toy carries `series` in `toys.json`. `series.json` defines each key (`name`, `nl`, `kind`, `icon`, `badge`, `color`); its key order is the section order.
- One series per toy. Where a place and a theme both fit, the place wins.
- The Series switch (in `?all`) groups the shelf under dividers or lays it flat. The main shelf opens flat; the Lab opens in sections. The choice is kept in `stimming.series`. No JS or a failed fetch leaves the flat shelf.
- Divider: a wavy line in the series colour, the icon and the name in its gap. No counters.
- The Lab has two more sections, in both views: Slate first, Bench last. `"slate": true` in `toys.json` puts a toy in Slate, for promotion later. `"bench": true` puts an iteration piece in Bench. An empty section does not show.
- Series icon: a shot in a hexagon ring, in the series colour. `shared/series/shots.js` holds every shot and `shotIcon()`.
  - A shot is a small Dutch-angle picture, its subject whole and centred, on a sky in the series hue. It draws the idea of the series, never one of its toys.
  - No gold border, sparks, depth, tilt, wobble, sheen or birds. Every series wears the same thin ring.
- The old badge and constellation code stays off (`SERIES_ON`).

## Site version

- The footer shows `0.N` in `?all`; its codename is in the tooltip.
- It steps once per signed-off toy. The codename is that toy's Dutch name from `toys.json`. Tom may set a version himself.
- Signed off: `data-done` on the toy's `.intro` div and its menu `li`. Nothing on screen shows it. Only Tom gives it.

## Workbench

`menulab/` tries other menu concepts in a frame: Dozen, Clock, Dial, Drum. A menu concept must stay usable first.

## Favicon

- The menu shows an S in a black circle; it moves one hue of twelve on each load (`shared/favicon.js`).
- A toy page shows its full-colour menu icon, from `shared/favicons/<id>.png`.
- After a menu icon changes, run `node tools/favicons.mjs <base-url> <id>` against a local server, and commit the PNG.
