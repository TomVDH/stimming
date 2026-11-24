// Solar loop: the star card, typed on as Frietkot's establishing title is.
// The toy shows it when the zoom settles on the full star.

const RM = matchMedia('(prefers-reduced-motion: reduce)');
// The card holds this long after its last letter, in ms.
const HOLD = 6000;

/**
 * Builds the star card on the stage.
 * @param {{ stage: HTMLElement }} o
 */
export function makeCard(o) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = new URL('card.css', import.meta.url).href;
  document.head.append(link);

  let box = null;
  const timers = new Set();
  const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); };
  function stop() { for (const t of timers) clearTimeout(t); timers.clear(); }
  // Removes the card at once.
  function clear() { stop(); box?.remove(); box = null; }
  // Fades the card out, as when the view leaves the full star.
  function fade() {
    if (!box) return;
    stop();
    const el = box;
    el.classList.add('out');
    later(() => { if (box === el) clear(); }, 1400);
  }
  return {
    /** @param {{ head: string[], rows: string[] }} card The name lines, then one fact per row. */
    show({ head, rows }) {
      const text = [...head, ...rows];
      clear();
      box = document.createElement('div');
      box.className = 'sl-card';
      box.setAttribute('aria-hidden', 'true');
      const lines = text.map((t, i) => { const p = document.createElement('p'); p.className = i === 0 ? 'e1' : i < head.length ? 'e2' : 'e2 e3'; box.append(p); return p; });
      o.stage.append(box);
      const hold = () => later(fade, HOLD);
      if (RM.matches) { lines.forEach((p, i) => (p.textContent = text[i])); hold(); return; }
      const cur = document.createElement('span');
      cur.className = 'cur';
      cur.textContent = '█';
      let li = 0, ci = 0;
      const type = () => {
        const p = lines[li];
        p.textContent = text[li].slice(0, ++ci);
        p.append(cur);
        // The name types at a steady hand; the facts run fast.
        if (ci < text[li].length) return later(type, li === 0 ? 40 + Math.random() * 30 : 14 + Math.random() * 10);
        if (++li < lines.length) { ci = 0; return later(type, li === 1 ? 260 : 90); }
        later(() => cur.remove(), 1600);
        hold();
      };
      type();
    },
    fade,
    clear,
  };
}
