// Tests for the Drive's parts from city data: the disc and the walk's slice.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { driveParts } from '../drive.js';

const data = JSON.parse(fs.readFileSync(new URL('../data/drive.json', import.meta.url)));
const RECT = { kind: 'rect', e0: -18, n0: 21.9, e1: 12, n1: 51.9 };
const SLACK = 0.6;
// A part's centre in the data frame: x is north (n), z is east (e).
const centre = q => (q.p ? q.p : q.a ? q.a : q.ring ? [q.ring.reduce((s, r) => s + r[0], 0) / q.ring.length, 0, q.ring.reduce((s, r) => s + r[1], 0) / q.ring.length] : null);

test('rect cut stays inside', () => {
  const { PARTS } = driveParts(data, RECT);
  assert.ok(PARTS.length > 50, 'the slice has parts');
  for (const q of PARTS) {
    const c = centre(q);
    if (!c) continue;
    assert.ok(c[0] >= RECT.n0 - SLACK && c[0] <= RECT.n1 + SLACK && c[2] >= RECT.e0 - SLACK && c[2] <= RECT.e1 + SLACK, `${q.t} ${q.c} at n ${c[0].toFixed(1)}, e ${c[2].toFixed(1)}`);
  }
});

test('disc still builds', () => {
  const d = driveParts(data, { kind: 'disc', r: 58 });
  // 24 before the SW block's frontage counted (reference notes, 2026-11-14).
  assert.equal(d.POKES.filter(p => p.id.startsWith('shop')).length, 29);
  assert.equal(d.LAMPS.length, 3);
});

test('lane mouth is open', () => {
  const { PARTS } = driveParts(data, RECT);
  for (const q of PARTS) {
    if (q.t !== 'poly' || q.h < 2) continue;
    const [n, , e] = centre(q);
    assert.ok(!(n > 37.6 && n < 40.3 && e < -11.9), `a building stands in the lane at n ${n.toFixed(1)}, e ${e.toFixed(1)}`);
  }
});

// The LiDAR bake: real roof heights per building, and real canopies.
const lidarFile = new URL('../data/lidar.json', import.meta.url);
const lidar = fs.existsSync(lidarFile) ? JSON.parse(fs.readFileSync(lidarFile)) : null;

test('lidar roofs replace the guessed shapes', { skip: !lidar && 'no lidar.json yet' }, () => {
  const { PARTS } = driveParts(data, { kind: 'disc', r: 58 }, lidar);
  const grids = PARTS.filter(q => q.t === 'roofgrid');
  assert.ok(grids.length >= 10, `only ${grids.length} buildings have a roof grid`);
  // A roof grid's cells sit inside the disc and stand above the ground.
  for (const g of grids) for (const [x, z, h] of g.cells) {
    assert.ok(Math.hypot(x, z) < 58.6, `a roof cell at ${x}, ${z} is off the disc`);
    assert.ok(h > 0 && h < 40, `a roof cell is ${h} m high`);
  }
  // No guessed gable stands where a measured roof stands.
  assert.equal(PARTS.filter(q => q.t === 'roof').length, 0);
});

test('lidar canopies size the trees', { skip: !lidar && 'no lidar.json yet' }, () => {
  const measured = driveParts(data, { kind: 'disc', r: 58 }, lidar).PARTS.filter(q => q.k === 'canopy');
  assert.ok(measured.length >= 10, `only ${measured.length} trees take a measured canopy`);
});

test('flat roofs settle on a few levels', { skip: !lidar && 'no lidar.json yet' }, () => {
  const grids = driveParts(data, { kind: 'disc', r: 58 }, lidar).PARTS.filter(q => q.t === 'roofgrid' && q.top !== 'roof');
  assert.ok(grids.length > 5);
  for (const g of grids) {
    const levels = new Set(g.cells.map(c => c[2]));
    assert.ok(levels.size <= 3, `a flat roof has ${levels.size} levels`);
  }
});

// Names and styles from public sources (Tom, 2026-11-14).
test('shops carry their real names', () => {
  const { PARTS } = driveParts(data, { kind: 'disc', r: 58 }, lidar);
  const signs = PARTS.filter(q => q.t === 'sign' && q.kind === 'shop');
  assert.ok(signs.length >= 8, `only ${signs.length} named signs`);
  const names = new Set(data.stores.map(s => s.name));
  for (const s of signs) assert.ok(names.has(s.text) || s.text === 'FOR LEASE', `"${s.text}" is not a shop on record`);
  assert.ok(!signs.some(s => s.text === 'Vacant'), 'a vacant unit shows "Vacant"');
});

test('frontages take the style of their era', () => {
  const { FACES } = driveParts(data, { kind: 'disc', r: 58 }, lidar);
  // Frontages with a reference note take the note's style instead.
  const era = y => FACES.find(f => f.year === y && !f.noted)?.era;
  assert.equal(era(1920), 'early');
  assert.equal(era(1962), 'postwar');
  assert.equal(era(1983), 'modern');
  for (const f of FACES) assert.ok(['early', 'postwar', 'modern'].includes(f.era));
});

test('The Highland carries its nameplate', () => {
  const { PARTS } = driveParts(data, { kind: 'disc', r: 58 }, lidar);
  assert.ok(PARTS.some(q => q.t === 'sign' && q.kind === 'plate' && /THE HIGHLAND/.test(q.text) && /1911/.test(q.text)));
});

test('reference notes override the guessed facades', () => {
  const { FACES } = driveParts(data, { kind: 'disc', r: 58 }, lidar);
  const at = (side, n) => FACES.find(f => f.side === side && f.x0 <= n && f.x1 >= n);
  assert.equal(at(-1, 25)?.wall, 'brickDark', 'The Highland is dark brick');
  assert.equal(at(-1, -5)?.fascia, 'navy', 'the SE corner shop has a navy fascia');
  assert.equal(at(1, -40)?.era, 'modern', 'the SW block is modern');
  assert.equal(at(1, 8)?.wall, 'stucco', 'the NW corner is white stucco');
});

test('the corner carries its details', () => {
  const { PARTS, POKES, ACTS } = driveParts(data, { kind: 'disc', r: 58 }, lidar);
  const crossing = new Set(PARTS.filter(q => q.k === 'crossing').map(q => q.c));
  assert.ok(crossing.has('tomato') && crossing.has('white') && crossing.has('binGreen'), 'the crossings are red, white and green');
  assert.ok(PARTS.filter(q => q.k === 'fireEscape').length >= 6, 'The Highland has a fire escape');
  assert.ok(PARTS.some(q => q.k === 'banner'), 'the lamp poles carry banners');
  assert.ok(POKES.some(p => p.id === 'signal') && ACTS.signal, 'the signals take a poke');
});

test('the skate shop wraps the north-west corner', () => {
  const { PARTS, POKES, ACTS, MOVES } = driveParts(data, { kind: 'disc', r: 58 }, lidar);
  const signs = PARTS.filter(q => q.t === 'sign' && q.text === 'Drive Skate Shop');
  // One sign on the Drive, one on the avenue, one over the cut corner.
  assert.equal(signs.length, 3);
  assert.ok(signs.some(s => s.nrm[0] === -1 && s.nrm[1] === 0), 'a sign faces the avenue');
  assert.ok(signs.some(s => s.nrm[0] < 0 && s.nrm[1] > 0), 'a sign faces the corner');
  // The ground floor stops short of the old corner point.
  const low = PARTS.filter(q => q.t === 'poly' && q.y > 0.1 && q.h > 3 && q.h < 4.2);
  const gap = ([x, z]) => Math.hypot(x + 1.3, z + 11.9);
  assert.ok(low.some(q => q.ring.some(p => gap(p) < 2.5) && q.ring.every(p => gap(p) > 1)), 'the corner is cut');
  assert.ok(POKES.some(p => p.id === 'deck') && ACTS.deck && MOVES.deck, 'the deck kickflips');
});
