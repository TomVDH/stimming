# Compiles ANGLE's translated scene HLSL with d3dcompiler_47 and times it.
# Usage: python fxc.py <file.hlsl> [flags-name]
import ctypes, sys, time
from ctypes import c_void_p, c_size_t, c_char_p, c_uint, POINTER, byref

FLAGS = {
    'level1': 0,
    'level0': 1 << 14,
    'skipopt': 1 << 2,
    'avoidflow': 1 << 9,
    'preferflow': 1 << 10,
}

src = open(sys.argv[1], encoding='utf-8').read()
import re
outs = re.findall(r'^static float4 (out_\w+) = ', src, re.M)
fields = ''.join(f'float4 {n} : SV_TARGET{i}; ' for i, n in enumerate(outs))
copies = ''.join(f'o.{n} = {n}; ' for n in outs)
src = src.replace('@@ PIXEL OUTPUT @@', 'struct PS_OUTPUT { ' + fields + '};\nPS_OUTPUT generateOutput() { PS_OUTPUT o; ' + copies + 'return o; }')
src = src.replace('@@ PIXEL MAIN PARAMETERS @@', 'float4 v_pos : SV_Position')
src = src.replace('@@ MAIN PROLOGUE @@', 'gl_FragCoord = v_pos;')
assert '@@' not in src, 'placeholder left'
flags = FLAGS[sys.argv[2] if len(sys.argv) > 2 else 'level1']

d3d = ctypes.WinDLL('d3dcompiler_47.dll')
d3d.D3DCompile.argtypes = [c_void_p, c_size_t, c_char_p, c_void_p, c_void_p, c_char_p, c_char_p, c_uint, c_uint, POINTER(c_void_p), POINTER(c_void_p)]
d3d.D3DCompile.restype = ctypes.c_long

def blob_text(b):
    if not b: return ''
    vt = ctypes.cast(ctypes.cast(b, POINTER(c_void_p))[0], POINTER(c_void_p))
    ptr = ctypes.WINFUNCTYPE(c_void_p, c_void_p)(vt[3])(b)
    size = ctypes.WINFUNCTYPE(c_size_t, c_void_p)(vt[4])(b)
    return ctypes.string_at(ptr, size).decode('utf-8', 'replace')

data = src.encode('utf-8')
code, err = c_void_p(), c_void_p()
t0 = time.time()
hr = d3d.D3DCompile(data, len(data), b'scene', None, None, b'main', b'ps_5_0', flags, 0, byref(code), byref(err))
dt = time.time() - t0
msgs = blob_text(err)
print(f'hr=0x{hr & 0xffffffff:08x} seconds={dt:.1f} flags={sys.argv[2] if len(sys.argv) > 2 else "level1"}')
lines = [l for l in msgs.splitlines() if l.strip()]
print(f'{len(lines)} messages')
seen = set()
for l in lines:
    key = l.split(':', 3)[-1].strip()[:90]
    if key in seen: continue
    seen.add(key)
    print(' ', l[:220])
    if len(seen) >= 12: break
