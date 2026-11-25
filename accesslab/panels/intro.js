// @ts-check
// Intro panel: the real shared/intro.js on an inline stage over the toy's still.
// The gate, Calm, Hold, every variety, three access-row layouts, the old intro lab's knobs.
// The judgement writes the inventory record's intro area, so Feedback shows it too.
import { flagsHTML, techHTML, glyph, inkOf, REC } from '../access-data.js';

const INTRO = new URL('../../shared/intro.js', import.meta.url).href;
const ROOT = new URL('../../', import.meta.url).href;
// The engine reads reduced motion once, at import.
// A second copy under a fake query is the Calm intro.
const real = matchMedia.bind(window);
const MADE = await import(INTRO);
window.matchMedia = m => (/reduced-motion/.test(m) ? /** @type {any} */ ({ matches: true, media: m, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }) : real(m));
const CALM = await import(`${INTRO}?calm`);
window.matchMedia = real;

const STYLE = `
.is-wrap { display: grid; gap: 10px; }
.is-stage { position: relative; height: clamp(420px, 64vh, 760px); border-radius: 18px; overflow: hidden; isolation: isolate;
  background: radial-gradient(60% 60% at 40% 45%, color-mix(in oklch, var(--acc-ink) 35%, oklch(0.2 0.02 275)), oklch(0.08 0.01 275)); }
.is-stage > img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
/* The intro is fixed to the page in the shell; here it fills the stage. */
.is-stage .intro { position: absolute !important; z-index: 2; }
.is-stage.full { position: fixed; inset: 0; z-index: 90; height: auto; border-radius: 0; }
body.is-full { overflow: hidden; }
/* Full screen keeps only the Play row, at the top centre, clear of the block. */
body.is-full .is-ctl { position: fixed; left: 50%; top: 8px; translate: -50% 0; z-index: 210; padding: 0 12px; background: oklch(0.1 0.012 275 / 0.82); -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px); }
body.is-full .is-ctl > :not(.r-play) { display: none; }
/* The step strip: where the intro is now, where it stops, and Next. */
.is-strip { position: absolute; left: 14px; top: 12px; z-index: 5; display: flex; flex-wrap: wrap; align-items: center; gap: 2px; font: 800 10px/1 var(--slab); letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); filter: drop-shadow(0 0 2px var(--ink)); }
.is-strip span, .is-strip button { padding: 5px 7px; }
.is-strip button { appearance: none; border: 0; background: none; color: inherit; font: inherit; letter-spacing: inherit; text-transform: inherit; cursor: pointer; }
.is-strip button:hover { color: var(--fg); }
.is-strip button:focus-visible { outline: 1px solid var(--focus); }
.is-strip .on { background: #fff; color: var(--bg); }
.is-strip .on:hover { color: var(--bg); }
/* The stop mark: a bar under the step the intro holds on. */
.is-strip .stop { box-shadow: inset 0 -2px 0 #fff; color: var(--fg); }
.is-strip .nx { margin-left: 8px; color: var(--fg); border: 1px solid oklch(1 0 0 / 0.5); }
.is-strip .nx:disabled { opacity: 0.3; cursor: default; }
.is-strip .sep { width: 8px; padding: 0; }
/* Controls: one labelled row per concern. */
.is-ctl { display: grid; grid-template-columns: max-content 1fr; align-items: start; column-gap: 14px; }
/* A label sits on its row's first line, so a wrapped row reads under it. */
.is-ctl > .lab { padding-top: 12px; font: 800 10px/1 var(--slab); letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); }
.is-ctl > .bar .w { height: 34px; }
.is-ctl .lab-i { padding: 0 4px 0 11px; font: 800 10px/1 var(--slab); letter-spacing: 0.14em; color: var(--muted); }
/* Load simulation: the shell's five stages, read out in the stage's top-right corner. */
.is-load { position: absolute; right: 14px; top: 12px; z-index: 5; display: flex; gap: 2px; font: 800 10px/1 var(--slab); letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); filter: drop-shadow(0 0 2px var(--ink)); }
.is-load span { padding: 5px 7px; }
.is-load span.on { background: #fff; color: var(--bg); }
.is-load span.done { color: var(--fg); }
.is-load b { padding: 5px 7px; color: var(--fg); font-weight: 800; }
.is-gate { position: absolute; inset: 0; z-index: 4; display: none; align-content: center; justify-items: start; gap: 16px; padding: 0 clamp(20px, 8%, 120px);
  background: oklch(0.1 0.01 275 / 0.3); -webkit-backdrop-filter: blur(36px) brightness(0.42); backdrop-filter: blur(36px) brightness(0.42); }
.is-gate.on { display: grid; }
.is-gate .t { font: 800 clamp(26px, 4vw, 48px)/1.02 "B612", var(--sans); letter-spacing: -0.03em; }
.is-gate .g { width: 72px; height: 48px; }
.is-gate label { display: inline-flex; gap: 10px; align-items: center; font: 800 11px/1 var(--slab); letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); cursor: pointer; }
.is-judge { display: flex; flex-wrap: wrap; align-items: center; gap: 0 10px; padding-top: 4px; }
.is-judge input { flex: 1 1 320px; min-width: 0; background: none; border: 0; border-bottom: 1px solid var(--line); color: var(--fg); font: 500 15px/1.4 var(--sans); padding: 6px 0; }
.is-judge input:focus { outline: none; border-color: var(--focus); }
.is-judge .w[data-j="bad"][aria-pressed="true"]::before { background: var(--warn); }
/* The access row rides the audio notice's place and beat. */
.intro .acc { display: grid; justify-items: start; gap: 0.5em; margin-top: var(--g-m); opacity: 1; text-align: left; font: 800 calc(0.8em * var(--snd-k, 1))/1 var(--slab); letter-spacing: 0.08em; text-transform: uppercase; }
.intro .acc .g { width: 1.6em; height: 1.07em; stroke-width: 1.3; color: var(--acc-ink); }
.acc-i { display: inline-flex; align-items: center; gap: 0.75em; white-space: nowrap; }
.acc-i.snd { position: relative; margin-top: 0.5em; opacity: 0.62; }
/* After the flags, the sound line stands clear of them. */
.acc-flags + .acc-i.snd { margin-top: 1.1em; }
/* The sound line waits for its row, then lands with its own Signal flash box. */
/* Bar v3's beat at 30 fps: oversize for one frame, snaps to size, holds, parts in three. */
.acc.snd-wait .acc-i.snd { opacity: 0; }
.acc .acc-i.snd.flashin { opacity: 0.62; animation: snd-show 0.3s steps(1, end) both; }
/* Shadows draw the box's side margins: a shadow adds no scroll width, so the fit ignores it. */
.acc-i.snd.flashin::before, .acc-i.snd.flashin::after { content: ""; position: absolute; inset: -0.25em 0; background: #fff; box-shadow: -0.35em 0 0 #fff, 0.35em 0 0 #fff; animation: 0.3s both; animation-timing-function: steps(1, end); }
.acc-i.snd.flashin::before { animation-name: snd-left; }
.acc-i.snd.flashin::after { animation-name: snd-right; }
@keyframes snd-show { 0% { opacity: 0; } 11.1% { opacity: 1; } 100% { opacity: 0.62; } }
/* Each cut is a share of the whole box, side margins included. */
/* The oversize frame grows by shadows too; a transform would count as overflow. */
@keyframes snd-left { 0% { box-shadow: -0.35em 0 0 #fff, -1.2em 0 0 0.45em #fff, 0 0 0 0.45em #fff; clip-path: inset(-1em calc(0.5 * (100% + 0.7em) - 0.35em) -1em -2em); } 11.1%, 55.5% { clip-path: inset(0 calc(0.5 * (100% + 0.7em) - 0.35em) 0 -0.35em); } 66.6% { clip-path: inset(0 calc(0.67 * (100% + 0.7em) - 0.35em) 0 -0.35em); } 77.7% { clip-path: inset(0 calc(0.84 * (100% + 0.7em) - 0.35em) 0 -0.35em); } 88.8%, 100% { clip-path: inset(0 calc(100% + 0.35em) 0 -0.35em); } }
@keyframes snd-right { 0% { box-shadow: 0.35em 0 0 #fff, 1.2em 0 0 0.45em #fff, 0 0 0 0.45em #fff; clip-path: inset(-1em -2em -1em calc(0.5 * (100% + 0.7em) - 0.35em)); } 11.1%, 55.5% { clip-path: inset(0 -0.35em 0 calc(0.5 * (100% + 0.7em) - 0.35em)); } 66.6% { clip-path: inset(0 -0.35em 0 calc(0.67 * (100% + 0.7em) - 0.35em)); } 77.7% { clip-path: inset(0 -0.35em 0 calc(0.84 * (100% + 0.7em) - 0.35em)); } 88.8%, 100% { clip-path: inset(0 -0.35em 0 calc(100% + 0.35em)); } }
@media (prefers-reduced-motion: reduce) { .acc .acc-i.snd.flashin { animation: none; } .acc-i.snd.flashin::before, .acc-i.snd.flashin::after { display: none; } }
.acc-i.snd .g { color: var(--fg); }
.acc-flags { display: grid; justify-items: start; gap: 0.5em; }
/* Line: the flags share one line; sound keeps its own line below. */
.intro .acc--line { justify-items: center; }
.intro .acc--line .acc-flags { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.5em 1.5em; }
/* Tech tags: always the bottom-left corner of the intro. */
.intro-tech { position: absolute; left: clamp(14px, 2.4cqw, 28px); bottom: var(--foot-y, max(14px, 2.4cqh)); z-index: 3; font-size: var(--tech-fs, clamp(11px, 1.4cqw, 14px)); }
.intro-tech .tag { height: 1.8em; padding: 0 0.5em; font-size: 0.85em; }
/* measure() sets --rail-x and --rail-y: the logo's right edge and centre. */
.intro .acc--rail { position: absolute; top: var(--rail-y, var(--origin)); left: calc(var(--rail-x, 50% + var(--logo-box) / 2) + clamp(12px, 2.6cqw, 30px)); transform: translateY(-50%); margin: 0;
  max-width: calc(100% - var(--rail-x, 50% + var(--logo-box) / 2) - clamp(20px, 3.6cqw, 40px)); padding-left: 1em; border-left: 1px solid oklch(1 0 0 / 0.3); font-size: clamp(10px, min(2.6cqw, 1.6cqh), 14px); }
.intro .acc--rail .acc-i { white-space: normal; }
/* Icon colour: the logo at rest and the access glyphs. The flash box stays as made. */
/* The lab's !important beats the engine's inline --ink, in the Calm intro too. */
.intro[data-ic="mono"] { --ink: #fff !important; --acc-ink: #fff !important; }
.intro[data-ic="flat"] { --ink: var(--ink-flat) !important; }
.intro[data-ic="gradient"] { --ink: var(--ink-grad) !important; }
/* Only Signal paints the logo in the engine; the bench paints it in every effect, the Calm intro too. */
.is-stage .intro:is([data-ic="gradient"], [data-ic="flat"], [data-ic="mono"]) .intro-emblem { background: var(--ink); }
/* In the flash the emblem stays a dark cut-out of the white box. */
.is-stage .intro:is([data-ic="gradient"], [data-ic="flat"], [data-ic="mono"]) .intro-badge.is-flash .intro-emblem { background: currentColor; }
.intro[data-ic="og"] .intro-badge:not(.is-flash) .intro-emblem { background: transparent !important; }
.is-og { position: absolute; z-index: 3; overflow: hidden; pointer-events: none; }
.is-og[hidden] { display: none; }
.is-og iframe { position: absolute; left: 0; top: 0; width: 1280px; height: 800px; border: 0; transform-origin: 0 0; }
/* Alignment: measure() places the block as one piece in every variety. */
/* The block: the logo, the title, its lines, the access row, the load note. */
/* --origin moves it up or down; --dx moves it sideways. */
.is-stage .intro .intro-text { translate: var(--dx, 0px) 0; transform-origin: var(--origin-x, 50%) var(--origin); }
/* The foot stays where it is: it holds its own place at the bottom. */
.is-stage .intro .intro-foot { translate: calc(-1 * var(--dx, 0px)) 0; }
/* An empty notes row sets the engine's fit limit above the block. */
.is-stage .intro:is([data-align="bc"], [data-align="bl"]) .intro-notes:not(:has(.intro-num, .intro-snd)) { display: none; }
/* Centre, content left and Bottom left: one column; every line starts at the emblem's edge. */
.is-stage .intro:is([data-align="left"], [data-align="bl"]) .intro-text { justify-items: start; text-align: left; justify-content: center; grid-template-columns: minmax(0, max-content); }
/* The flash box hangs out by its pad on both sides, so the emblem sets the edge. */
.is-stage .intro:is([data-align="left"], [data-align="bl"]) .intro-badge { margin-inline: calc(-1 * var(--pad)); }
.is-stage .intro:is([data-align="left"], [data-align="bl"]) .acc:not(.acc--rail) { max-width: calc(100cqw - 32px); }
.is-stage .intro:is([data-align="left"], [data-align="bl"]) .acc--line { justify-items: start; }
.is-stage .intro:is([data-align="left"], [data-align="bl"]) .acc--line .acc-flags { justify-content: flex-start; }
/* A motto in the block drops the foot's lift. */
.is-stage .intro:is([data-align="bc"], [data-align="bl"]) .intro-text > .intro-tag { translate: none !important; }
/* Bottom left: the flash grows from its corner, so the pop stays on screen. */
.is-stage .intro[data-align="bl"] .intro-badge { transform-origin: 0 100%; }
/* Signal's slab title, set tighter: a monospace gives every letter and space a full cell. */
/* Tom, 2026-11-25: less letter and word spacing on the Iosevka title; the font as made, in caps. */
.is-stage .intro[data-look="signal"] .intro-name { letter-spacing: -0.03em; word-spacing: -0.22em; text-transform: uppercase; }
/* Label hangs its lines from the box's left edge; Left does that already. */
.is-stage .intro:is([data-align="left"], [data-align="bl"])[data-look="label"] .intro-text > :not(.intro-badge, .intro-foot) { margin-left: 0; max-width: none; }
/* The foot's lines start at the column's edge, too. */
.is-stage .intro:is([data-align="left"], [data-align="bl"]) .intro-foot { justify-items: start; text-align: left; padding-left: var(--col-x, 16px); }
/* Hidden probes resolve --g-m and --origin to pixels for measure(). */
.is-stage .intro-probe { position: absolute; visibility: hidden; width: 0; height: var(--g-m); }
.is-stage .intro-probe.o { height: var(--origin); }
/* The loader: the load note over the load line, at the foot's centre. */
/* Reduced motion's still line takes the same place, width and type. */
.is-stage .intro-wait { bottom: var(--foot-y); width: var(--loader-w); max-width: calc(100cqw - 32px); font: 800 var(--loader-fs)/1.25 "Iosevka Term Slab Nerd Font", monospace; letter-spacing: 0.12em; }
/* One width and one type in every variety; the logo and the words never set them. */
/* The rail: the row the tech tags sit on. A tag is 1.8em at 0.85 of --tech-fs. */
.is-stage .intro { --loader-w: clamp(180px, 24cqw, 280px); --loader-fs: clamp(10px, 1.3cqh, 12px); --loader-h: calc(var(--loader-fs) * 2.4 + var(--load-h)); --foot-y: max(14px, 2.4cqh);
  --tech-fs: clamp(11px, 1.4cqw, 14px); --rail-h: calc(var(--tech-fs) * 1.53); }
/* The load line's middle sits on the rail's middle; the note rides above it. */
.is-stage .intro-loader { position: absolute; left: 50%; bottom: calc(var(--foot-y) + var(--rail-h) / 2 - var(--load-h) / 2); translate: -50% 0; z-index: 3; width: var(--loader-w); max-width: calc(100cqw - 32px);
  height: var(--loader-h); display: grid; align-content: end; gap: calc(var(--loader-fs) * 0.8); pointer-events: none; }
.is-stage .intro-loader > .intro-load { position: relative; inset: auto; display: block; width: 100%; }
/* The note spans the line: the step at the left, its count at the right. */
.is-stage .intro-loader > .intro-note { position: relative; inset: auto; font: 800 var(--loader-fs)/1.25 "Iosevka Term Slab Nerd Font", monospace; letter-spacing: 0.12em; }
/* The foot's lines sit one gap above the loader, so they never move when it shows. */
.is-stage .intro .intro-foot { bottom: calc(var(--foot-y) + var(--rail-h) / 2 + var(--loader-h) + var(--g-m, 16px)); }
/* Knobs: a Bar v3 Dev popover at the right; no glass, the intro stays in view. */
.is-knobs { position: fixed; right: 12px; top: 12px; bottom: 64px; z-index: 220; width: min(360px, calc(100% - 24px)); overflow: auto; padding: 8px 12px 12px;
  background: oklch(0.1 0.012 275 / 0.86); -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px); font: 800 11px/1 var(--slab); letter-spacing: 0.06em; text-transform: uppercase; }
.is-knobs[hidden] { display: none; }
.is-knobs h4 { display: flex; align-items: center; justify-content: space-between; margin: 14px 0 0; padding-bottom: 6px; border-bottom: 1px solid var(--line); font: inherit; letter-spacing: 0.12em; color: var(--fg); }
.is-knobs h4 small { font-weight: 500; color: var(--muted); letter-spacing: 0.04em; text-transform: none; }
.is-knobs h4 .w { height: 24px; font-size: 10px; }
.is-knobs .note { margin: 6px 0 0; font: 500 11px/1.35 var(--sans); letter-spacing: 0; text-transform: none; color: var(--muted); }
/* Try-outs: a switch and one line on what it does. */
.is-knobs .try { display: grid; grid-template-columns: 9.5em 1fr; align-items: center; gap: 2px 10px; margin-top: 6px; }
.is-knobs .try .w { height: 30px; justify-content: flex-start; }
.is-knobs .tline { margin: 6px 0 0 -11px; }
.is-knobs .tline .w, .is-knobs .tfont .w { height: 28px; font-size: 11px; padding: 0 8px; }
.is-knobs .tfont { display: flex; flex-wrap: wrap; align-items: center; margin-left: -8px; }
.is-knobs .try p { margin: 0; font: 500 11px/1.35 var(--sans); letter-spacing: 0; text-transform: none; color: var(--muted); }
.is-knobs .rows { display: grid; grid-template-columns: max-content 1fr 7ch; align-items: center; gap: 4px 10px; padding: 8px 0 12px; }
.is-knobs .rows label { color: var(--muted); cursor: pointer; white-space: nowrap; }
.is-knobs .rows label.tuned { color: var(--fg); }
.is-knobs .rows output { text-align: right; color: var(--fg); font-weight: 700; }
.is-knobs input[type="range"] { width: 100%; accent-color: var(--fg); margin: 0; height: 32px; }
.is-knobs .bar { margin: 0 0 0 -11px; font-size: 12px; }
.is-knobs .w { height: 34px; }
`;

// The old intro lab's knobs: [min, max, step, unit]. Frames step by 1.
const KNOBS = /** @type {Record<string, Record<string, [number, number, number, string]>>} */ ({
  Layout: { nameY: [-25, 25, 0.25, 'vh'], nlY: [-25, 25, 0.25, 'vh'], tagY: [-25, 25, 0.25, 'vh'], tagNlY: [-25, 25, 0.25, 'vh'], sndY: [-25, 25, 0.25, 'vh'], gapK: [0, 3, 0.05, 'x'] },
  Type: { nameK: [0.5, 2, 0.05, 'x'], nlK: [0.5, 2, 0.05, 'x'], tagK: [0.5, 2, 0.05, 'x'], tagNlK: [0.5, 2, 0.05, 'x'], sndK: [0.5, 2, 0.05, 'x'] },
  Box: { logoK: [0.5, 2, 0.05, 'x'], padK: [0.3, 2, 0.05, 'x'], popScale: [1, 5, 0.1, 'x'] },
  Glass: { blur: [0, 80, 1, 'px'], dim: [0.1, 1, 0.01, ''] },
  Timing: { lead: [0, 20, 1, 'f'], pop: [0, 10, 1, 'f'], flash: [0, 30, 1, 'f'], unfurl: [50, 1500, 10, 'ms'], nlLag: [0, 15, 1, 'f'], tagLag: [0, 15, 1, 'f'], tagNlLag: [0, 15, 1, 'f'], sndLag: [0, 15, 1, 'f'] },
});
const KLABEL = /** @type {Record<string, string>} */ ({ nameY: 'Title Y', nlY: 'Translation Y', tagY: 'Motto Y', tagNlY: 'Motto NL Y', sndY: 'Row Y', gapK: 'Line gap', nameK: 'Title', nlK: 'Translation', tagK: 'Motto', tagNlK: 'Motto NL', sndK: 'Access row',
  logoK: 'Logo', padK: 'Box padding', popScale: 'Pop size', blur: 'Blur', dim: 'Brightness', lead: 'Lead-in', pop: 'Pop', flash: 'Flash hold', unfurl: 'Line reveal', nlLag: 'NL delay', tagLag: 'Motto delay', tagNlLag: 'Motto NL delay', sndLag: 'Row delay' });
// These knobs act at a beat, so a change replays the intro.
const TIMING_KEYS = new Set([...Object.keys(KNOBS.Timing), 'popScale']);
// The Y knobs move one line each; the bench applies them live.
const YSEL = /** @type {Record<string, string>} */ ({ nameY: '.intro-name', nlY: '.intro-nl', tagY: '.intro-tag:not(.intro-tag--nl)', tagNlY: '.intro-tag--nl', sndY: '.intro-snd' });
// The steps the intro can stop on: the engine's gate names, in plain words.
const STEP = /** @type {[string, string, string][]} */ ([
  ['glass', 'Glass', 'The page dims and blurs; nothing else yet'],
  ['pop', 'Pop', 'The flash box, blown up'],
  ['flash', 'Flash', 'The flash box at its size'],
  ['lines', 'Lines', 'Every line has opened'],
  ['hold', 'Rest', 'Reading time is over; the load line shows here'],
  ['wipe', 'Exit', 'The lines have left; the glass is still up'],
]);
// Type styles: each line the bench can restyle, and its element.
const TLINES = /** @type {[string, string, string][]} */ ([
  ['name', 'Title', '.intro-name'], ['nl', 'Translation', '.intro-nl'], ['sub', 'Subtitle', '.intro-sub'],
  ['tag', 'Motto', '.intro-tag:not(.intro-tag--nl)'], ['tagNl', 'Motto NL', '.intro-tag--nl'],
  ['row', 'Access row', '.acc'], ['note', 'Load note', '.intro-loader .intro-note'],
]);
// The fonts the intro loads; an empty value keeps the effect's own.
const TFONTS = /** @type {[string, string][]} */ ([['', 'As made'], ['"Iosevka Term Slab Nerd Font", monospace', 'Slab'], ['"B612", sans-serif', 'B612'], ['"Gabarito", system-ui, sans-serif', 'Gabarito'], ['system-ui, sans-serif', 'System']]);
const TCASE = /** @type {[string, string][]} */ ([['', 'As made'], ['uppercase', 'Caps'], ['none', 'As typed'], ['lowercase', 'Lower']]);
// Sliders: [min, max, step, unit].
const TKNOB = /** @type {Record<string, [string, number, number, number, string]>} */ ({ fw: ['Weight', 300, 900, 100, ''], ls: ['Letter spacing', -0.1, 0.4, 0.005, 'em'], ws: ['Word spacing', -0.4, 0.6, 0.01, 'em'], lh: ['Line height', 0.8, 1.8, 0.02, ''] });
// The try-outs, with what each one does.
const TRY = /** @type {[string, string, string][]} */ ([
  ['static', 'Sample lines', 'Fills a motto and its Dutch line where a toy has none, so every line shows.'],
  ['nameFlash', 'Title in flash', 'The title shares the flash box with the logo and blows up with it.'],
  ['textFlash', 'Line flash', 'The title wipes in as a white box while the logo box holds.'],
  ['classic', 'Classic notice', 'Shows < CLASSIC > under the title, as on a toy\'s Classic build.'],
]);
const VARS = Object.keys(MADE.VARIETIES);
// Tom's stars, 2026-11-25: Signal ships; Punch plays now and then; Shutter is kept.
const STARS = ['signal', 'punch', 'shutter'];
const vName = (/** @type {string} */ v) => (MADE.VARIETIES[v].label || v).split(':')[0] + (STARS.includes(v) ? ' ★' : '');
// Starred only: the arrows step through the stars.
const vList = () => (S.allEffects ? VARS : VARS.filter(v => STARS.includes(v)));
const kfmt = (/** @type {number} */ v, /** @type {string} */ u) => (u === 'f' ? `${v}f` : u === 'x' ? `${(+v).toFixed(2)}×` : `${v}${u}`);
const INV = 'stimming.inventory.';

/** @type {any} */
let desk = null;
/** @type {any} */
let item = null;
let gen = 0;
// Lab state, kept across toys: the variety, the layout, the toggles, the tuning.
/** @type {any} */
let S = {};
// The base table lifts a foot motto; a motto in the column stays put.
const inColumn = () => { const V = MADE.VARIETIES[S.variety] || {}; return V.layout || V.stack ? { tagY: 0, tagNlY: 0 } : {}; };
const TT = () => ({ ...MADE.tableOf(S.variety), ...inColumn(), ...(S.tune[S.variety] || {}) });
const keepS = () => desk.keep.set('intro', S);
// This effect's type styles, by line.
const ty = () => ((S.type ||= {})[S.variety] ||= {});
// Writes the type styles as one sheet; only the values set beat the effect's own.
function applyType() {
  let el = document.getElementById('is-type');
  if (!el) { el = document.createElement('style'); el.id = 'is-type'; document.head.append(el); }
  const T = ty();
  el.textContent = TLINES.map(([k, , sel]) => {
    const v = T[k];
    if (!v) return '';
    const d = [v.ff && `font-family: ${v.ff}`, v.fw && `font-weight: ${v.fw}`, v.ls !== undefined && `letter-spacing: ${v.ls}em`, v.ws !== undefined && `word-spacing: ${v.ws}em`, v.lh && `line-height: ${v.lh}`, v.tt && `text-transform: ${v.tt}`].filter(Boolean);
    return d.length ? `.is-stage .intro ${sel} { ${d.map(x => `${x} !important`).join('; ')}; }` : '';
  }).join('\n');
}
// A line's value now: the set one, else the live element's.
function typeNow(/** @type {string} */ line, /** @type {string} */ k) {
  const v = ty()[line]?.[k];
  if (v !== undefined) return v;
  const el = /** @type {HTMLElement | null} */ (document.querySelector(`.is-stage .intro ${TLINES.find(l => l[0] === line)?.[2]}`));
  if (!el) return { fw: 700, ls: 0, ws: 0, lh: 1.3 }[k];
  const cs = getComputedStyle(el), fs = parseFloat(cs.fontSize) || 16;
  if (k === 'fw') return +cs.fontWeight || 400;
  if (k === 'ls') return cs.letterSpacing === 'normal' ? 0 : +(parseFloat(cs.letterSpacing) / fs).toFixed(3);
  if (k === 'ws') return cs.wordSpacing === 'normal' ? 0 : +(parseFloat(cs.wordSpacing) / fs).toFixed(2);
  if (k === 'lh') return cs.lineHeight === 'normal' ? 1.2 : +(parseFloat(cs.lineHeight) / fs).toFixed(2);
}
const $ = (/** @type {string} */ sel) => /** @type {HTMLElement} */ (document.querySelector(sel));

// The row: access flags, then sound, then tech tags.
// The row: access flags, then Best with sound on its own line below them.
// Tech tags sit apart, in the intro's bottom-left corner.
const rowHTML = (/** @type {any} */ it) => {
  const f = flagsHTML(it.id, it.raw);
  return (f ? `<span class="acc-flags">${f}</span>` : '')
    + (it.raw.sound ? `<span class="acc-i snd">${glyph('sound')}<b>Best with sound</b></span>` : '');
};

function barHTML() {
  const w = (/** @type {string} */ a, /** @type {string} */ l, /** @type {boolean} [on] */ on, /** @type {string} [t] */ t) => `<button class="w" type="button" data-a="${a}"${on === undefined ? '' : ` aria-pressed="${on}"`}${t ? ` title="${t}"` : ''}>${l}</button>`;
  const sl = '<span class="sl">/</span>', lab = (/** @type {string} */ l) => `<span class="lab-i">${l}</span>`;
  const set = (/** @type {string} */ attr, /** @type {any[][]} */ opts, /** @type {any} */ now) => opts.map(([v, l]) => `<button class="w" type="button" data-${attr}="${v}" aria-pressed="${now === v}">${l}</button>`).join('');
  const full = document.body.classList.contains('is-full');
  const row = (/** @type {string} */ cls, /** @type {string} */ l, /** @type {string} */ html) => `<span class="lab ${cls}">${l}</span><div class="bar ${cls}">${html}</div>`;
  return row('r-play', 'Play', w('vprev', '‹', undefined, 'Previous effect') + `<button class="w" type="button" data-a="replay" title="${MADE.VARIETIES[S.variety].label}">${vName(S.variety)}${S.variety === 'strobe' ? glyph('flash') : ''}</button>` + w('vnext', '›', undefined, 'Next effect') + w('all', 'All effects', !!S.allEffects, 'Off: the arrows step through the starred effects only')
      + sl + w('replay', 'Replay', undefined, 'Space') + w('step', 'Step through', !!S.step, 'Stops at every step; Next or N goes on') + w('next', 'Next ›', undefined, 'N')
      + sl + w('knobs', 'Knobs', !$('.is-knobs')?.hidden) + w('full', full ? 'Leave full screen' : 'Full screen', undefined, full ? 'Escape' : ''))
    + row('r-look', 'Look', lab('Row') + set('l', [['stack', 'List'], ['line', 'Line'], ['rail', 'Rail']], S.layout)
      + sl + lab('Icon') + set('ic', [['og', 'OG'], ['mono', 'Mono'], ['gradient', 'Gradient'], ['flat', 'Flat']], S.ic || 'gradient'))
    + row('r-align', 'Align', set('al', [['centre', 'Centre'], ['bc', 'Bottom centre'], ['left', 'Centre, content left'], ['bl', 'Bottom left']], S.align || 'centre'))
    + row('r-test', 'Test', lab('Load') + set('slow', [[0, 'Now'], [3000, '3 s'], [8000, '8 s'], [20000, '20 s'], [-1, 'Hold']], S.slow || 0) + w('notes', 'Load notes', S.notes !== false, 'Step names over the load line')
      + sl + w('gate', 'Strobe gate', !S.noGate, 'The Fast flashing light question before a strobe toy') + w('calm', 'Calm intro', !!S.calm, 'The intro under reduced motion: no flash, no steps'));
}
// Judging the intro writes the inventory record's intro area.
function readRec() { try { return JSON.parse(localStorage.getItem(INV + item.id) || 'null'); } catch { return null; } }
function judge(/** @type {boolean | null} */ ok, /** @type {string} [note] */ note) {
  const r = readRec() || { schema: 2, id: item.id, areas: {} };
  r.areas ||= {};
  const was = r.areas.intro || { ok: true, notes: '' };
  r.areas.intro = { ok: ok === null ? was.ok : ok, notes: note ?? was.notes ?? '' };
  r.edited = Date.now();
  r.date = new Date().toISOString().slice(0, 10);
  try { localStorage.setItem(INV + item.id, JSON.stringify(r)); } catch {}
  // The look it was judged in, so the YAML can say so.
  if (ok !== null) desk.keep.set(`intro.${item.id}`, { variety: S.variety, layout: S.layout, align: S.align || 'centre', iconColour: S.ic || 'gradient', calm: !!S.calm, tuned: S.tune[S.variety] || {}, type: S.type?.[S.variety] || {}, date: r.date });
  desk.refresh();
}
function judgeHTML() {
  const a = readRec()?.areas?.intro, seen = desk.keep.get(`intro.${item.id}`, null);
  const ok = seen ? a?.ok !== false : null;
  return `<div class="bar"><button class="w" type="button" data-j="ok" aria-pressed="${ok === true}">Intro OK</button><span class="sl">/</span><button class="w" type="button" data-j="bad" aria-pressed="${ok === false}">Needs work</button></div>`
    + `<input type="text" data-jn placeholder="What to change in this intro" value="${String(a?.notes || '').replace(/"/g, '&quot;')}">`;
}

function typeHTML() {
  const line = S.typeLine || 'name', v = ty()[line] || {}, n = Object.keys(ty()).length;
  const words = (/** @type {string} */ attr, /** @type {[string, string][]} */ opts, /** @type {string} */ now) => opts.map(([x, l]) => `<button class="w" type="button" data-${attr}="${x.replace(/"/g, '&quot;')}" aria-pressed="${now === x}">${l}</button>`).join('');
  return `<h4>Type styles <small>${n ? `${n} line${n > 1 ? 's' : ''} styled` : 'as made'}</small><button class="w" type="button" data-tr${v && Object.keys(v).length ? '' : ' disabled'}>Reset line</button></h4>`
    + `<div class="bar tline">${TLINES.map(([k, l]) => `<button class="w" type="button" data-tl="${k}" aria-pressed="${line === k}">${l}${ty()[k] ? ' •' : ''}</button>`).join('')}</div>`
    + `<div class="rows"><label>Font</label><div class="tfont">${words('tf', TFONTS, v.ff || '')}</div><span></span>`
    + `<label>Case</label><div class="tfont">${words('tc', TCASE, v.tt || '')}</div><span></span>`
    + Object.entries(TKNOB).map(([k, [l, lo, hi, st, u]]) => { const x = typeNow(line, k); return `<label for="t-${k}" class="${v[k] !== undefined ? 'tuned' : ''}">${l}</label><input type="range" id="t-${k}" data-tk="${k}" min="${lo}" max="${hi}" step="${st}" value="${x}"><output>${x}${u}</output>`; }).join('')
    + `</div><p class="note">Sizes are in Type below. Each effect keeps its own styles.</p>`;
}
function knobsHTML() {
  const t = TT(), own = S.tune[S.variety] || {};
  const note = /** @type {Record<string, string>} */ ({ Layout: 'Moves each line up or down, live.', Type: 'Sizes, times the responsive size.', Box: 'Pop size replays the intro.', Glass: 'The page behind the intro.', Timing: 'In frames at 30 fps; a change replays the intro.' });
  const n = Object.keys(own).length;
  return `<h4>Try-outs</h4><div class="try">${TRY.map(([k, l, d]) => `<button class="w" type="button" data-o="${k}" aria-pressed="${!!S[k]}">${l}</button><p>${d}</p>`).join('')}</div>`
    + typeHTML()
    + `<h4>Tuning: ${vName(S.variety)} <small>${n ? `${n} tuned` : 'as made'}</small><button class="w" type="button" data-o="reset"${n ? '' : ' disabled'}>Reset all</button></h4>`
    + `<p class="note">Each effect keeps its own tuning. Double-click a name to reset one knob.</p>`
    + Object.entries(KNOBS).map(([g, list]) => {
      const m = Object.keys(list).filter(k => k in own).length;
      return `<h4>${g} <small>${note[g] || ''}</small><button class="w" type="button" data-rg="${g}"${m ? '' : ' disabled'}>Reset</button></h4><div class="rows">${Object.entries(list).map(([k, [lo, hi, st, u]]) =>
        `<label for="k-${k}" class="${k in own ? 'tuned' : ''}" title="Double-click resets">${KLABEL[k] || k}</label><input type="range" id="k-${k}" data-k="${k}" min="${lo}" max="${hi}" step="${st}" value="${t[k] ?? lo}"><output>${kfmt(t[k] ?? lo, u)}</output>`).join('')}</div>`;
    }).join('');
}

// The gate: a choice before a toy that strobes.
const ask = (/** @type {number} */ my) => new Promise(res => {
  const g = $('.is-gate');
  g.classList.add('on');
  strip('gate');
  const on = (/** @type {Event} */ e) => {
    const b = /** @type {HTMLElement} */ (e.target).closest('[data-go]');
    if (!b) return;
    g.removeEventListener('click', on);
    g.classList.remove('on');
    if (my === gen) res(/** @type {HTMLElement} */ (b).dataset.go === 'calm');
  };
  g.addEventListener('click', on);
});
// The shell's load stages and where each starts on the load line (shared/stim.js STAGE_AT).
const STAGES = /** @type {[string, number, string][]} */ ([['shell', 0.05, 'Shell'], ['libs', 0.3, 'Libraries'], ['build', 0.5, 'Building'], ['first-frame', 0.95, 'First frame']]);
const STEPS = 8;
// Sample build notes, as a toy passes them to buildSteps(n, notes).
const NOTES = ['Compiling shaders', 'Baking the haze', 'Building the scene', 'Loading the textures', 'Baking the light', 'Placing the parts', 'Warming the sound', 'Drawing the first frame'];
// Which stage a share of the load is in, with the build's step.
function stageAt(/** @type {number} */ u) {
  let i = 0;
  if (u < STAGES[0][1]) return { i: 0, name: 'shell', step: 0, word: STAGES[0][2] };
  while (i + 1 < STAGES.length && u >= STAGES[i + 1][1]) i++;
  const [name, from, word] = STAGES[i];
  const step = name === 'build' ? Math.min(STEPS, Math.floor(((u - from) / (STAGES[i + 1][1] - from)) * STEPS) + 1) : 0;
  return { i, name, step, word: step ? `${word} ${step} / ${STEPS}` : word };
}
// The corner readout: each stage, the one now in white, then the share.
function loadInfo(/** @type {number | null} */ u) {
  const el = /** @type {HTMLElement | null} */ (document.querySelector('.is-load'));
  if (!el) return;
  if (u === null) { el.innerHTML = ''; return; }
  const st = stageAt(u);
  el.innerHTML = STAGES.map(([n, , w], k) => `<span class="${k === st.i ? 'on' : k < st.i ? 'done' : ''}">${k === st.i ? st.word : w}</span>`).join('') + `<b>${Math.round(u * 100)}%</b>`;
}
// Load notes go to the engine, as buildSteps() sends them in a toy.
// The last note holds through the first frame, as in the shell.
function feedNote(/** @type {any} */ eng, /** @type {number} */ u) {
  const st = stageAt(u);
  if (S.notes !== false && st.step) eng.loadNote(NOTES[st.step - 1], st.step, STEPS);
}
// The step the intro shows now, and the resume of a held step.
let phase = '';
/** @type {(() => void) | null} */
let resume = null;
const strip = (/** @type {string} */ now = phase) => {
  phase = now;
  const el = $('.is-strip');
  if (!el) return;
  el.innerHTML = `<span class="${now === 'gate' ? 'on' : ''}">Gate</span><span class="sep"></span>`
    + STEP.map(([p, l, d]) => `<button type="button" class="${p === now ? 'on' : ''}${S.stopAt === p ? ' stop' : ''}" data-stop="${p}" title="${d}. Click to stop here.">${l}</button>`).join('')
    + `<span class="sep"></span><span class="${now === 'toy' ? 'on' : ''}">Toy</span>`
    + `<button type="button" class="nx" data-a="next" title="N"${resume ? '' : ' disabled'}>Next ›</button>`;
};
// Holds the intro on a step until Next.
const pause = (/** @type {number} */ my) => new Promise(res => {
  resume = () => { resume = null; if (my === gen) res(undefined); };
  strip();
});
const next = () => { if (resume) resume(); };
// Puts the row where the layout wants it, then refits the copy.
const place = (/** @type {HTMLElement} */ root, /** @type {HTMLElement} */ row) => {
  row.className = `intro-snd acc acc--${S.layout}`;
  const text = /** @type {HTMLElement} */ (root.querySelector('.intro-text')), foot = text.querySelector('.intro-foot');
  if (S.layout === 'rail') text.append(row); else if (foot) foot.before(row); else text.append(row);
  // Bottom centre and Bottom left: the foot's motto joins the block, above the row.
  if (root.dataset.align === 'bc' || root.dataset.align === 'bl') row.before(...text.querySelectorAll('.intro-foot .intro-tag'));
  MADE.fitIntro(root, TT());
  measure(root);
};
// The block's box at rest, in the intro's pixels: every line but the foot.
// Text lines count by their glyphs, so a wide empty box adds nothing.
function blockBox(/** @type {HTMLElement} */ text, /** @type {DOMRect} */ R) {
  let l = Infinity, r = -Infinity, t = Infinity, b = -Infinity;
  for (const el of text.children) {
    if (el.matches('.intro-foot, .intro-probe') || !(/** @type {HTMLElement} */ (el)).offsetHeight) continue;
    const rg = document.createRange();
    rg.selectNodeContents(el);
    const g = el.matches('.intro-badge') ? el.getBoundingClientRect() : rg.getBoundingClientRect(), e = el.getBoundingClientRect();
    if (!g.width) continue;
    l = Math.min(l, g.left); r = Math.max(r, g.right); t = Math.min(t, e.top, g.top); b = Math.max(b, e.bottom, g.bottom);
  }
  return { l: l - R.left, r: r - R.left, t: t - R.top, b: b - R.top };
}
// The block's middle sits a little above the stage's middle.
const MID = 0.47;
// The block keeps this share of the stage clear at the top.
const EDGE = 0.06;
// Bottom left: the content box, flash box included, sits this far in.
const INSET = (/** @type {number} */ W) => Math.min(80, Math.max(24, 0.06 * W));
// Reads the block at rest and places it as one piece.
// Centre and Centre, content left: the middle at MID, the box centred.
// Bottom centre: the foot one gap above the tech tags, the loader or the motto.
// Bottom left: the same foot; the content box one inset from the left.
// The logo holds its point through every beat: this runs before the flash.
function measure(/** @type {HTMLElement} */ root) {
  const text = /** @type {HTMLElement | null} */ (root.querySelector('.intro-text'));
  if (!text) return;
  for (const p of ['--origin', '--origin-x', '--dx', '--col-x', '--rail-x', '--rail-y']) root.style.removeProperty(p);
  const al = root.dataset.align || 'centre';
  const big = /** @type {HTMLElement | null} */ (text.querySelector('.intro-badge') || text.querySelector('.intro-name'));
  if (!big) return;
  // A beat in progress holds a transform; the block is read at rest.
  const posed = [text, big].filter(el => el.style.transform), held = posed.map(el => el.style.transform);
  posed.forEach(el => { el.style.transform = ''; });
  try {
    // The probes go first: the engine's fit reads the last child.
    const probe = (/** @type {string} */ cls) => {
      let el = /** @type {HTMLElement | null} */ (text.querySelector(`.intro-probe.${cls}`));
      if (!el) { el = document.createElement('span'); el.className = `intro-probe ${cls}`; text.prepend(el); }
      return el.offsetHeight;
    };
    const gm = probe('m'), origin = probe('o');
    const R = root.getBoundingClientRect(), H = R.height, W = R.width;
    // The foot: the highest of the tech tags, the loader, the foot's lines and the number.
    // The loader counts when hidden, so the block never moves when it shows.
    const foots = [...root.querySelectorAll('.intro-tech, .intro-loader, .intro-foot .intro-tag, .intro-foot .intro-num, .intro-foot .intro-snd, .intro > .intro-num')]
      .map(el => el.getBoundingClientRect()).filter(r => r.height > 0).map(r => r.top - R.top);
    const low = al === 'bc' || al === 'bl', inset = INSET(W);
    // Bottom centre and Bottom left keep the inset at the foot, too.
    const floor = Math.min(Math.min(H, ...foots) - gm, low ? H - inset : H), ceil = EDGE * H;
    // The engine's fit reads the block at its default point and shrinks it there.
    // The block moves, so the copy starts again at full size.
    text.style.removeProperty('--copy-k');
    // A word wider than its line still shrinks the copy.
    for (let i = 0; i < 3; i++) {
      const wide = Math.min(1, ...[...text.children].map(el => el.clientWidth && el.scrollWidth > el.clientWidth ? el.clientWidth / el.scrollWidth : 1));
      if (wide >= 1) break;
      text.style.setProperty('--copy-k', Math.max(0.4, +(text.style.getPropertyValue('--copy-k') || 1) * wide).toFixed(3));
    }
    let dy = 0;
    for (let i = 0; i < 5; i++) {
      const box = blockBox(text, R), h = box.b - box.t;
      // A block taller than the room shrinks its copy; the logo keeps its size.
      if (h > floor - ceil + 1) {
        const k = +(text.style.getPropertyValue('--copy-k') || 1);
        if (k > 0.4) { text.style.setProperty('--copy-k', Math.max(0.4, k * (floor - ceil) / h).toFixed(3)); continue; }
      }
      const want = low ? floor - h / 2 : Math.min(floor - h / 2, Math.max(ceil + h / 2, MID * H));
      dy = want - (box.t + box.b) / 2;
      let dx = W / 2 - (box.l + box.r) / 2;
      // The box's left edge, the flash box's included, sits at the inset.
      if (al === 'bl') dx = inset - box.l;
      root.style.setProperty('--dx', `${dx.toFixed(1)}px`);
      break;
    }
    root.style.setProperty('--origin', `${(origin + dy).toFixed(1)}px`);
    // The column scales about the logo's centre, in the column's own box.
    const t = text.getBoundingClientRect(), g = big.getBoundingClientRect();
    root.style.setProperty('--origin-x', `${(g.left + g.width / 2 - t.left).toFixed(1)}px`);
    // Rail hangs beside the logo, or the name when a toy has no emblem.
    root.style.setProperty('--rail-x', `${(g.right - t.left).toFixed(1)}px`);
    root.style.setProperty('--rail-y', `${(g.top + g.height / 2 - t.top).toFixed(1)}px`);
    if (al === 'left' || al === 'bl') {
      // The column's edge is the emblem's edge: the badge hangs out by its pad.
      const emb = big.querySelector('.intro-emblem');
      root.style.setProperty('--col-x', `${((emb || big).getBoundingClientRect().left - R.left).toFixed(1)}px`);
    }
  } finally {
    posed.forEach((el, i) => { el.style.transform = held[i]; });
  }
}
// The engine hangs the load line and its note on the logo box.
// The loader takes them to the foot's centre; the engine keeps its handles.
function toLoader(/** @type {HTMLElement} */ root) {
  const parts = [...root.querySelectorAll('.intro-text .intro-note, .intro-text .intro-load')];
  if (!parts.length) return;
  let box = /** @type {HTMLElement | null} */ (root.querySelector('.intro-loader'));
  if (!box) { box = document.createElement('div'); box.className = 'intro-loader'; root.append(box); }
  // The note goes above the line.
  box.append(...parts.filter(el => el.matches('.intro-note')), ...parts.filter(el => el.matches('.intro-load')));
}

// OG: the live menu tile, laid over the emblem at rest.
// The menu draws some tiles by script, so only a live frame shows them whole.
// The frame lays out at desktop width; its tile sits at the corner, 128 px, scaled to fit.
/** @type {HTMLIFrameElement | null} */
let ogFrame = null;
function cutOg(/** @type {string} */ id) {
  const doc = ogFrame?.contentDocument;
  if (!doc?.querySelector('a.toy[id]')) { if (ogFrame?.isConnected) setTimeout(() => cutOg(id), 300); return; }
  let st = doc.getElementById('og-cut');
  if (!st) { st = doc.createElement('style'); st.id = 'og-cut'; doc.head.append(st); }
  const sel = `a.toy#${window.CSS.escape(id)}`;
  // A view may hide the tile's shelf; its parents open, as on the icon sheet.
  for (let n = doc.querySelector(sel)?.parentElement; n && n !== doc.documentElement; n = n.parentElement) {
    for (const [k, v] of [['display', 'block'], ['transform', 'none'], ['filter', 'none'], ['opacity', '1'], ['contain', 'none'], ['content-visibility', 'visible']]) n.style.setProperty(k, v, 'important');
  }
  // The page's shared defs stay visible: a hidden clip shape clips the art away.
  st.textContent = `html, body { background: transparent !important; overflow: hidden !important; }
    body * { visibility: hidden !important; }
    ${sel}, ${sel} * { visibility: visible !important; }
    svg defs, svg defs * { visibility: visible !important; }
    ${sel} { position: fixed !important; left: 0 !important; top: 0 !important; width: 128px !important; height: 128px !important; margin: 0 !important; padding: 0 !important; transform: none !important; opacity: 1 !important; filter: none !important; z-index: 9999 !important; display: grid !important; place-items: center !important; }
    ${sel} > :not(.obj) { display: none !important; }
    ${sel} .obj { width: 100% !important; height: 100% !important; max-width: none !important; }
    ${sel} .obj svg { width: 100% !important; height: 100% !important; }
    ${sel} .obj .series, ${sel} .obj::after { display: none !important; }`;
}
// Puts the live tile over the emblem; hides it in any other mode or beat.
function placeOg() {
  const wrap = /** @type {HTMLElement | null} */ (document.querySelector('.is-og'));
  const stage = document.querySelector('.is-stage'), emb = document.querySelector('.is-stage .intro-emblem');
  const badge = emb?.closest('.intro-badge');
  const show = !!(wrap && stage && emb && S.ic === 'og' && badge && !badge.classList.contains('is-flash') && document.querySelector('.is-stage .intro'));
  if (!wrap) return;
  wrap.hidden = !show;
  if (!show || !stage || !emb) return;
  const s0 = stage.getBoundingClientRect(), r = emb.getBoundingClientRect();
  Object.assign(wrap.style, { left: `${r.left - s0.left}px`, top: `${r.top - s0.top}px`, width: `${r.width}px`, height: `${r.height}px` });
  /** @type {HTMLElement} */ (wrap.firstElementChild).style.transform = `scale(${r.width / 128})`;
}
// The sound line flashes once, two frames after its row has opened.
const flashSound = (/** @type {HTMLElement} */ root, /** @type {number} */ my) => {
  const row = root.querySelector('.acc.snd-wait');
  if (!row || my !== gen) return;
  row.classList.remove('snd-wait');
  row.querySelector('.acc-i.snd')?.classList.add('flashin');
};
// The flash comes two frames after the row looks open: its clip under half a percent.
// The opening eases out, so it looks open well before its animation ends.
function flashWhenOpen(/** @type {HTMLElement} */ root, /** @type {HTMLElement} */ row, /** @type {number} */ my) {
  const t0 = performance.now();
  let seen = false;
  const look = () => {
    if (my !== gen || !row.isConnected) return;
    const c = getComputedStyle(row).clipPath, p = [...c.matchAll(/([\d.]+)%/g)].map(m => +m[1]);
    // It must be seen shut first, so a row not yet clipped does not count.
    if (p.some(v => v >= 0.5)) seen = true;
    else if (seen) { setTimeout(() => flashSound(root, my), (2 * 1000) / 30); return; }
    if (performance.now() - t0 < 8000) setTimeout(look, 1000 / 30);
  };
  look();
}
async function run() {
  const my = ++gen, it = item, t = it.raw, stage = $('.is-stage');
  if (!stage) return;
  resume = null;
  applyType();
  $('.is-ctl').innerHTML = barHTML();
  stage.querySelector('.intro')?.remove();
  loadInfo(null);
  // A run cut short leaves its note in the engine.
  MADE.loadNote('');
  CALM.loadNote('');
  $('.is-gate').classList.remove('on');
  placeOg();
  const img = /** @type {HTMLImageElement} */ (stage.querySelector('img'));
  img.hidden = false;
  img.onerror = () => { img.hidden = true; };
  img.src = `${ROOT}shared/stills/${it.id}.webp`;
  if (it.group === 'unlisted') { strip(''); return; }
  let calm = !!(S.calm || S.always);
  // Gate off skips the question, for quick passes in the lab.
  if (!calm && !S.noGate && /** @type {any} */ (REC)[it.id]?.flash === 'strobe') calm = await ask(my);
  if (my !== gen) return;
  const root = document.createElement('div');
  root.className = 'intro';
  root.setAttribute('aria-hidden', 'true');
  root.style.setProperty('--acc-ink', inkOf(t.accent || ''));
  root.style.setProperty('--ink-flat', inkOf(t.accent || ''));
  root.style.setProperty('--ink-grad', t.accent || '#fff');
  root.dataset.ic = S.ic || 'gradient';
  root.dataset.align = S.align || 'centre';
  // OG: the full-colour menu icon sits in the emblem; it shows at rest only.
  const emblem = t.emblem ? '<span class="intro-emblem"></span>' : '';
  // The Calm intro has no audio beat, so the row is in the markup.
  const calmRow = calm ? `<span class="intro-snd acc acc--${S.layout}">${rowHTML(it)}</span>` : '';
  root.innerHTML = `<div class="intro-mark"><div class="intro-text">${emblem}<span class="intro-name"></span>${t.sub ? '<span class="intro-sub"></span>' : ''}${calmRow}</div></div>`
    + `<div class="intro-tech">${techHTML(it.id)}</div>`;
  stage.append(root);
  new MutationObserver(() => toLoader(root)).observe(root, { subtree: true, childList: true });
  cutOg(it.id);
  strip(calm ? 'lines' : 'glass');
  const gate = (/** @type {string} */ ph) => {
    if (my !== gen) return new Promise(() => {});
    strip(ph);
    if (ph === 'glass') { const row = /** @type {HTMLElement | null} */ (root.querySelector('.intro-snd')); if (row) { row.innerHTML = rowHTML(it); place(root, row); row.classList.add('snd-wait'); flashWhenOpen(root, row, my); } }
    // The hold beat is the fallback, for a reveal that never reports open.
    if (ph === 'hold') flashSound(root, my);
    // A refit during the pop measures the blown-up box; this undoes it.
    if (ph === 'flash' || ph === 'lines') { MADE.fitIntro(root, TT()); measure(root); }
    // The emblem has landed once the lines open; the live tile can take its place.
    if (ph === 'lines' || ph === 'hold') requestAnimationFrame(placeOg);
    if (ph === 'wipe') { const og = /** @type {HTMLElement | null} */ (document.querySelector('.is-og')); if (og) og.hidden = true; }
    // Step through stops on every step; a stop mark stops on one.
    if (S.step || S.stopAt === ph) return pause(my);
  };
  if (calm) requestAnimationFrame(() => { const row = /** @type {HTMLElement | null} */ (root.querySelector('.acc')); if (row) place(root, row); });
  // The Calm intro has no beats; the live tile takes the emblem's place once it fades in.
  if (calm) setTimeout(() => { if (my === gen) placeOg(); }, 450);
  // Static fills every line, so the layout shows whole.
  const fill = S.static ? { sound: true, tag: 'A motto line, to see the layout', tagNl: 'Een mottolijn, om de opmaak te zien' } : { sound: true };
  // Slow load holds the toy back and feeds the load line.
  let ready = Promise.resolve();
  if (S.slow) {
    // A simulated load: the five stages in order, the build in eight steps.
    // Hold stops mid-build for good, so the loader stays up to look at.
    const t0 = performance.now(), held = S.slow < 0;
    ready = new Promise(res => {
      const tick = () => {
        if (my !== gen) return;
        const u = held ? Math.min(0.72, (performance.now() - t0) / 3000) : Math.min(1, (performance.now() - t0) / S.slow);
        (calm ? CALM : MADE).progress(u);
        loadInfo(u);
        feedNote(calm ? CALM : MADE, u);
        if (u >= 1) { res(undefined); setTimeout(() => { if (my === gen) loadInfo(null); }, 900); } else setTimeout(tick, 100);
      };
      tick();
    });
  }
  await (calm ? CALM : MADE).intro({ id: it.id, gate, soundNote: { glyph: false, words: ' ', nudge: false }, timing: { ...inColumn(), ...(S.tune[S.variety] || {}) }, ready, variety: S.variety, fill,
    nameFlash: !!S.nameFlash, textFlash: !!S.textFlash, classic: !!S.classic, access: false, min: calm && (S.stopAt || S.step) ? 1e9 : undefined });
  if (my === gen) { strip('toy'); placeOg(); }
}
// Applies the size and Y knobs to the intro on screen, then places the block again.
const liveFit = () => {
  const root = /** @type {HTMLElement | null} */ (document.querySelector('.is-stage .intro'));
  if (root) {
    const t = TT();
    for (const [k, sel] of Object.entries(YSEL)) root.querySelectorAll(`.intro-text ${sel}`).forEach(el => { /** @type {HTMLElement} */ (el).style.translate = t[k] ? `0 ${t[k]}cqh` : ''; });
    MADE.fitIntro(root, t);
    measure(root);
  }
  placeOg();
};
function setFull(/** @type {boolean} */ on) {
  $('.is-stage')?.classList.toggle('full', on);
  document.body.classList.toggle('is-full', on);
  run();
}

export default {
  id: 'intro',
  label: 'Intro',
  setup(/** @type {any} */ d) {
    desk = d;
    S = { variety: MADE.DEFAULT_VARIETY, layout: 'line', group: 'Layout', tune: {}, ...d.keep.get('intro', {}) };
    S.tune ||= {};
    if (!MADE.VARIETIES[S.variety]) S.variety = MADE.DEFAULT_VARIETY;
    // Hold became a stop on Rest.
    if (S.hold) S.stopAt = 'hold';
    delete S.hold;
    delete S.group;
    const st = document.createElement('style');
    st.textContent = STYLE;
    document.head.append(st);
    const host = d.$('panel');
    host.addEventListener('click', (/** @type {Event} */ e) => {
      const b = /** @type {HTMLElement} */ (e.target).closest('button');
      // The gate answers through its own listener.
      if (!b || !b.closest('.is-wrap') || b.closest('.is-gate')) return;
      const ds = b.dataset;
      if (ds.j) { judge(ds.j === 'ok'); /** @type {HTMLElement} */ (document.querySelector('.is-judge')).innerHTML = judgeHTML(); return; }
      if (ds.stop) { S.stopAt = S.stopAt === ds.stop ? '' : ds.stop; keepS(); run(); return; }
      if (ds.a === 'next') { next(); return; }
      if (b.closest('.is-knobs')) {
        const tl = S.typeLine || 'name';
        if (ds.tl) S.typeLine = ds.tl;
        else if (ds.tf !== undefined || ds.tc !== undefined) {
          const v = ty()[tl] ||= {};
          if (ds.tf !== undefined) { if (ds.tf) v.ff = ds.tf; else delete v.ff; }
          if (ds.tc !== undefined) { if (ds.tc) v.tt = ds.tc; else delete v.tt; }
          if (!Object.keys(v).length) delete ty()[tl];
          applyType(); liveFit();
        } else if ('tr' in ds) { delete ty()[tl]; applyType(); liveFit(); }
        else if (ds.rg) { const own = S.tune[S.variety] || {}; Object.keys(KNOBS[ds.rg]).forEach(k => delete own[k]); run(); }
        else if (ds.o === 'reset') { delete S.tune[S.variety]; run(); }
        else if (ds.o) { S[ds.o] = !S[ds.o]; run(); }
        keepS();
        $('.is-knobs').innerHTML = knobsHTML();
        return;
      }
      if (ds.ic) {
        S.ic = ds.ic;
        keepS();
        const root = /** @type {HTMLElement | null} */ (document.querySelector('.is-stage .intro'));
        if (root) root.dataset.ic = S.ic;
        $('.is-ctl').innerHTML = barHTML();
        placeOg();
        return;
      }
      if (ds.al) S.align = ds.al;
      if (ds.l) S.layout = ds.l;
      const L = vList(), vi = L.indexOf(S.variety);
      if (ds.a === 'vprev') S.variety = L[(vi + L.length - 1) % L.length];
      if (ds.a === 'vnext') S.variety = L[(vi + 1) % L.length];
      if (ds.a === 'all') S.allEffects = !S.allEffects;
      if (ds.a === 'gate') S.noGate = !S.noGate;
      if (ds.a === 'notes') S.notes = S.notes === false;
      if (ds.slow !== undefined) S.slow = +ds.slow;
      if (ds.a === 'calm') S.calm = !S.calm;
      if (ds.a === 'step') S.step = !S.step;
      if (ds.a === 'knobs') { const k = $('.is-knobs'); k.hidden = !k.hidden; k.innerHTML = knobsHTML(); }
      keepS();
      if (!$('.is-knobs').hidden) $('.is-knobs').innerHTML = knobsHTML();
      if (ds.a === 'full') return setFull(!document.body.classList.contains('is-full'));
      if (ds.a === 'knobs') { $('.is-ctl').innerHTML = barHTML(); return; }
      run();
    });
    host.addEventListener('input', (/** @type {Event} */ e) => {
      const el = /** @type {HTMLInputElement} */ (e.target);
      if ('jn' in el.dataset) return judge(null, el.value);
      if (el.dataset.tk) {
        const tl = S.typeLine || 'name', v = ty()[tl] ||= {};
        v[el.dataset.tk] = +el.value;
        /** @type {HTMLElement} */ (el.nextElementSibling).textContent = `${+el.value}${TKNOB[el.dataset.tk][4]}`;
        el.previousElementSibling?.classList.add('tuned');
        keepS(); applyType(); liveFit();
        return;
      }
      const k = el.dataset?.k;
      if (!k || !el.closest('.is-knobs')) return;
      const own = S.tune[S.variety] ||= {}, v = +el.value;
      if (v === { ...MADE.tableOf(S.variety), ...inColumn() }[k]) delete own[k]; else own[k] = v;
      const u = Object.values(KNOBS).find(l => k in l)?.[k][3] || '';
      /** @type {HTMLElement} */ (el.nextElementSibling).textContent = kfmt(v, u);
      el.previousElementSibling?.classList.toggle('tuned', k in own);
      keepS();
      if (!TIMING_KEYS.has(k)) liveFit();
    });
    host.addEventListener('change', (/** @type {Event} */ e) => { if (TIMING_KEYS.has(/** @type {HTMLElement} */ (e.target).dataset?.k || '')) run(); });
    host.addEventListener('dblclick', (/** @type {Event} */ e) => {
      const l = /** @type {HTMLLabelElement | null} */ (/** @type {HTMLElement} */ (e.target).closest('.is-knobs label'));
      if (!l) return;
      delete S.tune[S.variety]?.[l.htmlFor.slice(2)];
      keepS(); $('.is-knobs').innerHTML = knobsHTML(); liveFit();
    });
    addEventListener('keydown', e => {
      if (!document.querySelector('.is-stage') || /** @type {HTMLElement} */ (e.target).closest('input, textarea, select')) return;
      if (e.key === 'Escape' && document.body.classList.contains('is-full')) setFull(false);
      if (e.key === ' ' && !/** @type {HTMLElement} */ (e.target).closest('button')) { e.preventDefault(); run(); }
      if ((e.key === 'n' || e.key === 'N') && !e.metaKey && !e.ctrlKey) next();
    });
  },
  mount(/** @type {HTMLElement} */ host, /** @type {any} */ it) {
    item = it;
    try { S.always = localStorage.getItem('stimming.accesslab.calm') === '1'; } catch { S.always = false; }
    host.innerHTML = '<div class="is-wrap">'
      + `<div class="is-stage"><img alt=""><div class="is-strip"></div><div class="is-load" aria-live="polite"></div><div class="is-og" hidden><iframe title="Menu tile" scrolling="no" src="${ROOT}index.html?lab"></iframe></div>`
      + `<div class="is-gate">${glyph('flash')}<div class="t">Fast flashing light</div><div class="bar"><button class="w" type="button" data-go="calm">Play calm</button><span class="sl">/</span><button class="w" type="button" data-go="made">Play as made</button></div>`
      + `<label><input type="checkbox" data-always${S.always ? ' checked' : ''}> Always calm</label></div></div>`
      + '<div class="is-ctl"></div>'
      + `<div class="is-judge">${judgeHTML()}</div>`
      + '<div class="is-knobs" hidden></div></div>';
    ogFrame = /** @type {HTMLIFrameElement} */ (host.querySelector('.is-og iframe'));
    ogFrame.addEventListener('load', () => cutOg(item.id));
    host.querySelector('[data-always]')?.addEventListener('change', e => {
      S.always = /** @type {HTMLInputElement} */ (e.target).checked;
      try { localStorage.setItem('stimming.accesslab.calm', S.always ? '1' : '0'); } catch {}
    });
    run();
  },
  unmount() {
    gen++;
    document.body.classList.remove('is-full');
    document.querySelector('.is-stage .intro')?.remove();
  },
  status(/** @type {any} */ it) {
    const seen = desk?.keep.get(`intro.${it.id}`, null);
    if (!seen) return '';
    let a = null;
    try { a = JSON.parse(localStorage.getItem(INV + it.id) || 'null')?.areas?.intro; } catch {}
    return a?.ok === false ? 'needs work' : 'OK';
  },
  yaml(/** @type {any} */ it) {
    const seen = desk.keep.get(`intro.${it.id}`, null);
    if (!seen) return null;
    let a = null;
    try { a = JSON.parse(localStorage.getItem(INV + it.id) || 'null')?.areas?.intro; } catch {}
    return { verdict: a?.ok === false ? 'needs work' : 'ok', note: a?.notes || null, seenWith: { effect: seen.variety, layout: seen.layout, align: seen.align, iconColour: seen.iconColour, calm: seen.calm, tuned: seen.tuned, type: seen.type || {} }, date: seen.date };
  },
};
