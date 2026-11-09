#!/usr/bin/env bash
# Runs tests/bar-v2.html in headless Chrome and prints its result lines.
# Needs the dev server on port 8001. Pass another URL as the first argument.
set -euo pipefail
url="${1:-http://localhost:8001/tests/bar-v2.html}"
chrome="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
dir=$(mktemp -d)
out=$("$chrome" --headless=new --user-data-dir="$dir" --virtual-time-budget=15000 --dump-dom "$url" 2>/dev/null \
  | sed -n '/<pre id="out">/,/<\/pre>/p' | sed 's/<[^>]*>//g')
rm -rf "$dir"
printf '%s\n' "$out"
grep -q '^DONE' <<<"$out" || { echo 'no DONE line'; exit 1; }
! grep -q '^FAIL' <<<"$out"
