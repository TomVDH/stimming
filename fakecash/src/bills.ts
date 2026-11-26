// Banknote catalog: dimensions, substrates, traced security masks, windows, and watermarks.
// UV origin sits at bottom-left (0,0) to top-right (1,1).

export type BillId = 'celeste' | 'emma' | 'demas' | 'elmo' | 'lucas' | 'mark' | 'peter' | 'tom';

export type RectZone = readonly [u0: number, v0: number, u1: number, v1: number];
export type EllipseZone = readonly [cx: number, cy: number, rx: number, ry: number];

export interface BillDef {
  id: BillId;
  label: string;
  title: string;
  currency: string;
  aspect: number;
  frontUrl: string;
  backUrl: string;
  // RGB security masks: R = hologram/thread, G = gold/copper foil, B = traced OVI glyphs.
  maskFrontUrl: string;
  maskBackUrl: string;
  polymer: boolean;
  glyph: string;
  glyphColor: string;
  tint: readonly [number, number, number];
  windowsFront: readonly [EllipseZone, EllipseZone];
  windowsBack: readonly [EllipseZone, EllipseZone];
  watermarkFront: RectZone;
  watermarkBack: RectZone;
  foilHue: number;
  foilGain: number;
  relief: number;
}

const NO_WIN: EllipseZone = [0, 0, 0, 0];

export const BILLS: readonly BillDef[] = [
  {
    id: 'celeste',
    label: 'Celeste',
    title: '29 Francs',
    currency: 'Vingt-Neuf Francs',
    aspect: 1440 / 906,
    frontUrl: './bills/celeste-front.webp',
    backUrl: './bills/celeste-back.webp',
    maskFrontUrl: './bills/celeste-front-mask.webp?v=2',
    maskBackUrl: './bills/celeste-back-mask.webp?v=2',
    polymer: false,
    glyph: '₣',
    glyphColor: 'oklch(0.72 0.17 252)',
    tint: [0.95, 0.97, 1.0],
    windowsFront: [NO_WIN, NO_WIN],
    windowsBack: [NO_WIN, NO_WIN],
    watermarkFront: [0.0, 0.0, 0.29, 1.0],
    watermarkBack: [0.71, 0.0, 1.0, 1.0],
    foilHue: 3.4,
    foilGain: 0.92,
    relief: 0.90,
  },
  {
    id: 'emma',
    label: 'Emma',
    title: '500 Euro',
    currency: '500 Emma Euro',
    aspect: 1500 / 755,
    frontUrl: './bills/emma-front.webp?v=2',
    backUrl: './bills/emma-back.webp',
    maskFrontUrl: './bills/emma-front-mask.webp?v=2',
    maskBackUrl: './bills/emma-back-mask.webp?v=2',
    polymer: false,
    glyph: '€',
    glyphColor: 'oklch(0.72 0.2 322)',
    tint: [1.0, 0.95, 0.98],
    windowsFront: [NO_WIN, NO_WIN],
    windowsBack: [NO_WIN, NO_WIN],
    watermarkFront: [0.0, 0.0, 0.245, 1.0],
    watermarkBack: [0.755, 0.0, 1.0, 1.0],
    foilHue: 0.85,
    foilGain: 0.95,
    relief: 0.90,
  },
  {
    id: 'demas',
    label: 'Demas',
    title: '2000 Rupiah',
    currency: 'Dua Ribu Rupiah',
    aspect: 1500 / 774,
    frontUrl: './bills/demas-front.webp',
    backUrl: './bills/demas-back.webp',
    maskFrontUrl: './bills/demas-front-mask.webp',
    maskBackUrl: './bills/demas-back-mask.webp',
    polymer: false,
    glyph: 'Rp',
    glyphColor: 'oklch(0.74 0.11 215)',
    tint: [0.95, 0.98, 0.98],
    windowsFront: [NO_WIN, NO_WIN],
    windowsBack: [NO_WIN, NO_WIN],
    watermarkFront: [0.04, 0.05, 0.36, 0.95],
    watermarkBack: [0.64, 0.05, 0.96, 0.95],
    foilHue: 1.45,
    foilGain: 0.90,
    relief: 0.88,
  },
  {
    id: 'elmo',
    label: 'Elmo',
    title: '1000 Won',
    currency: 'Bank of Elmo 1000 Won',
    aspect: 1500 / 746,
    frontUrl: './bills/elmo-front.webp',
    backUrl: './bills/elmo-back.webp',
    maskFrontUrl: './bills/elmo-front-mask.webp',
    maskBackUrl: './bills/elmo-back-mask.webp',
    polymer: false,
    glyph: '₩',
    glyphColor: 'oklch(0.78 0.14 218)',
    tint: [0.95, 0.98, 1.0],
    windowsFront: [NO_WIN, NO_WIN],
    windowsBack: [NO_WIN, NO_WIN],
    watermarkFront: [0.0, 0.0, 0.26, 1.0],
    watermarkBack: [0.74, 0.0, 1.0, 1.0],
    foilHue: 3.1,
    foilGain: 0.94,
    relief: 0.90,
  },
  {
    id: 'lucas',
    label: 'Lucas',
    title: '10M Pesos',
    currency: '10,000,000 Pesos',
    aspect: 1560 / 652,
    frontUrl: './bills/lucas-front.webp',
    backUrl: './bills/lucas-back.webp',
    maskFrontUrl: './bills/lucas-front-mask.webp',
    maskBackUrl: './bills/lucas-back-mask.webp',
    polymer: false,
    glyph: '$',
    glyphColor: 'oklch(0.78 0.17 58)',
    tint: [1.0, 0.96, 0.90],
    windowsFront: [NO_WIN, NO_WIN],
    windowsBack: [NO_WIN, NO_WIN],
    watermarkFront: [0.02, 0.35, 0.42, 0.95],
    watermarkBack: [0.03, 0.04, 0.34, 0.52],
    foilHue: 0.45,
    foilGain: 0.95,
    relief: 0.88,
  },
  {
    id: 'mark',
    label: 'Mark',
    title: '£10 Note',
    currency: 'Bank of England Ten Pounds',
    aspect: 1500 / 766,
    frontUrl: './bills/mark-front.webp',
    backUrl: './bills/mark-back.webp',
    maskFrontUrl: './bills/mark-front-mask.webp',
    maskBackUrl: './bills/mark-back-mask.webp',
    polymer: true,
    glyph: '£',
    glyphColor: 'oklch(0.8 0.12 72)',
    tint: [0.98, 0.98, 0.97],
    windowsFront: [
      [0.252, 0.465, 0.105, 0.255],
      [0.122, 0.468, 0.075, 0.165],
    ],
    windowsBack: [
      [0.748, 0.465, 0.105, 0.255],
      [0.878, 0.468, 0.075, 0.165],
    ],
    watermarkFront: [0.0, 0.0, 0.34, 1.0],
    watermarkBack: [0.66, 0.0, 1.0, 1.0],
    foilHue: 2.15,
    foilGain: 1.08,
    relief: 0.50,
  },
  {
    id: 'peter',
    label: 'Peter',
    title: '$50 CAD',
    currency: '50 Peter Pesos',
    aspect: 1500 / 762,
    frontUrl: './bills/peter-front.webp',
    backUrl: './bills/peter-back.webp',
    maskFrontUrl: './bills/peter-front-mask.webp',
    maskBackUrl: './bills/peter-back-mask.webp',
    polymer: true,
    glyph: 'C$',
    glyphColor: 'oklch(0.68 0.21 22)',
    tint: [1.0, 0.94, 0.94],
    windowsFront: [NO_WIN, NO_WIN],
    windowsBack: [NO_WIN, NO_WIN],
    watermarkFront: [0.64, 0.0, 0.85, 1.0],
    watermarkBack: [0.15, 0.0, 0.36, 1.0],
    foilHue: 0.25,
    foilGain: 1.0,
    relief: 0.55,
  },
  {
    id: 'tom',
    label: 'Tom',
    title: '200 Francs',
    currency: 'Banque Nationale de Belgique',
    aspect: 1414 / 736,
    frontUrl: './bills/tom-front.webp',
    backUrl: './bills/tom-back.webp',
    maskFrontUrl: './bills/tom-front-mask.webp?v=2',
    maskBackUrl: './bills/tom-back-mask.webp?v=2',
    polymer: false,
    glyph: 'Fr',
    glyphColor: 'oklch(0.87 0.16 96)',
    tint: [1.0, 0.99, 0.90],
    windowsFront: [NO_WIN, NO_WIN],
    windowsBack: [NO_WIN, NO_WIN],
    watermarkFront: [0.305, 0.0, 0.535, 1.0],
    watermarkBack: [0.48, 0.0, 0.71, 1.0],
    foilHue: 1.15,
    foilGain: 0.92,
    relief: 0.95,
  },
];

export const BILL_MAP = new Map<BillId, BillDef>(BILLS.map(b => [b.id, b]));
