// The railgun's shared state: values that more than one system writes.
// Each system sets its own fields at load, in the old global order.
import type * as THREE from 'three';

// The live target: the asteroid or the capital ship.
export type TargetKind = 'rock' | 'ship';
// One rail shot, or a salvo of banked rounds.
export type FireMode = 'rail' | 'salvo';
// A round that hits the ship wounds it or kills it.
export type ShipHit = 'wound' | 'kill';

// The sound times a shot cycle schedules, on the audio clock.
// The shot and hit sounds each add their own fields.
export interface Sfx {
  shot?: number;
  shotLate?: number;
  take?: string;
  hit?: number;
  impact?: number;
  boom?: number;
  late?: number;
}

// One firing cycle: a rail shot or a salvo, from release to vent.
// state.shot holds the live cycle; state.lit holds the cycle that lit the sky.
export interface Cycle {
  slide0: number;
  t0: number;
  c: number;
  n: number;
  salvo: boolean;
  T: number;
  target: THREE.Vector3;
  muzzle: THREE.Vector3;
  canHit: boolean;
  decided: boolean;
  hit: boolean;
  jolt: boolean;
  hitT: number;
  kind: TargetKind;
  res: ShipHit | null;
  // The fire call sets these five right after the literal.
  arrive: number;
  ax: THREE.Vector3;
  bk: number;
  up: THREE.Vector3;
  side: THREE.Vector3;
  // Later systems set these; each is undefined until then.
  ventT?: number;
  vented?: boolean;
  flapped?: boolean;
  ejected?: boolean;
  heated?: number;
  sprayed?: number;
  puffed?: number;
  jN?: number;
  battery?: boolean;
  blasts?: number;
  parkErr0?: number;
  sfx?: Sfx;
}

// The asteroid's last fall to the ground.
export interface Strike {
  s1: number;
  hit: boolean;
  out: boolean;
  tb: number;
  // The strike step sets L and cut later.
  L?: number;
  cut?: boolean;
}

// The spent case: place, speed, spin axis times rate, landing time.
export interface Spent {
  t0: number;
  p: THREE.Vector3;
  v: THREE.Vector3;
  w: THREE.Vector3;
  lt: number;
  bounce: number;
}

// The ship's shot at the gun.
export interface ShipShot {
  state: 'flight' | 'boom';
  t0: number;
  from: THREE.Vector3;
  to: THREE.Vector3;
  pos: THREE.Vector3;
  boomT: number;
  ring2: boolean;
}

// A late burst inside the blast's fire.
export interface Burst {
  t: number;
  k: number;
  done: boolean;
  off: THREE.Vector3;
}

// The blast of a hit: centre, radius, power, noise seed, late bursts.
export interface BlastFx {
  t0: number;
  P: THREE.Vector3;
  R: number;
  k: number;
  seed: number;
  bursts: Burst[];
}

// The void the blast clears in the sky.
export interface VoidFx {
  t0: number;
  P: THREE.Vector3;
  R: number;
  k: number;
}

// The muzzle's smoke and spray after a launch.
export interface MuzzleFx {
  t0: number;
  P: THREE.Vector3;
  ax: THREE.Vector3;
  k: number;
}

// The dust the shot raises at the muzzle's foot.
export interface DustShot {
  t0: number;
  c: number;
  foot: THREE.Vector3;
}

// The muzzle shock that throws the dust ring outward.
export interface Blow {
  t0: number;
  k: number;
}

// The dust where the spent case lands.
export interface CaseDust {
  t0: number;
  P: THREE.Vector3;
}

// A cloud that shades the sun rays: place, base, width, height, kind, seed.
export interface ShaftCloud {
  p: THREE.Vector3;
  base: number;
  W: number;
  H: number;
  kind: number;
  sd: number;
  // The range from the eye, in metres.
  r: number;
}

// The QA audio meter: the peak level and its poll timer.
export interface Meter {
  peak: number;
  id: ReturnType<typeof setInterval>;
}

// The pointer that holds the charge.
export interface Press {
  id: number;
  at: number;
}

export interface State {
  shaftGain: number;
  seed: number;
  baseExp: number;
  keyDay: number;
  sunT: number;
  rung: number;
  rungPin: boolean;
  SE: number;
  CE: number;
  SY: number;
  CY: number;
  sunSwing: number;
  shaftOcc: ShaftCloud[] | null;
  // The Dev row Marched storms: the cloud pass marches the storm field.
  cloudPass: boolean;
  // True for a portrait stage; null before the first frame.
  groundTall: boolean | null;
  farBakeUpdate: () => void;
  spent: Spent | null;
  shadowDirty: boolean;
  dustHead: number;
  dustEnd: number;
  head: number;
  lastDeath: number;
  size: { w: number; h: number; dpr: number; };
  pace: number;
  simT: number;
  rockGlowK: number;
  visible: boolean;
  compiled: boolean;
  strike: Strike | null;
  strikeTest: boolean;
  fastRock: boolean;
  fireMode: FireMode;
  ventSound: () => void;
  armSound: () => void;
  fire: (c: number, n?: number, salvo?: boolean) => void;
  cdust: number;
  dustShot: DustShot | null;
  devil: number;
  blow: Blow | null;
  caseDust: CaseDust | null;
  muzzleFx: MuzzleFx | null;
  shardsEnd: number;
  impK: number;
  blastFx: BlastFx | null;
  voidFx: VoidFx | null;
  shot: Cycle | null;
  lit: Cycle | null;
  hitFlash: number;
  flashNow: number;
  tgtKind: TargetKind;
  sshot: ShipShot | null;
  qaFreeze: boolean;
  meter: Meter | null;
  // The click reads only the arc's start point.
  click: (arc: { a: THREE.Vector3 }) => void;
  press: Press | null;
  spaceDown: boolean;
}

export const state = {} as State;
