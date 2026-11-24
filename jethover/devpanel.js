// Jet hover: a small Dev panel for ?dev, in place of the Dev sheet.
// It floats over the corner, folds to one chip, and drags by its title.
// Values persist under stimming.jethover.dev.<id>.

const KEY = id => `stimming.jethover.dev.${id}`;
const load = id => { try { return localStorage.getItem(KEY(id)); } catch { return null; } };
const store = (id, v) => { try { localStorage.setItem(KEY(id), String(v)); } catch { /* storage is optional */ } };

const CSS = `
.jdev { position: fixed; top: 12px; left: 12px; z-index: 50; width: 240px; max-height: calc(100vh - 24px); overflow: auto;
  font: 10.5px/1.25 ui-monospace, Menlo, monospace; color: #e8e6f0; background: rgba(8, 8, 14, 0.62);
  border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 6px; backdrop-filter: blur(4px); user-select: none; }
.jdev.fold { width: auto; }
.jdev.fold .jdev-body { display: none; }
.jdev-top { display: flex; gap: 6px; align-items: center; padding: 4px 6px; cursor: move; }
.jdev-top b { flex: 1; font-weight: 600; letter-spacing: 0.08em; }
.jdev button { font: inherit; color: inherit; background: rgba(255, 255, 255, 0.08); border: 0; border-radius: 3px; padding: 1px 5px; cursor: pointer; }
.jdev button.on { background: rgba(160, 150, 255, 0.45); }
.jdev-g { padding: 3px 6px 1px; opacity: 0.55; text-transform: uppercase; letter-spacing: 0.08em; cursor: pointer; }
.jdev-g.shut + .jdev-rows { display: none; }
.jdev-r { display: grid; grid-template-columns: 84px 1fr 30px; gap: 4px; align-items: center; padding: 0 6px; height: 17px; }
.jdev-r span, .jdev-c span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 10.5px; line-height: 17px; }
.jdev-r span:last-child { text-align: right; opacity: 0.7; }
.jdev-r input { width: 100%; height: 10px; margin: 0; accent-color: #a59cff; }
.jdev-c { display: flex; gap: 3px; padding: 1px 6px 3px; align-items: center; }
`;

/**
 * Builds the panel when the address has ?dev.
 * Rows: slider {type, id, group, label, min, max, step, value, onInput},
 * toggle {type, id, group, label, value, onToggle}, choice {type, id, group, label, value, options, onPick}.
 * Each row's stored value replaces its value before the panel shows.
 * @param {any[]} rows
 * @returns {Record<string, any>} The starting value of each row.
 */
export function devPanel(rows) {
  const start = {};
  for (const r of rows) {
    const raw = load(r.id);
    let v = r.value;
    if (raw != null) {
      if (r.type === 'slider') { const n = Number(raw); if (Number.isFinite(n) && n >= r.min && n <= r.max) v = n; }
      else if (r.type === 'toggle') v = raw === '1';
      else if (r.options.some(o => o.value === raw)) v = raw;
    }
    start[r.id] = v;
  }
  if (!new URLSearchParams(location.search).has('dev')) return start;

  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.append(style);
  const el = document.createElement('div');
  el.className = 'jdev';
  el.innerHTML = '<div class="jdev-top"><b>DEV</b><button data-k="reset" title="All rows back to their defaults">reset</button><button data-k="fold" title="Fold">–</button></div><div class="jdev-body"></div>';
  const body = el.querySelector('.jdev-body');
  if (load('_fold') === '1') el.classList.add('fold');
  const setters = [];
  let group = null, list = null;
  const fmt = (r, v) => (r.step >= 1 ? String(v) : Number(v).toFixed(2));
  for (const r of rows) {
    if (r.group !== group) {
      group = r.group;
      const g = document.createElement('div');
      g.className = 'jdev-g';
      g.textContent = group;
      if (load(`_shut.${group}`) === '1') g.classList.add('shut');
      const name = group;
      g.addEventListener('click', () => { g.classList.toggle('shut'); store(`_shut.${name}`, g.classList.contains('shut') ? 1 : 0); });
      list = document.createElement('div');
      list.className = 'jdev-rows';
      body.append(g, list);
    }
    if (r.type === 'slider') {
      const row = document.createElement('label');
      row.className = 'jdev-r';
      row.innerHTML = `<span>${r.label}</span><input type="range" min="${r.min}" max="${r.max}" step="${r.step}"><span></span>`;
      const input = row.querySelector('input'), out = row.lastElementChild;
      const set = (v, fire) => { input.value = v; out.textContent = fmt(r, v); store(r.id, v); if (fire) r.onInput(Number(v)); };
      input.value = start[r.id]; out.textContent = fmt(r, start[r.id]);
      input.addEventListener('input', () => set(input.value, true));
      // A double click puts the row back to its first value.
      input.addEventListener('dblclick', () => set(r.value, true));
      setters.push(() => set(r.value, true));
      list.append(row);
    } else {
      const opts = r.type === 'toggle' ? [{ value: true, label: 'on' }, { value: false, label: 'off' }] : r.options;
      const row = document.createElement('div');
      row.className = 'jdev-c';
      row.innerHTML = `<span style="width:84px">${r.label}</span>`;
      const btns = opts.map(o => {
        const b = document.createElement('button');
        b.textContent = o.label.toLowerCase();
        b.addEventListener('click', () => pick(o.value));
        row.append(b);
        return b;
      });
      const pick = v => {
        btns.forEach((b, i) => b.classList.toggle('on', opts[i].value === v));
        store(r.id, r.type === 'toggle' ? (v ? 1 : 0) : v);
        (r.type === 'toggle' ? r.onToggle : r.onPick)(v);
      };
      btns.forEach((b, i) => b.classList.toggle('on', opts[i].value === start[r.id]));
      setters.push(() => pick(r.value));
      list.append(row);
    }
  }
  el.querySelector('[data-k="fold"]').addEventListener('click', () => { el.classList.toggle('fold'); store('_fold', el.classList.contains('fold') ? 1 : 0); });
  el.querySelector('[data-k="reset"]').addEventListener('click', () => setters.forEach(f => f()));
  // The title drags the panel; the place persists.
  const top = el.querySelector('.jdev-top');
  const at = (load('_at') || '').split(',').map(Number);
  if (at.length === 2 && at.every(Number.isFinite)) { el.style.left = `${at[0]}px`; el.style.top = `${at[1]}px`; }
  top.addEventListener('pointerdown', e => {
    if (e.target.closest('button')) return;
    const r0 = el.getBoundingClientRect(), x0 = e.clientX, y0 = e.clientY;
    top.setPointerCapture(e.pointerId);
    const move = ev => {
      const x = Math.max(0, Math.min(innerWidth - 40, r0.left + ev.clientX - x0));
      const y = Math.max(0, Math.min(innerHeight - 20, r0.top + ev.clientY - y0));
      el.style.left = `${x}px`; el.style.top = `${y}px`;
    };
    const up = () => { top.removeEventListener('pointermove', move); top.removeEventListener('pointerup', up); store('_at', `${parseInt(el.style.left, 10)},${parseInt(el.style.top, 10)}`); };
    top.addEventListener('pointermove', move);
    top.addEventListener('pointerup', up);
  });
  // Pointer and key events stay in the panel, so the toy does not react.
  for (const t of ['pointerdown', 'keydown', 'wheel']) el.addEventListener(t, e => e.stopPropagation());
  document.body.append(el);
  return start;
}
