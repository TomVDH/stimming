# Toy inventory (schema 1)

Tom's verdict on each toy, in one fixed format. The master improvement plan reads it.
Capture: `inventorylab/`. Records: `docs/inventory/<id>.json`. Collate: `node tools/inventory.mjs` writes `docs/inventory.json`.
`docs/toys/<id>.md` says how a toy works. This record says what Tom thinks of it.

## Record

```json
{
  "schema": 1,
  "id": "pop",
  "date": "2026-11-17",
  "build": "fresh",
  "snapshot": { "name": "Pop field", "nl": "Bubbelplastiek", "shelf": "main", "number": 2,
                "series": "poke", "stage": null, "version": "1.5", "sound": true, "legacy": true, "done": true },
  "verdict": "polish",
  "summary": "One line.",
  "areas": {
    "meta":     { "ok": true, "notes": "" },
    "icon":     { "ok": true, "notes": "" },
    "bar":      { "ok": true, "notes": "" },
    "controls": { "ok": true, "notes": "" },
    "graphics": { "ok": true, "notes": "" },
    "sound":    { "ok": true, "notes": "" },
    "perf":     { "ok": true, "notes": "" }
  },
  "findings":   [ { "area": "bar", "kind": "bug", "severity": "minor", "text": "" } ],
  "expansions": [ { "area": "graphics", "size": "M", "text": "" } ],
  "shelfMove": "none"
}
```

## Fields

| Field | Holds |
|---|---|
| `build` | The build Tom judged: `fresh` (`index.html`) or `classic` (`legacy.html`). |
| `snapshot` | A copy of the `toys.json` entry and the sign-off at capture time. The record stands alone. |
| `verdict` | `keep`, `polish`, `rework` or `cut`. Empty until Tom picks. |
| `summary` | One line on the toy. |
| `areas` | Seven areas. `ok: false` marks an area that needs work. `notes` is free text. |
| `findings` | Bugs and gaffes. One row each. |
| `expansions` | Ideas that add to the toy. One row each. |
| `shelfMove` | `none`, `to-main` or `to-lab`. A wish only; Tom moves toys. |

## Areas

| Area | Covers |
|---|---|
| `meta` | Name, Dutch name, motto, series, shelf place, intro emblem |
| `icon` | The menu icon and how it reacts to the pointer |
| `bar` | The control bar: slots, labels, Settings, how-to |
| `controls` | Gestures and keys on the canvas |
| `graphics` | The look: materials, light, motion, framing |
| `sound` | The voices and the mix |
| `perf` | Frame rate, start-up, idle cost, phone fit |

## Grades

| Word | Means |
|---|---|
| `bug` | The toy does a wrong thing. |
| `gaffe` | The toy works, but a thing looks or reads wrong. |
| `blocker` | The toy cannot stay on the shelf as it is. |
| `major` | A player sees it in the first minute. |
| `minor` | A player sees it after some time. |
| `polish` | Only Tom sees it. |
| `S`, `M`, `L` | Expansion size: an hour, a session, a project. |
