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
  - Main shelf (7): morpher, pop, fidget, domino, pins, galaxy, prism.
  - Lab (`section.lab`, 22 toys): all other toys. It shows only at `?lab`; `lab/` redirects there. The menu has no link to it.
- Menu icons are inline SVG in an angular brut style: a hex, square or angled block with a hard offset shadow.
  A GSAP 3.13 timeline animates each icon on hover: `toys.<id> = { play, rest }`.
- `icons/index.html` is an unlinked lab of old icon directions. The spheres are rejected.
- Icon iteration happens per toy, in that toy's own chat. Tom starts those chats; do not iterate icons across toys here.
  Tom's icon verdicts live in `icons/picks.json`; D and E stay as the iteration columns.
  Cut directions move to `icons/archive/` (list: `icons/archive/cut.json`, emblems: `icons/archive/emblems/`). Leave that folder out of context unless Tom asks.
  The spike galleries still hold cut directions' code for reference; the icons page hides them.
  `icons/sheet.html` is the one icons page: every toy's directions (Current, A to E) as Icon, Transition (the luminance emblem) or Both; scrub and cut.
  The galleries are `icons/spike-1.html` to `spike-11.html`; emblems sit in `icons/spike/emblems/<id>-<a..e>.svg`.
- `shared/stim.css` and `shared/stim.js` are the shared shell.
  `stim.js` exports `initPage({ id })`, `sound`, `audioKit`, `choices`, `fitCanvas`, `whenVisible`, `reduced` and the OKLCH helpers.
  It also holds the site-wide graphics quality (`stimming.quality`): `quality()`, `setQuality()`, `onQuality()`, `pixelRatio()` and `qualitySetting(tray)`. High renders at the screen's own pixel ratio (up to 3) with no pixel budget; Standard keeps each toy's caps. `fitCanvas` follows it.
- Toy page skeleton (the main seven use it):
  1. `<header data-shell>`. `initPage` fills it with the mark, a back arrow and the sound toggle.
  2. `.stage.stage--<id>`, then `.bar` with `.choices`, `.actions` and `dl.how`.
  3. `section.about` with `h1.display` and a `.vignette`.
- Glass uses the shell but keeps its old header. Other Lab toys keep their own inline shell until Tom picks them.
- `morpher/lab.html` is the old full Morphset page, `noindex`.
- `tvtree/channels.js` holds the TV tree's 155 channel shaders in seven groups of 25, one shader each.
  `tvtree/channels.html` is the live contact sheet. `tvtree/lab.html` is the older four-tree lab, `noindex`.
  Publish all three TV tree files with the page.
- `<id>/legacy.html` keeps an older build of a toy (`noindex`), reached from the header's Classic link: today Pop field (CPU-lit), Heat putty, Caustic pool, Prism, Glass, Neon sign and Lava lamp.
- `toys.json` (root) is the one source for each toy's name, number, intro subtitle, emblem, Dutch (Flemish) name and IPA. The intro reads it (the menu shows English names only); each page's own intro text is only the fallback. It also holds an optional motto (`tag`, `tagNl`) that the intro shows under the subtitle; the number stays off in the intro (the lab can show it). Tom sets the Dutch words and mottos. Add a new toy here.
- Version tag (`0.N` beside the onnozelaer mark in the footer, shown on hover; the codename sits in its tooltip); the tagline sits under the title: `v0.N` steps once per signed-off toy; its codename is that toy's Dutch name from `toys.json`. Now v0.5.1 "Strandbeest"; Tom set 0.5 and 0.5.1 himself.
- The intro (`shared/intro.js`) ships the Classic variety for now: `DEFAULT_VARIETY` names it, `TIMING` is the base table. The other varieties in `VARIETIES` are proposals. `introlab/` tunes any variety live (`?v=<variety>`), with a size knob per line, line spacing, line Y and four font slots. Static mode holds every line on screen. No knob moves the logo.
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

  | Role | Library |
  |---|---|
  | Rendering | three.js 0.170.0 (Galaxy and Fire keep the 0.186.1 WebGPU build) |
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
- Control bar standard (Tom, 2026-11-03). Left to right, one row:
  1. Choice: at most one group. Up to five options as segmented chips, one pressed (palettes: dot plus name). More than five: one stepper, `‹ Name ›`.
  2. Main slider: at most one, labelled with a word, no number readout.
  3. Actions: at most three. `+ Noun` adds; `Shuffle` (die icon plus the word) randomizes everywhere; `Clear` empties; `Reset` returns to the start. Clear and Reset never sit side by side: Reset then lives in Settings. One-word literal verbs are fine (Drip, Blow, Release).
  4. Right edge: Settings (sliders icon) for everything else, then the (i).
  At most five visible controls; a choice group counts as one; Settings and (i) do not count. Chips carry text; icon-only is only for Settings and (i).
  The shared shell gives the bar its inset, scrim and chip backing; toys do not restyle it.
- Controls: one bar under the stage, five visible controls at most.
  1. Choices first, as segmented chips with `aria-pressed`.
  2. Then actions, with the shared verbs Clear, Reset and Shuffle.
  3. Then the how-to line: four entries at most, gesture then result.
  Keys show on mouse devices only. Click/Tap uses the `fine`/`touch` span pair.
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
- Commit and push after every change, one logical commit at a time.
- Toy chats can share one checkout and one git index. Never `git add -A`, `git commit -a` or a whole-file `git add index.html`.
  Commit index.html through a private index: `GIT_INDEX_FILE=/tmp/<id>.idx git read-tree HEAD`, then `git apply --cached` only your hunks.
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
