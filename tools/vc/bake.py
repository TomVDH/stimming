#!/usr/bin/env python3
"""Bake slowed-traffic minutes per road point into roads.json under vc.

Usage: bake.py <dir from fetch.py> <path to motorway/roads.json>
"""
import json, math, sys, os
RJ=sys.argv[2]
R=json.load(open(RJ))
q=R['q']; LAT0=50.6; LON0=4.5; KX=111320*math.cos(math.radians(LAT0)); KY=110570
P=lambda lon,lat:((lon-LON0)*KX, -(lat-LAT0)*KY)
def dec(a):
    x=y=0; out=[]
    for i in range(0,len(a),2): x+=a[i]; y+=a[i+1]; out.append((x/q,y/q))
    return out
D=json.load(open(os.path.join(sys.argv[1],'month.json')))
am=D['duurvertraagdverkeer_2']; pm=D['duurvertraagdverkeer_3']
feats=json.load(open(os.path.join(sys.argv[1],'seg160.json')))['features']
grid={}; C=100
for f in feats:
    sid=str(int(f['properties']['SG_ID']))
    if sid not in am: continue
    for poly in f['geometry']['coordinates']:
        for ring in poly:
            pts=[P(lon,lat) for lon,lat in ring]
            for a,b in zip(pts,pts[1:]):
                x0,x1=sorted((a[0],b[0])); z0,z1=sorted((a[1],b[1]))
                for gx in range(int(x0//C)-1,int(x1//C)+2):
                    for gz in range(int(z0//C)-1,int(z1//C)+2):
                        grid.setdefault((gx,gz),[]).append((a,b,sid))
def seg_d(p,a,b):
    dx,dz=b[0]-a[0],b[1]-a[1]; l2=dx*dx+dz*dz or 1e-9
    t=max(0,min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/l2))
    cx,cz=a[0]+dx*t,a[1]+dz*t
    return math.hypot(p[0]-cx,p[1]-cz),(cx,cz)
def match(p,t):
    best=None; bs=75.0
    for (a,b,sid) in grid.get((int(p[0]//C),int(p[1]//C)),()):
        d,(cx,cz)=seg_d(p,a,b)
        if d>60: continue
        lat=t[0]*(cz-p[1])-t[1]*(cx-p[0])
        # The map draws each direction to the right of its own travel.
        s=d+(0 if lat>-8 else 45)
        if s<bs: bs=s; best=sid
    return best
out={}; hit=tot=0
for r,road in enumerate(R['roads']):
    if road[0]>1: continue
    pts=[P(*p) for p in dec(road[2:])]
    A=[];B=[]; any_=False
    for i,p in enumerate(pts):
        a=pts[max(0,i-1)]; b=pts[min(len(pts)-1,i+1)]
        L=math.hypot(b[0]-a[0],b[1]-a[1]) or 1; t=((b[0]-a[0])/L,(b[1]-a[1])/L)
        sid=match(p,t); tot+=1
        if sid: hit+=1; any_=True
        # Minutes slowed per half day, stored as whole minutes; -1 means no data.
        A.append(int(am[sid]) if sid else -1); B.append(int(pm[sid]) if sid else -1)
    if any_: out[str(r)]=[A,B]
print('roads',len(out),'points',tot,'matched',hit)
R['vc']={'src':'Vlaams Verkeerscentrum, verkeersindicatoren, oktober 2024, weekdag; minuten vertraagd verkeer 0-12 u en 12-24 u','roads':out}
json.dump(R,open(RJ,'w'),separators=(',',':'))
