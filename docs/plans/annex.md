# Toy annex

The annex is the page under a toy's stage. It replaces the parked `section.about`.
Lab: `annexlab/` (noindex). `?d=a|b|c` picks a direction. `?rm=1` shows reduced motion. `?js=1` forces the fallback driver.
Bean: `stimming-465y`. Status: Tom picked A · Recede (2026-11-09). The lip is the stage cue.
Bar v2 rule 4 now reads: the page scrolls past the stage only into the annex, never sideways (Tom, 2026-11-09).

## Directions

| | Transition | Annex layout | Cost |
|---|---|---|---|
| A · Recede | The stage is fixed. It scales to 0.86 and dims. The annex rises over it as a sheet. A 12 px lip with a handle peeks under the stage. | Title block, then a main column (How it works, Controls, Notes) and a side rail (Facts, Made with, Credits). Also try. Footer. | The bottom corners rise 12 px for the lip. |
| B · Dock | The stage scrolls away. Its picture sinks slower than the page. The logo and `/ NAME` stay and become a header with "Back to Glass". | A gallery label: a sticky left column (title, facts, made with) and a reading column (How it works, Controls, Notes, Credits, Also try). | A second fixed element over the stage. |
| C · Cut | The stage scrolls away and snaps (proximity). A rule and the title wipe in as a flash box, as in the intro. | A spec sheet (Dutch, IPA, shelf, build, sound, made with, version) beside How it works and Controls. A version log, numbered credits, four "More" tiles. | Snap feels heavy on a long annex. |

All three:
- Corners fade in the first quarter of the scroll. The key strip fades first.
- One progress value drives every effect: the stage leaving view, 0 to 1. Native CSS uses a view timeline on the scene (`exit` range). The fallback writes `--p` from `scrollY`; a paused animation seeks to it.
- The toy stops when the stage leaves view: `whenVisible(scene, fn)`. For A, observe the scene block, not the fixed stage; the fixed stage never leaves view.
- Reduced motion: no fixed stage, no dock, no snap, no animation. A plain scroll.

## Order and weight

Proposed order: title block, how it works, controls, notes, credits, related, footer.
The title block carries the most weight. Facts and credits are small type.
Notes show the last three, with "Show all N notes".

## Data

| Field | Source | Feeds |
|---|---|---|
| `name`, `nl`, `ipa`, `tag`, `tagNl` | `toys.json` | Title block |
| `number`, `sub` | `toys.json` | Facts: number, shelf |
| `legacy` | `toys.json` | Facts and footer: the Classic link |
| `sound` | `toys.json` | Facts: sound |
| `emblem` | `toys.json` | Related tiles |
| `related` (new, optional) | `toys.json` | Also try. Without it, take the shelf neighbours. |
| Controls | The `bar` spec given to `initPage` | Controls recap. No second copy of the data. |
| `how`, `tech`, `credits`, `notes` | `<id>/annex.json` (new) | How it works, made with, credits, notes |

`<id>/annex.json`, one file per toy:

```json
{
  "how": ["Paragraph one.", "Paragraph two."],
  "tech": ["three", "tone", "gsap", "culori"],
  "credits": [
    { "what": "Breaking glass", "kind": "sound", "who": "Recorded shot", "source": "", "licence": "", "url": "" }
  ],
  "notes": [
    { "date": "2026-11-09", "kind": "change", "title": "Moved to the corners bar", "text": "The pane choice sits top left." }
  ]
}
```

- `tech` holds library keys. `shared/credits.json` (new) holds each library's name, version, licence and URL once. Fonts are in it too.
- `credits` holds the toy's own sources: recorded sounds, data, images. Examples: Glass's recorded shot, Window seat's NASA Black Marble lights.
- `notes.kind` is `change` or `version`. Sign-offs stay off the page (Tom, 2026-11-09); `data-done` stays internal.
- With no `annex.json`, the annex shows the title block, controls and footer only.
- The shell fetches `annex.json` once the visitor scrolls near the annex, not at load.
