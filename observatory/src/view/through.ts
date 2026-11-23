// The view through the telescope, after the cuts or from the bar.
// The simulator page runs in a frame over the stage.
// It loads while the cuts play and draws once it opens.
import { reduced } from '../../../shared/stim.js';
import type { Star } from '../core/catalog.ts';
import type { Through } from './cuts.ts';
import { stageEl } from '../setup.ts';
import type { Scope } from '../core/selector.ts';

// The bundle sits in dist/; the page sits next to dist/.
const PAGE = new URL('../sim.html', import.meta.url).href;
// From black, the view fades up in this many seconds.
const UP_S = 0.45;
// The bar's way in: the stage dips to black in this many seconds.
const DOWN_S = 0.35;
// The view fades out in this many seconds.
const OUT_S = 0.35;

let frame: HTMLIFrameElement | null = null;
// The star and the telescope the frame was loaded for.
let loaded: { hip: number; scope: Scope } | null = null;
// true once the view starts to open: the frame then draws.
let going = false;
// The black over the stage for the bar's way in.
let veil: HTMLDivElement | null = null;
// The bar's chip for the way in, found once.
let lookChip: HTMLElement | null = null;
// The action's label in setup.ts.
export const LOOK = 'Look through';
let onOpen: () => void = () => {};
let onClose: () => void = () => {};

function post(msg: 'go'): void {
  frame?.contentWindow?.postMessage({ obsSim: msg }, location.origin);
}

function drop(): void {
  frame?.remove();
  frame = null;
  loaded = null;
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

// Fades an element's opacity to a value in s seconds.
function fade(el: HTMLElement, to: number, s: number, ease: string): void {
  if (reduced()) { el.style.transition = 'none'; el.style.opacity = String(to); return; }
  el.style.transition = `opacity ${s}s ${ease}`;
  el.style.opacity = String(to);
}

// The view fades out over the black; the wide shot fades up under it.
function close(): void {
  const f = frame;
  if (!f) return;
  frame = null;
  loaded = null;
  going = false;
  // The bar's veil lifts itself; the cuts lift their own black.
  const v = veil;
  veil = null;
  onClose();
  stageEl.focus();
  fade(f, 0, OUT_S, 'ease-in');
  f.style.pointerEvents = 'none';
  setTimeout(() => f.remove(), reduced() ? 0 : OUT_S * 1000 + 50);
  if (v) {
    fade(v, 0, UP_S, 'ease-out');
    setTimeout(() => v.remove(), reduced() ? 0 : UP_S * 1000 + 50);
  }
}

export const scopeView = {
  // Loads the view on a star while the cuts play.
  // skyMs: the toy's sky time now.
  prepare(s: Star, skyMs: number, scope: Scope): void {
    drop();
    const f = document.createElement('iframe');
    f.src = `${PAGE}?embed&scope=${scope === 'reflector' ? 'big' : 'small'}&ra=${s.ra.toFixed(5)}&dec=${s.dec.toFixed(5)}&t=${Math.round(skyMs)}`;
    f.title = 'The view through the telescope';
    f.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0;z-index:4;background:#000;visibility:hidden;opacity:0';
    stageEl.append(f);
    frame = f;
    loaded = { hip: s.hip, scope };
  },
  // true while a view is open or opening.
  get showing(): boolean { return going; },
  // The bar's way in: the stage dips to black, then the view fades up.
  enter(s: Star, skyMs: number, scope: Scope): void {
    if (going) return;
    if (!frame || loaded?.hip !== s.hip || loaded.scope !== scope) scopeView.prepare(s, skyMs, scope);
    const v = document.createElement('div');
    v.style.cssText = 'position:absolute;inset:0;z-index:3;background:#000;opacity:0;pointer-events:none';
    stageEl.append(v);
    veil = v;
    going = true;
    // The start style must land before the fade.
    void v.offsetWidth;
    fade(v, 1, DOWN_S, 'ease-in');
    setTimeout(() => {
      if (veil !== v || !frame) return;
      scopeView.hooks.begin();
      scopeView.hooks.done();
    }, reduced() ? 0 : DOWN_S * 1000);
  },
  // Shows the bar's way in while a telescope holds a star.
  // The label names the observatory, in plain words.
  syncBar(show: boolean, scope: Scope): void {
    lookChip ??= [...document.querySelectorAll<HTMLElement>('.s2-chip')].find(b => b.querySelector('.s2-label')?.textContent === LOOK) ?? null;
    if (!lookChip) return;
    if (lookChip.hidden !== !show) lookChip.hidden = !show;
    const text = `${LOOK} · ${scope === 'reflector' ? 'Big' : 'Little'} Observatory`;
    const label = lookChip.querySelector('.s2-label');
    if (label && label.textContent !== text) label.textContent = text;
  },
  // The loop sets what follows an open and a close.
  onOpen(fn: () => void): void { onOpen = fn; },
  onClose(fn: () => void): void { onClose = fn; },
  // The hooks the cuts call through their dip to black.
  hooks: {
    begin(): void {
      if (!frame) return;
      going = true;
      frame.style.visibility = 'visible';
      post('go');
    },
    // The stage is black: the view fades up over it.
    done(): void {
      if (!frame) return;
      // The start style must land before the fade.
      void frame.offsetWidth;
      fade(frame, 1, UP_S, 'ease-out');
      frame.focus();
      onOpen();
    },
    cancel(): void {
      drop();
      veil?.remove();
      veil = null;
    },
    has(): boolean { return !!frame; },
  } satisfies Through,
};
