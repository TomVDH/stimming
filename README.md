# Stimming

Small interactive desk toys for the office. One folder per toy, one self-contained `index.html` each. The root `index.html` is the menu.

Everything ships as one Artifact: <https://claude.ai/artifact/MqswJLwcoxvYEazV2xwNTd>. The menu is its main page and every toy is a page inside it.

| Toy | Folder | Status |
|---|---|---|
| Morphset | [morphset/](morphset/) | live |
| Fidget board | [fidget/](fidget/) | live, with sound |
| Pop field | [pop/](pop/) | live, with sound |
| Zen sand | [sand/](sand/) | live |
| Fire | fire/ | in progress, WebGPU only |
| Slime | slime/ | in progress |
| Domino run, Infinity cube, Magnet balls | | planned |

## Run locally

Each toy is a full HTML page; the menu is an Artifact body fragment, which browsers render as is. Serve the folder so the modules and fonts load:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000/>. All links are relative, so the menu and toys work the same locally and in the Artifact. Libraries and fonts load from cdnjs, jsDelivr and Google Fonts, so the toys need an internet connection.

## Publishing

Publish `index.html` to the Artifact link above with every toy page passed as a file at its folder path (`morphset/index.html`, `fidget/index.html`, and so on). Add each new toy's path when it lands.

## Conventions

- Libraries load from cdnjs or jsDelivr, pinned to exact versions.
- Colours are OKLCH tokens, with dark and light themes.
- Animation runs on one loop and holds 30 fps or better; idle pages do no per-frame work.
- Visible text is names and control labels only: no blurbs, taglines or eyebrow labels.
- Type is Gabarito. Monospace only for live numbers such as an fps readout.
- No glows, drop shadows or contact shadows.
- Sound, where a toy has it, is synthesized with Web Audio and has a remembered mute.
- `prefers-reduced-motion` stops loops and shortens transitions.
