// @ts-check
// The desk core: walks a list of items, one at a time, and hosts panels as tabs.
// It knows no project. desk.config.js names the items and the panels; TEMPLATE.md explains.
import config from './desk.config.js';
import { toYAML } from './yaml.js';

/**
 * A panel: one module in ./panels/, default export.
 * @typedef {object} Panel
 * @property {string} id
 * @property {string} label  The tab's word.
 * @property {(desk: Desk) => Promise<void> | void} [setup]  Runs once: load data, add CSS.
 * @property {(host: HTMLElement, item: any, desk: Desk) => void} mount  Draws the panel for one item.
 * @property {() => void} [unmount]  Stops work before the next item or tab.
 * @property {(item: any, desk: Desk) => string} [status]  A short word for the tab.
 * @property {(item: any, desk: Desk) => any} [yaml]  This panel's part of the item's YAML; null when untouched.
 */

const $ = (/** @type {string} */ id) => /** @type {HTMLElement} */ (document.getElementById(id));
const esc = (/** @type {any} */ s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] || c);

/** Saved desk state; reads and writes never throw. */
const keep = {
  get(/** @type {string} */ k, /** @type {any} */ d) { try { const v = localStorage.getItem(config.storage + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(/** @type {string} */ k, /** @type {any} */ v) { try { localStorage.setItem(config.storage + k, JSON.stringify(v)); } catch {} },
};

// Bar v3 words, the one control of every panel.
/** @param {[string, string][]} opts @param {string} attr @param {(v: string) => boolean} on */
const words = (opts, attr, on) => opts.map(([v, l], i) => `${i ? '<span class="sl">/</span>' : ''}<button class="w" type="button" ${attr}="${esc(v)}" aria-pressed="${on(v)}">${l}</button>`).join('');

let toastT = 0;
/** A done thing at the foot, with Undo when it can be undone. @param {string} text @param {() => void} [undo] */
function toast(text, undo) {
  const el = $('toast');
  el.innerHTML = `<span>${esc(text)}</span>${undo ? '<button type="button">Undo</button>' : ''}`;
  el.hidden = false;
  if (undo) /** @type {HTMLElement} */ (el.querySelector('button')).onclick = () => { undo(); el.hidden = true; };
  clearTimeout(toastT);
  toastT = setTimeout(() => { el.hidden = true; }, 6000);
}

/** The file save: a download of text. @param {string} name @param {string} text */
function download(name, text) {
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([text], { type: 'text/yaml' })), download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

const items = await config.items();
const byId = Object.fromEntries(items.map(i => [i.id, i]));
const q = new URLSearchParams(location.search);
/** @type {Panel[]} */
const panels = (await Promise.all(config.panels.map(p => import(`./panels/${p}.js`)))).map(m => m.default);
const state = {
  id: byId[q.get('toy') ?? ''] ? /** @type {string} */ (q.get('toy')) : keep.get('item', config.first),
  tab: q.get('tab') || keep.get('tab', panels[0].id),
  filter: keep.get('filter', 'all'),
};
if (!byId[state.id]) state.id = items[0].id;
if (state.tab !== 'yaml' && !panels.some(p => p.id === state.tab)) state.tab = panels[0].id;

/** The handle each panel gets. */
const desk = {
  config, items, byId, keep, words, toast, esc, download, $,
  /** @returns {any} */ get item() { return byId[state.id]; },
  /** Opens an item, and a tab when given. @param {string} id @param {string} [tab] */
  go(id, tab) { if (!byId[id]) return; state.id = id; if (tab) state.tab = tab; draw(); },
  /** Redraws the tab words and the strip dots, after a panel saves. */
  refresh() { drawTabs(); drawStrip(); },
  /** The YAML of one item: every panel's part. @param {string} id */
  yamlOf(id) {
    const item = byId[id], out = /** @type {any} */ ({ id, name: item.name, group: item.group });
    for (const p of panels) { const part = p.yaml?.(item, desk); if (part) out[p.id] = part; }
    return out;
  },
  /** True when any panel holds work for the item. @param {string} id */
  touched(id) { const y = desk.yamlOf(id); return panels.some(p => y[p.id]); },
};
/** @typedef {typeof desk} Desk */

for (const p of panels) await p.setup?.(desk);

/* ---------- chrome ---------- */
$('title').textContent = config.title;
document.title = config.title;
$('links').innerHTML = config.links.map(([l, h], i) => `${i ? '<span class="sl">/</span>' : ''}<a class="w" href="${h}">${l}${h.startsWith('../') ? ' ↗' : ''}</a>`).join('');

function drawFilter() {
  const count = (/** @type {string} */ g) => items.filter(i => i.group === g).length;
  const opts = /** @type {[string, string][]} */ ([['all', `All ${items.length}`], ...config.groups.filter(([g]) => count(g)).map(([g, l]) => [g, `${l} ${count(g)}`]), ['todo', `Untouched ${items.filter(i => !desk.touched(i.id)).length}`]]);
  $('filter').innerHTML = words(opts, 'data-f', v => v === state.filter);
}
function drawStrip() {
  const list = items.filter(i => state.filter === 'all' || (state.filter === 'todo' ? !desk.touched(i.id) : i.group === state.filter));
  $('strip').innerHTML = list.map((it, n) => `${n && list[n - 1].group !== it.group ? '<span class="gap"></span>' : ''}<button type="button" class="${it.group === 'unlisted' ? 'un' : ''}${desk.touched(it.id) ? ' touched' : ''}" data-id="${it.id}" title="${esc(it.name)}" aria-label="${esc(it.name)}" aria-current="${it.id === state.id}">${it.emblem ? `<i style="--em: url(${config.root}${it.emblem})"></i>` : '<span class="nil"></span>'}</button>`).join('');
  const cur = /** @type {HTMLElement | null} */ ($('strip').querySelector('[aria-current="true"]'));
  // The rail strip scrolls down; the inline strip scrolls across.
  if (cur) Object.assign($('strip'), { scrollLeft: cur.offsetLeft - $('strip').clientWidth / 2, scrollTop: cur.offsetTop - $('strip').offsetTop - $('strip').clientHeight / 2 });
}
function drawTabs() {
  const tabs = [...panels.map(p => [p.id, p.label, p.status?.(desk.item, desk) || '']), ['yaml', 'YAML', '']];
  $('tabs').innerHTML = tabs.map(([id, l, s], i) => `${i ? '<span class="sl">/</span>' : ''}<button class="w" type="button" role="tab" data-tab="${id}" aria-selected="${id === state.tab}">${l}${s ? ` <small>${esc(s)}</small>` : ''}</button>`).join('');
}
function drawHead() {
  const it = desk.item, i = items.indexOf(it);
  document.documentElement.style.setProperty('--acc-ink', config.ink?.(it) || '#fff');
  $('nav').innerHTML = `<button class="w" type="button" data-step="-1" aria-label="Previous">‹</button><span class="sl" style="padding:0 2px">${i + 1} of ${items.length}</span><button class="w" type="button" data-step="1" aria-label="Next">›</button>`
    + '<span class="sl">/</span><button class="w" type="button" data-x="all">Export all YAML</button>';
  $('head').innerHTML = `<div class="name">${esc(it.name)}</div>${it.sub ? `<div class="nl">${it.sub}</div>` : ''}<div class="facts">${config.facts?.(it) || ''}</div>`;
}

/** @type {Panel | null} */
let live = null;
function drawPanel() {
  live?.unmount?.();
  live = null;
  const host = $('panel');
  host.innerHTML = '';
  if (state.tab === 'yaml') {
    const text = toYAML(desk.yamlOf(state.id));
    host.innerHTML = `<div class="bar" style="margin-bottom:10px"><button class="w" type="button" data-x="copy">Copy</button><span class="sl">/</span><button class="w" type="button" data-x="save">Save ${esc(state.id)}.yaml</button></div><pre class="yaml">${esc(text)}</pre>`;
    return;
  }
  live = panels.find(p => p.id === state.tab) || panels[0];
  live.mount(host, desk.item, desk);
}
function draw() {
  keep.set('item', state.id);
  keep.set('tab', state.tab);
  keep.set('filter', state.filter);
  const u = new URL(location.href);
  u.searchParams.set('toy', state.id);
  u.searchParams.set('tab', state.tab);
  history.replaceState(null, '', u);
  drawFilter(); drawStrip(); drawHead(); drawTabs(); drawPanel();
}

/* ---------- input ---------- */
$('filter').addEventListener('click', e => { const b = /** @type {HTMLElement} */ (e.target).closest('[data-f]'); if (b) { state.filter = /** @type {string} */ (/** @type {HTMLElement} */ (b).dataset.f); keep.set('filter', state.filter); drawFilter(); drawStrip(); } });
$('strip').addEventListener('click', e => { const b = /** @type {HTMLElement} */ (e.target).closest('button'); if (b) desk.go(/** @type {string} */ (b.dataset.id)); });
$('tabs').addEventListener('click', e => { const b = /** @type {HTMLElement} */ (e.target).closest('[data-tab]'); if (b) { state.tab = /** @type {string} */ (/** @type {HTMLElement} */ (b).dataset.tab); draw(); } });
document.addEventListener('click', e => {
  const b = /** @type {HTMLElement} */ (e.target).closest('[data-step], [data-x]');
  if (!b) return;
  const step = /** @type {HTMLElement} */ (b).dataset.step, x = /** @type {HTMLElement} */ (b).dataset.x;
  if (step) { const i = items.indexOf(desk.item); desk.go(items[(i + +step + items.length) % items.length].id); }
  if (x === 'copy') navigator.clipboard?.writeText(toYAML(desk.yamlOf(state.id))).then(() => toast('YAML copied'));
  if (x === 'save') download(`${state.id}.yaml`, toYAML(desk.yamlOf(state.id)));
  // Export all: every item with work, in one file.
  if (x === 'all') {
    const done = items.filter(i => desk.touched(i.id));
    download(`${config.project.toLowerCase()}-desk.yaml`, toYAML({ project: config.project, date: new Date().toISOString().slice(0, 10), items: done.map(i => desk.yamlOf(i.id)) }));
    toast(`${done.length} item${done.length === 1 ? '' : 's'} exported`);
  }
});
// Arrow keys step items when no field has focus.
addEventListener('keydown', e => {
  const t = /** @type {HTMLElement} */ (e.target);
  if (t.closest('input, textarea, select') || document.body.classList.contains('is-full')) return;
  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { const i = items.indexOf(desk.item); desk.go(items[(i + (e.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length].id); }
});
draw();
