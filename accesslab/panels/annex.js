// @ts-check
// Annex panel: the content zone under any toy, ported from annexlab/round2.html into the desk.
// One driver value, --p, runs from 0 (the toy) to 1 (the content zone) inside the scrollable frame.
import { inkOf, flagsHTML, techHTML, REC } from '../access-data.js';

const ROOT = new URL('../../', import.meta.url).href;

const STYLE = `
.ax-wrap { display: grid; gap: 10px; }
/* Controls: one group; each row is a label column and a Bar v3 word row. */
.ax-wrap { --ax-chrome: 220px; --ax-h: max(480px, calc(100svh - 48px - var(--ax-chrome))); }
.ax-ctl { display: grid; border: 1px solid var(--line); border-radius: 12px; padding: 0 12px; }
.ax-row { display: grid; grid-template-columns: 92px minmax(0, 1fr); align-items: start; column-gap: 12px; padding: 3px 0; }
.ax-row + .ax-row { border-top: 1px solid var(--line); }
.ax-row > .lab { padding-top: 12px; font: 800 10px/1 var(--slab); letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); }
.ax-row > .bar { min-width: 0; }
.ax-row > .bar .w { height: 34px; }
.ax-ctl .lab-i { padding: 0 4px 0 11px; font: 800 10px/1 var(--slab); letter-spacing: 0.14em; color: var(--muted); }
@media (max-width: 599px) {
  .ax-row { grid-template-columns: minmax(0, 1fr); padding: 8px 0 4px; }
  .ax-row > .lab { padding-top: 0; }
  .ax-row > .bar { margin-top: 2px; }
}
.ax-wrap[data-view="sheet"] :is(.ax-row:not(.r-view), .ax-frame, .ax-judge) { display: none; }
.ax-wrap[data-view="live"] .ax-sheet { display: none; }

/* Viewport frame: holds the scrollable annex and the pinned back chip. */
.ax-frame { position: relative; border-radius: 18px; overflow: hidden; background: var(--bg); box-shadow: 0 0 0 1px var(--line); }
/* The annex sizes from the frame, never from the desk window. */
.ax-frame { container: ax / inline-size; width: var(--aw, 100%); margin-inline: auto; zoom: var(--z, 1); }
.ax-vp {
  --p: 0; --sy: 0; --vh: 620px; --lip: 14px;
  --ax-accent: var(--acc-ink, oklch(0.9 0.07 200));
  --ax-series: oklch(0.88 0.1 200);
  --ax-ink: oklch(0.16 0.012 275);
  --ax-read: oklch(0.87 0.01 275);
  --ax-surface: oklch(0.2 0.014 275);
  --ax-stage: oklch(0.1 0.012 275);
  --ax-gutter: clamp(20px, 5cqw, 56px);
  --ax-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ax-emblem: none;
  position: relative; height: calc(var(--ax-h) / var(--z, 1)); overflow-y: auto; overflow-x: clip;
  background: var(--bg); color: var(--fg); scrollbar-color: var(--line) var(--bg);
}
body.ax-full { overflow: hidden; }
body.ax-full .ax-frame { position: fixed; inset: 0; z-index: 90; border-radius: 0; box-shadow: none; width: auto; zoom: 1; }
body.ax-full .ax-vp { height: 100svh; }
body.ax-full .ax-ctl {
  position: fixed; left: 50%; top: 8px; translate: -50% 0; z-index: 210;
  display: flex; align-items: center; gap: 6px; padding: 0 12px; border: 0;
  background: oklch(0.1 0.012 275 / 0.84); -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px);
}
body.ax-full .ax-ctl > .ax-row:not(.r-scroll) { display: none; }
body.ax-full .ax-ctl > .ax-row.r-scroll { display: flex; padding: 0; border: 0; }
body.ax-full .ax-ctl > .ax-row.r-scroll > .lab { display: none; }

.ax-vp ::selection { background: var(--ax-accent); color: var(--ax-ink); }
.ax-page { position: relative; min-height: 100%; }

/* ---------- the player ---------- */
.ax-scene { position: relative; height: var(--vh); }
.ax-stage { position: absolute; inset: 0 0 var(--lip) 0; overflow: hidden; background: var(--ax-stage); transform-origin: 50% 50%; }
.ax-still { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; opacity: 0.92; }
.ax-still[hidden] { display: none; }
.ax-stage iframe { position: absolute; inset: 0; display: block; width: 100%; height: 100%; border: 0; background: transparent; }
.ax-stage iframe[hidden] { display: none; }
.ax-stage-empty { position: absolute; inset: 0; display: grid; place-items: center; color: var(--muted); font: 800 12px/1 var(--slab); letter-spacing: 0.12em; text-transform: uppercase; }
.ax-shade { position: absolute; inset: 0; pointer-events: none; background: oklch(0.1 0.012 275); opacity: calc(var(--p) * var(--dim, 0.7)); }
.ax-vp.read .ax-stage { visibility: hidden; }

/* Sticky stage for fixed-stage transitions inside the scrollable viewport. */
.ax-vp:is([data-dir="a"], [data-dir="f"], [data-dir="g"], [data-dir="h"]):not(.rm) .ax-scene { position: sticky; top: 0; z-index: 1; }

/* ---------- the content zone ---------- */
.ax-annex { position: relative; z-index: 2; margin-top: calc(var(--lip) * -1); }
.ax-lip {
  position: relative; z-index: 4; display: flex; align-items: center; justify-content: center;
  width: 100%; height: var(--lip); padding: 0; border: 0; background: var(--bg); color: var(--muted); cursor: pointer;
  font: 500 12px/1 var(--slab); letter-spacing: 0.12em; text-transform: uppercase;
}
.ax-lip svg { fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
.ax-lip > * { display: none; }
.ax-body { position: relative; background: var(--bg); min-height: var(--vh); padding: clamp(44px, 7cqw, 88px) var(--ax-gutter) 0; }
.ax-body, .ax-body * { -webkit-user-select: text !important; user-select: text !important; }
.ax-col { max-width: 1040px; margin: 0 auto; }
.ax-annex :focus-visible, .ax-back:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--bg), 0 0 0 4px var(--focus); border-radius: 4px; }

/* Title block: names left, facts right. */
.ax-title { display: grid; grid-template-columns: minmax(0, 1fr) minmax(220px, 300px); grid-template-areas: "names facts"; gap: 28px 56px; align-items: end; transform: translateY(calc((1 - var(--p)) * 40px)); }
.ax-title > div { grid-area: names; }
.ax-facts { grid-area: facts; }
.ax-title h1 { margin: 0; font-size: clamp(48px, 8cqw, 92px); font-weight: 700; letter-spacing: -0.04em; line-height: 0.92; }
.ax-nl { margin: 16px 0 0; font-size: clamp(18px, 2.2cqw, 26px); font-weight: 600; letter-spacing: -0.015em; line-height: 1.15; }
.ax-nl span { font-weight: 400; color: var(--muted); letter-spacing: 0; }
.ax-tag { margin: 22px 0 0; font-size: 17px; line-height: 1.4; }
.ax-tag span { display: block; color: var(--muted); }
.ax-facts { margin: 0; display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 0 18px; }
.ax-facts > div { display: contents; }
.ax-facts dt, .ax-facts dd { margin: 0; padding: 8px 0; border-top: 1px solid var(--line); }
.ax-facts dt { font: 500 11px/20px var(--slab); letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); }
.ax-facts dd { font-size: 14px; line-height: 20px; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.ax-facts dd svg { width: 20px; height: 20px; flex: none; }
.ax-body a { color: var(--fg); text-decoration: underline; text-decoration-color: var(--ax-accent); text-decoration-thickness: 1.5px; text-underline-offset: 3px; }
.ax-body a:hover { color: var(--ax-accent); }

/* In-flow section index. */
.ax-index { display: flex; flex-wrap: wrap; gap: 6px 26px; margin: clamp(36px, 5cqw, 64px) 0 0; padding: 14px 0; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
.ax-index a, .ax-nav a { font: 500 12px/20px var(--slab); letter-spacing: 0.12em; text-transform: uppercase; text-decoration: none; color: var(--muted); }
.ax-index a:hover { color: var(--ax-accent); }

/* Sections. */
.ax-sec { display: grid; grid-template-columns: minmax(0, 4fr) minmax(0, 8fr); gap: 20px 56px; padding: clamp(48px, 7cqw, 88px) 0 0; scroll-margin-top: 56px; }
.ax-sec h2 { margin: 0; font-size: clamp(24px, 3cqw, 36px); font-weight: 700; letter-spacing: -0.025em; line-height: 1.05; text-wrap: balance; }
.ax-sec h2 + p { margin: 10px 0 0; font-size: 14px; line-height: 1.5; color: var(--muted); max-width: 30ch; }
.ax-prose p { margin: 0; max-width: 66ch; font-size: 16px; line-height: 1.65; color: var(--ax-read); text-wrap: pretty; }
.ax-prose p + p { margin-top: 14px; }
.ax-matter > * + * { margin-top: 30px; }
.ax-fig { margin: 0; }
.ax-fig img, .ax-fig svg { display: block; width: 100%; height: auto; border-radius: 10px; background: var(--ax-surface); }
.ax-fig figcaption { margin-top: 10px; font-size: 13px; line-height: 1.45; color: var(--muted); max-width: 60ch; }
.ax-slot { display: grid; place-items: center; border: 1px dashed var(--line); border-radius: 10px; background: var(--ax-surface); }
.ax-slot span { font: 500 11px/1 var(--slab); letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); }
.ax-fig--wide { grid-column: 1 / -1; }
.ax-fig--pair { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.ax-fig--pair figcaption { grid-column: 1 / -1; margin-top: -6px; }
.ax-fig--draw svg { max-width: 440px; background: none; border-radius: 0; }
.ax-table { width: 100%; border-collapse: collapse; font-size: 14px; line-height: 1.45; }
.ax-table th, .ax-table td { padding: 9px 16px 9px 0; text-align: left; vertical-align: top; border-top: 1px solid var(--line); }
.ax-table thead th { border-top: 0; padding-top: 0; font: 500 11px/20px var(--slab); letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); }
.ax-table td:first-child { white-space: nowrap; font-weight: 600; }
.ax-table td { color: var(--ax-read); }
.ax-access-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 18px; font: 800 12px/1 var(--slab); letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
.ax-access-row .acc-i { display: inline-flex; align-items: center; gap: 8px; color: var(--fg); }

/* Notes log. */
.ax-log { margin: 0; padding: 0; list-style: none; }
.ax-log li { display: grid; grid-template-columns: 112px minmax(0, 1fr); gap: 4px 18px; padding: 12px 0; border-top: 1px solid var(--line); }
.ax-log time { font: 500 11px/22px var(--slab); letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); font-variant-numeric: tabular-nums; }
.ax-log p { margin: 0; font-size: 15px; line-height: 1.5; color: var(--ax-read); max-width: 60ch; }
.ax-log li[hidden] { display: none; }
.ax-more { margin-top: 12px; height: 32px; padding: 0 14px; border: 1px solid var(--line); border-radius: 999px; background: none; color: var(--fg); cursor: pointer; font: 600 13px/1 var(--sans); transition: border-color 0.2s ease, color 0.2s ease; }
.ax-more:hover { border-color: var(--ax-accent); color: var(--ax-accent); }

/* Also try: three sibling toys. */
.ax-try { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0; border-top: 1px solid var(--line); }
.ax-body .ax-try button {
  appearance: none; border: 0; background: none; color: var(--fg); text-align: left; cursor: pointer; font: inherit;
  display: flex; align-items: center; gap: 14px; padding: 18px 18px 18px 0; border-bottom: 1px solid var(--line);
}
.ax-try i { flex: none; width: 42px; height: 42px; background: var(--muted); -webkit-mask: var(--e) center / contain no-repeat; mask: var(--e) center / contain no-repeat; mask-mode: luminance; transition: background-color 0.2s ease, transform 0.4s var(--ax-out); }
.ax-try button:hover i { background: var(--ax-accent); transform: rotate(-8deg) scale(1.08); }
.ax-try b { display: block; font-size: 16px; font-weight: 600; letter-spacing: -0.01em; }
.ax-try span span { display: block; font-size: 13px; color: var(--muted); }

.ax-foot { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 24px; margin-top: clamp(48px, 7cqw, 88px); padding: 18px 0 28px; border-top: 1px solid var(--line); font-size: 14px; }
.ax-foot span { flex: 1; }
.ax-play { display: inline-flex; align-items: center; gap: 8px; height: 34px; padding: 0 14px 0 10px; border: 0; border-radius: 999px; background: var(--ax-accent); color: var(--ax-ink); cursor: pointer; font: 700 13px/1 var(--sans); }
.ax-play svg { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }

/* The way back: pinned to the frame's top-left once reading. */
.ax-back {
  position: absolute; z-index: 25; top: 12px; left: 12px;
  display: inline-flex; align-items: center; gap: 8px; height: 34px; padding: 0 14px 0 10px;
  border: 1px solid var(--line); border-radius: 999px; background: oklch(0.2 0.014 275 / 0.92); color: var(--fg); cursor: pointer;
  font: 700 13px/1 var(--sans);
  opacity: 0; transform: translateY(-8px); pointer-events: none; transition: opacity 0.3s ease, transform 0.5s var(--ax-out);
}
.ax-back svg { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.ax-frame.read .ax-back { opacity: 1; transform: none; pointer-events: auto; }
.ax-frame.no-back .ax-back { display: none; }
.ax-back:hover { border-color: var(--ax-accent); color: var(--ax-accent); }

/* ---------- A · Recede ---------- */
.ax-vp[data-dir="a"] { --dim: 0.68; }
.ax-vp[data-dir="a"]:not(.rm) .ax-stage { transform: scale(calc(1 - var(--p) * 0.14)); border-radius: calc(var(--p) * 24px); }
.ax-vp[data-dir="a"] .ax-lip { border-radius: 18px 18px 0 0; border-top: 1px solid var(--line); }
.ax-vp[data-dir="a"] .ax-lip .lip-handle { display: block; width: 44px; height: 4px; border-radius: 2px; background: var(--line); transition: background-color 0.2s ease; }
.ax-vp[data-dir="a"] .ax-lip:hover .lip-handle { background: var(--ax-accent); }

/* ---------- D · Drum ---------- */
.ax-vp[data-dir="d"] { --dim: 0.82; --lip: 18px; }
.ax-vp[data-dir="d"]:not(.rm) .ax-page { perspective: 1500px; perspective-origin: 50% calc(var(--sy) * 1px + var(--vh) * 0.5); }
.ax-vp[data-dir="d"]:not(.rm) .ax-scene { transform-origin: 50% calc(100% - var(--lip)); transform: rotateX(calc(var(--p) * -66deg)); }
.ax-vp[data-dir="d"]:not(.rm):not(.read) .ax-annex { transform-origin: 50% 0; transform: rotateX(calc((1 - var(--p)) * 66deg)); }
.ax-vp[data-dir="d"] .ax-lip { background: var(--ax-surface); border-top: 1px solid oklch(0.42 0.02 275); color: var(--fg); }
.ax-vp[data-dir="d"] .ax-lip .lip-chev { display: block; width: 16px; height: 16px; }
.ax-vp[data-dir="d"] .ax-lip:hover { color: var(--ax-accent); }
.ax-veil { display: none; position: absolute; z-index: 3; inset: 0 0 auto 0; height: calc(var(--vh) * 1.3); pointer-events: none; background: oklch(0.1 0.012 275); opacity: calc((1 - var(--p)) * 0.6); }
.ax-vp[data-dir="d"]:not(.rm):not(.read) .ax-veil { display: block; }

/* ---------- E · Placard ---------- */
.ax-vp[data-dir="e"] { --dim: 0.78; --lip: 46px; }
.ax-vp[data-dir="e"]:not(.rm) .ax-scene { overflow: clip; }
.ax-vp[data-dir="e"]:not(.rm) .ax-stage { transform: translateY(calc(var(--p) * var(--vh) * 0.24)); }
.ax-vp[data-dir="e"] .ax-lip {
  position: sticky; top: 0; z-index: 6; justify-content: flex-start; gap: 14px; padding: 0 16px;
  background: var(--ax-accent); color: var(--ax-ink); cursor: default;
  transition: background-color 0.35s ease, color 0.35s ease, box-shadow 0.35s ease;
}
.ax-vp[data-dir="e"] .ax-lip > :is(.pl-no, .pl-name, .pl-nl, .pl-gap, .pl-read) { display: inline-flex; }
.pl-no { font-weight: 700; }
.pl-name { font: 800 16px/1 var(--sans); letter-spacing: 0.02em; }
.pl-nl { font: 500 14px/1 var(--sans); letter-spacing: 0; text-transform: none; }
.ax-vp[data-dir="e"].stuck .pl-nl { color: var(--muted); }
.pl-gap { flex: 1; }
.pl-read, .pl-play { align-items: center; gap: 8px; height: 30px; padding: 0 4px; border: 0; background: none; color: inherit; cursor: pointer; font: 700 12px/1 var(--slab); letter-spacing: 0.12em; text-transform: uppercase; }
.pl-read svg, .pl-play svg { width: 14px; height: 14px; }
.ax-nav { align-items: center; gap: 20px; }
.ax-nav a { color: var(--muted); transition: color 0.2s ease; }
.ax-nav a:hover, .ax-nav a[aria-current="true"] { color: var(--ax-accent); }
.ax-vp[data-dir="e"].stuck .ax-lip { background: var(--bg); color: var(--ax-accent); box-shadow: 0 1px 0 var(--line); }
.ax-vp[data-dir="e"].stuck .ax-lip > .pl-read { display: none; }
.ax-vp[data-dir="e"].stuck .ax-lip > :is(.ax-nav, .pl-play) { display: inline-flex; }
.ax-vp[data-dir="e"] .ax-index { display: none; }
.ax-vp[data-dir="e"] .ax-sec { scroll-margin-top: 70px; }

/* ---------- F · Tide ---------- */
.ax-vp[data-dir="f"] { --dim: 0.8; --lip: 30px; }
.ax-vp[data-dir="f"]:not(.rm) .ax-stage { transform: scale(calc(1 - var(--p) * 0.05)); }
.ax-vp[data-dir="f"] .ax-lip { background: none; color: var(--ax-series); }
.ax-vp[data-dir="f"] .ax-lip .tide { display: block; position: absolute; left: 0; top: -47px; width: 100%; height: 100px; overflow: visible; pointer-events: none; }
.tide .tide-fill { fill: var(--bg); stroke: none; }
.tide .tide-line { fill: none; stroke: var(--ax-series); stroke-width: 1.6; }
.ax-vp[data-dir="f"] .ax-lip .lip-label { display: inline-flex; position: relative; align-items: center; gap: 8px; height: 26px; padding: 0 12px; border-radius: 999px; background: var(--bg); transition: color 0.2s ease; }
.lip-label svg { width: 20px; height: 20px; stroke: none; }
.ax-vp[data-dir="f"] .ax-lip:hover .lip-label { color: var(--fg); }

/* ---------- G · Lead figure ---------- */
.ax-vp[data-dir="g"] { --dim: 0; }
.ax-vp[data-dir="g"]:not(.rm) .ax-scene { z-index: 3; pointer-events: none; }
.ax-vp[data-dir="g"]:not(.rm) .ax-stage { transform-origin: 0 0; will-change: transform; pointer-events: auto; }
.ax-vp[data-dir="g"]:not(.rm).read .ax-stage { visibility: visible; }
.ax-vp[data-dir="g"]:not(.rm).read .ax-shade { pointer-events: auto; cursor: pointer; }
.ax-vp[data-dir="g"] .ax-lip { border-radius: 18px 18px 0 0; border-top: 1px solid var(--line); }
.ax-vp[data-dir="g"] .ax-lip .lip-handle { display: block; width: 44px; height: 4px; border-radius: 2px; background: var(--line); }
.ax-vp[data-dir="g"] .ax-lip:hover .lip-handle { background: var(--ax-accent); }
.ax-lead { display: none; margin: 0; grid-area: lead; align-self: start; }
.ax-lead div { aspect-ratio: var(--ax-aspect, 16 / 9); border-radius: 10px; background: var(--ax-stage); }
.ax-lead figcaption { display: flex; align-items: center; gap: 12px; margin-top: 10px; font-size: 13px; line-height: 1.45; color: var(--muted); }
.ax-lead button { height: 26px; padding: 0 10px; border: 1px solid var(--line); border-radius: 999px; background: none; color: var(--fg); cursor: pointer; font: 600 12px/1 var(--sans); }
.ax-lead button:hover { border-color: var(--ax-accent); color: var(--ax-accent); }
.ax-vp[data-dir="g"]:not(.rm) .ax-lead { display: block; }
.ax-vp[data-dir="g"]:not(.rm) .ax-title { grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); grid-template-areas: "names lead" "facts lead"; align-items: start; transform: none; }

/* ---------- H · Flash cut (Tom's pick) ---------- */
.ax-vp[data-dir="h"] { --dim: 0.62; --lip: 0px; }
.ax-vp[data-dir="h"] .ax-title { transform: none; }
.ax-vp[data-dir="h"] .ax-stage { border-radius: 18px; }
.ax-vp[data-dir="h"] .ax-lip {
  position: absolute; left: 50%; bottom: 100%; width: auto; height: 34px; padding: 0 16px; translate: -50% 0;
  gap: 8px; background: none; color: var(--fg); font-size: 11px;
  text-shadow: 0 0 2px oklch(0.1 0.012 275), 0 0 8px oklch(0.1 0.012 275);
  opacity: calc(0.78 - var(--p) * 5); transition: opacity 0.2s ease;
}
.ax-vp[data-dir="h"] .ax-lip:hover { opacity: 1; }
.ax-vp[data-dir="h"].read .ax-lip { visibility: hidden; }
.ax-vp[data-dir="h"] .ax-body { border-radius: 18px 18px 0 0; }
.ax-vp[data-dir="h"] .ax-lip .lip-word { display: inline; }
.ax-vp[data-dir="h"] .ax-lip .lip-chev { display: block; width: 14px; height: 14px; }
.ax-vp[data-dir="h"]:not(.rm) .ax-lip .lip-chev { animation: ax-lip-nod 2.4s ease-in-out 1.2s 3; }
@keyframes ax-lip-nod { 0%, 100% { transform: none; } 50% { transform: translateY(3px); } }

.ax-badge { display: none; width: clamp(68px, 8cqw, 108px); aspect-ratio: 1; margin: 0 0 22px; }
.ax-emblem { display: block; width: 100%; height: 100%; background: var(--ax-accent); -webkit-mask: var(--e, var(--ax-emblem)) center / contain no-repeat; mask: var(--e, var(--ax-emblem)) center / contain no-repeat; mask-mode: luminance; }
.ax-vp[data-dir="h"] .ax-badge { display: block; }
.ax-vp[data-dir="h"] :is(.ax-title h1, .ax-nl, .ax-tag span, .ax-sec h2) { width: fit-content; }

/* 30 fps Signal flash beats on arrival. */
.ax-vp[data-dir="h"].h-arm :is(.ax-title > *, .ax-index) { visibility: hidden; }
.ax-vp[data-dir="h"].h-play .ax-badge { animation: ax-h-badge 0.567s steps(1, end) backwards; }
.ax-vp[data-dir="h"].h-play .ax-emblem { animation: ax-h-emblem 0.567s steps(1, end); }
.ax-vp[data-dir="h"].h-play .ax-title h1 { animation: ax-h-name 0.567s steps(1, end) backwards; }
.ax-vp[data-dir="h"].h-play :is(.ax-nl, .ax-tag span) { animation: ax-h-hide var(--d) steps(1, end), ax-h-wipe 0.067s var(--d) steps(1, end); }
.ax-vp[data-dir="h"].h-play .ax-nl { --d: 0.7s; }
.ax-vp[data-dir="h"].h-play .ax-tag span:first-child { --d: 0.833s; }
.ax-vp[data-dir="h"].h-play .ax-tag span:last-child { --d: 0.967s; }
.ax-vp[data-dir="h"].h-play :is(.ax-facts > div > *, .ax-index) { animation: ax-h-hide var(--d) steps(1, end); }
.ax-vp[data-dir="h"].h-play .ax-facts > div:nth-child(1) > * { --d: 1.1s; }
.ax-vp[data-dir="h"].h-play .ax-facts > div:nth-child(2) > * { --d: 1.167s; }
.ax-vp[data-dir="h"].h-play .ax-facts > div:nth-child(3) > * { --d: 1.233s; }
.ax-vp[data-dir="h"].h-play .ax-facts > div:nth-child(4) > * { --d: 1.3s; }
.ax-vp[data-dir="h"].h-play .ax-index { --d: 1.4s; }
.ax-vp[data-dir="h"]:not(.rm) .ax-sec h2.cut { animation: ax-h-wipe 0.1s steps(1, end); }
@keyframes ax-h-badge {
  0% { opacity: 0; }
  17.6% { opacity: 1; background: #fff; transform: scale(1.7); }
  35.3%, 100% { opacity: 1; background: #fff; transform: none; }
}
@keyframes ax-h-emblem { 0%, 100% { background: var(--bg); } }
@keyframes ax-h-name {
  0% { opacity: 0; }
  35.3%, 100% { opacity: 1; color: var(--bg); background: #fff; box-shadow: 0 0 0 0.1em #fff; }
}
@keyframes ax-h-hide { 0%, 100% { opacity: 0; } }
@keyframes ax-h-wipe { 0%, 100% { color: var(--bg); background: #fff; box-shadow: 0 0 0 0.18em #fff; } }
.ax-vp[data-dir="h"] .ax-title h1 { font-weight: 800; letter-spacing: -0.035em; line-height: 0.98; }
.ax-vp[data-dir="h"] :is(.ax-nl, .ax-tag) { font-family: "B612", var(--sans); letter-spacing: 0.01em; }
.ax-vp[data-dir="h"] .ax-nl { font-size: clamp(18px, 2cqw, 24px); }
.ax-vp[data-dir="h"] .ax-tag { font-size: 16px; }

/* Flash cut title block layouts (?v=a..d). */
.ax-vp[data-dir="h"] .ax-title { display: block; }
.ax-vp[data-dir="h"] .ax-title .ax-facts { display: none; }
.ax-facts--credits, .ax-echo, .ax-ring { display: none; }
.ax-vp[data-dir="h"] .ax-facts--credits { display: grid; max-width: 420px; }

/* 1 · Window */
.ax-vp[data-dir="h"][data-v="a"] { --dim: 0.1; --win: clamp(190px, 28cqw, 380px); }
.ax-vp[data-dir="h"][data-v="a"]:not(.rm) .ax-body {
  -webkit-mask-image: var(--ax-emblem), linear-gradient(#000, #000);
  mask-image: var(--ax-emblem), linear-gradient(#000, #000);
  mask-mode: luminance, alpha;
  -webkit-mask-size: var(--win) var(--win), 100% 100%;
  mask-size: var(--win) var(--win), 100% 100%;
  -webkit-mask-position: var(--win-x, 20px) clamp(44px, 7cqw, 88px), 0 0;
  mask-position: var(--win-x, 20px) clamp(44px, 7cqw, 88px), 0 0;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-composite: xor;
  mask-composite: exclude;
}
.ax-vp[data-dir="h"][data-v="a"]:not(.rm).read .ax-stage { visibility: visible; }
.ax-vp[data-dir="h"][data-v="a"]:not(.rm) .ax-badge { visibility: hidden; width: var(--win); margin-bottom: 26px; }
.ax-vp[data-dir="h"][data-v="a"] .ax-title h1 { font-size: clamp(48px, 7.6cqw, 108px); }

/* 2 · Giant */
.ax-vp[data-dir="h"][data-v="b"] .ax-title > div { display: grid; grid-template-columns: auto minmax(0, 1fr); grid-template-areas: "badge ." "badge name" "badge nl" "badge tag"; grid-template-rows: 1fr auto auto auto; column-gap: clamp(20px, 3.6cqw, 48px); }
.ax-vp[data-dir="h"][data-v="b"] .ax-badge {
  grid-area: badge; width: clamp(200px, 36cqw, 480px); margin: -1cqw 0 0 calc(var(--ax-gutter) * -1 - 5cqw);
  translate: calc(var(--mx, 0) * 16px) calc(var(--my, 0) * 12px); rotate: calc(var(--mx, 0) * -3deg);
  transition: translate 0.6s var(--ax-out), rotate 0.6s var(--ax-out);
}
.ax-vp[data-dir="h"][data-v="b"] .ax-title h1 { grid-area: name; font-size: clamp(44px, 6.4cqw, 96px); }
.ax-vp[data-dir="h"][data-v="b"] .ax-nl { grid-area: nl; }
.ax-vp[data-dir="h"][data-v="b"] .ax-tag { grid-area: tag; padding-bottom: 2cqw; }

/* 3 · Echo */
.ax-vp[data-dir="h"][data-v="c"] { --echo: clamp(110px, 16cqw, 220px); }
.ax-vp[data-dir="h"][data-v="c"] .ax-title > div { display: grid; grid-template-columns: auto minmax(0, 1fr); grid-template-areas: "badge echo" "name name" "nl nl" "tag tag"; align-items: end; column-gap: clamp(10px, 1.5cqw, 20px); }
.ax-vp[data-dir="h"][data-v="c"] .ax-badge { grid-area: badge; width: var(--echo); margin: 0 0 24px; }
.ax-vp[data-dir="h"][data-v="c"] .ax-echo { grid-area: echo; display: flex; align-items: flex-end; gap: clamp(10px, 1.5cqw, 20px); margin: 0 0 24px; min-width: 0; }
.ax-echo i { flex: none; aspect-ratio: 1; }
.ax-echo i:nth-child(1) { width: calc(var(--echo) * 0.62); opacity: 0.8; --d: 0.63s; }
.ax-echo i:nth-child(2) { width: calc(var(--echo) * 0.38); opacity: 0.6; --d: 0.7s; }
.ax-echo i:nth-child(3) { width: calc(var(--echo) * 0.24); opacity: 0.44; --d: 0.767s; }
.ax-echo i:nth-child(4) { width: calc(var(--echo) * 0.15); opacity: 0.3; --d: 0.833s; }
.ax-vp[data-dir="h"][data-v="c"] .ax-title h1 { grid-area: name; font-size: clamp(48px, 8cqw, 114px); }
.ax-vp[data-dir="h"][data-v="c"] .ax-nl { grid-area: nl; }
.ax-vp[data-dir="h"][data-v="c"] .ax-tag { grid-area: tag; }
.ax-vp[data-dir="h"][data-v="c"].h-play .ax-echo .ax-emblem { animation: ax-h-hide var(--d) steps(1, end), ax-h-echo 0.067s var(--d) steps(1, end); }
.ax-vp[data-dir="h"][data-v="c"].h-play .ax-nl { --d: 0.967s; }
.ax-vp[data-dir="h"][data-v="c"].h-play .ax-tag span:first-child { --d: 1.1s; }
.ax-vp[data-dir="h"][data-v="c"].h-play .ax-tag span:last-child { --d: 1.233s; }
@keyframes ax-h-echo { 0%, 100% { background: #fff; } }

/* 4 · Orbit */
.ax-vp[data-dir="h"][data-v="d"] .ax-title { text-align: center; padding-top: clamp(36px, 6cqw, 84px); }
.ax-vp[data-dir="h"][data-v="d"] .ax-title > div > * { margin-left: auto; margin-right: auto; }
.ax-vp[data-dir="h"][data-v="d"] .ax-badge { position: relative; width: clamp(100px, 13cqw, 176px); margin-bottom: clamp(84px, 11cqw, 148px); }
.ax-vp[data-dir="h"][data-v="d"] .ax-ring { display: block; position: absolute; inset: -62%; width: 224%; height: 224%; overflow: visible; rotate: calc(var(--sy) * 0.06deg); }
.ax-ring text { font: 500 21px var(--slab); letter-spacing: 0.04em; text-transform: uppercase; fill: var(--fg); }
.ax-vp[data-dir="h"][data-v="d"] .ax-title h1 { font-size: clamp(48px, 8cqw, 112px); }
.ax-vp[data-dir="h"][data-v="d"] .ax-index { justify-content: center; }
.ax-vp.rm .ax-ring { rotate: none; }

/* Reduced motion: a plain scroll. */
.ax-vp.rm .ax-title { transform: none; }
.ax-vp.rm .ax-shade { opacity: 0; }
.ax-vp.rm.read .ax-stage { visibility: visible; }
.ax-vp.rm * { transition: none !important; }

/* Sheet view: the lab's test sheet, live frames that load only while in view. */
.ax-sheet { height: var(--ax-h); overflow-y: auto; padding: 4px 4px 24px 0; scrollbar-color: var(--line) var(--bg); }
.ax-sheet h2 { margin: 28px 0 6px; font-size: 20px; font-weight: 700; letter-spacing: -0.015em; }
.ax-sheet h2:first-child { margin-top: 4px; }
.ax-sheet h2 + p { margin: 0 0 16px; max-width: 70ch; font-size: 14px; line-height: 1.5; color: var(--muted); }
.ax-sh-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 420px), 1fr)); gap: 24px 20px; }
.ax-sh-card h3 { margin: 0; display: flex; align-items: baseline; gap: 10px; font-size: 16px; font-weight: 700; }
.ax-sh-card h3 em { font: 500 11px/1 var(--slab); font-style: normal; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); }
.ax-sh-card h3 em[data-k="pick"] { color: oklch(0.86 0.15 150); }
.ax-sh-card h3 em[data-k="no"] { color: oklch(0.74 0.16 28); }
.ax-sh-card p { margin: 6px 0 10px; min-height: 3em; font-size: 14px; line-height: 1.5; color: var(--muted); }
.ax-sh-frame { position: relative; aspect-ratio: 16 / 10; border-radius: 12px; overflow: hidden; background: var(--ax-surface, oklch(0.2 0.014 275)); }
/* The lab lays out at desktop size, then scales down to the card. */
.ax-sh-frame iframe { position: absolute; left: 0; top: 0; width: 1280px; height: 800px; border: 0; transform-origin: 0 0; transform: scale(var(--k, 0.35)); }
.ax-sh-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 10px; }
.ax-sh-bar :is(button, a) {
  height: 30px; padding: 0 12px; display: inline-flex; align-items: center; border: 1px solid var(--line); border-radius: 999px;
  background: none; color: var(--fg); cursor: pointer; text-decoration: none; font: 500 11px/1 var(--slab); letter-spacing: 0.12em; text-transform: uppercase;
}
.ax-sh-bar button[aria-pressed="true"] { background: var(--fg); color: var(--bg); border-color: var(--fg); }
.ax-sh-bar :is(button, a):hover { border-color: var(--fg); }
.ax-sh-bar span { flex: 1; }

/* Judge bar: matches Intro panel. */
.ax-judge { display: flex; flex-wrap: wrap; align-items: center; gap: 0 10px; padding-top: 4px; }
.ax-judge input { flex: 1 1 320px; min-width: 0; background: none; border: 0; border-bottom: 1px solid var(--line); color: var(--fg); font: 500 15px/1.4 var(--sans); padding: 6px 0; }
.ax-judge input:focus { outline: none; border-color: var(--focus); }
.ax-judge .w[data-aj="bad"][aria-pressed="true"]::before { background: var(--warn); }

@container ax (max-width: 899px) {
  .ax-title, .ax-vp[data-dir="g"]:not(.rm) .ax-title { grid-template-columns: minmax(0, 1fr); grid-template-areas: "lead" "names" "facts"; align-items: start; }
  .ax-sec { grid-template-columns: minmax(0, 1fr); }
  .ax-try { grid-template-columns: minmax(0, 1fr); }
  .ax-nav { display: none !important; }
  .ax-vp[data-dir="h"][data-v="b"] .ax-title > div { grid-template-columns: minmax(0, 1fr); grid-template-areas: "badge" "name" "nl" "tag"; }
  .ax-vp[data-dir="h"][data-v="b"] .ax-badge { width: 56cqw; margin-bottom: 20px; }
  .ax-vp[data-dir="h"][data-v="c"] .ax-echo i:nth-child(4) { display: none; }
}
`;

const DIRS = /** @type {[string, string][]} */ ([
  ['h', 'H · Flash cut ★'],
  ['a', 'A · Recede'],
  ['d', 'D · Drum'],
  ['e', 'E · Placard'],
  ['f', 'F · Tide'],
  ['g', 'G · Lead figure'],
]);

const LAYOUTS = /** @type {[string, string][]} */ ([
  ['a', '1 · Window'],
  ['b', '2 · Giant'],
  ['c', '3 · Echo'],
  ['d', '4 · Orbit'],
]);

const TIER_LIB = /** @type {Record<string, [string, string, string][]>} */ ({
  three: [['3D', 'three.js 0.170.0', 'MIT'], ['Colour', 'culori 4.0.1', 'MIT']],
  webgpu: [['Compute', 'three.js 0.186.1 WebGPU', 'MIT'], ['Colour', 'culori 4.0.1', 'MIT']],
  webgl2: [['Shaders', 'Raw WebGL2 (shared/gl.js)', 'In-repo'], ['Colour', 'culori 4.0.1', 'MIT']],
  canvas: [['Sketch', 'Canvas 2D / DOM', 'Native'], ['Colour', 'culori 4.0.1', 'MIT']],
});

/** @type {any} */
let desk = null;
/** @type {any} */
let item = null;
/** @type {Record<string, any>} */
let seriesMap = {};
/** @type {((id: string, icon: string, opts: any) => string) | null} */
let shotIconFn = null;
/** @type {any} */
let S = {};
/** @type {HTMLElement | null} */
let vp = null;
/** @type {HTMLElement | null} */
let frameEl = null;
/** @type {ResizeObserver | null} */
let ro = null;
/** @type {IntersectionObserver | null} */
let cutsIO = null;
/** @type {IntersectionObserver | null} */
let spyIO = null;
let loadTimer = 0;
let ticking = false;
let travel = 1;
let played = false;
let lastP = -1;
let gen = 0;
/** @type {'live' | 'sheet'} */
let view = 'live';
/** @type {HTMLElement | null} */
let wrapEl = null;
/** @type {ResizeObserver | null} */
let fitRO = null;
/** @type {IntersectionObserver | null} */
let sheetIO = null;

const keepS = () => desk.keep.set('annex', S);
const esc = (/** @type {any} */ s) => desk.esc(s);

function readJudge(/** @type {string} */ id) {
  return desk?.keep.get(`annex.${id}`, null) || null;
}

function writeJudge(/** @type {boolean | null} */ ok, /** @type {string | undefined} */ note = undefined) {
  const prev = readJudge(item.id) || {};
  const next = {
    ok: ok === null ? (prev.ok ?? true) : ok,
    note: note !== undefined ? note : (prev.note || ''),
    seenWith: { dir: S.dir, layout: S.dir === 'h' ? S.layout : null, stage: S.stage, rm: !!S.rm },
    date: new Date().toISOString().slice(0, 10),
  };
  desk.keep.set(`annex.${item.id}`, next);
  desk.refresh();
}

function ctlHTML() {
  const full = document.body.classList.contains('ax-full');
  const sl = '<span class="sl">/</span>';
  const lab = (/** @type {string} */ l) => `<span class="lab-i">${l}</span>`;
  const row = (/** @type {string} */ cls, /** @type {string} */ l, /** @type {string} */ html) => `<div class="ax-row ${cls}"><span class="lab">${l}</span><div class="bar">${html}</div></div>`;
  const stopBtn = (/** @type {string} */ y, /** @type {string} */ l) => `<button class="w" type="button" data-y="${y}">${l}</button>`;
  const dirRow = desk.words(DIRS, 'data-dir', (/** @type {string} */ v) => S.dir === v);
  const layRow = desk.words(LAYOUTS, 'data-lay', (/** @type {string} */ v) => S.dir === 'h' && S.layout === v)
    + sl + `<button class="w" type="button" data-aa="replay"${S.dir === 'h' && !S.rm ? '' : ' disabled'} title="Key R">Replay beats</button>`;
  const scrollRow = stopBtn('0', 'Toy') + sl + stopBtn('0.5', 'Mid') + sl + stopBtn('1', 'Zone')
    + sl + lab('Stage') + desk.words([['live', 'Live toy'], ['still', 'Still']], 'data-st', (/** @type {string} */ v) => S.stage === v)
    + sl + `<button class="w" type="button" data-aa="rm" aria-pressed="${!!S.rm}">Reduced motion</button>`
    + sl + `<button class="w" type="button" data-aa="full" aria-pressed="${full}">${full ? 'Leave full screen' : 'Full screen'}</button>`;
  const viewRow = desk.words([['live', 'Live'], ['sheet', 'Sheet']], 'data-view', (/** @type {string} */ v) => view === v);
  const widthRow = desk.words(WIDTHS, 'data-aw', (/** @type {string} */ v) => aw === v);
  return row('r-view', 'View', viewRow)
    + row('r-width', 'Width', widthRow)
    + row('r-dir', 'Transition', dirRow)
    + row('r-lay', 'Title', layRow)
    + row('r-scroll', 'Scroll', scrollRow);
}

function judgeHTML() {
  const j = readJudge(item.id);
  const ok = j ? j.ok : null;
  return `<div class="bar"><button class="w" type="button" data-aj="ok" aria-pressed="${ok === true}">Annex OK</button><span class="sl">/</span><button class="w" type="button" data-aj="bad" aria-pressed="${ok === false}">Needs work</button></div>`
    + `<input type="text" data-ajn placeholder="Notes on transition, seam, or title layout for ${esc(item.name)}" value="${esc(j?.note || '')}">`;
}

// Sheet view: one row per card. Lab query, name, verdict kind, verdict, what it is.
const SHEET_DIRS = /** @type {[string, string, string, string, string][]} */ ([
  ['d=h&v=b', 'H · Flash cut', 'pick', "Tom's pick", "The dark sheet rises over the dimmed toy. The title lands in the intro's beats. At rest: the full toy, and one About hint bottom centre."],
  ['d=a', 'A · Recede', '', 'Parked', 'The stage shrinks to 0.86 and dims; the zone rises as a sheet. The pick of round 1.'],
  ['d=d', 'D · Drum', '', 'Parked', 'The toy and the zone are two faces of one drum; the stage tips back.'],
  ['d=e', 'E · Placard', '', 'Parked', "A bar in the toy's accent rides up and docks as the header."],
  ['d=f', 'F · Tide', '', 'Parked', "The menu's Wave divider floods up over the toy in the series colour."],
  ['d=g', 'G · Lead figure', '', 'Parked', "The stage shrinks into the article's first picture and stays live."],
]);
const SHEET_LAYS = /** @type {[string, string, string, string, string][]} */ ([
  ['d=h&v=a', '1 · Window', 'no', 'Rejected: trite', 'The emblem is a hole in the sheet; the toy plays on behind it.'],
  ['d=h&v=b', '2 · Giant', 'no', 'Rejected: trite', 'The emblem runs off the left edge and leans to the pointer.'],
  ['d=h&v=c', '3 · Echo', 'no', 'Rejected: trite', 'The emblem repeats at falling sizes; the flash runs down the row.'],
  ['d=h&v=d', '4 · Orbit', 'no', 'Rejected: trite', 'Both names run in a ring round the emblem; the ring turns with the scroll.'],
]);
const SHEET_STOPS = /** @type {[string, number][]} */ ([['Toy', 0], ['Mid', 0.5], ['Zone', 1]]);

const sheetUrl = (/** @type {HTMLElement} */ f) => `${ROOT}annexlab/round2.html?${f.dataset.q}&y=${f.dataset.y}`;

function sheetCard(/** @type {[string, string, string, string, string]} */ [query, name, kind, verdict, text], /** @type {number} */ startAt) {
  const stops = SHEET_STOPS.map(([w, y]) => `<button type="button" data-sy="${y}" aria-pressed="${y === startAt}">${w}</button>`).join('');
  return `<article class="ax-sh-card"><h3>${esc(name)}<em data-k="${kind}">${esc(verdict)}</em></h3><p>${esc(text)}</p>`
    + `<div class="ax-sh-frame"><iframe title="${esc(name)}" data-q="${query}" data-y="${startAt}"></iframe></div>`
    + `<div class="ax-sh-bar">${stops}<span></span><button type="button" data-use="${query}">Use</button><a href="${ROOT}annexlab/round2.html?${query}" target="_blank" rel="noopener">Open</a></div></article>`;
}

function sheetHTML() {
  return `<h2>Transition</h2><p>How the visitor gets from the toy to the content zone. The frames are the lab on Glass; Use applies a pick to ${esc(item?.name || 'the toy')} in the Live view.</p>`
    + `<div class="ax-sh-grid">${SHEET_DIRS.map(r => sheetCard(r, 0.5)).join('')}</div>`
    + `<h2>Flash cut: title block layouts</h2><p>The block the flash lands on. Tom rejected the first set (Stack, Poster, Ledger, Centre, Side: gone from the lab) and this second set.</p>`
    + `<div class="ax-sh-grid">${SHEET_LAYS.map(r => sheetCard(r, 1)).join('')}</div>`;
}

/** Each sheet frame holds a live toy, so only the frames in view stay loaded. */
function watchSheet(/** @type {HTMLElement} */ sheet) {
  sheetIO?.disconnect();
  sheetIO = new IntersectionObserver(es => es.forEach(en => {
    const f = /** @type {HTMLIFrameElement} */ (en.target);
    if (en.isIntersecting && !f.dataset.on) { f.dataset.on = '1'; f.src = sheetUrl(f); }
    else if (!en.isIntersecting && f.dataset.on) { delete f.dataset.on; f.removeAttribute('src'); }
  }), { root: sheet, rootMargin: '10% 0px' });
  sheet.querySelectorAll('iframe').forEach(f => sheetIO?.observe(f));
  // Each frame's scale follows its card width.
  sheetRO?.disconnect();
  sheetRO = new ResizeObserver(es => es.forEach(en => /** @type {HTMLElement} */ (en.target).style.setProperty('--k', String(en.contentRect.width / 1280))));
  sheet.querySelectorAll('.ax-sh-frame').forEach(f => sheetRO?.observe(f));
}
/** @type {ResizeObserver | null} */
let sheetRO = null;

function setView(/** @type {'live' | 'sheet'} */ v) {
  view = v;
  if (wrapEl) wrapEl.dataset.view = v;
  if (v === 'sheet' && document.body.classList.contains('ax-full')) setFull(false);
  const ctl = document.querySelector('.ax-ctl');
  if (ctl) ctl.innerHTML = ctlHTML();
  fit();
  if (v === 'live') { measure(); lastP = -1; drive(); }
}

/** Frame height: the viewport less the controls and the judge bar, kept in --ax-chrome. */
function fit() {
  if (!wrapEl) return;
  const h = (/** @type {string} */ sel) => /** @type {HTMLElement | null} */ (wrapEl?.querySelector(sel))?.offsetHeight || 0;
  wrapEl.style.setProperty('--ax-chrome', `${h('.ax-ctl') + (view === 'live' ? h('.ax-judge') : 0) + 20}px`);
  // A device width wider than the panel zooms out to fit.
  const w = aw === 'fit' ? 0 : Number(aw);
  wrapEl.style.setProperty('--aw', w ? `${w}px` : '100%');
  wrapEl.style.setProperty('--z', String(w ? Math.min(1, wrapEl.clientWidth / w) : 1));
}

// Device widths for the frame; Fit fills the panel.
const WIDTHS = /** @type {[string, string][]} */ ([['fit', 'Fit'], ['1920', '1920'], ['1440', '1440'], ['1280', '1280'], ['768', '768'], ['375', '375']]);
const AW_KEY = 'stimming.annex.width';
let aw = localStorage.getItem(AW_KEY) || 'fit';

/** Pick three sibling toys: same series first, then nearby listed toys. */
function siblingsOf(/** @type {any} */ it) {
  const pool = desk.items.filter((/** @type {any} */ o) => o.id !== it.id && o.group !== 'unlisted' && o.emblem);
  const same = it.raw?.series ? pool.filter((/** @type {any} */ o) => o.raw?.series === it.raw.series) : [];
  const rest = pool.filter((/** @type {any} */ o) => !same.includes(o));
  return [...same, ...rest].slice(0, 3);
}

/** Build the ring text path for 4 · Orbit. */
function ringSVG(/** @type {any} */ it) {
  const chunk = `${it.name}${it.raw?.nl ? ` · ${it.raw.nl}` : ''} · `;
  let line = '';
  while (line.length < 56) line += chunk;
  const pid = `ax-ring-path-${it.id}`;
  return `<svg class="ax-ring" viewBox="0 0 400 400"><path id="${esc(pid)}" d="M200 200m-176 0a176 176 0 1 1 352 0a176 176 0 1 1-352 0" fill="none"/><text><textPath href="#${esc(pid)}" textLength="1100" lengthAdjust="spacing">${esc(line)}</textPath></text></svg>`;
}

function ideaHTML(/** @type {any} */ it) {
  if (it.id === 'glass') {
    return `<section class="ax-sec" id="ax-idea"><div><h2>Why glass breaks in stars</h2></div><div class="ax-matter"><div class="ax-prose">
      <p>A hit bends the pane away from the blow. The far side stretches, and glass is weak when it stretches. Cracks start there and run out from the hit like spokes.</p>
      <p>The spokes leave long wedges that still bend. Each wedge snaps across, and those breaks join into rings around the hit. A hammer and a brick draw the same star at different sizes. A bullet is so fast that it punches a small cone before the star starts.</p>
      </div><figure class="ax-fig ax-fig--draw"><svg viewBox="0 0 460 300" role="img" aria-label="A pane with cracks that run out from one hit, joined by two rings.">
      <rect x="1" y="1" width="458" height="298" rx="10" fill="none" stroke="var(--line)" stroke-width="2"/>
      <g fill="none" stroke="var(--fg)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M186 132L204 62 196 2M186 132L262 96 336 76 458 30M186 132L276 150 372 148 458 172M186 132L248 204 300 298M186 132L176 214 196 298M186 132L112 196 44 298M186 132L96 138 2 112M186 132L122 74 62 2"/></g>
      <g fill="none" stroke="var(--ax-accent)" stroke-width="1.6" stroke-linejoin="round"><path d="M199 84L232 110 236 142 214 166 182 172 152 160 140 135 156 104Z"/><path d="M204 40L300 86 322 150 268 232 180 258 86 218 58 136 100 54Z"/></g>
      <circle cx="186" cy="132" r="4.5" fill="var(--ax-accent)"/></svg><figcaption>The spokes come first. The rings join them after.</figcaption></figure></div></section>`;
  }
  const tag = it.raw?.tag ? `“${esc(it.raw.tag)}”` : 'Draft idea copy.';
  return `<section class="ax-sec" id="ax-idea"><div><h2>The idea</h2><p>Draft copy until ${esc(it.id)}/annex.json exists.</p></div><div class="ax-matter"><div class="ax-prose">
    <p>${esc(it.name)} ${it.raw?.nl ? `(${esc(it.raw.nl)}) ` : ''}uses the shared annex layout so every toy can be judged in the same scroll transition. ${tag}</p>
    <p>Scroll between the live stage and this reading column to check how the seam, backdrop dim, emblem scale, and contrast hold up against ${esc(it.name)}'s palette.</p>
    </div></div></section>`;
}

function annexBodyHTML(/** @type {any} */ it) {
  const t = it.raw || {};
  const ser = t.series ? seriesMap[t.series] : null;
  const serIcon = ser && shotIconFn ? shotIconFn(t.series, ser.icon, { tilt: 'Dutch', frame: 'Hex ring', line: 'Series', c: ser.color }) : '';
  const noText = t.number != null ? String(t.number) : (it.group === 'lab' ? 'Lab' : 'Unlisted');
  const noPrefix = t.number != null ? `No. ${t.number}` : (it.group === 'lab' ? 'Lab' : 'Draft');
  const buildHTML = t.legacy ? `Fresh · <a href="../${esc(it.id)}/legacy.html" target="_blank" rel="noopener">Classic</a>` : 'Fresh';
  const soundText = t.sound ? 'Best with sound (off until you ask)' : 'Off until you ask';
  const factsInner = `<div><dt>No.</dt><dd>${esc(noText)}</dd></div>`
    + `<div><dt>Series</dt><dd>${serIcon ? `<span class="fact-icon">${serIcon}</span>` : ''}<span>${esc(ser?.name || t.series || 'Unassigned')}</span></dd></div>`
    + `<div><dt>Build</dt><dd>${buildHTML}</dd></div>`
    + `<div><dt>Sound</dt><dd>${esc(soundText)}</dd></div>`;
  const embStyle = it.emblem ? `--e: url(${ROOT}${esc(it.emblem)})` : '';
  const tier = t.tech?.webgpu ? 'webgpu' : (t.tech?.tier || 'canvas');
  const libs = [...(TIER_LIB[tier] || TIER_LIB.canvas), ...(t.sound ? [['Sound', 'Tone.js 15.0.4, synthesized', 'MIT']] : []), ['Type', 'Gabarito, B612, Iosevka Term Slab', 'SIL OFL']];
  const flags = it.group === 'unlisted' ? '' : (REC[/** @type {keyof typeof REC} */ (it.id)] ? flagsHTML(it.id, t) : '');
  const tech = techHTML(it.id);
  const sibs = siblingsOf(it);
  const notesHTML = it.id === 'glass'
    ? `<li><time datetime="2026-11-09">9 Nov 2026</time><p>Glass moves to the corners bar. The first shot no longer stalls.</p></li>
       <li><time datetime="2026-11-09">9 Nov 2026</time><p>The frame fits between the corner rows at every size.</p></li>
       <li><time datetime="2026-11-04">4 Nov 2026</time><p>Settings gets a Quality choice. High renders at the full resolution of the screen.</p></li>
       <li hidden><time datetime="2026-11-04">4 Nov 2026</time><p>The stepper arrows hide on phones, so the bar keeps two rows.</p></li>
       <li hidden><time datetime="2026-11-03">3 Nov 2026</time><p>Glass moves to the shared library set, with a Tone.js shot and room.</p></li>`
    : `<li><time datetime="2026-11-27">Draft</time><p>Per-toy changelog entries come from ${esc(it.id)}/annex.json once the annex format ships.</p></li>`;
  const moreBtn = it.id === 'glass' ? '<button class="ax-more" type="button" data-aa="more">Show all 5 notes</button>' : '';

  return `<div class="ax-page">
    <div class="ax-scene">
      <div class="ax-stage">
        <img class="ax-still" src="${ROOT}shared/stills/${esc(it.id)}.jpg" alt="${esc(it.name)} still">
        <iframe class="ax-toy" title="${esc(it.name)}, the toy" hidden></iframe>
        <div class="ax-stage-empty" hidden>No still or live page for ${esc(it.name)}</div>
        <div class="ax-shade"></div>
      </div>
    </div>

    <main class="ax-annex" aria-labelledby="ax-name">
      <div class="ax-lip" role="button" tabindex="0" aria-label="Read about ${esc(it.name)}">
        <span class="lip-handle"></span>
        <span class="lip-word">About</span>
        <svg class="lip-chev" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 6l4.5 4.5L12.5 6"/></svg>
        <svg class="tide" aria-hidden="true"><path class="tide-fill"/><path class="tide-line"/></svg>
        <span class="lip-label">${serIcon ? `<span class="lip-icon">${serIcon}</span>` : ''}About ${esc(it.name)}</span>
        <span class="pl-no">${esc(noPrefix)}</span>
        <span class="pl-name">${esc(it.name)}</span>
        <span class="pl-nl">${esc(t.nl || '')}</span>
        <span class="pl-gap"></span>
        <nav class="ax-nav" aria-label="Parts">
          <a href="#ax-idea">Idea</a><a href="#ax-making">Making of</a><a href="#ax-notes">Notes</a><a href="#ax-credits">Credits</a>
        </nav>
        <button class="pl-read" type="button" data-aa="read">Read<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3.5 8.5L8 13l4.5-4.5"/></svg></button>
        <button class="pl-play" type="button" data-aa="top" hidden>Play<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 13V3M3.5 7.5L8 3l4.5 4.5"/></svg></button>
      </div>
      <div class="ax-veil"></div>

      <div class="ax-body">
        <div class="ax-col">
          <header class="ax-title">
            <div>
              <span class="ax-badge" aria-hidden="true"><span class="ax-emblem" style="${embStyle}"></span>${ringSVG(it)}</span>
              <span class="ax-echo" aria-hidden="true">${`<i><span class="ax-emblem" style="${embStyle}"></span></i>`.repeat(4)}</span>
              <h1 id="ax-name">${esc(it.name)}</h1>
              ${t.nl ? `<p class="ax-nl"><span style="font-weight: 600; color: var(--fg)">${esc(t.nl)}</span>${t.ipa ? ` <span>/${esc(t.ipa)}/</span>` : ''}</p>` : ''}
              ${t.tag || t.tagNl ? `<p class="ax-tag">${t.tag ? `<span style="color: var(--fg)">${esc(t.tag)}</span>` : ''}${t.tagNl ? `<span>${esc(t.tagNl)}</span>` : ''}</p>` : ''}
            </div>
            <dl class="ax-facts">${factsInner}</dl>
            <figure class="ax-lead">
              <div class="ax-lead-box"></div>
              <figcaption>The toy, live. <button type="button" data-aa="top">Play</button></figcaption>
            </figure>
          </header>

          <nav class="ax-index" aria-label="Parts">
            <a href="#ax-idea">The idea</a><a href="#ax-making">Making of</a><a href="#ax-notes">Notes</a><a href="#ax-credits">Credits</a>
          </nav>

          ${ideaHTML(it)}

          <section class="ax-sec" id="ax-making">
            <div><h2>Making of</h2><p>Stack, access notes, and stills.</p></div>
            <div class="ax-matter">
              ${flags || tech ? `<div class="ax-access-row">${flags || '<span>No access flags</span>'}${tech}</div>` : ''}
              <div class="ax-prose"><p>${esc(it.name)} runs on the ${esc(tier)} stack inside Stimming's shared shell. Stills and making-of notes slot here once authored.</p></div>
            </div>
            <figure class="ax-fig ax-fig--wide"><div class="ax-slot" style="aspect-ratio: 21 / 9"><span>Wide still · to shoot</span></div><figcaption>The wide block: one picture across both columns.</figcaption></figure>
            <div></div>
            <figure class="ax-fig ax-fig--pair"><div class="ax-slot" style="aspect-ratio: 4 / 3"><span>Still · to shoot</span></div><div class="ax-slot" style="aspect-ratio: 4 / 3"><span>Still · to shoot</span></div><figcaption>The pair block: two pictures in the reading column.</figcaption></figure>
          </section>

          <section class="ax-sec" id="ax-notes">
            <div><h2>Notes</h2><p>What changed, newest first.</p></div>
            <div><ol class="ax-log">${notesHTML}</ol>${moreBtn}</div>
          </section>

          <section class="ax-sec" id="ax-credits">
            <div><h2>Credits</h2><p>What ${esc(it.name)} stands on.</p></div>
            <div class="ax-matter">
              <table class="ax-table"><thead><tr><th scope="col">Part</th><th scope="col">Source</th><th scope="col">Licence</th></tr></thead>
                <tbody>${libs.map(([a, b, c]) => `<tr><td>${esc(a)}</td><td>${esc(b)}</td><td>${esc(c)}</td></tr>`).join('')}</tbody>
              </table>
              <dl class="ax-facts ax-facts--credits">${factsInner}</dl>
            </div>
          </section>

          <section class="ax-sec" id="ax-try">
            <div><h2>Also try</h2></div>
            <div class="ax-try">${sibs.map((/** @type {any} */ o) => `<button type="button" data-go-toy="${esc(o.id)}"><i style="--e: url(${ROOT}${esc(o.emblem)})"></i><span><b>${esc(o.name)}</b><span>${esc(o.raw?.nl || '')}</span></span></button>`).join('')}</div>
          </section>

          <footer class="ax-foot">
            <a href="../" target="_blank" rel="noopener">All toys</a>
            ${t.legacy ? `<a href="../${esc(it.id)}/legacy.html" target="_blank" rel="noopener">Classic build</a>` : ''}
            <span></span>
            <button class="ax-play" type="button" data-aa="top"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 13V3M3.5 7.5L8 3l4.5 4.5"/></svg>Back to ${esc(it.name)}</button>
          </footer>
        </div>
      </div>
    </main>
  </div>`;
}

function measure() {
  if (!vp) return;
  const vh = Math.max(240, vp.clientHeight);
  vp.style.setProperty('--vh', `${vh}px`);
  const lipPx = parseFloat(getComputedStyle(vp).getPropertyValue('--lip')) || 0;
  travel = Math.max(1, vh - lipPx);
  const wide = vp.clientWidth || 1;
  vp.style.setProperty('--ax-aspect', `${wide} / ${travel}`);
  vp.style.setProperty('--ax-ratio', (wide / travel).toFixed(4));
  const col = vp.querySelector('.ax-col'), body = vp.querySelector('.ax-body');
  if (col && body) {
    vp.style.setProperty('--win-x', `${(col.getBoundingClientRect().left - body.getBoundingClientRect().left).toFixed(1)}px`);
  }
}

function beats(/** @type {number} */ p) {
  if (!vp) return;
  if (S.dir !== 'h' || S.rm) { vp.classList.remove('h-arm', 'h-play'); played = false; return; }
  if (!played && p >= 0.55) { played = true; vp.classList.add('h-play'); }
  else if (played && p < 0.15) { played = false; vp.classList.remove('h-play'); }
  vp.classList.toggle('h-arm', !played);
}

function replayBeats() {
  if (!vp || S.dir !== 'h' || S.rm) return;
  if (vp.scrollTop / travel < 0.55) goStop(1);
  played = true;
  vp.classList.remove('h-arm', 'h-play');
  void vp.offsetWidth;
  vp.classList.add('h-play');
}

function dock(/** @type {number} */ p) {
  if (!vp) return;
  const stage = /** @type {HTMLElement | null} */ (vp.querySelector('.ax-stage'));
  const lead = /** @type {HTMLElement | null} */ (vp.querySelector('.ax-lead-box'));
  if (!stage || !lead) return;
  if (S.dir !== 'g' || S.rm) {
    stage.style.transform = stage.style.borderRadius = stage.style.visibility = '';
    return;
  }
  const vr = vp.getBoundingClientRect(), r = lead.getBoundingClientRect();
  const e = p * p * (3 - 2 * p);
  const s = 1 + (r.width / Math.max(1, stage.offsetWidth) - 1) * e;
  const rx = r.left - vr.left, ry = r.top - vr.top;
  stage.style.transform = `translate(${(rx * e).toFixed(1)}px, ${(ry * e).toFixed(1)}px) scale(${s.toFixed(4)})`;
  stage.style.borderRadius = `${(10 * e / Math.max(0.01, s)).toFixed(1)}px`;
  stage.style.visibility = r.bottom < vr.top ? 'hidden' : 'visible';
}

function drawTide(/** @type {number} */ p) {
  if (!vp) return;
  const tide = vp.querySelector('.tide'), tideFill = tide?.querySelector('.tide-fill'), tideLine = tide?.querySelector('.tide-line');
  if (!tide || !tideFill || !tideLine) return;
  const w = tide.clientWidth || vp.clientWidth, base = 62;
  const swell = S.rm ? 0 : 38 * Math.sin(Math.PI * p);
  const long = Math.max(420, w / 2.2), ph = vp.scrollTop * 0.012;
  const at = (/** @type {number} */ x) => base + swell * (Math.sin(x / long * 6.2832 + ph) + 0.4 * Math.sin(x / (long * 0.37) * 6.2832 - 1.7 * ph)) / 1.4;
  let d = `M0 ${at(0).toFixed(1)}`;
  for (let x = 0, up = true; x < w + 12; x += 12, up = !up) {
    d += `Q${x + 6} ${(at(x + 6) + (up ? -5 : 5)).toFixed(1)} ${x + 12} ${at(x + 12).toFixed(1)}`;
  }
  tideLine.setAttribute('d', d);
  tideFill.setAttribute('d', `${d}V100H0Z`);
}

function fadeCorners(/** @type {number} */ p) {
  const iframe = /** @type {HTMLIFrameElement | null} */ (vp?.querySelector('.ax-toy'));
  if (!iframe || iframe.hidden) return;
  let doc = null;
  try { doc = iframe.contentDocument; } catch { return; }
  const ui = /** @type {HTMLElement | null} */ (doc?.querySelector('.stim-ui'));
  if (ui) ui.style.opacity = S.rm ? '' : String(Math.max(0, 1 - p * 4));
}

function liftKeys(/** @type {HTMLIFrameElement} */ iframe) {
  try {
    const doc = iframe.contentDocument;
    if (!doc || !doc.head || doc.getElementById('ax-lift')) return;
    const css = doc.createElement('style');
    css.id = 'ax-lift';
    css.textContent = '.stim-ui > .s2-keys { translate: 0 -22px; }';
    doc.head.append(css);
  } catch {}
}

function drive() {
  ticking = false;
  if (!vp || !frameEl) return;
  const sy = vp.scrollTop;
  const p = Math.min(1, Math.max(0, sy / travel));
  vp.style.setProperty('--p', p.toFixed(4));
  vp.style.setProperty('--sy', sy.toFixed(1));
  const isRead = p >= 1;
  vp.classList.toggle('read', isRead);
  frameEl.classList.toggle('read', isRead);
  vp.classList.toggle('stuck', sy >= travel - 0.5);
  if (S.dir === 'f') drawTide(p);
  dock(p);
  beats(p);
  if (p !== lastP) { fadeCorners(p); lastP = p; }
}

function goStop(/** @type {number} */ y) {
  if (!vp) return;
  vp.scrollTo({ top: y * travel, behavior: S.rm ? 'auto' : 'smooth' });
}

function syncStage() {
  if (!vp || !item) return;
  clearTimeout(loadTimer);
  const iframe = /** @type {HTMLIFrameElement | null} */ (vp.querySelector('.ax-toy'));
  const still = /** @type {HTMLImageElement | null} */ (vp.querySelector('.ax-still'));
  const empty = /** @type {HTMLElement | null} */ (vp.querySelector('.ax-stage-empty'));
  if (!iframe || !still || !empty) return;
  const my = gen;
  still.hidden = false;
  empty.hidden = true;
  still.onerror = () => {
    still.hidden = true;
    if (S.stage !== 'live') empty.hidden = false;
  };
  if (S.stage === 'live') {
    const targetSrc = `${ROOT}${item.id}/`;
    if (iframe.dataset.loaded === targetSrc) {
      iframe.hidden = false;
      return;
    }
    iframe.hidden = true;
    iframe.removeAttribute('src');
    // Small debounce prevents rapid strip stepping from booting dozens of WebGL contexts.
    loadTimer = setTimeout(() => {
      if (my !== gen || !iframe.isConnected || S.stage !== 'live') return;
      iframe.dataset.loaded = targetSrc;
      iframe.hidden = false;
      iframe.src = targetSrc;
    }, 160);
  } else {
    iframe.hidden = true;
    delete iframe.dataset.loaded;
    iframe.removeAttribute('src');
  }
}

function applyMode() {
  if (!vp || !frameEl) return;
  vp.dataset.dir = S.dir;
  vp.dataset.v = S.dir === 'h' ? S.layout : 'a';
  vp.classList.toggle('rm', !!S.rm);
  frameEl.classList.toggle('no-back', S.dir === 'e');
  const lip = /** @type {HTMLElement | null} */ (vp.querySelector('.ax-lip'));
  if (lip) {
    const placard = S.dir === 'e';
    lip.setAttribute('role', placard ? 'group' : 'button');
    lip.tabIndex = placard ? -1 : 0;
    const playBtn = /** @type {HTMLElement | null} */ (lip.querySelector('.pl-play'));
    if (playBtn) playBtn.hidden = !placard;
  }
  const ctl = document.querySelector('.ax-ctl');
  if (ctl) ctl.innerHTML = ctlHTML();
  measure();
  lastP = -1;
  drive();
}

function setFull(/** @type {boolean} */ on) {
  document.body.classList.toggle('ax-full', on);
  const ctl = document.querySelector('.ax-ctl');
  if (ctl) ctl.innerHTML = ctlHTML();
  measure();
  drive();
}

export default {
  id: 'annex',
  label: 'Annex',
  async setup(/** @type {any} */ d) {
    desk = d;
    const st = document.createElement('style');
    st.textContent = STYLE;
    document.head.append(st);

    const osRm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    S = { dir: 'h', layout: 'a', stage: 'live', rm: osRm, ...desk.keep.get('annex', {}) };

    try {
      seriesMap = await fetch(`${ROOT}series.json`, { cache: 'no-cache' }).then(r => r.json());
    } catch { seriesMap = {}; }
    try {
      const mod = await import('../../shared/series/shots.js');
      shotIconFn = mod.shotIcon;
    } catch { shotIconFn = null; }

    const host = desk.$('panel');
    host.addEventListener('click', (/** @type {Event} */ e) => {
      const target = /** @type {HTMLElement} */ (e.target);
      if (!target.closest('.ax-wrap')) return;

      // In-flow section links scroll inside the annex viewport, never the desk window.
      const anchor = /** @type {HTMLAnchorElement | null} */ (target.closest('.ax-index a, .ax-nav a'));
      if (anchor && vp) {
        e.preventDefault();
        const id = anchor.getAttribute('href')?.slice(1);
        const sec = id ? vp.querySelector(`#${window.CSS.escape(id)}`) : null;
        if (sec) sec.scrollIntoView({ behavior: S.rm ? 'auto' : 'smooth', block: 'start' });
        return;
      }

      const goToy = /** @type {HTMLElement | null} */ (target.closest('[data-go-toy]'));
      if (goToy) { desk.go(goToy.dataset.goToy); return; }

      const b = /** @type {HTMLElement | null} */ (target.closest('button, .ax-lip, .ax-shade'));
      if (!b) return;

      if (b.classList.contains('ax-shade')) {
        if (S.dir === 'g' && vp?.classList.contains('read')) goStop(0);
        return;
      }
      if (b.classList.contains('ax-lip')) {
        if (target.closest('a, [data-aa="top"]')) return;
        if (S.dir !== 'e' || target.closest('[data-aa="read"]')) goStop(1);
        return;
      }

      const ds = b.dataset;
      if (ds.view) { setView(ds.view === 'sheet' ? 'sheet' : 'live'); return; }
      if (ds.aw) {
        aw = ds.aw;
        localStorage.setItem(AW_KEY, aw);
        b.closest('.bar')?.querySelectorAll('[data-aw]').forEach(o => o.setAttribute('aria-pressed', String(o === b)));
        fit(); measure(); lastP = -1; drive();
        return;
      }
      if (ds.sy !== undefined) {
        const frame = /** @type {HTMLIFrameElement | null} */ (b.closest('.ax-sh-card')?.querySelector('iframe'));
        if (!frame) return;
        frame.dataset.y = ds.sy;
        b.closest('.ax-sh-bar')?.querySelectorAll('button[data-sy]').forEach(o => o.setAttribute('aria-pressed', String(o === b)));
        if (frame.dataset.on) frame.src = sheetUrl(frame);
        return;
      }
      if (ds.use) {
        const q = new URLSearchParams(ds.use);
        S.dir = q.get('d') || 'h';
        if (S.dir === 'h') S.layout = q.get('v') || S.layout;
        keepS();
        setView('live');
        applyMode();
        goStop(0);
        if (S.dir === 'h') replayBeats();
        return;
      }
      if (ds.dir) { S.dir = ds.dir; keepS(); applyMode(); return; }
      if (ds.lay) { S.dir = 'h'; S.layout = ds.lay; keepS(); applyMode(); replayBeats(); return; }
      if (ds.st) { S.stage = ds.st; keepS(); syncStage(); applyMode(); return; }
      if (ds.y !== undefined) { goStop(parseFloat(ds.y)); return; }
      if (ds.aa === 'top') { goStop(0); return; }
      if (ds.aa === 'read') { goStop(1); return; }
      if (ds.aa === 'replay') { replayBeats(); return; }
      if (ds.aa === 'rm') { S.rm = !S.rm; keepS(); applyMode(); return; }
      if (ds.aa === 'full') { setFull(!document.body.classList.contains('ax-full')); return; }
      if (ds.aa === 'more') {
        vp?.querySelectorAll('.ax-log li[hidden]').forEach(li => { /** @type {HTMLElement} */ (li).hidden = false; });
        b.remove();
        return;
      }
      if (ds.aj) {
        writeJudge(ds.aj === 'ok');
        const j = document.querySelector('.ax-judge');
        if (j) j.innerHTML = judgeHTML();
      }
    });

    host.addEventListener('input', (/** @type {Event} */ e) => {
      const el = /** @type {HTMLInputElement} */ (e.target);
      if ('ajn' in el.dataset && el.closest('.ax-wrap')) writeJudge(null, el.value);
    });

    host.addEventListener('keydown', (/** @type {KeyboardEvent} */ e) => {
      const lip = /** @type {HTMLElement | null} */ (/** @type {HTMLElement} */ (e.target).closest('.ax-lip'));
      if (lip && e.target === lip && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        goStop(1);
      }
    });

    addEventListener('keydown', e => {
      if (!vp || !vp.isConnected) return;
      const t = /** @type {HTMLElement} */ (e.target);
      if (t.closest('input, textarea, select') || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'Escape' && document.body.classList.contains('ax-full')) { setFull(false); return; }
      if (e.key === 'r' || e.key === 'R') { replayBeats(); return; }
      const idx = Number(e.key) - 1;
      if (idx >= 0 && idx < LAYOUTS.length) {
        S.dir = 'h'; S.layout = LAYOUTS[idx][0]; keepS(); applyMode(); replayBeats();
      }
    });
  },

  mount(/** @type {HTMLElement} */ host, /** @type {any} */ it) {
    gen++;
    item = it;
    played = false;
    lastP = -1;

    host.innerHTML = `<div class="ax-wrap" data-view="${view}">`
      + `<div class="ax-ctl">${ctlHTML()}</div>`
      + `<div class="ax-frame"><div class="ax-vp">${annexBodyHTML(it)}</div>`
      + `<button class="ax-back" type="button" data-aa="top"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 13V3M3.5 7.5L8 3l4.5 4.5"/></svg>${esc(it.name)}</button></div>`
      + `<div class="ax-sheet">${sheetHTML()}</div>`
      + `<div class="ax-judge">${judgeHTML()}</div></div>`;

    wrapEl = /** @type {HTMLElement} */ (host.querySelector('.ax-wrap'));
    watchSheet(/** @type {HTMLElement} */ (host.querySelector('.ax-sheet')));
    fitRO?.disconnect();
    fitRO = new ResizeObserver(fit);
    fitRO.observe(/** @type {Element} */ (host.querySelector('.ax-ctl')));
    fitRO.observe(/** @type {Element} */ (host.querySelector('.ax-judge')));
    fit();

    frameEl = /** @type {HTMLElement} */ (host.querySelector('.ax-frame'));
    vp = /** @type {HTMLElement} */ (host.querySelector('.ax-vp'));

    // Per-toy colour and emblem custom properties.
    const t = it.raw || {};
    const accent = inkOf(it.accent || '');
    if (accent) vp.style.setProperty('--ax-accent', accent);
    const ser = t.series ? seriesMap[t.series] : null;
    if (ser?.color) vp.style.setProperty('--ax-series', ser.color);
    if (it.emblem) vp.style.setProperty('--ax-emblem', `url(${ROOT}${it.emblem})`);

    const iframe = /** @type {HTMLIFrameElement} */ (vp.querySelector('.ax-toy'));
    iframe.addEventListener('load', () => { liftKeys(iframe); lastP = -1; drive(); });

    vp.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(drive); }
    }, { passive: true });

    vp.addEventListener('pointermove', e => {
      if (!vp || S.dir !== 'h' || S.layout !== 'b' || S.rm) return;
      const r = vp.getBoundingClientRect();
      vp.style.setProperty('--mx', (((e.clientX - r.left) / Math.max(1, r.width)) * 2 - 1).toFixed(3));
      vp.style.setProperty('--my', (((e.clientY - r.top) / Math.max(1, r.height)) * 2 - 1).toFixed(3));
    }, { passive: true });

    // Headings flash on entry in H · Flash cut.
    cutsIO = new IntersectionObserver(es => es.forEach(en => en.target.classList.toggle('cut', en.isIntersecting)), {
      root: vp, rootMargin: '0px 0px -12% 0px',
    });
    vp.querySelectorAll('.ax-sec h2').forEach(h => cutsIO?.observe(h));

    // Placard nav highlights the current section.
    const navLinks = [...vp.querySelectorAll('.ax-nav a')];
    spyIO = new IntersectionObserver(es => es.forEach(en => {
      if (!en.isIntersecting) return;
      navLinks.forEach(a => a.setAttribute('aria-current', String(a.getAttribute('href') === `#${en.target.id}`)));
    }), { root: vp, rootMargin: '-20% 0px -70% 0px' });
    ['ax-idea', 'ax-making', 'ax-notes', 'ax-credits'].forEach(id => {
      const el = vp?.querySelector(`#${id}`);
      if (el) spyIO?.observe(el);
    });

    ro = new ResizeObserver(() => { measure(); drive(); });
    ro.observe(vp);

    applyMode();
    syncStage();
  },

  unmount() {
    gen++;
    clearTimeout(loadTimer);
    document.body.classList.remove('ax-full');
    const iframe = /** @type {HTMLIFrameElement | null} */ (vp?.querySelector('.ax-toy'));
    if (iframe) iframe.removeAttribute('src');
    ro?.disconnect(); ro = null;
    cutsIO?.disconnect(); cutsIO = null;
    spyIO?.disconnect(); spyIO = null;
    sheetIO?.disconnect(); sheetIO = null;
    fitRO?.disconnect(); fitRO = null;
    wrapEl = null;
    vp = null;
    frameEl = null;
  },

  status(/** @type {any} */ it) {
    const j = readJudge(it.id);
    if (!j) return '';
    return j.ok === false ? 'needs work' : 'OK';
  },

  yaml(/** @type {any} */ it) {
    const j = readJudge(it.id);
    if (!j) return null;
    return {
      verdict: j.ok === false ? 'needs work' : 'ok',
      note: j.note || null,
      seenWith: j.seenWith,
      date: j.date,
    };
  },
};
