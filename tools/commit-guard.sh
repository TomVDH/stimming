# Guards for tools/commit.sh. It sources this file; the functions need bash.
# Plan: docs/plans/railgun-clouds-review.md, section 7.
#
# guard_drops PARENT NEW MSGFILE
#   Fails when NEW drops lines that another bean added in recent commits.
#   A stale whole-file copy does this: e9fc9c83 and bb4e4154 did it on 2026-11-16.
# guard_clouds PARENT NEW MSGFILE
#   Fails when NEW changes the railgun's clouds without a check or Tom's words.
#   The message must hold "clouds-check: PASS" or "look-approved:".
#
# Each prints its problems on stdout and returns 1 when it finds any.
# Test them on history: tools/commit-guard.sh <commit> [<commit>...]

# Recent commits per file that the drop guard reads.
GUARD_DEPTH=${GUARD_DEPTH:-12}
# A commit's line counts only when it holds this many characters.
GUARD_MINLEN=16

guard_beans() { grep -oE 'stimming-[a-z0-9]{4}' | sort -u | tr '\n' ' ' || true; }

guard_trim() { sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//'; }
# The lines a diff adds, trimmed, without the "+++" header.
guard_added() { sed -n 's/^+\([^+].*\)$/\1/p' | guard_trim; }

guard_drops() {
  local parent=$1 new=$2 msg=$3 tmp p c ours theirs b n d mine bad=0
  tmp=$(mktemp -d "${TMPDIR:-/tmp}/stim-guard.XXXXXX")
  ours=$(guard_beans < "$msg")
  # Lines this commit adds anywhere: a moved line is not a dropped one.
  git diff --no-color -U0 "$parent" "$new" | guard_added > "$tmp/moved" || true
  while IFS= read -r -d '' p; do
    git cat-file -e "$parent:$p" 2>/dev/null || continue
    git cat-file -e "$new:$p" 2>/dev/null || continue
    git show "$parent:$p" > "$tmp/raw"
    # Binary files have no lines to drop.
    grep -qI . "$tmp/raw" || continue
    guard_trim < "$tmp/raw" > "$tmp/old"
    git show "$new:$p" | guard_trim > "$tmp/new"
    for c in $(git log -n "$GUARD_DEPTH" --format=%H "$parent" -- "$p"); do
      theirs=$(git log -1 --format=%B "$c" | guard_beans)
      # A bean may rework its own lines.
      mine=0
      for b in $theirs; do [[ " $ours " == *" $b "* ]] && mine=1; done
      ((mine)) && continue
      git diff --no-color -U0 "$c^" "$c" -- "$p" 2>/dev/null | guard_added \
        | awk -v m="$GUARD_MINLEN" 'length($0) >= m' | sort -u > "$tmp/added" || true
      [[ -s $tmp/added ]] || continue
      # The lines of that commit that the parent still holds.
      awk 'FILENAME == ARGV[1] { k[$0] = 1; next } ($0 in k)' "$tmp/old" "$tmp/added" > "$tmp/still"
      n=$(wc -l < "$tmp/still" | tr -d ' ')
      ((n >= 3)) || continue
      d=$(awk 'FILENAME == ARGV[1] || FILENAME == ARGV[2] { k[$0] = 1; next } !($0 in k)' "$tmp/new" "$tmp/moved" "$tmp/still" | wc -l | tr -d ' ')
      if ((d >= 3 && d * 4 >= n)); then
        printf '%s drops %s of the %s lines that %s added\n' "$p" "$d" "$n" "$(git log -1 --format='%h (%s' "$c" | cut -c1-80))"
        bad=1
      fi
    done
  done < <(git diff-tree -r -z --no-commit-id --name-only "$parent" "$new")
  rm -rf "$tmp"
  return $bad
}

# The railgun's cloud code: its own files, and these sections of its source.
# A section runs from its marker line to the next "/* ----------" marker.
GUARD_CLOUD_FILES='^railgun/(storms\.js|stormlab\.html)$'
GUARD_CLOUD_MARKS='^(/\* ---------- (clouds|air|sky dome|storm probe|storm lightning|bands)[ :]|const K2_SKY = )'

# Prints "start end" for each cloud section of a file, one per line.
guard_sections() {
  awk -v re="$GUARD_CLOUD_MARKS" '
    /^\/\* ---------- / || /^const K2_SKY = / { if (on) { print s, NR - 1; on = 0 } }
    $0 ~ re { on = 1; s = NR }
    END { if (on) print s, NR }'
}

guard_clouds() {
  local parent=$1 new=$2 msg=$3 p hit=() ranges a n
  grep -qE 'clouds-check: PASS|look-approved:' "$msg" && return 0
  while IFS= read -r -d '' p; do
    if [[ $p =~ $GUARD_CLOUD_FILES ]]; then hit+=("$p"); continue; fi
    [[ $p == railgun/index.html || $p == railgun/src/*.ts ]] || continue
    # Changed lines on both sides of the diff, against each side's own sections.
    ranges=$(git show "$new:$p" 2>/dev/null | guard_sections)
    while read -r a n; do
      [[ -n $a ]] || continue
      ((n == 0)) && n=1
      while read -r s e; do
        if ((a <= e && a + n - 1 >= s)); then hit+=("$p (line $a)"); break 2; fi
      done <<< "$ranges"
    done < <(git diff --no-color -U0 "$parent" "$new" -- "$p" | sed -n 's/^@@ -[0-9,]* +\([0-9]*\),\{0,1\}\([0-9]*\) @@.*/\1 \2/p' | awk '{ print $1, ($2 == "" ? 1 : $2) }')
  done < <(git diff-tree -r -z --no-commit-id --name-only "$parent" "$new")
  ((${#hit[@]})) || return 0
  printf 'changes the railgun clouds: %s\n' "${hit[*]}"
  return 1
}

# Run as a script: test both guards on existing commits.
if [[ ${BASH_SOURCE[0]} == "$0" ]]; then
  set -uo pipefail
  for c in "$@"; do
    m=$(mktemp); git log -1 --format=%B "$c" > "$m"
    printf '== %s\n' "$(git log -1 --format='%h %s' "$c" | cut -c1-90)"
    out=$(guard_drops "$c^" "$c" "$m") && echo "drops: ok" || printf 'drops: FAIL\n%s\n' "$out"
    out=$(guard_clouds "$c^" "$c" "$m") && echo "clouds: ok" || printf 'clouds: GATE\n%s\n' "$out"
    rm -f "$m"
  done
fi
