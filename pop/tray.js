// The tray keeps all material choices in one scrollable ribbon.
export function makeMaterialTray(frame, materials, get, pick, preview) {
  const sheet = document.createElement('section');
  sheet.className = 'pop-tray';
  sheet.hidden = true;
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-label', 'Choose a material');
  const title = document.createElement('div');
  title.className = 'pop-tray-title';
  title.setAttribute('aria-live', 'polite');
  const ribbon = document.createElement('div');
  ribbon.className = 'pop-ribbon';
  let trigger = null;
  const selectedName = () => materials.find(m => m.id === get())?.label || '';
  const canvases = [];
  const tiles = materials.map(material => {
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'pop-tile';
    tile.dataset.material = material.id;
    const swatch = document.createElement('canvas');
    swatch.className = 'pop-swatch';
    swatch.width = swatch.height = 96;
    canvases.push(swatch);
    swatch.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    label.className = 'pop-tile-label';
    label.textContent = material.label;
    tile.append(swatch, label);
    tile.addEventListener('pointerenter', () => { title.textContent = material.label; });
    tile.addEventListener('focus', () => { title.textContent = material.label; });
    tile.addEventListener('pointerleave', () => { title.textContent = selectedName(); });
    tile.addEventListener('click', () => { pick(material.id, tile); close(); });
    ribbon.append(tile);
    return tile;
  });
  sheet.append(title, ribbon);
  frame.append(sheet);
  function close(restoreFocus = true) {
    sheet.hidden = true;
    trigger?.setAttribute('aria-expanded', 'false');
    if (restoreFocus) trigger?.focus({ preventScroll: true });
  }
  frame.addEventListener('click', e => {
    const target = e.target.closest('.sg-pick');
    if (!target || !frame.contains(target)) return;
    trigger = target;
    trigger.setAttribute('aria-haspopup', 'dialog');
    e.preventDefault();
    e.stopImmediatePropagation();
    if (!sheet.hidden) { close(); return; }
    const layer = frame.querySelector('.sg-ui');
    if (layer && sheet.parentElement !== layer) layer.append(sheet);
    preview(canvases);
    tiles.forEach((tile, i) => tile.setAttribute('aria-pressed', String(materials[i].id === get())));
    title.textContent = selectedName();
    sheet.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    const selected = tiles.find((_, i) => materials[i].id === get()) || tiles[0];
    selected.scrollIntoView({ block: 'nearest', inline: 'center' });
    selected.focus({ preventScroll: true });
  }, true);
  sheet.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    e.stopPropagation();
    const i = tiles.indexOf(document.activeElement);
    const next = tiles[Math.max(0, Math.min(tiles.length - 1, i + (e.key === 'ArrowRight' ? 1 : -1)))];
    next.focus({ preventScroll: true });
    next.scrollIntoView({ block: 'nearest', inline: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  });
  document.addEventListener('pointerdown', e => {
    if (!sheet.hidden && !sheet.contains(e.target) && !trigger?.contains(e.target)) close(false);
  }, true);
  ribbon.addEventListener('wheel', e => {
    if (ribbon.scrollWidth <= ribbon.clientWidth) return;
    e.preventDefault();
    ribbon.scrollLeft += Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
  }, { passive: false });
}
