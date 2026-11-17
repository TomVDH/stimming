---
# stimming-o4nv
title: 'Railgun: the Signal bar and a redo of its controls'
status: todo
type: task
created_at: 2026-11-17T08:54:08Z
updated_at: 2026-11-17T08:54:08Z
parent: stimming-a5rs
blocked_by:
    - stimming-hvtr
---

One of the first ten (Tom, 2026-11-17, epic stimming-a5rs). The toy takes the Signal bar and gets its controls and menus redone in the same pass, clean and neat.

First read of what to redo: Sight and Reset on the bar. The 56 Dev rows need an order a builder can scan.

## Checklist

- [x] List every control and what it does (from the spec and close-up stills of the real page; not a hands-on play session)
- [x] Check it against the eight points in stimming-a5rs
- [x] Propose the redo to Tom before any change (2026-11-17, below); Tom rules
- [ ] Apply the redo to the toy's `bar` spec
- [x] Switch the toy to the Signal bar: `signal: true` in `railgun/src/setup.ts` (2026-11-17). Checked on the real page at 1280 px, 375 x 812 and 812 x 375; clean console; both type checks pass
- [ ] 1280 px, 375 x 812 and 812 x 375; clean console
- [ ] The toy's doc in `docs/toys/` says what is true

## Review and copy rewrite of 2026-11-17 (proposal; no word is changed)

Rules: one word for one thing; a label is a noun or one verb; a help line is one instruction, verb first; the same action has the same words in every place; no "or" in a line.

### Controls

| Where | Have | Suggested | Why |
|---|---|---|---|
| Slider | Time | Time of day | Train ride and Window seat use "Time of day" for the same thing. |
| Action (V) | Sight | Sight | Keep. |
| Action (R) | Reset, on the bar | Reset, in Settings | Cauldron keeps Reset in Settings. One place on every toy. The R key stays. |
| Settings, Play | Aim: Track, Free | Aim: Auto, Manual | Track means the gun follows the rock by itself. Free means you turn it. |
| Settings, Play | Fire: Rail, Salvo | Shot: Single, Salvo | "Fire" is also the verb for a release. Rail is one shot. |
| Settings, View | Letterbox | Letterbox | Keep. |
| Settings, Graphics | Smoke detail: Low, Mid, High | Smoke detail: Low, Medium, High | A whole word. |
| Settings, Graphics | Resolution, Quality | Keep | |
| Dev, Ambient | Ambient, Ambient rate, Ambient test, Ambient now | On, Rate, Test, Now | The group says "Ambient" once. |
| Dev, Gun | Gun steel, Gun steel rough | Steel, Steel rough | The group says "Gun" once. |
| Dev, other 50 rows | (as they are) | Keep | Grouped and short. Builders only. |

### Help (How to play)

| Input | Have | Suggested |
|---|---|---|
| Hold | charge | Charge the gun |
| Release | fire | Fire the shot |
| Arrows | traverse | Turn the gun (shown as four arrow keycaps) |
| V | sight (listed twice) | Show and hide the sight |
| R | reset | Reset the toy |

### Other copy

| Where | Have | Suggested |
|---|---|---|
| Stage label (screen readers) | A colossal railgun at dusk. A burning asteroid hangs beyond its muzzle. Hold to charge, release to fire. | A very large railgun. A burning asteroid is in the sky. Hold to charge the gun. Release to fire the shot. |
| Line when the toy cannot run | Railgun needs WebGL 2, which this browser has turned off. | This toy cannot run in this browser. It needs WebGL 2. |
| Intro, under the name | Stimming No. 40 | (remove; the intro shows no number) |
| Motto | none | Tom sets it. |

### Findings that are not copy

- `shared/signal.js` passes the site's type check. Under Railgun's strict check it shows 94 findings, most of them untyped parameters. `stim.js` now builds the module's address at run time, so Railgun's check does not pull it in. Typing the module strictly is still to do.
- On 812 x 375 the Settings sheet scrolls inside its own box; nothing leaves the stage.
