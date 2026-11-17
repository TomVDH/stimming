// Drone input: two spring sticks from the mouse, thumbs, keys or a gamepad.
// Mode 2 throughout: left stick throttle and yaw, right stick pitch and roll.

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
// Soft centre, full reach at the edge.
const expo = v => v * (.45 + .55 * v * v);
// Gamepad sticks rest a little off centre.
function dead(x, y, d = .12) {
  const l = Math.hypot(x, y);
  if (l < d) return [0, 0];
  const k = Math.min(1, (l - d) / (1 - d)) / l;
  return [x * k, y * k];
}

// Keys per axis: [negative, positive].
const KEYS = {
  thr: [['s'], ['w']],
  yaw: [['a'], ['d']],
  pitch: [['arrowdown', 'k'], ['arrowup', 'i']],
  roll: [['arrowleft', 'j'], ['arrowright', 'l']]
};
const FLY_KEYS = new Set(Object.values(KEYS).flat(2));

/**
 * Wire the stage for flying.
 * @param {HTMLElement} el The element that takes pointer input.
 * @param {{ cyc: HTMLElement, col: HTMLElement }} rings The two stick rings.
 * @param {{ wake: () => void, pad?: (button: number) => void }} on
 */
export function createInput(el, rings, on) {
  const sticks = {
    cyc: { on: false, ox: 0, oy: 0, x: 0, y: 0, el: rings.cyc },
    col: { on: false, ox: 0, oy: 0, x: 0, y: 0, el: rings.col }
  };
  const reach = () => clamp(Math.min(el.clientWidth, el.clientHeight) * .13, 56, 130);

  function press(k, x, y) {
    const s = sticks[k], r = el.getBoundingClientRect();
    Object.assign(s, { on: true, ox: x, oy: y, x: 0, y: 0 });
    s.el.style.transform = `translate(${x - r.left}px, ${y - r.top}px)`;
    s.el.style.setProperty('--r', reach() + 'px');
    s.el.classList.add('on');
    move(k, x, y);
    on.wake();
  }
  function move(k, x, y) {
    const s = sticks[k], R = reach();
    let dx = (x - s.ox) / R, dy = (s.oy - y) / R;
    const l = Math.hypot(dx, dy);
    if (l > 1) { dx /= l; dy /= l; }
    s.x = dx; s.y = dy;
    s.el.style.setProperty('--kx', dx * R + 'px');
    s.el.style.setProperty('--ky', -dy * R + 'px');
  }
  function release(k) {
    const s = sticks[k];
    s.on = false; s.x = 0; s.y = 0;
    s.el.classList.remove('on');
  }

  // Mouse: the left button is the right stick, the right button the left stick.
  let buttons = 0;
  const touches = new Map();
  function mouse(e) {
    const b = e.buttons;
    for (const [bit, k] of [[1, 'cyc'], [2, 'col']]) {
      const was = buttons & bit, now = b & bit;
      if (now && !was) press(k, e.clientX, e.clientY);
      else if (!now && was) release(k);
      else if (now) move(k, e.clientX, e.clientY);
    }
    buttons = b;
  }
  el.addEventListener('pointerdown', e => {
    try { el.setPointerCapture(e.pointerId); } catch { /* A synthetic pointer has no capture. */ }
    if (e.pointerType === 'mouse') { mouse(e); return; }
    // Thumbs: the left half is throttle and yaw, the right half pitch and roll.
    const r = el.getBoundingClientRect(), k = e.clientX - r.left < r.width / 2 ? 'col' : 'cyc';
    if (sticks[k].on) return;
    touches.set(e.pointerId, k);
    press(k, e.clientX, e.clientY);
  });
  el.addEventListener('pointermove', e => {
    if (e.pointerType === 'mouse') { if (e.buttons || buttons) mouse(e); return; }
    const k = touches.get(e.pointerId);
    if (k) move(k, e.clientX, e.clientY);
  });
  function lift(e) {
    if (e.pointerType === 'mouse') { mouse({ buttons: 0 }); return; }
    const k = touches.get(e.pointerId);
    if (k) { release(k); touches.delete(e.pointerId); }
  }
  for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) el.addEventListener(t, lift);
  el.addEventListener('contextmenu', e => e.preventDefault());

  // Keys ramp toward full stick and spring back on release.
  const held = new Set();
  const typing = t => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName));
  addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey || typing(e.target)) return;
    const k = e.key.toLowerCase();
    if (!FLY_KEYS.has(k)) return;
    e.preventDefault();
    held.add(k);
    on.wake();
  });
  addEventListener('keyup', e => held.delete(e.key.toLowerCase()));
  addEventListener('blur', () => held.clear());
  const keyAxis = { thr: 0, yaw: 0, pitch: 0, roll: 0 };
  function keys(dt, fine) {
    for (const ax in KEYS) {
      const [neg, pos] = KEYS[ax];
      const t = ((pos.some(k => held.has(k)) ? 1 : 0) - (neg.some(k => held.has(k)) ? 1 : 0)) * (fine ? .5 : 1);
      const rate = t === 0 ? 9 : 4.5;
      const v = keyAxis[ax];
      keyAxis[ax] = v + clamp(t - v, -rate * dt, rate * dt);
    }
  }
  let shift = false;
  addEventListener('keydown', e => { if (e.key === 'Shift') shift = true; });
  addEventListener('keyup', e => { if (e.key === 'Shift') shift = false; });

  // Gamepad: the first pad with a standard layout.
  let padPrev = [], padOn = false, poll = 0;
  const pad = () => [...(navigator.getGamepads?.() || [])].find(p => p && p.connected && p.axes.length >= 4) || null;
  const padAxes = { thr: 0, yaw: 0, pitch: 0, roll: 0 };
  function readPad() {
    const p = pad();
    padOn = !!p;
    if (!p) { for (const a in padAxes) padAxes[a] = 0; return false; }
    const [lx, ly] = dead(p.axes[0], p.axes[1]), [rx, ry] = dead(p.axes[2], p.axes[3]);
    padAxes.yaw = expo(lx); padAxes.thr = expo(-ly); padAxes.roll = expo(rx); padAxes.pitch = expo(-ry);
    let active = Math.abs(lx) + Math.abs(ly) + Math.abs(rx) + Math.abs(ry) > 0;
    p.buttons.forEach((b, i) => {
      if (b.pressed && !padPrev[i]) { on.pad?.(i); active = true; }
      padPrev[i] = b.pressed;
    });
    return active;
  }
  // A sleeping page still hears the pad, four times a second.
  addEventListener('gamepadconnected', () => {
    on.wake();
    clearInterval(poll);
    poll = setInterval(() => { if (readPad()) on.wake(); }, 250);
  });
  addEventListener('gamepaddisconnected', () => { if (!pad()) clearInterval(poll); });

  return {
    sticks,
    get pad() { return padOn; },
    /** Read every source; returns stick values from -1 to 1. */
    read(dt) {
      keys(dt, shift);
      readPad();
      const c = sticks.cyc, l = sticks.col;
      return {
        roll: clamp(expo(c.x) + keyAxis.roll + padAxes.roll, -1, 1),
        pitch: clamp(expo(c.y) + keyAxis.pitch + padAxes.pitch, -1, 1),
        yaw: clamp(expo(l.x) + keyAxis.yaw + padAxes.yaw, -1, 1),
        thr: clamp(expo(l.y) + keyAxis.thr + padAxes.thr, -1, 1)
      };
    },
    /** True while any source holds a stick off centre. */
    busy() {
      return c0(sticks) || held.size > 0 || Object.values(keyAxis).some(v => Math.abs(v) > .001)
        || Object.values(padAxes).some(v => v !== 0);
    },
    releaseAll() { release('cyc'); release('col'); buttons = 0; touches.clear(); held.clear(); }
  };
}
const c0 = s => s.cyc.on || s.col.on;
