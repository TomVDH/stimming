# Stimming

Small interactive applets for the office. One folder per applet, one self-contained `index.html` each.

| Applet | What it does | Live |
|---|---|---|
| [Morphset](morphset/) | 15 SVG marks that morph on hover, plus a lab of GSAP MorphSVG, Three.js and GLSL experiments | [Artifact](https://claude.ai/artifact/A4ssXXHbdd3T2796z41iLq) |

## Run locally

Each `index.html` is the body of a claude.ai Artifact page. The Artifact service adds the doctype and `<head>`, so the file has neither. Serve the folder over HTTP rather than opening the file directly, so the Three.js modules and fonts load:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000/morphset/>.

## Publishing

Each applet's Artifact link stays the same across updates. Publish a changed `index.html` to the link in the table, not as a new Artifact.

## Conventions

- Libraries load from cdnjs or jsDelivr, pinned to exact versions.
- Colours are OKLCH tokens, with dark and light themes.
- Animation runs on one GSAP ticker and holds 30 fps or better.
- Visible text stays minimal: names, control labels, short hints.
- `prefers-reduced-motion` stops loops and shortens transitions.
