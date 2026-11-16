# Stimming

Read ADJUDANT.md first. It is generated; do not edit it.

`stimming` · type: `coding` · vault: [[stimming/brief|stimming]]

> Small interactive desk toys for the office, used as one directory: a menu, and one self-contained page per toy on a shared wrapper.

## What this is

Plain HTML and JS. No build step. Each toy is its own page in its own folder.
Read `README.md` for the toy list and the full rules.

## Where things live

| | |
|---|---|
| Working tree | (this folder) |
| Remote | `git@github.com:TomVDH/stimming.git` (private), branch `main` |
| Site | <https://tomvdh.github.io/stimming/> (GitHub Pages; the claude.ai Artifact is retired) |
| Canonical context | [[stimming/brief]] |
| Decisions | [[stimming/decisions]] |
| Sessions | [[stimming/sessions]] |
| Handoff | [[stimming/_handoff]] |

## Layout

- `index.html` is the menu: a body fragment; the Pages build adds the doctype and viewport.
  - Views (Tom, 2026-11-16). A small script in the head sets `data-view` on the root from the address:

    | Address | `data-view` | Shows |
    |---|---|---|
    | `./` | `clock` | The Clock, the default: twelve main-shelf toys on a dial. |
    | `./?all` | `all` | The whole main shelf, the old default. The Series switch, the Lab link and a Clock link show only here. |
    | `./?lab` | `lab` | The Lab shelf. |

  - The Clock is `shared/menu/clock.css`, `shared/menu/clock.js` and `shared/menu/tube.js`; `index.html` only links the first two. It deals twelve toys from a shuffled line, so no toy comes back before the rest had a turn.
    - Middle of the dial: the name and the motto (`tag` in `toys.json`) of the toy in hand. With no toy in hand the middle is empty: no words, no picture (Tom, 2026-11-16). It has no counter (Tom).
    - The tube (Tom, 2026-11-16): the toy in hand shows as a picture in the middle (`shared/stills/<id>.webp`, or its loop). `tube.js` draws it in raw WebGL2 on `shared/gl.js`, in one pass, on a change only. Its look has two models, both Tom's: the oscilloscope's screen (`scope/index.html`) and the railgun sight's image tube (`nvg/tube.js`), "but in colour".
      - From the screen: a slight bulge (Tom: "less convex"; the strong concave warp is gone), a quiet aperture grille, scan lines that burn wider where they are bright, halation from the still's low mip levels, a faint band that rolls down, and a power-on (a dot opens to a line, then to the raster) when the first toy comes.
      - From the sight: fine grain with no grid in it, new each field, uneven across the face in slow patches (Tom: "non-uniform noise"; a coarse blotchy grain was "really fucked"), a few dead spots, a rare spark, a soft rim.
      - The warble (Tom: "what happened to crt warble", then "better warble, it looks so bad"): each scan line sits a hair off, and a tracking band climbs the face about every twelve seconds. Two slow sine sways were rejected.
      - Words: the name (plain B612) and the motto burn in, after the sight's key. The core is always white; a soft band round each letter works against the picture (a faint negative on a dark picture, a deep shade on a bright one). The page keeps its own words for screen readers, and shows them if the tube fails to build.
      - It is dark and deep in colour, and lies behind the clock (Tom: "darker and deeper in color", "it is behind the clock"): a steep curve, more of each hue, full strength in the middle only.
      - It stays in colour; in the Clock only the words are white. It has no hard edge and is wider than the clock (its plate is 124% of the face): it runs behind the ring of toys and fades out past it.
    - The Clock's footer (Tom, 2026-11-16: "footer gradient needs work and mesh oklch blending, interactivity; the onnozelaer badge needs to be integrated more neatly", then "do something nicer with the footer"). The glow is a small shader, `shared/menu/mesh.js` (raw WebGL2 on `shared/gl.js`, at 0.4 of its CSS size): a slow field of noise picks from a run of hues (magenta, violet, cyan, green, amber, red), mixed in OKLab, and rises from below the edge as a low horizon (340 px at most; Tom: "less tall") that is dimmer at the very foot. The pointer stirs the field and brightens it. It moves for 2.6 s after the last pointer move, then rests on one frame; reduced motion draws one frame. Without WebGL2 the footer keeps the menu's CSS glow. The mark sits in the credit line in place of its own name ("yet another [mark] concoction · made with AI"); `clock.js` moves it there, with the version over it, so the footer's markup in `index.html` is unchanged and `?all` keeps the old footer. Never clip on the root: the body then clips at its 8 px margin and boxes the glow.
    - The wordmark's letters flash in the footer's run of hues, left to right: magenta, violet, blue, cyan, green, lime, amber, red (Tom, 2026-11-16: "bring our rainbow colors from footer to the wordmark as the interaction colours on the letters"). The menu title (`index.html`) and `MARK` in `shared/stim.js` hold the same eight values; `DESIGN.md` lists them as `mark-1` to `mark-8`.
    - Unattended (Tom, 2026-11-16: "funny stuff" when the clock is left alone): after 12 s with no pointer, key or touch, the clock runs by itself. Each hour in turn puts its toy on the tube, with its name and motto, for 3.6 s. After two laps it stops, so an empty room burns no power. Any input stops it. Reduced motion has no such show. This is the first gag; Tom may ask for more.
    - Font trial (Tom, 2026-11-16: "temporarily change all headings to the Airbus font"): the wordmark is B612, the Airbus cockpit face. For now every heading is B612 too: the clock's name (`tube.js`), the menu's headings (the last block of `clock.css`) and the toy pages' headings (the last block of `shared/stim.css`). Each block says how to end the trial. Decide before the PR merges: the `stim.css` block changes every toy page.
    - Process note (Tom, 2026-11-16): change one thing in the Clock at a time and look at it. A batch of five changes at once (wide tube, layouts, footer, a ray burst) was rolled back.
    - Loops (Tom, 2026-11-16: "we need more loops, 5 s long"): a toy named in `shared/loops/index.json` plays `shared/loops/<id>.mp4` in the tube in place of its still, only while it is in hand. A loop is 5 s, 256 px, 24 fps, H.264, no sound; its end cross-fades into its start, so it has no seam. `tools/loops.mjs` captures them. A toy with no good loop keeps its still.
    - Tom tried the tube as a faint full-page background first and moved it back into the circle "for now"; commit `f99f825c` holds the full-page build.
    - The intro (Tom, 2026-11-16: "redo the intro for the clock, how it all comes into play", and "the radial anim, let's change and redo that"): a bright head with a soft tail runs once round the rim in 1.5 s, from twelve o'clock. The sixty minute marks light behind it, and each toy arrives (from small, turned, with a little overshoot) as the head passes its hour. Then the outline fades, and on a fresh page the tube warms up to snow, holds, and switches off as a real set does: the raster shrinks to a line, then to a bright dot that fades. The intro waits for the tube's shader build (at most 0.9 s), and the footer's shader starts after the intro, so no build stalls the sweep. A Re-roll clears the old dozen in the head's order, then runs the same sweep. Reduced motion or a hidden tab shows the dozen at once. `docs/qa/clock/intro.mp4` is a recording.
    - The selection: the tube masks its own picture away in a soft wedge, from the middle out to the toy in hand, so the icon stands on the clear page (Tom: "take off multiply, just mask out the tv in a wedge shaped blob"). The wedge turns the short way to the pointer and opens and closes with an ease; `tube.js` draws it (`aim()`), so there is no selection element in the page. Tom's earlier picks and rejects: a multiply dark spot, a white halo, a ring and a beam of light (all replaced), a comic ray burst and a hard-edged glow (rejected).
    - No square shapes anywhere (Tom: "no square cutouts to anything, ensure smooth blending"): every edge of the tube, its power-on and its wedge is a soft falloff.
    - The Re-roll (key R) shows after 5 s, under the clock (Tom moved it out of the circle). The Clock has no link to `?all` (Tom cut the `All toys` link); `?all` is a flag, as `?lab` is.
    - No JS, a failed load or an error leaves the whole shelf. Reduced motion or a hidden tab deals with no motion.
  - Stills: one 512 px WebP per main-shelf toy in `shared/stills/`. `tools/stills.mjs` captures them in headless Playwright; its header holds the run command and its table holds the poke each toy needs. Renew a toy's still when its look changes. A new main-shelf toy needs one.
  - Main shelf (42): morpher, pop, fidget, domino, pins, galaxy, prism, kaleido, ferro, neon, magnet, soap, glass, chladni, pendulum, pool, putty, scope, walker, fire, rain, tvtree, balloons, bubbles, lava, eyes, sonar, trails, shadyos, window, chamber, ink, windmap, vortex, dijkstra, fireworks, launch, frietkot, railgun, trainride, foghorn, washline.
  - Lab (`section.lab`, 61 toys): all other toys. It shows only at `?lab`; `lab/` redirects there. Only the whole shelf (`?all`) links to it; the Clock has no link to it.
- Menu icons are inline SVG: the toy's own object, drawn from its real frames, live under the pointer.
  Never a two-tone hard offset shadow: no dark copy or slab offset behind the shape (Tom, 2026-11-09). A soft halo is fine.
  A GSAP 3.13 timeline animates each icon on hover: `toys.<id> = { play, rest }`.
- `icons/index.html` is an unlinked lab of old icon directions. The spheres are rejected.
- Icon iteration happens per toy, in that toy's own chat. Tom starts those chats; do not iterate icons across toys here.
  Tom's icon verdicts live in `icons/picks.json`.
- Icon standard (Tom, 2026-11-15). A toy has at most three icons:

  | Icon | What it is |
  |---|---|
  | Current | The icon on the menu today. |
  | Shaded object | The toy's own object in full colour: glossy, in the toy's colours, with the menu's shared light (a rim and a soft top-left glint). It stands free on the menu ground. |
  | Isometric block | The one alt style. The toy's object stands on a block, or is the block, in 30 degree isometric view: a light top, a mid left face, a dark right face, a rim highlight on the top edges. |

  - Draw no other style: no Stencil cut-out, no Single-weight line, no Abstract mark.
  - Draw in the menu's own language (Tom, 2026-11-15: a small model of the toy is "really bad"). Look at the main-shelf icons first. One bold object fills the box. Its body is one gradient, then the same shape with the shared `lit`, then a `rim` line 2 wide. Details are few, flat and bold. No dark outlines, no thin lines, no tiny parts, no sparkle clutter. Prism, Fidget board and Heat putty are the reference.
  - `icons/sheet.html` is the reference: one row per toy in `toys.json` order, with Current, Shaded object and Isometric block as Icon, Intro logo (the luminance emblem) or Both. An empty slot says `To draw` or `Cut`.
  - Every icon on the sheet stays live under the pointer (Tom, 2026-11-15). The Current column is the menu itself in a frame, so each tile keeps its own hover; each alt pair is its gallery in a frame. Never swap a live icon for a still copy.
  - Read the sheet before any icon work. Generate no icon until the sheet shows its slot; when the sheet is out of date, renew the sheet first.
  - Tom marks a tile or an empty slot on the sheet with a click; `Copy marks` gives the list as JSON.
  - A new round is one gallery, `icons/spike-<toy>-<n>.html`, with three cards: Current, A (Shaded object) and D (Isometric block). Then add the toy to the sheet's `GALLERY` table.
  - Emblems go to `icons/spike/emblems/<toy>-a.svg` and `<toy>-d.svg`. The gallery also carries each emblem as a data URI, so it shows when the page opens as a file.
  - Every icon reacts to the pointer, shows at 128 and 64, and fills 110 of the 128 box on its long side.
  - Open the sheet over the local server (`icons/sheet.html`); a file link opens it without its data.
  Cut directions move to `icons/archive/` (list: `icons/archive/cut.json`, emblems: `icons/archive/emblems/`). Leave that folder out of context unless Tom asks.
  The spike galleries still hold cut directions' code for reference; the icons page hides them.
  `icons/sheet.html` is the one icons page (see the icon standard above).
  The galleries are `icons/spike-<n>.html` and `icons/spike-<toy>-<n>.html`; emblems sit in `icons/spike/emblems/<id>-<a..e>.svg`. In every gallery A is the Shaded object and D the Isometric block. Older galleries keep their B, C and E cards for reference; the sheet does not show them.
- `shared/stim.css` and `shared/stim.js` are the shared shell.
  `stim.js` exports `initPage({ id, bar })`, `sound`, `audioKit`, `choices`, `fitCanvas`, `whenVisible`, `reduced` and the OKLCH helpers.
  It also holds the site-wide graphics quality (`stimming.quality`): `quality()`, `setQuality()`, `onQuality()`, `pixelRatio()` and `qualitySetting(tray)`. High renders at the screen's own pixel ratio (up to 3) with no pixel budget; Standard keeps each toy's caps. `fitCanvas` follows it. On High, a toy's slow-frame step falls back to Standard, not to 1x; a new quality choice clears it.
- Toy page skeleton, v1 (the main shelf uses it, except Galaxy on Bar v2):
  1. `<header data-shell>`. `initPage` fills it with the mark, a back arrow and the sound toggle.
  2. `.stage.stage--<id>`, then `.bar` with `.choices`, `.actions` and `dl.how`.
  3. `section.about` with `h1.display` and a `.vignette`.
- Glass uses the shell but keeps its old header. Other Lab toys keep their own inline shell until Tom picks them.
- `morpher/lab.html` is the old full Morphset page, `noindex`.
- `tvtree/channels.js` holds the TV tree's 155 channel shaders in seven groups of 25, one shader each.
  `tvtree/channels.html` is the live contact sheet. `tvtree/lab.html` is the older four-tree lab, `noindex`.
  Publish all three TV tree files with the page.
- Window seat's Vancouver world is the default flight (Tom, 2026-11-15): it passes over a baked map of the Lower Mainland. `window/?van=0` flies the invented country; `?ode` still wins.
  `window/van.js` holds the track, the start, the airports and the loader. `window/van-coast.png` and `window/van-land.png` are the map (641 KB); `tools/vancouver/bake.py` bakes them and names the sources.
  `outsideFS({ van: true })` builds the map code into the outside pass; the usual pass and Classic compile none of it. `?vy=km` moves the track north and `?peer=x,y,z` leans the head, for screenshots.
- `glasslab/` (noindex) is a dev page for pane rain: every glass-rain shader split A/B at full resolution, with knobs. `shared/glassrain.js` (Tom's base, 2026-11-09) and `shared/bokeh.js` are the shared shaders it tests.
- `shared/environment.js` is the environment runner: a raw WebGL2 toy gives one GLSL function, `vec3 envScene(vec2 uv)`, and gets every bundle wired into the frame, with weather, the hour, quality and the slow-frame watch. Start a new environment toy from it.
- `shared/gl.js` is the raw WebGL2 kit: `program`, `linked` (the parallel-compile poll, the error log, the uniform map), `target`, `msTarget`, `renderable`, `free`, `bind`, `to`, `tri` with `TRI_VS`, `nextFrame` and `onContextLoss`. It never imports three.js. Bismuth is its reference port; a raw WebGL2 toy adopts it in its own chat.
- `shared/fire.js` is the fire and smoke module (Compute: three.js 0.186.1, WebGPU, TSL): `createFire({ THREE, TSL, curl, renderer })` gives a 3D fluid with emitters, a lit volume (`volume()`), `step`, `clear`, `dispose`, and every knob as a uniform in `u`. It imports nothing; the toy passes the namespaces. Fire is its reference port. Reach and the WebGL question: `docs/plans/fire-smoke.md`.
- `fxlab/` (noindex) is the dev page for the shared shader library (`docs/plans/shared-shaders.md`): "All effects" stacks every shared shader on one window scene, each on a switch with its sliders: Wet glass (`shared/wetglass.js`: drops, runs, fog and bokeh scatter in one call, over `glassrain.js` and `bokeh.js`), Water (`shared/water.js`, with rain rings), Rain and snow in the air (`shared/precip.js`, a screen effect), Sky and haze (`shared/sky.js`: sky by direction, stars, a cloud deck, height haze; `skyAt(hour)` gives the palette for any time of day), Lens flare (`shared/flare.js`), Glow (`shared/glow.js`: light orbs, and `bloomChain(gl)` for raw WebGL2), Grade (`shared/grade.js`), Output (`shared/output.js`: film curve, sRGB, dither, for raw WebGL2 toys). `shared/weather.js` drives the glass, the water, the air, the clouds and the haze from one value, dry to storm. `shared/detail.js` joins the site quality with a slow-frame watch into one level (High, Standard, Low); each bundle maps that level to its budget (`waterDetail`, `wetGlassDetail`). The library's purpose (Tom, 2026-11-10): bundled shaders that quickly make responsive, reactive environments; glass effects stay one group. "Check a copy" runs a toy's own copy (A) against the module (B), in raw WebGL2 or a three.js `ShaderMaterial`, with a difference readout. A new module gets a card in the stack. A toy adopts a module in its own chat, never from the library chat.
- `<id>/legacy.html` keeps an older build of a toy (`noindex`), reached from the header's Classic link: today Pop field (CPU-lit), Heat putty, Caustic pool, Prism, Glass, Neon sign, Lava lamp and Spark wheel (the WebGL build).
  A Fresh page that needs WebGPU goes to its `legacy.html` by itself when the browser has no `navigator.gpu` (Spark wheel is the first); `legacy.html` never redirects.
- `toys.json` (root) is the one source for each toy's name, number, intro subtitle, emblem, Dutch (Flemish) name and IPA. The intro reads it (the menu shows English names only); each page's own intro text is only the fallback. It also holds an optional motto (`tag`, `tagNl`) that the intro shows under the subtitle; the number stays off in the intro (the lab can show it). Tom sets the Dutch words and mottos. Add a new toy here.
- `toys.json` shape: one entry per toy, every field present, in this order: `name`, `nl`, `ipa`, `tag`, `tagNl`, `number`, `series`, `stage` (`alpha`, `beta` or null), `version`, `emblem`, `accent`, `sound`, `legacy`, `sub` (the Lab tag). Main shelf toys come first by number, then the Lab by name. Use null, not a missing key. `accent` is the toy's accent: one CSS colour (OKLCH) or a `linear-gradient(...)`. The Signal intro inks the logo with it; other surfaces may use it. The first set (2026-11-09) is a proposal; Tom sets the final ones. `version` is the toy's own version, a string. Tom set every main shelf toy to `"1.5"` on 2026-11-15, the baseline before the code-health ports (`docs/plans/ports.md`); Lab toys hold null. Internal only: nothing on screen shows it.
- Series: every toy carries `series: "<key>"` in `toys.json` (a new toy needs one; a toy with none shows last, in a section with no name). `series.json` (root) defines each key: `name`, `nl`, `kind` (`place` or `theme`), `icon` (a shot name), `badge` (an old SVG, or null) and `color`. Its key order is the section order.
  Eleven series (Tom, 2026-11-15): `vistas` (Vistas, the cinematic scenes), the places `eastvan` (East Van) and `belgian` (Belgium; the key stays), then `poke` (Poke & pop), `light` (Light & glass), `goo` (Goo), `science` (Science fair), `maths` (Maths class), `dark` (After dark), `wild` (Wild), `odd` (Odd one out). The Flemish names of the five new ones are placeholders; Tom sets them.
  One series per toy; where a place and a theme both fit, the place wins (Tom, 2026-11-14).
  The Series switch (a small wave and the word, at the top of the menu) groups the shelf in view under dividers, or lays it flat in its old order. The main shelf opens flat and the Lab opens in sections; the choice is kept in `stimming.series`. No JS or a failed fetch leaves the flat shelf.
  Tom's picks (2026-11-15): the Wave divider (a wavy line in the series colour, the icon and the name in its gap; no counters) and, as the icon, a shot in a Hex ring: a small hexagon crop inside a thin hexagon outline in the series colour. He picked Wave twice, the second time over editorial styles.
  A shot is a small Dutch-angle picture with its subject whole and in the middle of the frame, on a sky in the series hue. A series icon points at no toy: it draws the idea of the series. `shared/series/shots.js` holds every shot and `shotIcon()`. East Van (Wires), Belgium (Flag, centred, turquoise) and Vistas (Layers, in the Mint colourway) are Tom's picks; a shot may set a `zoom`. The other eight shots are proposals.
  Tom's rulings on series icons (2026-11-15): no gold border, no sparks ("tacky"); no depth, tilt or wobble icons; no sheen; no birds on the East Van and Belgium icons. Every series wears the same thin ring in its own colour.
  `serieslab/` is the lab: `shots.html` (every shot, with a large stage and tilt, frame, line and Vistas colour knobs), `blocks.html` (single-block icons Tom liked, kept for later). `places`, `systems`, `funk` and `iso` there are rejected directions. The old badge and Constellation code stays off (`SERIES_ON`).
- `menulab/` (noindex) is a probe on other ways to do the main menu (Tom, 2026-11-15): the live menu runs in a frame, shows twelve toys and has a Re-roll (key R); a roll never repeats a toy before the rest had a turn. Four concepts on a switch, Tom's shortlist (2026-11-16): Dozen (the default, four by three), Clock (toys on a dial, the name in the middle), Dial (the Clock with a ring of minute marks and a hand) and Drum (three reels of four that spin; each reel has a Spin button, keys 1 to 3). Dial and Drum move with GSAP from the menu in the frame. Sixteen other concepts are cut; git history keeps them. The Awwwards-style set was "fun but not usable": a menu concept must stay usable first. Tom picked the Clock as the menu's default view on 2026-11-16 (bean `stimming-1rv3`); the probe itself changes nothing on the menu.
- Version tag (`0.N` beside the onnozelaer mark in the footer, shown on hover; the codename sits in its tooltip); the tagline sits under the title: `v0.N` steps once per signed-off toy; its codename is that toy's Dutch name from `toys.json`. Now v0.11 "Hemelvaart" (Ten seconds). Tom set 0.5, 0.5.1 and 0.11 himself: 0.11 (2026-11-16) marks the Clock menu, with no new signed-off toy, so the codename stays. The next signed-off toy makes 0.12.
- The intro (`shared/intro.js`) ships the Signal variety for now (Tom, 2026-11-09): `DEFAULT_VARIETY` names it, `TIMING` is the base table. Signal keeps Classic's beats. Classic and the other looks stay in the lab for later. The other varieties in `VARIETIES` are proposals. `introlab/` tunes any variety live (`?v=<variety>`), with a size knob per line, line spacing, line Y and four font slots. Static mode holds every line on screen. No knob moves the logo.
  Restyle looks (proposals, group Restyle): Brut, Label, Poster, Plate, Signal, Readout, Strobe. Signal flashes white, then its logo takes the toy's ink (the title stays white): the toy's `accent` from `toys.json` (white without one). Strobe keeps its blinks and hard cuts, fitted inside the shared beats. A look is a variety with `look` (its CSS block, `.intro[data-look]`), `style` (sizes, places, `padK`, `blur`, `dim`), optional `stack` (subtitles stay under the translation) and `fonts` (the lab's four slots). Every look shares Classic's beats (`CLASSIC`); `tableOf()` drops any beat key from `style`. The lab groups its knobs as Layout, Type, Box, Glass and Timing; Timing is locked to the variety's table until Tom unticks the lock. Toggles sit under Options.
- A toy Tom signs off gets `data-done` on its `.intro` div and on its menu `<li>`. It is an internal note only: nothing on screen shows it, no tick and no divider. Only Tom bestows it.

## Running

```bash
python3 -m http.server 8000
```

Open <http://localhost:8000/>. All links are relative.

## Publishing

The claude.ai Artifact is retired: never publish to it.
Build locally, commit and push to `main`. GitHub Pages deploys every push to <https://tomvdh.github.io/stimming/> (`.github/workflows/pages.yml`).

## Conventions

- Dark only. Colours are OKLCH tokens. The font is Gabarito; menu toy labels use the self-hosted Iosevka Term Slab in caps.
- Libraries: Tom picked one set. Add no other library without Tom.
  Renderers: use the lightest tier that draws the idea: DOM/SVG, Canvas 2D, raw WebGL2 (GLSL), then three.js for real 3D scenes. Offer WebGPU wherever it helps performance (three.js `WebGPURenderer` falls back to WebGL2); short list in epic `stimming-2s6y`. Guide, costs and the audit of every toy: `docs/stack.md`.
  Code health (stack types, shared modules, toy docs, TypeScript): `docs/code-health.md` holds Tom's decisions and links each plan.

  | Role | Library |
  |---|---|
  | Rendering | Raw WebGL2 for shader toys; three.js 0.170.0 for 3D scenes (Galaxy, Fire, Ink Water and Spark wheel keep the 0.186.1 WebGPU build) |
  | Colour | culori 4.0.1 |
  | Sound | Tone.js 15.0.4 |
  | Motion | GSAP 3.13.0 (the menu keeps the cdnjs UMD build) |
  | Noise | simplex-noise 4.0.3 |

  Every toy page that uses them carries this importmap, word for word:

  ```html
  <script type="importmap">
  {
    "imports": {
      "three": "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js",
      "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/",
      "culori": "https://cdn.jsdelivr.net/npm/culori@4.0.1/+esm",
      "tone": "https://cdn.jsdelivr.net/npm/tone@15.0.4/+esm",
      "gsap": "https://cdn.jsdelivr.net/npm/gsap@3.13.0/+esm",
      "simplex-noise": "https://cdn.jsdelivr.net/npm/simplex-noise@4.0.3/+esm"
    }
  }
  </script>
  ```

  `shared/stim.js` imports culori by the same URL, so it loads once. Its colour helpers are `oklchLinear`, `oklchRgb`, `linFit` and `css([L, C, h], alpha)`.
  For sound, `audioKit()` returns a kit; `await kit.tone()` gives Tone.js on the kit's context. Connect Tone nodes to `kit.out`, so mute-by-default, gesture start and sleep still hold.
  Pop field (`pop/`) is the reference port.
- Intro layout: under the logo, main title (`name`) and translation (`nl`, `ipa`). At the foot of the screen, subtitle (`tag`) and subtitle translation (`tagNl`), both lifted -14 (`tagY`, `tagNlY`), then the audio notice centred: headphones plus "Best with sound". The number, when not in the box, sits bottom left. The classic notice stays off for now (`classic` param; it sits under the main title). `textFlash` wipes the title in as a box during the flash; the other lines open at settle (off for now; toggle in the lab). Each line has a Y knob (`clsY`, `nameY`, `nlY`, `tagY`, `tagNlY`, `sndY`); the lab's Static mode holds every line on screen to tune them. Stages: big flash box with the inverted logo, flash box at size, then rest mode, where the titles animate in. The logo's centre is one fixed point (`--origin` in `shared/intro.css`) at every stage and never moves; the copy hangs below it and shrinks to fit. Lab toys also carry a lab tag (`sub`).
- Fresh is the standard: the menu always opens a toy's `index.html`. Classic stays an option wherever an older build exists.
- Legacy: when a toy ports to the library set, its pre-port page is kept as `<id>/legacy.html` (with `noindex`). Set `legacy: true` on the toy in `toys.json`; the shell header then shows one link to the other build, Classic or Fresh, with the intro's flash box.
- Control bar standard: Bar v2, the Corners shell (Tom, 2026-11-09). Full spec: `docs/plans/bar-v2.md`. Diegetic proposals and Tom's verdicts: `docs/plans/bar-v2-diegetic.md`.
  The toy passes one `bar` spec object to `initPage`; the shell builds every control in the `.stim-ui` layer over the stage.

  | Slot | Holds | Limit |
  |---|---|---|
  | Top left | Stimming logo (unboxed), `/ TOY NAME`, then the choice | One choice group: `segments` (five or fewer), `stepper` (more), or `tray` (icons) |
  | Top right | Sound, Settings, Dev (only with `?dev`), (i). The Classic or Fresh link (only with `legacy`) sits in Settings, under Build | Fixed order; does not count to the limit |
  | Bottom left | Actions | Three at most |
  | Bottom right | Main slider | One at most; a word label, no number |
  | Bottom centre | Key strip | Four entries at most |

  - At most five visible controls; a choice group counts as one. An empty slot draws nothing.
  - Shared verbs: `+ Noun` adds, `Shuffle` (die icon) randomizes, `Clear` empties, `Reset` returns to the start. With Clear shown, Reset lives in the Settings footer. One-word literal verbs are fine (Drip, Blow, Release).
  - Everything else goes in the Settings sheet; the site quality row sits there too.
  - Settings and Dev (Tom, 2026-11-12, the standard for every toy): Settings holds only what anyone playing with the toy may want (comfort, controls, performance). Tuning for the people who build the toy (look, tone, sound picks, dev pins) goes in the bar spec's `dev: [...]` rows. The shell shows a Dev button (a code bracket) beside Settings only when the address has `?dev`; the rows always exist, so the toy reads their values everywhere. Railgun is the first toy on it; others move when Tom picks them.
  - The key strip shows keycap then verb (`[CLICK] place`), swaps words by pointer, and fades after three gestures or 8 s; (i) brings it back.
  - Phones (stage under 640 px): the choice moves bottom left as a stepper or tray chip, actions bottom right, the slider into Settings. Touch targets are 34 px.
  - Mobile and compliance (Tom, 2026-11-09): every shell change and toy port holds the spec's list. Check 1280 px, 375 × 812 and 812 × 375. The shell measures collisions; never rely on a breakpoint alone. `tests/bar-v2.html` must pass.
  - Un-migrated pages keep v1 (`header[data-shell]`, `.bar`, `choices()`) until Tom moves them. Galaxy is the reference port.
- Copy: no blurbs or taglines on the toy. Writing lives only in the vignette: a short heading, two plain paragraphs, a small figure.
- Sound is synthesized with Web Audio. It is muted by default and starts after a user gesture. The choice is remembered in `stimming.<id>.sound`.
- Hold 30 fps or better. Idle pages do no per-frame work. Respect `prefers-reduced-motion`.
- Code comments follow ASD-STE100: one fact per line, twelve words or fewer, active voice, present tense.
- Never use brand names for toys. Tom's own exceptions: Domino Day, Strandbeest.

## Taste

- Daring, zany and original. Never skeuomorphic or fussy.
- Harmonograph and Music box were "way too involved". Bare-minimal is "too minimal".
- Shader-rich toys land well: Glass, Rain, Bubbles, Galaxy.
- S tier: Prism, Googly eyes, Fire, Pin art.

## Process

- Perfect one thing first. Never roll a change across all toys at once. Tom picks which toys get it.
- New toys start in the Lab. A toy reaches the main shelf only after Tom vets it (Tom, 2026-11-09). Never move a toy to the main shelf on your own.
- Commit and push after every change, one logical commit at a time.
- Toy chats can share one checkout and one git index. Never `git add -A`, `git commit -a` or a whole-file `git add index.html`.
  Commit only through `tools/commit.sh -m "msg" [--hunks <patch>] -- <paths>`; it commits and pushes. For shared files, pass your hunks: `git diff HEAD -- index.html`, trimmed to yours.
  Check the menu script parses before you push. Never revert another toy's changes.
- QA in headless Playwright with GPU flags: `--enable-gpu --ignore-gpu-blocklist --use-angle=metal --enable-unsafe-webgpu`.
  Check syntax, a clean console, the interactions, and screenshots at 1280px and 375px.
- Show Tom screenshots early. Keep status lines short.

## Open items (only when Tom asks)

- Icons and emblems: per toy, in each toy's own chat (Tom starts them).
- Vignettes for the other six main toys.
- Fine-tune pass: vary the purple stage tints per toy; Kaleidoscope zooms in too far; Glass and Coil stall on the first tap while audio starts.
- Move selected Lab toys onto the toy view.

## Claude-specific overrides

Live in `CLAUDE.md` next to this file. CLAUDE.md `@`-imports this file.
