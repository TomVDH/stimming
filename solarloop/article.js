// Star catalog: the article, a short read on the object (Tom, 2026-11-24).
// The second i opens it; i, Escape or the close button shuts it.
// The text is our own, its facts checked against the Wikipedia article it links.

import { ARTICLES } from './articles.js';

const RM = matchMedia('(prefers-reduced-motion: reduce)');

const h = (tag, cls, text) => {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text != null) el.textContent = text;
  return el;
};

/**
 * Builds the article panel on the stage.
 * @param {{ stage: HTMLElement }} o
 */
export function makeArticle(o) {
  const link = h('link');
  link.rel = 'stylesheet';
  link.href = new URL('article.css', import.meta.url).href;
  document.head.append(link);

  let box = null;
  let shown = null;
  function close() {
    if (!box) return;
    const el = box;
    box = null; shown = null;
    if (RM.matches) { el.remove(); return; }
    el.classList.add('out');
    setTimeout(() => el.remove(), 400);
  }

  /**
   * @param {string} id The object's id.
   * @param {{ name: string, type: string, wiki: string | null }} c The card's name and type, and the source.
   */
  function open(id, c) {
    close();
    const a = ARTICLES[id];
    box = h('aside', 'sl-art');
    box.setAttribute('aria-label', `${c.name}: article`);
    // The stage's taps and drags stay off the panel.
    for (const ev of ['pointerdown', 'wheel']) box.addEventListener(ev, e => e.stopPropagation());
    const shut = h('button', 'a-close', '×');
    shut.type = 'button';
    shut.setAttribute('aria-label', 'Close the article');
    shut.addEventListener('click', close);
    box.append(shut);
    if (a?.photo) {
      const fig = h('figure', 'a-photo');
      const img = h('img');
      img.src = new URL(a.photo.src, import.meta.url).href;
      img.alt = a.photo.alt ?? '';
      img.decoding = 'async';
      fig.append(img, h('figcaption', null, a.photo.credit));
      box.append(fig);
    }
    box.append(h('h2', 'a-name', c.name), h('p', 'a-type', c.type));
    for (const para of (a?.text ?? '').split('\n\n').filter(Boolean)) box.append(h('p', 'a-text', para));
    if (c.wiki) {
      const src = h('p', 'a-src');
      const at = h('a', null, 'Wikipedia ↗');
      at.href = c.wiki; at.target = '_blank'; at.rel = 'noopener';
      src.append('Facts checked against ', at);
      box.append(src);
    }
    o.stage.append(box);
    shown = id;
    if (!RM.matches) requestAnimationFrame(() => box?.classList.add('in'));
    else box.classList.add('in');
  }

  return { open, close, isOpen: () => !!box, get shown() { return shown; } };
}
