import * as THREE from 'three';
import { BILLS, type BillDef, type BillId } from './bills.ts';
import { applyBillUniforms, createBillMaterial, type BillUniforms, type SharedLook } from './material.ts';

export interface BillTextures {
  front: THREE.Texture;
  back: THREE.Texture;
}

export interface BillWear {
  crinkle: number;
  centerFold: number;
  cornerCurl: number;
  seed: number;
}

export interface BillBody {
  id: number;
  def: BillDef;
  mesh: THREE.Mesh;
  uniforms: BillUniforms;
  active: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  quat: THREE.Quaternion;
  angVel: THREE.Vector3;
  // Soft cloth spring states.
  bendX: number;
  bendXv: number;
  bendY: number;
  bendYv: number;
  twist: number;
  twistV: number;
  ripple: number;
  flutterAmp: number;
  flutterPhase: number;
  flutterFreq: number;
  wear: BillWear;
  // Cached world-space local axes for fast OBB air-cushion collision.
  axT1: THREE.Vector3;
  axT2: THREE.Vector3;
  axN: THREE.Vector3;
  seed: number;
  age: number;
}

export interface SimOpts {
  rainRate: number;
  wind: number;
  flutter: number;
  filter: BillId | 'mix';
  maxBills: number;
  reduced: boolean;
}

const BILL_H = 1.05;
const POOL_SIZE = 76;

const _vRel = new THREE.Vector3();
const _windV = new THREE.Vector3();
const _force = new THREE.Vector3();
const _torque = new THREE.Vector3();
const _dq = new THREE.Quaternion();
const _axis = new THREE.Vector3();
const _diff = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _relV = new THREE.Vector3();
const _cpTorque = new THREE.Vector3();

// Rolls a natural mix of crisp mint bills, wallet-creased bills, and properly crumpled bills.
function rollWear(polymer: boolean): BillWear {
  const r = Math.random();
  const sign = Math.random() > 0.5 ? 1 : -1;
  const seed = Math.random() * 60;
  // Polymer notes resist sharp permanent crumples more than cotton rag.
  const polyScale = polymer ? 0.45 : 1.0;

  if (r < 0.30) {
    // Smooth crisp mint note.
    return {
      crinkle: Math.random() * 0.08 * polyScale,
      centerFold: 0,
      cornerCurl: (Math.random() - 0.5) * 0.04 * polyScale,
      seed,
    };
  }
  if (r < 0.66) {
    // Gently circulated pocket bill with a soft center crease.
    return {
      crinkle: (0.28 + Math.random() * 0.28) * polyScale,
      centerFold: sign * (0.14 + Math.random() * 0.18) * polyScale,
      cornerCurl: (Math.random() - 0.5) * 0.14 * polyScale,
      seed,
    };
  }
  // Properly crumpled, half-folded, dog-eared bill waiting to be unfurled.
  return {
    crinkle: (0.68 + Math.random() * 0.32) * polyScale,
    centerFold: sign * (0.32 + Math.random() * 0.26) * polyScale,
    cornerCurl: sign * (0.18 + Math.random() * 0.20) * polyScale,
    seed,
  };
}

export class CashField {
  readonly group = new THREE.Group();
  readonly bodies: BillBody[] = [];
  private geometries = new Map<BillId, THREE.PlaneGeometry>();
  private textures: Map<BillId, BillTextures>;
  private shared: SharedLook;
  private spawnAcc = 0;
  private mixCursor = 0;
  private frustumW = 7.5;
  private frustumH = 5.0;
  private dimLevel = 1.0;

  constructor(textures: Map<BillId, BillTextures>, shared: SharedLook) {
    this.textures = textures;
    this.shared = shared;

    // 20x10 segments resolve sharp wallet V-folds and crumpled corners cleanly in mid-air.
    for (const def of BILLS) {
      const w = BILL_H * def.aspect;
      this.geometries.set(def.id, new THREE.PlaneGeometry(w, BILL_H, 20, 10));
    }

    for (let i = 0; i < POOL_SIZE; i++) {
      const def = BILLS[i % BILLS.length];
      const tex = textures.get(def.id)!;
      const w = BILL_H * def.aspect;
      const mat = createBillMaterial(def, tex.front, tex.back, shared, w, BILL_H, false);
      const mesh = new THREE.Mesh(this.geometries.get(def.id)!, mat);
      mesh.visible = false;
      mesh.frustumCulled = false;
      mesh.userData.bodyIndex = i;
      this.group.add(mesh);

      this.bodies.push({
        id: i,
        def,
        mesh,
        uniforms: mat.uniforms as BillUniforms,
        active: false,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        quat: new THREE.Quaternion(),
        angVel: new THREE.Vector3(),
        bendX: 0,
        bendXv: 0,
        bendY: 0,
        bendYv: 0,
        twist: 0,
        twistV: 0,
        ripple: 0,
        flutterAmp: 0,
        flutterPhase: Math.random() * Math.PI * 2,
        flutterFreq: 3.4 + Math.random() * 1.6,
        wear: rollWear(def.polymer),
        axT1: new THREE.Vector3(1, 0, 0),
        axT2: new THREE.Vector3(0, 1, 0),
        axN: new THREE.Vector3(0, 0, 1),
        seed: Math.random() * 100,
        age: 0,
      });
    }
  }

  setFrustum(halfW: number, halfH: number) {
    this.frustumW = Math.max(2.6, halfW);
    this.frustumH = Math.max(2.4, halfH);
  }

  private pickDef(filter: BillId | 'mix'): BillDef {
    if (filter !== 'mix') {
      const found = BILLS.find(b => b.id === filter);
      if (found) return found;
    }
    const def = BILLS[this.mixCursor % BILLS.length];
    this.mixCursor++;
    return def;
  }

  private assignDef(b: BillBody, def: BillDef) {
    if (b.def.id === def.id) return;
    b.def = def;
    const tex = this.textures.get(def.id)!;
    const w = BILL_H * def.aspect;
    b.mesh.geometry = this.geometries.get(def.id)!;
    applyBillUniforms(b.uniforms, def, tex.front, tex.back, w, BILL_H);
  }

  private acquire(maxBills: number): BillBody | null {
    const cap = Math.min(POOL_SIZE, Math.max(8, Math.round(maxBills)));
    let oldest: BillBody | null = null;
    for (let i = 0; i < cap; i++) {
      const b = this.bodies[i];
      if (!b.active) return b;
      if (!oldest || b.age > oldest.age) oldest = b;
    }
    return oldest;
  }

  // Nudges a newly spawned bill away from immediate neighbors so it enters cleanly.
  private nudgeClear(b: BillBody) {
    for (let pass = 0; pass < 3; pass++) {
      for (const other of this.bodies) {
        if (!other.active || other === b) continue;
        _diff.copy(b.pos).sub(other.pos);
        if (_diff.lengthSq() < 1.1) {
          b.pos.z += (_diff.z >= 0 ? 0.55 : -0.55);
          b.pos.x += (_diff.x >= 0 ? 0.35 : -0.35);
        }
      }
    }
    b.pos.z = Math.max(-5.2, Math.min(1.8, b.pos.z));
  }

  seedInitial(opts: SimOpts) {
    const count = opts.reduced ? 7 : Math.min(18, Math.round(opts.maxBills * 0.34));
    for (let i = 0; i < count; i++) {
      const b = this.acquire(opts.maxBills);
      if (!b) break;
      const def = this.pickDef(opts.filter);
      this.assignDef(b, def);
      b.wear = rollWear(def.polymer);
      const frac = (i + 0.5) / count;
      b.pos.set(
        (Math.random() - 0.5) * this.frustumW * 1.75,
        -this.frustumH * 0.7 + frac * this.frustumH * 1.85 + (Math.random() - 0.5) * 0.6,
        -4.4 + (i / Math.max(1, count - 1)) * 5.6 + (Math.random() - 0.5) * 0.35,
      );
      b.vel.set((Math.random() - 0.5) * 0.65, -0.55 - Math.random() * 0.55, (Math.random() - 0.5) * 0.25);
      b.quat.setFromEuler(new THREE.Euler(
        (Math.random() - 0.5) * 1.35,
        (Math.random() - 0.5) * 1.7,
        (Math.random() - 0.5) * 0.95,
      ));
      b.angVel.set((Math.random() - 0.5) * 1.8, (Math.random() - 0.5) * 2.0, (Math.random() - 0.5) * 1.1);
      b.bendX = (Math.random() - 0.5) * 0.16;
      b.bendY = (Math.random() - 0.5) * 0.10;
      b.twist = (Math.random() - 0.5) * 0.15;
      b.bendXv = 0;
      b.bendYv = 0;
      b.twistV = 0;
      b.ripple = (Math.random() - 0.5) * 0.04;
      b.flutterAmp = 0.05;
      b.active = true;
      b.age = Math.random() * 2;
      b.mesh.visible = true;
      this.nudgeClear(b);
      this.syncMesh(b);
    }
  }

  spawnFromTop(opts: SimOpts) {
    const b = this.acquire(opts.maxBills);
    if (!b) return;
    const def = this.pickDef(opts.filter);
    this.assignDef(b, def);
    b.wear = rollWear(def.polymer);
    const z = -4.6 + Math.random() * 5.8;
    const spreadX = this.frustumW * (1.25 - z * 0.08);
    b.pos.set(
      (Math.random() - 0.5) * spreadX * 1.7 - opts.wind * 1.1,
      this.frustumH * (1.15 - z * 0.09) + 0.8 + Math.random() * 1.0,
      z,
    );
    b.vel.set(
      (Math.random() - 0.5) * 0.95 + opts.wind * 0.45,
      -0.75 - Math.random() * 0.85,
      (Math.random() - 0.5) * 0.35,
    );
    b.quat.setFromEuler(new THREE.Euler(
      (Math.random() - 0.5) * 2.3,
      (Math.random() - 0.5) * Math.PI * 2,
      (Math.random() - 0.5) * 1.3,
    ));
    b.angVel.set((Math.random() - 0.5) * 2.6, (Math.random() - 0.5) * 2.8, (Math.random() - 0.5) * 1.7);
    b.bendX = (Math.random() - 0.5) * 0.18;
    b.bendY = (Math.random() - 0.5) * 0.12;
    b.twist = (Math.random() - 0.5) * 0.16;
    b.bendXv = 0;
    b.bendYv = 0;
    b.twistV = 0;
    b.ripple = (Math.random() - 0.5) * 0.045;
    b.flutterAmp = 0.06;
    b.active = true;
    b.age = 0;
    b.mesh.visible = true;
    this.nudgeClear(b);
    this.syncMesh(b);
  }

  spawnFlick(origin: THREE.Vector3, opts: SimOpts, aimX = 0) {
    const b = this.acquire(opts.maxBills);
    if (!b) return;
    const def = this.pickDef(opts.filter);
    this.assignDef(b, def);
    b.wear = rollWear(def.polymer);
    b.pos.copy(origin);
    b.pos.x += (Math.random() - 0.5) * 0.35;
    b.pos.y += (Math.random() - 0.5) * 0.25;
    b.pos.z += (Math.random() - 0.5) * 1.4;

    const fan = (Math.random() - 0.5) * 4.0 + aimX * 1.65;
    b.vel.set(fan, 2.5 + Math.random() * 2.7, (Math.random() - 0.5) * 2.2);
    b.quat.setFromEuler(new THREE.Euler(
      -0.35 + (Math.random() - 0.5) * 1.0,
      (Math.random() - 0.5) * 1.5,
      (Math.random() - 0.5) * 0.8,
    ));
    b.angVel.set(
      (Math.random() - 0.5) * 5.8,
      (Math.random() - 0.5) * 6.0,
      (Math.random() - 0.5) * 4.0,
    );
    b.bendX = 0.26 * (Math.random() > 0.5 ? 1 : -1);
    b.bendXv = (Math.random() - 0.5) * 2.1;
    b.bendY = -0.15;
    b.bendYv = 1.0;
    b.twist = (Math.random() - 0.5) * 0.28;
    b.twistV = (Math.random() - 0.5) * 1.9;
    b.ripple = (Math.random() - 0.5) * 0.05;
    b.flutterAmp = 0.11;
    b.active = true;
    b.age = 0;
    b.mesh.visible = true;
    this.nudgeClear(b);
    this.syncMesh(b);
  }

  spawnBurst(count: number, opts: SimOpts) {
    const n = Math.min(count, Math.round(opts.maxBills));
    for (let i = 0; i < n; i++) {
      const origin = new THREE.Vector3(
        (Math.random() - 0.5) * this.frustumW * 1.35,
        this.frustumH * 0.25 + Math.random() * this.frustumH * 0.85,
        -3.8 + Math.random() * 4.8,
      );
      this.spawnFlick(origin, opts, (Math.random() - 0.5) * 0.8);
    }
  }

  applyGust(worldPos: THREE.Vector3, worldVel: THREE.Vector3, strength = 1) {
    const radius = 3.2;
    const r2 = radius * radius;
    for (const b of this.bodies) {
      if (!b.active) continue;
      _diff.copy(b.pos).sub(worldPos);
      const d2 = _diff.x * _diff.x + _diff.y * _diff.y + _diff.z * _diff.z * 0.22;
      if (d2 > r2) continue;
      const w = Math.pow(1 - Math.sqrt(d2) / radius, 1.5) * strength;
      b.vel.addScaledVector(worldVel, w * 0.44);
      b.vel.y += w * 0.48;
      b.angVel.x += (worldVel.y * 0.42 + (Math.random() - 0.5) * 1.6) * w;
      b.angVel.y += (-worldVel.x * 0.52 + (Math.random() - 0.5) * 1.6) * w;
      b.angVel.z += (worldVel.x * 0.30) * w;
      b.bendXv += worldVel.x * 0.18 * w;
      b.bendYv += worldVel.y * 0.15 * w;
      b.twistV += (worldVel.x - worldVel.y) * 0.19 * w;
      b.flutterAmp = Math.min(0.18, b.flutterAmp + 0.05 * w);
    }
  }

  releaseBill(
    def: BillDef,
    pos: THREE.Vector3,
    quat: THREE.Quaternion,
    vel: THREE.Vector3,
    angVel: THREE.Vector3,
    wear: BillWear,
    opts: SimOpts,
  ) {
    const b = this.acquire(opts.maxBills);
    if (!b) return;
    this.assignDef(b, def);
    b.wear = { ...wear };
    b.pos.copy(pos);
    b.quat.copy(quat);
    b.vel.copy(vel);
    b.angVel.copy(angVel);
    b.bendX = 0.09;
    b.bendXv = 0.45;
    b.bendY = -0.05;
    b.bendYv = 0.3;
    b.twist = 0.07;
    b.twistV = 0.35;
    b.flutterAmp = 0.07;
    b.active = true;
    b.age = 0;
    b.mesh.visible = true;
    this.syncMesh(b);
  }

  hideBody(b: BillBody) {
    b.active = false;
    b.mesh.visible = false;
  }

  clear() {
    for (const b of this.bodies) {
      b.active = false;
      b.mesh.visible = false;
    }
  }

  activeCount(): number {
    let n = 0;
    for (const b of this.bodies) if (b.active) n++;
    return n;
  }

  pickBill(raycaster: THREE.Raycaster): BillBody | null {
    const meshes: THREE.Object3D[] = [];
    for (const b of this.bodies) if (b.active && b.mesh.visible) meshes.push(b.mesh);
    if (!meshes.length) return null;
    const hits = raycaster.intersectObjects(meshes, false);
    if (!hits.length) return null;
    const idx = hits[0].object.userData.bodyIndex as number;
    return this.bodies[idx] ?? null;
  }

  // Oriented slab air-cushion keeps notes from intersecting or bleeding through each other.
  private resolveCollisions(active: BillBody[], sdt: number) {
    const n = active.length;
    if (n < 2) return;
    const hh = BILL_H * 0.48;

    for (let i = 0; i < n; i++) {
      const a = active[i];
      const hwA = hh * a.def.aspect;
      const htA = 0.14 + Math.abs(a.wear.centerFold) * 0.24 + a.wear.crinkle * 0.08;

      for (let j = i + 1; j < n; j++) {
        const b = active[j];
        _diff.copy(a.pos).sub(b.pos);
        const d2 = _diff.lengthSq();
        if (d2 > 5.8) continue;

        const dist = Math.sqrt(d2);
        if (dist < 0.0001) {
          _dir.set(0, 0, 1);
        } else {
          _dir.copy(_diff).divideScalar(dist);
        }

        const hwB = hh * b.def.aspect;
        const htB = 0.14 + Math.abs(b.wear.centerFold) * 0.24 + b.wear.crinkle * 0.08;

        // Minkowski support radius along center-to-center axis approximates OBB thickness.
        const rA = hwA * Math.abs(_dir.dot(a.axT1)) + hh * Math.abs(_dir.dot(a.axT2)) + htA * Math.abs(_dir.dot(a.axN));
        const rB = hwB * Math.abs(_dir.dot(b.axT1)) + hh * Math.abs(_dir.dot(b.axT2)) + htB * Math.abs(_dir.dot(b.axN));
        const minDist = (rA + rB) * 0.86;

        if (dist >= minDist) continue;
        const pen = minDist - dist;

        // Bias separation gently along Z so bills slip cleanly in front or behind each other.
        const zBias = Math.abs(_dir.z) < 0.35 ? (a.id > b.id ? 0.28 : -0.28) : 0;
        _dir.z += zBias;
        _dir.normalize();

        // Soft positional air-cushion prevents visual clipping without jittery pops.
        const push = Math.min(0.24, pen * 0.42);
        a.pos.addScaledVector(_dir, push);
        b.pos.addScaledVector(_dir, -push);

        // Exchange gentle aerodynamic cushion impulse and subtle brush-past wobble.
        _relV.copy(a.vel).sub(b.vel);
        const vn = _relV.dot(_dir);
        if (vn < 0.45) {
          const imp = (0.45 - vn) * 0.36 + pen * 1.4 * sdt;
          a.vel.addScaledVector(_dir, imp);
          b.vel.addScaledVector(_dir, -imp);

          const wobble = Math.min(1.6, pen * 1.8);
          a.angVel.x += _dir.y * wobble * 0.6;
          a.angVel.y -= _dir.x * wobble * 0.6;
          b.angVel.x -= _dir.y * wobble * 0.6;
          b.angVel.y += _dir.x * wobble * 0.6;
          a.bendXv += wobble * 0.22;
          b.bendXv -= wobble * 0.22;
        }
      }
    }
  }

  step(dt: number, t: number, opts: SimOpts, inspecting: boolean) {
    const targetDim = inspecting ? 0.90 : 1.0;
    this.dimLevel += (targetDim - this.dimLevel) * Math.min(1, dt * 6.5);

    const timeScale = inspecting ? 0.28 : (opts.reduced ? 0.25 : 1.0);
    const sdt = dt * timeScale;

    if (!inspecting && !opts.reduced && opts.rainRate > 0.01) {
      const rate = 0.6 + opts.rainRate * opts.rainRate * 8.5;
      this.spawnAcc += dt * rate;
      let spawned = 0;
      while (this.spawnAcc >= 1 && spawned < 3) {
        this.spawnAcc -= 1;
        if (this.activeCount() < opts.maxBills) {
          this.spawnFromTop(opts);
        }
        spawned++;
      }
    }

    const cap = Math.min(POOL_SIZE, Math.max(8, Math.round(opts.maxBills)));
    const activeList: BillBody[] = [];

    for (let i = 0; i < POOL_SIZE; i++) {
      const b = this.bodies[i];
      if (!b.active) continue;
      if (i >= cap) {
        b.active = false;
        b.mesh.visible = false;
        continue;
      }

      b.age += sdt;

      b.axT1.set(1, 0, 0).applyQuaternion(b.quat);
      b.axT2.set(0, 1, 0).applyQuaternion(b.quat);
      b.axN.set(0, 0, 1).applyQuaternion(b.quat);

      // Coherent spatial air eddies + gentle breeze make nearby bills draft organically.
      const s = b.seed;
      const eddyX = Math.sin(t * 0.68 + b.pos.y * 0.42 + b.pos.z * 0.31) * 0.56
                  + Math.cos(t * 1.15 + s) * 0.24;
      const eddyY = Math.cos(t * 0.54 + b.pos.x * 0.36 + b.pos.z * 0.28) * 0.22;
      const eddyZ = Math.sin(t * 0.62 + b.pos.x * 0.38 + b.pos.y * 0.26) * 0.38;
      _windV.set(opts.wind * 2.1 + eddyX, eddyY, eddyZ);

      _vRel.copy(b.vel).sub(_windV);
      const vn = _vRel.dot(b.axN);
      const vt1 = _vRel.dot(b.axT1);
      const vt2 = _vRel.dot(b.axT2);
      const speed = _vRel.length();

      // Anisotropic flat-plate aerodynamic drag and gliding swoop lift.
      const cN = b.def.polymer ? 1.55 : 1.78;
      const cT = 0.10 + b.wear.crinkle * 0.08;
      const dragN = -vn * (1.05 + Math.abs(vn) * cN);
      const dragT1 = -vt1 * cT * (1 + speed * 0.32);
      const dragT2 = -vt2 * cT * (1 + speed * 0.32);

      // Angle-of-attack gliding lift creates classic swaying side-to-side banknote swoops.
      const glideLift1 = -vn * (vt1 / (speed + 0.35)) * 1.05;
      const glideLift2 = -vn * (vt2 / (speed + 0.35)) * 0.72;

      _force.set(0, -2.30, 0);
      _force.addScaledVector(b.axN, dragN);
      _force.addScaledVector(b.axT1, dragT1 + glideLift1);
      _force.addScaledVector(b.axT2, dragT2 + glideLift2);

      if (b.pos.z > 2.2) _force.z -= (b.pos.z - 2.2) * 3.8;
      if (b.pos.z < -5.8) _force.z += (-5.8 - b.pos.z) * 3.8;

      b.vel.addScaledVector(_force, sdt);
      b.pos.addScaledVector(b.vel, sdt);

      // Center-of-pressure rocking torque + vortex shedding creates lively flutter-wobble.
      _torque.crossVectors(_vRel, b.axN).multiplyScalar(1.08);
      // Forward CP shift during edgewise glide pitches the leading edge up and reverses the swoop.
      const cpPitch = vn * vt1 * 0.58;
      const cpRoll = vn * vt2 * 0.42;
      _cpTorque.copy(b.axT2).multiplyScalar(cpPitch).addScaledVector(b.axT1, -cpRoll);
      _torque.add(_cpTorque);

      // Vortex shedding adds organic fluttering wobble, stronger on crumpled bills.
      const shed = 0.48 + b.wear.crinkle * 0.32;
      _torque.x += Math.sin(t * 2.7 + s) * shed;
      _torque.y += Math.cos(t * 2.2 + s * 1.7) * (shed * 0.85);
      _torque.z += Math.sin(t * 1.9 + s * 2.3) * (shed * 0.65);

      b.angVel.addScaledVector(_torque, sdt);
      b.angVel.multiplyScalar(Math.exp(-1.42 * sdt));

      const wLen = b.angVel.length();
      if (wLen > 0.0001) {
        _axis.copy(b.angVel).divideScalar(wLen);
        _dq.setFromAxisAngle(_axis, Math.min(0.48, wLen * sdt));
        b.quat.premultiply(_dq).normalize();
      }

      // Lively cloth bend, twist, and trailing-edge flutter respond to airflow and spin.
      const fl = opts.flutter;
      const stiff = b.def.polymer ? 48 : (26 + b.wear.crinkle * 8);
      const damp = b.def.polymer ? 5.8 : 4.2;

      const targetBx = Math.max(-0.40, Math.min(0.40, (-vn * 0.19 + vt1 * 0.085 + b.angVel.y * 0.04) * fl));
      const targetBy = Math.max(-0.28, Math.min(0.28, (-vn * 0.12 - vt2 * 0.07 + b.angVel.x * 0.035) * fl));
      const targetTw = Math.max(-0.38, Math.min(0.38, (b.angVel.z * 0.095 + Math.sin(t * 2.9 + s) * 0.065) * fl));

      b.bendXv += ((targetBx - b.bendX) * stiff - b.bendXv * damp) * sdt;
      b.bendX += b.bendXv * sdt;
      b.bendYv += ((targetBy - b.bendY) * stiff - b.bendYv * damp) * sdt;
      b.bendY += b.bendYv * sdt;
      b.twistV += ((targetTw - b.twist) * stiff * 0.85 - b.twistV * damp) * sdt;
      b.twist += b.twistV * sdt;

      const targetAmp = Math.min(0.17, (0.024 + speed * 0.032 + Math.abs(vn) * 0.028) * fl);
      b.flutterAmp += (targetAmp - b.flutterAmp) * Math.min(1, sdt * 6.0);
      b.flutterPhase += (3.4 + speed * 4.4) * sdt;

      const boundY = this.frustumH * (1.28 - b.pos.z * 0.11) + 1.5;
      const boundX = this.frustumW * (1.55 - b.pos.z * 0.11) + 2.2;
      if (b.pos.y < -boundY || Math.abs(b.pos.x) > boundX) {
        if (!inspecting && !opts.reduced && opts.rainRate > 0.01) {
          this.spawnFromTop(opts);
          if (b.pos.y < -boundY || Math.abs(b.pos.x) > boundX) {
            b.active = false;
            b.mesh.visible = false;
          }
        } else {
          b.active = false;
          b.mesh.visible = false;
        }
        continue;
      }

      activeList.push(b);
    }

    this.resolveCollisions(activeList, sdt);
    for (const b of activeList) this.syncMesh(b);
  }

  private syncMesh(b: BillBody) {
    b.mesh.position.copy(b.pos);
    b.mesh.quaternion.copy(b.quat);
    b.mesh.renderOrder = Math.round((b.pos.z + 10) * 100);
    const u = b.uniforms;
    u.uBend.value.set(b.bendX, b.bendY, b.twist, b.ripple);
    u.uFlutter.value.set(b.flutterAmp, b.flutterPhase, b.flutterFreq, this.dimLevel);
    u.uCrinkle.value.set(b.wear.crinkle, b.wear.centerFold, b.wear.cornerCurl, b.wear.seed);
  }

  dispose() {
    for (const g of this.geometries.values()) g.dispose();
    for (const b of this.bodies) (b.mesh.material as THREE.Material).dispose();
  }
}
