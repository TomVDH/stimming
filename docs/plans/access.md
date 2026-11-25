# Access: smart icons and an access record per toy

Status: active · bean `stimming-9ex4` (spike). Built (stimming-fibc): the data (steps 1, 2026-11-25 code audit of every toy) and the intro row (step 4). Open: the gate and Calm, the menu glyphs, the flash meter, ColorSym.

Tom, 2026-11-24: "we also need a system of smart icons and accessibility ... we want epilepsy, motor and accessibility issues -- colorsym can be useful here".

This plan proposes the glyphs, the data, and the shell's use of the data. Nothing here is built yet. Each build step below needs its own bean and Tom's yes.
Workbenches, `noindex`, over <http://localhost:8000/accesslab/>:

| Page | What |
|---|---|
| `accesslab/index.html` | The toy desk: one toy at a time, four tabs (Icon, Feedback, Intro, Share) and a YAML tab |
| `accesslab/access.html` | The access kit: glyphs, tech tags, menu tiles, ColorSym |

Tom, 2026-11-24: "the icon -- feedback -- and intro labs go together -- per toy -- neat and easy -- we can produce a yaml with all the necessary stuff -- and lets ensure we template its use ... this template can become a bedrock for future projects".
The desk is that template: a project-free core (`desk.js`), one config (`desk.config.js`) and one module per panel (`panels/`). How to add a panel or reuse the desk: `accesslab/TEMPLATE.md`.

| Tab | Holds | Writes |
|---|---|---|
| Icon | The live Current tile, the intro logo, every round's lettered directions live from its gallery, earlier menu tiles, icon-lab directions, the pick. Keep and Cut under each; Cut asks Yes / No and offers Undo. | The icon sheet's keys, `stimming.icons.marks` and `stimming.icons.cuts` |
| Feedback | All of `inventorylab/` (Tom, 2026-11-24: "ALL functionality of the feedback toy will go into the toy bench"): the toy live with Fresh / Classic and Open; the stack readout with hover notes; the logos strip (live menu icon, emblem, flash, accent, series); verdict, priority, effort, risk, big GPU, summary; notes by area with bugs and ideas; Meta edits against `toys.json`, series, shelf wish; Modularize; tags; Save file into `docs/inventory/`, Export all, Clear (asks first); draft, saved and not-started states; Alt+J / Alt+K; the Overview of libraries and modules across every toy. | `stimming.inventory.<id>` and `docs/inventory/<id>.json`, the same as inventorylab |
| Intro | The real intro on an inline stage over the toy's still. `measure()` places the logo, the lines, the access row and the load note as one block in every effect. Alignment: Centre (the block's middle at 47 % of the height, its box centred); Bottom centre (the block's foot one `--g-m` above the tech tags and the loader); Centre, content left (one column, every line flush with the emblem); Bottom left (one inset, 6 % of the width, 24 to 80 px, at the left and the foot; the flash grows from its corner). Bottom centre and Bottom left take the motto into the block. Row: List, Line, Rail. Icon colour (OG, Mono, Gradient, Flat) paints the logo at rest in every effect. The loader (load note over the load line) sits at the foot's centre, one width and one type, its line centred on the tech tags' row. Play: the effect, Replay, Step through, Next (N), Knobs, Full screen; a step strip on the stage (Glass, Pop, Flash, Lines, Rest, Exit) stops on any step. Test: a simulated load (Now / 3 s / 8 s / 20 s / Hold) through the shell's stages with sample load notes, Strobe gate, Calm intro. Knobs: try-outs (Sample lines, Title in flash, Line flash, Classic notice), type styles per line (font, case, weight, letter and word spacing, line height), and the Layout, Type, Box, Glass and Timing knobs per effect; Y knobs act live. Intro OK / Needs work with a note | The inventory record's `intro` area; `stimming.desk.intro.<id>` keeps the look it was judged in |
| Share | The toy's 1200 x 630 share card (`accesslab/share-card.js`; spec `stimming-s4zf`, look from Tom, 2026-11-25): the still on the left, lightly blurred and dithered, its right edge a dithered arc; the emblem as a luminance mask in white, the title and the motto in B612, on one edge at x 640; the foot row holds the lab line at left, then the tech tags, small, beside the rainbow wordmark at right; a faint accent mesh in the bottom-right corner. `tools/sharecards.mjs` saves every main-shelf card to `shared/cards/<id>.jpg`. `tools/ogtags.mjs` points each main-shelf toy page at its card. | Nothing |
| YAML | One document with every tab's work: Copy, Save `<id>.yaml`. Export all YAML writes every touched toy to one file. | Nothing |

- The strip holds every toy: main shelf, Lab, and toy folders `toys.json` lacks yet (`accesslab/hub.json`). Filters: All, Main, Lab, Unlisted, Untouched. A dot marks a toy with work.
- `node tools/hubdata.mjs` refreshes the unlisted list and the tech tags.
- `?toy=<id>&tab=<tab>` opens a toy at a tab. Arrow keys step toys.
- The icon-masks session owns `icons/`; the desk only reads it and keeps its vote keys.
- Not merged from `introlab/`: the font slots, the timeline, the phase pauses, Copy table, the audio notice words and the number place.
- Gaps: Galleries take the sheet's emblem fix, so no emblem file 404s. The saved-record list and the folder list need the dev server.

## 1. The glyphs

One family in the Bar v3 How to play idiom (`shared/signal.js`, `GESTURE`): hairlines on a 24 × 16 grid, round caps, few solid parts, one colour.
Grammar: the left half is the subject, the right half the modifier. Three ticks mean "fast and repeated". The motor glyphs reuse Bar v3's touch point and its long-press bar, so How to play and the access row speak one language.

| Glyph | Name | Flag | Left | Right |
|---|---|---|---|---|
| `g-flash` | Flashing | `flash: "strobe"` | The flash box, solid | Three ticks |
| `g-taps` | Fast taps | `motor` has `taps` | Bar v3 touch point | Three ticks |
| `g-hold` | Long hold | `motor` has `hold` | Bar v3 touch point | Bar v3 hold bar |
| `g-drag` | Precise drag | `motor` has `drag` | Bar v3 touch point | A dotted path to a small target |
| `g-colour` | Colour | `colour: "needed"` | Two discs, one solid, one hairline | |
| `g-motion` | Strong motion | `motion: "strong"` | The view, a frame | Bar v3 circle gesture |
| `g-sound` | Sound | `sound` | The intro's headphones, in hairline | |

- Colour follows Bar v3: the glyph takes the toy's ink (`--acc-ink`), the word stays white. In the white flash box the glyph inverts to dark.
- Words: Iosevka Term Slab ExtraBold caps, as on the bar. Layouts are left-aligned.
- No meaning rests on the ink. Every glyph has a word next to it or a label for screen readers.
- Strong motion is a fifth issue next to Tom's three. Big camera moves and shakes are a vestibular risk. Tom decides if it stays.
- Sizes: 27 × 18 px in the intro and the lists, 19.5 × 13 px on a menu tile. The stroke is 1.3 at 18 px and 1.5 at 13 px.

## 2. The access record

One `access` object per toy in `toys.json`, after `sound`. `null` means "not checked yet". The shell shows nothing for `null`.

```json
"access": {
  "flash": "strobe",
  "flashOn": "input",
  "motor": ["hold"],
  "colour": "none",
  "sound": "extra",
  "motion": "strong",
  "calm": true,
  "checked": "2026-11-24 code",
  "tech": { "tier": "three", "webgpu": false }
}
```

| Field | Values | Meaning |
|---|---|---|
| `flash` | `none`, `soft`, `strobe` | `strobe`: more than 3 large flashes in some 1 s window is possible. `soft`: large flashes, never more than 3 in 1 s. `none`: no large flash, no red flash. |
| `flashOn` | `auto`, `input` | `auto`: flashes come without input (lightning, a show). `input`: only a press makes them. |
| `motor` | list of `taps`, `hold`, `drag`, `multi`, `keys` | What play needs. An optional hold or drag is not listed. Empty list: one relaxed tap or a loose drag is enough. |
| `colour` | `none`, `hint`, `needed` | `needed`: play or meaning depends on telling hues apart. |
| `sound` | `none`, `extra`, `needed` | `needed`: some information is in the sound only. |
| `motion` | `none`, `calm`, `strong` | `strong`: large camera moves, fast spin, zoom or shake. |
| `calm` | `true`, `false` | The toy honours the Calm setting (section 3). |
| `checked` | `"<date> code"` or `"<date> measured"` | How the record was made. |
| `tech` | `{ tier, webgpu }` | The renderer the toy supports (section 6). A script fills it; no hand edits. |

- "Large" follows WCAG 2.3.1: about a quarter of a 1024 × 768 view (341 × 256 px), or the whole stage.
- A flash is a pair of opposite changes of 10 % or more in relative luminance, where the darker state is below 0.80. A saturated red change counts on its own.
- The `sound` field in `toys.json` stays. `access.sound` adds the "needed" level.

Who fills it:

1. The toy's own chat drafts the record from the code, `checked: "<date> code"`.
2. The flash meter (section 4) measures `flash` in the in-app browser. The record then says `measured`.
3. Tom confirms the record at sign-off, with the other `data-done` checks.

## 3. How the shell uses the record

| Where | What | Shows when |
|---|---|---|
| Intro | The access flags under the name, then "Best with sound" always on its own line below them, set further down. Two frames after its row opens, it lands with its own Signal flash: the white box oversize for one frame, at size, held, then parting in three frames, at 30 fps. Tech tags sit in the bottom-left corner. Layouts: List, Line (flags share one line), Rail. | `flash: "strobe"`, any `motor` entry, `colour: "needed"`, `motion: "strong"` |
| Menu tile | Glyphs under the label, 13 px, muted | Same flags |
| Gate | A left-aligned screen before play: the flash glyph, "Fast flashing light", Bar v3 words Play calm / Play as made, Always calm | `flash: "strobe"` only, once per toy, until the visitor picks Always calm |
| Settings, Site | A Calm row: on or off | Every toy |
| Settings, Site | A Colour symbols row: on or off | Toys with `colour: "needed"` |
| Settings, Site | A Bigger targets row: on or off | Toys with `drag` in `motor` |

The Calm setting:

- Key `stimming.calm`, site-wide. It starts on when `prefers-reduced-motion` is set.
- The shell exports `calm()` and `onCalm(fn)`, like `reduced()` and `onReducedChange()`.
- A calm toy caps large flashes at 3 per second and scales their brightness by 0.3. Railgun does the same under `reduced()` today (`railgun/src/view/render.ts:113`).
- A calm toy stops automatic lightning and strobe shells. Fireworks and Railgun already gate their storms on `reduced()`.
- The intro's flash box is one flash per page load. That passes 2.3.1. Under Calm it fades in without the white flash.

Bigger targets: the shell exports a hit slop factor (1.5 when on). A toy multiplies its pick radius by it. The press thresholds (8 px drag, 260 ms hold) stay.

Colour symbols: section 5.

## 4. The flash meter

A Dev sheet row (`?dev`) that reads the stage canvas each frame at 64 × 48, computes the relative luminance per cell, and counts flash pairs in a sliding 1 s window over any quarter-view block. It shows the worst count and red flashes, and copies a `measured` record.
It runs in the in-app browser pane only; no Playwright. It needs `preserveDrawingBuffer` or a read inside the frame. A `shared/` module: its own bean and Tom's yes.

## 5. ColorSym

ColorSym gives each colour a symbol, so colours can be told apart without hue. Chris Eastridge drew the first symbols for the board game Parks & Potions; Luis Francisco grew them into an open set. Version 1.0 came out on 19 June 2026.

| Part | Licence |
|---|---|
| Symbols (SVG) | CC BY-SA 4.0 (`LICENSE.txt`) |
| Font | SIL OFL 1.1, reserved font name "ColorSym" (`LICENSE_OFL.txt`) |

Source: <https://github.com/luisfrancisco/colorsym>, specimen at <https://colorsym.com>. The README asks only that users credit the project. Open source: confirmed.

The set: red is a dot, yellow a bar, blue a chevron, white a ring, black a ring with a slash. A mixed colour joins its parents: orange is dot and bar, green chevron and bar, violet chevron and dot, brown all three, pink a ring with a dot, grey black and white. Every symbol reads from any angle.

Smart use: the shell gives a colour its symbol from its hue, so no toy keeps a table by hand.

| Where | What | Cost |
|---|---|---|
| `symOf(colour)` in the shell | OKLCH hue picks the family: pink from 335°, red from 10°, orange from 42°, yellow from 75°, green from 120°, blue from 195°, violet from 275°. Dark red and orange become brown. Low chroma becomes white or nothing. culori parses any CSS colour. | One function |
| The Colour flag | The flag names the toy's colours: its accent stops as ColorSym marks after the word. The warning teaches the code it will use. | Free from `toys.json` |
| Bar v3 colour dots | An option with a `dot` gets its mark on the dot when Colour symbols is on. Every toy with colour picks gains it at once. | One rule in `shared/signal.js` |
| Menu series | The Wave divider and the Hex ring carry the series' mark. Two series of one family share a mark (East Van and Goo are both green). | Menu bean |
| Toy parts | A toy with `colour: "needed"` draws marks on its own coloured parts (Flame test's salts and spectrum lines). | Per toy |

The lab shows the series and four accents marked from their hues, under each colour-vision view.

In Stimming:

- A toy with `colour: "needed"` draws the symbols on its coloured parts when Colour symbols is on. The workbench shows Flame test's salts: under a deutan view, strontium, calcium and copper merge to one olive; the symbols keep them apart.
- Symbols are redrawn from primitives on a 24 grid, not downloaded. A redraw is an adaptation: those SVGs are CC BY-SA 4.0 too.
- Before use: Tom's yes, then a `CREDITS.md` row and a line on the attributions page.
- Proposed credit line: "Colour symbols: ColorSym by Chris Eastridge and Luis Francisco, CC BY-SA 4.0, github.com/luisfrancisco/colorsym. Redrawn for Stimming."
- Toys to check for `colour: "needed"`: Flame test (confirmed by the audit), then Chromatography, Turing, BZ, Dichroic. Most toys use colour as decoration only.

## 6. Tech tags

Tom, 2026-11-24: "we also need tags for when toys have webgpu web2d etc".

The tags are a second family, quieter than the warnings: hairline keycaps in muted grey, the same style as Bar v3's How to play keys. They carry no icon and no ink.

| Tag | Tier (`docs/stack.md`) | `tech.tier` |
|---|---|---|
| DOM | 1. DOM, SVG, CSS | `dom` |
| 2D | 2. Canvas 2D | `canvas2d` |
| GL | 3. Raw WebGL2 | `webgl2` |
| 3D | 4. three.js | `three` |
| GPU | WebGPU, a flag on a three.js toy | `webgpu: true` |

Two states:

- **Supports** (outline): from the record. `tech.tier` is the heaviest renderer the code reaches; `tech.webgpu` says the toy can run on WebGPU.
- **Runs now** (filled): from the page at run time. A WebGPU toy fills GPU when `renderer.backend.isWebGPUBackend` is true. Without WebGPU, three.js runs on its WebGL2 backend: GPU shows struck through and GL fills. A non-WebGPU toy fills its one tier.
- The shell learns the live renderer from the toy: a `ui.renderer('webgpu' | 'webgl2' | 'canvas2d' | 'dom')` call after the first frame. A `shared/` change: its own bean.

The script: `tools/techtags.mjs` reads each toy's own files (page, scripts, `src/`; not `dist/`, not `legacy.html`) and prints JSON. It writes nothing.

| Test | Tag |
|---|---|
| `WebGPURenderer`, `three/webgpu`, `navigator.gpu` | `webgpu` |
| An import from `three` | `three` |
| `getContext('webgl2')`, or `shared/gl.js` or `shared/environment.js` | `webgl2` |
| `getContext('2d')` | `canvas2d` |
| None of these | `dom` |

Dry run, 2026-11-24, all toys: 93 `webgl2`, 65 `three`, 6 `three` with `webgpu`, 7 `canvas2d`, 1 `dom`. The six WebGPU toys match `docs/stack.md`: Galaxy, Fire, Ink Water, Spark wheel, Cauldron, Jet hover.
Many three.js toys also show `canvas2d`: a 2D canvas paints a texture. The tier ignores that.
A `--write` mode that fills `tech` in `toys.json` comes with the data bean, after Tom's yes.

Where they show: under the access glyphs on the menu tile, and always in the intro's bottom-left corner, apart from the access row (Tom, 2026-11-24). The lab has a switch that fakes a browser with no WebGPU.

## 7. Audit of ten toys

Code reading only, 2026-11-24. No live measurement yet. "Check" marks a value the flash meter must confirm.

| Toy | flash | flashOn | motor | colour | motion | Calm today | Note |
|---|---|---|---|---|---|---|---|
| Fireworks | `strobe` | `input` | none | `hint` | `calm` | Partial | Space and tap have no cooldown; Showtime fires 9 strobes in 0.24 s; strobe shells flicker at 14 Hz. Reduced motion slows the rise and stops heat lightning. |
| Plasma | `strobe` | `input` | none | `none` | `calm` | No | Each tap sets `flash = 1` on the whole globe; no cooldown. Reduced motion does not weaken it. First toy to fix. |
| Railgun | `strobe` | `input` | `hold` | `none` | `strong` | Yes | Full-frame flash on muzzle, hit and strike; a 5-round salvo can pass 3 per second. Hold 2.4 s to arm. Reduced motion scales the flash by 0.3 and stops storm lightning and shake. |
| Lichtenberg | `soft` (check) | `input` | none | `none` | `calm` | Yes | Whole-board violet flash at arc-over, about 0.15 s. Fast taps may pass 3 per second. |
| Spark wheel | `soft` | `input` | none | `hint` | `calm` | Yes | A flare at full heat, at most one per 4 s. Reduced motion drops it. |
| Flame test | `soft` (check) | `input` | none | `needed` | `calm` | Partial | Flame puffs stack under fast taps. The spectrum needs hue. |
| Steel wool | `none` (check) | `input` | none | `none` | `calm` | Yes | Contact sparks of about 15 px; small area. Check the bloom spread. |
| Pop field | `none` (check) | `input` | none | `hint` | `calm` | Partial | Disco glints are small and local. Check a fast drag on Disco. |
| Pin art | `none` | `input` | none | `none` | `calm` | n/a | No flash. A loose drag is enough; keys work. |
| Domino Day | `none` | `input` | `drag` | `hint` | `strong` | Yes | Laying a line needs a precise drag on small targets. Camera moves and zooms. |

Toys that flash: Fireworks, Plasma and Railgun can strobe. Lichtenberg, Spark wheel and Flame test flash softly. Steel wool and Pop field flash only in small areas.
Motor flags: Railgun (hold), Domino Day (drag). Every other toy in the sample plays with one relaxed tap.

## 8. Order of work

Each step is its own bean. Tom picks the toys after the first.

1. Data: add `access` to `toys.json` for these ten, and `tech` for every toy from `tools/techtags.mjs` (Tom's yes; `toys.json` field order changes in `docs/standards/code.md`).
2. Plasma: honour Calm and `reduced()` in `burst()`. It is the one strobe toy with no mitigation.
3. Shell: `calm()`, the Calm row, the gate (`shared/`, a worktree and a PR).
4. Intro: the glyph row. The intro layout session owns the space; this plan gives it the glyphs.
5. Menu: glyphs on the tile, A or B.
6. Flash meter, then measure the ten.
7. ColorSym in Flame test, after Tom's yes and the `CREDITS.md` row.

## Open questions for Tom

- Keep Strong motion as a fifth issue?
- Intro: a list, one line, or glyphs only?
- Tech tags: on the menu tile, in the intro, or only in Settings and the hub?
- Gate for `strobe` only, or for `soft` too?
- ColorSym: yes to the redrawn symbols and the credit line?
