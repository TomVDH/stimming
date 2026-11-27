# accesslab/

Two workbench pages, `noindex`. Plan: `docs/plans/access.md`. Bean: `stimming-9ex4`.

| Page | What |
|---|---|
| `index.html` | The toy desk: one toy at a time; Icon, Feedback, Intro, Share and Annex tabs; one YAML per toy |
| `access.html` | The access kit: glyphs, tech tags, tiles, ColorSym |

- The desk is a template. Read `TEMPLATE.md` before you add a panel or reuse it.
- `desk.config.js` is the only project file the core reads. A new panel is a new file in `panels/`.
- Votes and drafts live in other pages' keys: the icon sheet's and inventorylab's. Keep their formats.
- Refresh the data with `node tools/hubdata.mjs` when a toy folder or a renderer changes.
- `share-card.js` draws a toy's 1200 x 630 share card; the Share tab and `docs/qa/share-cards/preview.html` use it.
- Check in the in-app browser pane at <http://localhost:8000/accesslab/>.
