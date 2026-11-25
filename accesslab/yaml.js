// @ts-check
// A small YAML writer for plain data: objects, arrays, strings, numbers, booleans, null.
// No library: js-yaml is cleared for ShadyOS only (docs/standards/code.md).

// A string needs quotes when YAML would read it as something else.
const PLAIN = /^[A-Za-z_][\w .,/@()'+&-]*$/;
const RESERVED = /^(true|false|yes|no|on|off|null|~)$/i;
/** @param {string} s */
const str = s => (PLAIN.test(s) && !RESERVED.test(s) && !/[:#]\s|\s$|: |^\s/.test(s) ? s : JSON.stringify(s));
/** @param {any} v */
const scalar = v => (v === null || v === undefined ? 'null' : typeof v === 'string' ? str(v) : String(v));
/** @param {any} v */
// An object whose every value is empty counts as empty too.
const isEmpty = (/** @type {any} */ v) => v === null || v === undefined || v === '' || (Array.isArray(v) && !v.length)
  || (typeof v === 'object' && !Array.isArray(v) && Object.values(v).every(isEmpty));

/**
 * Writes data as YAML. Empty values drop when `prune` is on.
 * @param {any} data @param {{ prune?: boolean }} [opts]
 */
export function toYAML(data, { prune = true } = {}) {
  const out = /** @type {string[]} */ ([]);
  const walk = (/** @type {any} */ v, /** @type {number} */ depth, /** @type {string} */ lead) => {
    const pad = '  '.repeat(depth);
    if (Array.isArray(v)) {
      for (const item of v) {
        if (item && typeof item === 'object' && !isEmpty(item)) {
          const lines = toYAML(item, { prune }).trimEnd().split('\n');
          out.push(`${pad}- ${lines[0]}`, ...lines.slice(1).map(l => `${pad}  ${l}`));
        } else out.push(`${pad}- ${scalar(item)}`);
      }
      return;
    }
    for (const [k, val] of Object.entries(v)) {
      if (prune && isEmpty(val)) continue;
      const key = str(k);
      if (val && typeof val === 'object' && !isEmpty(val)) {
        out.push(`${pad}${key}:`);
        walk(val, depth + 1, '');
      } else if (typeof val === 'string' && val.includes('\n')) {
        out.push(`${pad}${key}: |`, ...val.split('\n').map(l => `${pad}  ${l}`));
      } else out.push(`${pad}${key}: ${Array.isArray(val) ? '[]' : val && typeof val === 'object' ? '{}' : scalar(val)}`);
    }
    void lead;
  };
  walk(data, 0, '');
  return out.join('\n') + '\n';
}
