/* The site favicon: an S in a black circle, one hue further on each load. */

const HUES = 12;
const KEY = 'stimming.favicon.step';
const SIZE = 64;

// The step survives reloads; without storage it starts at a random hue.
function nextStep() {
  try {
    const step = (Number(localStorage.getItem(KEY)) + 1) % HUES || 0;
    localStorage.setItem(KEY, String(step));
    return step;
  } catch {
    return Math.floor(Math.random() * HUES);
  }
}

// Draw on a canvas, so the S uses the page's own Gabarito.
function draw(link, hue) {
  const c = document.createElement('canvas');
  c.width = c.height = SIZE;
  const g = c.getContext('2d');
  g.fillStyle = '#000';
  g.beginPath();
  g.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = `oklch(0.78 0.17 ${hue})`;
  g.font = `800 ${SIZE * 0.72}px Gabarito, system-ui, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('S', SIZE / 2, SIZE * 0.53);
  link.href = c.toDataURL('image/png');
}

const hue = (nextStep() * 360) / HUES + 20;
const link = /** @type {HTMLLinkElement} */ (document.querySelector('link[rel="icon"]') ?? document.head.appendChild(Object.assign(document.createElement('link'), { rel: 'icon' })));
link.type = 'image/png';
draw(link, hue);
// Draw again once Gabarito loads; the first draw may use a fallback face.
// A toy emblem, once shown, stays.
let toyShown = false;
document.fonts?.load(`800 ${SIZE * 0.72}px Gabarito`, 'S').then(() => toyShown || draw(link, hue)).catch(() => {});

// A toy page shows its own emblem in its accent, in the same black circle.
// One image load and one canvas pass, once per page: no per-frame cost.
/** @param {string} emblemUrl @param {string} accent */
export function toyFavicon(emblemUrl, accent) {
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas');
    c.width = c.height = SIZE;
    const g = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d', { willReadFrequently: true }));
    // A gradient accent gives its first colour.
    g.fillStyle = accent.match(/oklch\([^)]*\)|#[0-9a-f]{3,8}|rgb\([^)]*\)/i)?.[0] ?? '#fff';
    g.fillRect(0, 0, 1, 1);
    const [r, gr, b] = g.getImageData(0, 0, 1, 1).data;
    g.clearRect(0, 0, SIZE, SIZE);
    // The emblem fills the inner part of the circle.
    const pad = SIZE * 0.16;
    g.drawImage(img, pad, pad, SIZE - pad * 2, SIZE - pad * 2);
    const px = g.getImageData(0, 0, SIZE, SIZE);
    const d = px.data;
    // Luminance becomes alpha, as the intro's luminance mask does.
    for (let i = 0; i < d.length; i += 4) {
      const lum = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
      d[i + 3] = Math.round(lum * d[i + 3]);
      d[i] = r; d[i + 1] = gr; d[i + 2] = b;
    }
    const mark = document.createElement('canvas');
    mark.width = mark.height = SIZE;
    mark.getContext('2d').putImageData(px, 0, 0);
    g.clearRect(0, 0, SIZE, SIZE);
    g.fillStyle = '#000';
    g.beginPath();
    g.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2);
    g.fill();
    g.drawImage(mark, 0, 0);
    toyShown = true;
    link.href = c.toDataURL('image/png');
  };
  img.src = emblemUrl;
}
