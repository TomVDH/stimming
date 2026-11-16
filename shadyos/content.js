// Loads content.yaml over the built-in lines.
// A missing key keeps its built-in value; a list replaces the whole list.
import DEFAULTS from './defaults.js';

const YAML = 'https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/dist/js-yaml.mjs';
const plain = v => v && typeof v === 'object' && !Array.isArray(v);
function merge(base, over) {
  if (!plain(base) || !plain(over)) return over === undefined || over === null ? base : over;
  const out = { ...base };
  for (const k of Object.keys(over)) out[k] = merge(base[k], over[k]);
  return out;
}

/** @returns {Promise<{ C: any, error: null | { line: number } }>} */
export async function loadContent() {
  try {
    const [{ load }, text] = await Promise.all([
      import(YAML),
      fetch(new URL('content.yaml', import.meta.url), { cache: 'no-cache' }).then(r => (r.ok ? r.text() : Promise.reject(new Error(`content.yaml ${r.status}`)))),
    ]);
    const data = load(text);
    return { C: merge(DEFAULTS, plain(data) ? data : {}), error: null };
  } catch (err) {
    console.warn('ShadyOS: content.yaml failed, built-in lines run.', err);
    return { C: DEFAULTS, error: { line: (err?.mark?.line ?? -1) + 1 || '?' } };
  }
}

// Fill {key} slots in a line.
export const fill = (s, vars = {}) => String(s ?? '').replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
export const pick = list => list[(Math.random() * list.length) | 0];
