// @ts-check
// Collates docs/inventory/<id>.json into docs/inventory.json.
// Format: docs/inventory/schema.md. Usage: node tools/inventory.mjs
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'docs/inventory';
const OUT = 'docs/inventory.json';
const AREAS = ['icon', 'intro', 'bar', 'controls', 'graphics', 'sound', 'perf'];
const VERDICTS = ['cut', 'rework', 'polish', 'keep', ''];
const KINDS = ['bug', 'gaffe'];
const SEVERITIES = ['blocker', 'major', 'minor', 'polish'];
const SIZES = ['S', 'M', 'L'];
const MOVES = ['none', 'to-main', 'to-lab'];
const PRIORITIES = ['now', 'next', 'later', 'never', ''];
const EFFORTS = ['S', 'M', 'L', 'XL', ''];
const RISKS = ['low', 'mid', 'high', ''];
const META = ['name', 'nl', 'ipa', 'tag', 'tagNl', 'series'];

/** @type {string[]} */
const errors = [];
const bad = (/** @type {string} */ id, /** @type {string} */ msg) => errors.push(`${id}: ${msg}`);
const word = (/** @type {string} */ id, /** @type {string} */ field, /** @type {unknown} */ v, /** @type {unknown[]} */ set) => {
  if (!set.includes(v)) bad(id, `${field} "${v}" is not one of ${set.join(', ')}`);
};

const records = readdirSync(DIR).filter(f => f.endsWith('.json')).map(f => {
  const r = JSON.parse(readFileSync(join(DIR, f), 'utf8'));
  const id = r.id ?? f;
  if (r.schema !== 2) bad(id, `schema ${r.schema} is not 2`);
  if (`${r.id}.json` !== f) bad(id, `file name ${f} does not match id`);
  word(id, 'verdict', r.verdict, VERDICTS);
  word(id, 'shelfMove', r.shelfMove, MOVES);
  word(id, 'priority', r.triage?.priority, PRIORITIES);
  word(id, 'effort', r.triage?.effort, EFFORTS);
  word(id, 'risk', r.triage?.risk, RISKS);
  for (const a of AREAS) if (typeof r.areas?.[a]?.ok !== 'boolean') bad(id, `area ${a} has no ok flag`);
  for (const x of r.findings ?? []) {
    word(id, 'finding area', x.area, ['meta', ...AREAS]);
    word(id, 'finding kind', x.kind, KINDS);
    word(id, 'finding severity', x.severity, SEVERITIES);
  }
  for (const x of r.expansions ?? []) {
    word(id, 'expansion area', x.area, ['meta', ...AREAS]);
    word(id, 'expansion size', x.size, SIZES);
  }
  // Meta fields that differ from the snapshot are edits for toys.json.
  r.metaEdits = Object.fromEntries(META.filter(k => (r.meta?.[k] ?? '') !== (r.snapshot?.[k] ?? ''))
    .map(k => [k, { from: r.snapshot?.[k] ?? null, to: r.meta[k] }]));
  return r;
});

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

// Priority first, then worst verdict, then the most blockers.
const blockers = (/** @type {any} */ r) => r.findings.filter((/** @type {any} */ f) => f.severity === 'blocker').length;
records.sort((a, b) => PRIORITIES.indexOf(a.triage.priority) - PRIORITIES.indexOf(b.triage.priority)
  || VERDICTS.indexOf(a.verdict) - VERDICTS.indexOf(b.verdict)
  || blockers(b) - blockers(a) || a.id.localeCompare(b.id));

/** @type {Record<string, number>} */
const count = {};
const tally = (/** @type {string} */ k) => { count[k] = (count[k] || 0) + 1; };
for (const r of records) {
  tally(`verdict ${r.verdict || 'none'}`);
  tally(`priority ${r.triage.priority || 'none'}`);
  if (Object.keys(r.metaEdits).length) tally('meta edits');
  for (const f of r.findings) tally(f.severity);
  for (const x of r.expansions) tally(`expansion ${x.size}`);
}

writeFileSync(OUT, JSON.stringify({ schema: 2, generated: new Date().toISOString().slice(0, 10), count, toys: records }, null, 2) + '\n');
console.log(`${records.length} records to ${OUT}`);
for (const [k, n] of Object.entries(count).sort()) console.log(`  ${k.padEnd(18)} ${n}`);
