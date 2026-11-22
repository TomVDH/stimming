# Estimates FXC's inlined size per function in ANGLE HLSL.
# Usage: python inline.py <file.hlsl> [top]
# Prints the entry's expanded line count, then the callers that multiply most.
import re, sys
from functools import lru_cache

src = open(sys.argv[1], encoding='utf-8').read().split('\n')
top = int(sys.argv[2]) if len(sys.argv) > 2 else 15
head = re.compile(r'^([a-zA-Z0-9_]+) ((?:f_|main)[a-zA-Z0-9_]*)\(')
fns = {}
i = 0
while i < len(src):
    m = head.match(src[i])
    # A forward declaration ends in ';' and has no body.
    if m and src[i].rstrip().endswith(';'):
        i += 1
        continue
    if m and m.group(1) != 'return':
        name, j, depth, body = m.group(2), i, 0, []
        while True:
            depth += src[j].count('{') - src[j].count('}')
            body.append(src[j])
            if depth == 0 and '{' in ''.join(body): break
            j += 1
        # HLSL overloads share a name: count the largest one.
        if len(body) > len(fns.get(name, [])): fns[name] = body
        i = j + 1
        continue
    i += 1

call = re.compile(r'\b(f_[a-zA-Z0-9_]+)\(')
# A call to its own name is an overload, never recursion: GLSL has none.
calls = {n: [c for l in b[1:] for c in call.findall(l) if c in fns and c != n] for n, b in fns.items()}

@lru_cache(None)
def exp(n):
    return len(fns[n]) + sum(exp(c) for c in calls[n])

entry = 'main' if 'main' in fns else max(fns, key=exp)
print(f'{entry}: expanded {exp(entry)} lines from {sum(len(b) for b in fns.values())} written')
# Each function's share: times it is inlined into the entry, times its own size.
count = {}
def walk(n, k):
    for c in calls[n]:
        count[c] = count.get(c, 0) + k
        walk(c, k)
walk(entry, 1)
rows = sorted(((count[n] * len(fns[n]), count[n], len(fns[n]), n) for n in count), reverse=True)
for tot, k, size, n in rows[:top]:
    print(f'{tot:8d} = {k:5d} copies x {size:4d} lines  {n}')
