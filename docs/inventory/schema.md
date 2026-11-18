# Toy inventory (schema 2)

Tom's verdict on each toy, in one fixed format. The master improvement plan reads it.
Capture: `inventorylab/`. Records: `docs/inventory/<id>.json`. Collate: `node tools/inventory.mjs` writes `docs/inventory.json`.
`docs/toys/<id>.md` says how a toy works. This record says what Tom thinks of it.

## Record

```json
{
  "schema": 2,
  "id": "pop",
  "date": "2026-11-17",
  "build": "fresh",
  "snapshot": { "name": "Pop field", "nl": "Bubbelplastiek", "ipa": "…", "tag": "One is none.", "tagNl": "…",
                "shelf": "main", "number": 2, "series": "poke", "stage": null, "version": "1.5",
                "sound": true, "legacy": true, "done": true },
  "stack": { "renderer": ["three WebGL"], "libraries": ["culori", "three"], "three": "0.170.0",
             "shared": ["intro", "stim"], "bar": "shell", "sound": "Web Audio", "typescript": false, "files": ["index.html"] },
  "verdict": "polish",
  "summary": "One line.",
  "meta": { "name": "Pop field", "nl": "Bubbelplastiek", "ipa": "…", "tag": "…", "tagNl": "…", "series": "poke", "notes": "" },
  "areas": {
    "icon": { "ok": true, "notes": "" }, "intro": { "ok": true, "notes": "" }, "bar": { "ok": true, "notes": "" },
    "controls": { "ok": true, "notes": "" }, "graphics": { "ok": true, "notes": "" },
    "sound": { "ok": true, "notes": "" }, "perf": { "ok": true, "notes": "" }
  },
  "triage": { "priority": "next", "effort": "M", "risk": "low", "tags": "phone, perf" },
  "modular": { "toTypeScript": false, "bar": "none", "dropLegacy": false, "adopt": ["gl"], "extract": "", "notes": "" },
  "findings":   [ { "area": "bar", "kind": "bug", "severity": "minor", "text": "" } ],
  "expansions": [ { "area": "graphics", "size": "M", "text": "" } ],
  "shelfMove": "none"
}
```

## Fields

| Field | Holds |
|---|---|
| `build` | The build Tom judged: `fresh` (`index.html`) or `classic` (`legacy.html`). |
| `snapshot` | The `toys.json` entry and the sign-off at capture time. The record stands alone. |
| `stack` | Read from the page and its local modules at save time. Tom does not edit it. |
| `verdict` | `keep`, `polish`, `rework` or `cut`. Empty until Tom picks. |
| `meta` | Tom's wanted name, Dutch name, IPA, mottos and series. A value that differs from `snapshot` is an edit to make in `toys.json`. |
| `areas` | Seven areas. `ok: false` marks an area that needs work. |
| `triage` | `priority` (`now`, `next`, `later`, `never`), `effort` (`S`, `M`, `L`, `XL`), `risk` (`low`, `mid`, `high`), free `tags`. |
| `modular` | Moves: `toTypeScript`, `bar` (`none` or `to-shell`), `dropLegacy`. `adopt`: shared modules to adopt. `extract`: code to lift into `shared/`. |
| `findings` | Bugs and gaffes. One row each. `area` can also be `meta`. |
| `expansions` | Ideas that add to the toy. One row each. |
| `shelfMove` | `none`, `to-main` or `to-lab`. A wish only; Tom moves toys. |

## Areas

| Area | Covers |
|---|---|
| `icon` | The menu icon and how it reacts to the pointer |
| `intro` | The intro card and the emblem |
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
| `S`, `M`, `L` | Expansion size: an hour, a session, a project. `XL` (effort only): more than one project. |
