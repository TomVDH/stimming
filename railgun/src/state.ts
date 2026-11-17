// The railgun's shared state: values that more than one system writes.
// Each system sets its own fields at load, in the old global order.

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
  shaftOcc: any;
  groundTall: any;
  farBakeUpdate: () => void;
  spent: any;
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
  strike: any;
  strikeTest: boolean;
  fastRock: boolean;
  fireMode: string;
  ventSound: () => void;
  armSound: () => void;
  fire: () => void;
  cdust: number;
  dustShot: any;
  devil: number;
  blow: any;
  caseDust: any;
  muzzleFx: any;
  shardsEnd: number;
  impK: number;
  blastFx: any;
  voidFx: any;
  shot: any;
  lit: any;
  hitFlash: number;
  flashNow: number;
  tgtKind: string;
  sshot: any;
  qaFreeze: boolean;
  meter: any;
  click: () => void;
  press: any;
  spaceDown: boolean;
}

export const state = {} as State;
