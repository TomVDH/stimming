---
# stimming-465y
title: 'Toy annex: the page under the stage'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-09T09:37:22Z
updated_at: 2026-11-22T09:38:56Z
---



Wireframe the annex a visitor scrolls into under a toy's stage, and the transition into it. Successor to the parked section.about.

Lab: annexlab/index.html (noindex, stand-in stage, three directions). Data: docs/plans/annex.md.

## Checklist
- [x] Lab page with three directions
- [x] Data proposal
- [x] Stills at 1280 and 375 x 812 to Tom
- [x] Tom's pick recorded here

## Directions

- A · Recede: the fixed stage scales and dims; the annex rises as a sheet with a 12 px lip. Main column plus side rail.
- B · Dock: the stage scrolls away; logo and name dock as a header with Back. Sticky gallery label plus reading column.
- C · Cut: proximity snap; the title wipes in as a flash box. Spec sheet, version log, numbered credits.

All: corners fade in the first quarter; one exit progress drives everything (view timeline, JS fallback); whenVisible on the scene; reduced motion is a plain scroll. Detail and data: docs/plans/annex.md.

## Pick

Tom picked A · Recede (2026-11-09). The 12 px lip is the stage cue.

Bar v2 rule 4 amended (Tom, 2026-11-09): the page scrolls past the stage only into the annex.

Notes carry change and version only; sign-offs stay off the page (Tom, 2026-11-09).

## Round 2 (2026-11-16)

Tom: "another stab", "a couple more iterations", an Awwwards-inspired transition; the zone holds the making-of, the idea, notes and attribution; Claude drafts, Tom edits.

Lab: annexlab/round2.html, in the shell's own look, on the live Glass toy. Detail: docs/plans/annex.md.

- [x] A · Recede as the baseline, restyled
- [x] D · Drum: the stage and the zone as two faces of a drum
- [x] E · Placard: the accent label rides up and docks as the header
- [x] F · Tide: the series Wave floods up over the stage
- [x] One content kit: title block, idea, making of, notes, credits, also try
- [x] Checked at 1280 x 720 and 375 x 812; no sideways scroll; clean console
- [x] Two more: G · Lead figure and H · Flash cut
- [x] Tom's pick: H · Flash cut (2026-11-16). The rest is parked. No full white card on the dark site: only the logo box and the name box flash, in the intro's beats
- [x] Five title block layouts for Flash cut: Stack, Poster, Ledger, Centre, Side
- [x] Tom rejected all five (2026-11-16): too ordinary, wrong ingredients; the emblem must lead
- [x] Second set, emblem-led: Window, Giant, Echo, Orbit; the facts move to the credits
- [x] At rest the toy fills the whole screen; the About hint floats on it, bottom centre
- [x] Tom rejected the second set too (2026-11-16): "all are so trite"
- [x] Test sheet: annexlab/sheet.html
- [ ] A title block Tom accepts (see Handoff)
- [ ] A border between toy and content that fits each toy (Tom, 2026-11-16)
- [ ] The content, after the layout
- [ ] Real stills for the picture blocks

Branch (Tom, 2026-11-16): this work pushes to feature/stimming-465y, not main; MacBook work is incoming on main.

## Handoff (2026-11-16)

Read this section first. It holds the whole state, so a new chat can go on from here.

### What Tom wants

His words, 2026-11-16: "we have the player with the toy -- but we also need an /awwwards inspired transition to the content zone -- this is wher a blog, images etc etc can exist -- notes and what not, attribution -- neat and standardized".

- Audience: anyone who fidgets. The visitor plays first; reading is for the curious.
- The content zone holds four things: the making-of, the idea behind the toy, notes and changes, attribution.
- Claude drafts each toy's content from its doc and bean; Tom edits. One structured file per toy.
- Order of work, by Tom: the transition, then the layout of the title block, then the content.

### Where it stands

| Part | State |
|---|---|
| Transition | Decided: H · Flash cut. |
| Rest state and cue | Decided: the full toy with round corners, one quiet centred hint. |
| Title block layout | Open. Two sets, nine layouts, all rejected. This is the next job. |
| Border between toy and content | Open. Tom wants it to fit each toy. Not started. |
| Content kit and file format | Drafted in the lab only. Tom has not judged it. |
| Shell build | Not started. Nothing in `shared/` or any toy page changed. |

### Tom's rulings (all 2026-11-16)

| Ruling | His words |
|---|---|
| Flash cut is the transition. | "i like flash cut -- abandon the rest for now" |
| The intro is the reference. Its value is the rhythm and the size beats. | "the intros thing is the rythm of the flashes qand the size flashes" |
| No full white card on the dark site. | "we should havent a full white card on a dark modoe website" |
| No hard border between toy and content, in any direction. | "that border is ugly -- for all editiosn or iterations -- we want a gentel centre aligned hint -- no hard border" |
| At rest the toy is full, with round corners. | "the init is the full toy wirth rounded corners --- gentele and neat"; later "I thought i said we have FULL Toy?" |
| The border must fit each toy. | "we'd wanna think too about the border between toy aedn conten to be relevant per-toy too" |
| The emblem leads the title block. | His answer to a direct question. |
| The first layout set is too ordinary and has the wrong ingredients. | "none of thjem tbf", then those two answers. |
| The second layout set fails too. | "all are so trite dude" |
| This work stays off `main`. | "push all of this as part of a sep branch -- we got a lot of work from the macbook incoming" |

### What was tried, and the verdict

| Round | Item | Verdict |
|---|---|---|
| 1 (2026-11-09) | A · Recede, B · Dock, C · Cut, as grayscale wireframes | Tom picked A. Round 2 replaced it. |
| 2 | A · Recede, D · Drum, E · Placard, F · Tide, G · Lead figure | Parked. The code stays on the lab switch. |
| 2 | H · Flash cut, first build: a white panel in difference blend | Rejected: a white card. Gone. |
| 2 | H · Flash cut, second build: a dark sheet, small flashes in the intro's beats | Picked. |
| 2 | Cue: a 3 px white scan bar on a lip | Rejected: ugly, a hard border. Gone. |
| 2 | Cue: `About` and a chevron in a 34 px strip under the toy | Rejected: the toy was not full. Gone. |
| 2 | Cue: the same hint, floating on the full toy, bottom centre | Built last. Tom has not judged it. |
| Layout set 1 | Stack, Poster, Ledger, Centre, Side | Rejected: too ordinary, wrong ingredients. Gone from the lab. |
| Layout set 2 | Window, Giant, Echo, Orbit | Rejected: trite. Still in the lab, marked rejected on the sheet. |

### Why the layouts miss (my reading, not Tom's words)

1. Both sets arrange the same header parts: a logo, a name, small lines. A new arrangement of a page header stays a page header. Tom reads that as ordinary.
2. Set 2 added known web tricks: a mask window, an oversize mark, a repeat, ring text. Tom reads a known trick as trite.
3. What Tom liked was never a layout. Flash cut and the intro are about time: beats, cuts, size changes. The next try must design the block as a sequence in time, not as a static composition.
4. "Wrong ingredients" is not resolved. I took the facts (number, series, build, sound) out of the block and put them with the credits. That is my call. Ask Tom which parts belong.
5. I showed menus of four or five options. Tom rejected each menu whole. Show one strong idea next, or ask him for two references first.

### Advice for the next chat

- Start from the intro itself: `shared/intro.js` (`TIMING`, the Signal variety) and `shared/intro.css`. `introlab/` tunes it live.
- Ask Tom for a reference before you draw: a site, a title sequence, or one of his own toys that has the feeling.
- Tom judges in the browser while you build. Keep the lab page working at all times.
- Tom answers option dialogs fast and skips open questions. Ask with concrete options.
- Never propose: a white card, a hard line, a strip that shortens the toy, a facts table up top, or a page-header layout.

### Files

| File | What it is |
|---|---|
| `annexlab/sheet.html` | The test sheet. Ten live cards: six transitions, four title layouts. Start here. |
| `annexlab/round2.html` | The lab. One file, the live Glass toy in a frame. |
| `annexlab/index.html` | Round 1, grayscale wireframes. |
| `docs/plans/annex.md` | The plan: both rounds, the content kit, the data proposal. |
| `PRODUCT.md`, `DESIGN.md`, `.impeccable/design.json` | Product truth and the visual system as the code has it. On `main`. |

Run: start the `stimming` preview server, then open `/.worktrees/stimming-465y/annexlab/sheet.html` (the branch), or `/annexlab/sheet.html` after the PR merges.

Lab keys and URL:

| Key | Does |
|---|---|
| `?d=h` | The transition: `a`, `d`, `e`, `f`, `g` or `h`. The lab opens on `h`. |
| `?v=a..d` | The title layout of Flash cut. Keys 1 to 4. |
| `?y=0.5` | Scrolls half the travel on load. `?y=1` lands on the zone. |
| `?rm=1` | Reduced motion: a plain scroll. |
| `?lab=1` | Opens the lab panel. `R` replays the beats. |

### How Flash cut works

- One value drives the scroll effects: `--p`, 0 at the toy and 1 at the zone. The lab writes it from `scrollY` in `drive()`.
- The stage is fixed and dims to 0.62. The zone is a dark sheet with 18 px top corners.
- The hint is `.ax-lip` in direction `h`: absolute, bottom centre of the stage, 34 px high, no room taken. It fades by `--p` 0.16.
- The beats run when `--p` passes 0.55 and reset under 0.15 (`beats()`). They are CSS animations with `steps(1, end)` at 30 fps: lead 3 frames, the big logo box 3, the logo box and the name box at size 11, then rest. Each small line then cuts in with two inverted frames.
- Each part heading cuts in when it comes into view (`.cut`).
- Reduced motion turns all of it off.

### Traps

- The lab holds the toy in an iframe. The shell build has no iframe: the stage is the page's own `.stage`, and the bottom corners of Bar v2 must make room for the hint.
- The lab lifts the toy's key strip 22 px by a style it adds inside the frame (`liftKeys()`). The shell must measure that collision itself.
- The toy runs on under the sheet in the lab. The shell must stop it with `whenVisible`, on the scene block.
- `stim.css` removes every focus outline and all text selection. The lab puts both back for the zone only.
- The Browser pane must be visible when you test. In a hidden pane no animation frame runs, so the beats and the scroll driver stand still and a screenshot shows an empty title.
- The Window layout masks `.ax-body` with the emblem. It needs the stage visible past `--p` 1.
- The copy for Glass is a draft. Its notes come from the Git log of `glass/index.html`. The idea text states real fracture physics; check it before it ships.
- The picture blocks are empty slots. The project has no stills, and a browser screenshot is too small to use.

### Git

- Branch: `feature/stimming-465y`, pushed. Worktree: `.worktrees/stimming-465y`. Work there, and commit with `tools/commit.sh`.
- 2026-11-17: `main` took 410 commits from the MacBook. `main` is merged into this branch; the merge was clean. The branch is `main` plus the annex work, so a PR merges with no conflict.
- The PR changes four files only: `annexlab/round2.html`, `annexlab/sheet.html`, `docs/plans/annex.md` and this bean. It touches no toy, no file in `shared/` and not the menu.
- Until the PR merges, `main` holds the first build of the lab (four directions, no Flash cut). Test the branch at `/.worktrees/stimming-465y/annexlab/sheet.html` on the dev server.
- The shell on `main` now sets headings in B612. The lab links the shell, so its names and part headings show in B612, not Gabarito. Tom has not ruled on that for the content zone.
- The lab and the sheet take their fonts from the shell; no page links Google Fonts.
- `PRODUCT.md`, round 2 with its first four directions, and `DESIGN.md` went to `main` on 2026-11-16, before Tom asked for a branch.

### Design tools (bean `stimming-lcp9`)

- Installed at user level on this machine: intent, ui-ux-pro-max, design-taste-frontend, impeccable (no hooks). Genjutsu is not installed: adjudant names no source.
- A companion chat, "Stimming design system: north star, scales, drift", works from `DESIGN.md` on its own branch. It must not edit `annexlab/`.

### Next steps

- [ ] Tom tests on `annexlab/sheet.html` and judges the floating hint
- [ ] Ask Tom which parts belong in the title block, and for a reference
- [ ] One new proposal for the title block, as a sequence in time on the intro's beats
- [ ] A border between toy and content that fits each toy
- [ ] The content kit and its file format, after the layout
- [ ] Then the shell build below

## Round 3 (2026-11-22)

Tom said yes to one idea: the toy breaks its own frame. The border between toy and content comes from the toy's material and lands in beats.

- [x] S · Seam in the lab (`?d=s`), on Glass only: a star fracture from one hit. Cracks show on beat 1; outer wedges fall on beats 2 and 3, the middle ring on beat 4, the hit on beat 5. Each beat flashes the live cracks for two frames.
- [x] The hit is where the emblem lands. The title block lands centred, in the intro's shape, with the Flash cut beats.
- [x] Checked at 1280 x 720, 375 x 812 and 812 x 375; no sideways scroll; clean console; reduced motion is a plain scroll.
- [x] Tom's verdict on Seam: "cool concept" (2026-11-22). He asked for five more on random toys, with Soup cauldron.
- [x] Five more seams (`&t=<id>`): Lichtenberg burn (char with an ember rim), Crossing button (the sixteen-LED ring ticks out), Pop field (bubbles pop), Dijkstra (routes, then the grid by distance), Soup cauldron (goo rises). Checked at three sizes; clean console.
- [x] The sheet loads frames in view or on a click (Tom, 2026-11-22). The choice is remembered; `?load=click` sets it.
- [ ] Tom picks among the six, or asks for changes
- [ ] Then a seam data shape for the shell, and the content

## Build (next)
- [ ] Annex shell in shared/ (fixed stage, sheet, exit timeline, JS fallback, reduced motion)
- [ ] annex.json loader and shared/credits.json
- [ ] Bar v2 bottom corners lift by the lip
- [ ] tests/bar-v2.html: the no-scroll check allows the annex, still fails on sideways scroll
- [ ] One toy first; Tom picks which
