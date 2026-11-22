// The spectrograph's element rows: the strongest found line per element.
import { isFound, type Found } from './spectrum.ts';

export type Row = { el: string; label: string; depth: number; found: boolean };

const NAMES: Record<string, string> = {
  H: 'Hydrogen', He: 'Helium', Ca: 'Calcium', Na: 'Sodium', Mg: 'Magnesium', Fe: 'Iron',
  C: 'Carbon', TiO: 'Titanium oxide', N: 'Nitrogen', O: 'Oxygen', S: 'Sulphur', 'O₂': 'Our air',
};

export function rows(found: readonly Found[]): Row[] {
  const best = new Map<string, Found>();
  for (const f of found) {
    const b = best.get(f.el);
    if (!b || (isFound(f) && (!isFound(b) || f.depth > b.depth))) best.set(f.el, f);
  }
  return Object.keys(NAMES)
    .filter((el) => best.has(el))
    .map((el) => {
      const f = best.get(el)!;
      return { el, label: NAMES[el], depth: Math.max(0, f.depth), found: isFound(f) };
    });
}
