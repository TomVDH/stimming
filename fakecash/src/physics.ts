import * as THREE from 'three';
import { BILLS, type BillDef, type BillId } from './bills.ts';
import {
  applyBillUniforms,
  createBillMaterial,
  createShadowDepthMaterial,
  type BillUniforms,
  type SharedLook,
} from './material.ts';

export interface BillTextures {
  front: THREE.Texture;
  back: THREE.Texture;
  maskFront: THREE.Texture;
  maskBack: THREE.Texture;
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
  depthMat: THREE.ShaderMaterial;
  uniforms: BillUniforms;
  active: boolean;
  fadingOut: boolean;
  opacity: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  quat: THREE.Quaternion;
  angVel: THREE.Vector3;
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
const POOL_SIZE = 72;

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

// Rolls clean flat notes (~60%) and cleanly wallet-folded notes (~40%); zero lumpy crumple noise.
function rollWear(polymer: boolean, forceTier?: 0 | 1 | 2): BillWear {
  const tier = forceTier ?? (Math.random() < 0.55 ? 0 : (Math.random() < 0.55 ? 1 : 2));
  const sign = Math.random() > 0.5 ? 1 : -1;
  const seed = Math.random() * 60;
  const polyScale = polymer ? 0.45 : 1.0;

  if (tier === 0) {
    return { crinkle: 0, centerFold: 0, cornerCurl: 0, seed };
  }
  if (tier === 1) {
    // Crisp gentle center wallet crease.
    return {
      crinkle: 0,
      centerFold: sign * (0.24 + Math.random() * 0.16) * polyScale,
      cornerCurl: sign * (0.08 + Math.random() * 0.08) * polyScale,
      seed,
    };
  }
  // Sharply folded half-crease + subtle dog-ear that unfolds cleanly on click.
  return {
    crinkle: 0,
    centerFold: sign * (0.44 + Math.random() * 0.20) * polyScale,
    cornerCurl: sign * (0.14 + Math.random() * 0.12) * polyScale,
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

    // 24x12 segments capture deep V-folds and crumpled corners cleanly in mid-air.
    for (const def of BILLS) {
      const w = BILL_H * def.aspect;
      this.geometries.set(def.id, new THREE.PlaneGeometry(w, BILL_H, 24, 12));
    }

    for (let i = 0; i < POOL_SIZE; i++) {
      const def = BILLS[i % BILLS.length];
      const tex = textures.get(def.id)!;
      const w = BILL_H * def.aspect;
      const mat = createBillMaterial(def, tex.front, tex.back, tex.maskFront, tex.maskBack, shared, w, BILL_H, false);
      const uniforms = mat.uniforms as BillUniforms;
      const depthMat = createShadowDepthMaterial(uniforms);
      const mesh = new THREE.Mesh(this.geometries.get(def.id)!, mat);
      mesh.visible = false;
      mesh.frustumCulled = false;
      mesh.userData.bodyIndex = i;
      this.group.add(mesh);

      this.bodies.push({
        id: i,
        def,
        mesh,
        depthMat,
        uniforms,
        active: false,
        fadingOut: false,
        opacity: 0,
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
    applyBillUniforms(b.uniforms, def, tex.front, tex.back, tex.maskFront, tex.maskBack, w, BILL_H);
  }

  // Acquires an idle slot; never pops a visible bill mid-screen without fading.
  private acquireFree(maxBills: number): BillBody | null {
    const cap = Math.min(POOL_SIZE, Math.max(8, Math.round(maxBills)));
    for (let i = 0; i < cap; i++) {
      if (!this.bodies[i].active) return this.bodies[i];
    }
    return null;
  }

  // Marks the oldest visible note to fade out gracefully when spraying past maxBills.
  private acquireForBurst(maxBills: number): BillBody | null {
    const free = this.acquireFree(maxBills);
    if (free) return free;
    const cap = Math.min(POOL_SIZE, Math.max(8, Math.round(maxBills)));
    let oldest: BillBody | null = null;
    for (let i = 0; i < cap; i++) {
      const b = this.bodies[i];
      if (!oldest || b.age > oldest.age) oldest = b;
    }
    return oldest;
  }

  private nudgeClear(b: BillBody) {
    for (let pass = 0; pass < 3; pass++) {
      for (const other of this.bodies) {
        if (!other.active || other === b) continue;
        _diff.copy(b.pos).sub(other.pos);
        if (_diff.lengthSq() < 1.35) {
          b.pos.z += (_diff.z >= 0 ? 0.65 : -0.65);
          b.pos.x += (_diff.x >= 0 ? 0.42 : -0.42);
        }
      }
    }
    b.pos.z = Math.max(-4.6, Math.min(1.6, b.pos.z));
  }

  seedInitial(opts: SimOpts) {
    const count = opts.reduced ? 6 : Math.min(10, Math.round(opts.maxBills * 0.4));
    for (let i = 0; i < count; i++) {
      const b = this.acquireFree(opts.maxBills);
      if (!b) break;
      const def = this.pickDef(opts.filter);
      this.assignDef(b, def);
      // Cycle all three wear tiers explicitly so smooth, folded, and crumpled notes show at load.
      b.wear = rollWear(def.polymer, (i % 3) as 0 | 1 | 2);
      const frac = (i + 0.5) / count;
      b.pos.set(
        (Math.random() - 0.5) * this.frustumW * 1.45,
        -this.frustumH * 0.55 + frac * this.frustumH * 1.45 + (Math.random() - 0.5) * 0.35,
        -3.8 + (i / Math.max(1, count - 1)) * 4.8 + (Math.random() - 0.5) * 0.25,
      );
      b.vel.set((Math.random() - 0.5) * 0.5, -0.35 - Math.random() * 0.35, (Math.random() - 0.5) * 0.18);
      b.quat.setFromEuler(new THREE.Euler(
        (Math.random() - 0.5) * 1.15,
        (Math.random() - 0.5) * 1.5,
        (Math.random() - 0.5) * 0.85,
      ));
      b.angVel.set((Math.random() - 0.5) * 1.4, (Math.random() - 0.5) * 1.6, (Math.random() - 0.5) * 0.9);
      b.bendX = (Math.random() - 0.5) * 0.14;
      b.bendY = (Math.random() - 0.5) * 0.08;
      b.twist = (Math.random() - 0.5) * 0.12;
      b.bendXv = 0;
      b.bendYv = 0;
      b.twistV = 0;
      b.ripple = (Math.random() - 0.5) * 0.035;
      b.flutterAmp = 0.04;
      b.active = true;
      b.fadingOut = false;
      b.opacity = 0.35;
      b.age = Math.random() * 1.5;
      b.mesh.visible = true;
      this.nudgeClear(b);
      this.syncMesh(b);
    }
  }

  // Spawns well above the top frustum so bills glide gracefully into view.
  spawnFromTop(opts: SimOpts) {
    const b = this.acquireFree(opts.maxBills);
    if (!b) return;
    const def = this.pickDef(opts.filter);
    this.assignDef(b, def);
    b.wear = rollWear(def.polymer);
    const z = -4.2 + Math.random() * 5.2;
    const depthScale = 1 - z / 7.2;
    const spreadX = this.frustumW * depthScale * 0.85;
    b.pos.set(
      (Math.random() - 0.5) * spreadX * 1.75 - opts.wind * 1.25,
      this.frustumH * depthScale + 1.55 + Math.random() * 0.9,
      z,
    );
    b.vel.set(
      (Math.random() - 0.5) * 0.65 + opts.wind * 0.35,
      -0.45 - Math.random() * 0.45,
      (Math.random() - 0.5) * 0.25,
    );
    b.quat.setFromEuler(new THREE.Euler(
      (Math.random() - 0.5) * 2.0,
      (Math.random() - 0.5) * Math.PI * 2,
      (Math.random() - 0.5) * 1.1,
    ));
    b.angVel.set((Math.random() - 0.5) * 2.0, (Math.random() - 0.5) * 2.2, (Math.random() - 0.5) * 1.3);
    b.bendX = (Math.random() - 0.5) * 0.16;
    b.bendY = (Math.random() - 0.5) * 0.10;
    b.twist = (Math.random() - 0.5) * 0.14;
    b.bendXv = 0;
    b.bendYv = 0;
    b.twistV = 0;
    b.ripple = (Math.random() - 0.5) * 0.04;
    b.flutterAmp = 0.05;
    b.active = true;
    b.fadingOut = false;
    b.opacity = 0.01;
    b.age = 0;
    b.mesh.visible = true;
    this.nudgeClear(b);
    this.syncMesh(b);
  }

  spawnFlick(origin: THREE.Vector3, opts: SimOpts, aimX = 0) {
    const b = this.acquireForBurst(opts.maxBills);
    if (!b) return;
    const def = this.pickDef(opts.filter);
    this.assignDef(b, def);
    b.wear = rollWear(def.polymer);
    b.pos.copy(origin);
    b.pos.x += (Math.random() - 0.5) * 0.32;
    b.pos.y += (Math.random() - 0.5) * 0.22;
    b.pos.z += (Math.random() - 0.5) * 1.4;

    const fan = (Math.random() - 0.5) * 3.4 + aimX * 1.45;
    b.vel.set(fan, 2.2 + Math.random() * 2.2, (Math.random() - 0.5) * 1.8);
    b.quat.setFromEuler(new THREE.Euler(
      -0.35 + (Math.random() - 0.5) * 0.9,
      (Math.random() - 0.5) * 1.4,
      (Math.random() - 0.5) * 0.7,
    ));
    b.angVel.set(
      (Math.random() - 0.5) * 5.0,
      (Math.random() - 0.5) * 5.2,
      (Math.random() - 0.5) * 3.4,
    );
    b.bendX = 0.24 * (Math.random() > 0.5 ? 1 : -1);
    b.bendXv = (Math.random() - 0.5) * 1.9;
    b.bendY = -0.14;
    b.bendYv = 0.9;
    b.twist = (Math.random() - 0.5) * 0.26;
    b.twistV = (Math.random() - 0.5) * 1.7;
    b.ripple = (Math.random() - 0.5) * 0.045;
    b.flutterAmp = 0.09;
    b.active = true;
    b.fadingOut = false;
    b.opacity = 0.05;
    b.age = 0;
    b.mesh.visible = true;
    this.nudgeClear(b);
    this.syncMesh(b);
  }

  spawnBurst(count: number, opts: SimOpts) {
    const n = Math.min(count, Math.round(opts.maxBills));
    for (let i = 0; i < n; i++) {
      const origin = new THREE.Vector3(
        (Math.random() - 0.5) * this.frustumW * 1.25,
        this.frustumH * 0.25 + Math.random() * this.frustumH * 0.75,
        -3.5 + Math.random() * 4.2,
      );
      this.spawnFlick(origin, opts, (Math.random() - 0.5) * 0.7);
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
      b.vel.addScaledVector(worldVel, w * 0.42);
      b.vel.y += w * 0.45;
      b.angVel.x += (worldVel.y * 0.40 + (Math.random() - 0.5) * 1.5) * w;
      b.angVel.y += (-worldVel.x * 0.48 + (Math.random() - 0.5) * 1.5) * w;
      b.angVel.z += (worldVel.x * 0.28) * w;
      b.bendXv += worldVel.x * 0.16 * w;
      b.bendYv += worldVel.y * 0.14 * w;
      b.twistV += (worldVel.x - worldVel.y) * 0.17 * w;
      b.flutterAmp = Math.min(0.17, b.flutterAmp + 0.045 * w);
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
    const b = this.acquireForBurst(opts.maxBills);
    if (!b) return;
    this.assignDef(b, def);
    b.wear = { ...wear };
    b.pos.copy(pos);
    b.quat.copy(quat);
    b.vel.copy(vel);
    b.angVel.copy(angVel);
    b.bendX = 0.08;
    b.bendXv = 0.4;
    b.bendY = -0.05;
    b.bendYv = 0.25;
    b.twist = 0.06;
    b.twistV = 0.3;
    b.flutterAmp = 0.06;
    b.active = true;
    b.fadingOut = false;
    b.opacity = 1.0;
    b.age = 0;
    b.mesh.visible = true;
    this.syncMesh(b);
  }

  hideBody(b: BillBody) {
    b.active = false;
    b.fadingOut = false;
    b.opacity = 0;
    b.mesh.visible = false;
  }

  // Smoothly fades all active notes out instead of snapping them off-screen.
  clear() {
    for (const b of this.bodies) {
      if (b.active) b.fadingOut = true;
    }
  }

  clearImmediate() {
    for (const b of this.bodies) {
      b.active = false;
      b.fadingOut = false;
      b.opacity = 0;
      b.mesh.visible = false;
    }
  }

  activeCount(): number {
    let n = 0;
    for (const b of this.bodies) if (b.active && !b.fadingOut) n++;
    return n;
  }

  pickBill(raycaster: THREE.Raycaster): BillBody | null {
    const meshes: THREE.Object3D[] = [];
    for (const b of this.bodies) {
      if (b.active && !b.fadingOut && b.opacity > 0.35 && b.mesh.visible) meshes.push(b.mesh);
    }
    if (!meshes.length) return null;
    const hits = raycaster.intersectObjects(meshes, false);
    if (!hits.length) return null;
    const idx = hits[0].object.userData.bodyIndex as number;
    return this.bodies[idx] ?? null;
  }

  private resolveCollisions(active: BillBody[], sdt: number) {
    const n = active.length;
    if (n < 2) return;
    const hh = BILL_H * 0.48;

    for (let i = 0; i < n; i++) {
      const a = active[i];
      const hwA = hh * a.def.aspect;
      const htA = 0.16 + Math.abs(a.wear.centerFold) * 0.28 + a.wear.crinkle * 0.12;

      for (let j = i + 1; j < n; j++) {
        const b = active[j];
        _diff.copy(a.pos).sub(b.pos);
        const d2 = _diff.lengthSq();
        if (d2 > 6.2) continue;

        const dist = Math.sqrt(d2);
        if (dist < 0.0001) _dir.set(0, 0, 1);
        else _dir.copy(_diff).divideScalar(dist);

        const hwB = hh * b.def.aspect;
        const htB = 0.16 + Math.abs(b.wear.centerFold) * 0.28 + b.wear.crinkle * 0.12;

        const rA = hwA * Math.abs(_dir.dot(a.axT1)) + hh * Math.abs(_dir.dot(a.axT2)) + htA * Math.abs(_dir.dot(a.axN));
        const rB = hwB * Math.abs(_dir.dot(b.axT1)) + hh * Math.abs(_dir.dot(b.axT2)) + htB * Math.abs(_dir.dot(b.axN));
        const minDist = (rA + rB) * 0.88;

        if (dist >= minDist) continue;
        const pen = minDist - dist;

        const zBias = Math.abs(_dir.z) < 0.38 ? (a.id > b.id ? 0.32 : -0.32) : 0;
        _dir.z += zBias;
        _dir.normalize();

        const push = Math.min(0.24, pen * 0.44);
        a.pos.addScaledVector(_dir, push);
        b.pos.addScaledVector(_dir, -push);

        _relV.copy(a.vel).sub(b.vel);
        const vn = _relV.dot(_dir);
        if (vn < 0.42) {
          const imp = (0.42 - vn) * 0.35 + pen * 1.2 * sdt;
          a.vel.addScaledVector(_dir, imp);
          b.vel.addScaledVector(_dir, -imp);

          const wobble = Math.min(1.5, pen * 1.6);
          a.angVel.x += _dir.y * wobble * 0.55;
          a.angVel.y -= _dir.x * wobble * 0.55;
          b.angVel.x -= _dir.y * wobble * 0.55;
          b.angVel.y += _dir.x * wobble * 0.55;
          a.bendXv += wobble * 0.20;
          b.bendXv -= wobble * 0.20;
        }
      }
    }
  }

  step(dt: number, t: number, opts: SimOpts, inspecting: boolean) {
    const targetDim = inspecting ? 0.90 : 1.0;
    this.dimLevel += (targetDim - this.dimLevel) * Math.min(1, dt * 6.5);

    const timeScale = inspecting ? 0.26 : (opts.reduced ? 0.25 : 1.0);
    const sdt = dt * timeScale;

    // Calm, graceful spawn cadence so notes drift in steadily without flooding the sky.
    if (!inspecting && !opts.reduced && opts.rainRate > 0.01) {
      const rate = 0.25 + opts.rainRate * opts.rainRate * 4.4;
      this.spawnAcc += dt * rate;
      if (this.spawnAcc >= 1) {
        this.spawnAcc -= 1;
        if (this.activeCount() < opts.maxBills) {
          this.spawnFromTop(opts);
        }
      }
    }

    const cap = Math.min(POOL_SIZE, Math.max(8, Math.round(opts.maxBills)));
    const activeList: BillBody[] = [];

    for (let i = 0; i < POOL_SIZE; i++) {
      const b = this.bodies[i];
      if (!b.active) continue;
      if (i >= cap) b.fadingOut = true;

      b.age += sdt;

      // Graceful opacity envelope fades bills softly on entry and exit.
      if (b.fadingOut) {
        b.opacity = Math.max(0, b.opacity - dt * 1.35);
        if (b.opacity <= 0.004) {
          b.active = false;
          b.fadingOut = false;
          b.mesh.visible = false;
          continue;
        }
      } else if (b.opacity < 1) {
        b.opacity = Math.min(1, b.opacity + dt * 1.55);
      }

      b.axT1.set(1, 0, 0).applyQuaternion(b.quat);
      b.axT2.set(0, 1, 0).applyQuaternion(b.quat);
      b.axN.set(0, 0, 1).applyQuaternion(b.quat);

      const s = b.seed;
      const eddyX = Math.sin(t * 0.62 + b.pos.y * 0.40 + b.pos.z * 0.30) * 0.52
                  + Math.cos(t * 1.05 + s) * 0.22;
      const eddyY = Math.cos(t * 0.50 + b.pos.x * 0.34 + b.pos.z * 0.26) * 0.22;
      const eddyZ = Math.sin(t * 0.56 + b.pos.x * 0.36 + b.pos.y * 0.24) * 0.34;
      _windV.set(opts.wind * 1.85 + eddyX, eddyY, eddyZ);

      _vRel.copy(b.vel).sub(_windV);
      const vn = _vRel.dot(b.axN);
      const vt1 = _vRel.dot(b.axT1);
      const vt2 = _vRel.dot(b.axT2);
      const speed = _vRel.length();

      // Buoyant paper gravity + strong flat-plate air cushion create languid, graceful drift.
      const cN = b.def.polymer ? 1.65 : 1.92;
      const cT = 0.11 + b.wear.crinkle * 0.09;
      const dragN = -vn * (1.22 + Math.abs(vn) * cN);
      const dragT1 = -vt1 * cT * (1 + speed * 0.30);
      const dragT2 = -vt2 * cT * (1 + speed * 0.30);

      const glideLift1 = -vn * (vt1 / (speed + 0.32)) * 1.12;
      const glideLift2 = -vn * (vt2 / (speed + 0.32)) * 0.78;

      _force.set(0, -1.58, 0);
      _force.addScaledVector(b.axN, dragN);
      _force.addScaledVector(b.axT1, dragT1 + glideLift1);
      _force.addScaledVector(b.axT2, dragT2 + glideLift2);

      if (b.pos.z > 1.8) _force.z -= (b.pos.z - 1.8) * 3.8;
      if (b.pos.z < -5.2) _force.z += (-5.2 - b.pos.z) * 3.8;

      b.vel.addScaledVector(_force, sdt);
      b.pos.addScaledVector(b.vel, sdt);

      _torque.crossVectors(_vRel, b.axN).multiplyScalar(1.05);
      const cpPitch = vn * vt1 * 0.62;
      const cpRoll = vn * vt2 * 0.45;
      _cpTorque.copy(b.axT2).multiplyScalar(cpPitch).addScaledVector(b.axT1, -cpRoll);
      _torque.add(_cpTorque);

      const shed = 0.44 + b.wear.crinkle * 0.34;
      _torque.x += Math.sin(t * 2.5 + s) * shed;
      _torque.y += Math.cos(t * 2.0 + s * 1.7) * (shed * 0.85);
      _torque.z += Math.sin(t * 1.8 + s * 2.3) * (shed * 0.65);

      b.angVel.addScaledVector(_torque, sdt);
      b.angVel.multiplyScalar(Math.exp(-1.52 * sdt));

      const wLen = b.angVel.length();
      if (wLen > 0.0001) {
        _axis.copy(b.angVel).divideScalar(wLen);
        _dq.setFromAxisAngle(_axis, Math.min(0.45, wLen * sdt));
        b.quat.premultiply(_dq).normalize();
      }

      const fl = opts.flutter;
      const stiff = b.def.polymer ? 46 : (26 + b.wear.crinkle * 8);
      const damp = b.def.polymer ? 5.8 : 4.2;

      const targetBx = Math.max(-0.38, Math.min(0.38, (-vn * 0.20 + vt1 * 0.085 + b.angVel.y * 0.04) * fl));
      const targetBy = Math.max(-0.26, Math.min(0.26, (-vn * 0.12 - vt2 * 0.07 + b.angVel.x * 0.035) * fl));
      const targetTw = Math.max(-0.36, Math.min(0.36, (b.angVel.z * 0.095 + Math.sin(t * 2.7 + s) * 0.065) * fl));

      b.bendXv += ((targetBx - b.bendX) * stiff - b.bendXv * damp) * sdt;
      b.bendX += b.bendXv * sdt;
      b.bendYv += ((targetBy - b.bendY) * stiff - b.bendYv * damp) * sdt;
      b.bendY += b.bendYv * sdt;
      b.twistV += ((targetTw - b.twist) * stiff * 0.85 - b.twistV * damp) * sdt;
      b.twist += b.twistV * sdt;

      const targetAmp = Math.min(0.16, (0.022 + speed * 0.030 + Math.abs(vn) * 0.026) * fl);
      b.flutterAmp += (targetAmp - b.flutterAmp) * Math.min(1, sdt * 6.0);
      b.flutterPhase += (3.1 + speed * 4.0) * sdt;

      // Begin graceful fade-out once a bill drifts past the lower or lateral viewport edge.
      const depthScale = 1 - b.pos.z / 7.2;
      const fadeY = this.frustumH * depthScale + 0.85;
      const fadeX = this.frustumW * depthScale + 1.15;
      if (!b.fadingOut && (b.pos.y < -fadeY || Math.abs(b.pos.x) > fadeX)) {
        b.fadingOut = true;
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
    u.uOpacity.value = b.opacity;
  }

  dispose() {
    for (const g of this.geometries.values()) g.dispose();
    for (const b of this.bodies) {
      (b.mesh.material as THREE.Material).dispose();
      b.depthMat.dispose();
    }
  }
}
