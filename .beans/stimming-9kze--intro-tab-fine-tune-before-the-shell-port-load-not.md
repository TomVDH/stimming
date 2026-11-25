---
# stimming-9kze
title: 'Intro tab: fine-tune before the shell port (load note, Line, phone fit)'
status: in-progress
type: task
priority: normal
created_at: 2026-11-25T19:17:01Z
updated_at: 2026-11-25T19:55:15Z
parent: stimming-0cau
---

Tom, 2026-11-25: "lets get the new intro fine tuned and integrated (with accesibility icons etc)". Picks: Line row; alignment and icon colour picked on the bench; swap Stage words for the shipped load note; phone fit at 375 x 812.

Bench only: accesslab/panels/intro.js. The shell port is its own feature bean.

- [x] Stage words trial out; the simulated load feeds the shipped loadNote()
- [x] Line is the default row layout
- [ ] Line fits at 375 x 812 in Centre, Bottom centre and Left (railgun, domino, flametest, starchart, pop, fidget)
- [ ] Tom picks alignment and icon colour from stills
- [x] docs/plans/access.md Intro row

Tom, 2026-11-25: "can we please come up with BETTER alignment of the box in which the icon, the title, the subtext, the accessiblity row and hte laoder dispalys? ... ensure this alignment works across all possible intro styles".

- [x] measure() places the block as one piece: Centre and Left at 47 % height, box centred; Bottom centre one gap above the foot
- [x] Load note on one line, centred; the load line widens to a wider note
- [x] Checked 8 varieties x 3 alignments at 1024 x 768: all centred, no copy shrink
- [x] Tom verifies on the bench
- [ ] Recheck at 375 x 812 after the rework

Tom, 2026-11-25, same session:
- [x] Loader (load note over the load line) at the intro's bottom centre; one width (clamp 180 to 280 px) and one type (Iosevka Term Slab 800) in every variety
- [x] Alignments: Centre / Bottom centre / Centre, content left / Bottom left; Bottom left keeps one inset (6 % of the width, 24 to 80 px) left and below; its flash grows from the corner
- [x] Copy no longer shrinks from the engine's fit at its default point; Squad's motto stays in the column; Bottom centre and Bottom left pull the motto into the block
- [x] Controls: labelled rows (Play, Look, Align, Test); a step strip on the stage (Glass, Pop, Flash, Lines, Rest, Exit) stops on any step, Next or N goes on, Step through stops on each; Hold is now a stop on Rest
- [x] Knobs: try-outs renamed with a line each (Sample lines, Title in flash, Line flash, Classic notice); every group open with its own Reset; Y knobs act live; Pop size replays
- [ ] Tom checks the bench

- [x] Type styles in Knobs: per line (Title, Translation, Subtitle, Motto, Motto NL, Access row, Load note) font, case, weight, letter and word spacing, line height; per effect; the judged look records them
- [x] Load: Hold keeps the loader up; the load line centres on the tech tags' row
- [x] Icon colour paints the logo in every effect
- [x] Signal's slab title set tighter and in caps, font as made: letter spacing -0.03em, word spacing -0.22em (Tom)

- [x] Stars: Signal, Punch, Shutter (Tom); the arrows step through the stars, All effects shows the rest. Rare Punch in the shell: stimming-z69r
