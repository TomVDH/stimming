"""Bake the block at Commercial Drive and East 4th Avenue into eastvan/data/drive.json.

Usage:
  python3 drive.py fetch <raw dir>             download the five extracts
  python3 drive.py bake <raw dir> <out.json>   bake them
Source: City of Vancouver Open Data Portal, Open Government Licence - Vancouver.
The frame: origin on the intersection; e runs east, n runs north; units are metres.
"""
import json, math, os, sys, urllib.parse, urllib.request

API = 'https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets'
# The two corners of the jogged intersection, from street-intersections.
LON0, LAT0 = -123.069671, 49.266989
RADIUS = 170
NEAR = f"within_distance(geo_point_2d, geom'POINT({LON0} {LAT0})', {RADIUS}m)"
# The storefront extract leaves out business names: the toy invents its own.
SETS = {
    'footprints': ('building-footprints-2009', 'id,bldgid,hgt_agl,rooftype,med_slope,area_m2,geom'),
    'parcels': ('property-parcel-polygons', 'civic_number,streetname,site_id,geom'),
    'trees': ('public-trees', 'asset_id,common_name,genus_name,height_m,diameter_cm,geom'),
    'poles': ('street-lighting-poles', None),
    'stores': ('storefronts-inventory', 'store_id,unit,civic_number,street,year_recorded,general_business_category,geom'),
}
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

def en(p): return [round((p[0] - LON0) * KE, 2), round((p[1] - LAT0) * KN, 2)]
def rings(g):
    if g['type'] == 'Polygon': return [g['coordinates'][0]]
    if g['type'] == 'MultiPolygon': return [poly[0] for poly in g['coordinates']]
    return []
def load(raw, name): return json.load(open(f'{raw}/{name}.geojson'))['features']

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
    stores = [{'at': en(f['geometry']['coordinates']), 'cat': f['properties'].get('general_business_category'), 'civic': f['properties'].get('civic_number'), 'street': f['properties'].get('street')}
              for f in latest.values()]
    json.dump({'origin': [LON0, LAT0], 'credit': 'Contains information licensed under the Open Government Licence - Vancouver.', 'b': b, 'lots': lots, 'trees': trees, 'poles': poles, 'stores': stores},
              open(out, 'w'), separators=(',', ':'))
    print(f'{out}: {len(b)} buildings, {len(lots)} lots, {len(trees)} trees, {len(poles)} poles, {len(stores)} stores, {os.path.getsize(out)} bytes')

if __name__ == '__main__':
    if len(sys.argv) >= 3 and sys.argv[1] == 'fetch': fetch(sys.argv[2])
    elif len(sys.argv) >= 4 and sys.argv[1] == 'bake': bake(sys.argv[2], sys.argv[3])
    else: sys.exit(__doc__)
