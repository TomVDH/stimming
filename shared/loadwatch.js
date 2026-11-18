// Shared: the load watch. A heavy toy names each load step as it starts.
// The page shows the step and its seconds, so a long compile never looks dead.
// Each step goes to storage at once: a load that kills the browser leaves it there.
// The next open reads it, says where the last load stopped, and sets `crashed`.
//
// Use:
//   const watch = loadWatch('tornado', canvas);
//   if (watch.crashed) budget /= 3;      // a lighter first try
//   watch.step('Compiling shaders');
//   watch.fail(err);                     // shows the error, keeps the page up
//   watch.step('First frames', true);    // stored, but never shown
//   watch.done();                        // after the first frames

// A step shorter than this shows no note: a fast load stays clean.
const QUIET_MS = 1500;

/**
 * @typedef {object} LoadWatch
 * @property {{ step: string, ms: number } | null} crashed The step a past load died in, or null.
 * @property {(name: string, quiet?: boolean) => void} step Names the step that starts now. A quiet step shows no note.
 * @property {(err: unknown) => void} fail Shows why the load stopped.
 * @property {() => void} done Ends the watch after the first frame.
 */
/**
 * @param {string} id The toy's id; the storage key holds it.
 * @param {HTMLCanvasElement} [canvas] Its WebGL canvas: a GPU reset shows as a failure.
 * @returns {LoadWatch}
 */
export function loadWatch(id, canvas) {
  const key = `stimming.${id}.loadstep`;
  /** @type {{ step: string, at: number, ms?: number } | null} */
  let last = null;
  try { last = JSON.parse(localStorage.getItem(key) || 'null'); } catch { /* no storage */ }
  const crashed = last ? { step: last.step, ms: last.ms ?? 0 } : null;
  const t0 = performance.now();
  let name = '', since = 0, timer = 0, over = false, hush = false;
  /** @type {HTMLElement | null} */
  let el = null;
  const note = (/** @type {string} */ text, /** @type {string} */ kind) => {
    if (!el) {
      el = document.createElement('p');
      el.className = 'stim-loadnote';
      el.setAttribute('role', 'status');
      document.body.append(el);
    }
    el.dataset.kind = kind;
    el.textContent = text;
  };
  const save = () => {
    try { localStorage.setItem(key, JSON.stringify({ step: name, at: Date.now(), ms: Math.round(performance.now() - t0) })); } catch { /* no storage */ }
  };
  const tick = () => {
    if (over) return;
    const ms = performance.now() - since;
    // The step goes back to storage each second, with the time it has run.
    save();
    const lastNote = crashed ? `Last open stopped at: ${crashed.step}. This one starts lighter.` : '';
    if (hush || ms < QUIET_MS) { if (lastNote) note(lastNote, 'work'); else { el?.remove(); el = null; } return; }
    note(`${name} · ${Math.floor(ms / 1000)} s${lastNote ? ` · ${lastNote}` : ''}`, 'work');
  };
  const step = (/** @type {string} */ n, quiet = false) => {
    if (over) return;
    name = n; since = performance.now(); hush = quiet;
    save();
    clearInterval(timer);
    timer = setInterval(tick, 1000);
    tick();
  };
  const end = () => { over = true; clearInterval(timer); try { localStorage.removeItem(key); } catch { /* no storage */ } };
  const fail = (/** @type {unknown} */ err) => {
    const why = String(err instanceof Error ? err.message : err || 'unknown error').split('\n').find(l => l.trim()) || 'unknown error';
    console.error(`${id}: load failed at "${name}":`, err);
    end();
    note(`${name || 'Load'} failed: ${why.slice(0, 160)}`, 'fail');
  };
  canvas?.addEventListener('webglcontextlost', () => fail('the GPU reset (WebGL context lost)'));
  if (crashed) console.warn(`${id}: the last open stopped at "${crashed.step}" after ${Math.round(crashed.ms / 1000)} s`);
  return {
    crashed,
    step,
    fail,
    done() {
      if (over) return;
      end();
      // A crash notice stays a few seconds more, so it can be read.
      const gone = el;
      el = null;
      if (gone) setTimeout(() => gone.remove(), crashed ? 5000 : 0);
    },
  };
}
