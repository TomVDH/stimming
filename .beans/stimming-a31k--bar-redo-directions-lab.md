---
# stimming-a31k
title: 'Bar redo: directions lab'
status: in-progress
type: spike
created_at: 2026-11-16T09:53:39Z
updated_at: 2026-11-16T09:53:39Z
---

Tom, 2026-11-16: "we are completely redoing the style and ux of the bars". He gave no brief and said: just dive in.

Question: which direction does the bar redo take?

`barlab/` (noindex) shows directions on a real toy. A stand-in for `shared/stim.js` takes the toy's own `bar` spec and builds each direction from it. No shell file changes.

## Checklist

- [x] `barlab/index.html`: concept switch, toy picker, size switch
- [x] `barlab/shim.js`: wraps `initPage`, builds a direction from the spec and the handles
- [x] Four directions: Dock, Bare, Tuck, Askew; Today for comparison
- [x] Requirements from the drift rows: a keyboard focus mark (a bar under the control), 44 px touch targets, 12 px text at full ink
- [ ] Not checked: 812 x 375, a real touch screen, keyboard-only use from end to end
- [x] Check 1280 px and 375 x 812; clean console
- [x] Tom's ingredients (2026-11-16, by dialog): keep One bar (Dock) and No boxes (Bare); build from the intro's flash beats; controls leave while you touch the stage, then return
- [x] One idea from those ingredients: the Signal bar, in `barlab/` (the lab's default view; Replay and `?slow=N` show its beats)
- [x] Signal checked on Galaxy, Pendulum, Fire, Eyes and Rain at 1280 px and 375 x 812: no control leaves the stage, clean console; arrival, leave and return filmed frame by frame
- [ ] Not checked on Signal: 812 x 375, a real touch screen, keyboard-only use, the frame cost of the glass on a slow machine
- [x] Tom's verdict on the Signal bar (2026-11-16): "i like signal a lot -- needs some iterations". Signal is the base
- [x] Branches: another session built Standard (three rounds) on `claude/bold-davinci-7fc18a` and cut the first four directions there. Signal continues on `claude/bold-davinci-7fc18a-signal`; neither branch overwrites the other
- [x] Signal round 2 (Tom, 2026-11-16, by dialog: iterate type and weight, the sheets, the motion beats and the toy's ink; keep the soft glass)
  - Type: Iosevka Term Slab ExtraBold 14 px, 18 px icons, 44 px controls, a heavier slider
  - Ink: white is the flash (a thing that happens now); the toy's accent is a state that holds (icons, the slider fill, a held pick)
  - Beats: a pick cuts in oversize for one frame, holds two, then parts; a picked row holds one frame in ink before its list leaves
  - Sheets: no boxes or hairlines; a sheet lands as a flash box from its own button and parts over its rows; it leaves in two frames
- [x] Tom, 2026-11-16: "we'll keep bare too". The lab shows Signal, Bare and Today; Dock, Tuck and Askew are cut from the lab and its code
- [ ] Not checked on round 2: 812 x 375, a real touch screen, keyboard-only use; Railgun loads in the lab but two of its files failed once on the local server
- [x] Tom on round 2 (2026-11-16): the layout is "great"; the flash reveals and the transitions into sheets are "perfect"; redo the button and control interactions with the skills
- [x] Round 3 (Tom, 2026-11-16: colour variations and accents incl. foldout menus; Cauldron and Train ride and toys with diverse menus; stop the auto fade, or leave after 8 s of inactivity; pull the latest main)
  - Merged `origin/main` (453 commits): the lab reads today's toys; `barlab/AGENTS.md` holds the lab's record
  - Toys: Cauldron, Train ride, Railgun, Window seat, Car wash, Wind map, Frietkot join Galaxy, Pendulum, Fire, Rain, Eyes; each loads at its own address in a fresh frame
  - Menu edge cases: option groups, row groups, long choice rows that step, a Dev sheet, a bar on two rows, a list that scrolls
  - Presence: the bar and its key strip stay; they leave after 8 s with no input and return on the next one (knob: Never, On touch)
  - Colour: knobs for Accent (Toy, Series, Wordmark, White, own) and Ink (Marks, Words, Flash)
  - Interactions, from emil-design-eng and gestures: the press is the flash (box on pointer down, oversize for one frame, parts on release); pointing is a line under the word; no box for a key press; icon buttons name themselves after 450 ms, at once on a neighbour; the slider thumb answers the grip; sound off rests white
- [ ] The `review-animations` skill is not run on Signal
- [x] Tom's pick (2026-11-17): Accent Toy, Ink Marks. The toy's own accent inks the icons, the slider fill and a held pick; the words stay white
- [x] Round 4 (Tom, 2026-11-17: hover interactions, colour contrast, the info and keycap menus)
  - Hover is a ladder from the intro: bare at rest, the flash box dropped to an ink bar at the foot when you point, the white box when you press; the slider's thumb takes the ink; keyboard focus shows the same bar
  - Contrast, measured on all 112 accents: marks reach 4.26:1 or more on their dark edge; dark text on a held pick failed on honey, turing, calaeno, meshball and lavaskin, so a pick now takes the accent's lightest stop and the text colour that reaches 4.5:1; sheet headings are full white (grey was 3.9:1 on glass over a bright scene)
  - Keycaps are small flash boxes (white, dark ink, a dark edge) on the strip, on actions and in sheets
  - (i) opens a How to play sheet: every gesture, every action key and every option key
- [x] Tom, 2026-11-17: the round 3 underline clung to the letters; he wants controls for the hover treatments. The underline is gone. A Hover knob holds six: Ink bar (the default, at the very foot, clear of the letters), Line, White box, Ink box, Brackets, Ink word. A press is the white box in all six; keyboard focus is the ink bar in all six
- [x] Tom's pick (2026-11-17): Hover is the White box. The white flash box closes in from the sides when you point; a press lands it oversize for one frame. It is the lab's default
- [x] Top left (Tom, 2026-11-17, by dialog: the toy's own mark; it always stays). The toy's emblem in its ink, then its name. Pointing flashes the white box and swaps in a back arrow and the Stimming wordmark; a click goes to the menu. On the first arrival it lands on the bar's beat. A toy with no emblem (63 of 112) shows its name alone
- [ ] Open: the name and the emblem wear the dark edge that every Signal word wears. Tom's older rule says no shadow on the logo or the name. Tom rules
- [ ] Tom judges the rest of round 4 (keycaps, How to play, the contrast fixes) and the top left
- [ ] Not checked: 812 x 375, a real touch screen, keyboard-only use, a disabled control
- [ ] Next, on Tom's yes only: Signal moves from the lab into the shell on one toy (hard rule 3: its own bean)

## Notes

- The lab loads the toy page as text into the frame's `srcdoc`. Its import map gets a scope that points `shared/stim.js` at `barlab/shim.js` for modules in the toy's folder only.
- The shim hides the shell's layer and acts through the shell's handles (`ui.choice`, `ui.slider`, `ui.action`, `ui.setting`). The `bar` spec does not change.
- Checked on Galaxy, Pendulum, Fire, Rain and Eyes: no control leaves the stage, no button under 34 px, clean console.
- Known weak point: Bare's icons are faint on a bright mid-tone scene (Rain).
- Signal's motion plan (choreograph skill): the bar is one object with one entrance. First arrival: the flash fills for 2 frames, snaps to size, holds, then parts in 3 frames; the key strip joins as the box parts. Return: 5 frames. Leave: 3 frames. A sheet lands in 2 frames with its glass; its rows do not stagger. Every sequence stops when a newer one starts. Reduced motion shows and hides at once.
- The flash box uses difference blending inside one isolated group, so the words under it turn dark frame by frame with no second copy.
