// @ts-nocheck
// Load order: sound/motor runs first.
import './sound/motor.ts';
import { sound, reduced } from '../../shared/stim.js';
import { state } from './state.ts';
import { act, clamp, rad, stage } from './setup.ts';
import { lookTo } from './view/camera.ts';
import { cancelHold, charge } from './play/charge.ts';
import { TRAV, tkeys } from './ship/hit.ts';
import { wake } from './loop.ts';
import { kit, stopAll } from './sound/kit.ts';
import { bed } from './sound/wind.ts';
import { humStart, humStop } from './sound/hum.ts';
import { surgeOverStop } from './sound/gameover.ts';
import { motorStop } from './sound/motor.ts';

// Sound on mid-charge starts the hum where the hold is.
// Sound off stops everything.
sound.onChange(on => {
  if (!on) { stopAll(); humStop(kit.ac); motorStop(true); surgeOverStop(true); if (bed) { bed.g.gain.value = 0; bed.g2.gain.value = 0; } return; }
  if (charge) setTimeout(() => { const ac = kit.live(); if (ac && charge) humStart(ac); }, 60);
});


/* Pointer: a press charges, a release fires; the cursor leans the lens a little. */
state.press = null; state.spaceDown = false;
stage.addEventListener('pointerdown', e => {
  // One finger at a time: a second pointer changes nothing.
  if (e.button > 0 || state.press) return;
  stage.setPointerCapture(e.pointerId);
  state.press = { id: e.pointerId, at: performance.now() };
  stage.classList.add('held');
  if (sound.on) kit.wake();
  act.press();
  wake();
});
// The lens leans a degree or so toward the cursor, slow and heavy.
// Reduced motion keeps it still.
stage.addEventListener('pointermove', e => {
  if (reduced() || e.pointerType === 'touch') return;
  const r = stage.getBoundingClientRect();
  const nx = (e.clientX - r.left) / r.width - 0.5, ny = (e.clientY - r.top) / r.height - 0.5;
  lookTo.yaw = -clamp(nx, -0.5, 0.5) * rad(1.4);
  lookTo.pitch = -clamp(ny, -0.5, 0.5) * rad(0.9);
  wake();
});
stage.addEventListener('pointerleave', () => { lookTo.yaw = lookTo.pitch = 0; wake(); });
const end = e => {
  if (!state.press || e.pointerId !== state.press.id) return;
  state.press = null;
  stage.classList.remove('held');
  act.release('pointer');
  wake();
};
stage.addEventListener('pointerup', end);
stage.addEventListener('pointercancel', end);
stage.addEventListener('lostpointercapture', end);
// Space holds the charge.
// The shell ignores it while a sheet has focus.
document.addEventListener('keydown', e => {
  if (TRAV[e.code] && !e.target.closest?.('input, .s2-sheet') && !e.metaKey && !e.ctrlKey) { e.preventDefault(); tkeys.add(e.code); wake(); return; }
  if (e.code !== 'Space' || e.repeat || e.target.closest?.('input, button, .s2-sheet')) return;
  e.preventDefault();
  state.spaceDown = true;
  if (sound.on) kit.wake();
  act.press('space');
  wake();
});
document.addEventListener('keyup', e => {
  if (TRAV[e.code]) { tkeys.delete(e.code); return; }
  if (e.code !== 'Space' || !state.spaceDown) return;
  state.spaceDown = false;
  act.release('space');
  wake();
});
addEventListener('blur', () => { tkeys.clear(); if (charge || state.press) { cancelHold(); wake(); } });
