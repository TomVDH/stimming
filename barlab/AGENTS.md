# barlab/

Workbench for the redo of the toy bars (Tom, 2026-11-16: "we're completely redoing the style and ux of the bars"). `noindex`. It changes no shell file. Bean: `stimming-a31k`.

- A real toy runs in a frame at its own address. `shim.js` stands in for `shared/stim.js` there: it reads the toy's own `bar` spec and draws the picked direction from it. Every control acts through the shell's handles.
- Directions on the switch (keys 1 to 3): Signal (the base; Tom: "i like signal a lot"), Bare (Tom: "we'll keep bare too"), Today. Dock, Tuck and Askew are cut.
- Signal: one bar at the foot, no boxes, the intro's flash beats. Tom, 2026-11-16: the layout is "great"; the flash reveals and the transitions into sheets are "perfect". Do not change those without his word.
- Signal's rules:
  - White is the flash: a press, or a thing that lands. The toy's ink is a state that holds: icons, the slider fill, a held pick.
  - A ladder of three states: bare at rest; when you point, the flash box drops to an ink bar at the word's foot; when you press, the white box lands. A key press shows no box; keyboard focus shows the ink bar.
  - A keycap is a small flash box: white, dark ink, a dark edge. (i) opens How to play: every gesture and every key.
  - Text on a held pick reaches 4.5:1: `setAcc` in `shim.js` picks the fill and the text colour from the accent's stops.
  - A sheet has no box. It lands from its own button and stands on a soft glass with no edge (Tom kept the glass).
  - The bar and its key strip stay while you play. They leave after 8 s with no input and return on the next one (Tom, 2026-11-16).
- Tom's colour pick (2026-11-17): Accent Toy, Ink Marks. These are the defaults. The other Accent values (Series, Wordmark, White, your own) and Ink values (Words, Flash) stay as knobs and are not picked.
- Hover knob, all proposals until Tom picks: Ink bar (default), Line, White box, Ink box, Brackets, Ink word. Tom, 2026-11-17: a line that clings to the letters is wrong; a hover mark keeps clear of the word.
- Other knobs: Leaves (After 8 s idle is Tom's rule; Never and On touch are not picked), Dev, Replay (key R). `?slow=N` stretches each film frame.
- The toy list holds hard menus on purpose: Cauldron (grouped options, Dev rows), Train ride (a long choice row), Railgun (grouped Settings), Window seat, Car wash, Wind map, Frietkot.
- Another session built Standard on the branch `claude/bold-davinci-7fc18a`. Signal lives on `claude/bold-davinci-7fc18a-signal`.
- Railgun is a TypeScript toy: run `npm run build` before it loads here.
