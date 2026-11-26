import * as THREE from 'three';
import { BILLS, type BillDef, type BillId } from './bills.ts';
import { applyBillUniforms, createBillMaterial, type BillUniforms, type SharedLook } from './material.ts';
import type { BillTextures, BillWear } from './physics.ts';

export interface SafeCover {
  top: number;
  bottom: number;
}

const HERO_H = 1.4;

const _euler = new THREE.Euler(0, 0, 0, 'YXZ');
const _qTarget = new THREE.Quaternion();
const _vTarget = new THREE.Vector3();

export class BillInspector {
  readonly mesh: THREE.Mesh;
  private uniforms: BillUniforms;
  private geometries = new Map<BillId, THREE.PlaneGeometry>();
  private textures: Map<BillId, BillTextures>;
  private active = false;
  private def: BillDef = BILLS[0];

  private pos = new THREE.Vector3();
  private quat = new THREE.Quaternion();

  private rotY = 0;
  private rotX = 0;
  private rotZ = 0;
  private targetRotY = 0;
  private targetRotX = 0;
  private targetRotZ = 0;
  private velY = 0;
  private velX = 0;

  private zoom = 1;
  private targetZoom = 1;
  private panX = 0;
  private panY = 0;
  private targetPanX = 0;
  private targetPanY = 0;

  // Tactile paper flex springs during drags and flips.
  private bendX = 0;
  private bendXv = 0;
  private bendY = 0;
  private bendYv = 0;
  private twist = 0;
  private twistV = 0;
  private flutter = 0;
  private phase = 0;

  // Unfurling spring states smooth crumpled notes open when clicked.
  private crinkle = 0;
  private crinkleV = 0;
  private targetCrinkle = 0;
  private centerFold = 0;
  private centerFoldV = 0;
  private cornerCurl = 0;
  private cornerCurlV = 0;
  private crinkleSeed = 1.0;
  private unfurlDelay = 0;

  private viewW = 1280;
  private viewH = 720;
  private cover: SafeCover = { top: 68, bottom: 72 };
  private fovRad = THREE.MathUtils.degToRad(38);
  private cameraZ = 7.2;

  constructor(textures: Map<BillId, BillTextures>, shared: SharedLook) {
    this.textures = textures;
    // Dense grid supports physical vertex micro-displacement and smooth unfurling creases.
    for (const def of BILLS) {
      this.geometries.set(def.id, new THREE.PlaneGeometry(HERO_H * def.aspect, HERO_H, 112, 56));
    }
    const first = BILLS[0];
    const tex = textures.get(first.id)!;
    const mat = createBillMaterial(first, tex.front, tex.back, tex.maskFront, tex.maskBack, shared, HERO_H * first.aspect, HERO_H, true);
    this.uniforms = mat.uniforms as BillUniforms;
    this.mesh = new THREE.Mesh(this.geometries.get(first.id)!, mat);
    this.mesh.visible = false;
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 2500;
  }

  get isOpen(): boolean { return this.active; }
  get current(): BillDef { return this.def; }
  get currentZoom(): number { return this.zoom; }

  setViewport(w: number, h: number, fovDeg: number, camZ: number, cover: SafeCover) {
    this.viewW = Math.max(1, w);
    this.viewH = Math.max(1, h);
    this.fovRad = THREE.MathUtils.degToRad(fovDeg);
    this.cameraZ = camZ;
    this.cover = cover;
  }

  private applyDef(def: BillDef) {
    this.def = def;
    const tex = this.textures.get(def.id)!;
    const w = HERO_H * def.aspect;
    this.mesh.geometry = this.geometries.get(def.id)!;
    applyBillUniforms(this.uniforms, def, tex.front, tex.back, tex.maskFront, tex.maskBack, w, HERO_H);
  }

  open(def: BillDef, fromPos?: THREE.Vector3, fromQuat?: THREE.Quaternion, fromWear?: BillWear) {
    this.applyDef(def);
    this.active = true;
    this.mesh.visible = true;

    this.targetRotY = 0;
    this.targetRotX = -0.04;
    this.targetRotZ = 0;
    this.rotY = 0;
    this.rotX = -0.04;
    this.rotZ = 0;
    this.velX = 0;
    this.velY = 0;
    this.zoom = 1;
    this.targetZoom = 1;
    this.panX = 0;
    this.panY = 0;
    this.targetPanX = 0;
    this.targetPanY = 0;

    if (fromPos && fromQuat) {
      this.pos.copy(fromPos);
      this.quat.copy(fromQuat);
      this.bendX = 0.16;
      this.twist = 0.12;
    } else {
      const f = this.framePose();
      this.pos.set(f.x, f.y - 1.2, f.z - 0.8);
      this.quat.setFromEuler(new THREE.Euler(0.35, -0.45, -0.08));
      this.bendX = 0.12;
      this.twist = 0.08;
    }

    // Inherit crumpled paper state so worn bills visibly arrive folded, then spring open flat.
    if (fromWear) {
      this.crinkle = fromWear.crinkle;
      this.targetCrinkle = fromWear.crinkle * 0.14;
      this.centerFold = fromWear.centerFold;
      this.cornerCurl = fromWear.cornerCurl;
      this.crinkleSeed = fromWear.seed;
      this.unfurlDelay = (fromWear.crinkle > 0.25 || Math.abs(fromWear.centerFold) > 0.12) ? 0.26 : 0;
    } else {
      this.crinkle = 0.06;
      this.targetCrinkle = 0.04;
      this.centerFold = 0;
      this.cornerCurl = 0;
      this.crinkleSeed = Math.random() * 60;
      this.unfurlDelay = 0;
    }
    this.crinkleV = 0;
    this.centerFoldV = 0;
    this.cornerCurlV = 0;

    this.bendXv = 0;
    this.bendYv = 0;
    this.twistV = 0;
    this.flutter = 0.05;
  }

  switchBill(def: BillDef, dir = 1) {
    if (!this.active) {
      this.open(def);
      return;
    }
    if (this.def.id === def.id) return;
    this.applyDef(def);
    this.targetRotY = 0;
    this.targetRotX = -0.04;
    this.targetRotZ = 0;
    this.velX = 0;
    this.velY = 0;
    this.targetZoom = 1;
    this.targetPanX = 0;
    this.targetPanY = 0;
    this.pos.x += dir * 1.1;
    this.bendXv += dir * 1.5;
    this.twistV += dir * 1.0;
    this.flutter = 0.045;
    this.crinkle = 0.06;
    this.targetCrinkle = 0.04;
    this.centerFold = 0;
    this.cornerCurl = 0;
    this.unfurlDelay = 0;
  }

  close(): {
    def: BillDef;
    pos: THREE.Vector3;
    quat: THREE.Quaternion;
    vel: THREE.Vector3;
    angVel: THREE.Vector3;
    wear: BillWear;
  } {
    this.active = false;
    this.mesh.visible = false;
    return {
      def: this.def,
      pos: this.pos.clone(),
      quat: this.quat.clone(),
      vel: new THREE.Vector3((Math.random() - 0.5) * 0.9, 0.35, -0.8),
      angVel: new THREE.Vector3((Math.random() - 0.5) * 1.8, (Math.random() - 0.5) * 2.0, (Math.random() - 0.5) * 1.0),
      wear: {
        crinkle: this.crinkle,
        centerFold: this.centerFold,
        cornerCurl: this.cornerCurl,
        seed: this.crinkleSeed,
      },
    };
  }

  flip() {
    if (!this.active) return;
    const turns = Math.round(this.targetRotY / Math.PI);
    this.targetRotY = (turns + 1) * Math.PI;
    this.targetRotZ = 0;
    this.targetRotX = -0.04;
    this.velY = 0;
    this.velX = 0;
    this.bendXv += 1.65;
    this.twistV += 0.95;
    this.flutter = 0.045;
  }

  rotateQuarter() {
    if (!this.active) return;
    this.targetRotZ += Math.PI * 0.5;
    this.twistV += 0.65;
  }

  drag(dxPx: number, dyPx: number, forcePan = false) {
    if (!this.active) return;
    const scale = Math.min(this.viewW, this.viewH);
    const nx = dxPx / scale;
    const ny = dyPx / scale;

    if (forcePan || this.targetZoom > 1.25) {
      const f = this.framePose();
      const span = f.visH / this.targetZoom;
      this.targetPanX += (dxPx / this.viewH) * span;
      this.targetPanY -= (dyPx / this.viewH) * span;
      this.clampPan();
      this.bendXv += nx * 0.8;
      this.bendYv -= ny * 0.6;
      return;
    }

    const gain = 3.6;
    this.targetRotY += nx * gain;
    this.targetRotX = Math.max(-1.2, Math.min(1.2, this.targetRotX + ny * gain * 0.85));
    this.velY = nx * 16;
    this.velX = ny * 12;

    this.bendXv += nx * 2.8;
    this.bendYv -= ny * 1.9;
    this.twistV += (nx * 1.9 - ny * 1.5);
    this.flutter = Math.min(0.065, this.flutter + Math.hypot(nx, ny) * 0.15);
  }

  endDrag() {
    if (!this.active) return;
    this.velX = Math.max(-4.5, Math.min(4.5, this.velX));
    this.velY = Math.max(-6.5, Math.min(6.5, this.velY));
  }

  zoomBy(factor: number) {
    if (!this.active) return;
    this.targetZoom = Math.max(1.0, Math.min(4.6, this.targetZoom * factor));
    if (this.targetZoom <= 1.05) {
      this.targetPanX = 0;
      this.targetPanY = 0;
    } else {
      this.clampPan();
    }
  }

  resetPose() {
    if (!this.active) return;
    this.targetRotY = 0;
    this.targetRotX = -0.04;
    this.targetRotZ = 0;
    this.targetZoom = 1;
    this.targetPanX = 0;
    this.targetPanY = 0;
    this.velX = 0;
    this.velY = 0;
  }

  private clampPan() {
    const vertical = Math.abs(Math.sin(this.targetRotZ)) > 0.7;
    const bw = vertical ? HERO_H : HERO_H * this.def.aspect;
    const bh = vertical ? HERO_H * this.def.aspect : HERO_H;
    const extra = Math.max(0, 1 - 1 / this.targetZoom);
    const maxX = bw * 0.46 * extra;
    const maxY = bh * 0.46 * extra;
    this.targetPanX = Math.max(-maxX, Math.min(maxX, this.targetPanX));
    this.targetPanY = Math.max(-maxY, Math.min(maxY, this.targetPanY));
  }

  private framePose(): { x: number; y: number; z: number; visH: number } {
    const padX = this.viewW < 640 ? 28 : 56;
    const topSafe = Math.max(52, this.cover.top + 16);
    const botSafe = Math.max(64, this.cover.bottom + 20);
    const safeW = Math.max(180, this.viewW - padX * 2);
    const safeH = Math.max(160, this.viewH - topSafe - botSafe);

    const sinZ = Math.abs(Math.sin(this.rotZ));
    const cosZ = Math.abs(Math.cos(this.rotZ));
    const w0 = HERO_H * this.def.aspect;
    const h0 = HERO_H;
    const effW = w0 * cosZ + h0 * sinZ;
    const effH = w0 * sinZ + h0 * cosZ;

    const tanHalf = Math.tan(this.fovRad * 0.5);
    const aspect = this.viewW / this.viewH;

    const fill = 0.86;
    const safeFracH = safeH / this.viewH;
    const safeFracW = safeW / this.viewW;
    const distH = effH / (2 * tanHalf * safeFracH * fill);
    const distW = effW / (2 * tanHalf * aspect * safeFracW * fill);
    const baseDist = Math.max(distH, distW);

    const dist = baseDist / this.zoom;
    const visH = 2 * dist * tanHalf;

    const centerPxY = (topSafe + (this.viewH - botSafe)) * 0.5;
    const offsetFracY = (this.viewH * 0.5 - centerPxY) / this.viewH;
    const y = offsetFracY * visH;

    return { x: 0, y, z: this.cameraZ - dist, visH };
  }

  step(dt: number, t: number, reduced: boolean) {
    if (!this.active) return;

    if (Math.abs(this.velY) > 0.001 || Math.abs(this.velX) > 0.001) {
      this.targetRotY += this.velY * dt * 0.35;
      this.targetRotX = Math.max(-1.2, Math.min(1.2, this.targetRotX + this.velX * dt * 0.28));
      const decay = Math.exp(-5.5 * dt);
      this.velY *= decay;
      this.velX *= decay;
    }

    const k = reduced ? 1 : Math.min(1, dt * 11);
    this.rotY += (this.targetRotY - this.rotY) * k;
    this.rotX += (this.targetRotX - this.rotX) * k;
    this.rotZ += (this.targetRotZ - this.rotZ) * k;
    this.zoom += (this.targetZoom - this.zoom) * Math.min(1, dt * 10);
    this.panX += (this.targetPanX - this.panX) * Math.min(1, dt * 12);
    this.panY += (this.targetPanY - this.panY) * Math.min(1, dt * 12);

    const breathe = reduced || this.zoom > 1.3 ? 0 : 1;
    const f = this.framePose();
    _vTarget.set(
      f.x + this.panX,
      f.y + this.panY + Math.sin(t * 1.4) * 0.018 * breathe,
      f.z,
    );
    this.pos.lerp(_vTarget, Math.min(1, dt * 9.5));

    _euler.set(
      this.rotX + Math.cos(t * 1.1) * 0.022 * breathe,
      this.rotY + Math.sin(t * 0.85) * 0.032 * breathe,
      this.rotZ,
    );
    _qTarget.setFromEuler(_euler);
    this.quat.slerp(_qTarget, Math.min(1, dt * 12));

    // Tactile unfurl springs flatten wallet folds and crumples with a subtle crisp snap.
    if (reduced) {
      this.crinkle = this.targetCrinkle;
      this.centerFold = 0;
      this.cornerCurl = 0;
    } else if (this.unfurlDelay > 0) {
      this.unfurlDelay = Math.max(0, this.unfurlDelay - dt);
    } else {
      const uStiff = this.def.polymer ? 36 : 24;
      const uDamp = this.def.polymer ? 7.2 : 5.4;
      this.centerFoldV += ((0 - this.centerFold) * uStiff - this.centerFoldV * uDamp) * dt;
      this.centerFold += this.centerFoldV * dt;
      this.cornerCurlV += ((0 - this.cornerCurl) * (uStiff * 0.9) - this.cornerCurlV * uDamp) * dt;
      this.cornerCurl += this.cornerCurlV * dt;
      this.crinkleV += ((this.targetCrinkle - this.crinkle) * (uStiff * 0.72) - this.crinkleV * (uDamp * 1.1)) * dt;
      this.crinkle = Math.max(0, this.crinkle + this.crinkleV * dt);
    }

    const stiff = this.def.polymer ? 54 : 38;
    const damp = this.def.polymer ? 8.5 : 7.0;
    const restBend = this.zoom > 1.3 ? 0 : 0.018 * breathe;
    this.bendXv += ((restBend - this.bendX) * stiff - this.bendXv * damp) * dt;
    this.bendX += this.bendXv * dt;
    this.bendYv += ((0 - this.bendY) * stiff - this.bendYv * damp) * dt;
    this.bendY += this.bendYv * dt;
    this.twistV += ((0 - this.twist) * stiff - this.twistV * damp) * dt;
    this.twist += this.twistV * dt;
    this.flutter *= Math.exp(-4.5 * dt);
    this.phase += dt * 4.5;

    this.mesh.position.copy(this.pos);
    this.mesh.quaternion.copy(this.quat);
    this.uniforms.uBend.value.set(this.bendX, this.bendY, this.twist, 0);
    this.uniforms.uFlutter.value.set(this.flutter, this.phase, 3.8, 1.0);
    this.uniforms.uCrinkle.value.set(this.crinkle, this.centerFold, this.cornerCurl, this.crinkleSeed);
  }

  hitTest(raycaster: THREE.Raycaster): boolean {
    if (!this.active || !this.mesh.visible) return false;
    return raycaster.intersectObject(this.mesh, false).length > 0;
  }

  dispose() {
    for (const g of this.geometries.values()) g.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
