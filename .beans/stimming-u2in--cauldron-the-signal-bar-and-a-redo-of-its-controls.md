---
# stimming-u2in
title: 'Cauldron: the Signal bar and a redo of its controls'
status: todo
type: task
created_at: 2026-11-17T08:54:07Z
updated_at: 2026-11-17T08:54:07Z
parent: stimming-a5rs
blocked_by:
    - stimming-hvtr
---

One of the first ten (Tom, 2026-11-17, epic stimming-a5rs). The toy takes the Signal bar and gets its controls and menus redone in the same pass, clean and neat.

First read of what to redo: + Thing sits beside an Add list: say once what adds. Eleven Dev rows need groups.

Tom, 2026-11-17: retain the colour icons for the ingredients. Done in Bar v3: each ingredient keeps its own colours, also under the white box.

Tom, 2026-11-17, for the Cauldron chat: "add more ingredients -- including forbidden and witchy -- and bizarre ones". No Cauldron chat is on this machine, so the message is not sent; Tom has the text.

## Checklist

- [x] List every control and what it does (from the spec, the toy doc and close-up stills of the real page; not a hands-on play session)
- [x] Check it against the eight points in stimming-a5rs
- [x] Propose the redo to Tom before any change (2026-11-17, below); Tom rules
- [x] Apply the redo to the toy's `bar` spec (2026-11-17). Tom: "Ingredients for T -- Throw Out for C", so the T action is `+ Ingredients` and the C action is `Throw out`; the rest is the copy rewrite below. Bar v3 reads a new optional `help` list for How to play; `keys` keeps four entries for Bar v2
- [x] Switch the toy to the Signal bar: `signal: true` (2026-11-17, with stimming-hvtr)
- [x] 1280 px close-ups of the bar and every sheet with the new copy; clean console
- [ ] 375 x 812 and 812 x 375 with the new copy; a hands-on play session
- [x] The toy's doc in `docs/toys/` says what is true (the bar block of `docs/toys/cauldron.md`)

## Review of 2026-11-17: controls, labels, help and copy (proposal; nothing is changed)

| # | Today | Finding | Proposal |
|---|---|---|---|
| 1 | Add list: headings Mix, Things, Liquids | The heading Mix stands over one tile that also says Mix. | Mix stands alone at the head of the list with no heading. |
| 2 | `+ Thing` (T) | It adds the pick. With Cream picked it pours, and the label still says Thing. | The label names the pick: `+ Carrot`, `+ Cream`, `+ Mix`. |
| 3 | `Clear` (C) | It drains the pot and fills it with fresh broth. The shared verb fits. | Keep. |
| 4 | `Fire` slider | Clear. | Keep. |
| 5 | Settings: Simmer sound, Quality, Reset | In order, three rows. Reset is in Settings because Clear is on the bar. | Keep. |
| 6 | Dev: 11 rows in one list | No groups; long labels repeat "Fire" and "Camera". | Three groups: Look (Exposure, Bloom, Background blur), Camera (Height, Turn), Fire (X, Z, Height, Size, Power, Spread). |
| 7 | Help: `DRAG stir or pour`, `DRAG A THING pull`, `CLICK add or dunk`, `← → stir` | "or pour" and "or dunk" do not say when. The key rows read `T + thing`, `C clear`. | `DRAG stir; pours a liquid`, `DRAG A THING pull it`, `CLICK throw in; dunks a thing`, `← → stir`, `T throw in the pick`, `C empty the pot`. |
| 8 | Intro copy | No Flemish name, no IPA, no motto. | Tom sets them. |
| 9 | Stage label for screen readers | It says "Click the soup to throw the next thing in". A click now adds the pick from the Add list, and a liquid pours. | Say: "Click the soup to add the thing you picked." |
| 10 | The page's own intro text | It still says "Stimming Lab" under the name. Cauldron is on the main shelf; `toys.json` holds no Lab tag. | Remove the fallback line. |

Tom, 2026-11-17: review all controls, labels, help and copy per toy before the next toy. This table is that review for Cauldron.

## Copy rewrite of 2026-11-17 (proposal; nothing is changed)

Tom: "STE100 inspired rewrite of all copy -- no ai slop ... ultimate clarity and consistency -- esp with the controls". Also: redo the mouse and keycap icons.

Rules used: one word for one thing; a label is a noun or one verb; a help line is one instruction, verb first; the same action has the same words in every place; no "or" in a line.

Word list for this toy: ingredient (what goes in), solid, liquid, add, stir, pour, move, push down, clear, heat, pot, soup.

### Controls

| Where | Have | Suggested | Why |
|---|---|---|---|
| List title | Add | Ingredient | The list picks a thing. The button adds it. |
| List heading 1 | Mix | (no heading) | It stood over one tile with the same word. |
| List heading 2 | Things | Solids | It pairs with Liquids. |
| First option | Mix | Any | "Mix" also means "stir". Any adds each solid in turn. |
| Action | + Thing | + Carrot, + Cream, + Any | The label names the pick, as `+ Noun` asks. |
| Action | Clear | Clear | Keep. |
| Slider | Fire | Heat | A slider names a quantity. The fire is the object. |
| Settings row | Simmer sound | Simmer sound | Keep. |
| Dev rows | Exposure, Bloom, Background blur | Look: Exposure, Bloom, Blur | A group; short labels. |
| Dev rows | Camera height, Camera turn | Camera: Height, Turn | The group says "Camera" once. |
| Dev rows | Fire X, Fire Z, Fire height, Fire size, Fire power, Fire spread | Fire: X, Z, Height, Size, Power, Spread | The group says "Fire" once. |

### Help (How to play)

| Input | Have | Suggested |
|---|---|---|
| Drag | stir or pour | Stir the soup |
| Drag, with a liquid picked | (same line) | Pour the liquid |
| Drag a thing | pull | Move an ingredient |
| Click | add or dunk | Add the ingredient |
| Click an ingredient | (same line) | Push an ingredient down |
| ← → | stir | Stir the soup |
| T | + thing | Add the ingredient |
| C | clear | Clear the pot |

### Other copy

| Where | Have | Suggested |
|---|---|---|
| Stage label (screen readers) | A big iron pot of soup over a fire. Drag on the soup in a circle to stir it. Click the soup to throw the next thing in. Hold the left or right arrow key to stir. | A pot of soup on a fire. Drag the soup to stir it. Click the soup to add the ingredient. Hold the left or right arrow key to stir. |
| Line when the toy cannot run | Soup cauldron needs WebGL 2 with float targets, which this browser has turned off. | This toy cannot run in this browser. It needs WebGL 2 with float targets. |
| Intro, under the name | Stimming Lab | (remove; the toy is on the main shelf) |
| Flemish name, IPA, motto | none | Tom sets them. |

### Words on every toy (shell; a change here needs its own yes)

| Where | Have | Suggested | Why |
|---|---|---|---|
| (i) button and its sheet | How to play | Controls | A noun, as Sound and Settings are. |
| Monogram, for screen readers | Soup cauldron. Back to Stimming | Back to the menu | It says where the link goes. |
| Sound, Settings, Dev, Quality, Standard, High, Reset, Version | (as they are) | Keep | One noun or one verb each. |

### Input drawings (built in `shared/signal.js`)

How to play now draws each input: a mouse with its pressed button filled, an arrow for a drag, a bar for a hold, a wheel for a scroll; touch points on a touch screen; a hairline keycap for a key. The same input looks the same on every toy. Words that name the target ("a thing") still sit beside the drawing until the copy above is applied.
