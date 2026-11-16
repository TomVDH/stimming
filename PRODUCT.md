# Product

<!-- impeccable:product-schema 1 -->

Product truth for Stimming. Design tools read this file before they make a new surface.
Sources: `AGENTS.md` (Tom's rulings) and Tom's answers of 2026-11-16. This file holds no visual decisions.

## Platform

web

## Users

Anyone who fidgets (Tom, 2026-11-16).
The visitor sits at a desk, often in an office, and opens one toy to play for a short time.
Phones count: every page is checked at 375 × 812 and 812 × 375.
The visitor comes to play. Reading is for the curious visitor only.

## Product Purpose

Stimming is a directory of small interactive desk toys: one menu, and one self-contained page per toy on a shared shell.
A toy page has two parts:

| Part | Job |
|---|---|
| Player | The toy itself on a full stage, with the Bar v2 controls. |
| Content zone | The page under the stage. It holds the making-of, the idea behind the toy, notes and changes, and attribution (Tom, 2026-11-16). |

Success: the visitor plays first, with nothing in the way. A curious visitor finds the content zone and reads it with ease.

## Positioning

- Every toy is an original object. No toy carries a brand name (Tom's exceptions: Domino Day, Strandbeest).
- Every toy has a Flemish name with IPA beside its English name (`toys.json`).
- Shader-rich toys are the strength: Glass, Rain, Bubbles, Galaxy.

## Operating Context

- Plain HTML and JS, no build step. GitHub Pages deploys every push to `main`.
- New toys start in the Lab (`?lab`). A toy reaches the main shelf only after Tom vets it.
- One change goes to one toy first. Tom picks the toys that get it next.
- Content authoring: Claude drafts each toy's content from its doc (`docs/toys/`) and its bean; Tom edits. One structured file per toy (Tom, 2026-11-16).

## Capabilities and Constraints

- 42 toys on the main shelf, 61 in the Lab (2026-11-16).
- `toys.json` is the one source for each toy's name, number, Flemish name, IPA, motto, emblem and accent. `series.json` defines the eleven series.
- Libraries are one fixed set (three.js, culori, Tone.js, GSAP, simplex-noise). Add no other library without Tom.
- Hold 30 fps or better. An idle page does no per-frame work.
- Sound is synthesized, muted by default, and starts after a gesture.
- The page scrolls past the stage only into the content zone, never sideways (Bar v2 rule 4).
- The toy stops when its stage leaves view.

Open decisions:

- The transition from the player to the content zone. Tom picked Recede on 2026-11-09 and asked for more iterations on 2026-11-16.
- The file format of a toy's content.
- The copy rule says writing lives only in the vignette (a heading, two paragraphs, a figure). The content zone holds more than that; the new limit is not set.

## Brand Commitments

Tom's standing rulings. Record only; do not expand.

- Name: Stimming. The onnozelaer mark sits in the footer.
- Dark only. Colours are OKLCH tokens (`shared/stim.css`).
- Type: Gabarito. Menu toy labels use Iosevka Term Slab in caps.
- Taste: daring, zany and original. Never skeuomorphic or fussy.
- Too much: Harmonograph and Music box were "way too involved". Too little: bare-minimal is "too minimal".
- Usable first: the Awwwards-style menu set was "fun but not usable".
- No blurbs or taglines on the stage. Writing lives under the stage.
- Menu icons: never a two-tone hard offset shadow. A soft halo is fine.
- Series icons: no gold border, no sparks, no depth, tilt or wobble, no sheen.
- The intro ships the Signal variety: a flash box, then the logo takes the toy's accent.

## Evidence on Hand

| Evidence | Path |
|---|---|
| Toy facts | `toys.json`, `series.json` |
| Toy docs (20 toys) | `docs/toys/` |
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
