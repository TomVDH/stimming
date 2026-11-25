#!/usr/bin/env node
// Writes the share tags into every main-shelf toy page: og:* and twitter:card.
// The image is the toy's card, shared/cards/<id>.jpg (tools/sharecards.mjs makes it).
// The block sits after <title>, between two marker comments; a rerun replaces it.
//
//   node tools/ogtags.mjs [id ...]
//
// No ids writes every main-shelf toy. Run it after tools/sharecards.mjs.
// The image URL carries ?v=<hash of the card>, so rerun it whenever a card changes.

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://tomvdh.github.io/stimming/';
const OPEN = '<!-- share: tools/ogtags.mjs writes this block -->';
const CLOSE = '<!-- /share -->';

const toys = JSON.parse(readFileSync(join(ROOT, 'toys.json'), 'utf8'));
const menu = readFileSync(join(ROOT, 'index.html'), 'utf8');
const esc = (/** @type {string} */ s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
// A toy's page: its menu link, or <id>/index.html.
const pageOf = (/** @type {string} */ id) => menu.match(new RegExp(`id="${id}" href="([^"]+)"`))?.[1] || `${id}/index.html`;

const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(toys).filter(id => toys[id].number != null);
let done = 0;
for (const id of ids) {
  const t = toys[id], page = pageOf(id), file = join(ROOT, page);
  if (!t || !existsSync(file)) { console.error(`${id}: no page at ${page}`); process.exitCode = 1; continue; }
  const card = join(ROOT, 'shared', 'cards', `${id}.jpg`);
  if (!existsSync(card)) { console.error(`${id}: no card; run tools/sharecards.mjs ${id}`); process.exitCode = 1; continue; }
  // Previews cache by URL; a hash of the card gives a new card a new URL.
  const v = createHash('sha1').update(readFileSync(card)).digest('hex').slice(0, 8);
  // The motto describes the toy; a toy with none gets a plain line.
  const desc = t.tag || `${t.name}, a desk toy from Stimming.`;
  const url = SITE + page.replace(/index\.html$/, '');
  const block = [OPEN,
    '<meta property="og:type" content="website">',
    '<meta property="og:site_name" content="Stimming">',
    `<meta property="og:title" content="${esc(t.name)}">`,
    `<meta property="og:description" content="${esc(desc)}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:image" content="${SITE}shared/cards/${id}.jpg?v=${v}">`,
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="630">',
    `<meta property="og:image:alt" content="${esc(`${t.name}: the Stimming share card`)}">`,
    '<meta name="twitter:card" content="summary_large_image">',
    CLOSE].join('\n');
  let html = readFileSync(file, 'utf8');
  const at = html.indexOf(OPEN);
  if (at >= 0) html = html.slice(0, at) + block + html.slice(html.indexOf(CLOSE, at) + CLOSE.length);
  else {
    const end = html.indexOf('</title>');
    if (end < 0) { console.error(`${id}: no <title> in ${page}`); process.exitCode = 1; continue; }
    const cut = end + '</title>'.length;
    html = `${html.slice(0, cut)}\n${block}${html.slice(cut)}`;
  }
  writeFileSync(file, html);
  done++;
}
console.log(`${done} of ${ids.length} pages carry the share tags`);
