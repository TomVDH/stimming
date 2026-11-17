// Cut HYG v4.4 to the naked-eye stars. Run: node tools/hyg-cut.mjs <hyg_v44.csv>
// Writes observatory/stars.bin and observatory/stars.json. Format: observatory/src/core/catalog.ts.
import { readFileSync, writeFileSync } from 'node:fs';

const MAG_LIMIT = 6.5;
const GREEK = { Alp: 'α', Bet: 'β', Gam: 'γ', Del: 'δ', Eps: 'ε', Zet: 'ζ', Eta: 'η', The: 'θ', Iot: 'ι', Kap: 'κ', Lam: 'λ', Mu: 'μ', Nu: 'ν', Xi: 'ξ', Omi: 'ο', Pi: 'π', Rho: 'ρ', Sig: 'σ', Tau: 'τ', Ups: 'υ', Phi: 'φ', Chi: 'χ', Psi: 'ψ', Ome: 'ω' };

// Split CSV text into rows. Handles quoted fields, doubled quotes and newlines in quotes.
function parseCsv(text) {
  const rows = [];
  let row = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; }
      else f += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(f); f = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else f += c;
  }
  if (f !== '' || row.length) { row.push(f); rows.push(row); }
  return rows;
}

// "Alp" + "CMa" + flam "9" -> "α CMa"; a numbered Bayer ("Pi1") keeps its digit; no Bayer -> "9 CMa".
function label(bf, bayer, flam, con) {
  if (bayer) {
    const m = /^([A-Za-z]+?)-?(\d*)$/.exec(bayer);
    const g = m && GREEK[m[1]];
    return `${g ?? bayer}${m && g ? m[2].replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]) : ''} ${con}`.trim();
  }
  return flam && con ? `${flam} ${con}` : '';
}

const csvPath = process.argv[2];
if (!csvPath) { console.error('usage: node tools/hyg-cut.mjs <hyg_v44.csv>'); process.exit(1); }
// A byte order mark would hide the first column name.
const rows = parseCsv(readFileSync(csvPath, 'utf8').replace(/^﻿/, ''));
if (!rows.length) { console.error(`hyg-cut: ${csvPath} has no header row`); process.exit(1); }
const col = Object.fromEntries(rows[0].map((h, i) => [h, i]));
// The cut reads these columns.
// A file without one of them is not HYG v4.4.
const NEEDED = ['id', 'hip', 'proper', 'ra', 'dec', 'dist', 'mag', 'ci', 'spect', 'bf', 'bayer', 'flam', 'con'];
const missing = NEEDED.filter((k) => !(k in col));
if (missing.length) {
  console.error(`hyg-cut: ${csvPath} has missing columns: ${missing.join(', ')}`);
  process.exit(1);
}
const num = (r, k) => (r[col[k]] === '' ? NaN : Number(r[col[k]]));

const kept = [];
for (const r of rows.slice(1)) {
  if (r[col.id] === '0') continue; // the Sun
  const mag = num(r, 'mag');
  if (!(mag <= MAG_LIMIT)) continue;
  kept.push(r);
}
kept.sort((a, b) => num(a, 'mag') - num(b, 'mag'));

const STAR_BYTES = 22;
const bin = Buffer.alloc(kept.length * STAR_BYTES);
const spect = [''], spectIx = new Map([['', 0]]);
const names = {}, bayer = {};
kept.forEach((r, i) => {
  const o = i * STAR_BYTES;
  const ci = num(r, 'ci');
  const dist = num(r, 'dist');
  const sp = r[col.spect];
  if (!spectIx.has(sp)) { spectIx.set(sp, spect.length); spect.push(sp); }
  bin.writeFloatLE(num(r, 'ra') * 15, o);
  bin.writeFloatLE(num(r, 'dec'), o + 4);
  bin.writeInt16LE(Math.round(num(r, 'mag') * 100), o + 8);
  bin.writeInt16LE(Number.isNaN(ci) ? -32768 : Math.round(ci * 1000), o + 10);
  bin.writeFloatLE(Number.isNaN(dist) || dist >= 100000 ? NaN : dist, o + 12);
  bin.writeUInt32LE(r[col.hip] === '' ? 0 : Number(r[col.hip]), o + 16);
  bin.writeUInt16LE(spectIx.get(sp), o + 20);
  if (r[col.proper]) names[i] = r[col.proper];
  const b = label(r[col.bf], r[col.bayer], r[col.flam], r[col.con]);
  if (b) bayer[i] = b;
});

const out = new URL('../observatory/', import.meta.url);
writeFileSync(new URL('stars.bin', out), bin);
const json = JSON.stringify({ names, bayer, spect });
writeFileSync(new URL('stars.json', out), json);
console.log(`${kept.length} stars, stars.bin ${bin.length} B, stars.json ${Buffer.byteLength(json)} B`);
