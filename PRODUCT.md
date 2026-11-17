# Product

<!-- impeccable:product-schema 1 -->

Product truth for Stimming. Design tools read this file before they make a new surface.
Sources: `AGENTS.md` (Tom's rulings) and Tom's answers of 2026-11-16. This file holds no visual decisions.

## Platform

web

## Users

Anyone who fidgets.
The visitor sits at a desk, often in an office, and opens one toy to play for a short time.
Phones count: every page is checked at 375 × 812 and 812 × 375.
The visitor comes to play. Reading is for the curious visitor only.

## Product Purpose

Stimming is a directory of small interactive desk toys: one menu, and one self-contained page per toy on a shared shell.
A toy page has two parts:

| Part | Job |
|---|---|
| Player | The toy itself on a full stage, with the Bar v2 controls. |
| Content zone | The page under the stage, in fixed short sections: idea, making-of, changes, credits. Nothing is written on the stage. |

Success: the visitor plays first, with nothing in the way. A curious visitor finds the content zone and reads it with ease.

## Positioning

- Every toy is an original object. No toy carries a brand name (Tom's exceptions: Domino Day, Strandbeest).
- Every toy has a Flemish name with IPA beside its English name (`toys.json`).
- Shader-rich toys are the strength: Glass, Rain, Bubbles, Galaxy.
- S tier, the bar for new toys: Prism, Googly eyes, Fire, Pin art.

## Operating Context

- Plain HTML and JS, no build step. GitHub Pages deploys every push to `main`.
- New toys start in the Lab (`?lab`). A toy reaches the main shelf only after Tom vets it.
- One change goes to one toy first. Tom picks the toys that get it next.
- Content authoring: Claude drafts each toy's content from its doc (`docs/toys/`) and its bean; Tom edits. One structured file per toy.

## Capabilities and Constraints

- `toys.json` is the one source for each toy's name, number, Flemish name, IPA, motto, emblem and accent. `series.json` defines the eleven series.
- Libraries are one fixed set (`docs/standards/code.md`). Add no other library without Tom.
- Hold 30 fps or better. An idle page does no per-frame work.
- Sound is synthesized, muted by default, and starts after a gesture.
- The page scrolls past the stage only into the content zone, never sideways (Bar v2 rule 4).
- The toy stops when its stage leaves view.

Open decisions:

- The transition from the player to the content zone. Tom picked Recede on 2026-11-09 and asked for more iterations on 2026-11-16.
- The file format of a toy's content.

## Brand Commitments

Tom's standing rulings. Record only; do not expand.

- Name: Stimming. The onnozelaer mark sits in the footer.
- Dark only. Colours are OKLCH tokens (`shared/stim.css`).
- Type: Gabarito for writing, B612 for the wordmark and headings, Iosevka Term Slab caps for menu labels and controls.
- Taste: daring, zany and original. Never skeuomorphic or fussy.
- Too much: Harmonograph and Music box were "way too involved". Too little: bare-minimal is "too minimal".
- Usable first: the Awwwards-style menu set was "fun but not usable".
- No blurbs or taglines on the stage. Writing lives under the stage.
- No hard offset shadow on anything. A soft halo is fine.
- Series icons: no gold border, no sparks, no depth, tilt or wobble, no sheen.
- The intro ships the Signal variety: a flash box, then the logo takes the toy's accent.
- Graphics: practical lamps, real materials and haze; never wall-to-wall neon.
- Big things move at real speed or slower.
- Replies and lab pages carry no design-explanation copy. Show the thing; labels only.

## Evidence on Hand

| Evidence | Path |
|---|---|
| Toy facts | `toys.json`, `series.json` |
| Toy docs | `docs/toys/` |
| Work history per toy | `.beans/` |
| Icon verdicts | `icons/picks.json` |
| First content zone wireframes | `annexlab/`, `docs/plans/annex.md` |

Absent, never fabricate: photographs, process pictures, quotes from visitors, visitor numbers.
No toy has content-zone copy today; `section.about` is hidden on every page.

## Product Principles

1. Play first. Nothing stands between the visitor and the toy.
2. Usable before showy. Motion serves the way to the content, not itself.
3. One standard. Every toy's content zone uses the same parts in the same order.
4. Perfect one thing first, then roll it out toy by toy.
5. Original objects only: no brand names, no copies.

## Accessibility & Inclusion

- Respect `prefers-reduced-motion`: a plain scroll, no pinned or animated stage.
- Touch targets are 34 px or more on phones.
- The shell measures collisions; no layout relies on a breakpoint alone.
