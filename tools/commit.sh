#!/usr/bin/env bash
# Commit chosen files or hunks from a shared checkout, then push.
# Parallel sessions use it so no commit reverts another session's work.
set -euo pipefail
# Command substitutions stop on the first error too (bash 4.4 and later).
shopt -s inherit_errexit 2>/dev/null || true

usage() {
  cat <<'EOF'
Usage: tools/commit.sh -m "msg" [-m "more"] [--hunks <patch>]... [--no-push] [-- <paths>...]

  -m <msg>         Commit message paragraph. Repeat for more paragraphs.
  -F <file>        Read the commit message from a file.
  --hunks <patch>  Apply only this patch (from `git diff HEAD -- <file>`). Repeatable. `-` reads stdin.
  --no-push        Commit to the local branch only.
  -- <paths>...    Commit these paths whole, as they are in the working tree.

The script builds the commit in a private index from the branch tip.
It never stages, resets or checks out your other files.
It holds .git/stim-commit.lock from commit to push.
It moves the branch only if the tip is still the parent (compare-and-swap).
Env: STIM_LOCK_WAIT (s, default 180), STIM_LOCK_STALE (s, default 900), STIM_TRIES (default 5).
EOF
}

die()  { printf 'commit.sh: %s\n' "$*" >&2; exit 1; }
warn() { printf 'commit.sh: %s\n' "$*" >&2; }
info() { printf 'commit.sh: %s\n' "$*"; }

LOCK_WAIT=${STIM_LOCK_WAIT:-180}
LOCK_STALE=${STIM_LOCK_STALE:-900}
TRIES=${STIM_TRIES:-5}

# --- Arguments ---------------------------------------------------------------

msgs=(); patches=(); paths=(); push=1
while (($#)); do
  case $1 in
    -m) (($# >= 2)) || die "-m needs a value"; msgs+=("$2"); shift 2 ;;
    -F) (($# >= 2)) || die "-F needs a file"; msgs+=("$(cat "$2")"); shift 2 ;;
    --hunks) (($# >= 2)) || die "--hunks needs a file"; patches+=("$2"); shift 2 ;;
    --no-push) push=0; shift ;;
    -h|--help) usage; exit 0 ;;
    --) shift; paths=("$@"); break ;;
    *) die "unknown argument: $1 (paths go after --)" ;;
  esac
done
((${#msgs[@]})) || die "give a message with -m or -F"
((${#paths[@]} + ${#patches[@]})) || die "give paths after -- or a patch with --hunks"

tmpdir=$(mktemp -d "${TMPDIR:-/tmp}/stim-commit.XXXXXX")
own_lock=0
cleanup() {
  release_lock
  rm -rf "$tmpdir"
}
trap cleanup EXIT
trap 'exit 130' INT TERM

# Paths and patches resolve from the caller's directory.
prefix=$(git rev-parse --show-prefix)
top=$(git rev-parse --show-toplevel)
i=0
for p in ${patches[@]+"${patches[@]}"}; do
  if [[ $p == - ]]; then
    cat > "$tmpdir/stdin.patch"; p="$tmpdir/stdin.patch"
  elif [[ $p != /* ]]; then
    p="$PWD/$p"
  fi
  [[ -f $p ]] || die "no such patch: $p"
  patches[i]=$p; i=$((i + 1))
done
i=0
for p in ${paths[@]+"${paths[@]}"}; do
  [[ $p == /* ]] || paths[i]="$prefix$p"
  i=$((i + 1))
done
cd "$top"

branch=$(git symbolic-ref -q HEAD) || die "HEAD is detached; check out a branch"
short=${branch#refs/heads/}
msgfile="$tmpdir/msg"
first=1
for m in "${msgs[@]}"; do
  ((first)) || printf '\n' >> "$msgfile"
  printf '%s\n' "$m" >> "$msgfile"; first=0
done
subject=$(head -n 1 "$msgfile")

# --- Lock --------------------------------------------------------------------

gitdir=$(cd "$(git rev-parse --git-common-dir)" && pwd)
lock="$gitdir/stim-commit.lock"
token="$(hostname -s 2>/dev/null || hostname):$$:$(date +%s)"

lock_is_stale() {
  local owner host pid since
  owner=$(cat "$lock/owner" 2>/dev/null) || owner=""
  # A lock with no owner file is new, or its owner died early.
  if [[ -z $owner ]]; then
    [[ -n $(find "$lock" -maxdepth 0 -mmin +2 2>/dev/null) ]]
    return
  fi
  IFS=: read -r host pid since <<< "$owner"
  (( $(date +%s) - since > LOCK_STALE )) && return 0
  [[ $host == "${token%%:*}" ]] && ! ps -p "$pid" > /dev/null 2>&1
}

break_lock() {
  local seen grave="$lock.stale.$$"
  seen=$(cat "$lock/owner" 2>/dev/null) || seen=""
  mv "$lock" "$grave" 2>/dev/null || return 0
  # Another process can take the lock between the check and the move.
  if [[ $(cat "$grave/owner" 2>/dev/null) != "$seen" && ! -e $lock ]]; then
    mv "$grave" "$lock" 2>/dev/null || true
    return 0
  fi
  rm -rf "$grave"
  warn "removed a stale lock (${seen:-no owner})"
}

acquire_lock() {
  local waited=0
  until mkdir "$lock" 2>/dev/null; do
    if lock_is_stale; then break_lock; continue; fi
    ((waited < LOCK_WAIT * 5)) || die "lock busy for ${LOCK_WAIT}s: $lock ($(cat "$lock/owner" 2>/dev/null))"
    ((waited % 25)) || ((waited == 0)) || info "waiting for $(cat "$lock/owner" 2>/dev/null)"
    sleep 0.2; waited=$((waited + 1))
  done
  printf '%s\n' "$token" > "$lock/owner"
  own_lock=1
}

release_lock() {
  ((own_lock)) || return 0
  [[ $(cat "$lock/owner" 2>/dev/null) == "$token" ]] && rm -rf "$lock"
  own_lock=0
}

# --- Build -------------------------------------------------------------------

# Prints a new commit on top of $1, or nothing when the tree does not change.
build_commit() {
  local parent=$1 idx="$tmpdir/index" tree p
  rm -f "$idx"
  GIT_INDEX_FILE=$idx git read-tree "$parent"
  if ((${#paths[@]})); then
    GIT_INDEX_FILE=$idx git add --all -- "${paths[@]}" >&2 || die "git add failed"
  fi
  for p in ${patches[@]+"${patches[@]}"}; do
    GIT_INDEX_FILE=$idx git apply --cached "$p" 2>/dev/null \
      || GIT_INDEX_FILE=$idx git apply --cached --3way "$p" >&2 \
      || die "patch does not apply to $(git rev-parse --short "$parent"): $p"
  done
  tree=$(GIT_INDEX_FILE=$idx git write-tree)
  [[ $tree == "$(git rev-parse "$parent^{tree}")" ]] && return 0
  git commit-tree "$tree" -p "$parent" -F "$msgfile"
}

# Keeps the shared index in step for the paths that commit $2 changes.
# Entries that hold staged work of their own stay as they are.
sync_shared_index() {
  local old=$1 new=$2 p s o line mode n info="$tmpdir/index-info" n_try
  : > "$info"
  while IFS= read -r -d '' p; do
    s=$(git ls-files -s -- ":(literal)$p" | awk '{print $2}' | tr '\n' ' ')
    s=${s% }
    o=$(git rev-parse -q --verify "$old:$p" 2>/dev/null) || o=""
    line=$(git ls-tree "$new" -- ":(literal)$p")
    mode=${line%% *}; n=${line#* * }; n=${n%%$'\t'*}
    [[ -n $line ]] || { mode=0; n=0000000000000000000000000000000000000000; }
    [[ $s == "$n" || ($mode == 0 && -z $s) ]] && continue
    if [[ $s != "$o" ]]; then
      warn "shared index holds staged work in $p; left as is"
      continue
    fi
    printf '%s %s\t%s\0' "$mode" "$n" "$p" >> "$info"
  done < <(git diff-tree -r -z --no-commit-id --name-only "$old" "$new")
  [[ -s $info ]] || return 0
  for n_try in 1 2 3 4 5 6 7 8 9 10; do
    git update-index -z --index-info < "$info" 2>/dev/null && return 0
    sleep 0.2
  done
  warn "shared index is busy; run 'git status' to refresh it"
}

# --- Commit ------------------------------------------------------------------

acquire_lock

new=""; parent=""
for ((try = 1; try <= TRIES; try++)); do
  parent=$(git rev-parse --verify "$branch")
  new=$(build_commit "$parent")
  if [[ -z $new ]]; then
    info "nothing to commit: $short already holds these changes"
    exit 0
  fi
  # The old value makes update-ref a compare-and-swap.
  if git update-ref -m "commit.sh: $subject" "$branch" "$new" "$parent" 2>/dev/null; then
    break
  fi
  warn "$short moved during the build; rebuilding ($try/$TRIES)"
  new=""
done
[[ -n $new ]] || die "$short kept moving; nothing committed"
sync_shared_index "$parent" "$new"
info "committed $(git log -1 --format='%h %s' "$new")"
git diff-tree --stat --no-commit-id -r "$new" | sed 's/^/  /'

((push)) || exit 0

# --- Push --------------------------------------------------------------------

remote=$(git config "branch.$short.remote") || remote=origin
mref=$(git config "branch.$short.merge") || mref=$branch
rtrack="refs/remotes/$remote/${mref#refs/heads/}"
export GIT_TERMINAL_PROMPT=0

# Replays local commits onto the remote tip when the remote moved ahead.
# The working tree follows only the paths the remote changed.
rebase_on_remote() {
  local tip=$1 rtip=$2 base p dirty=() rpaths=() out newtip
  base=$(git merge-base "$tip" "$rtip")
  while IFS= read -r -d '' p; do rpaths+=("$p"); done \
    < <(git diff -z --name-only "$base" "$rtip")
  for p in ${rpaths[@]+"${rpaths[@]}"}; do
    if ! git diff --quiet HEAD -- ":(literal)$p" \
      || ! git diff --cached --quiet HEAD -- ":(literal)$p" \
      || { ! git cat-file -e "HEAD:$p" 2>/dev/null && [[ -e $p ]]; }; then
      dirty+=("$p")
    fi
  done
  if ((${#dirty[@]})); then
    warn "the remote changed files with local edits: ${dirty[*]}"
    return 1
  fi
  out=$(git replay --ref-action=print --onto "$rtip" "$base..$branch") || {
    warn "local commits do not replay cleanly onto $remote"
    return 1
  }
  newtip=$(awk -v r="$branch" '$1 == "update" && $2 == r { print $3 }' <<< "$out")
  [[ -n $newtip ]] || { warn "git replay gave no new tip"; return 1; }
  git update-ref -m "commit.sh: replay onto $remote" "$branch" "$newtip" "$tip" \
    || { warn "$short moved during the replay"; return 1; }
  for p in ${rpaths[@]+"${rpaths[@]}"}; do
    if git cat-file -e "$newtip:$p" 2>/dev/null; then
      git checkout -q "$newtip" -- ":(literal)$p"
    else
      git rm -q --cached --ignore-unmatch -- ":(literal)$p"; rm -f -- "$p"
    fi
  done
  info "replayed local commits onto $remote ($(git rev-parse --short "$rtip"))"
}

for ((try = 1; try <= TRIES; try++)); do
  if git push --quiet "$remote" "$branch:$mref" 2> "$tmpdir/push.err"; then
    info "pushed to $remote/${mref#refs/heads/}"
    exit 0
  fi
  git fetch --quiet "$remote" "+$mref:$rtrack" || break
  tip=$(git rev-parse "$branch"); rtip=$(git rev-parse "$rtrack")
  git merge-base --is-ancestor "$rtip" "$tip" && continue
  rebase_on_remote "$tip" "$rtip" || break
done
cat "$tmpdir/push.err" >&2
warn "push failed; the commit stays local on $short. Push it later with 'git push'."
exit 3
