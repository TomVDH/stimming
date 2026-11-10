# Run where the clips are decoded to 24 kHz mono WAV (afconvert -f WAVE -d LEI16@24000 -c 1 sound/<name>.mp3 <name>.wav).
# Fits the speed EQ: for each speed share u and drive a (+1 power, 0 coast, -1 brake),
# the gain, low-shelf gain and peak gain that turn the cruise loop into the recorded sound at that speed.
import numpy as np, wave, json
from scipy.signal import lfilter
from scipy.optimize import least_squares
SR = 24000
def load(n):
    w = wave.open(n + '.wav'); return np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
def lowshelf(f, G, sr=SR):
    A = 10 ** (G / 40); w = 2 * np.pi * f / sr; c = np.cos(w); al = np.sin(w) / 2 * np.sqrt(2); r = 2 * np.sqrt(A) * al
    return np.array([A * ((A + 1) - (A - 1) * c + r), 2 * A * ((A - 1) - (A + 1) * c), A * ((A + 1) - (A - 1) * c - r)]), np.array([(A + 1) + (A - 1) * c + r, -2 * ((A - 1) + (A + 1) * c), (A + 1) + (A - 1) * c - r])
def peaking(f, Q, G, sr=SR):
    A = 10 ** (G / 40); w = 2 * np.pi * f / sr; c = np.cos(w); al = np.sin(w) / (2 * Q)
    return np.array([1 + al * A, -2 * c, 1 - al * A]), np.array([1 + al / A, -2 * c, 1 - al / A])
def resp(b, a, f, sr=SR):
    z = np.exp(-1j * 2 * np.pi * np.asarray(f) / sr)
    return 20 * np.log10(np.abs((b[0] + b[1] * z + b[2] * z * z) / (a[0] + a[1] * z + a[2] * z * z)))
FLS, FPK, QPK = 230.0, 430.0, 1.1
# The recorded sound against the cruise loop, in dB, by band group.
def targets(u, a):
    hi = max(-25.0, 35 * np.log10(max(u, 1e-3)))
    mv = np.clip(u / 0.04, 0, 1); mv = mv * mv * (3 - 2 * mv)
    low = -12 + (7.5 + 4.5 * u) * mv + 1.5 * a * mv
    mvm = np.clip(u / 0.06, 0, 1); mvm = mvm * mvm * (3 - 2 * mvm)
    pw = np.clip((u - 0.02) / 0.13, 0, 1); pw = pw * pw * (3 - 2 * pw)
    mid = -19 + (10 + 9 * min(u, 1)) * mvm + 5.5 * max(a, 0) * max(1 - u, 0) * pw
    return low, mid, hi
FC = np.array([63, 125, 250, 500, 1000, 2000, 4000.0])
def fit(u, a):
    low, mid, hi = targets(u, a)
    tg = np.array([low, low, 0.5 * (low + mid), mid, hi, hi, hi]); wt = np.array([1, 1, 0.6, 1.2, 1, 1, 1])
    def err(p):
        r = p[0] + resp(*lowshelf(FLS, p[1]), FC) + resp(*peaking(FPK, QPK, p[2]), FC)
        return (r - tg) * wt
    return least_squares(err, [hi, low - hi, mid - hi]).x, tg
US = [0, 0.02, 0.05, 0.1, 0.15, 0.2, 0.3, 0.45, 0.62, 0.8, 1.0, 1.3]
# The deepest band (45 to 90 Hz) is weaker below cruise speed than the shelf alone gives: a second shelf at 75 Hz trims it.
sub = lambda u: -6.0 * (1 - min(u, 1)) * min(u / 0.04, 1)
table = {k: [[round(float(v), 1) for v in fit(u, a)[0]] + [round(sub(u), 1)] for u in US] for k, a in (('brake', -1), ('coast', 0), ('power', 1))}
json.dump({'u': US, 'fls': FLS, 'fpk': FPK, 'qpk': QPK, **table}, open('eq.json', 'w'))
# Check: run the cruise loop through the EQ and compare band levels with the recording.
bands = [(45, 90), (90, 180), (180, 355), (355, 710), (710, 1400), (1400, 2800), (2800, 5600)]
def bl(x, n=3000):
    out = []
    for i in range(0, len(x) - n + 1, n):
        X = np.abs(np.fft.rfft(x[i:i + n] * np.hanning(n))) ** 2; f = np.fft.rfftfreq(n, 1 / SR)
        out.append([X[(f >= a) & (f < b)].sum() for a, b in bands])
    return 10 * np.log10(np.median(np.array(out), axis=0) + 1e-12)
bed = load('bed')[:SR * 12]; B = bl(bed); away = load('away'); stop = load('stop')
np.set_printoptions(precision=0, suppress=True, linewidth=200)
print('bands', [b[0] for b in bands])
for i, u in enumerate(US):
    if u in (0.02, 0.8, 1.3): continue
    g, ls, pk, sb = table['power'][i]
    y = lfilter(*lowshelf(75.0, sb), lfilter(*peaking(FPK, QPK, pk), lfilter(*lowshelf(FLS, ls), bed))) * 10 ** (g / 20)
    t = 3 + 60 * u
    rec = (bl(away[int(t * SR):int((t + 2.5) * SR)]) - B) if 0 < u < 0.7 else (bl(away[:int(1.5 * SR)]) - B if u == 0 else np.zeros(7))
    print(f'u {u:4.2f} power  model {(bl(y) - B).round(0)}   recording at {t:4.1f} s {rec.round(0)}   EQ g {g:6.1f} shelf {ls:5.1f} peak {pk:5.1f}')
for i, u in enumerate(US):
    if u in (0.1, 0.2, 0.3):
        g, ls, pk, sb = table['brake'][i]
        y = lfilter(*lowshelf(75.0, sb), lfilter(*peaking(FPK, QPK, pk), lfilter(*lowshelf(FLS, ls), bed))) * 10 ** (g / 20)
        print(f'u {u:4.2f} brake  model {(bl(y) - B).round(0)}   EQ g {g:6.1f} shelf {ls:5.1f} peak {pk:5.1f}')
