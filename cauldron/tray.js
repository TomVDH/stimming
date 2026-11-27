export function makeIngredientTray(frame, choices, icon, get, select) {
  const glass = document.createElement('div');
  glass.className = 'ingredient-tray-glass';
  const sheet = document.createElement('section');
  sheet.className = 'ingredient-tray';
  sheet.hidden = true;
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-label', 'Choose an ingredient');
  const heading = document.createElement('div');
  heading.className = 'ingredient-tray-heading';
  heading.setAttribute('aria-live', 'polite');
  const ribbon = document.createElement('div');
  ribbon.className = 'ingredient-tray-ribbon';
  const list = document.createElement('div');
  list.className = 'ingredient-tray-list';
  let anchor = null;
  const tiles = choices.map(([id, label, group]) => {
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'ingredient-tile';
    const art = document.createElement('span');
    art.className = 'ingredient-art';
    art.innerHTML = icon(id).replace(/\bid="([^"]+)"/g, 'id="tray-$1"').replace(/url\(#([^)]+)\)/g, 'url(#tray-$1)');
    const name = document.createElement('span');
    name.className = 'ingredient-name';
    name.textContent = label;
    tile.append(art, name);
    tile.addEventListener('pointerenter', () => tell(label));
    tile.addEventListener('pointerleave', tellCurrent);
    tile.addEventListener('focus', () => tell(label));
    tile.addEventListener('click', () => { if (dragged) return; select(id); close(); });
    list.append(tile);
    return tile;
  });
  function tell(label) { heading.textContent = label; }
  function tellCurrent() { const item = choices.find(c => c[0] === get()) || choices[0]; tell(item[1]); }
  function centre(tile) { tile.scrollIntoView({ block: 'nearest', inline: 'center' }); }
  const arrows = [-1, 1].map(dir => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `ingredient-tray-page ${dir < 0 ? 'prev' : 'next'}`;
    button.setAttribute('aria-label', dir < 0 ? 'Earlier ingredients' : 'Later ingredients');
    button.textContent = dir < 0 ? '‹' : '›';
    button.addEventListener('click', () => list.scrollBy({ left: dir * list.clientWidth * .75, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }));
    ribbon.append(button);
    return button;
  });
  function edges() {
    const left = list.scrollLeft > 2, right = list.scrollLeft < list.scrollWidth - list.clientWidth - 2;
    arrows[0].hidden = !left; arrows[1].hidden = !right;
    ribbon.classList.toggle('more-left', left); ribbon.classList.toggle('more-right', right);
  }
  list.addEventListener('scroll', edges, { passive: true });
  ribbon.append(list); sheet.append(heading, ribbon);
  frame.append(glass, sheet);
  function close(restore = true) {
    sheet.hidden = true; delete glass.dataset.on;
    anchor?.setAttribute('aria-expanded', 'false');
    if (restore) anchor?.focus({ preventScroll: true });
  }
  frame.addEventListener('click', e => {
    const target = e.target.closest('.sg-pick');
    if (!target || !frame.contains(target)) return;
    e.preventDefault(); e.stopImmediatePropagation(); anchor = target;
    if (!sheet.hidden) { close(); return; }
    const layer = frame.querySelector('.sg-ui');
    if (layer && sheet.parentElement !== layer) layer.append(glass, sheet);
    tiles.forEach((tile, i) => tile.setAttribute('aria-pressed', String(choices[i][0] === get())));
    tellCurrent(); sheet.hidden = false; glass.dataset.on = '';
    anchor.setAttribute('aria-haspopup', 'dialog'); anchor.setAttribute('aria-expanded', 'true');
    const selected = tiles[Math.max(0, choices.findIndex(c => c[0] === get()))];
    centre(selected); edges(); selected.focus({ preventScroll: true });
  }, true);
  sheet.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key) || !tiles.includes(document.activeElement)) return;
    e.preventDefault(); e.stopPropagation();
    const i = tiles.indexOf(document.activeElement);
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? tiles.length - 1 : Math.max(0, Math.min(tiles.length - 1, i + (e.key === 'ArrowRight' ? 1 : -1)));
    tiles[next].focus({ preventScroll: true }); centre(tiles[next]);
  });
  document.addEventListener('pointerdown', e => {
    if (!sheet.hidden && !sheet.contains(e.target) && !anchor?.contains(e.target)) close(false);
  }, true);
  list.addEventListener('wheel', e => {
    if (list.scrollWidth <= list.clientWidth) return;
    e.preventDefault(); list.scrollLeft += Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
  }, { passive: false });
  let drag = null, dragged = false;
  list.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button === 0) { drag = { id: e.pointerId, x: e.clientX, scroll: list.scrollLeft }; dragged = false; }
  });
  list.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    if (!dragged && Math.abs(dx) < 8) return;
    if (!dragged) { dragged = true; list.setPointerCapture(e.pointerId); list.classList.add('is-dragging'); }
    list.scrollLeft = drag.scroll - dx;
  });
  function endDrag(e) {
    if (!drag || e.pointerId !== drag.id) return;
    drag = null; list.classList.remove('is-dragging');
    if (dragged) setTimeout(() => { dragged = false; }, 0);
  }
  list.addEventListener('pointerup', endDrag);
  list.addEventListener('pointercancel', endDrag);
  list.addEventListener('lostpointercapture', endDrag);
}
