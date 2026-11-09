#!/usr/bin/env python3
"""Print each toy's last commit time as JSON: {id: unix seconds}.

The Pages build writes this to updates.json; the menu tags recent toys.
Run it from the repo root. It needs the full git history.
"""
import json
import os
import subprocess
import sys

toys = json.load(open('toys.json', encoding='utf-8'))
out = {}
for tid in toys:
    # A toy without its own folder has no history of its own.
    if not os.path.isfile(os.path.join(tid, 'index.html')):
        continue
    # Only the toy's own commits count: their subject starts with its name.
    # Sweeping commits across many toys do not mark any toy as new.
    log = subprocess.run(['git', 'log', '--format=%ct%x09%s', '--', tid + '/'],
                         capture_output=True, text=True).stdout.splitlines()
    name = toys[tid]['name'].lower()
    for line in log:
        ts, _, subject = line.partition('\t')
        if subject.lower().startswith(name + ':') or subject.lower().startswith(name + ' '):
            out[tid] = int(ts)
            break
json.dump(out, sys.stdout, separators=(',', ':'))
sys.stdout.write('\n')
