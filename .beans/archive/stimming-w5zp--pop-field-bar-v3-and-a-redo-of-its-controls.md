---
# stimming-w5zp
title: 'Pop field: Bar v3 and a redo of its controls'
status: completed
type: task
created_at: 2026-11-17T20:39:26Z
updated_at: 2026-11-27T07:19:52Z
parent: stimming-a5rs
---

One of the 77 toys that follow the first ten (Tom, 2026-11-17: "also proceed with all the toys -- subagetns for all -- per 5"; epic stimming-a5rs).
A subagent read the toy and wrote this review; it did not play the toy. The toy's one code change is `signal: true`.

## Checklist

- [x] Switch the toy to Bar v3 (`signal: true`)
- [x] Review every control, label, help row and line of copy, as a proposal
- [x] Tom rules on the proposal (2026-11-17: "Yes, apply all")
- [x] Apply the copy and the fixes under "Under Bar v3" (2026-11-17, by a subagent; its report names what it left and Tom's calls)
- [x] 1280 px, 375 x 812 and 812 x 375 on the real page; clean console (2026-11-17, after the apply)
- [ ] The toy's doc in `docs/toys/` says what is true

## The review (proposal; no word is changed)

**Pop field (`pop`): review for Bar v3**

Spec: `pop/index.html:88`. Renderer need: WebGL 2 (three.js 0.170.0 `WebGLRenderer`, `pop/index.html:1561`, plus a Canvas 2D layer). Read, not played.

The one edit is made: `signal: true` at `pop/index.html:88`. Nothing below is applied.

### Today

| Where | Label | Options | Key | What it does (from the code) |
|---|---|---|---|---|
| List (choice, `display: 'stepper'`) | Material | Gloss, Rubber, Foil, Jelly, Soap, Toon, Glass, Candy, Latex, Pixel, Lava, Ice, Holo, Paper, Gum, Topo, Popcorn, Disco (18; the label is the value with a capital, `:91`) | None | `act.mat` (`:1547`): after 140 ms it lays a new sheet in that material. The paint, the cell size and the gap stay. The material sets the light, the burst, the sound and the feel (`:89`). |
| Action | Shuffle (with a die icon that the toy swaps in, `:1474`) | | S | `act.roll` (`:1536`): `freshRecipe` (`:214`) gives a new colour mode, hue, material, cell size, count of big bubbles and gap. The die shows a new face and rolls; a rattle sounds. |
| Action | Reset | | R | `act.reset` (`:2042`) calls `refill` (`:1066`): the popped bubbles fill again in a wave from the centre. The material and the colours stay. |
| Slider | None | | | |
| Settings | Quality | Standard, High | | `onQuality(() => layout())` (`:2051`): a new pixel ratio; the sheet stays. |
| Settings | Version | Classic (link to `legacy.html`; `toys.json` has `legacy: true`) | | The shell adds it. |
| System | Sound | On, Off | | `toys.json` has `sound: true`. Stored as `stimming.pop.sound`. |
| Dev | None | | | |

Inputs on the stage (the 2D canvas, `:1960` to `:2041`):

| Input | What it does |
|---|---|
| Press on a small bubble | A squeak (`:1966`). |
| Release on the same bubble, no drag | `pop` (`:1990`). A longer hold gives more force: `0.6 + 0.9 * q`, and `q` fills in 0.45 s (`HOLD`, `:847`). The force sets the speed of the bits (`burst`, `:1208`). |
| Click on a big bubble | It only wobbles (`pop`, `:1045`). |
| Hold on a big bubble | It charges in 1.1 s (`HOLD_J`), creaks, and bursts while held (`:1101`). The blast pops the small bubbles within 3.7 cell radii (`:1052`). |
| Drag past 0.45 of a cell radius | A sweep: every small bubble on the path pops (`:1976`, `sweep` at `:1076`). A big bubble on the path only wobbles. |
| Move (mouse, pen) | The point light eases toward the pointer (`:1973`, `:1798`). The bubble under the pointer swells; its neighbours lean away (`:1118` to `:1128`). |
| Arrow keys, canvas in focus | Move the focus ring to the next bubble (`:2026`, `move` at `:2003`). |
| Space, Enter, canvas in focus | Key down starts a press; key up pops (`:2032`, `:2040`). A held key charges a big bubble and bursts it (`:1096`). |
| Wheel | Nothing. A page scroll lets go of the hover (`:2053`). |

Popped bubbles fill again by themselves after 6 to 12 s (`:1049`).

### Controls

| Where | Have | Suggested | Why |
|---|---|---|---|
| Action (R) | Reset, on the bar | Reset, in Settings (`reset: () => act.reset()`) | Rule 7. Nothing in the toy shows or hides it. Popped bubbles also fill again by themselves. Note: `reset:` has no key, so the toy must bind R itself to keep it (Galaxy does, `galaxy/index.html:1823`). |
| List, option | Holo | Hologram | Rule 2: whole words. The code's own word (`:561`, `:1271`). |
| List, option | Topo | Contours | Rule 2: whole words. The code's own word (`:1284`, `:1750`). |

Kept: Material (a noun); the other 16 material names; Shuffle (the shared verb); Quality; Version: Classic.

The two new names are labels only. The values `holo` and `topo` stay: the sound, feel and shader tables and the `?mat=` query use them. Today the label comes from the value (`:91`), so a new label needs a small label map.

### How to play

| Input | Have | Suggested |
|---|---|---|
| Click | pop | Pop a bubble |
| Drag | sweep | Pop a line of bubbles |
| Hold | burst a big one | Burst a big bubble |
| Hold | (not listed) | Pop a bubble with more force |
| Move | (not listed) | Move the light |
| Arrows | choose, as "arrows + space" | Select a bubble |
| Space | pop, as "arrows + space" | Pop the bubble |
| Enter | (not listed) | Pop the bubble |
| S | shuffle (a keycap on the chip) | Shuffle the sheet |
| R | reset (a keycap on the chip) | Reset the toy |

"Pop a bubble" is Bubble wand's row for the same click. "Reset the toy" is the shared row. "Shuffle the sheet" is new: no toy on Bar v3 has a row for the Shuffle key yet; "the sheet" is the code's word for the field.

### The `help` list, ready to paste

```js
  help: [['click', 'Pop a bubble'], ['drag', 'Pop a line of bubbles'], ['hold', 'Burst a big bubble'], ['hold', 'Pop a bubble with more force'],
    ['move', 'Move the light'], ['← → ↑ ↓', 'Select a bubble'], ['space', 'Pop the bubble'], ['enter', 'Pop the bubble'],
    ['S', 'Shuffle the sheet'], ['R', 'Reset the toy']],
```

The `R` row holds only while R stays bound (see Controls).

### Other copy

| Where | Have | Suggested |
|---|---|---|
| Stage label for screen readers (`:59`) | "Bubble wrap. Arrow keys choose a bubble; Space or Enter pops it. Hold Space on a big bubble to burst it." | "A sheet of bubble wrap. Popped bubbles fill again. Click a bubble to pop it. Drag to pop a line of bubbles. Hold a big bubble to burst it. Press the arrow keys to select a bubble. Press Space to pop it. Press Enter to pop it. Hold Space on a big bubble to burst it. Press S to shuffle the sheet. Press R to reset the toy." |
| Line when the toy cannot run | None: the page has no `<p class="fail">` | "This toy cannot run in this browser. It needs WebGL 2." (needs new code; see Findings) |
| Intro, under the name (`:53`) | Stimming No. 02 | Remove; the intro shows no number. |
| Intro name, `<title>`, `<h1>` | Pop field | Keep |

There is no text on the stage.

### Under Bar v3

1. The sheet no longer keeps clear of the controls. `bands` (`pop/index.html:764`) measures the Bar v2 corners and the key strip:
   `const f = field.getBoundingClientRect(), layer = field.parentElement.querySelector('.stim-ui');` (`:765`)
   `for (const el of layer?.querySelectorAll('.s2-tl, .s2-tr') || []) { ... if (r.height) t = ... }` (`:767`)
   `for (const el of layer?.querySelectorAll('.s2-bl, .s2-br, .s2-keys') || []) { ... }` (`:769`)
   Bar v3 hides `.stim-ui` (`shared/stim.css:311`), so each height is 0, `bandT` is 0 and `bandH` is the full height (`:770`, `:771`). By the code the honeycomb now fills the whole stage: bubbles lie under the monogram and under the bar. `.sg-ui > *` takes pointer events (`shared/signal.css:19`), so a bubble under the bar cannot take a click while the bar shows; the keyboard still reaches it. Nothing calls `layout` again when Bar v3 mounts.
2. The toy's die is lost. The toy finds the Bar v2 Shuffle chip and swaps its icon for a die that rolls:
   `const die = [...document.querySelectorAll('.stim-ui .s2-chip')].find(b => b.getAttribute('aria-keyshortcuts') === 'S');` (`:1474`)
   The chip still exists, so nothing throws. Bar v3 draws its own Shuffle as a word with no icon (`actionParts`, `shared/signal.js:209`), so the die face (`showFace`, `:1490`) and its roll (`gsap.fromTo(dieSvg, ...)`, `:1543`) play on a hidden element. The CSS for it reads a Bar v2 part too: `.stim-ui svg.die { fill: currentColor; stroke: none; }` (`:48`).
3. The wipe starts in the wrong place. A new sheet grows out from the control that made it: `originOf(from)` (`:1510`, used at `:1528`). `from` is the hidden die (`:1538`) or the hidden stepper, `document.querySelector('.stim-ui .s2-step')` (`:1550`). A hidden element has an empty rectangle, so by the code the origin clamps to the top left corner of the field for Shuffle and for Material. The Bar v3 buttons are at the foot.
4. Material is no longer a stepper. Bar v3 does not read `choice.display`; a choice of more than four options is one button that opens a list of all 18 tiles (`shared/signal.js:320`). The 140 ms wait in `act.mat` (`:1549`) was made for quick steps; it does no harm.
5. An input word the builder cannot draw: `['arrows + space', 'choose, pop']` (`:98`). `inputHTML` (`shared/signal.js:82`) makes three keycaps of it: `arrows`, `+`, `space`. The `+` shows as a key. Until `help` is applied, How to play shows this row. The suggested `help` list removes it.
6. Not found: more than three actions; a `hold` action; a tray; options with `icon` or `dot`; a chip the toy hides or shows; a key bound twice; stage text that names a Bar v2 place; toy-owned controls on the stage.

Keys: S and R come from the spec. The toy binds the arrow keys, Space and Enter itself on the canvas (`:2024`); the spec lists Enter nowhere.

### Findings

- Reset does not reset. It fills the popped bubbles again (`refill`, `:1066`); the material, the colours and the cell size stay as Shuffle left them. If Tom wants the action on the bar, the toy's own verb is "Refill" (the code's name).
- No fail line and no guard. `new THREE.WebGLRenderer` (`:1561`) has no `try`. With no WebGL the module stops there and the page shows nothing. A fail line needs new markup and new code.
- Toon is a short form of cartoon. It is also the usual name of the look ("toon shading"), so the table keeps it. Tom rules.
- Two inputs do more than their row says. A hold on a small bubble pops it with more force on release (`:1990`). A held Space or Enter charges a big bubble as a held pointer does (`:1096`); the builder has no drawing for a held key, so the stage label carries it.
- The Move row on a touch screen: the builder draws a move as a drag there, and a drag pops. A touch does move the light (`:1973`), but the row can mislead. Drop the row if so.
- A click on a big bubble only wobbles it, and a sweep does not pop it (`:1045`). No row says so; "Burst a big bubble" on the hold row implies it.
- Two address queries, shown nowhere: `?mat=<material>` and `?kind=<colour mode>` (`:209` to `:212`). Not secrets of play; left out of the help.
- A touch screen buzzes on each pop (`buzz`, `:976`). Output only.
- `docs/toys/pop.md` goes false with the edit: its bar block says "Bar: v2" with slots "Top left", "Bottom left" and "Key strip" (lines 25 to 34). Its line references have also drifted by a few lines (it gives `:1963` for the pointer press, now `:1960`; `:2025` for the keys, now `:2024`; `:852` for `audioKit`, now `:849`). I did not edit the doc.
- The intro has `data-done`: Tom signed the toy off on Bar v2.

### Limits

- Read only. No play, no browser, no server, no stills. Every Bar v3 effect above is from the code of `pop/index.html`, `shared/stim.js`, `shared/signal.js` and two selectors in the shared CSS.
- Not checked: `pop/legacy.html` (the Classic build); a narrow stage; a real touch screen; keyboard-only use; reduced motion under Bar v3.
- Not read in full: the shaders, the sound tables and the burst code between lines 1145 and 1455 and 1570 to 1855. I searched them for handlers and Bar v2 selectors and found none.
- "WebGL 2" rests on three.js 0.170.0 having no WebGL 1 path. That is my knowledge of three.js, not a line in this repo.
