// Star catalog: the article, a short read on the object (Tom, 2026-11-24).
// The second i opens it; i, Escape or its close hint shuts it.
// The text is our own, its facts checked against the Wikipedia article it links.
// It speaks the card's language (Tom, 2026-11-24): no box, the name flashes, each line wipes on.
// It stands in the view's open sky, as the card does: setView names the view.

import { ARTICLES } from './articles.js';

const RM = matchMedia('(prefers-reduced-motion: reduce)');
// One film frame at 30 fps, in ms.
const FRAME = 1000 / 30;

// The 4 x 4 Bayer matrix, as thresholds from 0 to 1.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
// One dither dot spans this many CSS pixels, so the pattern reads as a print.
const DOT = 2;

const h = (tag, cls, text) => {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text != null) el.textContent = text;
  return el;
};

// A photo in the article: dithered in white ink until a pointer or focus reaches it (Tom, 2026-11-24).
// A tap toggles it on touch. The dither is drawn once, when the image loads.
function figure(ph) {
  const fig = h('figure', 'a-inline');
  fig.tabIndex = 0;
  const img = h('img');
  img.alt = ph.alt ?? '';
  img.decoding = 'async';
  const dots = h('canvas', 'a-dots');
  dots.setAttribute('aria-hidden', 'true');
  const frame = h('div', 'a-frame');
  frame.append(img, dots);
  fig.append(frame, h('figcaption', null, ph.credit));
  img.addEventListener('load', () => {
    // The frame is 16:10 and covers; the column may not be laid out yet, so 340 px stands in.
    const w = Math.max(1, Math.round((img.clientWidth || 340) / DOT)), hh = Math.round(w * 10 / 16);
    dots.width = w; dots.height = hh;
    const g = /** @type {CanvasRenderingContext2D} */ (dots.getContext('2d', { willReadFrequently: true }));
    const iw = img.naturalWidth, ih = img.naturalHeight, k = Math.min(iw / 16, ih / 10);
    g.drawImage(img, (iw - 16 * k) / 2, (ih - 10 * k) / 2, 16 * k, 10 * k, 0, 0, w, hh);
    const d = g.getImageData(0, 0, w, hh), px = d.data;
    for (let i = 0; i < px.length; i += 4) {
      const p = i >> 2, x = p % w, y = (p / w) | 0;
      // Luminance, lifted, so the dark sky keeps a few dots and the bright limb fills.
      const l = ((0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255) ** 0.8;
      const on = l > BAYER[(y & 3) * 4 + (x & 3)];
      px[i] = px[i + 1] = px[i + 2] = 255;
      px[i + 3] = on ? 255 : 0;
    }
    g.putImageData(d, 0, 0);
  }, { once: true });
  img.src = new URL(ph.src, import.meta.url).href;
  fig.addEventListener('click', () => fig.classList.toggle('is-open'));
  return fig;
}

/**
 * Builds the article on the stage.
 * @param {{ stage: HTMLElement }} o
 */
export function makeArticle(o) {
  const link = h('link');
  link.rel = 'stylesheet';
  link.href = new URL('article.css', import.meta.url).href;
  document.head.append(link);

  let box = null, shown = null, view = 'full';
  const timers = new Set();
  const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); };
  function close() {
    if (!box) return;
    for (const t of timers) clearTimeout(t);
    timers.clear();
    const el = box;
    box = null; shown = null;
    if (RM.matches) { el.remove(); return; }
    // It leaves in three film frames.
    el.classList.add('out');
    setTimeout(() => el.remove(), 3 * FRAME + 20);
  }

  /**
   * @param {string} id The object's id.
   * @param {{ name: string, type: string, wiki: string | null }} c The card's name and type, and the source.
   */
  function open(id, c) {
    close();
    const a = ARTICLES[id];
    box = h('aside', 'sl-art');
    box.dataset.view = view;
    box.setAttribute('aria-label', `${c.name}: article`);
    // The stage's taps and drags stay off the article.
    for (const ev of ['pointerdown', 'wheel']) box.addEventListener(ev, e => e.stopPropagation());
    const lines = [];
    if (a?.photo) {
      const fig = h('figure', 'a-photo');
      const img = h('img');
      img.src = new URL(a.photo.src, import.meta.url).href;
      img.alt = a.photo.alt ?? '';
      img.decoding = 'async';
      fig.append(img, h('figcaption', null, a.photo.credit));
      box.append(fig);
      lines.push(fig);
    }
    const name = h('h2', 'a-name', c.name);
    const type = h('p', 'a-type', c.type);
    box.append(name, type);
    lines.push(type);
    // The text scrolls inside its own column when it runs long.
    const body = h('div', 'a-body');
    const paras = (a?.text ?? '').split('\n\n').filter(Boolean);
    paras.forEach((para, k) => {
      const p = h('p', 'a-text', para);
      body.append(p);
      lines.push(p);
      // A photo stands after the paragraph its entry names.
      for (const ph of a?.photos ?? []) {
        if (ph.after !== k) continue;
        const fig = figure(ph);
        body.append(fig);
        lines.push(fig);
      }
    });
    box.append(body);
    if (c.wiki) {
      const src = h('p', 'a-src');
      const at = h('a', null, 'Wikipedia ↗');
      at.href = c.wiki; at.target = '_blank'; at.rel = 'noopener';
      src.append(h('span', 'a-k', 'Source'), at);
      box.append(src);
      lines.push(src);
    }
    // The close hint is a button too, so a pointer can shut the article.
    const shut = h('button', 'a-hint');
    shut.type = 'button';
    shut.setAttribute('aria-label', 'Close the article');
    shut.append(h('kbd', null, 'I'), 'close');
    shut.addEventListener('click', close);
    box.append(shut);
    lines.push(shut);
    o.stage.append(box);
    shown = id;
    if (RM.matches) return;
    // The name flashes in a white box, then each line wipes on behind a white bar, as the card's do.
    [name, ...lines].forEach(el => el.classList.add('is-shut'));
    later(() => { name.classList.remove('is-shut'); name.classList.add('is-flash'); }, 0);
    later(() => name.classList.remove('is-flash'), 7 * FRAME);
    let at = 11 * FRAME;
    for (const el of lines) {
      later(() => { el.classList.remove('is-shut'); el.classList.add('is-wipe'); }, at);
      later(() => el.classList.remove('is-wipe'), at + 3 * FRAME);
      at += 3 * FRAME;
    }
  }

  return {
    open, close,
    isOpen: () => !!box,
    get shown() { return shown; },
    /** Names the view, so the article stands in its open sky: long, wide, full or far. */
    setView(v) { view = v; if (box) box.dataset.view = v; },
  };
}
