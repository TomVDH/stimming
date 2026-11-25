// @ts-check
// Icon panel: every icon of one toy, live, as icons/sheet.html draws them.
// Votes share the sheet's keys, so a cut there is a cut here. The sheet's owner keeps them stable.

const KEEP = 'stimming.icons.marks', CUT = 'stimming.icons.cuts';
const load = (/** @type {string} */ k) => { try { return new Set(JSON.parse(localStorage.getItem(k) || '[]')); } catch { return new Set(); } };
const store = (/** @type {string} */ k, /** @type {Set<string>} */ set) => { try { localStorage.setItem(k, JSON.stringify([...set])); } catch {} };
const stateOf = (/** @type {string} */ key) => (load(CUT).has(key) ? 'cut' : load(KEEP).has(key) ? 'keep' : '');
const day = (/** @type {string} */ d) => new Date(`${d}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

const STYLE = `
.ic-row { display: grid; gap: 10px; margin-bottom: 22px; }
.ic-cards { display: flex; flex-wrap: wrap; gap: 18px; }
.ic-round { display: block; width: 100%; height: 170px; border: 0; background: transparent; }
.ic-round.wait { opacity: 0; height: 40px; }
.ic-cell { position: relative; display: grid; gap: 8px; width: 128px; }
.ic-cell .box { position: relative; width: 128px; height: 128px; border-radius: 14px; overflow: hidden; background: oklch(0.12 0.01 275); }
.ic-cell .box img { position: absolute; inset: 0; width: 100%; height: 100%; }
/* An earlier menu tile runs live in a snapshot of its day; the still shows until it loads. */
.ic-cell .box .ic-past { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; opacity: 0; background: transparent; }
.ic-cell .box.live .ic-past { opacity: 1; }
.ic-cell .box.live img { visibility: hidden; }
.ic-cell .box svg { width: 100%; height: 100%; }
.ic-cell .lab { font: 800 10px/1.3 var(--slab); letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ic-cell .lab b { color: var(--fg); }
.ic-cell.keep::after { content: ""; position: absolute; left: 0; top: 132px; width: 128px; height: 3px; background: var(--acc-ink); }
.ic-cell.cut { display: none; }
.showcut .ic-cell.cut { display: grid; opacity: 0.35; }
.ic-cell .pick, .pick2 .pk { position: absolute; right: -6px; top: -6px; z-index: 2; padding: 4px 6px; background: var(--acc-ink); color: var(--bg); font: 800 10px/1 var(--slab); letter-spacing: 0.08em; text-transform: uppercase; }
/* The menu fits its icons to its own width, so the frame stays desktop size. */
.ic-live { position: absolute; left: 0; top: 0; width: 1280px; height: 800px; border: 0; }
.acts { display: flex; align-items: center; white-space: nowrap; margin: -6px 0 0 -11px; font: 800 11px/1 var(--slab); letter-spacing: 0.06em; text-transform: uppercase; }
.acts .w { height: 30px; padding: 0 11px; }
.acts .w[data-act="cut"]:hover, .acts .w[data-act="yes"] { color: var(--warn); }
.acts .w[data-act="yes"]:hover { color: var(--bg); }
.acts .ask { padding: 0 2px 0 11px; }
.acts .sl { padding: 0 2px; }
`;

// Inside a round's frame: only this toy's cards, in one row, on no ground.
const FONT = new URL('../../shared/fonts/IosevkaTermSlab-ExtraBold.woff2', import.meta.url).href;
const FRAME_CSS = `
@font-face { font-family: "Iosevka Term Slab"; font-weight: 800; src: url(${FONT}) format("woff2"); }
html, body { background: transparent !important; }
body { margin: 0 !important; padding: 0 0 8px !important; overflow: hidden; }
body.every > :not(#every) { display: none !important; }
#every { display: flex; flex-wrap: wrap; gap: 18px; align-items: start; }
.pick2 { position: relative; display: grid; gap: 8px; width: 128px; }
.pick2 > .t128, .pick2 > .t128 svg, .pick2 > .s128, .pick2 > .s128 svg { display: block !important; width: 128px !important; height: 128px !important; outline: none !important; border-radius: 14px; }
.pick2 > p { margin: 0; color: oklch(0.64 0.02 275); font: 800 10px/1.3 "Iosevka Term Slab", ui-monospace, monospace; letter-spacing: 0.08em; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pick2 > p b { color: oklch(0.94 0.008 275); }
.pick2 .emb, .pick2 .embs { display: none !important; }
.acts { display: flex; align-items: center; white-space: nowrap; margin: -6px 0 0 -11px; font: 800 11px/1 "Iosevka Term Slab", monospace; letter-spacing: 0.06em; text-transform: uppercase; color: oklch(0.94 0.008 275); }
.acts .w { appearance: none; position: relative; isolation: isolate; height: 30px; padding: 0 11px; border: 0; background: none; color: inherit; font: inherit; letter-spacing: inherit; text-transform: inherit; cursor: pointer; }
.acts .w::before { content: ""; position: absolute; inset: 5px 0; z-index: -1; background: #fff; clip-path: inset(0 50%); transition: clip-path 0.1s steps(3, end); }
.acts .w:hover::before, .acts .w[aria-pressed="true"]::before { clip-path: inset(0 0); }
.acts .w:hover, .acts .w[aria-pressed="true"] { color: oklch(0.16 0.012 275); }
.acts .w[data-act="cut"]:hover, .acts .w[data-act="yes"] { color: oklch(0.72 0.19 25); }
.acts .w[data-act="yes"]:hover { color: oklch(0.16 0.012 275); }
.acts .ask { padding: 0 2px 0 11px; }
.acts .sl { color: oklch(0.64 0.02 275); padding: 0 2px; }
.pick2.keep::after { content: ""; position: absolute; left: 0; top: 132px; width: 128px; height: 3px; background: var(--hub-ink, #fff); }
.pick2.cut { display: none; }
body.showcut .pick2.cut { display: grid; opacity: 0.35; }
.pick2 .pk { position: absolute; right: -2px; top: -2px; z-index: 3; padding: 4px 6px; background: var(--hub-ink, #fff); color: oklch(0.16 0.012 275); font: 800 10px/1 "Iosevka Term Slab", monospace; letter-spacing: 0.08em; text-transform: uppercase; }
`;

// Data from the icon sheet's files, loaded once.
const D = { gallery: /** @type {any} */ ({}), archive: /** @type {any} */ ({}), picks: /** @type {any} */ ({}), past: /** @type {any} */ ({}), early: /** @type {any} */ ({}) };
const IC = new URL('../../icons/', import.meta.url).href;
const ALIAS = /** @type {Record<string, string>} */ ({ vent: 'deepvent' });
const roundsOf = (/** @type {string} */ id) => [...new Set([...(D.archive[id] || []), ...[D.gallery[id] ?? []].flat()].map(String))].reverse();

// The icon sheet's emblem fix, word for word: icons/sheet.html, EMB_FIX.
// Inside a gallery, each emblem comes from the gallery's own copy.
// A cut emblem without one comes from the archive; nothing asks for a moved file.
let EMB_FIX = '';
const embFix = (/** @type {string[]} */ gone) => `<script>
(() => {
  const CUT = new Set(${JSON.stringify(gone)});
  const enc = s => encodeURIComponent(s).replace(/[()'!*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
  const swap = v => v.replace(/url\\((["']?)spike\\/emblems\\/([\\w-]+)\\.svg\\1\\)/g, (m, q, f) => {
    const s = window.EMBLEMS && window.EMBLEMS[f];
    if (s) return 'url(data:image/svg+xml,' + enc(s) + ')';
    return CUT.has(f) ? 'url(archive/emblems/' + f + '.svg)' : m;
  });
  const html = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
  Object.defineProperty(Element.prototype, 'innerHTML', { ...html, set(v) { html.set.call(this, typeof v === 'string' && v.includes('spike/emblems/') ? swap(v) : v); } });
  const adj = Element.prototype.insertAdjacentHTML;
  Element.prototype.insertAdjacentHTML = function (p, v) { return adj.call(this, p, typeof v === 'string' && v.includes('spike/emblems/') ? swap(v) : v); };
  const fix = el => {
    const v = el.getAttribute('style');
    if (!v || !v.includes('spike/emblems/')) return;
    const w = swap(v);
    if (w !== v) el.setAttribute('style', w);
  };
  new MutationObserver(ms => {
    for (const m of ms) {
      if (m.type === 'attributes') { fix(m.target); continue; }
      for (const n of m.addedNodes) if (n.nodeType === 1) { fix(n); n.querySelectorAll('[style*="spike/emblems/"]').forEach(fix); }
    }
  }).observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });
})();
<\/script>`;

let gen = 0, showCut = false;
/** @type {Set<HTMLIFrameElement>} */
const frames = new Set();
/** @type {HTMLIFrameElement | null} */
let menuFrame = null;
/** @type {any} */
let desk = null;
/** @type {any} */
let item = null;

/** The words under an icon: Keep and Cut; a cut icon offers Restore. @param {string} key */
const actsHTML = key => {
  const st = stateOf(key);
  if (st === 'cut') return '<button class="w" type="button" data-act="restore">Restore</button>';
  return `<button class="w" type="button" data-act="keep" aria-pressed="${st === 'keep'}">${st === 'keep' ? 'Kept' : 'Keep'}</button><span class="sl">/</span><button class="w" type="button" data-act="cut">Cut</button>`;
};
/** @param {string} key @param {string} st */
function setVote(key, st) {
  const k = load(KEEP), c = load(CUT);
  k.delete(key); c.delete(key);
  if (st === 'keep') k.add(key);
  if (st === 'cut') c.add(key);
  store(KEEP, k); store(CUT, c);
  paint();
  desk.refresh();
}
// One handler serves the panel and every round's frame.
function onAct(/** @type {Event} */ e) {
  const btn = /** @type {HTMLElement} */ (e.target).closest?.('[data-act]');
  if (!btn) return;
  e.preventDefault();
  e.stopPropagation();
  const acts = /** @type {HTMLElement} */ (btn.closest('.acts')), key = /** @type {string} */ (acts.dataset.key), name = acts.dataset.name || key, act = /** @type {HTMLElement} */ (btn).dataset.act;
  const was = stateOf(key);
  if (act === 'keep') setVote(key, was === 'keep' ? '' : 'keep');
  if (act === 'restore') { setVote(key, ''); desk.toast(`Restored ${name}`); }
  // Cut asks once, in place, before it hides the icon.
  if (act === 'cut') acts.innerHTML = '<span class="ask">Cut?</span><button class="w" type="button" data-act="yes">Yes</button><span class="sl">/</span><button class="w" type="button" data-act="no">No</button>';
  if (act === 'no') acts.innerHTML = actsHTML(key);
  if (act === 'yes') { setVote(key, 'cut'); desk.toast(`Cut ${name}`, () => setVote(key, was)); }
}

// Votes paint into every frame and every cell.
function paint() {
  const host = document.querySelector('.ic-host');
  if (!host) return;
  const ink = getComputedStyle(document.documentElement).getPropertyValue('--acc-ink');
  host.classList.toggle('showcut', showCut);
  for (const f of frames) {
    const doc = f.contentDocument;
    if (!doc?.body) continue;
    doc.body.style.setProperty('--hub-ink', ink);
    doc.body.classList.toggle('showcut', showCut);
    doc.querySelectorAll('.pick2').forEach(c => { const st = stateOf(/** @type {HTMLElement} */ (c).dataset.key || ''); c.classList.toggle('keep', st === 'keep'); c.classList.toggle('cut', st === 'cut'); });
    doc.querySelectorAll('.acts').forEach(a => { a.innerHTML = actsHTML(/** @type {HTMLElement} */ (a).dataset.key || ''); });
    const every = doc.getElementById('every');
    if (every) f.style.height = `${every.scrollHeight + 12}px`;
  }
  host.querySelectorAll('.ic-cell[data-key]').forEach(c => { const st = stateOf(/** @type {HTMLElement} */ (c).dataset.key || ''); c.classList.toggle('keep', st === 'keep'); c.classList.toggle('cut', st === 'cut'); });
  host.querySelectorAll('.acts').forEach(a => { a.innerHTML = actsHTML(/** @type {HTMLElement} */ (a).dataset.key || ''); });
  const n = countCut(item.id);
  const sc = /** @type {HTMLButtonElement | null} */ (host.querySelector('[data-showcut]'));
  if (sc) { sc.textContent = n ? `${showCut ? 'Hide' : 'Show'} ${n} cut` : 'Nothing cut'; sc.disabled = !n; }
}
const countCut = (/** @type {string} */ id) => [...load(CUT)].filter(k => k.startsWith(`${id}-`)).length;

// Earlier menu tiles load three at a time, as on the icon sheet.
// A tile takes over from its still once its snapshot says it is ready.
/** @param {HTMLElement} host @param {number} my */
function goPast(host, my) {
  const queue = /** @type {HTMLIFrameElement[]} */ ([...host.querySelectorAll('iframe.ic-past')]);
  const wire = (/** @type {HTMLIFrameElement} */ f) => {
    const t0 = performance.now();
    const poll = setInterval(() => {
      const d = f.contentDocument, ready = d?.documentElement.dataset.ready;
      if (my !== gen) { clearInterval(poll); return; }
      if (!ready && performance.now() - t0 < 12000) return;
      clearInterval(poll);
      if (ready !== '1' || !d) { f.remove(); return; }
      // A click on the tile does not open the toy.
      d.addEventListener('click', e => { e.preventDefault(); e.stopImmediatePropagation(); }, true);
      f.parentElement?.classList.add('live');
    }, 100);
  };
  let loading = 0;
  const next = () => {
    while (my === gen && loading < 3 && queue.length) {
      const f = /** @type {HTMLIFrameElement} */ (queue.shift());
      if (!f.isConnected) continue;
      loading++;
      let done = false;
      const free = () => { if (done) return; done = true; loading--; next(); };
      f.addEventListener('load', () => { free(); wire(f); }, { once: true });
      setTimeout(free, 8000);
      f.src = /** @type {string} */ (f.dataset.src);
    }
  };
  next();
}

// The cards of this toy in one gallery, as the sheet finds them.
/** @param {Document} doc @param {string} id @param {string} r */
const cardsIn = (doc, id, r) => {
  const toyOf = (/** @type {Element} */ sec) => { const first = /** @type {HTMLElement | null} */ (sec.querySelector('.dir')); const t = sec.id?.replace(/^row-/, '') || (first?.id || first?.dataset.key || '').split('-')[0]; return ALIAS[t] || t; };
  const secs = [...doc.querySelectorAll('section')].filter(sec => sec.querySelector('.dir') && toyOf(sec) === id);
  if (secs.length) return secs.flatMap(sec => [...sec.querySelectorAll('.dir')]);
  if (String(r).replace(/-\d+$/, '') !== id && ALIAS[String(r).replace(/-\d+$/, '')] !== id) return [];
  const dirs = [...doc.querySelectorAll('.dir')];
  return dirs.length ? dirs : [...doc.querySelectorAll('#sheet .r')];
};
/** @param {HTMLElement} host @param {string} id @param {string} r @param {number} my @param {string} pick */
async function mountRound(host, id, r, my, pick) {
  const src = await fetch(`${IC}spike-${r}.html`).then(x => (x.ok ? x.text() : '')).catch(() => '');
  if (my !== gen) return;
  if (!src) { host.innerHTML = '<p class="hd">Gallery missing</p>'; return; }
  const frame = document.createElement('iframe');
  frame.className = 'ic-round wait';
  frame.title = `Round ${r}`;
  frame.setAttribute('scrolling', 'no');
  frame.srcdoc = src.replace(/<head>/i, `<head><base href="${IC}">${EMB_FIX}`).replace(/<\/head>/i, `<style>${FRAME_CSS}</style></head>`);
  host.append(frame);
  // The cards are ready before fonts and emblems finish; do not wait for those.
  await new Promise(res => {
    const t0 = performance.now();
    const poll = setInterval(() => {
      if (!frame.contentDocument?.querySelector('.t128 svg, .s128 svg') && performance.now() - t0 < 8000) return;
      clearInterval(poll);
      setTimeout(res, 250);
    }, 60);
  });
  if (my !== gen || !frame.contentDocument) return;
  const doc = frame.contentDocument;
  const grid = doc.createElement('div');
  grid.id = 'every';
  for (const card of cardsIn(doc, id, r)) {
    const tile = card.querySelector('.t128, .s128');
    const l = (card.querySelector('b')?.textContent || card.querySelector('.lab, i, span')?.textContent || '').trim();
    if (!tile || !l || /^current$/i.test(l)) continue;
    const name = [...card.querySelectorAll('header span, header i, .lab span')].map(n => n.textContent).join(' ').replace(/^[\s·]+/, '').trim();
    const cell = doc.createElement('div');
    cell.className = 'pick2';
    cell.dataset.key = `${id}-${l.toLowerCase()}@${r}`;
    // Moving the tile keeps its listeners, so its hover still runs.
    cell.append(tile);
    const emb = card.querySelector('.emb, .embs');
    if (emb) cell.append(emb);
    const label = `${l}${name ? ` · ${name}` : ''}`;
    cell.insertAdjacentHTML('beforeend', `<p><b>${l}</b>${name ? ` · ${name}` : ''}</p><div class="acts" data-key="${cell.dataset.key}" data-name="${label.replace(/"/g, '')}"></div>${pick && pick.toLowerCase() === l.toLowerCase() ? '<span class="pk">Pick</span>' : ''}`);
    grid.append(cell);
  }
  if (!grid.children.length) { frame.remove(); host.innerHTML = '<p class="hd">No cards for this toy</p>'; return; }
  // Paint servers outside the cards move into the grid, so gradients still paint.
  const PAINT = 'defs, symbol, linearGradient, radialGradient, pattern, filter, clipPath, mask, marker';
  const box = doc.createElement('div');
  box.style.cssText = 'position: absolute; width: 0; height: 0; overflow: hidden;';
  for (const pnt of doc.querySelectorAll(PAINT)) {
    if (grid.contains(pnt) || box.contains(pnt) || pnt.parentElement?.closest(PAINT)) continue;
    const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.append(pnt);
    box.append(svg);
  }
  grid.append(box);
  doc.body.append(grid);
  doc.body.classList.add('every');
  doc.addEventListener('click', onAct, true);
  frames.add(frame);
  paint();
  frame.classList.remove('wait');
}

// The live menu, cut down to one tile; its hover is the menu's own.
/** @param {HTMLElement} host */
function liveTile(host) {
  if (!menuFrame) {
    menuFrame = Object.assign(document.createElement('iframe'), { className: 'ic-live', title: 'Current menu tile', src: `${IC}../index.html?lab` });
    menuFrame.setAttribute('scrolling', 'no');
    menuFrame.addEventListener('load', () => cutMenu());
  }
  host.append(menuFrame);
  cutMenu();
}
function cutMenu() {
  const doc = menuFrame?.contentDocument;
  if (!doc?.querySelector('a.toy[id]')) { if (menuFrame?.isConnected) setTimeout(cutMenu, 300); return; }
  let st = doc.getElementById('hub-cut');
  if (!st) {
    st = doc.createElement('style');
    st.id = 'hub-cut';
    doc.head.append(st);
    doc.addEventListener('click', e => { if (/** @type {HTMLElement} */ (e.target).closest?.('a.toy')) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
  }
  const sel = `a.toy#${CSS.escape(item.id)}`;
  // A view may hide the tile's shelf; its parents open, as on the sheet.
  for (let n = doc.querySelector(sel)?.parentElement; n && n !== doc.documentElement; n = n.parentElement) {
    for (const [k, v] of [['display', 'block'], ['transform', 'none'], ['filter', 'none'], ['opacity', '1'], ['contain', 'none'], ['content-visibility', 'visible']]) n.style.setProperty(k, v, 'important');
  }
  st.textContent = `html, body { background: transparent !important; overflow: hidden !important; }
    body * { visibility: hidden !important; }
    ${sel}, ${sel} * { visibility: visible !important; }
    ${sel} { position: fixed !important; left: 0 !important; top: 0 !important; width: 128px !important; height: 128px !important; margin: 0 !important; padding: 0 !important; transform: none !important; opacity: 1 !important; filter: none !important; z-index: 9999 !important; display: grid !important; place-items: center !important; }
    ${sel} > :not(.obj) { display: none !important; }
    ${sel} .obj { width: 100% !important; height: 100% !important; max-width: none !important; }
    ${sel} .obj svg { width: 90% !important; height: 90% !important; }
    ${sel} .obj .series, ${sel} .obj::after { display: none !important; }`;
}

/** @param {string} key @param {string} inner @param {string} label @param {boolean} [picked] */
const cell = (key, inner, label, picked) => `<div class="ic-cell" data-key="${key}"><span class="box">${inner}</span><span class="lab">${label}</span><div class="acts" data-key="${key}" data-name="${label.replace(/<[^>]+>/g, '')}"></div>${picked ? '<span class="pick">Pick</span>' : ''}</div>`;

export default {
  id: 'icons',
  label: 'Icon',
  async setup(/** @type {any} */ d) {
    desk = d;
    const st = document.createElement('style');
    st.textContent = STYLE;
    document.head.append(st);
    const get = (/** @type {string} */ u, /** @type {'json'|'text'} */ as) => fetch(IC + u).then(r => (r.ok ? r[as]() : null)).catch(() => null);
    const [sheet, rounds, picks, menu, lab, cut] = await Promise.all([get('sheet.html', 'text'), get('rounds.json', 'json'), get('picks.json', 'json'), get('history/menu.json', 'json'), get('index.html', 'text'), get('archive/cut.json', 'json')]);
    EMB_FIX = embFix(Object.entries(cut?.cut || {}).flatMap(([id, ls]) => /** @type {string[]} */ (ls).map(l => `${id}-${l.toLowerCase()}`)));
    // The sheet's GALLERY literal ends at the first "\n};".
    try { D.gallery = Function(`return ${String(sheet).match(/const GALLERY = (\{[\s\S]*?\n\});/)?.[1]}`)() || {}; } catch { D.gallery = {}; }
    D.archive = rounds?.rounds || {};
    D.picks = picks?.toys || {};
    D.past = menu?.tiles || {};
    // The icon lab page holds the first three directions; each figure names its toy.
    const labDoc = new DOMParser().parseFromString(lab || '', 'text/html');
    for (const sec of labDoc.querySelectorAll('section')) {
      const set = sec.querySelector('h2')?.textContent?.trim();
      for (const fig of sec.querySelectorAll('figure')) {
        const cap = fig.querySelector('figcaption')?.textContent?.trim() || '';
        const id = ({ 'Domino run': 'domino' })[cap] || d.items.find((/** @type {any} */ i) => i.name === cap)?.id || cap.toLowerCase();
        const svg = fig.querySelector('svg');
        if (set && svg) (D.early[id] ||= []).push({ set, svg: svg.outerHTML });
      }
    }
    const defs = labDoc.querySelector('body > .wrap > svg defs, body > svg defs');
    if (defs) document.body.insertAdjacentHTML('beforeend', `<svg width="0" height="0" style="position: absolute" aria-hidden="true">${defs.outerHTML}</svg>`);
    // The panel host persists, so its listeners attach once, here.
    const host = d.$('panel');
    host.addEventListener('click', (/** @type {Event} */ e) => { if (item && host.classList.contains('ic-host')) onAct(e); });
    host.addEventListener('click', (/** @type {Event} */ e) => {
      const b = /** @type {HTMLElement} */ (e.target).closest('[data-showcut]');
      if (!b || !host.classList.contains('ic-host')) return;
      showCut = !showCut;
      b.setAttribute('aria-pressed', String(showCut));
      paint();
    });
    // The sheet in another tab votes too; this panel follows.
    addEventListener('storage', e => { if (e.key === KEEP || e.key === CUT) { paint(); desk.refresh(); } });
  },
  mount(/** @type {HTMLElement} */ host, /** @type {any} */ it) {
    item = it;
    const my = ++gen, id = it.id, pick = D.picks[id]?.pick || '';
    frames.clear();
    const rs = roundsOf(id), past = D.past[id] || [], early = D.early[id] || [];
    const newestPick = (pick.match(/^[A-Ea-e]/) || [''])[0];
    host.classList.add('ic-host');
    host.innerHTML = `<div class="bar" style="margin-bottom:14px"><button class="w" type="button" data-showcut aria-pressed="${showCut}">Show cut</button><span class="sl">/</span><a class="w" href="${IC}sheet.html" target="_blank" rel="noopener">Full sheet ↗</a></div>`
      + `<div class="ic-row"><p class="hd">Now</p><div class="ic-cards">`
      + (it.group === 'unlisted' ? '' : `<div class="ic-cell" data-key="${id}-current"><span class="box" id="ic-cur"></span><span class="lab"><b>Current</b> · menu</span><div class="acts" data-key="${id}-current" data-name="Current"></div>${pick === 'Current' ? '<span class="pick">Pick</span>' : ''}</div>`)
      + (it.emblem ? `<div class="ic-cell"><span class="box" style="background: #fff; display: grid; place-items: center"><i style="width: 72%; height: 72%; background: var(--bg); -webkit-mask: url(${IC}../${it.emblem}) center / contain no-repeat; mask: url(${IC}../${it.emblem}) center / contain no-repeat"></i></span><span class="lab"><b>Intro logo</b></span></div>` : '')
      + '</div></div>'
      + rs.map((r, i) => `<div class="ic-row"><p class="hd">Round ${rs.length - i} of ${rs.length} · ${/^\d+$/.test(r) ? `spike ${r}` : r}${i === 0 ? ' · newest' : ''}</p><div data-round="${r}"></div></div>`).join('')
      + (past.length ? `<div class="ic-row"><p class="hd">Menu, earlier · ${past.length} tile${past.length > 1 ? 's' : ''}, newest first</p><div class="ic-cards">${past.map((/** @type {any} */ p, /** @type {number} */ i) => [p, i + 1]).reverse().map(([p, n]) => cell(`${id}-menu${n}@menu`, `<img src="${IC}${p.file}" alt="" loading="lazy">${p.page ? `<iframe class="ic-past" data-src="${IC}${p.page}?lab&tile=${encodeURIComponent(p.id || id)}" title="${it.name}, menu tile ${n}" tabindex="-1" scrolling="no"></iframe>` : ''}`, `<b>Menu ${n}</b> · ${day(p.from)}`)).join('')}</div></div>` : '')
      + (early.length ? `<div class="ic-row"><p class="hd">Icon lab · the first directions</p><div class="ic-cards">${early.map((/** @type {any} */ e) => cell(`${id}-${e.set.toLowerCase().replace(/\W+/g, '-')}@lab`, e.svg, `<b>${e.set}</b>`)).join('')}</div></div>` : '')
      + (rs.length || past.length || early.length ? '' : '<p class="hd">No icon rounds yet</p>');
    const cur = document.getElementById('ic-cur');
    if (cur) liveTile(cur);
    goPast(host, my);
    host.querySelectorAll('[data-round]').forEach((h, i) => mountRound(/** @type {HTMLElement} */ (h), id, /** @type {string} */ (/** @type {HTMLElement} */ (h).dataset.round), my, i === 0 ? newestPick : ''));
    paint();
  },
  unmount() {
    gen++;
    frames.clear();
    document.querySelector('.ic-host')?.classList.remove('ic-host', 'showcut');
  },
  status(/** @type {any} */ it) {
    const k = [...load(KEEP)].filter(x => x.startsWith(`${it.id}-`)).length, c = countCut(it.id);
    return [k && `${k} kept`, c && `${c} cut`].filter(Boolean).join(' · ');
  },
  yaml(/** @type {any} */ it) {
    const votes = /** @type {Record<string, string>} */ ({});
    for (const k of load(KEEP)) if (k.startsWith(`${it.id}-`)) votes[k.slice(it.id.length + 1)] = 'keep';
    for (const k of load(CUT)) if (k.startsWith(`${it.id}-`)) votes[k.slice(it.id.length + 1)] = 'cut';
    const pick = D.picks[it.id]?.pick;
    if (!Object.keys(votes).length) return null;
    return { pick: pick || null, rounds: roundsOf(it.id), votes };
  },
};
