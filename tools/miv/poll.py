#!/usr/bin/env python3
"""Poll the Flemish traffic centre's MIV feed every 5 minutes for 24 hours.

Each poll appends one line per loop: time, loop id, vehicles per minute, mean speed.
The feed's HTTPS certificate does not match its host, so it is read over HTTP.
"""
import sys, time, urllib.request, xml.etree.ElementTree as ET, os

URL = 'http://miv.opendata.belfla.be/miv/verkeersdata'
out = sys.argv[1]
end = time.time() + 24 * 3600 + 600

while time.time() < end:
    t0 = time.time()
    try:
        raw = urllib.request.urlopen(URL, timeout=90).read()
        root = ET.fromstring(raw)
        rows = []
        for mp in root.iter('meetpunt'):
            if mp.findtext('beschikbaar') != '1' or mp.findtext('defect') == '1':
                continue
            n = 0; vs = 0.0
            for md in mp.iter('meetdata'):
                q = int(md.findtext('verkeersintensiteit') or 0)
                v = int(md.findtext('voertuigsnelheid_rekenkundig') or 0)
                if q > 0 and 0 < v < 250:
                    n += q; vs += q * v
            ts = mp.findtext('tijd_waarneming') or ''
            rows.append(f"{ts},{mp.get('unieke_id')},{n},{(vs / n if n else -1):.1f}\n")
        with open(out, 'a') as f:
            f.writelines(rows)
        print(time.strftime('%H:%M'), len(rows), flush=True)
    except Exception as e:
        print(time.strftime('%H:%M'), 'error', e, flush=True)
    time.sleep(max(5, 300 - (time.time() - t0)))
