#!/usr/bin/env node
// @ts-check
// Writes the main-shelf toy table into README.md from toys.json.
// Run from the repo root: node tools/readme-toys.mjs
// It rewrites only the text between the gen:toys markers.
import { readFileSync, writeFileSync } from 'node:fs';

const START = '<!-- gen:toys -->';
const END = '<!-- /gen:toys -->';

/** @type {Record<string, {name: string, nl: string|null, tag: string|null, number: number|null}>} */
const toys = JSON.parse(readFileSync('toys.json', 'utf8'));
const rows = Object.entries(toys)
  .filter(([, t]) => t.number != null)
  .sort(([, a], [, b]) => (a.number ?? 0) - (b.number ?? 0))
  .map(([id, t]) => `| [${t.name}](https://tomvdh.github.io/stimming/${id}/) | ${t.nl ?? ''} | ${t.tag ?? ''} |`);

const table = ['| Toy | Dutch | Motto |', '|---|---|---|', ...rows].join('\n');
const readme = readFileSync('README.md', 'utf8');
const a = readme.indexOf(START);
const b = readme.indexOf(END);
// The markers must exist once, in order.
if (a < 0 || b < a) throw new Error('README.md has no gen:toys markers');
const next = readme.slice(0, a + START.length) + '\n' + table + '\n' + readme.slice(b);
writeFileSync('README.md', next);
console.log(`README.md: ${rows.length} main-shelf toys`);
