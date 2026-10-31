"""Оригинальная музыка для рилса «Лучший ракурс»: синтез, без чужих сэмплов.

Темп 100 BPM, доля 0.6 с, сетка долей сдвинута на 0.4 с, чтобы все склейки видео
(1.6, 2.8, 4.0, 5.2, 6.4, 7.6 с) попадали на долю. Два варианта: beat и soft.

Запуск: python3 make_music.py <beat|soft> <выход.wav>
"""
import sys
import wave

import numpy as np

SR = 44100
END = 304 / 30  # рилс обрезан на кадре 303 (10.133 с)
TOTAL = 11.2
N = int(SR * TOTAL)
BEAT = 0.6
S16 = BEAT / 4
OFFSET = 0.4
rng = np.random.default_rng(11)


def bar_start(b):
    return OFFSET + 4 * BEAT * b


def tt(n):
    return np.arange(n) / SR


def band(x, lo=None, hi=None, width=0.3):
    n = len(x)
    X = np.fft.rfft(x)
    f = np.maximum(np.fft.rfftfreq(n, 1 / SR), 1.0)
    lf = np.log2(f)
    g = np.ones_like(f)
    if lo:
        g *= 1 / (1 + np.exp(-(lf - np.log2(lo)) / width))
    if hi:
        g *= 1 / (1 + np.exp((lf - np.log2(hi)) / width))
    return np.fft.irfft(X * g, n)


def stereo():
    return np.zeros((2, N))


def place(bus, sig, t0, gain=1.0, pan=0.0):
    i0 = int(round(t0 * SR))
    if i0 >= N or i0 + len(sig) <= 0:
        return
    a = max(0, -i0)
    i0 = max(0, i0)
    end = min(N, i0 + len(sig) - a)
    s = sig[a:a + end - i0] * gain
    bus[0, i0:end] += s * np.cos((pan + 1) * np.pi / 4)
    bus[1, i0:end] += s * np.sin((pan + 1) * np.pi / 4)


# ---------- инструменты ----------
def make_kick():
    n = int(0.55 * SR)
    t = tt(n)
    f = 46 + 130 * np.exp(-t / 0.032)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.20)
    click = band(rng.standard_normal(n), lo=2500) * np.exp(-t / 0.003) * 0.25
    k = np.tanh(1.8 * (body + click)) * np.minimum(1, t / 0.002)
    return k


def make_clap():
    n = int(0.35 * SR)
    t = tt(n)
    noise = band(rng.standard_normal(n), lo=900, hi=4500)
    burst = np.zeros(n)
    for d, a in ((0, 1.0), (0.010, 0.8), (0.021, 0.7)):
        i = int(d * SR)
        m = int(0.02 * SR)
        burst[i:i + m] += np.exp(-np.arange(m) / (0.004 * SR)) * a
    sig = noise * (burst * 0.9 + np.exp(-t / 0.11) * 0.5 * (t > 0.02))
    return sig / np.max(np.abs(sig))


def make_hat(open_):
    n = int((0.25 if open_ else 0.08) * SR)
    t = tt(n)
    x = band(rng.standard_normal(n), lo=7000)
    x = x * np.exp(-t / (0.10 if open_ else 0.018))
    return x / np.max(np.abs(x))


def make_crash():
    n = int(1.2 * SR)
    t = tt(n)
    x = band(rng.standard_normal(n), lo=3500)
    x = x * np.exp(-t / 0.5)
    return x / np.max(np.abs(x))


def bass_note(freq, length):
    n = int(length * SR)
    t = tt(n)
    f = freq * (1 + 0.5 * np.exp(-t / 0.03))
    ph = 2 * np.pi * np.cumsum(f) / SR
    env = np.minimum(1, t / 0.006) * np.exp(-t / (length * 0.6)) * np.minimum(1, (length - t) / 0.05)
    # вторая и третья гармоники, чтобы бас читался на динамике телефона
    return np.tanh(1.7 * (np.sin(ph) + 0.7 * np.sin(2 * ph) + 0.35 * np.sin(3 * ph))) * env * 0.8


def pad_note(freq, length):
    n = int(length * SR)
    t = tt(n)
    x = np.zeros(n)
    for cents in (-9, 0, 9):
        fr = freq * 2 ** (cents / 1200)
        x += 2 * ((fr * t + rng.random()) % 1) - 1
    x /= 3
    return x * np.minimum(1, t / 0.45) * np.minimum(1, (length - t) / 0.9)


def pluck(freq):
    n = int(0.55 * SR)
    t = tt(n)
    x = np.sin(2 * np.pi * freq * t) + 0.45 * np.sin(4 * np.pi * freq * t) + 0.2 * np.sin(6 * np.pi * freq * t)
    return x * np.minimum(1, t / 0.002) * np.exp(-t / 0.16)


def whoosh(length):
    n = int(length * SR)
    t = tt(n) / length
    x = band(rng.standard_normal(n), lo=600, hi=10000)
    return x * (t ** 2) * np.minimum(1, (1 - t) / 0.03 + 0.0001)


def swell(length):
    n = int(length * SR)
    t = tt(n) / length
    x = band(rng.standard_normal(n), lo=400, hi=8000)
    return x * (t ** 3)


def boom(length=1.0):
    n = int(length * SR)
    t = tt(n)
    f = 42 * (1 + 1.2 * np.exp(-t / 0.05))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.45)


def reverb(x, rt=1.8):
    n = int(rt * 1.3 * SR)
    t = tt(n)
    out = np.zeros_like(x)
    for ch in range(2):
        ir = band(rng.standard_normal(n), lo=200, hi=7000) * np.exp(-t * 6.9 / rt)
        m = int(0.012 * SR)
        ir[:m] *= np.linspace(0, 1, m)
        ir /= np.sqrt(np.sum(ir ** 2))
        L = x.shape[1] + n
        size = 1 << int(np.ceil(np.log2(L)))
        y = np.fft.irfft(np.fft.rfft(x[ch], size) * np.fft.rfft(ir, size), size)[: x.shape[1]]
        out[ch] = y
    return out


def sidechain(times, depth=0.5, rel=0.12):
    t = tt(N)
    env = np.zeros(N)
    for tk in times:
        m = t >= tk
        env[m] += depth * np.exp(-(t[m] - tk) / rel)
    return np.clip(1 - env, 0.35, 1.0)


def main(variant, out_path):
    soft = variant == "soft"
    kick_s, clap_s, hat_c, hat_o, crash_s = make_kick(), make_clap(), make_hat(False), make_hat(True), make_crash()

    drums, bassb, padb, plb, fxb, send = stereo(), stereo(), stereo(), stereo(), stereo(), stereo()
    kick_times = []

    # аккорды по тактам: Am - F - C - G, корни баса
    chords = [
        [220.0, 261.63, 329.63],
        [174.61, 220.0, 261.63],
        [261.63, 329.63, 392.0],
        [196.0, 246.94, 293.66],
    ]
    roots = [55.0, 87.31, 65.41, 98.0]

    # ---- пэд ----
    pad_mono = np.zeros(N)
    for b in range(4):
        start = bar_start(b) - (0.4 if b == 0 else 0.05)
        length = 2.4 + 1.1 + (0.4 if b == 0 else 0.05)
        for fr in chords[b]:
            s = pad_note(fr, length)
            i0 = int(max(0, start) * SR)
            pad_mono[i0:i0 + len(s)] += s[: N - i0] * 0.33
    dark = band(pad_mono, hi=700)
    bright = band(pad_mono, hi=3200)
    t = tt(N)
    br = np.interp(t, [0, 0.4, 2.8, 3.4, 7.6, 8.2, 10.2, TOTAL], [0.1, 0.15, 0.2, 0.75, 0.75, 0.35, 0.4, 0.4])
    pad_mix = dark * (1 - br) + bright * br
    padb[0] += pad_mix
    padb[1] += np.concatenate([np.zeros(int(0.012 * SR)), pad_mix[: N - int(0.012 * SR)]])

    # ---- драмы и бас ----
    if not soft:
        for p in (0, 8):  # такт 1: доли 1 и 3
            tk = bar_start(0) + p * S16
            place(drums, kick_s, tk, 0.75 if p == 0 else 0.6)
            kick_times.append(tk)
        for p in range(4, 16, 2):
            place(drums, hat_c, bar_start(0) + p * S16, 0.05 + 0.012 * p)
        place(bassb, bass_note(roots[0], 1.4), bar_start(0), 0.35)

        for b in (1, 2):
            for p in (0, 4, 8, 12):  # четыре доли
                tk = bar_start(b) + p * S16
                place(drums, kick_s, tk, 0.95 if p == 0 else 0.8)
                kick_times.append(tk)
            for p in (4, 12):
                place(drums, clap_s, bar_start(b) + p * S16, 0.38)
                place(send, clap_s, bar_start(b) + p * S16, 0.38)
            for p in (2, 6, 10, 14):
                place(drums, hat_o, bar_start(b) + p * S16, 0.17, pan=0.15)
            for p in range(1, 16, 2):
                place(drums, hat_c, bar_start(b) + p * S16, 0.07, pan=-0.15)
            if b == 2:  # филл перед замедлением
                for j, p in enumerate((12, 13, 14, 15)):
                    place(drums, clap_s, bar_start(b) + p * S16, 0.18 + 0.1 * j)
            r = roots[b]
            for k, p in enumerate((2, 6, 10, 14)):
                fr = r * (1.5 if k == 2 else 1.0)
                place(bassb, bass_note(fr, 0.26), bar_start(b) + p * S16, 0.62)

        # такт 4: замедление (полтакта)
        for p, g in ((0, 0.85), (8, 0.6)):
            tk = bar_start(3) + p * S16
            place(drums, kick_s, tk, g)
            kick_times.append(tk)
        place(drums, clap_s, bar_start(3) + 8 * S16, 0.28)
        place(send, clap_s, bar_start(3) + 8 * S16, 0.45)
        for p in (4, 12):
            place(drums, hat_c, bar_start(3) + p * S16, 0.08)
        place(bassb, bass_note(roots[3], 2.3), bar_start(3), 0.6)

    # ---- арпеджио ----
    seq = [0, 1, 2, 1, 0, 1, 2, 3]
    for b in range(4):
        ch = chords[b] + [chords[b][0] * 2]
        step = 8 if b == 3 else 2
        mult = 4 if b == 3 else 2
        for i, p in enumerate(range(0, 16, step)):
            if b == 0 and p < 8:
                continue  # арпеджио входит с 1.6 с
            fr = ch[seq[i % 8] % len(ch)] * mult
            place(plb, pluck(fr), bar_start(b) + p * S16, 0.5 if p % 4 == 0 else 0.36, pan=0.35 if i % 2 else -0.35)
    # пинг-понг эхо арпеджио
    pl_echo = plb.copy()
    for n in range(1, 5):
        sh = int(n * 0.45 * SR)
        g = 0.4 ** n
        pl_echo[0, sh:] += plb[1 if n % 2 else 0, : N - sh] * g
        pl_echo[1, sh:] += plb[0 if n % 2 else 1, : N - sh] * g

    # ---- переходы ----
    cuts = [1.6, 2.8, 4.0, 5.2, 6.4, 7.6]
    big = {2.8, 5.2, 7.6}
    place(fxb, swell(0.4), 0.0, 0.55)  # вход
    place(fxb, swell(0.9), 7.6 - 0.9, 0.45)
    for c in cuts:
        place(fxb, whoosh(0.32), c - 0.32, 0.6 if c in big else 0.38)
        place(send, whoosh(0.32), c - 0.32, 0.2)
    for c in sorted(big) + [10.0]:
        place(fxb, boom(0.8), c, 0.3)
    # стоп-удар на последнем кадре: аккорд Am, крэш, кик
    place(fxb, crash_s, 10.0, 0.22)
    if not soft:
        place(drums, kick_s, 10.0, 0.95)
        place(drums, clap_s, 10.0, 0.4)
    for fr in (220.0, 329.63, 440.0, 659.25):
        s = pad_note(fr, 0.8)
        s = s * np.minimum(1, tt(len(s)) / 0.01)
        place(padb, s * 0.5, 10.0, 0.4)
    kick_times.append(10.0)

    # ---- сайдчейн, ревербация и сведение ----
    sc = sidechain(kick_times if not soft else sorted(big), 0.5 if not soft else 0.3)
    padb *= sc
    pl_echo *= sc
    send += padb * 0.55 + pl_echo * 0.35
    wet = reverb(send, 2.0)

    gains = dict(drums=0.8, bass=0.5, pad=0.3, pl=0.26, fx=0.34, wet=0.9)
    if soft:
        gains.update(pad=0.38, pl=0.32, wet=1.1)
    mix = (drums * gains["drums"] + bassb * gains["bass"] + padb * gains["pad"] +
           pl_echo * gains["pl"] + fxb * gains["fx"] + wet * gains["wet"] * 0.6)

    mix = np.stack([band(mix[0], lo=34), band(mix[1], lo=34)])  # срез инфранизких
    mix = np.tanh(1.5 * mix) / np.tanh(1.5)
    cut = int(END * SR)
    mix = mix[:, :cut]
    fade = int(0.03 * SR)
    mix[:, -fade:] *= np.linspace(1, 0, fade)
    mix /= np.max(np.abs(mix)) / 0.89

    pcm = (mix.T * 32767).astype("<i2")
    with wave.open(out_path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print(variant, "готово", round(cut / SR, 3), "с, пик", round(float(np.max(np.abs(mix))), 3),
          "rms", round(float(np.sqrt(np.mean(mix ** 2))), 3))


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
