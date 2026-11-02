# Stimming

Small interactive desk toys for the office. One folder per toy, one self-contained `index.html` each. The root `index.html` is the menu.

| Page | Status | Live |
|---|---|---|
| [Menu](index.html) | live | [Artifact](https://claude.ai/artifact/MqswJLwcoxvYEazV2xwNTd) |
| [Morphset](morphset/) | live | [Artifact](https://claude.ai/artifact/A4ssXXHbdd3T2796z41iLq) |
| Fidget board | planned | |
| [Pop field](pop/) | live | [Artifact](https://claude.ai/artifact/RucayWpUUtft96KfB3imc6) |
| Zen sand | planned | |

## Run locally

Each `index.html` is the body of a claude.ai Artifact page. The Artifact service adds the doctype and `<head>`, so the file has neither. Serve the folder over HTTP rather than opening the file directly, so the Three.js modules and fonts load:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000/>. Served locally, the menu links to the repo copies instead of the Artifacts.

## Publishing

Each applet's Artifact link stays the same across updates. Publish a changed `index.html` to the link in the table, not as a new Artifact.

## Conventions

- Libraries load from cdnjs or jsDelivr, pinned to exact versions.
- Colours are OKLCH tokens, with dark and light themes.
- Animation runs on one GSAP ticker and holds 30 fps or better.
- Visible text is names and control labels only: no blurbs, taglines or eyebrow labels.
- Type is Gabarito. Monospace only for live numbers such as an fps readout.
- State shows in the drawing, not in words: unbuilt toys are line drawings on the menu.
- `prefers-reduced-motion` stops loops and shortens transitions.
