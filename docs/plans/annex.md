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
Lab: `annexlab/round2.html` (noindex). `?d=a|d|e|f` picks a direction; keys 1 to 4 switch. `?rm=1` shows reduced motion. `?y=0.5` scrolls half the travel. `?still=1` shows the toy's still, not the live toy.
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

### Tom's pick: H · Flash cut (2026-11-16)

Two more directions came after the first four: G · Lead figure (the stage shrinks into the article's first picture) and H · Flash cut.
Tom picked H and parked the rest. The lab opens on H; the parked directions stay on the switch.

H · Flash cut:
- The stage stays fixed and dims to 0.62. The zone rises over it as a dark sheet.
- At rest the toy fills the whole screen, with 18 px round corners (Tom, 2026-11-16: the full toy). The cue takes no room: one quiet hint floats on the toy, bottom centre, the word `About` and a small chevron. It fades in the first fifth of the travel. No line, no border, no lip (Tom, 2026-11-16: a hard border is ugly, in every direction).
- The toy's key strip rises 22 px, so the hint has the bottom edge to itself. The shell build must measure this collision.
- The title block lands in the intro's beats at 30 fps: lead 3 frames, the big logo box 3, the logo box and the name box at size 11, then rest. Each small line then cuts in: hidden, two frames inverted, rest.
- Down the page each part heading cuts in the same way.
- The title block has the Signal intro's voice: the emblem in the toy's ink, Gabarito 800 for the name, B612 for the small lines.
- Tom's ruling: the rhythm of the flashes and the size flashes belong here; a full white card on a dark site does not. The first build of H was a white panel in difference blend; it is gone.

Title block layouts, first set (Stack, Poster, Ledger, Centre, Side): Tom rejected all five on 2026-11-16. His reasons: too ordinary, and the wrong ingredients. His lead: the emblem.

Second set, `?v=a..d`, keys 1 to 4. The emblem leads in each. The block holds the emblem, both names with IPA, and the motto; the facts (number, series, build, sound) sit with the credits.

| | Layout |
|---|---|
| 1 · Window | The emblem is a hole in the sheet. The toy plays on behind it, and the hole moves over the toy as the page scrolls. The names sit under it. |
| 2 · Giant | The emblem is up to 600 px and runs off the left edge. It leans to the pointer. The names stand at its lower right. |
| 3 · Echo | The emblem repeats four times at falling sizes and strengths. On landing the flash runs down the row. |
| 4 · Orbit | Both names run in a ring round the emblem, in the slab face. The ring turns with the scroll. All centred. |

Tom rejected this set too (2026-11-16): "all are so trite". The title block is open. Bean `stimming-465y` holds the handoff: every ruling, every verdict and the advice for the next try.

Test sheet: `annexlab/sheet.html` shows every transition and layout, one card each, with Tom's verdict. Each card shows the toy's still; a click loads the lab with `?still=1`, which puts the still in place of the live toy (Tom, 2026-11-22: live toys crashed the sheet).

Parked (Tom, 2026-11-22): a border that fits each toy. Round 3 tried it as S · Seam; Tom abandoned toy-specific transitions for now. The content comes after the layout pick.

### Round 3: S · Seam (2026-11-22)

Tom said yes to one idea: the toy breaks its own frame. Lab: `round2.html?d=s`, `&t=<id>` for the toy. Status: parked. Tom (2026-11-22): "we're for now abandoning toy specific transitions". The lab keeps the six seams.

- The border between toy and content comes from the toy's own material. Glass breaks as a star from one hit: nine spokes, an inner ring and an outer ring.
- The pieces fall in beats, not in a slide. Each fallen piece takes the sheet's dark ground. Beats at `--p` 0.03, 0.2, 0.36, 0.54 and 0.72.
  1. The cracks show.
  2. Every other outer wedge falls.
  3. The other outer wedges fall.
  4. The middle ring falls.
  5. The hit falls, and the title block lands in the Flash cut beats.
- On each beat the live cracks show white and 3 px thick for two frames. No piece flashes white.
- The hit is the emblem's centre at the landing beat, so the last piece gives way to the emblem.
- The title block lands centred, in the intro's shape: the emblem over the name, then the lines.
- The sheet stays hidden until the last piece falls. No straight edge shows.
- Reduced motion: a plain scroll, no cracks.
- Tom (2026-11-22): "cool concept". He asked for five more, on a random set of toys with Soup cauldron.

Five more seams, `?d=s&t=<id>` (the lab switch lists them). A seam is a set of pieces, each with the beat it falls on.

| Toy | Material | Beats |
|---|---|---|
| Lichtenberg burn | Discharge trees from seven points on the screen edge, toward the hit. | 1 the bolts; 2 the trunks char; 3 and 4 the char widens, with an ember rim in the accent. |
| Crossing button | The ring of sixteen LEDs round the button. | 1 the ring and its dots; 2 to 4 the sectors tick out clockwise, each with its dot; 5 the button. |
| Pop field | A hex sheet of bubbles. | 1 the bubbles show; 2 to 4 they pop from the edge in, with noise. |
| Dijkstra | A street grid with a search from the hit. | 1 the routes from the four corners and the grid; 2 to 4 the blocks go dark by distance, farthest first. |
| Soup cauldron | Goo blobs with a rim of broth. | 1 bubbles break the surface; 2 to 4 the soup rises from the bottom. |

- The lab shows copy for Glass only. The other toys show the title block, Also try and the footer.
- The Soup cauldron page belongs to another chat. The lab only frames it.

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
