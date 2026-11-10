#!/usr/bin/env python3
"""Fetch one month of segment indicators from indicatoren.verkeerscentrum.be.

Writes month.json (indicator_dagdeel -> {SG_ID: value}) and seg160.json (geometry).
Usage: fetch.py <out dir> [year] [month]
"""
import json, sys, os, urllib.parse, urllib.request

B = 'https://indicatoren.verkeerscentrum.be/vc.indicators.web.gui'
WFS = ('https://indicatoren.verkeerscentrum.be/geoserver/VC2020/ows?service=WFS&version=1.0.0&request=GetFeature'
       '&typeName=VC2020:Kaart_seg_160_v5&maxFeatures=20000&outputFormat=application%2Fjson&srsName=EPSG:4326')
out = sys.argv[1]; year = int(sys.argv[2]) if len(sys.argv) > 2 else 2024; month = int(sys.argv[3]) if len(sys.argv) > 3 else 10
os.makedirs(out, exist_ok=True)


def get(ind, dagdeel):
    # Segment level (4), all days (8), all vehicles (8), main carriageway (1).
    crit = {'ruimtelijke_aggregatie': '4', 'dagtype_id': '8', 'dagdeel_id': dagdeel, 'voertuigklasse_id': '8',
            'wegcategorie_groepid': '1', 'visualmapType': 'month', 'month': month, 'year': year}
    url = f'{B}/{ind}Indicator/visualmapData?criteria=' + urllib.parse.quote(json.dumps(crit))
    return {str(int(float(k))): float(v) for k, v in json.load(urllib.request.urlopen(url, timeout=120))['dataList']}


data = {}
for ind in ('voertuigverliesuren', 'duurvertraagdverkeer', 'verkeersvolume', 'ongevallen_aantal'):
    for dd in ('1', '2', '3'):  # 0-24 h, 0-12 h, 12-24 h
        data[f'{ind}_{dd}'] = get(ind, dd)
        print(ind, dd, len(data[f'{ind}_{dd}']), flush=True)
json.dump(data, open(os.path.join(out, 'month.json'), 'w'))
urllib.request.urlretrieve(WFS, os.path.join(out, 'seg160.json'))
