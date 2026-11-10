# /// script
# requires-python = ">=3.10"
# dependencies = ["numpy", "scipy", "soundfile"]
# ///
"""Place the Google AI Studio takes on the Cena 1 timeline: trim edges, shorten long pauses, resample to 48 kHz,
write audio/vo.wav and voices.json (start, duration, 100 Hz mouth envelope per line)."""
import json, sys
from pathlib import Path
import numpy as np, soundfile as sf
from scipy import signal
HERE = Path(__file__).parent; SR = 48000
LINES = [('1_bento', 'bento'), ('2_geraldim', 'geraldim'), ('3_rai', 'rai'), ('4_caio', 'caio'), ('5_bento', 'bento')]
def load(n):
    x, sr = sf.read(HERE / 'vo' / f'{n}.wav'); x = x if x.ndim == 1 else x.mean(1)
    return signal.resample_poly(x, SR, sr)
def frames_db(x, hop=480):
    n = len(x) // hop; f = x[: n * hop].reshape(n, hop); return 20 * np.log10(np.sqrt((f ** 2).mean(1)) + 1e-9)
def tidy(x, thr=-42, keep=0.3, maxgap=0.4):
    db = frames_db(x); hop = 480; voiced = db > thr
    idx = np.where(voiced)[0]; a, b = idx[0], idx[-1] + 1
    x = x[max(0, a * hop - 2400): min(len(x), b * hop + 4800)]   # 50 ms lead, 100 ms tail
    db = frames_db(x); voiced = db > thr; out = []; i = 0; n = len(voiced)
    while i < n:
        if voiced[i]: out.append(x[i * hop:(i + 1) * hop]); i += 1; continue
        j = i
        while j < n and not voiced[j]: j += 1
        gap = (j - i) * hop / SR; seg = x[i * hop: j * hop]
        if gap > maxgap: k = int(keep * SR) // 2; seg = np.concatenate([seg[:k], seg[-k:]])
        out.append(seg); i = j
    out.append(x[n * hop:]); return np.concatenate(out)
# starts: driven by the scene beats (see film.js); each line starts after the previous one ends + a breath
plan = {}
takes = [tidy(load(n)) for n, _ in LINES]
d = [len(t) / SR for t in takes]
starts = [0.4]
starts.append(max(5.4, starts[0] + d[0] + 0.5))          # Geraldim after the street glance
starts.append(starts[1] + d[1] + 0.35)                    # Rai answers
walk = starts[2] + d[2] + 0.2                              # friends start walking
starts.append(walk + 3.0)                                  # Caio, while following them
starts.append(max(starts[3] + d[3] + 0.6, walk + 7.9))     # Bento calls from inside
total = starts[4] + d[4] + 0.6
N = int(total * SR) + SR
vo = np.zeros(N)
lines = []
for (n, who), x, s in zip(LINES, takes, starts):
    i = int(s * SR); vo[i:i + len(x)] += x
    hop = SR // 100; e = np.sqrt(np.convolve(x ** 2, np.ones(hop * 3) / (hop * 3), 'same')[::hop])
    e = np.clip((20 * np.log10(e + 1e-9) - 20 * np.log10(e.max()) + 36) / 30, 0, 1)
    lines.append({'id': n, 'who': who, 'start': round(s, 3), 'dur': round(len(x) / SR, 3), 'env': [round(float(v), 3) for v in e]})
vo = vo / (np.abs(vo).max() + 1e-9) * 0.8
sf.write(HERE / 'vo.wav', np.stack([vo, vo]).T, SR, subtype='PCM_24')
json.dump({'walk': round(walk, 3), 'total': round(total, 2), 'lines': lines}, open(HERE.parent / 'voices.json', 'w'))
for L in lines: print(L['id'], 'start', L['start'], 'dur', L['dur'])
print('walk', round(walk, 2), 'total', round(total, 2))
