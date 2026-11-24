// Star catalog: the star card. It shows when the zoom settles on the full star.
// Three styles (Tom, 2026-11-24); Dev picks one.
// intro: the name flashes in a white box and opens, as the intro's title does;
// the type and the facts wipe on behind a white bar, a line at a time.
// stamp: the name sits in a white box with a hard offset shadow.
// caption: Frietkot's typed camcorder caption.

const RM = matchMedia('(prefers-reduced-motion: reduce)');
// The card holds this long after its last line, in ms.
const HOLD = 6000;
// One film frame at the menu's 30 fps, in ms.
const FRAME = 1000 / 30;
export const CARD_STYLES = [['intro', 'Intro'], ['stamp', 'Stamp'], ['caption', 'Caption']];

const h = (tag, cls, text) => {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text != null) el.textContent = text;
  return el;
};

/**
 * Builds the star card on the stage.
 * @param {{ stage: HTMLElement }} o
 */
export function makeCard(o) {
  const link = h('link');
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

  // The intro and stamp parts: the name, the type, the formal name, then label and value rows.
  function build(c) {
    const name = h('p', 'c-name', c.name);
    const type = h('p', 'c-type', c.type);
    const latin = c.latin ? h('p', 'c-latin', c.latin) : null;
    const rows = c.rows.map(([k, v]) => {
      const r = h('p', 'c-row');
      r.append(h('span', 'c-k', k), h('span', 'c-v', v));
      return r;
    });
    const facts = h('div', 'c-facts');
    facts.append(...rows);
    box.append(...[name, type, latin, facts].filter(Boolean));
    return { name, lines: [type, latin, ...rows].filter(Boolean) };
  }

  // Intro: the name flashes white, then opens; each line wipes on behind a bar.
  function intro({ name, lines }) {
    [name, ...lines].forEach(el => el.classList.add('is-shut'));
    later(() => { name.classList.remove('is-shut'); name.classList.add('is-flash'); }, 0);
    later(() => name.classList.remove('is-flash'), 7 * FRAME);
    let at = 11 * FRAME;
    for (const el of lines) {
      later(() => { el.classList.remove('is-shut'); el.classList.add('is-wipe'); }, at);
      later(() => el.classList.remove('is-wipe'), at + 3 * FRAME);
      at += 3 * FRAME;
    }
    later(fade, at + HOLD);
  }
  // Stamp: the box lands in three frames, then the lines come on.
  function stamp({ name, lines }) {
    [name, ...lines].forEach(el => el.classList.add('is-shut'));
    later(() => { name.classList.remove('is-shut'); name.classList.add('is-land'); }, 0);
    let at = 6 * FRAME;
    for (const el of lines) { later(() => el.classList.remove('is-shut'), at); at += 2 * FRAME; }
    later(fade, at + HOLD);
  }
  // The caption's lines: the name, the type and formal name, then rows padded so values line up.
  const captionLines = c => [
    [c.name, 'e1'], ...[c.type, c.latin].filter(Boolean).map(t => [t, 'e2']),
    ...c.rows.map(([k, v]) => [`${k.padEnd(11)}${v}`, 'e2 e3']),
  ];
  // Caption: each line types on in the monospace face, the name slowly and the facts fast.
  function caption(c) {
    const cl = captionLines(c), text = cl.map(([t]) => t);
    const lines = cl.map(([, cls]) => box.appendChild(h('p', cls)));
    const cur = h('span', 'cur', '█');
    let li = 0, ci = 0;
    const type = () => {
      lines[li].textContent = text[li].slice(0, ++ci);
      lines[li].append(cur);
      if (ci < text[li].length) return later(type, li === 0 ? 40 + Math.random() * 30 : 14 + Math.random() * 10);
      if (++li < lines.length) { ci = 0; return later(type, li === 1 ? 260 : 90); }
      later(() => cur.remove(), 1600);
      later(fade, HOLD);
    };
    type();
  }

  // Our Sun at the same scale as the star on screen, above the card (Tom, 2026-11-24).
  // d is its diameter in CSS pixels; max is the room above the card; view is the stage's height.
  // Too small to draw, it is a dot; too large for the room, the top of its circle, still to scale.
  function sunMark({ d, max, view }) {
    const el = h('div', 'c-sun');
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    const ring = document.createElementNS(NS, 'circle');
    let w, ht, note;
    if (d < 4) {
      w = ht = 6; note = 'the Sun, a speck at this scale';
      Object.entries({ cx: 3, cy: 3, r: 2.2, class: 'c-sun-dot' }).forEach(([k, v]) => ring.setAttribute(k, v));
    } else if (d <= max) {
      w = ht = d + 2; note = 'the Sun, to scale';
      Object.entries({ cx: w / 2, cy: ht / 2, r: d / 2 }).forEach(([k, v]) => ring.setAttribute(k, v));
    } else {
      // The arc: the top of a circle too large to fit, still at its true curve.
      w = Math.min(max * 1.6, 300); ht = Math.min(max, d / 2) * 0.45;
      Object.entries({ cx: w / 2, cy: d / 2 + 1, r: d / 2 }).forEach(([k, v]) => ring.setAttribute(k, v));
      note = d > view ? 'the Sun, wider than this view' : 'the Sun, to scale';
      svg.style.overflow = 'hidden';
    }
    svg.setAttribute('width', w); svg.setAttribute('height', ht);
    svg.setAttribute('viewBox', `0 0 ${w} ${ht}`);
    svg.append(ring);
    el.append(svg, h('span', 'c-sun-k', note));
    return el;
  }

  return {
    /**
     * @param {{ name: string, type: string, latin: string | null, rows: [string, string][] }} c
     * @param {string} style One of CARD_STYLES.
     * @param {{ d: number, max: number } | null} sun Our Sun's size on screen, or null.
     */
    show(c, style = 'intro', sun = null) {
      clear();
      box = h('div', `sl-card sl-card--${style}`);
      box.setAttribute('aria-hidden', 'true');
      o.stage.append(box);
      // The Sun's outline appears a beat after the card starts.
      if (sun) {
        const mark = sunMark(sun);
        box.append(mark);
        if (!RM.matches) { mark.classList.add('is-shut'); later(() => mark.classList.remove('is-shut'), 300); }
      }
      if (style === 'caption') {
        if (RM.matches) { for (const [t, cls] of captionLines(c)) box.append(h('p', cls, t)); later(fade, HOLD); }
        else caption(c);
        return;
      }
      const parts = build(c);
      if (RM.matches) { later(fade, HOLD); return; }
      if (style === 'stamp') stamp(parts); else intro(parts);
    },
    fade,
    clear,
  };
}
