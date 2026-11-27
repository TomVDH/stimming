// Fruit tray: a scrollable ribbon of fruit choices.
export function makeFruitTray(frame, fruits, get, pick) {
  const style = document.createElement('link');
  style.rel = 'stylesheet';
  style.href = new URL('tray.css', import.meta.url).href;
  document.head.append(style);
  let button = null;
  const glass = document.createElement('div');
  glass.className = 'fruit-tray-glass';
  const sheet = document.createElement('section');
  sheet.className = 'fruit-tray';
  sheet.hidden = true;
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-label', 'Choose a fruit');
  const title = document.createElement('div');
  title.className = 'fruit-tray-title';
  title.setAttribute('aria-live', 'polite');
  const ribbon = document.createElement('div');
  ribbon.className = 'fruit-ribbon';
  const tiles = fruits.map((fruit, i) => {
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'fruit-tile';
    const portrait = document.createElement('span');
    portrait.className = 'fruit-portrait';
    portrait.style.backgroundImage = `url(${new URL(`previews/${fruit.id}.webp`, import.meta.url).href})`;
    portrait.setAttribute('aria-hidden', 'true');
    const name = document.createElement('span');
    name.textContent = fruit.label;
    tile.append(portrait, name);
    tile.setAttribute('aria-label', i < 10 ? `${fruit.label}, key ${(i + 1) % 10}` : fruit.label);
    tile.addEventListener('pointerenter', () => { title.textContent = fruit.label; });
    tile.addEventListener('focus', () => { title.textContent = fruit.label; });
    tile.addEventListener('pointerleave', () => { title.textContent = fruits.find(f => f.id === get())?.label || ''; });
    tile.addEventListener('click', () => { pick(fruit.id); close(); });
    ribbon.append(tile);
    return tile;
  });
  sheet.append(title, ribbon);
  frame.append(glass, sheet);
  function close() {
    sheet.hidden = true;
    delete glass.dataset.on;
    button?.setAttribute('aria-expanded', 'false');
    button?.focus({ preventScroll: true });
  }
  function sync() {
    tiles.forEach((tile, i) => tile.setAttribute('aria-pressed', String(fruits[i].id === get())));
    title.textContent = fruits.find(f => f.id === get())?.label || '';
  }
  frame.addEventListener('click', e => {
    const target = e.target.closest('.sg-pick');
    if (!target || !frame.contains(target)) return;
    button = target;
    button.setAttribute('aria-haspopup', 'dialog');
    e.preventDefault(); e.stopImmediatePropagation();
    if (!sheet.hidden) { close(); return; }
    const layer = frame.querySelector('.sg-ui');
    if (layer && sheet.parentElement !== layer) layer.append(glass, sheet);
    sync();
    sheet.hidden = false;
    glass.dataset.on = '';
    button.setAttribute('aria-expanded', 'true');
    const selected = tiles.find((_, i) => fruits[i].id === get()) || tiles[0];
    selected.scrollIntoView({ block: 'nearest', inline: 'center' });
    selected.focus({ preventScroll: true });
  }, true);
  sheet.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault(); e.stopPropagation();
    const i = tiles.indexOf(document.activeElement);
    const next = tiles[Math.max(0, Math.min(tiles.length - 1, i + (e.key === 'ArrowRight' ? 1 : -1)))];
    next.focus({ preventScroll: true });
    next.scrollIntoView({ block: 'nearest', inline: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  });
  document.addEventListener('pointerdown', e => {
    if (!sheet.hidden && !sheet.contains(e.target) && e.target !== button) {
      sheet.hidden = true;
      delete glass.dataset.on;
      button?.setAttribute('aria-expanded', 'false');
    }
  }, true);
  ribbon.addEventListener('wheel', e => {
    if (ribbon.scrollWidth <= ribbon.clientWidth) return;
    e.preventDefault();
    ribbon.scrollLeft += Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
  }, { passive: false });
  return { sync };
}
