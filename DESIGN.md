---
name: Stimming
description: "Small interactive desk toys: one menu, one page per toy on a shared shell."
colors:
  bg: "oklch(0.16 0.012 275)"
  surface: "oklch(0.195 0.014 275)"
  line: "oklch(0.29 0.016 275)"
  fg: "oklch(0.94 0.008 275)"
  muted: "oklch(0.64 0.02 275)"
  stage: "oklch(0.2 0.012 270)"
  glass: "oklch(0.13 0.012 275 / 0.86)"
  sheet: "oklch(0.12 0.012 275 / 0.97)"
  shadow-ink: "oklch(0.05 0.01 275)"
  flash: "#fff"
  sketch: "oklch(0.52 0.025 275)"
  focus: "oklch(0.84 0.13 205)"
  pick: "oklch(0.7 0.18 320 / 0.35)"
  mark-1: "oklch(0.8 0.15 62)"
  mark-2: "oklch(0.72 0.2 318)"
  mark-3: "oklch(0.8 0.12 195)"
  mark-4: "oklch(0.7 0.19 32)"
  mark-5: "oklch(0.72 0.14 255)"
  mark-6: "oklch(0.82 0.11 345)"
  mark-7: "oklch(0.86 0.15 100)"
  mark-8: "oklch(0.78 0.16 150)"
  series-vistas: "oklch(0.93 0.025 90)"
  series-eastvan: "oklch(0.8 0.12 165)"
  series-belgian: "oklch(0.8 0.15 72)"
  series-poke: "oklch(0.76 0.16 28)"
  series-light: "oklch(0.88 0.1 200)"
  series-goo: "oklch(0.82 0.19 135)"
  series-science: "oklch(0.74 0.14 250)"
  series-maths: "oklch(0.74 0.18 345)"
  series-dark: "oklch(0.74 0.14 295)"
  series-wild: "oklch(0.84 0.13 112)"
  series-odd: "oklch(0.76 0.19 322)"
typography:
  wordmark:
    fontFamily: "B612, Gabarito, Avenir Next, Segoe UI, system-ui, sans-serif"
    fontSize: "clamp(48px, 9vw, 104px)"
    lineHeight: 1
    letterSpacing: "-0.02em"
  display:
    fontFamily: "Gabarito, Avenir Next, Segoe UI, system-ui, sans-serif"
    fontSize: "clamp(44px, 8vw, 96px)"
    fontWeight: 700
    lineHeight: 0.9
    letterSpacing: "-0.04em"
  intro-name:
    fontFamily: "Gabarito, system-ui, sans-serif"
    fontSize: "clamp(30px, min(9cqw, 7.5cqh), 84px)"
    fontWeight: 800
    lineHeight: 1.12
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Gabarito, Avenir Next, Segoe UI, system-ui, sans-serif"
    fontSize: "clamp(17px, 2.4vw, 22px)"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Gabarito, Avenir Next, Segoe UI, system-ui, sans-serif"
    fontSize: "clamp(18px, 1.8vw, 22px)"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Gabarito, Avenir Next, Segoe UI, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.35
  prose:
    fontFamily: "Gabarito, Avenir Next, Segoe UI, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 500
    lineHeight: 1.6
  label:
    fontFamily: "Iosevka Term Slab, ui-monospace, monospace"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0.07em"
  toy-label:
    fontFamily: "Iosevka Term Slab, ui-monospace, monospace"
    fontSize: "13px"
    fontWeight: 500
    letterSpacing: "0.06em"
  keycap:
    fontFamily: "Iosevka Term Slab, ui-monospace, monospace"
    fontSize: "10px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.06em"
rounded:
  slab: "2px"
  tile: "16px"
  stage: "18px"
  pill: "999px"
spacing:
  control-gap: "6px"
  corner: "12px"
  sheet-pad: "12px"
  gutter: "16px"
  chip: "26px"
  chip-touch: "36px"
components:
  chip:
    backgroundColor: "{colors.glass}"
    textColor: "{colors.muted}"
    typography: "{typography.label}"
    rounded: "{rounded.slab}"
    padding: "0 10px"
    height: "26px"
  chip-hover:
    backgroundColor: "{colors.glass}"
    textColor: "{colors.fg}"
  chip-picked:
    backgroundColor: "{colors.fg}"
    textColor: "{colors.bg}"
  slider:
    backgroundColor: "{colors.glass}"
    textColor: "{colors.muted}"
    typography: "{typography.label}"
    rounded: "{rounded.slab}"
    padding: "0 10px"
    height: "26px"
  sheet:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.fg}"
    typography: "{typography.label}"
    width: "280px"
  keycap:
    backgroundColor: "{colors.glass}"
    textColor: "{colors.fg}"
    typography: "{typography.keycap}"
    rounded: "{rounded.slab}"
    padding: "3px 5px"
  flash-box:
    backgroundColor: "{colors.flash}"
    textColor: "{colors.bg}"
  stage:
    backgroundColor: "{colors.stage}"
    rounded: "{rounded.stage}"
  toy-tile:
    textColor: "{colors.fg}"
    typography: "{typography.toy-label}"
    rounded: "{rounded.tile}"
  pill-chip:
    textColor: "{colors.muted}"
    rounded: "{rounded.pill}"
    padding: "6px 11px"
  pill-chip-pressed:
    textColor: "{colors.fg}"
---

# Design System: Stimming

This file records the visual system that the code holds on 2026-11-16.
It records; it does not propose. Sources, in order: `PRODUCT.md`, `AGENTS.md` (Tom's dated rulings), `shared/stim.css`, `shared/intro.css`, `shared/intro.js`, `index.html`, `series.json`, `toys.json`, `docs/plans/bar-v2.md`.
Where the code and a ruling disagree, see "Drift and gaps" at the end.

## Overview

**Creative North Star: not named yet. Tom sets it.**

Stimming is a dark shelf of toys. The page itself stays quiet: near-black violet ground, white type, hairlines. The colour belongs to the toys, to their icons and to the eight letters of the wordmark.
Tom's taste line governs every surface: "Daring, zany and original. Never skeuomorphic or fussy." Harmonograph and Music box were "way too involved". Bare-minimal is "too minimal". A menu concept must stay usable first.

Two voices share the screen. Gabarito speaks for the page (titles, prose). Iosevka Term Slab in caps speaks for the machine (toy labels, every Bar v2 control, keycaps). B612 carries the Stimming wordmark only, plus parts of the intro.
One device ties the intro, the controls and the build link together: the flash box. It is a white box with dark content cut out of it. The intro lands the logo in it. A picked control inverts into it.

A toy page puts play first. The stage fills the first screen. The controls sit in its four corners. Writing lives under the stage, and that zone is hidden today.

**Key Characteristics:**
- Dark only. Every colour is OKLCH.
- The shell has no accent colour of its own. Each toy brings one (`accent` in `toys.json`).
- Square slab controls on dark glass, with hard offset shadows as a state signal.
- The flash box: white fill, dark ink, used for the intro logo and for every picked control.
- Motion in the shell runs in steps at 30 fps, not in smooth curves.
- No browser interaction markers show: no ring, no tap flash, no selection.

## Colors

The neutrals are one hue family: lightness changes, chroma stays at 0.008 to 0.02, hue stays at 275. Colour comes from data, not from the shell.

### Primary

The system has no brand accent. Its strongest signal is inversion.

- **Flash** (`#fff`): the intro's flash box (`shared/intro.css:56-60`), the wiped text lines (`:99`) and the Classic or Fresh build link (`shared/stim.css:76-83`). At rest in the Signal intro the logo trades white for the toy's ink (`--ink`, `shared/intro.css:176-177`).
- **Picked** (`--fg` fill, `--bg` text): a picked chip, an open Settings button, an open tray (`shared/stim.css:359-361`). Bar v2 names this "the intro's flash box".

### Secondary

The wordmark's eight letter colours. They show only while the mark waves (hover, focus or tap); the letters rest white.
Source: `MARK` in `shared/stim.js:46-50` and the menu title in `index.html:394`. Both hold the same values.

| Letter | Token here | Value |
|---|---|---|
| S | `mark-1` | `oklch(0.8 0.15 62)` |
| t | `mark-2` | `oklch(0.72 0.2 318)` |
| i | `mark-3` | `oklch(0.8 0.12 195)` |
| m | `mark-4` | `oklch(0.7 0.19 32)` |
| m | `mark-5` | `oklch(0.72 0.14 255)` |
| i | `mark-6` | `oklch(0.82 0.11 345)` |
| n | `mark-7` | `oklch(0.86 0.15 100)` |
| g | `mark-8` | `oklch(0.78 0.16 150)` |

### Tertiary

Colour that data files own.

- **Series colours** (`series.json`): one per series, eleven in all. The Wave divider and the Hex ring take the colour.

  | Series | Value | Series | Value |
  |---|---|---|---|
  | Vistas | `oklch(0.93 0.025 90)` | Science fair | `oklch(0.74 0.14 250)` |
  | East Van | `oklch(0.8 0.12 165)` | Maths class | `oklch(0.74 0.18 345)` |
  | Belgium | `oklch(0.8 0.15 72)` | After dark | `oklch(0.74 0.14 295)` |
  | Poke & pop | `oklch(0.76 0.16 28)` | Wild | `oklch(0.84 0.13 112)` |
  | Light & glass | `oklch(0.88 0.1 200)` | Odd one out | `oklch(0.76 0.19 322)` |
  | Goo | `oklch(0.82 0.19 135)` | | |

- **Toy accents** (`toys.json`, field `accent`): one per toy. A value is one OKLCH colour or a `linear-gradient(...)` of OKLCH stops, most at 100deg. Examples: Morpher `linear-gradient(100deg, oklch(0.84 0.17 340), oklch(0.84 0.14 250))`, Pop field `oklch(0.9 0.2 128)`. The Signal intro inks the logo with it (`shared/intro.js:344-345`). The frontmatter does not list them; `toys.json` is the source.
- **Footer glow** (`index.html:114-121`): three radial glows under the menu's footer: `oklch(0.6 0.22 320 / 0.5)`, `oklch(0.74 0.14 200 / 0.42)`, `oklch(0.82 0.15 80 / 0.38)`.

### Neutral

Tokens on `:root` in `shared/stim.css:13-24`. The Bar v2 tokens sit on `.stim2` in `shared/stim.css:309-318`.

| Token | Value | Use |
|---|---|---|
| `--bg` | `oklch(0.16 0.012 275)` | Page ground. Also the dark ink inside a flash box. |
| `--surface` | `oklch(0.195 0.014 275)` | Defined. The shell does not use it. |
| `--line` | `oklch(0.29 0.016 275)` | Hairlines: control borders, dividers, the vignette rule. |
| `--fg` | `oklch(0.94 0.008 275)` | Text, the lit state, the slider fill. |
| `--muted` | `oklch(0.64 0.02 275)` | Quiet text: controls at rest, links, prose. |
| `--stage` | `oklch(0.2 0.012 270)` | Stage ground. A toy may set its own (Pop field: `var(--bg)`; Galaxy: `#000`). |
| `--glass` | `oklch(0.13 0.012 275 / 0.86)` | Backing of every Bar v2 control. |
| sheet (literal) | `oklch(0.12 0.012 275 / 0.97)` | Backing of a Bar v2 sheet (`shared/stim.css:416`). |
| shadow ink (literal) | `oklch(0.05 0.01 275)` | Hard shadows and the halo. The picked shadow uses `oklch(0.07 0.01 275)`. |
| `--sketch` | `oklch(0.52 0.025 275)` | Menu only: outline icons of planned toys (`index.html:17`, `:196-198`). |
| `--focus` | `oklch(0.84 0.13 205)` | Defined. No visible use (see Drift and gaps). |
| `--pick` | `oklch(0.7 0.18 320 / 0.35)` | Defined. The shell does not use it. |

### Named Rules

**The Dark Only Rule.** There is one theme. `color-scheme: dark` is set on `:root` and in each page's meta tag. No light variant exists.

**The Borrowed Colour Rule.** The shell owns no accent. Colour comes from the toy (`accent`), the series (`color`) or the wordmark's letters. Shell chrome stays in the neutral family and in white.

**The White Title Rule.** In the Signal intro the logo takes the toy's ink. The title stays white (Tom, 2026-11-09).

## Typography

**Display Font:** Gabarito (with "Avenir Next", "Segoe UI", system-ui, sans-serif). Variable, 400 to 900, from Google Fonts.
**Body Font:** Gabarito (same stack, token `--sans`).
**Label/Mono Font:** Iosevka Term Slab (with ui-monospace, monospace). Self-hosted in `shared/fonts/`, weights 500 and 700 (`shared/stim.css:307-308`). Token `--slab` on `.stim2`.
**Wordmark Font:** B612 (with `--sans`). From Google Fonts, weights 400 and 700.

**Character:** A round, friendly sans for the page, set tight and heavy at size. A slab monospace in caps for anything that acts like a machine label.

### Hierarchy

No type scale exists as tokens. Each size is a literal in its rule. These are the sizes in use.

- **Wordmark** (B612, mixed weights per letter, `clamp(48px, 9vw, 104px)`, line-height 1, -0.02em): the menu title (`index.html:44-50`, `:142`). In the toy header it is 22 px (`shared/stim.css:97`); in Bar v2 it is 70% of the chip height (`:380`). Each letter rests white, tilted and lifted by its own amount.
- **Display** (Gabarito 700, `clamp(44px, 8vw, 96px)`, 0.9, -0.04em): the toy's name above the vignette (`shared/stim.css:144`). Hidden today with its section.
- **Intro name** (Gabarito 800, `clamp(30px, min(9cqw, 7.5cqh), 84px)`, 1.12, -0.035em): the title in the Signal intro (`shared/intro.css:81-84`, `:178`). It scales with the shorter side of the screen.
- **Headline** (Gabarito 800, `clamp(17px, 2.4vw, 22px)`, 1, -0.01em): the series name in a Wave divider (`index.html:190`), in the series colour.
- **Title** (Gabarito 600, `clamp(18px, 1.8vw, 22px)`, 1.2, -0.015em): the vignette heading (`shared/stim.css:279`).
- **Body** (Gabarito 500, 14 px, 1.35): the toy page default (`shared/stim.css:27`). The menu sets 16 px / 1.3 (`index.html:24`).
- **Prose** (Gabarito, 15 px, 1.6, `--muted`, 58ch at most): vignette paragraphs (`shared/stim.css:280`). `em` is not italic; it turns `--fg`.
- **Label** (Iosevka Term Slab 500, 11 px, 1, 0.07em, caps): all Bar v2 control text (`shared/stim.css:328`). 12 px on coarse pointers. The toy name in the bar is 700 at 0.1em.
- **Toy label** (Iosevka Term Slab 500, 13 px, 0.06em, caps): the name under each menu icon (`index.html:144`). The Series switch and the Lab link use 12 px at 0.12em.
- **Keycap** (Iosevka Term Slab 700, 9 to 10 px, 0.06em): keys in the strip, on actions and in sheet headers (`shared/stim.css:426`, `:479`).

Intro copy in the Signal look: the Flemish name, the motto and its translation are set in B612 (`shared/intro.css:179-181`). Their size is `--copy`, `clamp(13px, min(3.6cqw, 1.9cqh), 18px)`.

### Named Rules

**The Two Voices Rule.** Gabarito is for names and writing. Iosevka Term Slab in caps is for labels and controls. Bar v2 moved every control to slab caps because round Gabarito pills were "off-brand" (`docs/plans/bar-v2.md`, Why 2).

**The Askew Mark Rule.** The wordmark's letters never sit straight. Each has its own weight, tilt (-8 to 7 degrees) and lift (-0.05 to 0.04 em), from `MARK`.

## Layout

**The menu: the Clock** (`shared/menu/clock.css`, `clock.js`, `tube.js`; the default view since 2026-11-16)
- One centred column: wordmark, tagline, clock, `All toys` link, footer.
- The clock is a square, `min(92vw, 660px)` wide. Twelve toys stand on its hours: each tile is 19% of the square, on a ring at 40.5% from the middle. Tiles show no label; the toy in hand grows to 1.18.
- The middle holds the words of the toy in hand: its number (slab, 10 to 11 px), its name (Gabarito 800, 17 to 32 px), a 22 px hairline, its motto (slab, 10.5 to 12.5 px). They are the only white in the clock.
- Under the words lies the tube: the toy's still or loop, in colour, with a concave warp, scan lines and grain, dim and darker to the rim. It has no hard edge; it fades out at the ring of toys.
- The selection glow is a soft oval in the toy's accent, under the toy in hand. It turns to the pointer and fades from one toy's colour to the next.
- The outline (a rim and sixty minute marks) draws in with the dozen, then fades. It is never at rest on the page.
- The Re-roll is a pill at the foot of the circle; it shows after 5 s. Under 440 px it is the die alone.

**The menu: the whole shelf** (`?all`; `index.html:41-67`, `:123-126`, `:177-193`)
- One centred column: wordmark, tagline, Series switch, shelf, footer. The wrap is 1240 px at most, with `clamp(36px, 6vw, 72px)` between blocks.
- The shelf is a grid of square tiles, each `clamp(96px, 26vw, 150px)` wide, centred. The main shelf holds six a row at most; the Lab holds five. Gaps are `clamp(16px, 2.6vw, 28px)` by `clamp(12px, 2.4vw, 28px)`.
- A tile is an icon, then its label 10 px below. The icon SVG takes 70% of the tile and may overflow it.
- With the Series switch on, each series is its own grid under a Wave divider. Sections sit `clamp(20px, 3.4vw, 40px)` apart.
- The footer sits `clamp(48px, 9vh, 120px)` below the shelf: credit line, the onnozelaer mark (34 px high), the version on hover, the Lab link and a Clock link. The Clock view shows neither link.

**A toy page** (`shared/stim.css:47`, `:134`, `:148-153`)
- `.wrap` is a grid with `clamp(20px, 3.4vw, 40px)` gaps and 28 px above. Body gutters are 16 px or the safe-area inset, whichever is larger.
- The stage fills the first screen: `max(280px, calc(100svh - var(--chrome, 176px)))`. `stim.js` measures `--chrome`.
- Bar v2 (the standard, Tom, 2026-11-09) lays controls over the stage in four corners, each 12 px from the edge, with 6 px between controls (`shared/stim.css:326-338`). The key strip sits bottom centre. The slot table and limits are in `AGENTS.md` and `docs/plans/bar-v2.md`.
- Under the stage: `section.about`, 1160 px at most. The vignette is two equal columns that become one at 760 px (`shared/stim.css:274-286`).
- The page never scrolls sideways (Bar v2 rule 4).

**Responsive behaviour**
- The shell measures; a breakpoint alone never decides. A stage narrower than 640 px, or a top row that collides, takes the phone layout (`shared/stim.js:846-880`): the choice moves bottom left, actions bottom right, the slider into Settings.
- State attributes on `.stim-frame` carry the result: `data-narrow`, `data-tight` (the name drops out), `data-stack` (bottom corners stack).
- The logo shrinks to its `S` below a 300 px frame (`shared/stim.css:486`, a container query).
- Coarse pointers get 36 px chips, so every target is 34 px or more (`shared/stim.css:320`).
- The intro sizes itself with container units on its own box, so it fits any screen shape (`shared/intro.css:15-23`).
- Checks: 1280 px, 375 × 812 and 812 × 375.

## Elevation & Depth

The system is a hybrid, and each layer has its own device.

- **The menu is flat.** Tiles have no card, no border and no shadow. Depth lives inside each icon as light: the shared `lit` glint and `rim` line (`index.html:203-210`).
- **Bar v2 controls use hard offset shadows as state.** A control at rest is flat dark glass with a hairline. Hover lifts it 1 px up and left onto a 2 px shadow. A pick or an open sheet holds a 3 px shadow. A sheet holds a 5 px shadow. Touch screens get no hover lift.
- **Bare text on the stage wears a soft dark halo**, so it stays legible on bright scenes. The logo and the toy name wear none (Tom): `shared/stim.css:373`.
- **Glass is backdrop blur plus dimming.** The intro blurs and darkens the whole page behind it. v1 controls on a stage carry a frosted backing.

### Shadow Vocabulary

- **Lift** (`--lift: 2px 2px 0 oklch(0.05 0.01 275)`): a hovered control, with `transform: translate(-1px, -1px)`.
- **Shadow** (`--shadow: 3px 3px 0 oklch(0.07 0.01 275)`): a picked chip, an open Settings or tray button.
- **Hard** (`--hard: 5px 5px 0 oklch(0.05 0.01 275)`): sheets.
- **Halo** (`--halo: 0 0 3px oklch(0.05 0.01 275), 0 1px 2px oklch(0.05 0.01 275 / 0.9)`): a `text-shadow` on the key strip.
- **Intro glass** (`blur(60px) brightness(0.3)` in Signal, over a tint of `oklch(0.1 0.02 275 / 0.45)`): `shared/intro.css:26-27`, `:176`; values from `shared/intro.js:126`.
- **v1 frost** (`blur(10px)` under `oklch(0.15 0.012 275 / 0.84)`; trays `blur(14px)` under `oklch(0.19 0.012 275 / 0.94)`): `shared/stim.css:169-172`, `:240-241`.

### Named Rules

**The Shadow Is State Rule.** A hard shadow means hovered, picked or open. Nothing wears one at rest except a sheet.

**The Hard Shadow Scope Rule.** Hard offset shadows belong to Bar v2 controls and sheets. A menu icon never has one: no dark copy and no slab offset behind the shape (Tom, 2026-11-09). A soft halo is fine there.

## Shapes

Two shape families exist, and they do not mix.

- **Hard and square** for anything in Bar v2: chips, segments, steppers, the slider, sheets, keycaps and tags. The radius is 2 px; sheets have none. Borders are 1 px. The slider is a 2 px track with a 6 × 12 px bar thumb. Palette dots are 8 px squares.
- **Soft** for containers of play: the stage has an 18 px radius; a menu tile's hit area has 16 px.
- **Pills** (999 px) remain on the menu's quiet text controls (Series switch, Lab back link) and on every v1 control.
- **The hexagon** is the series shape: a hexagon crop at 80% inside a thin hexagon outline (1.1 wide in a 100 box) in the series colour (`shared/series/shots.js:352-355`, `:386`).
- **The wave** is the series line: a wavy rule 8 px high, 24 px period, 1.6 stroke, at 65% of the series colour (`index.html:190-191`).
- **Icons** are one bold object in a 128 box, filling 110 on its long side. The body is one gradient, then the same shape with `lit`, then a `rim` line 2 wide.

## Components

### Chip (Bar v2)

Square slab on dark glass. A box always means a control.

- **Shape:** 26 px tall, never narrower than tall, 2 px radius, 1 px `--line` border, `0 10px` padding (`shared/stim.css:343-350`). 36 px on coarse pointers.
- **Rest:** `--glass` backing, `--muted` text, slab caps.
- **Hover (mouse only):** `--fg` text, border at 45% `--fg`, 1 px up and left, `--lift`. 0.15 s ease.
- **Picked or open:** `--fg` fill, `--bg` text, `--shadow`. The pick outranks hover.
- **Held:** 1 px down and right, no shadow.
- **Disabled:** 0.4 opacity, no lift.
- **Focus:** no ring shows (Tom, 2026-11-09). See Drift and gaps.
- **Icon chip:** square, a 14 px stroke icon at 1.5 width.

### Choice: segments, stepper, tray

- **Segments** (five options or fewer): one joined block, 1 px hairlines between options; the picked option is the flash box with no shadow (`shared/stim.css:400-404`).
- **Stepper** (more than five): `‹ Name ›` in one block; the name area is 96 px wide at least.
- **Tray:** a chip opens a grid sheet of icon chips below the top-left corner.

### Slider

One box 26 px tall on `--glass`: a word label, then a 96 px track. The filled part is `--fg`, the rest `--line` (`shared/stim.css:437-448`). No number shows.

### Sheet (Settings, Dev, tray)

- **Shape:** 280 px wide, no radius, 1 px `--fg` border, `--hard` shadow, near-opaque backing (`shared/stim.css:413-419`).
- **Anatomy:** header row in bold caps at 0.14em with an `esc` keycap; sections of rows split by hairlines; a section label at 9.5 px; a Reset footer (`:424`, `:451-459`).
- **Behaviour:** drops below its corner; on a narrow stage the left sheet rises from the bottom. A short stage scrolls the sheet inside its own box. Opens on click, never on hover.

### Key strip

Keycap, then a verb in lower case: `[CLICK] place`. No backing. Verbs at 62% `--fg` with the halo; keycaps on `--glass` with a border at 45% `--fg` (`shared/stim.css:462-480`). It fades over 0.6 s after three gestures or 8 s. (i) brings it back.

### Navigation: logo and name

- **Bar v2:** the wordmark, unboxed, top left. Then `/ TOY NAME` in bold slab caps at 0.1em; the slash is `--muted` (`shared/stim.css:374-392`). Hover, focus or a tap waves the mark into colour and slides in a `‹`. A Lab toy adds a small boxed tag.
- **v1 header:** a back arrow, the mark at 22 px, the sound button at the right (`shared/stim.css:84-98`).
- **The wave:** each letter lifts, flashes its colour and settles, one letter every 33.333 ms, in held frames (`stim-wave`, `shared/stim.css:103-132`).
- **Menu:** no nav bar. The Clock has an `All toys` link in slab caps under the dial; the whole shelf (`?all`) holds a Lab link and a Clock link in its footer.

### Stage

The toy's canvas: full first screen, 18 px radius, `overflow: hidden`, `--stage` ground, `touch-action: none` (`shared/stim.css:148-153`). A toy that cannot run shows one centred line in muted text (`.fail`).

### Intro: the Signal variety

The shipped intro (`DEFAULT_VARIETY = 'signal'`, `shared/intro.js:110`; Tom, 2026-11-09).

1. Dark blurred glass covers the page.
2. The flash: a white box fills the eye with the logo inverted inside it, then holds at size.
3. Rest: the logo takes the toy's ink. The lines open below it: name, Flemish name with IPA, motto, motto translation, then "Best with sound" with a headphones glyph.
4. The column wipes away and the glass fades.

- **Fixed point:** the logo's centre is `--origin: 36cqh` at every stage and never moves (`shared/intro.css:23`). The copy hangs below it.
- **Logo:** the toy's emblem as a one-colour luminance mask, `clamp(96px, min(30cqw, 19cqh), 168px)`, with padding of 16% (`shared/intro.css:17-19`, `:75-79`).
- **Beats** (30 fps; `CLASSIC` in `shared/intro.js:112` over `TIMING` at `:66-101`): lead 4 frames, pop 9 frames at scale 3.4, flash 16 frames, 400 ms per line with 5 frames between lines, reading time 1000 ms plus 15 ms per motto character up to 2200 ms, wipe 400 ms, fade 600 ms.
- **Failsafe:** the overlay clears itself after 5 s if the script never runs.
- The Bar v2 corners wait for the intro, then slide in 6 px from their edges, 60 ms apart (`shared/stim.css:489-498`).

### Menu tile and icon

- **Tile:** a link with the icon over its label. No box. Each tile arrives through blur and grain as it scrolls into view, in stepped transitions (`index.html:128-136`).
- **Icon:** inline SVG, the toy's own object drawn from its real frames. It stays live under the pointer: a GSAP 3.13 timeline per toy (`toys.<id> = { play, rest }`).
- **Shared light:** `lit` is a radial white glint from the top left (0.38 to 0 opacity); `rim` is a white line that fades by the middle (0.62 to 0), 2 wide (`index.html:203-210`).
- **Planned toy:** the same art as an outline in `--sketch`, 2 px stroke.
- **Icon standard** (Tom, 2026-11-15): a toy has at most three icons: Current, Shaded object and Isometric block. The full standard is in `AGENTS.md`; the reference page is `icons/sheet.html`.

### Series divider and switch

- **Wave divider** (Tom's pick, 2026-11-15): a wavy line in the series colour; the icon and the name sit in its gap. No counters (`index.html:190-193`).
- **Series icon:** a shot in a Hex ring, `clamp(46px, 7vw, 58px)`: a small Dutch-angle picture with its subject whole and centred. It draws the idea of the series, not a toy.
- **Series switch:** a small wave and the word "Series" in slab caps, muted; `--fg` when on (`index.html:185-188`).

### Vignette

The writing under a toy: a short heading, two plain paragraphs, a small figure (420 px at most) with a caption (`shared/stim.css:274-286`). A hairline sits above it. Hidden on every page today (`shared/stim.css:143`).

### v1 bar (kept for old pages)

Round pills in Gabarito 13 px: transparent, `--line` border, 999 px radius, `6px 11px` padding; `--fg` text and border when pressed; a spring scale to 0.94 on press (`shared/stim.css:183-199`). On a stage each pill gets the frosted backing. The how-to keys sit behind a round 30 px (i). v1 stays until the last toy moves to Bar v2.

## Do's and Don'ts

### Do:
- **Do** keep every surface dark, and write every colour in OKLCH.
- **Do** take colour from the toy's `accent`, the series `color` or the wordmark's letters. Keep shell chrome neutral or white.
- **Do** set control text in Iosevka Term Slab caps (500, 11 px, 0.07em) and writing in Gabarito.
- **Do** box a thing only when it is a control. Leave the logo and the toy name unboxed and without shadow.
- **Do** show a pick as the flash box: `--fg` fill, `--bg` text.
- **Do** build a new toy page on Bar v2: one `bar` spec to `initPage`, five visible controls at most, the rest in Settings.
- **Do** keep the intro logo's centre on `--origin`. Nothing moves it.
- **Do** draw a menu icon as one bold object: one gradient body, `lit`, then a `rim` line 2 wide.
- **Do** give every series the same thin ring in its own colour.
- **Do** honour `prefers-reduced-motion`: the shell stops every transition and the entrance.
- **Do** keep touch targets at 34 px or more on coarse pointers.
- **Do** let the shell measure collisions. Check 1280 px, 375 × 812 and 812 × 375.

### Don't:
- **Don't** add a light theme.
- **Don't** put a two-tone hard offset shadow on a menu icon: no dark copy and no slab offset behind the shape (Tom, 2026-11-09).
- **Don't** draw an icon as a small model of the toy, or with dark outlines, thin lines, tiny parts or sparkle clutter (Tom, 2026-11-15). Draw no Stencil, Single-weight line or Abstract mark style.
- **Don't** give a series icon a gold border, sparks, depth, tilt, wobble or sheen. No birds on the East Van and Belgium icons (Tom, 2026-11-15).
- **Don't** put blurbs or taglines on the stage. Writing lives under it.
- **Don't** colour the intro title. Only the logo takes the toy's ink.
- **Don't** swap a live icon for a still copy.
- **Don't** use a brand name for a toy (Tom's exceptions: Domino Day, Strandbeest).
- **Don't** make it skeuomorphic or fussy, and don't make it bare-minimal.
- **Don't** add a font or a library without Tom.
- **Don't** build a new page on the v1 bar or restyle the shared bar from a toy.

## Drift and gaps

Recorded as found. Nothing here is fixed.

| # | Finding | Where |
|---|---|---|
| 1 | `AGENTS.md` says the main shelf uses skeleton v1, except Galaxy. The code has 75 toy pages that pass a `bar` spec and 25 that keep `header[data-shell]`. | `AGENTS.md` Layout; `*/index.html` |
| 2 | Two control languages are live: v1 round Gabarito pills and v2 square slab chips. `bar-v2.md` calls v1 off-brand. | `shared/stim.css:161-271` and `:305-498` |
| 3 | The menu does not link `stim.css`. It has its own token block with other values: `--fg` 0.95 (shell 0.94), `--muted` 0.6 (shell 0.64), body 16 px / 1.3 (shell 14 px / 1.35). It has no `--surface`, `--line` or `--stage`. | `index.html:13-28` |
| 4 | No type scale. Sizes are literals: 9, 9.5, 10, 11, 12, 13, 14, 15, 16 and 22 px, plus clamps. | both stylesheets |
| 5 | No spacing scale and no radius tokens. Radii in use: 2, 4, 5, 6, 10, 12, 14, 16, 18 and 999 px. | both stylesheets |
| 6 | Focus outlines are removed for every element with `!important`. This is Tom's ruling (2026-11-09, Bar v2 rule 6). The shell CSS gives no other focus mark, so a keyboard user sees no focus on a control (WCAG 2.4.7). | `shared/stim.css:40`; `index.html:37` |
| 7 | `--focus` is defined twice. Its one shell use, the Series switch outline, loses to the rule in item 6. | `index.html:187` |
| 8 | `--pick` and `--surface` are defined, and the shell uses neither. Only Fidget parts, lab pages and Viaduct read them. | `shared/stim.css:15`, `:20` |
| 9 | B612 is the wordmark font and an intro font. `AGENTS.md` Conventions and `PRODUCT.md` name only Gabarito and Iosevka. | `shared/stim.css:1`, `:97` |
| 10 | The wordmark asks for weights 400 to 900 per letter. B612 loads at 400 and 700 only, so the browser shows two weights. | `shared/stim.js:46-50` |
| 11 | Iosevka has three `@font-face` blocks under two family names. `bar-v2.md` section 2 says they move into `stim.css`; the other two remain. The menu tagline asks first for a family that the menu does not declare. | `shared/stim.css:307-308`; `index.html:139-143`; `shared/intro.css:5-8` |
| 12 | Literal colours stand in for tokens: `#fff` for the flash, `--intro-bg` repeats `--bg`, each page repeats `oklch(0.16 0.012 275)` in a `<style>` tag, `.fail` repeats `--muted`, and three backings are literals. | `shared/intro.css:11`; `shared/stim.css:83`, `:157`, `:170`, `:240`, `:416` |
| 13 | Some menu icon gradients are hex, not OKLCH. | `index.html:212-217` |
| 14 | `--stage` sits at hue 270; the other neutrals sit at 275. | `shared/stim.css:21` |
| 15 | `AGENTS.md` puts the intro subtitles at the foot, lifted -14. The shipped Signal variety sets both to 0 and stacks them under the translation. | `shared/intro.js:92-93`, `:126-127` |
| 16 | The vignette and the display name are styled but hidden. The content zone's limit and file format are open (`PRODUCT.md`). | `shared/stim.css:143` |
| 17 | The v1 (i) button is 30 px and has no coarse-pointer rule. It is under the 34 px floor on touch. | `shared/stim.css:230-235` |
| 18 | Dormant menu CSS: the series badge and Constellation rules stay while `SERIES_ON` is off. One 560 px media rule repeats the base size. | `index.html:122`, `:149-175` |
| 19 | Proposals, not final: the toy accents (first set, 2026-11-09), eight of the eleven series shots, five Flemish series names. | `toys.json`; `shared/series/shots.js`; `series.json` |
| 20 | The contrast of small control text is not measured: 9 px tags and 9.5 px section labels at 0.75 opacity. Bar v2 rule 8 asks for 4.5:1. | `shared/stim.css:392`, `:453` |
| 21 | The Creative North Star has no name. The playbook asks the owner for it; Tom has not set one. Colours keep the code's token names. | this file |
| 22 | The hard offset shadow has two rulings with two scopes: never on a menu icon, native on Bar v2 controls. Both are recorded above with their scopes. | `AGENTS.md`; `docs/plans/bar-v2.md` |
| 23 | The tonal ramps in `.impeccable/design.json` are made for the panel. They are not project tokens. | `.impeccable/design.json` |
