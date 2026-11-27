// @ts-check
// Feedback panel: all of inventorylab, inside the desk. Format: docs/inventory/schema.md.
// The code is inventorylab's own; the desk's strip is its list, and the desk's head its title.
// Drafts share inventorylab's keys (stimming.inventory.<id>), so either page continues the other.

/** @type {any} */
let desk = null;

const STYLE = `
.inv { --panel: oklch(0.19 0.008 275); --dim: oklch(0.44 0.012 275); --flag: oklch(0.72 0.19 25); --draft: oklch(0.8 0.12 85); --good: oklch(0.76 0.12 155); --mono: var(--slab);
  display: flex; flex-direction: column; gap: 0; font: 14px/1.4 var(--sans); }
.inv :is(button, input, select, textarea) { font: inherit; color: inherit; }
/* Buttons speak Bar v3: slab caps, no box; a pick is the white flash box. */
.inv button { appearance: none; border: 0; background: none; height: 30px; padding: 0 9px; font: 800 11px/1 var(--slab); letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); cursor: pointer; }
.inv button:hover { color: var(--fg); }
.inv button[aria-pressed="true"] { color: var(--bg); background: #fff; }
.inv :focus-visible { outline: none; box-shadow: inset 0 -3px 0 var(--focus); }
.inv .label { font: 800 10px/1 var(--slab); letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); }
.inv .mono { font: 500 11px/1.4 var(--slab); }
.inv > header { display: flex; flex-wrap: wrap; gap: 8px 14px; align-items: center; padding: 0 0 8px; }
.inv > header h1 { font: 800 11px/1 var(--slab); letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); margin: 0 auto 0 0; }
.inv > header h1 small { margin-left: 8px; color: var(--dim); }
.inv > header a { font: 800 11px/1 var(--slab); letter-spacing: 0.06em; text-transform: uppercase; color: var(--fg); text-decoration: none; }
.inv #frame { flex: none; height: clamp(420px, 64vh, 760px); border: 0; width: 100%; background: #000; border-radius: 18px; }
.inv .stack { display: flex; flex-wrap: wrap; gap: 4px 14px; padding: 10px 0; border-bottom: 1px solid var(--line); color: var(--muted); }
.inv .stack b { color: var(--dim); font-weight: 500; margin-right: 5px; }
.inv .stack span { color: var(--fg); }
.inv .stack i { font-style: normal; }
[data-info] { cursor: help; }
[data-info]:hover { color: var(--fg); text-decoration: underline dotted var(--dim); text-underline-offset: 3px; }
#tip { position: fixed; z-index: 500; max-width: 320px; padding: 6px 9px; background: oklch(0.19 0.008 275); border: 1px solid var(--muted); color: var(--fg); font: 12px/1.4 var(--sans); pointer-events: none; }
#tip[hidden] { display: none; }
.inv .logos { display: flex; flex-wrap: wrap; gap: 14px; align-items: flex-start; padding: 12px 0; border-bottom: 1px solid var(--line); }
.inv .logos figure { margin: 0; display: grid; gap: 5px; justify-items: start; }
.inv .logos figcaption { font: 800 10px/1.2 var(--slab); letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); }
.inv .tile { width: 128px; height: 128px; position: relative; overflow: hidden; background: oklch(0.12 0.006 275); border-radius: 14px; display: grid; place-items: center; }
.inv .tile.small { width: 60px; height: 60px; border-radius: 0; }
.inv .tile i { display: block; width: 70%; aspect-ratio: 1; background: #fff; mask: var(--emblem) center / contain no-repeat; mask-mode: luminance; -webkit-mask: var(--emblem) center / contain no-repeat; }
.inv .tile.flash { background: #fff; }
.inv .tile.flash i { background: oklch(0.12 0.006 275); }
.inv .tile .none { color: var(--dim); font: 500 10px/1.3 var(--slab); text-align: center; padding: 8px; }
/* The menu loads wide once, off screen, then shrinks to one tile. */
.inv #menuFrame { border: 0; background: transparent; position: fixed; left: -4000px; top: 0; width: 1280px; height: 900px; visibility: hidden; }
.inv #menuFrame.on { position: absolute; inset: 0; left: 0; width: 128px; height: 128px; visibility: visible; }
.inv .accent { display: grid; grid-template-columns: 28px auto; gap: 8px; align-items: stretch; }
.inv .accent .bar { width: 28px; height: 128px; margin: 0; }
.inv .accent .chips { display: grid; gap: 6px; align-content: start; }
.inv .accent .chip { width: 96px; height: 20px; }
.inv .accent code { font: 500 10px/1.3 var(--slab); color: var(--muted); max-width: 260px; word-break: break-all; }
.inv #overview { padding: 4px 0 24px; display: grid; gap: 18px; }
.inv #overview .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 18px 28px; align-items: start; }
.inv #overview section { display: grid; gap: 0; }
.inv #overview details { border: 0; border-top: 1px solid var(--line); }
.inv #overview details > summary { padding: 5px 0; display: grid; grid-template-columns: 1fr 40px 90px; gap: 8px; }
.inv #overview details > summary::before { display: none; }
.inv #overview details > summary .n { text-align: right; color: var(--fg); }
.inv #overview details > summary .split { color: var(--dim); }
.inv #overview .toys { display: flex; flex-wrap: wrap; gap: 3px; padding: 2px 0 8px; }
.inv #overview .toys button { height: 26px; text-transform: none; font: 500 12px/1 var(--sans); letter-spacing: 0; border: 1px solid var(--line); }
.inv #overview .toys button.lab { border-style: dashed; }
.inv.ov > :is(#frame, .stack, .logos, form), .inv.ov #builds, .inv.ov #open { display: none; }
.inv:not(.ov) #overview { display: none; }
.inv form { padding: 14px 0 0; display: grid; gap: 18px; }
.inv section { display: grid; gap: 8px; }
.inv .quick { display: flex; flex-wrap: wrap; gap: 10px 22px; align-items: end; }
.inv .quick .grp { display: grid; gap: 4px; }
.inv .quick .wide { flex: 1 1 260px; }
.inv .cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(380px, 1fr)); gap: 18px 28px; align-items: start; }
.inv .side { display: grid; gap: 10px; }
.inv .seg { display: flex; flex-wrap: wrap; gap: 2px; }
.inv :is(input[type="text"], textarea, select) { width: 100%; background: none; border: 0; border-bottom: 1px solid var(--line); padding: 5px 2px; color: var(--fg); }
.inv :is(input[type="text"], textarea, select):focus { outline: none; border-color: var(--focus); }
.inv select option { background: var(--bg); }
.inv textarea { resize: vertical; min-height: 28px; }
.inv .field { display: grid; grid-template-columns: 76px 1fr; gap: 6px; align-items: center; }
.inv .field > span { color: var(--muted); font: 800 10px/1 var(--slab); letter-spacing: 0.1em; text-transform: uppercase; }
/* A meta field that differs from toys.json shows a left rule. */
.inv .field input[data-changed="true"] { box-shadow: inset 2px 0 var(--draft); padding-left: 8px; }
.inv .area { display: grid; grid-template-columns: 96px 1fr auto; gap: 4px 6px; align-items: start; padding: 6px 0; border-top: 1px solid var(--line); }
.inv .area > .flag { justify-self: start; }
.inv .area > .flag[data-ok="false"] { color: var(--flag); }
.inv .area > .add { display: flex; gap: 2px; }
.inv .area > .items { grid-column: 2 / -1; display: grid; gap: 3px; }
.inv .area > .items:empty { display: none; }
.inv .item { display: grid; grid-template-columns: 70px 84px 1fr 30px; gap: 4px; }
.inv .item .tag { align-self: center; color: var(--muted); }
.inv .item.bug .tag { color: var(--flag); }
.inv details { border-top: 1px solid var(--line); }
.inv details > summary { cursor: pointer; padding: 8px 0; list-style: none; display: flex; gap: 10px; align-items: baseline; }
.inv details > summary::-webkit-details-marker { display: none; }
.inv details > summary::before { content: "+"; color: var(--dim); width: 10px; }
.inv details[open] > summary::before { content: "–"; }
.inv details > summary .sum { color: var(--muted); font: 500 11px/1.3 var(--slab); }
.inv details > .body { display: grid; gap: 6px; padding: 4px 0 10px; }
.inv .actions { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; position: sticky; bottom: 0; z-index: 2; background: var(--bg); padding: 8px 0; border-top: 1px solid var(--line); }
.inv .actions button { color: var(--fg); }
.inv .status, .inv .keys { font: 500 10px/1.3 var(--slab); color: var(--muted); }
.inv .keys { margin-left: auto; color: var(--dim); }
`;

const MARKUP = `<div class="inv" id="inv">
  <header>
    <h1 id="invTitle">Toy</h1>
    <div class="seg" role="group" aria-label="Build" id="builds">
      <button type="button" data-b="fresh" aria-pressed="true">Fresh</button>
      <button type="button" data-b="classic">Classic</button>
    </div>
    <a id="open" target="_blank" rel="noopener">Open tab ↗</a>
    <button type="button" id="ovBtn">Overview</button>
  </header>
  <div id="overview" aria-live="polite"></div>
  <iframe id="frame" title="Toy" allow="autoplay; fullscreen; gyroscope; accelerometer"></iframe>
  <div class="stack mono" id="stack" aria-label="Detected stack"></div>
  <div class="logos" aria-label="Logos">
    <figure><div class="tile" id="iconTile"><iframe id="menuFrame" title="Menu icon" tabindex="-1"></iframe><span class="none" id="iconNone">Loading the menu…</span></div><figcaption>Menu icon</figcaption></figure>
    <figure><div class="tile" id="embTile"></div><figcaption>Intro emblem</figcaption></figure>
    <figure><div class="tile small flash" id="flashTile"></div><figcaption>Flash</figcaption></figure>
    <figure class="accent"><div class="bar" id="accBar"></div>
      <div class="chips"><figcaption>Accent</figcaption><div class="chip" id="accChip"></div><code id="accVal"></code>
        <figcaption>Series</figcaption><div class="chip" id="serChip"></div><code id="serVal"></code></div></figure>
  </div>
  <form id="form" autocomplete="off">
    <section class="quick" aria-label="Verdict and triage">
      <div class="grp"><span class="label">Verdict</span><div class="seg" id="verdict"></div></div>
      <div class="grp"><span class="label">Priority</span><div class="seg" id="priority"></div></div>
      <div class="grp"><span class="label">Effort</span><div class="seg" id="effort"></div></div>
      <div class="grp"><span class="label">Risk</span><div class="seg" id="risk"></div></div>
      <div class="grp"><span class="label">GPU</span><div class="seg" id="heavy"></div></div>
      <div class="grp wide"><span class="label">Summary</span><input type="text" id="summary" placeholder="One line on the toy"></div>
    </section>
    <div class="cols">
      <section aria-label="Notes by area">
        <span class="label">Notes by area · click a name to flag it</span>
        <div id="areas"></div>
      </section>
      <div class="side">
        <details id="metaBox" data-key="meta"><summary><span class="label">Meta</span><span class="sum" id="metaSum"></span></summary><div class="body" id="meta"></div></details>
        <details id="modBox" data-key="mod"><summary><span class="label">Modularize</span><span class="sum" id="modSum"></span></summary><div class="body" id="modular"></div></details>
        <label class="field"><span>Tags</span><input type="text" id="tags" placeholder="phone, perf, needs-asset"></label>
      </div>
    </div>
    <div class="actions">
      <button type="button" id="save">Save file</button>
      <button type="button" id="exportAll">Export all</button>
      <button type="button" id="clear">Clear</button>
      <span class="status" id="status"></span>
      <span class="status" id="count"></span>
      <span class="keys">Alt+J next · Alt+K previous</span>
    </div>
  </form>
</div>`;
// Inventory workbench: one schema-2 record per toy. Format: docs/inventory/schema.md.
const SCHEMA = 2;
const KEY = 'stimming.inventory.';
const AREAS = ['icon', 'intro', 'bar', 'controls', 'graphics', 'sound', 'perf'];
const FINDING_AREAS = ['meta', ...AREAS];
const META = [['name', 'Name'], ['nl', 'Dutch'], ['ipa', 'IPA'], ['tag', 'Motto'], ['tagNl', 'Motto NL'], ['accent', 'Accent']];
const VERDICTS = ['keep', 'polish', 'rework', 'cut'];
const KINDS = ['bug', 'gaffe'];
const SEVERITIES = ['blocker', 'major', 'minor', 'polish'];
const SIZES = ['S', 'M', 'L'];
const MOVES = ['none', 'to-main', 'to-lab'];
const PRIORITIES = ['now', 'next', 'later', 'never'];
const EFFORTS = ['S', 'M', 'L', 'XL'];
const RISKS = ['low', 'mid', 'high'];
const SHARED = ['stim', 'intro', 'gl', 'environment', 'fire', 'daytime', 'detail', 'sky', 'water', 'wetglass',
  'precip', 'weather', 'flare', 'glow', 'grade', 'output', 'bokeh', 'air', 'glassrain', 'rocket', 'signal'];

const $ = (/** @type {string} */ id) => /** @type {HTMLElement} */ (document.getElementById(id));

// Fetch failures give null, never a thrown error.
const load = (/** @type {string} */ url, /** @type {'json'|'text'} */ as) =>
  fetch(url, { cache: 'no-store' }).then(r => (r.ok ? r[as]() : null)).catch(() => null);

let toys = /** @type {any} */ ({});
let series = /** @type {any} */ ({});
let done = new Set();

// Main shelf first by number, then the Lab in file order.
let ids = /** @type {string[]} */ ([]);

/** @type {Record<string, 'saved'|'draft'|undefined>} */
const state = {};
/** @type {Record<string, any>} */
const saved = {};
/** @type {Record<string, Promise<any>>} */
const stacks = {};
let current = '';
/** @type {any} */
let dirHandle = null;
/** @type {any} */
let rec;

const store = {
  get(/** @type {string} */ id) { try { return JSON.parse(localStorage.getItem(KEY + id) || 'null'); } catch { return null; } },
  set(/** @type {string} */ id, /** @type {any} */ v) { try { localStorage.setItem(KEY + id, JSON.stringify(v)); } catch {} },
  drop(/** @type {string} */ id) { try { localStorage.removeItem(KEY + id); } catch {} },
};


// ---- What each item does: the hover box text. ----
/** @type {Record<string, string>} */
const INFO = {
  // Libraries
  'three': 'three.js: the 3D engine. Scenes, cameras, meshes, materials and lights, drawn with WebGL.',
  'three/webgpu': 'three.js WebGPU build: the same engine on the newer WebGPU API, with a WebGL2 fallback.',
  'three/tsl': 'Three Shading Language: three.js shaders written as JavaScript node graphs, for the WebGPU build.',
  'culori': 'culori: colour maths. Converts and mixes colours in OKLCH and OKLab.',
  'gsap': 'GSAP: a tween and timeline library for animating values and DOM.',
  'simplex-noise': 'simplex-noise: smooth random noise in 2D, 3D and 4D, for organic motion and shapes.',
  'tone': 'Tone.js: synths, effects and scheduling on top of Web Audio.',
  'js-yaml': 'js-yaml: reads and writes YAML text.',
  // three.js addons
  'AfterImageNode': 'Addon (WebGPU): a fading trail of earlier frames over the picture.',
  'BloomNode': 'Addon (WebGPU): bloom, a soft glow round bright parts of the picture.',
  'BokehPass': 'Addon: depth of field. Things off the focus distance blur.',
  'BokehShader2': 'Addon: a fuller depth-of-field shader with shaped bokeh discs.',
  'Line2': 'Addon: a thick line object (with LineGeometry and LineMaterial).',
  'BufferGeometryUtils': 'Addon: tools to merge geometries, weld vertices and build tangents.',
  'CopyShader': 'Addon: a plain copy pass, used inside post-processing chains.',
  'DragControls': 'Addon: drag 3D objects with the pointer.',
  'EffectComposer': 'Addon: runs a chain of post-processing passes after the 3D render.',
  'FXAAShader': 'Addon: fast approximate anti-aliasing on the final picture.',
  'GLTFLoader': 'Addon: loads glTF / GLB 3D model files.',
  'GTAOPass': 'Addon: ground-truth ambient occlusion, soft contact shadows in corners.',
  'GaussianBlurNode': 'Addon (WebGPU): a Gaussian blur of a texture.',
  'ImprovedNoise': 'Addon: Ken Perlin\'s improved noise in JavaScript.',
  'LineGeometry': 'Addon: geometry for thick lines (pairs with LineMaterial).',
  'LineMaterial': 'Addon: a material that draws lines wider than one pixel.',
  'MeshSurfaceSampler': 'Addon: picks random points on a mesh surface, for scattering.',
  'OrbitControls': 'Addon: orbit, pan and zoom a camera with the pointer.',
  'OutputPass': 'Addon: the last post pass. Tone mapping and sRGB conversion.',
  'Pass': 'Addon: the base class and full-screen quad for custom post passes.',
  'RectAreaLightUniformsLib': 'Addon: the lookup tables that rectangular area lights need.',
  'Reflector': 'Addon: a flat mirror that renders the scene reflected.',
  'RenderPass': 'Addon: the first post pass. Renders the scene into the chain.',
  'RoomEnvironment': 'Addon: a built-in studio room, used as an environment map for reflections.',
  'RoundedBoxGeometry': 'Addon: a box with rounded edges.',
  'ShaderPass': 'Addon: a post pass that runs one custom fragment shader.',
  'UnrealBloomPass': 'Addon: bloom, a multi-scale glow round bright parts of the picture.',
  'WebGPU': 'Addon: checks whether the browser supports WebGPU.',
  'curlNoise': 'Addon (TSL): curl noise, a swirling flow field with no sinks.',
  // Renderers
  'WebGL2': 'Raw WebGL2: the toy draws with its own shaders on the GPU, often through shared/gl.js.',
  'three WebGL': 'three.js with its WebGL renderer.',
  'three WebGPU': 'three.js with its WebGPU renderer.',
  'Canvas 2D': 'The browser\'s 2D canvas: paths, fills and images, drawn on the CPU. Often only for small textures.',
  'DOM': 'Plain page elements and CSS; no canvas renderer found.',
  'DOM/SVG': 'Page elements and inline SVG; no canvas renderer found.',
  // Shared modules
  'stim': 'shared/stim.js: the shell. Page setup, the bar, settings, sound kit, quality, idle.',
  'intro': 'shared/intro.js: the intro. Emblem in a flash box, the name, hold until ready.',
  'gl': 'shared/gl.js: raw WebGL2 plumbing. Programs, render targets, the full-screen triangle.',
  'environment': 'shared/environment.js: the environment runner. Every shader bundle in one frame.',
  'fire': 'shared/fire.js: fire and smoke, a 3D fluid on the GPU drawn as a lit volume (WebGPU).',
  'daytime': 'shared/daytime.js: time of day. One hour drives sun, moon, light, stars and lamps.',
  'detail': 'shared/detail.js: the detail driver. One quality level for shaders and canvas.',
  'sky': 'shared/sky.js: the sky bundle. Sky by direction, stars, height haze.',
  'water': 'shared/water.js: a water surface that never aliases.',
  'wetglass': 'shared/wetglass.js: the wet window pane in one piece.',
  'precip': 'shared/precip.js: rain and snow in the air, on the frame.',
  'weather': 'shared/weather.js: one weather value drives the bundled shaders together.',
  'flare': 'shared/flare.js: lens flare.',
  'glow': 'shared/glow.js: glow orbs round lights, and a bloom chain for raw WebGL2.',
  'grade': 'shared/grade.js: the grade. Tint, vignette and film grain on linear colour.',
  'output': 'shared/output.js: the last step of a frame. Tone curve, sRGB and dither.',
  'bokeh': 'shared/bokeh.js: disc bokeh.',
  'air': 'shared/air.js: the air as single scatter, at any height.',
  'glassrain': 'shared/glassrain.js: rain on a window pane, and pane fog.',
  'rocket': 'shared/rocket.js: one rocket model in three sizes, and its flame.',
  'signal': 'shared/signal.js: Bar v3, the Signal bar.',
  'favicon': 'shared/favicon.js: the tab icon.',
  // Bar, sound, TypeScript
  'Signal bar': 'The toy gives the shell a bar spec; the shell builds the shared Signal bar.',
  'Signal bar, no controls': 'The toy uses the shell (intro, settings) but gives it no controls.',
  'own bar': 'The toy builds its own controls and does not use the shell.',
  'Web Audio': 'Sound through the browser\'s Web Audio, mostly via the shell\'s audio kit.',
  'Tone.js': 'Sound through Tone.js.',
  'none': 'No sound code found.',
  'yes': 'TypeScript: source in <id>/src/, bundled by esbuild to dist/main.js.',
  'no': 'Plain JavaScript in the page.',
  '0.170.0': 'three.js 0.170.0: the pinned version for the WebGL build.',
  '0.186.1': 'three.js 0.186.1: the pinned version for the WebGPU build.',
};
const infoOf = (/** @type {string} */ k) => INFO[k] || INFO[k.replace(/^three\/addons:/, '')] || '';

// One hover box serves every item that carries data-info.
const tip = Object.assign(document.createElement('div'), { id: 'tip', role: 'tooltip' });
document.body.append(tip);
addEventListener('pointerover', e => {
  const el = /** @type {HTMLElement} */ (e.target).closest?.('[data-info]');
  if (!(el instanceof HTMLElement) || !el.dataset.info) { tip.hidden = true; return; }
  tip.textContent = el.dataset.info;
  tip.hidden = false;
  const r = el.getBoundingClientRect();
  tip.style.left = `${Math.min(r.left, innerWidth - tip.offsetWidth - 8)}px`;
  tip.style.top = `${r.bottom + 6 + tip.offsetHeight > innerHeight ? r.top - tip.offsetHeight - 6 : r.bottom + 6}px`;
});

// ---- Stack detection: reads the page and its local modules. ----

// A specifier holds no spaces, brackets or template marks.
const IMPORT = /\b(?:from\s*|import\s*\(\s*|import\s+)['"]([\w@./:+-]+)['"]/g;
const SRC = /<script[^>]*\ssrc=["']([^"']+)["']/g;

async function scan(/** @type {string} */ id, /** @type {string} */ build) {
  const base = new URL(`../${id}/`, location.href);
  const entry = new URL(build === 'classic' ? 'legacy.html' : 'index.html', base).href;
  const queue = [entry], seen = new Set(queue), libs = new Set(), shared = new Set(), files = [];
  let text = '', three = '', ts = false;
  while (queue.length && files.length < 16) {
    const url = /** @type {string} */ (queue.shift());
    const body = await load(url, 'text');
    if (!body) continue;
    files.push(url.slice(base.href.length));
    text += body;
    // A TypeScript toy's page loads its esbuild bundle from dist/.
    if (url === entry) ts = /dist\/main\.js/.test(body);
    three ||= (body.match(/"three":\s*"[^"]*three@([\d.]+)/) || [])[1] || '';
    // A script src is always a path; an import without ./ is a bare name.
    const specs = [...[...body.matchAll(IMPORT)].map(m => m[1]),
      ...[...body.matchAll(SRC)].map(m => (/^(https?:)?\/\/|^[./]/.test(m[1]) ? m[1] : `./${m[1]}`))];
    for (const s of specs) {
      if (/^(https?:)?\/\//.test(s)) { libs.add(s.replace(/^.*npm\/([^@/]+).*$/, '$1')); continue; }
      if (!/^[./]/.test(s)) { libs.add(s.replace(/^(three\/addons)\/.*\/([\w-]+)\.js$/, '$1:$2')); continue; }
      const u = new URL(s, url).href;
      const m = u.match(/\/shared\/(?:menu\/)?([\w-]+)\.js$/);
      if (m) { shared.add(m[1]); continue; }
      if (u.startsWith(base.href) && /\.m?js$/.test(u) && !seen.has(u)) { seen.add(u); queue.push(u); }
    }
  }
  const has = (/** @type {RegExp} */ re) => re.test(text);
  const renderer = [
    has(/WebGPURenderer|three\/webgpu/) && 'three WebGPU',
    has(/WebGLRenderer/) && 'three WebGL',
    (shared.has('gl') || shared.has('environment') || has(/getContext\(\s*['"]webgl2/)) && 'WebGL2',
    has(/getContext\(\s*['"]2d/) && 'Canvas 2D',
  ].filter(Boolean);
  // Inline SVG counts only when no canvas renderer is found.
  if (!renderer.length) renderer.push(has(/<svg[\s>]/) ? 'DOM/SVG' : 'DOM');
  return {
    libraries: [...libs].sort(),
    three: [...libs].some(l => String(l).startsWith('three')) ? three || '?' : null,
    shared: [...shared].sort(),
    renderer,
    bar: !shared.has('stim') ? 'own bar' : has(/\bbar\s*:/) ? 'Signal bar' : 'Signal bar, no controls',
    sound: has(/from\s*['"]tone['"]/) ? 'Tone.js' : has(/audioKit|AudioContext/) ? 'Web Audio' : 'none',
    typescript: ts,
    files,
  };
}

const stackOf = (/** @type {string} */ id, /** @type {string} */ build) => (stacks[`${id}:${build}`] ??= scan(id, build));

function renderStack(/** @type {any} */ s) {
  const part = (/** @type {string} */ k, /** @type {string[]} */ items, info = true) => {
    const div = document.createElement('div');
    const span = document.createElement('span');
    items.forEach((v, i) => {
      const it = Object.assign(document.createElement('i'), { textContent: v });
      const text = info ? infoOf(v) : '';
      if (text) it.dataset.info = text;
      span.append(...(i ? [', '] : []), it);
    });
    if (!items.length) span.textContent = '–';
    div.append(Object.assign(document.createElement('b'), { textContent: k }), span);
    return div;
  };
  $('stack').replaceChildren(
    part('render', s.renderer),
    part('libs', s.libraries.map((/** @type {string} */ l) => l.replace(/^three\/addons:/, ''))),
    part('three', s.three ? [s.three] : []),
    part('shared', s.shared),
    part('bar', [s.bar]),
    part('sound', [s.sound]),
    part('ts', [s.typescript ? 'yes' : 'no']),
    part('files', s.files, false));
}

// ---- Records. ----

function snapshot(/** @type {string} */ id) {
  const t = toys[id];
  return { name: t.name, nl: t.nl, ipa: t.ipa, tag: t.tag, tagNl: t.tagNl, accent: t.accent, emblem: t.emblem, shelf: t.number == null ? 'lab' : 'main',
    number: t.number, series: t.series, stage: t.stage, version: t.version, sound: t.sound, legacy: t.legacy, done: done.has(id) };
}

function blank(/** @type {string} */ id) {
  const t = toys[id];
  return {
    schema: SCHEMA, id, date: '', build: 'fresh', snapshot: snapshot(id), stack: null,
    verdict: '', summary: '',
    meta: { name: t.name, nl: t.nl, ipa: t.ipa, tag: t.tag, tagNl: t.tagNl, accent: t.accent, series: t.series ?? '', notes: '' },
    areas: Object.fromEntries(AREAS.map(a => [a, { ok: true, notes: '' }])),
    triage: { priority: '', effort: '', risk: '', heavy: false, tags: '' },
    modular: { toTypeScript: false, bar: 'none', dropLegacy: false, adopt: [], extract: '', notes: '' },
    findings: [], expansions: [], shelfMove: 'none',
  };
}

// Fills fields a record from an older shape lacks.
function upgrade(/** @type {any} */ r, /** @type {string} */ id) {
  const b = blank(id);
  const out = { ...b, ...r, schema: SCHEMA };
  for (const k of ['meta', 'triage', 'modular']) out[k] = { ...b[k], ...(r[k] || {}) };
  out.areas = Object.fromEntries(AREAS.map(a => [a, { ...b.areas[a], ...(r.areas?.[a] || {}) }]));
  return out;
}

// A local draft wins over the saved file when it is newer.
function recordFor(/** @type {string} */ id) {
  const local = store.get(id), file = saved[id];
  const r = local && (!file || (local.edited || 0) > (file.edited || 0)) ? local : file ? structuredClone(file) : blank(id);
  return upgrade(r, id);
}

const strip = (/** @type {any} */ r) => JSON.stringify({ ...r, edited: 0, date: '', stack: null, snapshot: null });
const isSame = (/** @type {string} */ id) => !!saved[id] && !!store.get(id) && strip(upgrade(store.get(id), id)) === strip(upgrade(saved[id], id));

// The local server lists the folder, so only existing files are fetched.
async function probeSaved() {
  const listing = (await load('../docs/inventory/', 'text')) || '';
  const found = [...listing.matchAll(/href="([\w-]+)\.json"/g)].map(m => m[1]).filter(id => toys[id]);
  await Promise.all(found.map(async id => { const r = await load(`../docs/inventory/${id}.json`, 'json'); if (r) saved[id] = r; }));
  for (const id of ids) state[id] = store.get(id) && !isSame(id) ? 'draft' : saved[id] ? 'saved' : undefined;
  renderList();
}

// ---- List. ----

// The desk's strip is the list; a refresh redraws its dots and the tab word.
function renderList() { desk?.refresh(); }

function select(/** @type {string} */ id) {
  if (id === 'overview') return overview();
  $('inv')?.classList.remove('ov');
  current = id;
  rec = recordFor(id);
  rec.snapshot = snapshot(id);
  const t = toys[id];
  $('invTitle').replaceChildren(t.name, Object.assign(document.createElement('small'), { textContent: t.version ? `${id} · v${t.version}` : id }));
  $('builds').hidden = !t.legacy;
  if (!t.legacy) rec.build = 'fresh';
  showFrame();
  renderForm();
  showIcon();
  renderList();
}

function showFrame() {
  const url = `../${current}/${rec.build === 'classic' ? 'legacy.html' : ''}`;
  /** @type {HTMLIFrameElement} */ ($('frame')).src = url;
  /** @type {HTMLAnchorElement} */ ($('open')).href = url;
  for (const b of $('builds').querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.b === rec.build));
  $('stack').textContent = 'Reading the page…';
  const id = current, build = rec.build;
  stackOf(id, build).then(s => { if (id === current && build === rec.build) { rec.stack = s; renderStack(s); } });
}

// ---- Form parts. ----

function seg(/** @type {string[]} */ words, /** @type {string} */ value, /** @type {(w: string) => void} */ pick, toggle = true) {
  const host = document.createElement('div');
  host.className = 'seg';
  host.append(...words.map(w => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = w;
    b.setAttribute('aria-pressed', String(w === value));
    b.onclick = () => { pick(toggle && w === value ? '' : w); renderForm(); touch(); };
    return b;
  }));
  return host;
}

function pickList(/** @type {string[]} */ words, /** @type {string} */ value, /** @type {(v: string) => void} */ set) {
  const s = document.createElement('select');
  s.append(...words.map(w => new Option(w || '–', w, false, w === value)));
  s.onchange = () => { set(s.value); touch(); };
  return s;
}

function text(/** @type {string} */ value, /** @type {string} */ hint, /** @type {(v: string) => void} */ set, line = false) {
  const t = document.createElement(line ? 'input' : 'textarea');
  if (t instanceof HTMLInputElement) t.type = 'text'; else t.rows = 1;
  t.value = value;
  t.placeholder = hint;
  t.oninput = () => { set(t.value); touch(); };
  return t;
}

function field(/** @type {string} */ label, /** @type {Node} */ control) {
  const row = document.createElement('label');
  row.className = 'field';
  row.append(Object.assign(document.createElement('span'), { textContent: label }), control);
  return row;
}

function check(/** @type {boolean} */ on, /** @type {string} */ label, /** @type {(v: boolean) => void} */ set) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = label;
  b.setAttribute('aria-pressed', String(on));
  b.onclick = () => { set(!on); renderForm(); touch(); };
  return b;
}

function del(/** @type {() => void} */ fn) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'del';
  b.textContent = '×';
  b.setAttribute('aria-label', 'Remove row');
  b.onclick = () => { fn(); renderForm(); touch(); };
  return b;
}

function setSeg(/** @type {string} */ id, /** @type {string[]} */ words, /** @type {string} */ value, /** @type {(w: string) => void} */ pick) {
  $(id).replaceWith(Object.assign(seg(words, value, pick), { id }));
}

function item(/** @type {'bug'|'idea'} */ kind, /** @type {any} */ x, /** @type {any[]} */ list, /** @type {number} */ i) {
  const row = document.createElement('div');
  row.className = `item ${kind}`;
  row.append(
    kind === 'bug' ? pickList(KINDS, x.kind, v => { x.kind = v; }) : Object.assign(document.createElement('span'), { className: 'tag mono', textContent: 'idea' }),
    kind === 'bug' ? pickList(SEVERITIES, x.severity, v => { x.severity = v; }) : pickList(SIZES, x.size, v => { x.size = v; }),
    text(x.text, kind === 'bug' ? 'What goes wrong' : 'What it adds', v => { x.text = v; }),
    del(() => list.splice(i, 1)));
  return row;
}

function addButton(/** @type {string} */ area, /** @type {string} */ label, /** @type {() => void} */ add) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = label;
  b.onclick = () => {
    add();
    renderForm();
    touch();
    // The redraw replaces the button, so find the area by name.
    const rows = document.querySelectorAll(`.area[data-area="${area}"] .item textarea`);
    /** @type {HTMLElement|undefined} */ (rows[rows.length - 1])?.focus();
  };
  return b;
}

function renderForm() {
  const tr = rec.triage;
  setSeg('verdict', VERDICTS, rec.verdict, w => { rec.verdict = w; });
  setSeg('priority', PRIORITIES, tr.priority, w => { tr.priority = w; });
  setSeg('effort', EFFORTS, tr.effort, w => { tr.effort = w; });
  setSeg('risk', RISKS, tr.risk, w => { tr.risk = w; });
  // The toy needs a big GPU: it is intensive or poorly optimized.
  const heavy = check(!!tr.heavy, 'needs big GPU', v => { tr.heavy = v; });
  heavy.title = 'Intensive or poorly optimized';
  heavy.dataset.info = 'Intensive or poorly optimized: the toy needs a big GPU to run well.';
  $('heavy').replaceChildren(heavy);
  /** @type {HTMLInputElement} */ ($('summary')).value = rec.summary;
  /** @type {HTMLInputElement} */ ($('tags')).value = tr.tags;

  // Areas: each block holds its flag, notes, bugs and ideas.
  $('areas').replaceChildren(...AREAS.map(a => {
    const box = document.createElement('div');
    box.className = 'area';
    box.dataset.area = a;
    const flag = document.createElement('button');
    flag.type = 'button';
    flag.className = 'flag';
    flag.textContent = a;
    flag.dataset.ok = String(rec.areas[a].ok);
    flag.title = 'Flag this area as needing work';
    flag.onclick = () => { rec.areas[a].ok = !rec.areas[a].ok; flag.dataset.ok = String(rec.areas[a].ok); touch(); };
    const add = document.createElement('div');
    add.className = 'add';
    add.append(
      addButton(a, '+ bug', () => rec.findings.push({ area: a, kind: 'bug', severity: 'minor', text: '' })),
      addButton(a, '+ idea', () => rec.expansions.push({ area: a, size: 'M', text: '' })));
    const items = document.createElement('div');
    items.className = 'items';
    rec.findings.forEach((/** @type {any} */ f, /** @type {number} */ i) => { if (f.area === a) items.append(item('bug', f, rec.findings, i)); });
    rec.expansions.forEach((/** @type {any} */ x, /** @type {number} */ i) => { if (x.area === a) items.append(item('idea', x, rec.expansions, i)); });
    box.append(flag, text(rec.areas[a].notes, `${a} notes`, v => { rec.areas[a].notes = v; }), add, items);
    return box;
  }));

  // Meta: edits against toys.json, the shelf wish, and meta bugs.
  const snap = rec.snapshot;
  const metaItems = document.createElement('div');
  metaItems.className = 'items';
  rec.findings.forEach((/** @type {any} */ f, /** @type {number} */ i) => { if (f.area === 'meta') metaItems.append(item('bug', f, rec.findings, i)); });
  $('meta').replaceChildren(
    ...META.map(([k, label]) => {
      const input = /** @type {HTMLInputElement} */ (text(rec.meta[k] ?? '', snap[k] ?? '', v => {
        rec.meta[k] = v;
        input.dataset.changed = String(v !== (snap[k] ?? ''));
        summaries();
        paintLogos();
      }, true));
      input.dataset.changed = String((rec.meta[k] ?? '') !== (snap[k] ?? ''));
      input.title = `toys.json: ${snap[k] ?? ''}`;
      return field(label, input);
    }),
    field('Series', pickList(['', ...Object.keys(series)], rec.meta.series ?? '', v => { rec.meta.series = v; summaries(); paintLogos(); })),
    field('Shelf', seg(MOVES, rec.shelfMove, w => { rec.shelfMove = w; }, false)),
    field('Notes', text(rec.meta.notes, 'Name, emblem, series fit', v => { rec.meta.notes = v; })),
    metaItems);

  // Modularize: moves, shared modules to adopt, code to extract.
  const md = rec.modular;
  const moves = document.createElement('div');
  moves.className = 'seg';
  moves.append(
    check(md.toTypeScript, 'to TypeScript', v => { md.toTypeScript = v; }),
    check(md.bar === 'to-signal', 'to Signal bar', v => { md.bar = v ? 'to-signal' : 'none'; }),
    ...(toys[current].legacy ? [check(md.dropLegacy, 'drop Classic', v => { md.dropLegacy = v; })] : []));
  const adopt = document.createElement('div');
  adopt.className = 'seg';
  adopt.append(...SHARED.map(m => check(md.adopt.includes(m), m, on => {
    md.adopt = on ? [...md.adopt, m] : md.adopt.filter((/** @type {string} */ x) => x !== m);
  })));
  $('modular').replaceChildren(
    field('Moves', moves),
    field('Adopt', adopt),
    field('Extract', text(md.extract, 'Code to lift into shared/', v => { md.extract = v; })),
    field('Notes', text(md.notes, 'Split, drift, dead code', v => { md.notes = v; })));
  summaries();
  paintLogos();
  status();
}

// ---- Overview. ----

let ovRun = 0;
async function overview() {
  const run = ++ovRun;
  $('inv').classList.add('ov');
  // The hidden toy stops, so the overview does no per-frame work.
  /** @type {HTMLIFrameElement} */ ($('frame')).src = 'about:blank';
  $('invTitle').replaceChildren('Overview', Object.assign(document.createElement('small'), { textContent: 'libraries and modules, every toy' }));
  const out = $('overview');
  // Eight pages at a time; each toy is read once per visit.
  let n = 0;
  /** @type {Record<string, any>} */
  const all = {};
  const queue = [...ids];
  await Promise.all(Array.from({ length: 8 }, async () => {
    while (queue.length) {
      const id = /** @type {string} */ (queue.shift());
      all[id] = await stackOf(id, 'fresh');
      if (run !== ovRun) return;
      out.textContent = `Reading ${++n} of ${ids.length} toys…`;
    }
  }));
  if (run !== ovRun) return;

  /** @type {(pick: (s: any) => string[]) => [string, string[]][]} */
  const group = pick => {
    /** @type {Map<string, string[]>} */
    const m = new Map();
    for (const id of ids) for (const k of pick(all[id])) m.set(k, [...(m.get(k) || []), id]);
    return [...m].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  };
  const lib = (/** @type {string} */ l) => (l.startsWith('three/addons:') ? null : l);
  const tables = [
    ['Libraries', group(s => s.libraries.map(lib).filter(Boolean))],
    ['three.js versions', group(s => (s.three ? [s.three] : []))],
    ['three.js addons', group(s => s.libraries.filter((/** @type {string} */ l) => l.startsWith('three/addons:')).map((/** @type {string} */ l) => l.slice(13)))],
    ['Renderer', group(s => s.renderer)],
    ['Shared modules', group(s => s.shared)],
    ['Bar', group(s => [s.bar])],
    ['Sound', group(s => [s.sound])],
    ['TypeScript', group(s => [s.typescript ? 'yes' : 'no'])],
  ];

  const sec = (/** @type {string} */ title, /** @type {[string, string[]][]} */ rows) => {
    const el = document.createElement('section');
    el.append(Object.assign(document.createElement('span'), { className: 'label', textContent: `${title} · ${rows.length}` }));
    for (const [k, list] of rows) {
      const d = document.createElement('details');
      const lab = list.filter(id => toys[id].number == null).length;
      d.innerHTML = '<summary class="mono"><span></span><span class="n"></span><span class="split"></span></summary><div class="toys"></div>';
      const [name, num, split] = d.querySelectorAll('summary span');
      name.textContent = k;
      if (infoOf(k)) /** @type {HTMLElement} */ (name).dataset.info = infoOf(k);
      num.textContent = String(list.length);
      split.textContent = `${list.length - lab} main · ${lab} lab`;
      /** @type {HTMLElement} */ (d.querySelector('.toys')).append(...list.map(id => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = toys[id].name;
        if (toys[id].number == null) b.className = 'lab';
        b.onclick = () => desk.go(id, 'feedback');
        return b;
      }));
      el.append(d);
    }
    return el;
  };
  const grid = document.createElement('div');
  grid.className = 'grid';
  grid.append(...tables.map(([t, rows]) => sec(/** @type {string} */ (t), /** @type {any} */ (rows))));
  out.replaceChildren(
    Object.assign(document.createElement('span'), { className: 'mono', textContent: `${ids.length} toys read · main shelf solid, Lab dashed · click a row for its toys` }),
    grid);
}

// ---- Logos. ----

function paintLogos() {
  const emb = toys[current].emblem;
  for (const id of ['embTile', 'flashTile']) {
    const tile = $(id);
    if (emb) {
      const i = document.createElement('i');
      i.style.setProperty('--emblem', `url(../${emb})`);
      tile.replaceChildren(i);
    } else tile.replaceChildren(Object.assign(document.createElement('span'), { className: 'none', textContent: id === 'embTile' ? 'No emblem' : '–' }));
  }
  const acc = rec.meta.accent || '';
  $('accBar').style.background = acc;
  $('accChip').style.background = acc;
  $('accVal').textContent = acc || '–';
  const ser = series[rec.meta.series];
  $('serChip').style.background = ser?.color || 'none';
  $('serVal').textContent = ser ? `${ser.name} · ${ser.color}` : '–';
}

// The live menu runs in one frame; only the current toy's tile shows.
// A tile keeps its own listeners and gradients, so its hover is the menu's own.
/** @type {HTMLIFrameElement} */
let menuFrame;
/** @type {Document|null} */
let menuDoc = null;
/** @type {[HTMLElement, string][]} */
let touched = [];
const NAKED = 'display: block !important; position: static !important; transform: none !important; filter: none !important; opacity: 1 !important; margin: 0 !important; padding: 0 !important; border: 0 !important; animation: none !important; transition: none !important; contain: none !important; width: auto !important; height: auto !important; min-height: 0 !important;';

function restyle(/** @type {HTMLElement} */ el, /** @type {string} */ css) {
  touched.push([el, el.style.cssText]);
  el.style.cssText += `; ${css}`;
}

function showIcon() {
  if (!menuDoc) return;
  for (const [el, css] of touched) el.style.cssText = css;
  touched = [];
  const a = /** @type {HTMLElement|null} */ (menuDoc.querySelector(`a.toy#${CSS.escape(current)}`));
  $('iconNone').hidden = !!a;
  $('iconNone').textContent = 'Not on the menu';
  menuFrame.style.visibility = a ? '' : 'hidden';
  if (!a) return;
  const chain = new Set();
  for (let n = a.parentElement; n && n !== menuDoc.documentElement; n = n.parentElement) chain.add(n);
  for (const n of chain) {
    for (const c of /** @type {HTMLElement[]} */ ([...n.children])) {
      if (c !== a && !chain.has(c) && !c.matches('svg.defs, script, style, link')) restyle(c, 'display: none !important;');
    }
    restyle(/** @type {HTMLElement} */ (n), NAKED);
  }
  for (const c of /** @type {HTMLElement[]} */ ([...a.children])) if (!c.matches('.obj')) restyle(c, 'display: none !important;');
  restyle(a, 'position: absolute !important; inset: 0 !important; display: grid !important; place-items: center !important; width: 128px !important; height: 128px !important; margin: 0 !important; padding: 0 !important; opacity: 1 !important; filter: none !important; transform: none !important; transition: none !important;');
}

async function loadMenu() {
  menuFrame.src = '../index.html?raw';
  await new Promise(r => { menuFrame.addEventListener('load', r, { once: true }); setTimeout(r, 6000); });
  // The menu's script fits each icon at full width first.
  await new Promise(r => setTimeout(r, 900));
  menuDoc = menuFrame.contentDocument;
  if (!menuDoc) { $('iconNone').textContent = 'Menu did not load'; return; }
  const css = menuDoc.createElement('style');
  css.textContent = `
    html, body { background: transparent !important; overflow: hidden !important; margin: 0 !important; padding: 0 !important; min-height: 0 !important; }
    a.toy .obj { width: 100% !important; height: 100% !important; max-width: none !important; }
    a.toy .obj svg { width: 90% !important; height: 90% !important; }
    a.toy .obj .series, a.toy .obj::after { display: none !important; }`;
  menuDoc.head.append(css);
  // A click plays with the icon; it never opens the toy.
  menuDoc.addEventListener('click', e => { e.preventDefault(); e.stopImmediatePropagation(); }, true);
  menuFrame.classList.add('on');
  showIcon();
}

// The closed sections say what they hold.
function summaries() {
  const snap = rec.snapshot, md = rec.modular;
  const edits = META.map(([k]) => k).concat('series').filter(k => (rec.meta[k] ?? '') !== (snap[k] ?? ''));
  $('metaSum').textContent = [edits.length ? `${edits.length} edit${edits.length > 1 ? 's' : ''}` : 'no edits',
    rec.shelfMove !== 'none' && rec.shelfMove].filter(Boolean).join(' · ');
  const moves = [md.toTypeScript && 'to TS', md.bar === 'to-signal' && 'to Signal bar', md.dropLegacy && 'drop Classic', ...md.adopt];
  $('modSum').textContent = moves.filter(Boolean).join(' · ') || 'nothing';
}

// Every edit writes the draft to localStorage.
function touch() {
  rec.edited = Date.now();
  store.set(current, rec);
  state[current] = isSame(current) ? 'saved' : 'draft';
  $('count').textContent = `${ids.filter(id => state[id]).length} of ${ids.length} started`;
  status();
  desk?.refresh();
}

function status(/** @type {string} */ msg = '') {
  $('status').textContent = msg || (state[current] === 'draft' ? 'Draft, not saved to a file' : state[current] === 'saved' ? 'Saved' : 'Not started');
}

async function finished(/** @type {any} */ r = rec) {
  const out = structuredClone(r);
  out.date = new Date().toISOString().slice(0, 10);
  out.stack = await stackOf(out.id, out.build);
  out.findings = out.findings.filter((/** @type {any} */ f) => f.text.trim());
  out.expansions = out.expansions.filter((/** @type {any} */ x) => x.text.trim());
  return out;
}

function download(/** @type {string} */ name, /** @type {any} */ data) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2) + '\n'], { type: 'application/json' }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// File System Access writes into docs/inventory/; other browsers get a download.
async function save() {
  const r = await finished();
  const pick = /** @type {any} */ (window).showDirectoryPicker;
  if (pick) {
    try {
      dirHandle ??= await pick({ id: 'stimming-inventory', mode: 'readwrite' });
      const fh = await dirHandle.getFileHandle(`${current}.json`, { create: true });
      const w = await fh.createWritable();
      await w.write(JSON.stringify(r, null, 2) + '\n');
      await w.close();
      saved[current] = r;
      rec = structuredClone(r);
      store.set(current, rec);
      state[current] = 'saved';
      renderList();
      return status(`Written to ${dirHandle.name}/${current}.json`);
    } catch (e) {
      if (/** @type {any} */ (e)?.name === 'AbortError') return status('Save cancelled');
    }
  }
  download(`${current}.json`, r);
  status(`Downloaded ${current}.json; move it to docs/inventory/`);
}

// ---- Wiring: per mount, since the panel's elements are new each time. ----
function wire() {
  for (const b of $('builds').querySelectorAll('button')) {
    b.addEventListener('click', () => { rec.build = /** @type {HTMLElement} */ (b).dataset.b; showFrame(); touch(); });
  }
  $('summary').addEventListener('input', e => { rec.summary = /** @type {HTMLInputElement} */ (e.target).value; touch(); });
  $('tags').addEventListener('input', e => { rec.triage.tags = /** @type {HTMLInputElement} */ (e.target).value; touch(); });
  // Open sections stay open from toy to toy.
  for (const d of document.querySelectorAll('.inv details[data-key]')) {
    const k = `stimming.inventorylab.open.${/** @type {HTMLElement} */ (d).dataset.key}`;
    try { /** @type {HTMLDetailsElement} */ (d).open = localStorage.getItem(k) === '1'; } catch {}
    d.addEventListener('toggle', () => { try { localStorage.setItem(k, /** @type {HTMLDetailsElement} */ (d).open ? '1' : '0'); } catch {} });
  }
  $('save').onclick = save;
  $('exportAll').onclick = async () => {
    const all = await Promise.all(ids.filter(id => state[id]).map(id => finished(id === current ? rec : recordFor(id))));
    download('inventory-export.json', all);
    status(`Exported ${all.length} records`);
  };
  $('clear').onclick = () => {
    if (!confirm(`Clear the draft for ${toys[current].name}? A saved file stays.`)) return;
    store.drop(current);
    rec = saved[current] ? upgrade(structuredClone(saved[current]), current) : blank(current);
    state[current] = saved[current] ? 'saved' : undefined;
    renderForm();
    renderList();
  };
  $('ovBtn').onclick = () => { if ($('inv').classList.contains('ov')) select(current); else overview(); };
  $('form').addEventListener('submit', e => e.preventDefault());
}


/** @type {Promise<void> | null} */
let saving = null;

export default {
  id: 'feedback',
  label: 'Feedback',
  async setup(/** @type {any} */ d) {
    desk = d;
    const st = document.createElement('style');
    st.textContent = STYLE;
    document.head.append(st);
    toys = Object.fromEntries(d.items.filter((/** @type {any} */ i) => i.group !== 'unlisted').map((/** @type {any} */ i) => [i.id, i.raw]));
    series = (await load('../series.json', 'json')) || {};
    const menu = (await load('../index.html', 'text')) || '';
    done = new Set([...new DOMParser().parseFromString(menu, 'text/html').querySelectorAll('li[data-done] a.toy')].map(a => a.id));
    ids = d.items.filter((/** @type {any} */ i) => toys[i.id]).map((/** @type {any} */ i) => i.id);
    saving = probeSaved();
    // Alt+J and Alt+K step through the toys; the toy keeps plain keys.
    addEventListener('keydown', e => {
      if (!e.altKey || !['KeyJ', 'KeyK'].includes(e.code)) return;
      e.preventDefault();
      const i = d.items.indexOf(d.item);
      d.go(d.items[(i + (e.code === 'KeyJ' ? 1 : -1) + d.items.length) % d.items.length].id);
    });
  },
  mount(/** @type {HTMLElement} */ host, /** @type {any} */ it) {
    if (!toys[it.id]) { host.innerHTML = '<p class="hd">Not in toys.json yet: no inventory record.</p>'; return; }
    host.innerHTML = MARKUP;
    menuFrame = /** @type {HTMLIFrameElement} */ ($('menuFrame'));
    menuDoc = null;
    touched = [];
    wire();
    select(it.id);
    loadMenu();
    // Saved files arrive once; then the record reads them too.
    saving?.then(() => { if (current === it.id && $('inv')) { rec = recordFor(current); rec.snapshot = snapshot(current); renderForm(); } });
  },
  unmount() {
    // A toy left running does per-frame work; the blank page stops it.
    const f = /** @type {HTMLIFrameElement | null} */ (document.getElementById('frame'));
    if (f) f.src = 'about:blank';
    ovRun++;
  },
  status(/** @type {any} */ it) {
    if (!toys[it.id]) return '';
    const r = recordFor(it.id);
    const s = state[it.id] === 'saved' ? 'saved' : store.get(it.id) ? 'draft' : '';
    return [r.verdict, s].filter(Boolean).join(' · ');
  },
  yaml(/** @type {any} */ it) {
    if (!toys[it.id] || !store.get(it.id) && !saved[it.id]) return null;
    const r = recordFor(it.id), snap = snapshot(it.id);
    const edits = Object.fromEntries([...META.map(([k]) => k), 'series'].filter(k => (r.meta[k] ?? '') !== (snap[k] ?? '')).map(k => [k, r.meta[k]]));
    // The parts a fix needs; the full record stays in docs/inventory/.
    return {
      state: state[it.id] || 'draft', build: toys[it.id].legacy ? r.build : null,
      verdict: r.verdict, summary: r.summary,
      priority: r.triage.priority, effort: r.triage.effort, risk: r.triage.risk, bigGpu: r.triage.heavy || null, tags: r.triage.tags,
      needsWork: Object.fromEntries(AREAS.filter(a => !r.areas[a].ok).map(a => [a, r.areas[a].notes || 'yes'])),
      notes: Object.fromEntries(AREAS.filter(a => r.areas[a].ok && r.areas[a].notes).map(a => [a, r.areas[a].notes])),
      findings: r.findings.filter((/** @type {any} */ f) => f.text?.trim()),
      ideas: r.expansions.filter((/** @type {any} */ x) => x.text?.trim()),
      meta: { edits, notes: r.meta.notes, shelfMove: r.shelfMove === 'none' ? null : r.shelfMove },
      modular: { toTypeScript: r.modular.toTypeScript || null, bar: r.modular.bar === 'none' ? null : r.modular.bar, dropLegacy: r.modular.dropLegacy || null, adopt: r.modular.adopt, extract: r.modular.extract, notes: r.modular.notes },
      date: r.date,
    };
  },
};
