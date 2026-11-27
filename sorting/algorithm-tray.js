// Short descriptions follow the generators in algos.js.
const ABOUT = {
  bubble: 'Compare neighbours; larger rods bubble right on each pass.',
  cocktail: 'Bubble in both directions, moving extremes to both ends.',
  oddeven: 'Alternate odd and even neighbour pairs until none swap.',
  comb: 'Compare rods across a shrinking gap, then finish with neighbours.',
  gnome: 'Walk forward when neighbours are ordered; step back after a swap.',
  circle: 'Compare from the ends inward, then repeat within each half.',
  insertion: 'Take each rod and insert it into the sorted section.',
  binary: 'Use binary search to find each rod’s place in the sorted section.',
  shell: 'Sort rods far apart first, then reduce the gap to one.',
  selection: 'Find the shortest remaining rod and put it next in line.',
  double: 'Find both extremes and place them at opposite ends.',
  cycle: 'Count smaller rods to find each rod’s final position.',
  pancake: 'Flip sections from the front to move the tallest rod into place.',
  merge: 'Split the row into halves, then merge the sorted halves.',
  bottomup: 'Merge neighbouring runs of one, then two, then four rods.',
  natural: 'Find runs already in order and merge neighbouring runs.',
  quick: 'Choose a pivot, partition around it, then sort each side.',
  hoare: 'Scan inward from both ends, swapping rods across a pivot.',
  dualpivot: 'Use two pivots to divide the row into three sections.',
  threeway: 'Divide rods into groups below, equal to and above a pivot.',
  intro: 'Start with quicksort; switch to heap sort if partitions run deep.',
  heap: 'Build a heap, then move its largest rod to the end repeatedly.',
  ternary: 'Use a heap with up to three children per parent.',
  radix: 'Group by base-four digits, starting with the least significant digit.',
  msd: 'Group by base-four digits, starting with the most significant digit.',
  bitonic: 'Sort halves in opposite directions, then merge them with fixed comparisons.',
  batcher: 'Merge ordered runs with a fixed pattern of odd and even comparisons.',
  stooge: 'Sort overlapping two-thirds sections three times. Very slow.',
  slow: 'Recursively find the largest rod, place it last, and repeat. Very slow.',
};

// Preview frames come from the same generators as the toy.
function preview(algorithm) {
  const values = [5, 1, 9, 3, 7, 0, 10, 4, 8, 2, 11, 6];
  const steps = algorithm(values);
  const well = document.createElement('span');
  well.className = 'sort-algo-well';
  for (let f = 0; f < 7; f++) {
    let step;
    for (let i = 0; i < 10; i++) {
      const result = steps.next();
      if (result.done) break;
      step = result.value;
    }
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('aria-hidden', 'true');
    svg.classList.add('sort-algo-frame');
    svg.style.setProperty('--frame', f);
    values.forEach((v, i) => {
      const bar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      const height = 12 + v * 5.8;
      bar.setAttribute('x', String(5 + i * 7.6));
      bar.setAttribute('y', String(86 - height));
      bar.setAttribute('width', '5');
      bar.setAttribute('height', String(height));
      bar.setAttribute('rx', '2.5');
      const active = step && (i === step.i || i === step.j || i === step.to || i === step.from);
      bar.setAttribute('fill', active ? '#fff' : `oklch(${0.58 + v * 0.015} 0.16 ${275 + v * 13})`);
      svg.append(bar);
    });
    well.append(svg);
  }
  return well;
}

export function makeAlgorithmTray(frame, list, algorithms, get, pick) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = new URL('algorithm-tray.css', import.meta.url).href;
  document.head.append(link);
  const glass = document.createElement('div');
  glass.className = 'sort-algo-glass';
  const sheet = document.createElement('section');
  sheet.className = 'sort-algo-tray';
  sheet.hidden = true;
  sheet.id = 'sorting-algorithms';
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-label', 'Choose an algorithm');
  const info = document.createElement('div');
  info.className = 'sort-algo-info';
  info.setAttribute('aria-live', 'polite');
  const name = document.createElement('strong');
  const description = document.createElement('span');
  info.append(name, description);
  const ribbon = document.createElement('div');
  ribbon.className = 'sort-algo-ribbon';
  const viewport = document.createElement('div');
  viewport.className = 'sort-algo-viewport';
  const arrows = [-1, 1].map(dir => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `sort-algo-page ${dir < 0 ? 'prev' : 'next'}`;
    button.textContent = dir < 0 ? '‹' : '›';
    button.setAttribute('aria-label', dir < 0 ? 'Earlier algorithms' : 'Later algorithms');
    button.hidden = true;
    button.addEventListener('click', () => springTo(nearest((goal ?? pos) + dir * ribbon.clientWidth * .75)));
    return button;
  });
  viewport.append(arrows[0], ribbon, arrows[1]);
  const buttons = [];
  let group, row;
  for (const [value, label, family, key] of list) {
    if (family !== group) {
      group = family;
      const section = document.createElement('div');
      section.className = 'sort-algo-group';
      const heading = document.createElement('div');
      heading.className = 'sort-algo-family';
      heading.textContent = family;
      row = document.createElement('div');
      row.className = 'sort-algo-row';
      section.append(heading, row);
      ribbon.append(section);
    }
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'sort-algo-tile';
    const caption = document.createElement('span');
    caption.className = 'sort-algo-name';
    caption.textContent = label;
    button.append(preview(algorithms[value]), caption);
    button.setAttribute('aria-label', `${label}. ${ABOUT[value]}${key ? ` Key ${key}.` : ''}`);
    button.addEventListener('pointerenter', () => tell(value));
    button.addEventListener('pointerleave', () => tell(get()));
    button.addEventListener('focus', () => tell(value));
    button.addEventListener('click', e => { if (dragged) { e.preventDefault(); return; } pick(value); close(true); });
    row.append(button);
    buttons.push({ button, value, label });
  }
  sheet.append(info, viewport);
  frame.append(glass, sheet);
  let opener = null;
  let drag = null, dragged = false, touching = false, wheelTimer = 0;
  let pos = 0, velocity = 0, goal = null, animation = 0, last = 0, centres = [];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const max = () => Math.max(0, ribbon.scrollWidth - ribbon.clientWidth);
  const clamp = x => Math.max(0, Math.min(max(), x));
  function setPos(x) { pos = clamp(x); ribbon.scrollLeft = pos; }
  function measure() {
    const r = ribbon.getBoundingClientRect();
    centres = buttons.map(({ button }) => {
      const b = button.getBoundingClientRect();
      return clamp(ribbon.scrollLeft + b.left + b.width / 2 - r.left - r.width / 2);
    });
  }
  function nearest(x) { return centres.reduce((a, c) => Math.abs(c - x) < Math.abs(a - x) ? c : a, centres[0] ?? x); }
  function stop() { cancelAnimationFrame(animation); animation = 0; goal = null; velocity = 0; }
  function tick(now) {
    const dt = Math.min(32, now - last); last = now;
    for (let i = 0; i < 4; i++) {
      const h = dt / 4;
      velocity += (-.000256 * (pos - goal) - .032 * velocity) * h;
      pos += velocity * h;
    }
    if (Math.abs(pos - goal) < .3 && Math.abs(velocity) < .01) { setPos(goal); stop(); return; }
    setPos(pos);
    animation = requestAnimationFrame(tick);
  }
  function springTo(x, speed = velocity) {
    goal = clamp(x); velocity = speed;
    if (reducedMotion.matches) { setPos(goal); stop(); return; }
    if (!animation) { last = performance.now(); animation = requestAnimationFrame(tick); }
  }
  function centre(button, smooth = true) {
    const b = button.getBoundingClientRect(), r = ribbon.getBoundingClientRect();
    const x = ribbon.scrollLeft + b.left + b.width / 2 - r.left - r.width / 2;
    if (smooth) springTo(x); else { stop(); setPos(x); }
  }
  function edges() {
    const left = ribbon.scrollLeft > 2, right = ribbon.scrollLeft < max() - 2;
    arrows[0].hidden = !left; arrows[1].hidden = !right;
    viewport.classList.toggle('more-left', left); viewport.classList.toggle('more-right', right);
  }
  function tell(value) {
    name.textContent = buttons.find(item => item.value === value)?.label || '';
    description.textContent = ABOUT[value] || '';
  }
  function close(focus) {
    stop(); clearTimeout(wheelTimer);
    sheet.hidden = true;
    delete glass.dataset.on;
    opener?.setAttribute('aria-expanded', 'false');
    if (focus) opener?.focus({ preventScroll: true });
  }
  frame.addEventListener('click', e => {
    const target = e.target.closest('.sg-pick');
    if (!target || !frame.contains(target)) return;
    e.preventDefault(); e.stopImmediatePropagation();
    opener = target;
    opener.setAttribute('aria-haspopup', 'dialog');
    opener.setAttribute('aria-controls', sheet.id);
    if (!sheet.hidden) { close(true); return; }
    const layer = frame.querySelector('.sg-ui');
    if (layer && sheet.parentElement !== layer) layer.append(glass, sheet);
    buttons.forEach(item => item.button.setAttribute('aria-pressed', String(item.value === get())));
    tell(get());
    sheet.hidden = false;
    glass.dataset.on = '';
    opener.setAttribute('aria-expanded', 'true');
    const selected = buttons.find(item => item.value === get())?.button || buttons[0].button;
    measure(); centre(selected, false); edges();
    selected.focus({ preventScroll: true });
  }, true);
  sheet.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); return; }
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault(); e.stopPropagation();
    const i = buttons.findIndex(item => item.button === document.activeElement);
    const index = e.key === 'Home' ? 0 : e.key === 'End' ? buttons.length - 1 : Math.max(0, Math.min(buttons.length - 1, i + (e.key === 'ArrowRight' ? 1 : -1)));
    const next = buttons[index].button;
    next.focus({ preventScroll: true });
    centre(next);
  });
  document.addEventListener('pointerdown', e => {
    if (!sheet.hidden && !sheet.contains(e.target) && !opener?.contains(e.target)) close(false);
  }, true);
  ribbon.addEventListener('scroll', () => { if (!animation && !drag) pos = ribbon.scrollLeft; edges(); }, { passive: true });
  ribbon.addEventListener('scrollend', () => { if (touching && !animation && !drag) springTo(nearest(ribbon.scrollLeft), 0); });
  new ResizeObserver(() => { if (!sheet.hidden) { measure(); edges(); } }).observe(ribbon);
  ribbon.addEventListener('wheel', e => {
    if (max() <= 0) return;
    e.preventDefault(); touching = false;
    const scale = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? ribbon.clientWidth : 1;
    springTo((goal ?? pos) + (Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX) * scale);
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(() => springTo(nearest(goal ?? pos)), 160);
  }, { passive: false });
  ribbon.addEventListener('pointerdown', e => {
    touching = e.pointerType !== 'mouse'; stop(); clearTimeout(wheelTimer); pos = ribbon.scrollLeft;
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    drag = { id: e.pointerId, x: e.clientX, start: pos, samples: [[e.timeStamp, e.clientX]] };
    dragged = false;
  });
  ribbon.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    if (!dragged && Math.abs(dx) < 8) return;
    if (!dragged) { dragged = true; ribbon.setPointerCapture(e.pointerId); ribbon.classList.add('is-dragging'); }
    setPos(drag.start - dx);
    drag.samples.push([e.timeStamp, e.clientX]);
    while (drag.samples.length > 2 && e.timeStamp - drag.samples[0][0] > 100) drag.samples.shift();
  });
  function endDrag(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const samples = drag.samples, a = samples[0], z = samples[samples.length - 1];
    drag = null; ribbon.classList.remove('is-dragging');
    if (!dragged) return;
    setTimeout(() => { dragged = false; }, 0);
    const speed = e.timeStamp - z[0] > 80 || z[0] === a[0] ? 0 : -(z[1] - a[1]) / (z[0] - a[0]);
    springTo(nearest(pos + speed * 260), speed);
  }
  ribbon.addEventListener('pointerup', endDrag);
  ribbon.addEventListener('pointercancel', endDrag);
  ribbon.addEventListener('lostpointercapture', endDrag);
}
