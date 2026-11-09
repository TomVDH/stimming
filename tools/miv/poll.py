#!/usr/bin/env python3
"""One poll of the Flemish traffic centre's MIV feed, folded into running averages.

launchd runs this every 5 minutes (be.stimming.miv). It stops itself after STOP.
Each loop keeps, per weekday and 15-minute slot (Belgian time):
samples, vehicles per minute summed, speed times vehicles summed, slow samples.
The feed's HTTPS certificate does not match its host, so it is read over HTTP.

Usage: poll.py <data dir>            one poll
       poll.py <data dir> --fold CSV fold old raw samples (time,id,q,v) in
"""
import sys, os, json, time, datetime, urllib.request, xml.etree.ElementTree as ET
from array import array

URL = 'http://miv.opendata.belfla.be/miv/verkeersdata'
STOP = datetime.datetime(2026, 12, 10, tzinfo=datetime.timezone.utc)
SLOTS, F = 96, 4  # 15-minute slots; fields: n, q sum, v*q sum, slow

D = sys.argv[1]
IDS, BINS = os.path.join(D, 'ids.json'), os.path.join(D, 'bins.f32')


def load():
    ids = json.load(open(IDS)) if os.path.exists(IDS) else {}
    a = array('f')
    if os.path.exists(BINS):
        with open(BINS, 'rb') as f:
            a.frombytes(f.read())
    return ids, a


def save(ids, a):
    # Write to a side file, then swap, so a crash never leaves half a file.
    for path, write in ((BINS, lambda f: f.write(a.tobytes())), (IDS, lambda f: f.write(json.dumps(ids).encode()))):
        tmp = path + '.tmp'
        with open(tmp, 'wb') as f:
            write(f)
        os.replace(tmp, path)


def add(ids, a, ts, uid, q, v):
    t = datetime.datetime.fromisoformat(ts)
    if uid not in ids:
        ids[uid] = len(ids)
        a.extend([0.0] * (7 * SLOTS * F))
    i = ((ids[uid] * 7 + t.weekday()) * SLOTS + t.hour * 4 + t.minute // 15) * F
    a[i] += 1
    if q > 0 and v > 0:
        a[i + 1] += q; a[i + 2] += q * v
        if v < 50:
            a[i + 3] += 1


def poll(ids, a):
    root = ET.fromstring(urllib.request.urlopen(URL, timeout=90).read())
    n = 0
    for mp in root.iter('meetpunt'):
        if mp.findtext('beschikbaar') != '1' or mp.findtext('defect') == '1':
            continue
        q = 0; vs = 0.0
        for md in mp.iter('meetdata'):
            qq = int(md.findtext('verkeersintensiteit') or 0)
            vv = int(md.findtext('voertuigsnelheid_rekenkundig') or 0)
            if qq > 0 and 0 < vv < 250:
                q += qq; vs += qq * vv
        ts = mp.findtext('tijd_waarneming')
        if ts:
            add(ids, a, ts, mp.get('unieke_id'), q, vs / q if q else -1)
            n += 1
    return n


if __name__ == '__main__':
    os.makedirs(D, exist_ok=True)
    ids, a = load()
    if '--fold' in sys.argv:
        for line in open(sys.argv[sys.argv.index('--fold') + 1]):
            ts, uid, q, v = line.strip().split(',')
            add(ids, a, ts, uid, int(q), float(v))
        save(ids, a)
        print('folded', len(ids), 'loops')
        sys.exit()
    if datetime.datetime.now(datetime.timezone.utc) > STOP:
        print(time.strftime('%F %H:%M'), 'done; unload be.stimming.miv')
        sys.exit()
    try:
        n = poll(ids, a)
        save(ids, a)
        print(time.strftime('%F %H:%M'), n, flush=True)
    except Exception as e:
        print(time.strftime('%F %H:%M'), 'error', e, flush=True)
