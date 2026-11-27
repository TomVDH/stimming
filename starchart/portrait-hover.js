import { STARS } from './sun.js';

// Paired scene times close each two-minute hover loop without a seam.
export function attachPortraitHover(ribbon, studio) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const events = new AbortController();
  const options = { signal: events.signal };
  let active, intended, raf = 0, start = 0, last = 0, idle = 0, disposed = false;
  const stop = () => {
    cancelAnimationFrame(raf); raf = 0;
    clearTimeout(idle);
    active?.classList.remove('is-spinning');
    studio?.canvas.remove();
    active = null; intended = null;
  };
  const tick = now => {
    if (!active || document.hidden || reduced.matches || disposed || ribbon.dataset.mode === 'glyph') { stop(); return; }
    if (now - last >= 50) {
      try { if (!studio.draw(active.dataset.id, now - start)) { stop(); return; } }
      catch (error) { console.error('Star Chart hover:', error); stop(); return; }
      last = now;
    }
    raf = requestAnimationFrame(tick);
  };
  const wake = () => { clearTimeout(idle); idle = setTimeout(stop, 60000); };
  const begin = tile => {
    if (!tile || STARS[tile.dataset.id].hole || reduced.matches || document.hidden || ribbon.dataset.mode === 'glyph') { stop(); return; }
    if (active === tile || intended === tile) { if (active) wake(); return; }
    stop(); intended = tile;
    try {
      if (intended !== tile || disposed || reduced.matches || document.hidden) return;
      active = tile; start = performance.now(); last = start;
      studio.canvas.setAttribute('aria-hidden', 'true');
      if (!studio.draw(tile.dataset.id, 0)) { stop(); return; }
      tile.querySelector('.portrait').append(studio.canvas);
      tile.classList.add('is-spinning');
      wake(); raf = requestAnimationFrame(tick);
    } catch (error) { console.error('Star Chart hover:', error); stop(); }
  };
  const tileAt = target => target instanceof Element ? target.closest('.body') : null;
  ribbon.addEventListener('pointerover', e => { const tile = tileAt(e.target); if (tile !== tileAt(e.relatedTarget)) begin(tile); }, options);
  ribbon.addEventListener('pointermove', e => { const tile = tileAt(e.target); if (tile === active) wake(); else if (!active) begin(tile); }, options);
  ribbon.addEventListener('pointerleave', stop, options);
  ribbon.addEventListener('focusin', e => begin(tileAt(e.target)), options);
  ribbon.addEventListener('focusout', e => { if (tileAt(e.relatedTarget) !== active) stop(); }, options);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); }, options);
  reduced.addEventListener('change', stop, options);
  const modes = new MutationObserver(() => { if (ribbon.dataset.mode === 'glyph') stop(); });
  modes.observe(ribbon, { attributes: true, attributeFilter: ['data-mode'] });
  const existing = ribbon.querySelector('.body:hover, .body:focus-visible');
  if (existing) begin(existing);
  return () => { disposed = true; stop(); modes.disconnect(); events.abort(); studio?.dispose(); };
}
