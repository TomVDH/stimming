import { BILLS, type BillId } from './bills.ts';

type Pick = BillId | 'mix';

export function makeBillTray(frame: HTMLElement, get: () => Pick, pick: (id: Pick) => void, glyph: (symbol: string, color: string) => string, allIcon: string) {
  const glass = document.createElement('div');
  glass.className = 'cash-tray-glass';
  const sheet = document.createElement('section');
  sheet.className = 'sg-sheet cash-tray';
  sheet.hidden = true;
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-label', 'Choose a bill');
  const heading = document.createElement('div');
  heading.className = 'cash-tray-heading';
  heading.setAttribute('aria-live', 'polite');
  const ribbon = document.createElement('div');
  ribbon.className = 'cash-tray-ribbon';
  const list = document.createElement('div');
  list.className = 'cash-tray-list';
  const choices = [{ id: 'mix' as const, label: 'All bills', title: 'Mixed' }, ...BILLS];
  let anchor: HTMLElement | null = null;
  let dragged = false;
  const tiles = choices.map((bill, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cash-tray-tile';
    button.setAttribute('aria-label', `${bill.label}, ${bill.title}`);
    const well = document.createElement('span');
    well.className = 'cash-tray-well';
    if ('frontUrl' in bill) {
      const img = document.createElement('img');
      img.src = bill.frontUrl;
      img.alt = '';
      img.draggable = false;
      well.append(img);
    } else {
      well.classList.add('cash-tray-mix');
      for (const note of BILLS.slice(0, 3)) {
        const img = document.createElement('img');
        img.src = note.frontUrl;
        img.alt = '';
        img.draggable = false;
        well.append(img);
      }
    }
    const name = document.createElement('span');
    name.className = 'cash-tray-name';
    name.textContent = bill.label;
    const mark = document.createElement('span');
    mark.className = 'cash-tray-glyph';
    mark.setAttribute('aria-hidden', 'true');
    mark.innerHTML = 'glyph' in bill ? glyph(bill.glyph, bill.glyphColor) : allIcon;
    button.append(well, mark, name);
    button.addEventListener('click', e => { if (dragged) { e.preventDefault(); return; } pick(bill.id); close(); });
    button.addEventListener('pointerenter', () => tell(i));
    button.addEventListener('pointerleave', () => tellCurrent());
    button.addEventListener('focus', () => tell(i));
    list.append(button);
    return button;
  });
  function tell(i: number) {
    heading.replaceChildren();
    const name = document.createElement('b');
    name.textContent = choices[i].label;
    const detail = document.createElement('span');
    detail.textContent = choices[i].title;
    heading.append(name, detail);
  }
  function tellCurrent() { tell(Math.max(0, choices.findIndex(b => b.id === get()))); }
  function sync() { tiles.forEach((tile, i) => tile.setAttribute('aria-pressed', String(choices[i].id === get()))); }
  function close(restore = true) {
    stop();
    sheet.hidden = true;
    glass.removeAttribute('data-on');
    anchor?.setAttribute('aria-expanded', 'false');
    if (restore) anchor?.focus({ preventScroll: true });
  }
  const arrows: HTMLButtonElement[] = [];
  for (const [dir, label] of [[-1, 'Earlier bills'], [1, 'Later bills']] as const) {
    const arrow = document.createElement('button');
    arrow.type = 'button';
    arrow.className = `cash-tray-page ${dir < 0 ? 'prev' : 'next'}`;
    arrow.setAttribute('aria-label', label);
    arrow.textContent = dir < 0 ? '‹' : '›';
    arrow.tabIndex = -1;
    arrow.addEventListener('click', () => springTo(nearest((goal ?? pos) + dir * list.clientWidth * 0.75)));
    ribbon.append(arrow);
    arrows.push(arrow);
  }
  ribbon.append(list);
  sheet.append(heading, ribbon);
  frame.append(glass, sheet);
  let pos = 0, velocity = 0, goal: number | null = null, animation = 0, last = 0;
  let centres: number[] = [];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const max = () => Math.max(0, list.scrollWidth - list.clientWidth);
  const clamp = (x: number) => Math.max(0, Math.min(max(), x));
  function setPos(x: number) { pos = clamp(x); list.scrollLeft = pos; }
  function measure() {
    const l = list.getBoundingClientRect();
    centres = tiles.map(tile => { const r = tile.getBoundingClientRect(); return clamp(list.scrollLeft + r.left + r.width / 2 - l.left - l.width / 2); });
  }
  function nearest(x: number) { return centres.reduce((a, c) => Math.abs(c - x) < Math.abs(a - x) ? c : a, centres[0] ?? x); }
  function stop() { cancelAnimationFrame(animation); animation = 0; goal = null; velocity = 0; }
  function tick(now: number) {
    const dt = Math.min(32, now - last); last = now;
    for (let i = 0; i < 4; i++) { const h = dt / 4; velocity += (-0.000256 * (pos - goal!) - 0.032 * velocity) * h; pos += velocity * h; }
    if (Math.abs(pos - goal!) < .3 && Math.abs(velocity) < .01) { setPos(goal!); stop(); return; }
    setPos(pos); animation = requestAnimationFrame(tick);
  }
  function springTo(x: number, v = velocity) {
    goal = clamp(x); velocity = v;
    if (reducedMotion.matches) { setPos(goal); stop(); return; }
    if (!animation) { last = performance.now(); animation = requestAnimationFrame(tick); }
  }
  function centre(tile: HTMLElement, smooth = true) {
    const r = tile.getBoundingClientRect(), l = list.getBoundingClientRect();
    const x = list.scrollLeft + r.left + r.width / 2 - l.left - l.width / 2;
    if (smooth) springTo(x); else { stop(); setPos(x); }
  }
  function edges() {
    const left = list.scrollLeft > 2, right = list.scrollLeft < max() - 2;
    arrows[0].hidden = !left; arrows[1].hidden = !right;
    ribbon.classList.toggle('more-left', left); ribbon.classList.toggle('more-right', right);
  }
  let drag: { x: number; start: number; id: number; samples: [number, number][] } | null = null;
  let touching = false, wheelTimer = 0;
  list.addEventListener('scroll', () => { if (!animation && !drag) pos = list.scrollLeft; edges(); }, { passive: true });
  list.addEventListener('scrollend', () => { if (touching && !animation && !drag) springTo(nearest(list.scrollLeft), 0); });
  new ResizeObserver(() => { measure(); edges(); }).observe(list);
  list.addEventListener('wheel', e => {
    e.preventDefault(); touching = false;
    const scale = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? list.clientWidth : 1;
    springTo((goal ?? pos) + (Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX) * scale);
    clearTimeout(wheelTimer); wheelTimer = window.setTimeout(() => springTo(nearest(goal ?? pos)), 160);
  }, { passive: false });
  list.addEventListener('pointerdown', e => {
    touching = e.pointerType !== 'mouse'; stop(); clearTimeout(wheelTimer); pos = list.scrollLeft;
    if (e.pointerType === 'mouse' && e.button === 0) { drag = { x: e.clientX, start: pos, id: e.pointerId, samples: [[e.timeStamp, e.clientX]] }; dragged = false; }
  });
  list.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    if (!dragged && Math.abs(dx) < 8) return;
    if (!dragged) { dragged = true; list.setPointerCapture(e.pointerId); list.classList.add('is-dragging'); }
    setPos(drag.start - dx); drag.samples.push([e.timeStamp, e.clientX]);
    while (drag.samples.length > 2 && e.timeStamp - drag.samples[0][0] > 100) drag.samples.shift();
  });
  function endDrag(e: PointerEvent) {
    if (!drag || e.pointerId !== drag.id) return;
    const samples = drag.samples, a = samples[0], z = samples[samples.length - 1];
    drag = null; list.classList.remove('is-dragging');
    if (!dragged) return;
    setTimeout(() => { dragged = false; }, 0);
    const v = e.timeStamp - z[0] > 80 || z[0] === a[0] ? 0 : -(z[1] - a[1]) / (z[0] - a[0]);
    springTo(nearest(pos + v * 260), v);
  }
  list.addEventListener('pointerup', endDrag); list.addEventListener('pointercancel', endDrag); list.addEventListener('lostpointercapture', endDrag);
  frame.addEventListener('click', e => {
    const target = (e.target as Element).closest<HTMLElement>('.sg-pick');
    if (!target || !frame.contains(target)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    anchor = target;
    if (!sheet.hidden) { close(); return; }
    const layer = frame.querySelector<HTMLElement>('.sg-ui');
    if (layer && sheet.parentElement !== layer) layer.append(glass, sheet);
    sync(); tellCurrent();
    sheet.hidden = false;
    if (layer) glass.style.height = `${Math.round(layer.getBoundingClientRect().bottom - sheet.getBoundingClientRect().top + 70)}px`;
    glass.setAttribute('data-on', '');
    target.setAttribute('aria-haspopup', 'dialog');
    target.setAttribute('aria-expanded', 'true');
    const selected = tiles[Math.max(0, choices.findIndex(b => b.id === get()))];
    measure(); centre(selected, false); edges();
    selected.focus({ preventScroll: true });
  }, true);
  sheet.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault(); e.stopPropagation();
    const i = Math.max(0, tiles.indexOf(document.activeElement as HTMLButtonElement));
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? tiles.length - 1 : Math.max(0, Math.min(tiles.length - 1, i + (e.key === 'ArrowRight' ? 1 : -1)));
    tiles[next].focus({ preventScroll: true });
    centre(tiles[next]);
  });
  document.addEventListener('pointerdown', e => {
    if (!sheet.hidden && !sheet.contains(e.target as Node) && !anchor?.contains(e.target as Node)) close(false);
  }, true);
  return { sync, get isOpen() { return !sheet.hidden; } };
}
