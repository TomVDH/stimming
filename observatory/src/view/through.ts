// The view through the telescope, after the cuts.
// The simulator page runs in a frame over the stage.
// It loads while the cuts play and draws once the push starts.
import { reduced } from '../../../shared/stim.js';
import type { Star } from '../core/catalog.ts';
import type { Circle, Through } from './cuts.ts';
import { stageEl } from '../setup.ts';

// The bundle sits in dist/; the page sits next to dist/.
const PAGE = new URL('../sim.html', import.meta.url).href;
// The view fades in over this share of the push.
const IN_FROM = 0.3, IN_TO = 0.85;
// The iris stays this share inside the glass's rim.
const RIM = 0.92;
// The view fades out in this many seconds.
const OUT_S = 0.35;

let frame: HTMLIFrameElement | null = null;
// true once the push starts: the frame then draws.
let going = false;
let onClose: () => void = () => {};

const smooth = (a: number, b: number, x: number): number => {
  const k = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return k * k * (3 - 2 * k);
};

function post(msg: 'go'): void {
  frame?.contentWindow?.postMessage({ obsSim: msg }, location.origin);
}

function drop(): void {
  frame?.remove();
  frame = null;
  going = false;
}

// The frame says it is ready or asks to close.
window.addEventListener('message', (e) => {
  if (!frame || e.origin !== location.origin || e.source !== frame.contentWindow) return;
  const d = e.data as { obsSim?: string } | null;
  // A frame that loads late gets the go it missed.
  if (d?.obsSim === 'ready' && going) post('go');
  if (d?.obsSim === 'close') close();
});

// The view fades out over the black; the wide shot fades up under it.
function close(): void {
  const f = frame;
  if (!f) return;
  frame = null;
  going = false;
  onClose();
  stageEl.focus();
  if (reduced()) { f.remove(); return; }
  f.style.transition = `opacity ${OUT_S}s ease-in`;
  f.style.opacity = '0';
  f.style.pointerEvents = 'none';
  setTimeout(() => f.remove(), OUT_S * 1000 + 50);
}

export const scopeView = {
  // Loads the view on a star while the cuts play.
  // skyMs: the toy's sky time now.
  prepare(s: Star, skyMs: number): void {
    drop();
    const f = document.createElement('iframe');
    f.src = `${PAGE}?embed&ra=${s.ra.toFixed(5)}&dec=${s.dec.toFixed(5)}&t=${Math.round(skyMs)}`;
    f.title = 'The view through the telescope';
    f.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0;z-index:4;background:#000;visibility:hidden;opacity:0';
    stageEl.append(f);
    frame = f;
  },
  // The loop sets what follows a close.
  onClose(fn: () => void): void { onClose = fn; },
  // The hooks the cuts call through the push.
  hooks: {
    begin(): void {
      if (!frame) return;
      going = true;
      frame.style.visibility = 'visible';
      post('go');
    },
    // The view opens as an iris in the glass.
    step(k: number, c: Circle | null): void {
      if (!frame) return;
      frame.style.opacity = String(smooth(IN_FROM, IN_TO, k));
      frame.style.clipPath = c ? `circle(${(c.r * RIM).toFixed(1)}px at ${c.x.toFixed(1)}px ${c.y.toFixed(1)}px)` : 'none';
    },
    done(): void {
      if (!frame) return;
      frame.style.opacity = '1';
      frame.style.clipPath = 'none';
      frame.focus();
    },
    cancel(): void { drop(); },
  } satisfies Through,
};
