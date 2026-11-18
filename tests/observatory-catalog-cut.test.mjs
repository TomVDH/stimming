// Observatory catalog cut, the failure path. Run: node --test tests/observatory-catalog-cut.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const TOOL = fileURLToPath(new URL('../tools/hyg-cut.mjs', import.meta.url));

// Runs a temp copy of the cut on a CSV text.
// The copy writes to the temp folder, not to the real catalog.
// It gives the exit code and the error output.
// wrote is true when the cut wrote stars.bin.
function cut(csv) {
  const dir = mkdtempSync(join(tmpdir(), 'hyg-cut-'));
  try {
    mkdirSync(join(dir, 'tools'));
    mkdirSync(join(dir, 'observatory'));
    copyFileSync(TOOL, join(dir, 'tools', 'hyg-cut.mjs'));
    const file = join(dir, 'hyg.csv');
    writeFileSync(file, csv);
    const r = spawnSync(process.execPath, [join(dir, 'tools', 'hyg-cut.mjs'), file], { encoding: 'utf8' });
    return { code: r.status, err: r.stderr, wrote: existsSync(join(dir, 'observatory', 'stars.bin')) };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('a CSV without the columns the cut reads fails and names them', () => {
  const r = cut('id,hip,mag\n1,2,3\n');
  assert.equal(r.code, 1);
  assert.equal(r.wrote, false);
  assert.match(r.err, /missing columns/);
  for (const k of ['ra', 'dec', 'ci', 'dist', 'proper', 'con']) assert.match(r.err, new RegExp(`\\b${k}\\b`));
});

test('an empty CSV fails with a clear message', () => {
  const r = cut('');
  assert.equal(r.code, 1);
  assert.equal(r.wrote, false);
  assert.match(r.err, /no header/);
});

test('a CSV with every column the cut reads passes the check', () => {
  const head = 'id,hip,proper,ra,dec,dist,mag,ci,spect,bf,bayer,flam,con';
  const r = cut(`${head}\n1,32349,Sirius,6.75,-16.7,2.64,-1.46,0.009,A0,9Alp CMa,Alp,9,CMa\n`);
  assert.equal(r.code, 0, r.err);
  assert.equal(r.wrote, true);
});
