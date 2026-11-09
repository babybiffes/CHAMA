# /// script
# requires-python = ">=3.10"
# dependencies = ["librosa>=0.10", "numpy", "scipy", "soundfile"]
# ///
"""Ônibus Errado – Parte 01 score. 60 BPM so 1 beat = 1 second (u == t).
Sections (s): 0-5 cold open (drone+heartbeat) | 5-6.5 tape rewind | 6.5-44 rodoviária (playful pluck)
44-60 ônibus (creeping drone) | 60-72 gas (music box + slowing heart) | 72-74 silence | 74-86 dorm | 86-95 poll.
"""
import json, os, sys
from pathlib import Path
import numpy as np, soundfile as sf
sys.path.insert(0, os.path.join(os.environ["MOTION_REEL_SKILL"], "scripts"))
from dsp import *

HERE = Path(__file__).resolve().parent
FILM = HERE.parent
DUR, BPM = 95.0, 60
N = int(DUR * SR)
seed(601)

def env(a, b, n=N, fade=1.0):
    g = np.zeros(n); t = tvec(n)
    g += np.clip((t - a) / fade, 0, 1) * np.clip((b - t) / fade, 0, 1)
    return g

def drone(notes, length, cutoff):
    return pad_chord(notes, length, cutoff, attack=1.5, release=1.5, voices=5, detune=0.2)

def heart(bus, t0, t1, bpm_start, bpm_end, gain):
    t = t0
    while t < t1:
        p = (t - t0) / max(t1 - t0, 1e-6)
        period = 60 / (bpm_start + (bpm_end - bpm_start) * p)
        bus.add(kick(soft=True), 0, gain, at=t)
        bus.add(kick(soft=True), 0, gain * 0.7, at=t + 0.22)
        t += period

def musicbox(f):
    n = int(1.6 * SR); t = tvec(n)
    x = np.sin(2*np.pi*f*t) + 0.35*np.sin(2*np.pi*f*3.01*t)*np.exp(-t/0.15) + 0.2*np.sin(2*np.pi*f*5.2*t)*np.exp(-t/0.06)
    return x * np.exp(-t/0.6) * (1 - np.exp(-t/0.002))

dr, pl, hb, fx = Bus(DUR, BPM), Bus(DUR, BPM), Bus(DUR, BPM), Bus(DUR, BPM)

# drones
dr.add(drone(["D2", "A2", "Eb3"], 6.2, 500), 0, 0.9)                       # cold open
dr.add(drone(["D2", "A2", "F3"], 38, (300, 700)), 6.5, 0.28)               # station: faint unease
dr.add(drone(["D2", "Ab2", "Eb3", "A3"], 29, (350, 1500)), 43.5, 0.75)    # bus -> gas, creeping open
dr.add(drone(["C2", "G2", "Db3"], 12.5, 450), 74, 0.95)                    # dorm
dr.add(drone(["D2", "A2", "Eb3"], 9.5, (400, 900)), 86, 0.7)               # poll

# heart
heart(hb, 0.3, 5.0, 78, 96, 0.9)
heart(hb, 61, 71.5, 70, 38, 0.8)
heart(hb, 77, 86, 88, 104, 0.85)
heart(hb, 86.5, 94.5, 70, 70, 0.5)

# playful pluck motif at the station (D dorian, light, comedic)
motif = ["D4", "F4", "A4", "G4", "F4", "A4", "C5", "A4"]
t = 7.0
i = 0
while t < 43:
    if not (22.5 < t < 26.5):          # drop out for the sign flip
        nt = motif[i % len(motif)]
        pl.add(ks_pluck(hz(nt), 0.5, 0.5, 0.15), 0, 0.33 if i % 2 == 0 else 0.22, pan=0.25 * (1 if i % 2 else -1), at=t)
        if i % 4 == 0:
            pl.add(ks_pluck(hz("D3"), 0.8, 0.3, 0.1), 0, 0.3, at=t)
    t += 0.5; i += 1

# music box lullaby as the gas comes in (detunes as they fall asleep)
lull = ["A5", "F5", "A5", "D6", "C6", "A5", "G5", "F5", "E5", "F5", "D5", "A4"]
for k, nt in enumerate(lull):
    tt = 58.5 + k * 1.05
    det = 1 - 0.004 * k
    pl.add(musicbox(hz(nt) * det), 0, 0.28, pan=0.2, at=tt)

# poll: same lullaby fragment, colder
for k, nt in enumerate(lull[:6]):
    pl.add(musicbox(hz(nt) * 0.5), 0, 0.22, at=87.5 + k * 1.1)

# tape rewind 5.0-6.5: noise sweep down + up
fx.add(np.stack([whoosh(1.5, 4000, 300, 0.5, 1.4)] * 2), 0, 0.35, at=5.0)

# mix + shaping
ir = reverb_ir(2.4, 0.8)
src = dr.x * 0.6 + pl.x * 0.8 + fx.x * 0.4
wet = np.stack([signal.fftconvolve(src[c], ir[c])[: src.shape[1]] for c in range(2)])
bed = dr.x + pl.x + hb.x * 0.9 + fx.x + wet * 0.5
bed = np.stack([filt(ch, "highpass", 28) for ch in bed])[:, :N]
# hard silence 71.8-73.5 (only the whistle sfx survives), and duck under rewind start
g = np.ones(N); a, b = int(71.8 * SR), int(73.5 * SR)
g[a:b] = 0; g[a - 2400:a] = np.linspace(1, 0, 2400)
bed *= g
bed /= np.abs(bed).max() + 1e-9
bed *= 0.55
fade = int(0.8 * SR); bed[:, -fade:] *= np.linspace(1, 0, fade) ** 2
sf.write(HERE / "music.wav", bed.T, SR, subtype="PCM_24")

beats = [float(i) for i in range(int(DUR) + 1)]
grid = {"bpm": 60.0, "designed_bpm": 60, "period": 1.0, "offset": 0.0, "beats": beats,
        "downbeats": beats[::4], "sections": {"cold": [0, 6.5], "estacao": [6.5, 44], "onibus": [44, 60],
        "gas": [60, 72], "silencio": [72, 74], "dormitorio": [74, 86], "enquete": [86, 95]},
        "source": "designed grid, 60 bpm, 1 beat = 1 s"}
(FILM / "beats.json").write_text(json.dumps(grid, indent=1))
print("ok", bed.shape)
