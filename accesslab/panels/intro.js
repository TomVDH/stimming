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
body.is-full .is-bar { position: fixed; left: 0; right: 0; bottom: 8px; z-index: 210; justify-content: center; filter: drop-shadow(0 0 1px var(--ink)) drop-shadow(0 0 2px var(--ink)); }
.is-strip { position: absolute; left: 14px; top: 12px; z-index: 5; display: flex; flex-wrap: wrap; gap: 2px; font: 800 10px/1 var(--slab); letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); filter: drop-shadow(0 0 2px var(--ink)); }
.is-strip span { padding: 5px 7px; }
.is-strip span.on { background: #fff; color: var(--bg); }
/* Load simulation: the shell's five stages, read out in the stage's top-right corner. */
.is-load { position: absolute; right: 14px; top: 12px; z-index: 5; display: flex; gap: 2px; font: 800 10px/1 var(--slab); letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); filter: drop-shadow(0 0 2px var(--ink)); }
.is-load span { padding: 5px 7px; }
.is-load span.on { background: #fff; color: var(--bg); }
.is-load span.done { color: var(--fg); }
.is-load b { padding: 5px 7px; color: var(--fg); font-weight: 800; }
/* A trial for the load-states epic: the stage in words, under the flash box's load line. */
.intro-stage { position: absolute; left: 50%; top: calc(100% + 0.7em); translate: -50% 0; white-space: nowrap; font: 800 clamp(10px, 1.3cqw, 13px)/1 var(--slab); letter-spacing: 0.12em; text-transform: uppercase; color: #fff; opacity: 0.72; pointer-events: none; }
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
.acc-i.snd.flashin::before, .acc-i.snd.flashin::after { content: ""; position: absolute; inset: -0.25em -0.35em; background: #fff; animation: 0.3s both; animation-timing-function: steps(1, end); }
.acc-i.snd.flashin::before { animation-name: snd-left; }
.acc-i.snd.flashin::after { animation-name: snd-right; }
@keyframes snd-show { 0% { opacity: 0; } 11.1% { opacity: 1; } 100% { opacity: 0.62; } }
@keyframes snd-left { 0% { transform: scale(1.3, 1.6); clip-path: inset(0 50% 0 0); } 11.1%, 55.5% { transform: none; clip-path: inset(0 50% 0 0); } 66.6% { clip-path: inset(0 67% 0 0); } 77.7% { clip-path: inset(0 84% 0 0); } 88.8%, 100% { clip-path: inset(0 100% 0 0); } }
@keyframes snd-right { 0% { transform: scale(1.3, 1.6); clip-path: inset(0 0 0 50%); } 11.1%, 55.5% { transform: none; clip-path: inset(0 0 0 50%); } 66.6% { clip-path: inset(0 0 0 67%); } 77.7% { clip-path: inset(0 0 0 84%); } 88.8%, 100% { clip-path: inset(0 0 0 100%); } }
@media (prefers-reduced-motion: reduce) { .acc .acc-i.snd.flashin { animation: none; } .acc-i.snd.flashin::before, .acc-i.snd.flashin::after { display: none; } }
.acc-i.snd .g { color: var(--fg); }
.acc-flags { display: grid; justify-items: start; gap: 0.5em; }
/* Line: the flags share one line; sound keeps its own line below. */
.intro .acc--line { justify-items: center; }
.intro .acc--line .acc-flags { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.5em 1.5em; }
/* Tech tags: always the bottom-left corner of the intro. */
.intro-tech { position: absolute; left: clamp(14px, 2.4cqw, 28px); bottom: max(14px, 2.4cqh); z-index: 3; font-size: clamp(11px, 1.4cqw, 14px); }
.intro-tech .tag { height: 1.8em; padding: 0 0.5em; font-size: 0.85em; }
.intro .acc--rail { position: absolute; top: var(--origin); left: calc(50% + var(--logo-box) / 2 + clamp(12px, 2.6cqw, 30px)); transform: translateY(-50%); margin: 0;
  max-width: calc(50% - var(--logo-box) / 2 - clamp(20px, 3.6cqw, 40px)); padding-left: 1em; border-left: 1px solid oklch(1 0 0 / 0.3); font-size: clamp(10px, min(2.6cqw, 1.6cqh), 14px); }
.intro .acc--rail .acc-i { white-space: normal; }
/* Icon colour: the logo at rest and the access glyphs. The flash box stays as made. */
/* The lab's !important beats the engine's inline --ink, in the Calm intro too. */
.intro[data-ic="mono"] { --ink: #fff !important; --acc-ink: #fff !important; }
.intro[data-ic="flat"] { --ink: var(--ink-flat) !important; }
.intro[data-ic="og"] .intro-badge:not(.is-flash) .intro-emblem { background: transparent !important; }
.is-og { position: absolute; z-index: 3; overflow: hidden; pointer-events: none; }
.is-og[hidden] { display: none; }
.is-og iframe { position: absolute; left: 0; top: 0; width: 1280px; height: 800px; border: 0; transform-origin: 0 0; }
/* Alignment: Centre as shipped; Left keeps the block centred with its lines flush left; */
/* Bottom left sets the whole block in the corner, clear of the tech tags under it. */
.is-stage .intro:is([data-align="left"], [data-align="bl"]) .intro-text { justify-items: start; text-align: left; grid-template-columns: max-content max-content; justify-content: center; }
.is-stage .intro[data-align="bl"] .intro-text { justify-content: start; align-content: end; padding: 0 clamp(20px, 6cqw, 72px) calc(max(14px, 2.4cqh) + 3.2em); transform-origin: 0 100%; }
.is-stage .intro:is([data-align="left"], [data-align="bl"]) .intro-text > * { grid-column: 1 / -1; }
/* Rail stays beside the logo: the logo takes the first track, the row the second. */
/* The flash box pads the emblem; it hangs out by that pad, so the emblem lines up with the text. */
.is-stage .intro:is([data-align="left"], [data-align="bl"]) .intro-badge { grid-column: 1; grid-row: 1; margin-left: calc(-1 * var(--pad)); }
.is-stage .intro:is([data-align="left"], [data-align="bl"]) .acc--rail { position: static; grid-column: 2; grid-row: 1; transform: none; align-self: center; max-width: 40cqw; margin: 0 0 var(--g-l) clamp(12px, 2.6cqw, 30px); }
.is-stage .intro:is([data-align="left"], [data-align="bl"]) .acc--line { justify-items: start; }
.is-stage .intro:is([data-align="left"], [data-align="bl"]) .acc--line .acc-flags { justify-content: flex-start; }
/* Knobs: a Bar v3 Dev popover at the right; no glass, the intro stays in view. */
.is-knobs { position: fixed; right: 12px; top: 12px; bottom: 64px; z-index: 220; width: min(360px, calc(100% - 24px)); overflow: auto; padding: 8px 12px 12px;
  background: oklch(0.1 0.012 275 / 0.86); -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px); font: 800 11px/1 var(--slab); letter-spacing: 0.06em; text-transform: uppercase; }
.is-knobs[hidden] { display: none; }
.is-knobs .grp { display: block; width: 100%; height: 34px; padding: 0; border: 0; border-bottom: 1px solid var(--line); background: none; color: var(--fg); font: inherit; letter-spacing: 0.1em; text-align: left; cursor: pointer; }
.is-knobs .grp[aria-expanded="true"] { color: var(--bg); background: #fff; padding-left: 8px; }
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
const TIMING_KEYS = new Set(Object.keys(KNOBS.Timing));
const VARS = Object.keys(MADE.VARIETIES);
const vName = (/** @type {string} */ v) => (MADE.VARIETIES[v].label || v).split(':')[0];
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
const TT = () => ({ ...MADE.tableOf(S.variety), ...(S.tune[S.variety] || {}) });
const keepS = () => desk.keep.set('intro', S);
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
  const w = (/** @type {string} */ a, /** @type {string} */ l, /** @type {boolean} [on] */ on) => `<button class="w" type="button" data-a="${a}"${on === undefined ? '' : ` aria-pressed="${on}"`}>${l}</button>`;
  const sl = '<span class="sl">/</span>';
  return w('vprev', '‹') + `<button class="w" type="button" data-a="replay" title="Effect">${vName(S.variety)}${S.variety === 'strobe' ? glyph('flash') : ''}</button>` + w('vnext', '›')
    + sl + [['stack', 'List'], ['line', 'Line'], ['rail', 'Rail']].map(([v, l]) => `<button class="w" type="button" data-l="${v}" aria-pressed="${S.layout === v}">${l}</button>`).join('')
    + sl + [['centre', 'Centre'], ['bl', 'Bottom left'], ['left', 'Left']].map(([v, l]) => `<button class="w" type="button" data-al="${v}" aria-pressed="${(S.align || 'centre') === v}" title="Alignment">${l}</button>`).join('')
    + sl + [['og', 'OG'], ['mono', 'Mono'], ['gradient', 'Gradient'], ['flat', 'Flat']].map(([v, l]) => `<button class="w" type="button" data-ic="${v}" aria-pressed="${(S.ic || 'gradient') === v}" title="Icon colour">${l}</button>`).join('')
    + sl + [[0, 'Load now'], [3000, '3 s'], [8000, '8 s'], [20000, '20 s']].map(([ms, l]) => `<button class="w" type="button" data-slow="${ms}" aria-pressed="${(S.slow || 0) === ms}" title="Simulated load">${l}</button>`).join('') + w('words', 'Stage words', !!S.stageWords)
    + sl + w('gate', 'Gate', !S.noGate) + w('calm', 'Calm', !!S.calm) + w('hold', 'Hold', !!S.hold)
    + sl + w('knobs', 'Knobs', !$('.is-knobs')?.hidden) + w('full', document.body.classList.contains('is-full') ? 'Leave full screen' : 'Full screen') + w('replay', 'Replay');
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
  if (ok !== null) desk.keep.set(`intro.${item.id}`, { variety: S.variety, layout: S.layout, align: S.align || 'centre', iconColour: S.ic || 'gradient', calm: !!S.calm, tuned: S.tune[S.variety] || {}, date: r.date });
  desk.refresh();
}
function judgeHTML() {
  const a = readRec()?.areas?.intro, seen = desk.keep.get(`intro.${item.id}`, null);
  const ok = seen ? a?.ok !== false : null;
  return `<div class="bar"><button class="w" type="button" data-j="ok" aria-pressed="${ok === true}">Intro OK</button><span class="sl">/</span><button class="w" type="button" data-j="bad" aria-pressed="${ok === false}">Needs work</button></div>`
    + `<input type="text" data-jn placeholder="What to change in this intro" value="${String(a?.notes || '').replace(/"/g, '&quot;')}">`;
}

function knobsHTML() {
  const t = TT(), own = S.tune[S.variety] || {};
  const opt = (/** @type {string} */ k, /** @type {string} */ l) => `<button class="w" type="button" data-o="${k}" aria-pressed="${!!S[k]}">${l}</button>`;
  return `<div class="bar">${opt('static', 'Static')}${opt('nameFlash', 'Name flash')}${opt('textFlash', 'Text flash')}${opt('classic', 'Classic')}</div>`
    + `<div class="bar"><button class="w" type="button" data-o="reset">Reset ${vName(S.variety)}</button></div>`
    + Object.entries(KNOBS).map(([g, list]) => `<button class="grp" type="button" data-g="${g}" aria-expanded="${S.group === g}">${g}</button>`
      + (S.group === g ? `<div class="rows">${Object.entries(list).map(([k, [lo, hi, st, u]]) =>
        `<label for="k-${k}" class="${k in own ? 'tuned' : ''}" title="Double-click resets">${KLABEL[k] || k}</label><input type="range" id="k-${k}" data-k="${k}" min="${lo}" max="${hi}" step="${st}" value="${t[k] ?? lo}"><output>${kfmt(t[k] ?? lo, u)}</output>`).join('')}</div>` : '')).join('');
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
const PHASES = ['gate', ...MADE.PHASES, 'toy'];
// The shell's load stages and where each starts on the load line (shared/stim.js STAGE_AT).
const STAGES = /** @type {[string, number, string][]} */ ([['shell', 0, 'Shell'], ['libs', 0.05, 'Libraries'], ['build', 0.3, 'Building'], ['first-frame', 0.95, 'First frame']]);
const STEPS = 8;
// Which stage a share of the load is in, with the build's step.
function stageAt(/** @type {number} */ u) {
  let i = 0;
  while (i + 1 < STAGES.length && u >= STAGES[i + 1][1]) i++;
  const [name, from, word] = STAGES[i];
  const step = name === 'build' ? Math.min(STEPS, Math.floor(((u - from) / (STAGES[i + 1][1] - from)) * STEPS) + 1) : 0;
  return { i, name, word: step ? `${word} ${step} / ${STEPS}` : word };
}
// The corner readout: each stage, the one now in white, then the share.
function loadInfo(/** @type {number | null} */ u) {
  const el = /** @type {HTMLElement | null} */ (document.querySelector('.is-load'));
  if (!el) return;
  if (u === null) { el.innerHTML = ''; return; }
  const st = stageAt(u);
  el.innerHTML = STAGES.map(([n, , w], k) => `<span class="${k === st.i ? 'on' : k < st.i ? 'done' : ''}">${k === st.i ? st.word : w}</span>`).join('') + `<b>${Math.round(u * 100)}%</b>`;
}
// The stage words sit under the flash box; the engine's load line is at its foot.
function stageWords(/** @type {HTMLElement} */ root, /** @type {number | null} */ u) {
  let w = /** @type {HTMLElement | null} */ (root.querySelector('.intro-stage'));
  if (!S.stageWords || u === null || u >= 1) { w?.remove(); return; }
  const badge = root.querySelector('.intro-badge') || root.querySelector('.intro-wait');
  if (!badge) return;
  if (!w) { w = document.createElement('span'); w.className = 'intro-stage'; badge.append(w); }
  w.textContent = stageAt(u).word;
}
const strip = (/** @type {string} */ now) => { const el = $('.is-strip'); if (el) el.innerHTML = PHASES.map(p => `<span class="${p === now ? 'on' : ''}">${p}</span>`).join(''); };
// Puts the row where the layout wants it, then refits the copy.
const place = (/** @type {HTMLElement} */ root, /** @type {HTMLElement} */ row) => {
  row.className = `intro-snd acc acc--${S.layout}`;
  const text = /** @type {HTMLElement} */ (root.querySelector('.intro-text')), foot = text.querySelector('.intro-foot');
  if (S.layout === 'rail') text.append(row); else if (foot) foot.before(row); else text.append(row);
  MADE.fitIntro(root, TT());
};

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
  st.textContent = `html, body { background: transparent !important; overflow: hidden !important; }
    body * { visibility: hidden !important; }
    ${sel}, ${sel} * { visibility: visible !important; }
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
  $('.is-bar').innerHTML = barHTML();
  stage.querySelector('.intro')?.remove();
  loadInfo(null);
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
  root.dataset.ic = S.ic || 'gradient';
  root.dataset.align = S.align || 'centre';
  // OG: the full-colour menu icon sits in the emblem; it shows at rest only.
  const emblem = t.emblem ? '<span class="intro-emblem"></span>' : '';
  // The Calm intro has no audio beat, so the row is in the markup.
  const calmRow = calm ? `<span class="intro-snd acc acc--${S.layout}">${rowHTML(it)}</span>` : '';
  root.innerHTML = `<div class="intro-mark"><div class="intro-text">${emblem}<span class="intro-name"></span>${t.sub ? '<span class="intro-sub"></span>' : ''}${calmRow}</div></div>`
    + `<div class="intro-tech">${techHTML(it.id)}</div>`;
  stage.append(root);
  cutOg(it.id);
  strip(calm ? 'lines' : 'glass');
  const gate = (/** @type {string} */ ph) => {
    if (my !== gen) return new Promise(() => {});
    strip(ph);
    if (ph === 'glass') { const row = /** @type {HTMLElement | null} */ (root.querySelector('.intro-snd')); if (row) { row.innerHTML = rowHTML(it); place(root, row); row.classList.add('snd-wait'); flashWhenOpen(root, row, my); } }
    // The hold beat is the fallback, for a reveal that never reports open.
    if (ph === 'hold') flashSound(root, my);
    // A refit during the pop measures the blown-up box; this undoes it.
    if (ph === 'flash' || ph === 'lines') MADE.fitIntro(root, TT());
    // The emblem has landed once the lines open; the live tile can take its place.
    if (ph === 'lines' || ph === 'hold') requestAnimationFrame(placeOg);
    if (ph === 'wipe') { const og = /** @type {HTMLElement | null} */ (document.querySelector('.is-og')); if (og) og.hidden = true; }
    if (ph === 'hold' && (S.hold || S.static)) return new Promise(() => {});
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
    const t0 = performance.now();
    ready = new Promise(res => {
      const tick = () => {
        if (my !== gen) return;
        const u = Math.min(1, (performance.now() - t0) / S.slow);
        (calm ? CALM : MADE).progress(u);
        loadInfo(u);
        stageWords(root, u);
        if (u >= 1) { res(undefined); setTimeout(() => { if (my === gen) loadInfo(null); }, 900); } else setTimeout(tick, 100);
      };
      tick();
    });
  }
  await (calm ? CALM : MADE).intro({ id: it.id, gate, soundNote: { glyph: false, words: ' ', nudge: false }, timing: { ...(S.tune[S.variety] || {}) }, ready, variety: S.variety, fill,
    nameFlash: !!S.nameFlash, textFlash: !!S.textFlash, classic: !!S.classic, min: calm && (S.hold || S.static) ? 1e9 : undefined });
  if (my === gen) { strip('toy'); placeOg(); }
}
const liveFit = () => { const root = /** @type {HTMLElement | null} */ (document.querySelector('.is-stage .intro')); if (root) MADE.fitIntro(root, TT()); placeOg(); };
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
    S = { variety: MADE.DEFAULT_VARIETY, layout: 'stack', group: 'Layout', tune: {}, ...d.keep.get('intro', {}) };
    S.tune ||= {};
    if (!MADE.VARIETIES[S.variety]) S.variety = MADE.DEFAULT_VARIETY;
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
      if (b.closest('.is-knobs')) {
        if (ds.g) S.group = ds.g;
        else if (ds.slow) { S.slow = +ds.slow; run(); }
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
        $('.is-bar').innerHTML = barHTML();
        placeOg();
        return;
      }
      if (ds.al) S.align = ds.al;
      if (ds.l) S.layout = ds.l;
      const vi = VARS.indexOf(S.variety);
      if (ds.a === 'vprev') S.variety = VARS[(vi + VARS.length - 1) % VARS.length];
      if (ds.a === 'vnext') S.variety = VARS[(vi + 1) % VARS.length];
      if (ds.a === 'gate') S.noGate = !S.noGate;
      if (ds.a === 'words') S.stageWords = !S.stageWords;
      if (ds.slow !== undefined && !b.closest('.is-knobs')) S.slow = +ds.slow;
      if (ds.a === 'calm') S.calm = !S.calm;
      if (ds.a === 'hold') S.hold = !S.hold;
      if (ds.a === 'knobs') { const k = $('.is-knobs'); k.hidden = !k.hidden; k.innerHTML = knobsHTML(); }
      keepS();
      if (!$('.is-knobs').hidden) $('.is-knobs').innerHTML = knobsHTML();
      if (ds.a === 'full') return setFull(!document.body.classList.contains('is-full'));
      if (ds.a === 'knobs') { $('.is-bar').innerHTML = barHTML(); return; }
      run();
    });
    host.addEventListener('input', (/** @type {Event} */ e) => {
      const el = /** @type {HTMLInputElement} */ (e.target);
      if ('jn' in el.dataset) return judge(null, el.value);
      const k = el.dataset?.k;
      if (!k || !el.closest('.is-knobs')) return;
      const own = S.tune[S.variety] ||= {}, v = +el.value;
      if (v === MADE.tableOf(S.variety)[k]) delete own[k]; else own[k] = v;
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
    });
  },
  mount(/** @type {HTMLElement} */ host, /** @type {any} */ it) {
    item = it;
    try { S.always = localStorage.getItem('stimming.accesslab.calm') === '1'; } catch { S.always = false; }
    host.innerHTML = '<div class="is-wrap">'
      + `<div class="is-stage"><img alt=""><div class="is-strip"></div><div class="is-load" aria-live="polite"></div><div class="is-og" hidden><iframe title="Menu tile" scrolling="no" src="${ROOT}index.html?lab"></iframe></div>`
      + `<div class="is-gate">${glyph('flash')}<div class="t">Fast flashing light</div><div class="bar"><button class="w" type="button" data-go="calm">Play calm</button><span class="sl">/</span><button class="w" type="button" data-go="made">Play as made</button></div>`
      + `<label><input type="checkbox" data-always${S.always ? ' checked' : ''}> Always calm</label></div></div>`
      + '<div class="bar is-bar"></div>'
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
    return { verdict: a?.ok === false ? 'needs work' : 'ok', note: a?.notes || null, seenWith: { effect: seen.variety, layout: seen.layout, align: seen.align, iconColour: seen.iconColour, calm: seen.calm, tuned: seen.tuned }, date: seen.date };
  },
};
