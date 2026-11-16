"""Bake the block at Commercial Drive and East 4th Avenue into eastvan/data/drive.json.

Usage:
  python3 drive.py fetch <raw dir>             download the extracts
  python3 drive.py bake <raw dir> <out.json>   bake them
Sources: City of Vancouver Open Data Portal, Open Government Licence - Vancouver;
OpenStreetMap contributors, ODbL (buildings and named places).
The frame: origin on the intersection; e runs east, n runs north; units are metres.
"""
import json, math, os, sys, urllib.parse, urllib.request

API = 'https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets'
# The two corners of the jogged intersection, from street-intersections.
LON0, LAT0 = -123.069671, 49.266989
RADIUS = 170
NEAR = f"within_distance(geo_point_2d, geom'POINT({LON0} {LAT0})', {RADIUS}m)"
# Shop names come with the storefront extract (Tom, 2026-11-14).
SETS = {
    'footprints': ('building-footprints-2009', 'id,bldgid,hgt_agl,rooftype,med_slope,area_m2,geom'),
    'parcels': ('property-parcel-polygons', 'civic_number,streetname,site_id,geom'),
    'trees': ('public-trees', 'asset_id,common_name,genus_name,height_m,diameter_cm,geom'),
    'poles': ('street-lighting-poles', None),
    'stores': ('storefronts-inventory', 'store_id,unit,civic_number,street,year_recorded,general_business_category,business_name,geom'),
    'heritage': ('heritage-sites', None),
}
# The tax roll has no geometry: it joins the lots by civic number and street.
TAX_STREETS = ['COMMERCIAL DR', 'E 4TH AV', 'E 3RD AV', 'MCSPADDEN AV', 'E 5TH AV']
OVERPASS = 'https://overpass-api.de/api/interpreter'
OSM_QUERY = f'[out:json][timeout:50];(way["building"](around:{RADIUS},{LAT0},{LON0});node["name"](around:{RADIUS},{LAT0},{LON0}););out tags center;'
KE, KN = 111320 * math.cos(math.radians(LAT0)), 110574

def fetch(raw):
    os.makedirs(raw, exist_ok=True)
    for name, (ds, select) in SETS.items():
        q = {'where': NEAR, 'limit': -1}
        if select: q['select'] = select
        url = f'{API}/{ds}/exports/geojson?{urllib.parse.urlencode(q)}'
        with urllib.request.urlopen(url, timeout=60) as r: data = r.read()
        with open(f'{raw}/{name}.geojson', 'wb') as f: f.write(data)
        print(f'{name}: {len(data)} bytes, {len(json.loads(data)["features"])} features')
    q = {'where': ' or '.join(f'street_name="{s}"' for s in TAX_STREETS), 'limit': -1,
         'select': 'street_name,from_civic_number,to_civic_number,year_built,big_improvement_year,legal_type,zoning_district,report_year'}
    with urllib.request.urlopen(f'{API}/property-tax-report/exports/json?{urllib.parse.urlencode(q)}', timeout=120) as r: data = r.read()
    with open(f'{raw}/tax.json', 'wb') as f: f.write(data)
    print(f'tax: {len(data)} bytes, {len(json.loads(data))} rows')
    req = urllib.request.Request(OVERPASS, data=urllib.parse.urlencode({'data': OSM_QUERY}).encode(), headers={'User-Agent': 'stimming-bake/1.0'})
    with urllib.request.urlopen(req, timeout=90) as r: data = r.read()
    with open(f'{raw}/osm.json', 'wb') as f: f.write(data)
    print(f'osm: {len(data)} bytes, {len(json.loads(data)["elements"])} elements')

def en(p): return [round((p[0] - LON0) * KE, 2), round((p[1] - LAT0) * KN, 2)]
def rings(g):
    if g['type'] == 'Polygon': return [g['coordinates'][0]]
    if g['type'] == 'MultiPolygon': return [poly[0] for poly in g['coordinates']]
    return []
def load(raw, name): return json.load(open(f'{raw}/{name}.geojson'))['features']
# Street names differ between sets: DRIVE in one, DR in the other.
def street_key(s): return (s or '').upper().replace('DRIVE', 'DR').replace('AVENUE', 'AV').strip()
def inside(pt, ring):
    x, y, c = pt[0], pt[1], False
    for i in range(len(ring)):
        a, b2 = ring[i], ring[i - 1]
        if (a[1] > y) != (b2[1] > y) and x < (b2[0] - a[0]) * (y - a[1]) / (b2[1] - a[1]) + a[0]: c = not c
    return c

def bake(raw, out):
    b = [{'id': f['properties']['bldgid'], 'h': f['properties']['hgt_agl'], 'roof': f['properties']['rooftype'], 'slope': f['properties']['med_slope'], 'ring': [en(p) for p in r]}
         for f in load(raw, 'footprints') if f['geometry'] for r in rings(f['geometry'])]
    lots = [{'civic': f['properties'].get('civic_number'), 'street': f['properties'].get('streetname'), 'ring': [en(p) for p in r]}
            for f in load(raw, 'parcels') if f['geometry'] for r in rings(f['geometry'])]
    trees = [{'at': en(f['geometry']['coordinates']), 'h': f['properties'].get('height_m'), 'd': f['properties'].get('diameter_cm'), 'name': f['properties'].get('common_name')}
             for f in load(raw, 'trees') if f['geometry']]
    poles = [en(f['geometry']['coordinates']) for f in load(raw, 'poles') if f['geometry'] and f['geometry']['type'] == 'Point']
    # One row per store: the latest year on record.
    latest = {}
    for f in load(raw, 'stores'):
        p = f['properties']
        if f['geometry'] and (p['store_id'] not in latest or p['year_recorded'] > latest[p['store_id']]['properties']['year_recorded']): latest[p['store_id']] = f
    stores = [{'at': en(f['geometry']['coordinates']), 'cat': f['properties'].get('general_business_category'), 'civic': f['properties'].get('civic_number'), 'street': f['properties'].get('street'), 'name': f['properties'].get('business_name')}
              for f in latest.values()]
    # Build years: the oldest year on the tax roll for each civic number.
    years = {}
    for t in json.load(open(f'{raw}/tax.json')):
        y = t.get('year_built')
        for c in {t.get('from_civic_number'), t.get('to_civic_number')} - {None}:
            k = (str(c).strip(), street_key(t.get('street_name')))
            if y and (k not in years or int(y) < years[k]): years[k] = int(y)
    for l in lots: l['year'] = years.get((str(l['civic']).strip(), street_key(l['street'])))
    heritage = [{'at': en(f['geometry']['coordinates']), 'name': f['properties'].get('buildingnamespecifics'), 'group': f['properties'].get('evaluationgroup'),
                 'civic': f['properties'].get('streetnumber'), 'street': f['properties'].get('streetname')}
                for f in load(raw, 'heritage') if f['geometry'] and f['geometry']['type'] == 'Point']
    # OpenStreetMap: floors, roof shape, start date and name per building; named places.
    osm = json.load(open(f'{raw}/osm.json'))['elements']
    for e in osm:
        if e['type'] != 'way' or 'center' not in e: continue
        c, t = en([e['center']['lon'], e['center']['lat']]), e.get('tags', {})
        for bb in b:
            if inside(c, bb['ring']):
                for k, v in (('levels', t.get('building:levels')), ('roofShape', t.get('roof:shape')), ('start', t.get('start_date')), ('name', t.get('name')), ('use', t.get('building'))):
                    if v: bb[k] = v
    places = [{'at': en([e['lon'], e['lat']]), 'name': e['tags']['name'], 'kind': e['tags'].get('shop') or e['tags'].get('amenity') or e['tags'].get('office')}
              for e in osm if e['type'] == 'node' and e.get('tags', {}).get('name')]
    json.dump({'origin': [LON0, LAT0], 'credit': 'Contains information licensed under the Open Government Licence – Vancouver.', 'osmCredit': '© OpenStreetMap contributors, ODbL',
               'b': b, 'lots': lots, 'trees': trees, 'poles': poles, 'stores': stores, 'heritage': heritage, 'places': places},
              open(out, 'w'), separators=(',', ':'))
    print(f'{out}: {len(b)} buildings, {len(lots)} lots ({sum(1 for l in lots if l["year"])} with a year), {len(stores)} stores, {len(heritage)} heritage, {len(places)} places, {os.path.getsize(out)} bytes')

if __name__ == '__main__':
    if len(sys.argv) >= 3 and sys.argv[1] == 'fetch': fetch(sys.argv[2])
    elif len(sys.argv) >= 4 and sys.argv[1] == 'bake': bake(sys.argv[2], sys.argv[3])
    else: sys.exit(__doc__)
