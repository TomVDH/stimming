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
| Artifact | <https://claude.ai/artifact/MqswJLwcoxvYEazV2xwNTd> |
| Canonical context | [[stimming/brief]] |
| Decisions | [[stimming/decisions]] |
| Sessions | [[stimming/sessions]] |
| Handoff | [[stimming/_handoff]] |

## Layout

- `index.html` is the menu. It is an Artifact body fragment.
  - Main shelf (7): morpher, pop, fidget, domino, pins, galaxy, prism.
  - Lab (`<details class="lab">`, 36 toys): all other toys.
- Menu icons are inline SVG in an angular brut style: a hex, square or angled block with a hard offset shadow.
  A GSAP 3.13 timeline animates each icon on hover: `toys.<id> = { play, rest }`.
- `icons/index.html` is an unlinked lab of old icon directions. The spheres are rejected.
- `shared/stim.css` and `shared/stim.js` are the shared shell.
  `stim.js` exports `initPage({ id })`, `sound`, `audioKit`, `choices`, `fitCanvas`, `whenVisible`, `reduced` and the OKLCH helpers.
- Toy page skeleton (the main seven use it):
  1. `<header data-shell>`. `initPage` fills it with the mark, a back arrow and the sound toggle.
  2. `.stage.stage--<id>`, then `.bar` with `.choices`, `.actions` and `dl.how`.
  3. `section.about` with `h1.display` and a `.vignette`.
- Glass uses the shell but keeps its old header. Other Lab toys keep their own inline shell until Tom picks them.
- `morpher/lab.html` is the old full Morphset page, `noindex`.
- `tvtree/channels.js` holds the TV tree's 155 channel shaders in seven groups of 25, one shader each.
  `tvtree/channels.html` is the live contact sheet. `tvtree/lab.html` is the older four-tree lab, `noindex`.
  Publish all three TV tree files with the page.
- `<id>/legacy.html` keeps an older build of a toy (`noindex`), reached from the header's Legacy pill: today Pop field (CPU-lit), Heat putty, Caustic pool, Prism, Glass and Neon sign.
- `toys.json` (root) is the one source for each toy's name, number, intro subtitle, emblem, Dutch (Flemish) name and IPA. The intro reads it (the menu shows English names only); each page's own intro text is only the fallback. It also holds an optional motto (`tag`, `tagNl`) that the intro shows under the subtitle; numbered toys show `#N` in the flash box. Tom sets the Dutch words and mottos. Add a new toy here.
- Version tag (menu footer): `v0.N` steps once per signed-off toy; its codename is that toy's Dutch name from `toys.json`. Now v0.3 "Knalveld".
- A toy Tom signs off gets `data-done` on its `.intro` div (its intro flashes a tick) and on its menu `<li>` (it moves to the signed-off shelf up top). Only Tom bestows it.

## Running

```bash
python3 -m http.server 8000
```

Open <http://localhost:8000/>. All links are relative.

## Publishing

1. Read the Artifact before the first publish in a session.
2. Publish root `index.html` to the Artifact URL.
3. Pass each changed page in `files` at its folder path (`prism/index.html`, `shared/stim.css`, `toys.json`). Use absolute source paths.

## Conventions

- Dark only. Colours are OKLCH tokens. The font is Gabarito.
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
- Legacy: when a toy ports to the library set, its pre-port page is kept as `<id>/legacy.html` (with `noindex`). The shell header then shows a Legacy pill; the legacy page shows Current.
- Controls: one bar under the stage, five visible controls at most.
  1. Choices first, as segmented chips with `aria-pressed`.
  2. Then actions, with the shared verbs Clear, Reset and Shuffle.
  3. Then the how-to line: four entries at most, gesture then result.
  Keys show on mouse devices only. Click/Tap uses the `fine`/`touch` span pair.
- Copy: no blurbs or taglines on the toy. Writing lives only in the vignette: a short heading, two plain paragraphs, a small figure.
- Sound is synthesized with Web Audio. It is muted by default and starts after a user gesture. The choice is remembered in `stimming.<id>.sound`.
- Hold 30 fps or better. Idle pages do no per-frame work. Respect `prefers-reduced-motion`.
- Code comments follow ASD-STE100: one fact per line, twelve words or fewer, active voice, present tense.
- Never use brand names for toys.

## Taste

- Daring, zany and original. Never skeuomorphic or fussy.
- Harmonograph and Music box were "way too involved". Bare-minimal is "too minimal".
- Shader-rich toys land well: Glass, Rain, Bubbles, Galaxy.
- S tier: Prism, Googly eyes, Fire, Pin art.

## Process

- Perfect one thing first. Never roll a change across all toys at once. Tom picks which toys get it.
- Commit and push after every change, one logical commit at a time.
- QA in headless Playwright with GPU flags: `--enable-gpu --ignore-gpu-blocklist --use-angle=metal --enable-unsafe-webgpu`.
  Check syntax, a clean console, the interactions, and screenshots at 1280px and 375px.
- Show Tom screenshots early. Keep status lines short.

## Open items (only when Tom asks)

- Vignettes for the other six main toys.
- Fine-tune pass: vary the purple stage tints per toy; Kaleidoscope zooms in too far; Glass and Coil stall on the first tap while audio starts.
- Move selected Lab toys onto the toy view.

## Claude-specific overrides

Live in `CLAUDE.md` next to this file. CLAUDE.md `@`-imports this file.
