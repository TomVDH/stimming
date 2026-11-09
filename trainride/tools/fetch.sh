#!/bin/bash
# Elevation: Terrarium z13 tiles over the route (AWS Open Data).
cd "$(dirname "$0")"
for x in $(seq 4287 4311); do for y in $(seq 2863 2879); do echo "$x $y"; done; done | \
  xargs -P 12 -n 2 sh -c '[ -s dem/t13/$0_$1.png ] || curl -sf -o dem/t13/$0_$1.png https://s3.amazonaws.com/elevation-tiles-prod/terrarium/13/$0/$1.png'
echo "tiles: $(ls dem/t13 | wc -l)"
B='47.04,8.39,47.55,9.50'
OV=https://overpass-api.de/api/interpreter
curl -sf -m 300 -A stimming-bake --data-urlencode "data=[out:json][timeout:240];(way[\"railway\"=\"rail\"][\"service\"!~\".\"]($B);node[\"railway\"~\"^(station|halt)$\"]($B););out geom;" $OV -o dem/rail.json
echo "rail: $(wc -c < dem/rail.json)"
curl -sf -m 300 -A stimming-bake --data-urlencode "data=[out:json][timeout:240];(way[\"natural\"=\"water\"][\"name\"~\"^(Zürichsee|Obersee|Walensee|Greifensee|Pfäffikersee|Türlersee|Lützelsee)$\"]($B);relation[\"natural\"=\"water\"][\"name\"~\"^(Zürichsee|Obersee|Walensee|Greifensee|Pfäffikersee|Türlersee|Lützelsee)$\"]($B);node[\"place\"~\"^(city|town|village|suburb|hamlet)$\"]($B););out geom;" $OV -o dem/geo.json
echo "geo: $(wc -c < dem/geo.json)"
