// Contour map labels: the heights on the index lines.
// Each label holds its height and a spot on its line.
// When the land moves, a Newton step pulls the spot back onto the line.
import { INDEX, STEP } from './terrain.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const FONT_PX = 11;
// Labels of one height stand at least this far apart, in CSS pixels.
const SAME_GAP = 300;
// Any two labels keep this much clear room between their boxes.
const ANY_GAP = 26;

export function makeLabels(T, { max = 40, measure }) {
  const list = [];
  let scanT = 0;

  // Pulls a spot onto the line of height L; null when no line is near.
  function project(L, x, y, pxPerCell) {
    let moved = 0;
    for (let k = 0; k < 3; k++) {
      const h = T.at(x, y), [gx, gy] = T.grad(x, y), gg = gx * gx + gy * gy;
      if (gg < 1e-4) return null;
      let s = (h - L) / gg;
      // One step moves at most four cells.
      const len = Math.abs(s) * Math.sqrt(gg);
      if (len > 4) s *= 4 / len;
      x -= gx * s; y -= gy * s;
      moved += Math.abs(s) * Math.sqrt(gg);
      if (Math.abs(h - L) < 0.05) break;
    }
    if (Math.abs(T.at(x, y) - L) > 1.5) return null;
    return { x, y, moved: moved * pxPerCell };
  }

  // The label's angle and whether its line runs straight under it.
  // view: { s: CSS px per cell, ok(x, y): true where a label may stand }.
  function fit(l, view) {
    const [gx, gy] = T.grad(l.x, l.y);
    const g = Math.hypot(gx, gy);
    if (g < 0.2) return false;
    // Lines closer than this many pixels leave no room for text.
    if ((STEP / g) * view.s < 4.5) return false;
    const ux = gx / g, uy = gy / g;
    // The text's top faces uphill, unless that turns it past upside down.
    let ang = Math.atan2(ux, -uy);
    if (Math.abs(ang) > Math.PI * 0.5) ang += ang > 0 ? -Math.PI : Math.PI;
    const tx = -uy, ty = ux;
    const half = (l.w / 2 + 2) / view.s;
    // The line stays within two pixels of the text's ends.
    for (const k of [-1, -0.5, 0.5, 1]) {
      const x = l.x + tx * half * k, y = l.y + ty * half * k;
      const dh = Math.abs(T.at(x, y) - l.L);
      if ((dh / g) * view.s > 2.2) return false;
    }
    if (!view.ok(l.x, l.y, l.w)) return false;
    l.tgt = ang;
    return true;
  }

  // Two labels' boxes, as circles round their centres, are too close.
  function crowded(l, view, skip = null) {
    for (const o of list) {
      if (o === skip || o.dead) continue;
      const d = Math.hypot(o.x - l.x, o.y - l.y) * view.s;
      if (o.L === l.L && d < SAME_GAP) return true;
      if (d < (o.w + l.w) / 2 + ANY_GAP) return true;
    }
    return false;
  }

  function make(L, x, y) {
    const text = String(L);
    return { L, x, y, text, w: measure(text), ang: 0, tgt: 0, a: 0, on: true, bad: 0, dead: false };
  }

  /**
   * Moves every label onto its line and finds room for new ones.
   * changed: the land moved this frame. calm: no fades.
   * Returns true while any label still moves or fades.
   */
  function update(dt, view, changed, calm) {
    let busy = false;
    for (const l of list) {
      if (l.dead) continue;
      if (changed) {
        const p = project(l.L, l.x, l.y, view.s);
        // A jump of many pixels means its line has gone.
        if (!p || p.moved > 40) { l.on = false; l.bad = 1; }
        else {
          l.x = p.x; l.y = p.y;
          const ok = fit(l, view) && !crowded(l, view, l);
          l.bad = ok ? 0 : l.bad + dt;
          // A label stays through a short bad spell, so it does not flicker.
          l.on = ok || l.bad < 0.25;
        }
      }
      // The angle follows the line by the shortest turn.
      let d = l.tgt - l.ang;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      if (Math.abs(d) > 2.4 || calm) l.ang = l.tgt;
      else if (Math.abs(d) > 1e-3) { l.ang += d * (1 - Math.exp(-dt / 0.06)); busy = true; }
      const to = l.on ? 1 : 0;
      if (calm) l.a = to;
      else if (l.a !== to) {
        l.a += Math.sign(to - l.a) * dt / 0.28;
        l.a = clamp(l.a, 0, 1);
        busy = true;
      }
      if (!l.on && l.a <= 0) l.dead = true;
    }
    for (let i = list.length - 1; i >= 0; i--) if (list[i].dead) list.splice(i, 1);
    scanT -= dt;
    if (changed && scanT <= 0) { scan(view, 6); scanT = 0.18; }
    return busy || list.some(l => l.a < 1 && l.on);
  }

  // Looks over a lattice for index lines with room for a label.
  function scan(view, limit = Infinity) {
    const step = 22 / view.s;
    const [x0, y0, x1, y1] = view.box;
    let added = 0;
    // A fresh offset each pass, so new labels do not line up.
    const ox = Math.random() * step, oy = Math.random() * step;
    for (let y = y0 + oy; y < y1 && added < limit; y += step) {
      for (let x = x0 + ox; x < x1 && added < limit; x += step) {
        if (list.length >= max) return added;
        const h = T.at(x, y);
        const L = Math.round(h / INDEX) * INDEX;
        if (L <= 0) continue;
        const [gx, gy] = T.grad(x, y);
        const g = Math.hypot(gx, gy);
        if (g < 0.2 || (Math.abs(h - L) / g) * view.s > 11) continue;
        const p = project(L, x, y, view.s);
        if (!p) continue;
        const l = make(L, p.x, p.y);
        if (!fit(l, view) || crowded(l, view)) continue;
        l.ang = l.tgt;
        list.push(l);
        added++;
      }
    }
    return added;
  }

  function clear() { list.length = 0; }
  // Every label fades out; new ones come with the next land.
  function fadeAll() { for (const l of list) l.on = false; }

  return { list, update, scan, clear, fadeAll };
}
