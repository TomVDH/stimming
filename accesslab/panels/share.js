// @ts-check
// Share panel: the toy's 1200 x 630 share card, from accesslab/share-card.js.
// The icon is the toy's emblem as a luminance mask in white.
import { drawCard } from '../share-card.js';

const STYLE = `
.sh-wrap { display: grid; gap: 12px; }
/* The frame keeps the card's 1200 x 630 shape at any width. */
.sh-frame { position: relative; width: 100%; max-width: 1200px; aspect-ratio: 1200 / 630; overflow: hidden; border-radius: 10px; box-shadow: 0 0 0 1px var(--line); }
.sh-frame > .sh-host { position: absolute; left: 0; top: 0; width: 1200px; height: 630px; transform-origin: 0 0; }
.sh-note { margin: 0; color: var(--muted); font: 500 13px/1.4 var(--sans); }
`;

/** @type {ResizeObserver | null} */
let ro = null;
let gen = 0;

export default {
  id: 'share',
  label: 'Share',
  setup() {
    const st = document.createElement('style');
    st.textContent = STYLE;
    document.head.append(st);
  },
  mount(/** @type {HTMLElement} */ host, /** @type {any} */ it) {
    const my = ++gen;
    if (it.group === 'unlisted') { host.innerHTML = '<p class="sh-note">Not in toys.json yet, so no emblem and no card.</p>'; return; }
    host.innerHTML = `<div class="sh-wrap"><div class="bar"><a class="w" href="../docs/qa/share-cards/preview.html" target="_blank" rel="noopener">Sample page ↗</a></div>`
      + '<div class="sh-frame"><div class="sh-host"></div></div>'
      + '<p class="sh-note">1200 × 630, the og:image size. The icon is the emblem as a luminance mask in white; the still and the colours come from the toy.</p></div>';
    const frame = /** @type {HTMLElement} */ (host.querySelector('.sh-frame')), inner = /** @type {HTMLElement} */ (host.querySelector('.sh-host'));
    // The card draws at full size; the frame scales it to fit.
    ro = new ResizeObserver(() => { inner.style.transform = `scale(${frame.clientWidth / 1200})`; });
    ro.observe(frame);
    drawCard(inner, it.id, it.raw).catch(() => { if (my === gen) inner.textContent = 'The card did not draw.'; });
  },
  unmount() {
    gen++;
    ro?.disconnect();
    ro = null;
  },
  status() { return ''; },
  yaml() { return null; },
};
