# /// script
# requires-python = ">=3.10"
# dependencies = ["numpy", "scipy", "soundfile"]
# ///
"""Room tone for the rodoviária (no music): low hum + distant crowd-like noise, very quiet."""
from pathlib import Path
import numpy as np, soundfile as sf
from scipy import signal
SR, DUR = 48000, 20.0
n = int(SR * DUR); rng = np.random.default_rng(7); t = np.arange(n) / SR
b, a = signal.butter(2, [180 / (SR / 2), 1400 / (SR / 2)], 'band')
crowd = signal.lfilter(b, a, rng.standard_normal((2, n)), axis=1)
crowd *= (0.6 + 0.4 * np.abs(np.sin(2 * np.pi * 0.23 * t + np.array([[0.0], [1.3]]))))   # murmur swells
b2, a2 = signal.butter(2, 120 / (SR / 2), 'low')
hum = signal.lfilter(b2, a2, rng.standard_normal((2, n)), axis=1) * 2.0 + 0.15 * np.sin(2 * np.pi * 60 * t)
x = crowd * 0.5 + hum * 0.5
x /= np.abs(x).max(); x *= 0.12
f = int(0.5 * SR); x[:, :f] *= np.linspace(0, 1, f); x[:, -f:] *= np.linspace(1, 0, f)
sf.write(Path(__file__).parent / 'music.wav', x.T, SR, subtype='PCM_24'); print('ok')
