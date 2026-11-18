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
document.fonts?.load(`800 ${SIZE * 0.72}px Gabarito`, 'S').then(() => draw(link, hue)).catch(() => {});
