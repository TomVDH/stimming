import json, sys
# Usage: python3 beer/data/gen_catalogue.py beer/data/research.json beer/catalogue.js
src, dst = sys.argv[1], sys.argv[2]
D = json.load(open(src))
def cm(v, d=0.0): return round((v if v is not None else d) / 10.0, 2)
HAZE = {'clear': 0.04, 'slight haze': 0.18, 'hazy': 0.5}
out = []
for b in D:
    g, bt, f, lab = b['glass'], b['bottle'], b['foam'], b['label']
    gt = (g.get('type') or '').lower()
    H, rim, mx = cm(g['heightMm']), cm(g['rimDiameterMm']) / 2, cm(g['maxBowlDiameterMm']) / 2
    stem = cm(g.get('stemHeightMm'))
    if 'coachman' in gt: kind = 'coachman'
    elif stem == 0: kind = 'tumbler'
    elif rim < mx - 0.3: kind = 'tulip'
    elif 'flute' in gt or rim < 3.7: kind = 'flute'
    else: kind = 'chalice'
    feat = (g.get('features') or '').lower() + ' ' + json.dumps(g.get('decoration', [])).lower()
    metal = 'gold' if 'gold rim' in feat else 'silver' if 'silver rim' in feat else None
    glass = dict(kind=kind, h=H, rim=round(rim, 2), max=round(mx, 2), maxAt=cm(g.get('maxBowlHeightMm'), H * 6),
                 stem=stem, foot=round(cm(g.get('footDiameterMm'), 70) / 2, 2), base=cm(g.get('baseThicknessMm'), 8),
                 wall=0.45 if b['id'] == 'hoegaarden' else 0.3 if kind == 'tumbler' else 0.18,
                 etch=('etched' in feat or 'engraved' in feat), metal=metal,
                 rock=('rock' in feat), hex=('hexagon' in gt))
    bs = (bt.get('shape') or '').lower()
    bkind = 'bulb' if b['id'] == 'duvel' else 'skittle' if 'skittle' in bs else 'champ' if 'champagne' in bs else 'steinie' if 'steinie' in bs else 'longneck' if 'longneck' in bs else 'belgian'
    paint = bt.get('glassHex') if 'paint' in (bt.get('glassColour') or '') else None
    bottle = dict(kind=bkind, cl=bt.get('volumeCl'), h=cm(bt['heightMm']), r=round(cm(bt['bodyDiameterMm']) / 2, 2),
                  sh=cm(bt.get('shoulderHeightMm'), bt['heightMm'] * 0.58), nl=cm(bt.get('neckLengthMm'), 55),
                  nr=round(cm(bt.get('neckDiameterMm'), 28) / 2, 2), glass=bt.get('glassHex') or '#3B2410', paint=paint,
                  cap=(bt.get('closure') or {}).get('hex'))
    ls = (lab.get('shape') or '').lower()
    shape = 'diamond' if 'diamond' in ls else 'round' if 'round label' in ls else 'foil' if 'foil' in ls and b['id'] == 'delirium-tremens' else 'printed' if 'printed' in ls else 'arch' if 'arch' in ls else 'oval' if 'oval' in ls else 'rect'
    cl = (b.get('clarity') or 'clear').lower()
    haze = 0.85 if cl.startswith('cloudy') else HAZE.get(cl, 0.04)
    stab = (f.get('stability') or 'med').lower()
    ch = (f.get('character') or '').lower()
    cell = 0.14 if any(k in ch for k in ('dense', 'creamy', 'fine')) else 0.2 if any(k in ch for k in ('thin', 'loose', 'fizzy')) else 0.16
    co2 = (b.get('carbonation') or {}).get('volumesCO2') or 2.8
    red = 'kriek' in b['id'] or 'rodenbach' in b['id']
    p = b.get('pour') or {}
    out.append(dict(id=b['id'], name=b['name'], brewery=b.get('brewery'), style=b['style'], abv=b['abv'],
        ebc=b['colour'].get('ebc'), tint=b['colour'].get('hex') if red else None, haze=haze,
        foam=f.get('hex') or '#FBF8EF', half=round((f.get('halfLifeS') or 120) / 3), power={'high': 1.5, 'med': 1.1, 'low': 0.75}.get(stab, 1.1),
        cell=cell, fizz=round(min(1, max(0.45, 0.45 + (co2 - 2.4) / 1.6 * 0.55)), 2),
        glass=glass, bottle=bottle, label=dict(shape=shape, colours=[c['hex'] for c in lab.get('colours', [])], elements=lab.get('elements')),
        pour=dict(tilt=p.get('tiltDeg') or 45, head=p.get('headCm') or 3, yeast=bool(p.get('leaveYeast')))))
head = '''/* Beer pour: the beers, their glasses and their bottles. */
// beer/data/gen_catalogue.py writes this file from beer/data/research.json; do not edit by hand.
// Lengths are in cm. ebc: colour; tint: a measured colour for red beers.
// half: head half-life (s) on Fast time; Real time is three times longer.
// Most sizes and colours are estimates; real label art goes in labels/<id>.png.
'''
js = head + 'export const BEERS = ' + json.dumps(out, indent=1, ensure_ascii=False) + ';\n'
open(dst, 'w').write(js)
print(len(out), 'beers')
for o in out: print(o['id'], o['glass']['kind'], o['bottle']['kind'], o['label']['shape'])
