# Replaces the bodies of named HLSL functions with an empty result.
# Usage: python stub.py <in.hlsl> <out.hlsl> name [name ...]
import re, sys

src, dst, names = sys.argv[1], sys.argv[2], set(sys.argv[3:])
lines = open(src, encoding='utf-8').read().split('\n')
out, i, done = [], 0, set()
head = re.compile(r'^([a-zA-Z0-9_]+) (f_[a-zA-Z0-9_]+)\(.*\)\s*\{?\s*$')
while i < len(lines):
    m = head.match(lines[i])
    if m and m.group(2) in names and m.group(1) != 'return':
        rtype, name = m.group(1), m.group(2)
        out.append(lines[i].rstrip().rstrip('{'))
        j = i if lines[i].rstrip().endswith('{') else i + 1
        assert lines[j].strip().startswith('{'), (name, lines[j][:40])
        depth = 0
        while True:
            depth += lines[j].count('{') - lines[j].count('}')
            if depth == 0 and j > i: break
            if depth == 0 and lines[j].count('{') and lines[j].count('}'): break
            j += 1
        out.append('{' + ('' if rtype == 'void' else f' return ({rtype})0;') + ' }')
        done.add(name)
        i = j + 1
        continue
    out.append(lines[i])
    i += 1
missing = names - done
assert not missing, f'not found: {missing}'
open(dst, 'w', encoding='utf-8').write('\n'.join(out))
