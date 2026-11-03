# Stimming

Small interactive desk toys for the office. One folder per toy, one self-contained `index.html` each. The root `index.html` is the menu.

Everything ships as one Artifact: <https://claude.ai/artifact/MqswJLwcoxvYEazV2xwNTd>. The menu is its main page and every toy is a page inside it.

Source: <https://github.com/TomVDH/stimming> (private).

| Toy | Folder | Status |
|---|---|---|
| Morpher | [morpher/](morpher/) | done; silent; renamed from Morphset |
| Fidget board | [fidget/](fidget/) | live, with sound |
| Pop field | [pop/](pop/) | done; signed off by Tom. three.js: per-pixel lit domes, pointer light, shockwave ripple; `legacy.html` keeps the CPU-lit build |
| Zen sand | [sand/](sand/) | live |
| Fire | [fire/](fire/) | live, WebGPU only; port of the three.js volume fire example |
| Slime | [slime/](slime/) | live, with sound |
| Domino run | [domino/](domino/) | live, with sound |
| Magnet balls | [magnet/](magnet/) | live, with sound |
| Infinity cube | [cube/](cube/) | live, with sound |
| Pendulum wave | [pendulum/](pendulum/) | live, with sound |
| String harp | [harp/](harp/) | live, with sound |
| Pin art | [pins/](pins/) | live, with sound |
| Tesseract | [tesseract/](tesseract/) | Lab: retired from the main shelf (not fun enough) |
| Ferrofluid | [ferro/](ferro/) | live, with sound |
| Galaxy | [galaxy/](galaxy/) | live, with sound; WebGPU only |
| Zipper | [zipper/](zipper/) | live, with sound |
| Glass | [glass/](glass/) | live, with sound |
| Bubble wand | [bubbles/](bubbles/) | live, with sound |
| Spinning top | [top/](top/) | live, with sound |
| Soap cutting | [soap/](soap/) | live, with sound |
| Rain on glass | [rain/](rain/) | live, with sound |
| Plasma globe | [plasma/](plasma/) | live, with sound |
| Marbling | [marble/](marble/) | live, with sound |
| Caustic pool | [pool/](pool/) | live, with sound |
| Lava lamp | [lava/](lava/) | live, with sound |
| Kaleidoscope | [kaleido/](kaleido/) | live, with sound |
| Chladni plate | [chladni/](chladni/) | live, with sound |
| Prism | [prism/](prism/) | live, with sound; Canvas 2D only |
| Split-flap | [flap/](flap/) | live, with sound |
| Harmonograph | [harmono/](harmono/) | live, with sound; Canvas 2D only |
| Neon sign | [neon/](neon/) | done; signed off by Tom |
| Snow globe | [snow/](snow/) | live, with sound |
| Frost | [frost/](frost/) | live, with sound |
| Music box | [musicbox/](musicbox/) | live, with sound; Canvas 2D only |
| Murmuration | [flock/](flock/) | live, with sound |
| Dandelion | [dandelion/](dandelion/) | live, with sound |
| Gear train | [gears/](gears/) | live, with sound; SVG only |
| Coil | [coil/](coil/) | live, with sound |
| Googly eyes | [eyes/](eyes/) | live, with sound |
| Ribbon | [ribbon/](ribbon/) | live, with sound; WebGL2 |
| Balloon letters | [balloons/](balloons/) | live, with sound |
| TV tree | [tvtree/](tvtree/) | live, with sound |
| Orbits | [orbits/](orbits/) | live, with sound |

## Run locally

Each toy is a full HTML page; the menu is an Artifact body fragment, which browsers render as is. Serve the folder so the modules and fonts load:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000/>. All links are relative, so the menu and toys work the same locally and in the Artifact. Libraries and fonts load from cdnjs, jsDelivr and Google Fonts, so the toys need an internet connection.

## Shared shell

Every toy page links `shared/stim.css` and imports `shared/stim.js`, and keeps only its own code.

- `stim.css` holds the tokens, header, stage box, control bar (`.bar` with `.choices`, `.actions` and the how-to line), chips, the slider and the vignette section.
- `stim.js` exports `initPage({ id })`, `sound`, `audioKit`, `choices`, `fitCanvas`, `whenVisible`, `reduced` and the OKLCH helpers.

There is no build step. Toys stay independent pages that share one wrapper.

## Publishing

Publish `index.html` to the Artifact link above with every toy page passed as a file at its folder path (`morpher/index.html`, `fidget/index.html`, and so on), plus `shared/stim.css`, `shared/stim.js`, `shared/intro.css`, `shared/intro.js` and `toys.json`. Add each new toy's path when it lands.

## Conventions

- Libraries load from cdnjs or jsDelivr, pinned to exact versions.
- Colours are OKLCH tokens. Every page is dark only for now.
- Animation runs on one loop and holds 30 fps or better; idle pages do no per-frame work.
- On the toy itself, visible text is the name, control labels and the how-to line: no blurbs, taglines or eyebrow labels.
- Writing lives in the vignette under each toy: a short heading, two plain paragraphs and a small figure. Morpher has the first one.
- Every toy has one control bar under the stage: choices (one pressed), then actions (verbs: Clear, Reset, Shuffle), then the how-to line (`dl.how`, at most four entries, gesture then result). Keys show on mouse devices only. At most five visible controls.
- Type is Gabarito. Monospace only for live numbers such as an fps readout.
- No glows, drop shadows or contact shadows.
- Sound, where a toy has it, is synthesized with Web Audio and has a remembered mute.
- `prefers-reduced-motion` stops loops and shortens transitions.
