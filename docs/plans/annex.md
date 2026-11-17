# Toy annex

Status: active · Bean: `stimming-465y`

The annex is the page under a toy's stage. It replaces the parked `section.about`.
Lab: `annexlab/` (noindex). `?d=a|b|c` picks a direction. `?rm=1` shows reduced motion. `?js=1` forces the fallback driver.
Bean: `stimming-465y`. Status: Tom picked A · Recede (2026-11-09). The lip is the stage cue. Round 2 is open (2026-11-16, below).
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

## Round 2 (2026-11-16)

Tom asked for more iterations and an Awwwards-level transition. Status: open, Tom picks.
Lab: `annexlab/round2.html` (noindex). `?d=a|d|e|f` picks a direction; keys 1 to 4 switch. `?rm=1` shows reduced motion. `?y=0.5` scrolls half the travel.
Round 2 has the shell's own look and the live Glass toy in a frame. Round 1 was a grayscale wireframe.

| | Transition | The cue under the stage | Risk |
|---|---|---|---|
| A · Recede | Tom's pick of round 1, as the baseline. The fixed stage shrinks to 0.86 and dims; the zone rises as a sheet. | A 14 px lip with a handle. | The quietest of the four. |
| D · Drum | The toy and the zone are two faces of one drum. The stage tips back about its bottom edge; the zone turns up to the visitor. | An 18 px edge with a chevron. | Text moves in perspective for one screen of scroll. |
| E · Placard | The toy's label is a bar in the toy's accent: number, name, Flemish name, `Read`. It rides up with the scroll and docks as the header. Docked, it settles to dark with accent ink, the four parts and `Play`. | The 46 px placard itself. | The tallest cue: the bottom corners rise 46 px. |
| F · Tide | The menu's Wave divider is the edge of the zone, in the series colour. It swells mid-way and floods up over the fixed, dimmed stage. | A 30 px wave line with the series icon and `About Glass` in its gap. | The path redraws on each scroll frame. |

All four:
- One value drives each effect: `--p`, 0 at the toy and 1 at the content zone. The lab writes it from `scrollY`.
- The cue is a button. A click scrolls into the zone.
- A way back always shows: a `Glass` chip top left (A, D, F) or `Play` in the placard (E). The footer has `Back to Glass`.
- The toy's own corners fade in the first quarter of the travel.
- Reduced motion: a plain scroll.

### The content kit

One kit for every toy, in this order (Tom, 2026-11-16: making-of, idea, notes, attribution).

| Part | Holds |
|---|---|
| Title block | Name, Flemish name and IPA, motto in both languages; facts (number, series, build, sound) from `toys.json` and `series.json`. |
| The idea | A heading of its own, prose, one drawn figure. |
| Making of | Prose, a pass table, picture blocks: wide (both columns) and pair. |
| Notes | A dated log, newest first. Three show; a button opens the rest. |
| Credits | A table: part, source, licence. |
| Also try | Three toys by emblem. |

A part has its heading in a left rail and its matter in a reading column of 66 characters. Under 900 px the rail goes on top.
Picture blocks are empty slots in the lab: the project has no stills yet.
The Glass copy is a draft. Its notes come from the Git log of `glass/index.html`.

### Structures not built

The dice dealt three of seven structures. The other four wait for a new deal:
Lead figure (the stage shrinks into the article's first picture), Flash cut (the intro's flash box wipes over the stage), Mini-player (the stage docks in a corner as a small live tile), Tab stack (each part is a sheet with its own tab on the lip).
