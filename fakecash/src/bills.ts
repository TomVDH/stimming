// Banknote catalog: dimensions, substrates, watermarks, windows, and typed security zones.
// UV origin sits at bottom-left (0,0) to top-right (1,1).

export type BillId = 'celeste' | 'emma' | 'demas' | 'elmo' | 'lucas' | 'mark' | 'tom';

export type RectZone = readonly [u0: number, v0: number, u1: number, v1: number];
export type EllipseZone = readonly [cx: number, cy: number, rx: number, ry: number];

// 0 none, 1 diffraction hologram, 2 metallic gold/copper foil, 3 OVI ink, 4 security thread.
export type SecurityKind = 0 | 1 | 2 | 3 | 4;

export interface SecurityZone {
  rect: RectZone;
  kind: SecurityKind;
}

export interface BillDef {
  id: BillId;
  label: string;
  title: string;
  currency: string;
  aspect: number;
  frontUrl: string;
  backUrl: string;
  polymer: boolean;
  backVertical: boolean;
  glyph: string;
  glyphColor: string;
  tint: readonly [number, number, number];
  secFront: readonly [SecurityZone, SecurityZone, SecurityZone];
  secBack: readonly [SecurityZone, SecurityZone, SecurityZone];
  // Clear polymer window ellipses [cx, cy, rx, ry].
  windowsFront: readonly [EllipseZone, EllipseZone];
  windowsBack: readonly [EllipseZone, EllipseZone];
  // Thin cotton watermark panels boost backlit glow and reverse bleed-through.
  watermarkFront: RectZone;
  watermarkBack: RectZone;
  foilHue: number;
  foilGain: number;
  relief: number;
}

const NO_RECT: RectZone = [0, 0, 0, 0];
const NO_WIN: EllipseZone = [0, 0, 0, 0];
const NO_SEC: SecurityZone = { rect: NO_RECT, kind: 0 };

function sec(u0: number, v0: number, u1: number, v1: number, kind: SecurityKind): SecurityZone {
  return { rect: [u0, v0, u1, v1], kind };
}

export const BILLS: readonly BillDef[] = [
  {
    id: 'celeste',
    label: 'Celeste',
    title: '29 Francs',
    currency: 'Vingt-Neuf Francs',
    aspect: 1440 / 906,
    frontUrl: './bills/celeste-front.webp',
    backUrl: './bills/celeste-back.webp',
    polymer: false,
    backVertical: false,
    glyph: '₣',
    glyphColor: 'oklch(0.72 0.17 252)',
    tint: [0.95, 0.97, 1.0],
    // Segmented chrome thread, green mountain OVI, and metallic 29 numeral.
    secFront: [
      sec(0.308, 0.0, 0.344, 1.0, 4),
      sec(0.045, 0.73, 0.195, 0.83, 3),
      sec(0.71, 0.03, 0.96, 0.32, 3),
    ],
    secBack: [
      sec(0.608, 0.0, 0.630, 1.0, 4),
      sec(0.03, 0.65, 0.29, 0.94, 3),
      NO_SEC,
    ],
    windowsFront: [NO_WIN, NO_WIN],
    windowsBack: [NO_WIN, NO_WIN],
    watermarkFront: [0.0, 0.0, 0.29, 1.0],
    watermarkBack: [0.71, 0.0, 1.0, 1.0],
    foilHue: 3.4,
    foilGain: 0.92,
    relief: 0.95,
  },
  {
    id: 'emma',
    label: 'Emma',
    title: '500 Euro',
    currency: '500 Emma Euro',
    aspect: 1500 / 755,
    frontUrl: './bills/emma-front.webp',
    backUrl: './bills/emma-back.webp',
    polymer: false,
    backVertical: false,
    glyph: '€',
    glyphColor: 'oklch(0.72 0.2 322)',
    tint: [1.0, 0.95, 0.98],
    // Gold foil stars, colour-shift 500 OVI, and gilded coin heap.
    secFront: [
      sec(0.47, 0.74, 0.75, 0.98, 2),
      sec(0.78, 0.04, 0.97, 0.22, 3),
      sec(0.59, 0.04, 0.76, 0.48, 2),
    ],
    secBack: [
      sec(0.47, 0.74, 0.75, 0.98, 2),
      sec(0.78, 0.04, 0.97, 0.22, 3),
      sec(0.59, 0.04, 0.76, 0.48, 2),
    ],
    windowsFront: [NO_WIN, NO_WIN],
    windowsBack: [NO_WIN, NO_WIN],
    watermarkFront: [0.755, 0.0, 1.0, 1.0],
    watermarkBack: [0.755, 0.0, 1.0, 1.0],
    foilHue: 0.85,
    foilGain: 0.9,
    relief: 0.9,
  },
  {
    id: 'demas',
    label: 'Demas',
    title: '2000 Rupiah',
    currency: 'Dua Ribu Rupiah',
    aspect: 1500 / 774,
    frontUrl: './bills/demas-front.webp',
    backUrl: './bills/demas-back.webp',
    polymer: false,
    backVertical: false,
    glyph: 'Rp',
    glyphColor: 'oklch(0.74 0.11 215)',
    tint: [0.95, 0.98, 0.98],
    // Metallic Garuda crest, BI latent OVI band, and copper woven back ribbon.
    secFront: [
      sec(0.72, 0.67, 0.87, 0.95, 2),
      sec(0.58, 0.04, 0.85, 0.39, 3),
      sec(0.06, 0.77, 0.28, 0.95, 3),
    ],
    secBack: [
      sec(0.46, 0.0, 0.64, 1.0, 2),
      sec(0.70, 0.07, 0.94, 0.26, 3),
      NO_SEC,
    ],
    windowsFront: [NO_WIN, NO_WIN],
    windowsBack: [NO_WIN, NO_WIN],
    watermarkFront: [0.04, 0.05, 0.36, 0.95],
    watermarkBack: [0.64, 0.05, 0.96, 0.95],
    foilHue: 1.45,
    foilGain: 0.88,
    relief: 0.9,
  },
  {
    id: 'elmo',
    label: 'Elmo',
    title: '1000 Won',
    currency: 'Bank of Elmo 1000 Won',
    aspect: 1500 / 746,
    frontUrl: './bills/elmo-front.webp',
    backUrl: './bills/elmo-back.webp',
    polymer: false,
    backVertical: false,
    glyph: '₩',
    glyphColor: 'oklch(0.78 0.14 218)',
    tint: [0.95, 0.98, 1.0],
    // Windowed holographic thread, colour-shift 1000 OVI, and right holographic diamonds.
    secFront: [
      sec(0.533, 0.24, 0.560, 0.88, 4),
      sec(0.02, 0.04, 0.27, 0.24, 3),
      sec(0.85, 0.20, 0.97, 0.56, 1),
    ],
    secBack: [
      sec(0.76, 0.04, 0.96, 0.22, 3),
      sec(0.04, 0.34, 0.12, 0.93, 3),
      NO_SEC,
    ],
    windowsFront: [NO_WIN, NO_WIN],
    windowsBack: [NO_WIN, NO_WIN],
    watermarkFront: [0.0, 0.0, 0.26, 1.0],
    watermarkBack: [0.74, 0.0, 1.0, 1.0],
    foilHue: 3.1,
    foilGain: 0.95,
    relief: 0.95,
  },
  {
    id: 'lucas',
    label: 'Lucas',
    title: '10M Pesos',
    currency: '10,000,000 Pesos',
    aspect: 1560 / 652,
    frontUrl: './bills/lucas-front.webp',
    backUrl: './bills/lucas-back.webp',
    polymer: false,
    backVertical: true,
    glyph: '$',
    glyphColor: 'oklch(0.78 0.17 58)',
    tint: [1.0, 0.96, 0.90],
    // Crimson OVI numerals on front; windowed hologram thread and emerald OVI on back.
    secFront: [
      sec(0.07, 0.74, 0.38, 0.92, 3),
      sec(0.77, 0.07, 0.95, 0.19, 3),
      NO_SEC,
    ],
    secBack: [
      sec(0.342, 0.02, 0.384, 0.98, 4),
      sec(0.20, 0.50, 0.30, 0.97, 3),
      sec(0.70, 0.77, 0.95, 0.93, 3),
    ],
    windowsFront: [NO_WIN, NO_WIN],
    windowsBack: [NO_WIN, NO_WIN],
    watermarkFront: [0.02, 0.35, 0.42, 0.95],
    watermarkBack: [0.03, 0.04, 0.34, 0.52],
    foilHue: 0.45,
    foilGain: 0.92,
    relief: 0.9,
  },
  {
    id: 'mark',
    label: 'Mark',
    title: '£10 Note',
    currency: 'Bank of England Ten Pounds',
    aspect: 1500 / 766,
    frontUrl: './bills/mark-front.webp',
    backUrl: './bills/mark-back.webp',
    polymer: true,
    backVertical: false,
    glyph: '£',
    glyphColor: 'oklch(0.8 0.12 72)',
    tint: [0.98, 0.98, 0.97],
    // Rainbow crown and book kinegrams, gold front cathedral, rainbow back cathedral, JA copper foil.
    secFront: [
      sec(0.180, 0.75, 0.310, 0.995, 1),
      sec(0.180, 0.0, 0.310, 0.18, 1),
      sec(0.195, 0.24, 0.360, 0.73, 2),
    ],
    secBack: [
      sec(0.655, 0.25, 0.815, 0.73, 1),
      sec(0.710, 0.80, 0.815, 0.97, 2),
      sec(0.82, 0.76, 0.97, 0.95, 2),
    ],
    // Clear polymer cathedral arch and circular portrait cameo window on both sides.
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
    foilGain: 1.2,
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
    polymer: false,
    backVertical: false,
    glyph: 'Fr',
    glyphColor: 'oklch(0.87 0.16 96)',
    tint: [1.0, 0.99, 0.90],
    // Textured OVI 200 patch, brass saxophone glint, and reverse windowed security thread.
    secFront: [
      sec(0.620, 0.77, 0.99, 0.97, 3),
      sec(0.74, 0.14, 0.98, 0.75, 2),
      NO_SEC,
    ],
    secBack: [
      sec(0.302, 0.04, 0.330, 0.94, 4),
      sec(0.71, 0.04, 0.93, 0.89, 2),
      sec(0.02, 0.75, 0.25, 0.97, 3),
    ],
    windowsFront: [NO_WIN, NO_WIN],
    windowsBack: [NO_WIN, NO_WIN],
    watermarkFront: [0.305, 0.0, 0.535, 1.0],
    watermarkBack: [0.48, 0.0, 0.71, 1.0],
    foilHue: 1.15,
    foilGain: 0.95,
    relief: 1.0,
  },
];

export const BILL_MAP = new Map<BillId, BillDef>(BILLS.map(b => [b.id, b]));
