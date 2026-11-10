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
  - Main shelf (39): morpher, pop, fidget, domino, pins, galaxy, prism, kaleido, ferro, neon, magnet, soap, glass, chladni, pendulum, pool, putty, scope, walker, fire, rain, tvtree, balloons, bubbles, lava, eyes, sonar, trails, shadyos, window, chamber, ink, windmap, vortex, dijkstra, fireworks, launch, frietkot, railgun.
  - Lab (`section.lab`, 39 toys): all other toys. It shows only at `?lab`; `lab/` redirects there. The menu has no link to it.
- Menu icons are inline SVG: the toy's own object, drawn from its real frames, live under the pointer.
  Never a two-tone hard offset shadow: no dark copy or slab offset behind the shape (Tom, 2026-11-09). A soft halo is fine.
  A GSAP 3.13 timeline animates each icon on hover: `toys.<id> = { play, rest }`.
- `icons/index.html` is an unlinked lab of old icon directions. The spheres are rejected.
- Icon iteration happens per toy, in that toy's own chat. Tom starts those chats; do not iterate icons across toys here.
  Tom's icon verdicts live in `icons/picks.json`; D and E stay as the iteration columns.
  Cut directions move to `icons/archive/` (list: `icons/archive/cut.json`, emblems: `icons/archive/emblems/`). Leave that folder out of context unless Tom asks.
  The spike galleries still hold cut directions' code for reference; the icons page hides them.
  `icons/sheet.html` is the one icons page: every toy's directions (Current, A to E) as Icon, Transition (the luminance emblem) or Both; scrub and cut.
  The galleries are `icons/spike-1.html` to `spike-11.html`; emblems sit in `icons/spike/emblems/<id>-<a..e>.svg`.
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
- `glasslab/` (noindex) is a dev page for pane rain: every glass-rain shader split A/B at full resolution, with knobs. `shared/glassrain.js` (Tom's base, 2026-11-09) and `shared/bokeh.js` are the shared shaders it tests.
- `shared/environment.js` is the environment runner: a raw WebGL2 toy gives one GLSL function, `vec3 envScene(vec2 uv)`, and gets every bundle wired into the frame, with weather, the hour, quality and the slow-frame watch. Start a new environment toy from it.
- `fxlab/` (noindex) is the dev page for the shared shader library (`docs/plans/shared-shaders.md`): "All effects" stacks every shared shader on one window scene, each on a switch with its sliders: Wet glass (`shared/wetglass.js`: drops, runs, fog and bokeh scatter in one call, over `glassrain.js` and `bokeh.js`), Water (`shared/water.js`, with rain rings), Rain and snow in the air (`shared/precip.js`, a screen effect), Sky and haze (`shared/sky.js`: sky by direction, stars, a cloud deck, height haze; `skyAt(hour)` gives the palette for any time of day), Lens flare (`shared/flare.js`), Glow (`shared/glow.js`: light orbs, and `bloomChain(gl)` for raw WebGL2), Grade (`shared/grade.js`), Output (`shared/output.js`: film curve, sRGB, dither, for raw WebGL2 toys). `shared/weather.js` drives the glass, the water, the air, the clouds and the haze from one value, dry to storm. `shared/detail.js` joins the site quality with a slow-frame watch into one level (High, Standard, Low); each bundle maps that level to its budget (`waterDetail`, `wetGlassDetail`). The library's purpose (Tom, 2026-11-10): bundled shaders that quickly make responsive, reactive environments; glass effects stay one group. "Check a copy" runs a toy's own copy (A) against the module (B), in raw WebGL2 or a three.js `ShaderMaterial`, with a difference readout. A new module gets a card in the stack. A toy adopts a module in its own chat, never from the library chat.
- `<id>/legacy.html` keeps an older build of a toy (`noindex`), reached from the header's Classic link: today Pop field (CPU-lit), Heat putty, Caustic pool, Prism, Glass, Neon sign and Lava lamp.
- `toys.json` (root) is the one source for each toy's name, number, intro subtitle, emblem, Dutch (Flemish) name and IPA. The intro reads it (the menu shows English names only); each page's own intro text is only the fallback. It also holds an optional motto (`tag`, `tagNl`) that the intro shows under the subtitle; the number stays off in the intro (the lab can show it). Tom sets the Dutch words and mottos. Add a new toy here.
- `toys.json` shape: one entry per toy, every field present, in this order: `name`, `nl`, `ipa`, `tag`, `tagNl`, `number`, `series`, `stage` (`alpha`, `beta` or null), `emblem`, `accent`, `sound`, `legacy`, `sub` (the Lab tag). Main shelf toys come first by number, then the Lab by name. Use null, not a missing key. `accent` is the toy's accent: one CSS colour (OKLCH) or a `linear-gradient(...)`. The Signal intro inks the logo with it; other surfaces may use it. The first set (2026-11-09) is a proposal; Tom sets the final ones.
- Series: a toy may carry `series: "<key>"` in `toys.json`. `series.json` (root) defines each key: `name`, `nl`, `badge` (an SVG in `shared/series/`) and `color`. The menu pins that badge to the tile's top right. Hover or focus on a series tile lights its siblings, dims the rest and links them (Constellation, Tom's pick from `serieslab/`). Today: `science` (Science fair, a rosette) and `belgian` (Belgian, a tricolour). One series per toy.
- Version tag (`0.N` beside the onnozelaer mark in the footer, shown on hover; the codename sits in its tooltip); the tagline sits under the title: `v0.N` steps once per signed-off toy; its codename is that toy's Dutch name from `toys.json`. Now v0.10 "Hemelvaart" (Ten seconds); Tom set 0.5 and 0.5.1 himself.
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

  | Role | Library |
  |---|---|
  | Rendering | Raw WebGL2 for shader toys; three.js 0.170.0 for 3D scenes (Galaxy, Fire and Ink Water keep the 0.186.1 WebGPU build) |
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
  | Top right | Sound, Settings, (i). The Classic or Fresh link (only with `legacy`) sits in Settings, under Build | Fixed order; does not count to the limit |
  | Bottom left | Actions | Three at most |
  | Bottom right | Main slider | One at most; a word label, no number |
  | Bottom centre | Key strip | Four entries at most |

  - At most five visible controls; a choice group counts as one. An empty slot draws nothing.
  - Shared verbs: `+ Noun` adds, `Shuffle` (die icon) randomizes, `Clear` empties, `Reset` returns to the start. With Clear shown, Reset lives in the Settings footer. One-word literal verbs are fine (Drip, Blow, Release).
  - Everything else goes in the Settings sheet; the site quality row sits there too.
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
